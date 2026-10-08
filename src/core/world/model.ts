import type { Size } from './hex';

export interface TerrainDefinition {
  id: string;
  name: string;
  water: boolean;
  travelCost: number;
  settlementSuitability: number;
  /** First matching rule wins. No rule means available to custom generation stages only. */
  rule?: { maxElevation?: number; minElevation?: number; minMoisture?: number };
}
export interface SettlementDefinition { id: string; name: string; minPopulation: number; maxPopulation: number }
export interface InfrastructureDefinition { id: string; name: string; capacity: number; speedKmPerTurn: number }
export interface Definitions {
  version: 1;
  terrains: TerrainDefinition[];
  settlements: SettlementDefinition[];
  infrastructure: InfrastructureDefinition[];
}
export interface GenerationConfig extends Size {
  seed: string;
  seaLevel: number;
  roughness: number;
  moisture: number;
  settlements: number;
  rivers: number;
  hexKm: number;
}
export interface Tile { id: number; terrain: string; elevation: number; moisture: number; temperature: number }
export interface Settlement { id: string; tile: number; type: string; name: string; population: number }
export interface NetworkNode { id: string; tile: number }
export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  capacity: number;
  condition: number;
  owner: string | null;
  travelTime: number;
  damage: number;
}
export interface TransportNetwork { id: string; type: string; nodes: NetworkNode[]; edges: NetworkEdge[] }
export interface River { id: string; tiles: number[] }
export interface World {
  schemaVersion: 1;
  generator: { id: string; version: number; stages: string[] };
  config: GenerationConfig;
  definitions: Definitions;
  tiles: Tile[];
  settlements: Settlement[];
  networks: TransportNetwork[];
  rivers: River[];
}
export const DEFAULT_CONFIG: GenerationConfig = {
  seed: 'SimpleEmpire', width: 96, height: 64, seaLevel: 0.47,
  roughness: 0.55, moisture: 0.5, settlements: 28, rivers: 18, hexKm: 10,
};
/** These are local experiment safeguards, not coordinate encoding limits. */
export function validateConfig(value: GenerationConfig): void {
  if (!value || typeof value.seed !== 'string' || !value.seed.trim() || value.seed.length > 128) throw new Error('Seed must contain 1–128 characters.');
  if (!Number.isInteger(value.width) || value.width < 8 || value.width > 512 || value.width % 2) throw new Error('Width must be an even integer from 8 to 512.');
  if (!Number.isInteger(value.height) || value.height < 8 || value.height > 512 || value.width * value.height > 131072) throw new Error('Height must be 8–512; the local world limit is 131,072 hexes.');
  for (const key of ['seaLevel', 'roughness', 'moisture'] as const) {
    if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1) throw new Error(key + ' must be between 0 and 1.');
  }
  for (const key of ['settlements', 'rivers'] as const) {
    if (!Number.isInteger(value[key]) || value[key] < 0 || value[key] > 128) throw new Error(key + ' must be an integer from 0 to 128.');
  }
  if (!Number.isFinite(value.hexKm) || value.hexKm <= 0 || value.hexKm > 1000) throw new Error('Hex scale must be positive and at most 1000 km.');
}
