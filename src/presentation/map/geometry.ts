import { fromOffset, hexAt, indexOf, toOffset, type Hex, type Size } from '../../core/world/hex';
import { sample } from '../../core/world/random';

export interface Point { x: number; y: number }
export const RADIUS = 20;
export const HEX_HEIGHT = Math.sqrt(3) * RADIUS;
export const COLUMN_STEP = 1.5 * RADIUS;
export const hexCenter = (h: Hex): Point => ({ x: h.q * COLUMN_STEP, y: (h.r + h.q / 2) * HEX_HEIGHT });
export const tileCenter = (id: number, size: Size): Point => hexCenter(hexAt(id, size));
export const circumference = (size: Size): number => size.width * COLUMN_STEP;
export const corners = (p: Point): number[] => Array.from({ length: 6 }, (_, i) => [p.x + RADIUS * Math.cos(i * Math.PI / 3), p.y + RADIUS * Math.sin(i * Math.PI / 3)]).flat();
/** Cube rounding gives exact polygon picking, including the repeated cylindrical copies. */
export function pixelToHex(p: Point): Hex {
  const q = p.x / COLUMN_STEP, r = p.y / HEX_HEIGHT - q / 2;
  let x = Math.round(q), z = Math.round(r), y = Math.round(-q - r);
  const dx = Math.abs(x - q), dz = Math.abs(z - r), dy = Math.abs(y + q + r);
  if (dx > dy && dx > dz) x = -y - z;
  else if (dy > dz) y = -x - z;
  else z = -x - y;
  return { q: x, r: z };
}
export const pickTile = (p: Point, size: Size): number | undefined => indexOf(pixelToHex(p), size);
export function nearestCopy(p: Point, anchor: Point, size: Size): Point {
  const width = circumference(size);
  return { x: p.x + Math.round((anchor.x - p.x) / width) * width, y: p.y };
}
/** Node positions are view geometry. Transport meets settlement centers; rivers keep their own course. */
export function featureNode(id: number, kind: string, size: Size, seed: string, settlement: boolean): Point {
  const p = tileCenter(id, size);
  if (settlement && kind !== 'river') return p;
  const key = kind === 'river' ? 'water' : 'transport';
  return { x: p.x + (sample(seed, `${key}:x:${id}`) - 0.5) * 9, y: p.y + (sample(seed, `${key}:y:${id}`) - 0.5) * 9 };
}
export interface Curve { start: Point; controlA: Point; portal: Point; controlB: Point; end: Point }
/** Shared edge portal, offset along the actual hex edge; both sides use identical geometry.
 * Two quadratic segments share a tangent at the portal. This never stores pixels in world data. */
export function featureCurve(a: number, b: number, kind: string, size: Size, seed: string, settlementA = false, settlementB = false): Curve {
  const ca = tileCenter(a, size), cb = nearestCopy(tileCenter(b, size), ca, size);
  const start = featureNode(a, kind, size, seed, settlementA);
  const end = nearestCopy(featureNode(b, kind, size, seed, settlementB), ca, size);
  const dx = cb.x - ca.x, dy = cb.y - ca.y, length = Math.hypot(dx, dy);
  const key = `${kind}:${Math.min(a, b)}:${Math.max(a, b)}`;
  const direction = a < b ? 1 : -1;
  const offset = (sample(seed, key) - 0.5) * RADIUS * 0.8 * direction;
  const portal = { x: (ca.x + cb.x) / 2 - dy / length * offset, y: (ca.y + cb.y) / 2 + dx / length * offset };
  return { start, portal, end, controlA: { x: portal.x - dx * 0.23, y: portal.y - dy * 0.23 }, controlB: { x: portal.x + dx * 0.23, y: portal.y + dy * 0.23 } };
}
export function curvePoints(curve: Curve, steps = 12): Point[] {
  const result: Point[] = [];
  const quadratic = (a: Point, c: Point, b: Point, t: number) => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
  for (let i = 0; i <= steps; i++) result.push(quadratic(curve.start, curve.controlA, curve.portal, i / steps));
  for (let i = 1; i <= steps; i++) result.push(quadratic(curve.portal, curve.controlB, curve.end, i / steps));
  return result;
}
export function visibleChunkKeys(size: Size, chunkSize: number, left: number, top: number, right: number, bottom: number): { column: number; row: number; copy: number; key: string }[] {
  const result: { column: number; row: number; copy: number; key: string }[] = [];
  const minColumn = Math.floor((left - RADIUS * 2) / COLUMN_STEP), maxColumn = Math.ceil((right + RADIUS * 2) / COLUMN_STEP);
  const minRow = Math.max(0, Math.floor(top / HEX_HEIGHT) - 2), maxRow = Math.min(size.height - 1, Math.ceil(bottom / HEX_HEIGHT) + 2);
  if (minRow > maxRow) return result;
  for (let copy = Math.floor(minColumn / size.width); copy <= Math.floor(maxColumn / size.width); copy++) {
    const first = Math.floor(Math.max(0, minColumn - copy * size.width) / chunkSize);
    const last = Math.floor(Math.min(size.width - 1, maxColumn - copy * size.width) / chunkSize);
    for (let column = first; column <= last; column++) for (let row = Math.floor(minRow / chunkSize); row <= Math.floor(maxRow / chunkSize); row++) result.push({ column, row, copy, key: `${column}:${row}:${copy}` });
  }
  return result;
}
export const offsetCenter = (column: number, row: number): Point => hexCenter(fromOffset(column, row));
export const displayRow = (h: Hex): number => toOffset(h).row;
