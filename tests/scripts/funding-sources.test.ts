import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkFundingSources, makeValidator } from '../../scripts/lib/funding-sources.mjs';
import { readJson } from '../../scripts/lib/json.mjs';

type SourceFile = Record<string, unknown> & {
  tasks: Record<string, unknown>[];
  budget_lines: Record<string, unknown>[];
};

const root = join(import.meta.dirname, '..', '..');
const validate = makeValidator(readJson(join(root, 'schemas', 'funding-source.schema.json')));
const readSource = (id: string) =>
  readJson(join(root, 'src', 'funding-sources', `${id}.json`)) as SourceFile;
const tisupp = readSource('tisupp');

/** The item at an index, which the test knows exists. */
function item(list: Record<string, unknown>[], index: number): Record<string, unknown> {
  const found = list[index];
  if (!found) throw new Error(`no item ${String(index)}`);
  return found;
}

function changed(change: (copy: SourceFile) => void) {
  const copy = structuredClone(tisupp);
  change(copy);
  return validate(copy);
}

describe('funding source files', () => {
  it('are all valid', () => {
    expect(checkFundingSources(root)).toEqual([]);
  });

  it('ship TISUPP only (decision 0023)', () => {
    const files = readdirSync(join(root, 'src', 'funding-sources')).filter((f) =>
      f.endsWith('.json'),
    );
    expect(files).toEqual(['tisupp.json']);
  });

  it('TISUPP has 21 tasks, one CHW experience hours line, $20.00 then $23.00 after 240 hours and a $10,320 NTE (decision 0023)', () => {
    expect(tisupp['code']).toBe('TISUPP');
    expect(tisupp['version']).toBe(3);
    expect(tisupp.tasks).toHaveLength(21);
    expect(tisupp.tasks.find((t) => t['id'] === 'planning-and-conducting-surveys')).toMatchObject({
      name: 'Individual and community assessment',
    });
    expect(tisupp.budget_lines).toEqual([
      { id: 'chw-experience-hours', name: 'CHW experience hours' },
    ]);
    expect(tisupp['has_nte']).toBe(true);
    expect(tisupp['default_rate_cents']).toBe(2000);
    expect(tisupp['rate_step']).toEqual({ after_quarters: 960, rate_cents: 2300 });
    // 240 h at $20.00 + 240 h at $23.00
    expect(tisupp['default_nte_cents']).toBe(240 * 2000 + 240 * 2300);
  });
});

describe('funding source schema', () => {
  it('rejects a missing field', () => {
    expect(changed((s) => delete s['certification_text'])).not.toEqual([]);
  });

  it('rejects an extra field', () => {
    expect(changed((s) => (s['color'] = 'blue'))).not.toEqual([]);
    expect(changed((s) => (item(s.tasks, 0)['hint'] = 'x'))).not.toEqual([]);
  });

  it('rejects a different format version', () => {
    expect(changed((s) => (s['format_version'] = 2))).not.toEqual([]);
  });

  it('rejects a fractional or zero default rate and accepts null', () => {
    expect(changed((s) => (s['default_rate_cents'] = 20.5))).not.toEqual([]);
    expect(changed((s) => (s['default_rate_cents'] = 0))).not.toEqual([]);
    expect(changed((s) => (s['default_rate_cents'] = null))).toEqual([]);
  });

  it('rejects a bad core competency or untrimmed text', () => {
    expect(changed((s) => (item(s.tasks, 0)['core_competency'] = 3))).not.toEqual([]);
    expect(changed((s) => (item(s.tasks, 0)['core_competency'] = ''))).not.toEqual([]);
    expect(changed((s) => (item(s.tasks, 0)['name'] = ' Outreach'))).not.toEqual([]);
  });

  it('rejects ids that are not lower-case slugs', () => {
    expect(changed((s) => (s['id'] = 'TISUPP'))).not.toEqual([]);
    expect(changed((s) => (item(s.budget_lines, 0)['id'] = 'new chws'))).not.toEqual([]);
  });

  it('rejects duplicate task or budget line ids and names', () => {
    expect(changed((s) => (item(s.tasks, 1)['id'] = 'outreach'))).toContain(
      '/tasks has duplicate id "outreach"',
    );
    expect(
      changed((s) => s.budget_lines.push({ id: 'other', name: 'CHW experience hours' })),
    ).not.toEqual([]);
  });

  it('rejects a bad default NTE or rate step', () => {
    expect(changed((s) => (s['default_nte_cents'] = 0))).not.toEqual([]);
    expect(changed((s) => (s['default_nte_cents'] = 10.5))).not.toEqual([]);
    expect(changed((s) => (s['rate_step'] = { after_quarters: 960 }))).not.toEqual([]);
    expect(changed((s) => (s['rate_step'] = { after_quarters: 0, rate_cents: 2300 }))).not.toEqual(
      [],
    );
    expect(changed((s) => delete s['rate_step'])).toEqual([]);
    expect(changed((s) => delete s['default_nte_cents'])).toEqual([]);
  });

  it('rejects empty lists', () => {
    expect(changed((s) => (s.tasks = []))).not.toEqual([]);
    expect(changed((s) => (s.budget_lines = []))).not.toEqual([]);
  });
});
