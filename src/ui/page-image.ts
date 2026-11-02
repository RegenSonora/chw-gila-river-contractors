// The picture of PDF page 1 (decision 0018): the shapes `src/files` drew for the PDF, painted on
// a canvas with the phone's fonts, as a PNG for signing in a photo app.
import type { Shape } from '../files';

/** 200 dpi: Letter becomes 1700 × 2200 pixels. */
export const PICTURE_SCALE = 200 / 72;
const FONTS = 'Helvetica, Arial, sans-serif';

/** The parts of a 2D canvas context painting uses; tests pass a fake. */
export type Paint = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'font'
  | 'textBaseline'
  | 'fillRect'
  | 'strokeRect'
  | 'fillText'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'stroke'
  | 'setLineDash'
>;

export interface PageShapes {
  width: number;
  height: number;
  shapes: readonly Shape[];
}

const gray = (g: number) => {
  const v = String(Math.round(g * 255));
  return `rgb(${v},${v},${v})`;
};

export const pictureSize = (page: Pick<PageShapes, 'width' | 'height'>) => ({
  width: Math.round(page.width * PICTURE_SCALE),
  height: Math.round(page.height * PICTURE_SCALE),
});

export function paintPage(ctx: Paint, page: PageShapes, s = PICTURE_SCALE): void {
  const size = pictureSize(page);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.textBaseline = 'alphabetic';
  for (const shape of page.shapes) {
    switch (shape.kind) {
      case 'text':
        ctx.font = `${shape.font === 'bold' ? 'bold ' : ''}${String(shape.size * s)}px ${FONTS}`;
        ctx.fillStyle = gray(shape.gray);
        // Never wider than Helvetica: a wider phone font is squeezed, so nothing overflows.
        ctx.fillText(shape.text, shape.x * s, shape.y * s, shape.width * s);
        break;
      case 'line':
        ctx.setLineDash(shape.dash ? [shape.dash * s, shape.dash * s] : []);
        ctx.lineWidth = shape.width * s;
        ctx.strokeStyle = gray(shape.gray);
        ctx.beginPath();
        ctx.moveTo(shape.x1 * s, shape.y1 * s);
        ctx.lineTo(shape.x2 * s, shape.y2 * s);
        ctx.stroke();
        break;
      case 'rect':
        if (shape.fill !== undefined) {
          ctx.fillStyle = gray(shape.fill);
          ctx.fillRect(shape.x * s, shape.y * s, shape.w * s, shape.h * s);
        }
        if (shape.stroke) {
          ctx.setLineDash(shape.dash ? [shape.dash * s, shape.dash * s] : []);
          ctx.lineWidth = shape.width * s;
          ctx.strokeStyle = gray(shape.gray);
          ctx.strokeRect(shape.x * s, shape.y * s, shape.w * s, shape.h * s);
        }
        break;
      case 'modules': {
        // Whole pixels, no blur, so the QR code scans. Kept right-aligned like the PDF.
        const n = shape.matrix.length;
        const cell = Math.max(1, Math.round(shape.cell * s));
        const left = Math.round((shape.x + shape.cell * n) * s) - cell * n;
        const top = Math.round(shape.y * s);
        ctx.fillStyle = '#000000';
        shape.matrix.forEach((row, r) => {
          row.forEach((dark, c) => {
            if (dark) ctx.fillRect(left + c * cell, top + r * cell, cell, cell);
          });
        });
        break;
      }
    }
  }
}

/** The PNG bytes, or null where the browser can't draw on a canvas. */
export function pagePng(
  page: PageShapes,
  doc: Document = document,
): Uint8Array<ArrayBuffer> | null {
  const size = pictureSize(page);
  const canvas = doc.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paintPage(ctx, page);
  const url = canvas.toDataURL('image/png');
  if (!url.startsWith('data:image/png;base64,')) return null;
  const binary = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
