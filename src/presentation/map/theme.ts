import forest from '../../../assets/map/forest.svg?url';
import hills from '../../../assets/map/hills.svg?url';
import mountains from '../../../assets/map/mountains.svg?url';
import city from '../../../assets/map/city.svg?url';
import town from '../../../assets/map/town.svg?url';
import type { Definitions } from '../../core/world/model';

export interface TerrainStyle { color: string; symbol?: string }
export interface MapTheme {
  id: string;
  terrains: Record<string, TerrainStyle>;
  symbols: Record<string, string>;
  settlements: Record<string, string>;
  river: string;
  road: string;
  rail: string;
  grid: string;
  selection: string;
}
/** SVG URLs and colors are independent of the semantic definition pack. */
export const atlasTheme: MapTheme = {
  id: 'field-atlas',
  terrains: {
    ocean: { color: '#90b6be' }, plains: { color: '#c5cba3' },
    forest: { color: '#a7bb93', symbol: 'forest' }, hills: { color: '#c6c09a', symbol: 'hills' },
    mountains: { color: '#b9b8a0', symbol: 'mountains' },
  },
  symbols: { forest, hills, mountains, city, town }, settlements: { city: 'city', town: 'town' },
  river: '#3d9fc4', road: '#806044', rail: '#374151', grid: '#556358', selection: '#c77339',
};
export function validateTheme(theme: MapTheme, definitions: Definitions): void {
  const color = (value: unknown) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  for (const t of definitions.terrains) {
    const style = theme.terrains[t.id];
    if (!style || !color(style.color) || (style.symbol && !theme.symbols[style.symbol])) throw new Error('Missing or invalid terrain style: ' + t.id);
  }
  for (const t of definitions.settlements) if (!theme.symbols[theme.settlements[t.id]]) throw new Error('Missing settlement symbol: ' + t.id);
  for (const key of ['river', 'road', 'rail', 'grid', 'selection'] as const) if (!color(theme[key])) throw new Error('Invalid theme color: ' + key);
  for (const url of Object.values(theme.symbols)) if (typeof url !== 'string' || !url) throw new Error('Invalid symbol URL.');
}
