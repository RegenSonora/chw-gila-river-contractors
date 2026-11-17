// Breaks in an entry (decision 0027): worked time is start to stop less breaks.
import { describe, expect, it } from 'vitest';
import { breaksValid, checkEntryTimes, clipBreaks, pausedSeconds } from '../../src/core/time';

const t = (hhmmss: string, date = '2026-10-30') => `${date}T${hhmmss}-07:00`;
const brk = (a: string, b: string) => ({ start: t(a), stop: t(b) });

describe('checkEntryTimes with breaks', () => {
  it('with no breaks it is unchanged', () => {
    expect(checkEntryTimes(t('09:00:00'), t('10:30:00'), [])).toEqual({
      ok: true,
      seconds: 5400,
      paused_seconds: 0,
      quarters: 6,
    });
  });

  it('bills worked time: 9:00–10:30 with a 20 min break is 1 h 10 → 1.25 h', () => {
    expect(checkEntryTimes(t('09:00:00'), t('10:30:00'), [brk('09:40:00', '10:00:00')])).toEqual({
      ok: true,
      seconds: 4200,
      paused_seconds: 1200,
      quarters: 5,
    });
  });

  it('adds several breaks, including ones touching the start or stop', () => {
    const r = checkEntryTimes(t('09:00:00'), t('12:00:00'), [
      brk('09:00:00', '09:15:00'),
      brk('10:00:00', '10:30:00'),
      brk('11:45:00', '12:00:00'),
    ]);
    expect(r).toMatchObject({ ok: true, seconds: 7200, paused_seconds: 3600, quarters: 8 });
  });

  it('is too short when the worked time is under 7.5 minutes', () => {
    expect(checkEntryTimes(t('09:00:00'), t('10:00:00'), [brk('09:05:00', '09:58:00')])).toEqual({
      ok: false,
      reason: 'too_short',
    });
  });

  it('refuses breaks outside the entry, overlapping, out of order or empty', () => {
    for (const breaks of [
      [brk('08:59:00', '09:10:00')],
      [brk('10:20:00', '10:31:00')],
      [brk('09:10:00', '09:30:00'), brk('09:20:00', '09:40:00')],
      [brk('09:40:00', '09:50:00'), brk('09:10:00', '09:20:00')],
      [brk('09:10:00', '09:10:00')],
      [{ start: 'nope', stop: t('09:10:00') }],
    ]) {
      expect(checkEntryTimes(t('09:00:00'), t('10:30:00'), breaks), JSON.stringify(breaks)).toEqual(
        {
          ok: false,
          reason: 'bad_breaks',
        },
      );
    }
  });

  it('a break can run past midnight inside an entry that does', () => {
    const start = t('22:00:00');
    const stop = t('02:00:00', '2026-10-31');
    const breaks = [{ start: t('23:30:00'), stop: t('00:30:00', '2026-10-31') }];
    expect(checkEntryTimes(start, stop, breaks)).toMatchObject({ ok: true, quarters: 12 });
  });
});

describe('breaksValid and pausedSeconds', () => {
  it('touching breaks are fine; the total is their sum', () => {
    const breaks = [brk('09:10:00', '09:20:00'), brk('09:20:00', '09:25:00')];
    expect(breaksValid(t('09:00:00'), t('10:00:00'), breaks)).toBe(true);
    expect(pausedSeconds(breaks)).toBe(900);
    expect(pausedSeconds([])).toBe(0);
  });
});

describe('clipBreaks', () => {
  it('keeps breaks inside new times, clips ones crossing them and drops ones outside', () => {
    const breaks = [
      brk('08:30:00', '08:45:00'),
      brk('08:55:00', '09:10:00'),
      brk('09:30:00', '09:40:00'),
      brk('09:55:00', '10:20:00'),
      brk('10:40:00', '10:50:00'),
    ];
    expect(clipBreaks(breaks, t('09:00:00'), t('10:00:00'))).toEqual([
      brk('09:00:00', '09:10:00'),
      brk('09:30:00', '09:40:00'),
      brk('09:55:00', '10:00:00'),
    ]);
  });

  it('drops everything when the times are not valid', () => {
    expect(clipBreaks([brk('09:10:00', '09:20:00')], t('10:00:00'), t('09:00:00'))).toEqual([]);
  });
});
