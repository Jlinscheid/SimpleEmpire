import { neighborIds } from './hex';
import type { TransportNetwork, World } from './model';
import { MinHeap } from './random';

/** Dijkstra to the nearest unconnected terminal; water is impassable in v0.1. */
export function routeToAny(world: World, start: number, targets: ReadonlySet<number>): number[] | undefined {
  const costs = new Float64Array(world.tiles.length).fill(Infinity);
  const parent = new Int32Array(world.tiles.length).fill(-1);
  const terrain = new Map(world.definitions.terrains.map(t => [t.id, t]));
  const heap = new MinHeap(); costs[start] = 0; heap.push(start, 0);
  while (heap.size) {
    const { id, cost } = heap.pop();
    if (cost !== costs[id]) continue;
    if (targets.has(id)) {
      const path = [id]; let cursor = id;
      while (cursor !== start) { cursor = parent[cursor]; path.push(cursor); }
      return path.reverse();
    }
    for (const next of neighborIds(id, world.config)) {
      const def = terrain.get(world.tiles[next].terrain)!;
      if (def.water) continue;
      const nextCost = cost + (def.travelCost + terrain.get(world.tiles[id].terrain)!.travelCost) / 2;
      if (nextCost < costs[next]) { costs[next] = nextCost; parent[next] = id; heap.push(next, nextCost); }
    }
  }
  return undefined;
}

/** Incrementally join each terminal to the existing forest. Disconnected islands stay separate.
 * Edges are deduplicated shared physical segments, not one route per settlement pair. */
export function buildNetworks(world: World): TransportNetwork[] {
  return world.definitions.infrastructure.filter(d => d.id === 'road' || d.id === 'rail').map(def => {
    const network: TransportNetwork = { id: 'network:' + def.id, type: def.id, nodes: [], edges: [] };
    const connected = new Set<number>(), nodes = new Set<number>(), edges = new Set<string>();
    const terminals = world.settlements.filter(s => def.id === 'road' || s.type === 'city');
    for (const terminal of terminals) {
      const path = connected.size ? routeToAny(world, terminal.tile, connected) : undefined;
      connected.add(terminal.tile); nodes.add(terminal.tile);
      if (!path) continue;
      for (const tile of path) { nodes.add(tile); connected.add(tile); }
      for (let i = 1; i < path.length; i++) {
        const a = Math.min(path[i - 1], path[i]), b = Math.max(path[i - 1], path[i]);
        const id = `${def.id}:${a}:${b}`;
        if (edges.has(id)) continue;
        edges.add(id);
        network.edges.push({ id, from: `${def.id}:${a}`, to: `${def.id}:${b}`, capacity: def.capacity, condition: 1, owner: null, travelTime: world.config.hexKm / def.speedKmPerTurn, damage: 0 });
      }
    }
    network.nodes = [...nodes].sort((a, b) => a - b).map(tile => ({ id: `${def.id}:${tile}`, tile }));
    network.edges.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return network;
  });
}
