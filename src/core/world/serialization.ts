import { neighborIds } from './hex';
import { validateDefinitions } from './definitions';
import { validateConfig, type World } from './model';

/** Validate both shape and referential invariants before accepting an external world. */
export function validateWorld(input: unknown): asserts input is World {
  if (!input || typeof input !== 'object') throw new Error('Expected a world object.');
  const w = input as World;
  if (w.schemaVersion !== 1) throw new Error('Unsupported world schema version.');
  validateConfig(w.config); validateDefinitions(w.definitions);
  if (!w.generator || typeof w.generator.id !== 'string' || !Number.isInteger(w.generator.version) || !Array.isArray(w.generator.stages) || w.generator.stages.some(s => typeof s !== 'string')) throw new Error('Invalid generator metadata.');
  if (!Array.isArray(w.tiles) || w.tiles.length !== w.config.width * w.config.height) throw new Error('Tile count does not match world dimensions.');
  const terrains = new Map(w.definitions.terrains.map(t => [t.id, t]));
  const validTile = (id: number) => Number.isInteger(id) && id >= 0 && id < w.tiles.length;
  const unit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
  w.tiles.forEach((t, i) => {
    if (!t || t.id !== i || !terrains.has(t.terrain) || !unit(t.elevation) || !unit(t.moisture) || !unit(t.temperature)) throw new Error('Invalid tile ' + i);
  });
  for (const key of ['settlements', 'networks', 'rivers'] as const) if (!Array.isArray(w[key])) throw new Error('Missing ' + key);
  const ids = new Set<string>();
  const unique = (id: string) => { if (typeof id !== 'string' || !id || ids.has(id)) throw new Error('Duplicate or invalid identifier.'); ids.add(id); };
  const occupied = new Set<number>();
  for (const s of w.settlements) {
    if (!s) throw new Error('Invalid settlement.'); unique(s.id);
    if (!validTile(s.tile) || occupied.has(s.tile) || terrains.get(w.tiles[s.tile].terrain)!.water || !w.definitions.settlements.some(d => d.id === s.type) || typeof s.name !== 'string' || !Number.isInteger(s.population) || s.population < 1) throw new Error('Invalid settlement.');
    occupied.add(s.tile);
  }
  for (const n of w.networks) {
    if (!n) throw new Error('Invalid network.'); unique(n.id);
    if (!w.definitions.infrastructure.some(d => d.id === n.type) || !Array.isArray(n.nodes) || !Array.isArray(n.edges)) throw new Error('Invalid transport network.');
    const nodes = new Map<string, number>(), tileNodes = new Set<number>(), pairs = new Set<string>();
    for (const node of n.nodes) {
      if (!node) throw new Error('Invalid node.'); unique(node.id);
      if (!validTile(node.tile) || tileNodes.has(node.tile) || terrains.get(w.tiles[node.tile].terrain)!.water) throw new Error('Invalid network node.');
      nodes.set(node.id, node.tile); tileNodes.add(node.tile);
    }
    for (const e of n.edges) {
      if (!e) throw new Error('Invalid edge.'); unique(e.id);
      const a = nodes.get(e.from), b = nodes.get(e.to);
      const pair = a! < b! ? `${a}:${b}` : `${b}:${a}`;
      if (a === undefined || b === undefined || !neighborIds(a, w.config).includes(b) || pairs.has(pair) || !unit(e.condition) || !unit(e.damage) || !Number.isFinite(e.capacity) || e.capacity < 0 || !Number.isFinite(e.travelTime) || e.travelTime <= 0 || (e.owner !== null && typeof e.owner !== 'string')) throw new Error('Invalid transport edge.');
      pairs.add(pair);
    }
  }
  for (const r of w.rivers) {
    if (!r) throw new Error('Invalid river.'); unique(r.id);
    if (!Array.isArray(r.tiles) || r.tiles.length < 2 || r.tiles.some(id => !validTile(id)) || new Set(r.tiles).size !== r.tiles.length) throw new Error('Invalid river path.');
    for (let i = 1; i < r.tiles.length; i++) if (!neighborIds(r.tiles[i - 1], w.config).includes(r.tiles[i])) throw new Error('River skips a hex.');
    if (!terrains.get(w.tiles[r.tiles[r.tiles.length - 1]].terrain)!.water) throw new Error('River must reach water.');
  }
}
export function serializeWorld(world: World): string { validateWorld(world); return JSON.stringify(world); }
export function deserializeWorld(json: string): World { const value: unknown = JSON.parse(json); validateWorld(value); return value; }
