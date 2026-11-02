// Writes the app icons into public/icons/ (decision 0022): a river valley by day. The Gila River
// winds through green fields below a brown mountain range, sun in the sky. No cultural or sacred
// symbols. Run after changing the design; the output is committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePng } from './lib/png.mjs';

/** @typedef {[number, number]} Point */
/** @typedef {[number, number, number]} Rgb */

/** @param {string} hex @returns {Rgb} */
const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const SKY = rgb('#a9dbf0');
const MOUNTAINS = rgb('#8a5a3c');
const FIELDS = rgb('#5fa845');
const FURROWS = rgb('#4c8f37');
const RIVER = rgb('#2f7fc1');
const SUN = rgb('#f6c343');

/**
 * A closed outline from a path of absolute M, L and Q commands, curves flattened to lines.
 * @param {string} d
 * @returns {Point[]}
 */
function outline(d) {
  const tokens = d.match(/[MLQZ]|-?[\d.]+/g) ?? [];
  /** @type {Point[]} */
  const points = [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') points.push([num(), num()]);
    else if (cmd === 'Q') {
      const p0 = /** @type {Point} */ (points[points.length - 1]);
      /** @type {Point} */
      const q = [num(), num()];
      /** @type {Point} */
      const p = [num(), num()];
      for (let s = 1; s <= 16; s++) {
        const t = s / 16;
        const u = 1 - t;
        points.push([
          u * u * p0[0] + 2 * u * t * q[0] + t * t * p[0],
          u * u * p0[1] + 2 * u * t * q[1] + t * t * p[1],
        ]);
      }
    }
  }
  return points;
}

/** @param {number} x @param {number} y @param {Point[]} polygon */
function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = /** @type {Point} */ (polygon[i]);
    const [xj, yj] = /** @type {Point} */ (polygon[j]);
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// The scene on a 100 × 100 square, y running down.
const MOUNTAIN_SHAPE = outline(
  'M0 46 L14 34 L24 40 L38 26 L50 36 L62 30 L76 40 L88 32 L100 38 L100 52 L0 52 Z',
);
const RIVER_SHAPE = outline(
  'M60 50 Q40 60 58 70 Q78 80 44 100 L28 100 Q60 82 44 72 Q28 62 54 50 Z',
);
/** Furrow lines across the fields: y at the left edge and at the right edge. */
const FURROW_LINES = [
  [62, 58],
  [74, 70],
  [88, 84],
];

/** The color at a point of the scene. @param {number} x @param {number} y @returns {Rgb} */
function colorAt(x, y) {
  if (inside(x, y, RIVER_SHAPE)) return RIVER;
  if (y >= 50) {
    for (const [left = 0, right = 0] of FURROW_LINES) {
      if (Math.abs(y - (left + ((right - left) * x) / 100)) <= 1) return FURROWS;
    }
    return FIELDS;
  }
  if (inside(x, y, MOUNTAIN_SHAPE)) return MOUNTAINS;
  if (Math.hypot(x - 78, y - 16) <= 7) return SUN;
  return SKY;
}

/**
 * The scene filling the square (phones round the corners).
 * @param {number} size pixels
 * @param {number} scale the scene's size as a fraction of the icon; the edges extend outward
 */
function icon(size, scale) {
  const SAMPLES = 4;
  // Just inside the edges, so shapes that touch the border keep going outward.
  const clamp = (/** @type {number} */ v) => Math.min(99.99, Math.max(0.01, v));
  return encodePng(size, size, (px, py) => {
    /** @type {Rgb} */
    const sum = [0, 0, 0];
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const x = 50 + (((px + (sx + 0.5) / SAMPLES) / size) * 100 - 50) / scale;
        const y = 50 + (((py + (sy + 0.5) / SAMPLES) / size) * 100 - 50) / scale;
        const c = colorAt(clamp(x), clamp(y));
        for (let i = 0; i < 3; i++) sum[i] = (sum[i] ?? 0) + (c[i] ?? 0);
      }
    }
    return /** @type {Rgb} */ (sum.map((v) => Math.round(v / (SAMPLES * SAMPLES))));
  });
}

const dir = join(import.meta.dirname, '..', 'public', 'icons');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'apple-touch-icon.png'), icon(180, 1));
writeFileSync(join(dir, 'icon-192.png'), icon(192, 1));
writeFileSync(join(dir, 'icon-512.png'), icon(512, 1));
// Maskable: the scene at 75% so the sun stays inside the 80% safe-zone circle.
writeFileSync(join(dir, 'icon-maskable-512.png'), icon(512, 0.75));
console.log('Wrote public/icons/*.png');
