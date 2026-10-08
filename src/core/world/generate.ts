import { neighborIds } from './hex';
import { validateDefinitions } from './definitions';
import { validateConfig, type Definitions, type GenerationConfig, type Tile, type World } from './model';
import { MinHeap, noise, sample } from './random';
import { buildNetworks } from './transport';

export interface GenerationContext { world: World; drainage?: Int32Array }
export interface GenerationStage {
  id: string;
  requires: readonly string[];
  produces: readonly string[];
  run(context: GenerationContext): void;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));

const elevation: GenerationStage = {
  id: 'elevation-v1', requires: [], produces: ['elevation'],
  run({ world }) {
    const c = world.config;
    for (let row = 0; row < c.height; row++) for (let col = 0; col < c.width; col++) {
      const x = col / c.width, y = (row + (col % 2) * 0.5) / c.height;
      const broad = noise(c.seed + ':land', x, y, 4);
      const detail = noise(c.seed + ':relief', x, y, 12);
      const fine = noise(c.seed + ':ridges', x, y, 32);
      const raw = broad * 0.78 + detail * 0.17 + fine * 0.05;
      world.tiles.push({ id: row * c.width + col, terrain: '', elevation: clamp(0.5 + (raw - 0.5) * (1.3 + c.roughness)), moisture: 0, temperature: 0 });
    }
  },
};
const climate: GenerationStage = {
  id: 'climate-v1', requires: ['elevation'], produces: ['climate'],
  run({ world }) {
    const c = world.config;
    for (const tile of world.tiles) {
      const x = tile.id % c.width / c.width, y = Math.floor(tile.id / c.width) / c.height;
      tile.moisture = clamp(noise(c.seed + ':wet', x, y, 7) + c.moisture - 0.5);
      tile.temperature = clamp(1 - Math.abs(y * 2 - 1) * 0.7 - tile.elevation * 0.3);
    }
  },
};
const terrain: GenerationStage = {
  id: 'terrain-v1', requires: ['elevation', 'climate'], produces: ['terrain'],
  run({ world }) {
    const water = world.definitions.terrains.find(t => t.water)!;
    for (const tile of world.tiles) {
      if (tile.elevation < world.config.seaLevel) { tile.terrain = water.id; continue; }
      const match = world.definitions.terrains.find(t => !t.water && t.rule &&
        tile.elevation >= (t.rule.minElevation ?? 0) && tile.elevation <= (t.rule.maxElevation ?? 1) && tile.moisture >= (t.rule.minMoisture ?? 0));
      if (!match) throw new Error('No terrain classification for tile ' + tile.id);
      tile.terrain = match.id;
    }
  },
};

/** Priority-flood drainage fills depressions for routing only, leaving raw elevation intact.
 * Parents always point to an earlier visited cell, so every river terminates in water.
 * If a world has no ocean, no drainage outlet or river is invented. */
const drainage: GenerationStage = {
  id: 'drainage-v1', requires: ['terrain'], produces: ['drainage', 'rivers'],
  run(context) {
    const w = context.world, heap = new MinHeap();
    const parent = new Int32Array(w.tiles.length).fill(-1), visited = new Uint8Array(w.tiles.length);
    const water = new Set(w.definitions.terrains.filter(t => t.water).map(t => t.id));
    for (const tile of w.tiles) if (water.has(tile.terrain)) { visited[tile.id] = 1; heap.push(tile.id, tile.elevation); }
    while (heap.size) {
      const { id, cost } = heap.pop();
      for (const next of neighborIds(id, w.config)) if (!visited[next]) {
        visited[next] = 1; parent[next] = id;
        heap.push(next, Math.max(cost, w.tiles[next].elevation));
      }
    }
    context.drainage = parent;
    const candidates = w.tiles.filter(t => !water.has(t.terrain) && t.elevation > w.config.seaLevel + 0.12)
      .sort((a, b) => (b.elevation + b.moisture * 0.2 + sample(w.config.seed, 'river:' + b.id) * 0.2) - (a.elevation + a.moisture * 0.2 + sample(w.config.seed, 'river:' + a.id) * 0.2) || a.id - b.id);
    const used = new Set<number>();
    for (const start of candidates) {
      if (w.rivers.length >= w.config.rivers) break;
      if (used.has(start.id) || neighborIds(start.id, w.config).some(id => used.has(id))) continue;
      const path: number[] = [];
      let current = start.id;
      while (current !== -1) {
        path.push(current);
        if (water.has(w.tiles[current].terrain)) break;
        current = parent[current];
      }
      if (path.length < 5 || !water.has(w.tiles[path[path.length - 1]].terrain)) continue;
      w.rivers.push({ id: 'river:' + start.id, tiles: path });
      path.forEach(id => used.add(id));
    }
  },
};
const settlements: GenerationStage = {
  id: 'settlements-v1', requires: ['terrain', 'rivers'], produces: ['settlements'],
  run({ world: w }) {
    const defs = new Map(w.definitions.terrains.map(t => [t.id, t]));
    const riverTiles = new Set(w.rivers.flatMap(r => r.tiles));
    const score = (t: Tile) => sample(w.config.seed, 'settlement:' + t.id) * 1.4 + defs.get(t.terrain)!.settlementSuitability * 0.5 + (riverTiles.has(t.id) ? 0.2 : 0);
    const candidates = w.tiles.filter(t => !defs.get(t.terrain)!.water && defs.get(t.terrain)!.settlementSuitability > 0).sort((a, b) => score(b) - score(a) || a.id - b.id);
    const blocked = new Set<number>();
    const prefixes = ['Ash', 'Bell', 'Cedar', 'Dun', 'East', 'Fair', 'Glen', 'High', 'Kings', 'Larch', 'North', 'Oak', 'Red', 'Stone', 'West', 'White'];
    const suffixes = ['ford', 'haven', 'mere', 'bridge', 'wick', 'field', 'borough', 'stead'];
    for (const t of candidates) {
      if (w.settlements.length >= w.config.settlements) break;
      if (blocked.has(t.id)) continue;
      const type = w.settlements.length % 4 === 0 ? 'city' : 'town';
      const def = w.definitions.settlements.find(d => d.id === type)!;
      const n = w.settlements.length;
      w.settlements.push({ id: 'settlement:' + t.id, tile: t.id, type, name: prefixes[n % prefixes.length] + suffixes[Math.floor(n / prefixes.length) % suffixes.length], population: Math.floor(def.minPopulation + sample(w.config.seed, 'population:' + t.id) * (def.maxPopulation - def.minPopulation)) });
      blocked.add(t.id);
      for (const a of neighborIds(t.id, w.config)) { blocked.add(a); for (const b of neighborIds(a, w.config)) blocked.add(b); }
    }
  },
};
const transport: GenerationStage = {
  id: 'transport-v1', requires: ['settlements', 'terrain'], produces: ['transport'],
  run({ world }) { world.networks = buildNetworks(world); },
};
export const DEFAULT_STAGES: readonly GenerationStage[] = [elevation, climate, terrain, drainage, settlements, transport];

/** Trusted built-in extension point. Stages declare dependency contracts and run in order. */
export function generateWorld(config: GenerationConfig, definitions: Definitions, stages = DEFAULT_STAGES): World {
  validateConfig(config); validateDefinitions(definitions);
  const available = new Set<string>(), ids = new Set<string>();
  for (const stage of stages) {
    if (ids.has(stage.id)) throw new Error('Duplicate generation stage ' + stage.id);
    for (const dependency of stage.requires) if (!available.has(dependency)) throw new Error(stage.id + ' requires ' + dependency);
    ids.add(stage.id); stage.produces.forEach(p => available.add(p));
  }
  const world: World = { schemaVersion: 1, generator: { id: 'continents', version: 1, stages: stages.map(s => s.id) }, config: { ...config }, definitions: structuredClone(definitions), tiles: [], rivers: [], settlements: [], networks: [] };
  const context: GenerationContext = { world };
  for (const stage of stages) stage.run(context);
  return world;
}
