/** Axial flat-top topology on an even-column, odd-q offset cylinder. */
export interface Hex { q: number; r: number }
export interface Size { width: number; height: number }
export const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];
export const mod = (n: number, d: number): number => ((n % d) + d) % d;
export const fromOffset = (column: number, row: number): Hex => ({ q: column, r: row - Math.floor(column / 2) });
export const toOffset = ({ q, r }: Hex) => ({ column: q, row: r + Math.floor(q / 2) });

/** The quotient vector is (width, -width/2); only longitude wraps. */
export function canonical(hex: Hex, size: Size): Hex | undefined {
  const { row } = toOffset(hex);
  return row < 0 || row >= size.height ? undefined : fromOffset(mod(hex.q, size.width), row);
}
export function indexOf(hex: Hex, size: Size): number | undefined {
  const h = canonical(hex, size);
  if (!h) return undefined;
  return toOffset(h).row * size.width + h.q;
}
export const hexAt = (index: number, size: Size): Hex => fromOffset(index % size.width, Math.floor(index / size.width));
export function neighbors(hex: Hex, size: Size): Hex[] {
  return DIRECTIONS.map(d => canonical({ q: hex.q + d.q, r: hex.r + d.r }, size)).filter((h): h is Hex => !!h);
}
export function neighborIds(id: number, size: Size): number[] {
  return neighbors(hexAt(id, size), size).map(h => indexOf(h, size)!);
}

export interface CoordinateFormat { separator: string; minLetters: number }
export const DEFAULT_FORMAT: CoordinateFormat = { separator: '-', minLetters: 3 };
function validateFormat(format: CoordinateFormat): void {
  if (!Number.isInteger(format.minLetters) || format.minLetters < 1 || format.minLetters > 16 ||
      !format.separator || /[A-Za-z]/.test(format.separator)) throw new Error('Coordinate format requires a non-letter separator and 1–16 minimum letters.');
}
/** Zero-based base-26 digits, padded but never truncated; AA = 0, AB = 1. */
function letters(value: number, min: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Coordinate must be a nonnegative safe integer.');
  let result = '';
  do { result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); } while (value);
  return result.padStart(min, 'A');
}
function number(text: string): number {
  if (!/^[A-Z]+$/.test(text)) throw new Error('Coordinates must contain uppercase letters.');
  const value = [...text].reduce((n, c) => n * 26 + c.charCodeAt(0) - 65, 0);
  if (!Number.isSafeInteger(value)) throw new Error('Coordinate exceeds safe integer range.');
  return value;
}
export function formatCoordinate(hex: Hex, format = DEFAULT_FORMAT): string {
  validateFormat(format);
  const { column, row } = toOffset(hex);
  return letters(column, format.minLetters) + format.separator + letters(row, format.minLetters);
}
export function parseCoordinate(text: string, format = DEFAULT_FORMAT): Hex {
  validateFormat(format);
  const parts = text.trim().toUpperCase().split(format.separator);
  if (parts.length !== 2) throw new Error('Expected a column and row separated by ' + format.separator);
  return fromOffset(number(parts[0]), number(parts[1]));
}
