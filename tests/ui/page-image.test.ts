import { describe, expect, it } from 'vitest';
import type { Shape } from '../../src/files';
import { paintPage, pictureSize, PICTURE_SCALE, type Paint } from '../../src/ui/page-image';

type Call = [string, ...unknown[]];

function fakeContext() {
  const calls: Call[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textBaseline: '',
    fillRect: (...a: unknown[]) => calls.push(['fillRect', ctx.fillStyle, ...a]),
    strokeRect: (...a: unknown[]) => calls.push(['strokeRect', ctx.strokeStyle, ...a]),
    fillText: (...a: unknown[]) => calls.push(['fillText', ctx.font, ctx.fillStyle, ...a]),
    beginPath: () => calls.push(['beginPath']),
    moveTo: (...a: unknown[]) => calls.push(['moveTo', ...a]),
    lineTo: (...a: unknown[]) => calls.push(['lineTo', ...a]),
    stroke: () => calls.push(['stroke', ctx.lineWidth, ctx.strokeStyle]),
    setLineDash: (a: number[]) => calls.push(['setLineDash', a]),
  };
  return { ctx: ctx as unknown as Paint, calls };
}

const page = (shapes: Shape[]) => ({ width: 612, height: 792, shapes });
const s = PICTURE_SCALE;

describe('picture of page 1 (decision 0018)', () => {
  it('is 200 dpi: Letter is 1700 × 2200 pixels', () => {
    expect(pictureSize({ width: 612, height: 792 })).toEqual({ width: 1700, height: 2200 });
  });

  it('starts from a white page', () => {
    const { ctx, calls } = fakeContext();
    paintPage(ctx, page([]));
    expect(calls).toEqual([['fillRect', '#ffffff', 0, 0, 1700, 2200]]);
  });

  it('draws text at scale, never wider than Helvetica', () => {
    const { ctx, calls } = fakeContext();
    paintPage(
      ctx,
      page([
        {
          kind: 'text',
          x: 48,
          y: 60,
          text: 'INVOICE',
          font: 'bold',
          size: 18,
          gray: 0.1,
          width: 72,
        },
      ]),
    );
    expect(calls[1]).toEqual([
      'fillText',
      `bold ${String(18 * s)}px Helvetica, Arial, sans-serif`,
      'rgb(26,26,26)',
      'INVOICE',
      48 * s,
      60 * s,
      72 * s,
    ]);
  });

  it('draws dashed boxes and shaded fills', () => {
    const { ctx, calls } = fakeContext();
    paintPage(
      ctx,
      page([
        { kind: 'rect', x: 10, y: 10, w: 100, h: 40, width: 1, gray: 0.5, dash: 3, stroke: true },
        { kind: 'rect', x: 0, y: 0, w: 10, h: 10, width: 1, gray: 0, fill: 0.95, stroke: false },
      ]),
    );
    expect(calls).toContainEqual(['setLineDash', [3 * s, 3 * s]]);
    expect(calls).toContainEqual([
      'strokeRect',
      'rgb(128,128,128)',
      10 * s,
      10 * s,
      100 * s,
      40 * s,
    ]);
    expect(calls).toContainEqual(['fillRect', 'rgb(242,242,242)', 0, 0, 10 * s, 10 * s]);
    expect(calls.filter((c) => c[0] === 'strokeRect')).toHaveLength(1);
  });

  it('draws solid lines', () => {
    const { ctx, calls } = fakeContext();
    paintPage(ctx, page([{ kind: 'line', x1: 0, y1: 5, x2: 10, y2: 5, width: 0.5, gray: 0 }]));
    expect(calls.slice(1)).toEqual([
      ['setLineDash', []],
      ['beginPath'],
      ['moveTo', 0, 5 * s],
      ['lineTo', 10 * s, 5 * s],
      ['stroke', 0.5 * s, 'rgb(0,0,0)'],
    ]);
  });

  it('puts QR modules on whole pixels, right edge where the PDF has it', () => {
    const { ctx, calls } = fakeContext();
    const matrix = [
      [true, false],
      [false, true],
    ];
    paintPage(ctx, page([{ kind: 'modules', x: 460, y: 650, cell: 1.6, matrix }]));
    const squares = calls.filter((c) => c[0] === 'fillRect').slice(1);
    expect(squares).toHaveLength(2);
    for (const [, , ...box] of squares) {
      for (const v of box) expect(Number.isInteger(v)).toBe(true);
    }
    const right = Math.round((460 + 3.2) * s);
    expect(squares[1]?.slice(2)).toEqual([right - 4, Math.round(650 * s) + 4, 4, 4]);
  });
});
