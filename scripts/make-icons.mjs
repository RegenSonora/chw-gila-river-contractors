// Writes the app icons into public/icons/ (decision 0017): a green caduceus in a cream egg on
// green. Run after changing the design; the output is committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePng } from './lib/png.mjs';

/** @typedef {[number, number]} Point */
/** @typedef {[number, number, number]} Rgb */

/** @type {Rgb} */
const GREEN = [0x2f, 0x7d, 0x4a];
/** @type {Rgb} */
const CREAM = [0xf6, 0xf3, 0xe8];

/**
 * Points along a path of cubic Béziers: a start point, then [c1, c2, end] per curve.
 * @param {Point} start
 * @param {[Point, Point, Point][]} curves
 * @returns {Point[]}
 */
function flatten(start, curves) {
  /** @type {Point[]} */
  const points = [start];
  let p0 = start;
  for (const [c1, c2, p3] of curves) {
    for (let i = 1; i <= 24; i++) {
      const t = i / 24;
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const c = 3 * u * t * t;
      const d = t * t * t;
      points.push([
        a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
        a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1],
      ]);
    }
    p0 = p3;
  }
  return points;
}

/**
 * A quick test for the points' bounding box grown by `pad`, run before the slow exact test.
 * @param {Point[]} points @param {number} pad
 * @returns {(x: number, y: number) => boolean}
 */
function box(points, pad = 0) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, maxX] = [Math.min(...xs) - pad, Math.max(...xs) + pad];
  const [minY, maxY] = [Math.min(...ys) - pad, Math.max(...ys) + pad];
  return (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY;
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

/** @param {number} x @param {number} y @param {Point[]} line @param {number} radius */
function near(x, y, line, radius) {
  for (let i = 0; i < line.length - 1; i++) {
    const a = /** @type {Point} */ (line[i]);
    const b = /** @type {Point} */ (line[i + 1]);
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len)) : 0;
    if (Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)) <= radius) return true;
  }
  return false;
}

// The design on a 100 × 100 square, y running down.
const EGG = flatten(
  [50, 10],
  [
    [
      [70, 10],
      [82, 36],
      [82, 58],
    ],
    [
      [82, 77],
      [68, 90],
      [50, 90],
    ],
    [
      [32, 90],
      [18, 77],
      [18, 58],
    ],
    [
      [18, 36],
      [30, 10],
      [50, 10],
    ],
  ],
);

// The caduceus is drawn on its own 100 units, then shrunk into the egg.
const CADUCEUS_SCALE = 0.78;
const LEFT_WING = flatten(
  [48, 31],
  [
    [
      [41, 25],
      [31, 23],
      [22, 25],
    ],
    [
      [27, 28],
      [31, 29],
      [34, 30.5],
    ],
    [
      [29, 31],
      [26, 32.5],
      [24, 35],
    ],
    [
      [31, 36],
      [40, 35],
      [48, 34.5],
    ],
  ],
);
const RIGHT_WING = LEFT_WING.map(([x, y]) => /** @type {Point} */ ([100 - x, y]));
const LEFT_SNAKE = flatten(
  [43, 78],
  [
    [
      [57, 73],
      [57, 66],
      [50, 62],
    ],
    [
      [43, 58],
      [43, 52],
      [50, 48],
    ],
    [
      [57, 44],
      [57, 38],
      [45, 36],
    ],
  ],
);
const RIGHT_SNAKE = LEFT_SNAKE.map(([x, y]) => /** @type {Point} */ ([100 - x, y]));
/** @type {Point[]} */
const STAFF = [
  [50, 25.7],
  [50, 80.3],
];

const IN_EGG_BOX = box(EGG);
const IN_WING_BOX = [box(LEFT_WING), box(RIGHT_WING)];
const IN_SNAKE_BOX = box(LEFT_SNAKE.concat(RIGHT_SNAKE), 1.6);

/** @param {number} x @param {number} y */
function inCaduceus(x, y) {
  return (
    near(x, y, STAFF, 1.7) ||
    Math.hypot(x - 50, y - 22) <= 3.6 ||
    Math.hypot(x - 44.5, y - 35.8) <= 2.7 ||
    Math.hypot(x - 55.5, y - 35.8) <= 2.7 ||
    (IN_SNAKE_BOX(x, y) && (near(x, y, LEFT_SNAKE, 1.6) || near(x, y, RIGHT_SNAKE, 1.6))) ||
    (IN_WING_BOX[0]?.(x, y) === true && inside(x, y, LEFT_WING)) ||
    (IN_WING_BOX[1]?.(x, y) === true && inside(x, y, RIGHT_WING))
  );
}

/** The color at a point of the 100 × 100 design. @param {number} x @param {number} y */
function colorAt(x, y) {
  if (!IN_EGG_BOX(x, y) || !inside(x, y, EGG)) return GREEN;
  const cx = 50 + (x - 50) / CADUCEUS_SCALE;
  const cy = 52 + (y - 56) / CADUCEUS_SCALE;
  return inCaduceus(cx, cy) ? GREEN : CREAM;
}

/**
 * A full-bleed green square (phones round the corners) with the egg centered.
 * @param {number} size pixels
 * @param {number} scale the design's size as a fraction of the icon
 */
function icon(size, scale) {
  const SAMPLES = 4;
  return encodePng(size, size, (px, py) => {
    /** @type {Rgb} */
    const sum = [0, 0, 0];
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const x = 50 + (((px + (sx + 0.5) / SAMPLES) / size) * 100 - 50) / scale;
        const y = 50 + (((py + (sy + 0.5) / SAMPLES) / size) * 100 - 50) / scale;
        const c = colorAt(x, y);
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
// Maskable: the egg stays inside the 80% safe-zone circle.
writeFileSync(join(dir, 'icon-maskable-512.png'), icon(512, 0.8));
console.log('Wrote public/icons/*.png');
