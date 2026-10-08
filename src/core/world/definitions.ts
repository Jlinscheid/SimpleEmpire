import type { Definitions } from './model';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, low: number, high = Infinity): boolean => typeof v === 'number' && Number.isFinite(v) && v >= low && v <= high;
/** Runtime schema boundary for JSON data packs; no executable mod loading. */
export function validateDefinitions(input: unknown): asserts input is Definitions {
  if (!record(input) || input.version !== 1) throw new Error('Unsupported definitions version.');
  for (const key of ['terrains', 'settlements', 'infrastructure']) {
    const entries = input[key];
    if (!Array.isArray(entries) || !entries.length) throw new Error('Missing definition list: ' + key);
    const ids = new Set<string>();
    for (const entry of entries) {
      if (!record(entry) || typeof entry.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(entry.id) || ids.has(entry.id) || typeof entry.name !== 'string' || !entry.name.trim()) throw new Error('Invalid or duplicate definition in ' + key);
      ids.add(entry.id);
      if (key === 'terrains') {
        if (typeof entry.water !== 'boolean' || !finite(entry.travelCost, 0.01) || !finite(entry.settlementSuitability, 0, 1)) throw new Error('Invalid terrain ' + entry.id);
        if (entry.rule !== undefined) {
          if (!record(entry.rule) || Object.entries(entry.rule).some(([k, v]) => !['minElevation', 'maxElevation', 'minMoisture'].includes(k) || !finite(v, 0, 1))) throw new Error('Invalid classification rule.');
        }
      } else if (key === 'settlements') {
        if (!finite(entry.minPopulation, 1) || !finite(entry.maxPopulation, entry.minPopulation as number)) throw new Error('Invalid settlement population.');
      } else if (!finite(entry.capacity, 0) || !finite(entry.speedKmPerTurn, 0.01)) throw new Error('Invalid infrastructure.');
    }
  }
  const defs = input as unknown as Definitions;
  if (!defs.terrains.some(t => t.water) || !defs.terrains.some(t => !t.water && t.rule && Object.keys(t.rule).length === 0)) throw new Error('Definitions require water and an unconditional land fallback.');
  for (const id of ['city', 'town']) if (!defs.settlements.some(s => s.id === id)) throw new Error('Default settlement stage requires ' + id);
  for (const id of ['road', 'rail']) if (!defs.infrastructure.some(s => s.id === id)) throw new Error('Default transport stage requires ' + id);
}
