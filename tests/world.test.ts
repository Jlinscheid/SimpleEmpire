import { describe, expect, it } from 'vitest';
import rawDefinitions from '../data/world-definitions.json';
import { validateDefinitions } from '../src/core/world/definitions';
import { canonical, DEFAULT_FORMAT, formatCoordinate, fromOffset, hexAt, indexOf, neighborIds, neighbors, parseCoordinate, toOffset } from '../src/core/world/hex';
import { DEFAULT_CONFIG, validateConfig, type World } from '../src/core/world/model';
import { DEFAULT_STAGES, generateWorld } from '../src/core/world/generate';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/core/world/serialization';
import { buildNetworks } from '../src/core/world/transport';
import { LocalWorldSource } from '../src/core/world/store';
import { noise } from '../src/core/world/random';
import { circumference, curvePoints, featureCurve, hexCenter, nearestCopy, pickTile, tileCenter, visibleChunkKeys } from '../src/presentation/map/geometry';

validateDefinitions(rawDefinitions);
const definitions = rawDefinitions;
const config = { ...DEFAULT_CONFIG, width: 48, height: 32, settlements: 16, rivers: 12 };
const world = generateWorld(config, definitions);

describe('flat-top cylinder topology', () => {
  const size = { width: 10, height: 8 };
  it('round trips every internal index, offset, and display coordinate', () => {
    for (let id = 0; id < size.width * size.height; id++) {
      const hex = hexAt(id, size), offset = toOffset(hex);
      expect(fromOffset(offset.column, offset.row)).toEqual(hex);
      expect(indexOf(hex, size)).toBe(id);
      expect(parseCoordinate(formatCoordinate(hex))).toEqual(hex);
    }
  });
  it('has unique, reciprocal neighbors including the seam and poles', () => {
    for (let id = 0; id < size.width * size.height; id++) {
      const adjacent = neighborIds(id, size);
      expect(new Set(adjacent).size).toBe(adjacent.length);
      for (const next of adjacent) expect(neighborIds(next, size)).toContain(id);
      const { row } = toOffset(hexAt(id, size));
      if (row > 0 && row < size.height - 1) expect(adjacent).toHaveLength(6);
    }
  });
  it('wraps longitude with axial compensation and never wraps latitude', () => {
    expect(canonical(fromOffset(-1, 3), size)).toEqual(fromOffset(9, 3));
    expect(canonical(fromOffset(20, 3), size)).toEqual(fromOffset(0, 3));
    expect(canonical(fromOffset(2, -1), size)).toBeUndefined();
    expect(canonical(fromOffset(2, 8), size)).toBeUndefined();
    expect(neighbors(fromOffset(0, 4), size)).toContainEqual(fromOffset(9, 3));
    expect(neighbors(fromOffset(0, 4), size)).toContainEqual(fromOffset(9, 4));
    expect(neighbors(fromOffset(3, 0), size).every(h => toOffset(h).row >= 0)).toBe(true);
  });
  it('expands display coordinates beyond ZZZ without a fixed world-size cap', () => {
    for (const n of [0, 25, 26, 17575, 17576, 456976, 1_000_000]) {
      for (const format of [DEFAULT_FORMAT, { separator: ':', minLetters: 2 }]) {
        const hex = fromOffset(n, n + 8);
        expect(parseCoordinate(formatCoordinate(hex, format), format)).toEqual(hex);
      }
    }
    expect(formatCoordinate(fromOffset(17576, 0))).toBe('BAAA-AAA');
    expect(() => parseCoordinate('ABC123')).toThrow();
    expect(() => formatCoordinate(fromOffset(1, 1), { separator: '', minLetters: 2 })).toThrow();
  });
  it('rejects invalid geometry and nonfinite generator settings', () => {
    for (const change of [{ width: 9 }, { height: -1 }, { width: 512, height: 512 }, { seaLevel: NaN }, { settlements: 1.2 }, { hexKm: 0 }, { seed: '' }]) expect(() => validateConfig({ ...config, ...change })).toThrow();
  });
});

describe('generation and definitions', () => {
  it('repeats byte-for-byte with a seed and config without mutating definitions', () => {
    const before = JSON.stringify(definitions);
    expect(JSON.stringify(generateWorld(config, definitions))).toBe(JSON.stringify(world));
    expect(JSON.stringify(definitions)).toBe(before);
    expect(generateWorld({ ...config, seed: 'different' }, definitions).tiles).not.toEqual(world.tiles);
  });
  it('produces coherent geography, settlements, rivers, and both transport networks', () => {
    validateWorld(world);
    expect(new Set(world.tiles.map(t => t.terrain)).size).toBe(5);
    expect(world.settlements.length).toBeGreaterThan(4);
    expect(world.rivers.length).toBeGreaterThan(0);
    expect(world.networks.every(n => n.edges.length > 0)).toBe(true);
    const same = world.tiles.reduce((n, t) => n + neighborIds(t.id, config).filter(id => world.tiles[id].terrain === t.terrain).length, 0);
    expect(same / (world.tiles.length * 6)).toBeGreaterThan(0.5);
  });
  it('has periodic continuous noise at the cylindrical seam', () => {
    expect(noise('seed', 0, 0.4, 8)).toBe(noise('seed', 1, 0.4, 8));
    expect(Math.abs(noise('seed', 0.00001, 0.4, 8) - noise('seed', 0.99999, 0.4, 8))).toBeLessThan(0.001);
  });
  it('routes acyclic rivers through adjacent cells to water', () => {
    for (const river of world.rivers) {
      expect(new Set(river.tiles).size).toBe(river.tiles.length);
      expect(world.tiles[river.tiles.at(-1)!].terrain).toBe('ocean');
      for (let i = 1; i < river.tiles.length; i++) expect(neighborIds(river.tiles[i - 1], config)).toContain(river.tiles[i]);
    }
  });
  it('handles no-land and no-ocean worlds without inventing infrastructure or outlets', () => {
    const flooded = generateWorld({ ...config, seaLevel: 1 }, definitions);
    expect(flooded.settlements).toHaveLength(0); expect(flooded.rivers).toHaveLength(0);
    const dry = generateWorld({ ...config, seaLevel: 0 }, definitions);
    expect(dry.rivers).toHaveLength(0); validateWorld(dry);
  });
  it('validates data packs and classifies a new terrain without core edits', () => {
    const bad = structuredClone(definitions); bad.terrains[0].travelCost = -1;
    expect(() => validateDefinitions(bad)).toThrow();
    const duplicate = structuredClone(definitions); duplicate.terrains.push(duplicate.terrains[0]);
    expect(() => validateDefinitions(duplicate)).toThrow();
    const mod = structuredClone(definitions);
    mod.terrains.splice(1, 0, { id: 'wetland', name: 'Wetland', water: false, travelCost: 4, settlementSuitability: 0.1, rule: { minMoisture: 0.7 } });
    const modWorld = generateWorld({ ...config, moisture: 0.9 }, mod);
    expect(modWorld.tiles.some(t => t.terrain === 'wetland')).toBe(true); validateWorld(modWorld);
  });
  it('enforces stage dependencies and supports trusted appended stages', () => {
    expect(() => generateWorld(config, definitions, [...DEFAULT_STAGES].reverse())).toThrow('requires');
    expect(() => generateWorld(config, definitions, [...DEFAULT_STAGES, DEFAULT_STAGES[0]])).toThrow('Duplicate');
    const extension = { id: 'test-stage', requires: ['terrain'], produces: ['test'], run: ({ world }: { world: World }) => { world.tiles[0].moisture = 0.123; } };
    expect(generateWorld(config, definitions, [...DEFAULT_STAGES, extension]).tiles[0].moisture).toBe(0.123);
  });
});

describe('transport topology and chunk indexing', () => {
  it('joins all terminals on the same landmass with persistent shared physical edges', () => {
    const dry = generateWorld({ ...config, seaLevel: 0 }, definitions);
    for (const network of dry.networks) {
      const terminals = dry.settlements.filter(s => network.type === 'road' || s.type === 'city');
      const nodes = new Map(network.nodes.map(n => [n.tile, n.id]));
      const visited = new Set<string>([nodes.get(terminals[0].tile)!]), queue = [...visited];
      for (let i = 0; i < queue.length; i++) for (const edge of network.edges) {
        const next = edge.from === queue[i] ? edge.to : edge.to === queue[i] ? edge.from : undefined;
        if (next && !visited.has(next)) { visited.add(next); queue.push(next); }
      }
      for (const terminal of terminals) expect(visited.has(nodes.get(terminal.tile)!)).toBe(true);
      expect(new Set(network.edges.map(e => e.id)).size).toBe(network.edges.length);
    }
    expect(buildNetworks(dry)).toEqual(dry.networks);
  });
  it('uses a one-edge seam crossing for road and rail, not a world-spanning route', () => {
    const fixture = generateWorld({ ...config, width: 8, height: 8, seaLevel: 0, settlements: 0 }, definitions);
    fixture.tiles.forEach(t => { t.terrain = 'plains'; });
    fixture.settlements = [0, 7].map((tile, i) => ({ id: 's' + i, tile: tile + 24, type: 'city', name: 'Test', population: 100 }));
    const networks = buildNetworks(fixture);
    for (const n of networks) { expect(n.edges).toHaveLength(1); expect(n.nodes.map(n => n.tile)).toEqual([24, 31]); }
  });
  it('leaves settlements on disconnected islands disconnected', () => {
    const fixture = generateWorld({ ...config, width: 8, height: 8, settlements: 0 }, definitions);
    fixture.tiles.forEach(t => { t.terrain = 'ocean'; });
    [10, 45].forEach(id => { fixture.tiles[id].terrain = 'plains'; });
    fixture.settlements = [10, 45].map(tile => ({ id: 's' + tile, tile, type: 'city', name: 'Island', population: 100 }));
    expect(buildNetworks(fixture).every(n => n.edges.length === 0 && n.nodes.length === 2)).toBe(true);
  });
  it('indexes each network segment at both endpoints and partitions tiles in chunks', () => {
    const source = new LocalWorldSource(world), tiles: number[] = [];
    for (let y = 0; y < config.height / 16; y++) for (let x = 0; x < config.width / 16; x++) tiles.push(...source.getChunk(x, y)!.tiles);
    expect(new Set(tiles).size).toBe(world.tiles.length);
    for (const tile of world.tiles) for (const segment of source.segmentsFor(tile.id)) expect(source.segmentsFor(segment.a === tile.id ? segment.b : segment.a).some(s => s.id === segment.id)).toBe(true);
  });
});

describe('serialization boundary', () => {
  it('round trips the complete semantic world', () => { expect(deserializeWorld(serializeWorld(world))).toEqual(world); });
  it('rejects unsupported versions, dangling nodes, nonadjacent edges, and invalid terrain', () => {
    const badVersion = structuredClone(world); (badVersion as { schemaVersion: number }).schemaVersion = 99;
    const badTile = structuredClone(world); badTile.tiles[0].terrain = 'missing';
    const badEdge = structuredClone(world); badEdge.networks[0].edges[0].to = 'missing';
    const duplicate = structuredClone(world); duplicate.networks[0].edges.push(duplicate.networks[0].edges[0]);
    const badRiver = structuredClone(world); badRiver.rivers[0].tiles[1] = -1;
    for (const bad of [badVersion, badTile, badEdge, duplicate, badRiver]) expect(() => deserializeWorld(JSON.stringify(bad))).toThrow();
  });
});

describe('presentation geometry', () => {
  it('picks every tile center across repeated world copies', () => {
    for (let id = 0; id < world.tiles.length; id++) {
      const p = tileCenter(id, config);
      for (const copy of [-2, 0, 3]) expect(pickTile({ x: p.x + copy * circumference(config), y: p.y }, config)).toBe(id);
    }
    expect(pickTile(hexCenter(fromOffset(0, -1)), config)).toBeUndefined();
  });
  it('shares curved edge portals from both directions, including at the seam', () => {
    for (const a of [0, 47, 100, 400, 720]) for (const b of neighborIds(a, config)) {
      const forward = featureCurve(a, b, 'road', config, 'seed'), backward = featureCurve(b, a, 'road', config, 'seed');
      const p = nearestCopy(backward.portal, forward.portal, config);
      expect(p.x).toBeCloseTo(forward.portal.x, 8); expect(p.y).toBeCloseTo(forward.portal.y, 8);
      expect(Math.hypot(forward.start.x - forward.end.x, forward.start.y - forward.end.y)).toBeLessThan(50);
      expect(curvePoints(forward)[12]).toEqual(forward.portal);
    }
  });
  it('visits only viewport chunks and uses canonical chunks across copies', () => {
    const size = { width: 512, height: 256 };
    const views = visibleChunkKeys(size, 16, -100, 0, 600, 500);
    expect(views.length).toBeLessThan(16);
    expect(views.some(v => v.copy === -1)).toBe(true);
    expect(views.every(v => v.column >= 0 && v.column < 32)).toBe(true);
    expect(visibleChunkKeys(size, 16, 0, -1000, 100, -500)).toHaveLength(0);
  });
});
