import type { NetworkEdge, Settlement, World } from './model';

export interface Chunk { key: string; column: number; row: number; tiles: number[] }
export interface Segment { id: string; type: string; a: number; b: number; edge?: NetworkEdge }
/** Derived spatial indices are not saved. A server-backed adapter can implement this contract. */
export interface WorldSource {
  readonly world: World;
  readonly chunkSize: number;
  getChunk(column: number, row: number): Chunk | undefined;
  segmentsFor(tile: number): readonly Segment[];
  settlementAt(tile: number): Settlement | undefined;
}
export class LocalWorldSource implements WorldSource {
  readonly chunkSize = 16;
  private chunks = new Map<string, Chunk>();
  private segments = new Map<number, Segment[]>();
  private settlements = new Map<number, Settlement>();
  constructor(readonly world: World) {
    for (const tile of world.tiles) {
      const column = Math.floor((tile.id % world.config.width) / this.chunkSize), row = Math.floor(Math.floor(tile.id / world.config.width) / this.chunkSize);
      const key = `${column}:${row}`;
      let chunk = this.chunks.get(key);
      if (!chunk) { chunk = { key, column, row, tiles: [] }; this.chunks.set(key, chunk); }
      chunk.tiles.push(tile.id);
    }
    world.settlements.forEach(s => this.settlements.set(s.tile, s));
    const add = (segment: Segment) => {
      for (const tile of [segment.a, segment.b]) {
        const list = this.segments.get(tile) ?? []; list.push(segment); this.segments.set(tile, list);
      }
    };
    for (const network of world.networks) {
      const nodes = new Map(network.nodes.map(n => [n.id, n.tile]));
      network.edges.forEach(edge => add({ id: edge.id, type: network.type, a: nodes.get(edge.from)!, b: nodes.get(edge.to)!, edge }));
    }
    const rivers = new Set<string>();
    for (const river of world.rivers) for (let i = 1; i < river.tiles.length; i++) {
      const a = river.tiles[i - 1], b = river.tiles[i], id = `river:${a}:${b}`;
      if (!rivers.has(id)) { rivers.add(id); add({ id, type: 'river', a, b }); }
    }
  }
  getChunk(column: number, row: number): Chunk | undefined { return this.chunks.get(`${column}:${row}`); }
  segmentsFor(tile: number): readonly Segment[] { return this.segments.get(tile) ?? []; }
  settlementAt(tile: number): Settlement | undefined { return this.settlements.get(tile); }
}
