/** Stable integer hash shared by noise and seeded procedural choices. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return h >>> 0;
}
export const sample = (seed: string, key: string): number => hash(seed + ':' + key) / 4294967296;
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Periodic value noise: x=0 and x=1 meet continuously, y is not wrapped. */
export function noise(seed: string, x: number, y: number, frequency: number): number {
  const px = x * frequency, py = y * frequency;
  const ix = Math.floor(px), iy = Math.floor(py);
  const value = (dx: number, dy: number) => sample(seed, `${((ix + dx) % frequency + frequency) % frequency},${iy + dy}`);
  return mix(mix(value(0, 0), value(1, 0), smooth(px - ix)), mix(value(0, 1), value(1, 1), smooth(px - ix)), smooth(py - iy));
}

/** Minimal stable binary min-heap for drainage and weighted routing. */
export class MinHeap {
  private items: { id: number; cost: number }[] = [];
  get size(): number { return this.items.length; }
  private before(a: { id: number; cost: number }, b: { id: number; cost: number }): boolean { return a.cost < b.cost || (a.cost === b.cost && a.id < b.id); }
  push(id: number, cost: number): void {
    const item = { id, cost }; this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(item, this.items[p])) break;
      this.items[i] = this.items[p]; i = p;
    }
    this.items[i] = item;
  }
  pop(): { id: number; cost: number } {
    const root = this.items[0], last = this.items.pop()!;
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.items.length && this.before(this.items[child + 1], this.items[child])) child++;
        if (!this.before(this.items[child], last)) break;
        this.items[i] = this.items[child]; i = child;
      }
      this.items[i] = last;
    }
    return root;
  }
}
