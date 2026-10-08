import './style.css';
import { DEFAULT_CONFIG, validateConfig, type World, type GenerationConfig } from '../../../src/core/world/model';
import { DEFAULT_FORMAT, formatCoordinate, hexAt, indexOf, parseCoordinate, type CoordinateFormat } from '../../../src/core/world/hex';
import { LocalWorldSource } from '../../../src/core/world/store';
import { serializeWorld, deserializeWorld } from '../../../src/core/world/serialization';
import { DEFAULT_LAYERS, MapRenderer } from '../../../src/presentation/map/renderer';
import { atlasTheme } from '../../../src/presentation/map/theme';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
  <header class="masthead"><a class="brand" href="./" aria-label="SimpleEmpire home"><span class="brand-mark">⬡</span><span>SIMPLE<span class="brand-light">EMPIRE</span><small>WORLD ATLAS / EXPERIMENT 001</small></span></a><div class="edition"><span class="live-dot"></span> PROCEDURAL CARTOGRAPHY <span class="version">v0.1</span></div></header>
  <main class="workspace">
    <aside class="sidebar controls"><div class="section-heading"><span class="eyebrow">01 / GENERATION</span><h1>A world to explore.</h1><p>Shape the geography of your next campaign.</p></div>
      <form id="generation-form">
        <label class="field">World seed<input id="seed" name="seed" value="SimpleEmpire" maxlength="128" required spellcheck="false" /></label>
        <div class="field-row"><label class="field">Width · hexes<input id="width" type="number" min="8" max="512" step="2" value="96" required /></label><label class="field">Height · hexes<input id="height" type="number" min="8" max="512" step="1" value="64" required /></label></div>
        <label class="range-field" for="seaLevel"><span>Sea level <output id="seaLevel-value">47%</output></span><input id="seaLevel" type="range" min="0" max="1" step="0.01" value="0.47" /></label>
        <label class="range-field" for="roughness"><span>Relief <output id="roughness-value">55%</output></span><input id="roughness" type="range" min="0" max="1" step="0.01" value="0.55" /></label>
        <label class="range-field" for="moisture"><span>Moisture <output id="moisture-value">50%</output></span><input id="moisture" type="range" min="0" max="1" step="0.01" value="0.5" /></label>
        <div class="field-row"><label class="field">Settlements<input id="settlement-count" type="number" min="0" max="128" value="28" required /></label><label class="field">River sources<input id="river-count" type="number" min="0" max="128" value="18" required /></label></div>
        <button class="primary" id="generate" type="submit"><span>Generate world</span><span aria-hidden="true">↻</span></button>
      </form>
      <section class="layers"><div class="section-label"><span class="eyebrow">02 / MAP LAYERS</span><span class="small-muted">8 layers</span></div><div id="layer-controls"></div></section>
      <details class="utilities"><summary>Coordinates & world files</summary><label class="field">Coordinate style<select id="coordinate-format"><option value="3">AAA-AAA</option><option value="2">AA:AA</option><option value="1">A-A</option></select></label><form id="locate-form" class="locate"><input id="locate" aria-label="Coordinate to locate" placeholder="AAA-AAA" /><button type="submit">Go</button></form><div class="file-actions"><button id="export" type="button">Export JSON</button><button id="import" type="button">Import JSON</button><input id="import-file" type="file" accept=".json,application/json" hidden /></div></details>
      <p id="message" role="status" aria-live="polite">Preparing the atlas…</p>
    </aside>
    <section class="map-panel" aria-label="World map"><div id="map"></div><div class="map-heading"><span class="eyebrow">FIELD ATLAS</span><h2 id="world-title">The SimpleEmpire world</h2><span id="world-subtitle">Seeded geography · cylindrical world</span></div><div class="compass" aria-hidden="true"><span>N</span><div>↑</div></div><div class="map-tools"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="home" aria-label="Center map">⌖</button></div><div class="map-bottom"><span id="hover-coordinate">DRAG TO PAN · SCROLL TO ZOOM</span><div class="scale"><div id="scale-line"></div><span id="scale-label">10 km / hex</span></div></div><div class="loading" id="loading"><span class="loader"></span><span id="loading-text">Drawing the first atlas…</span></div></section>
    <aside class="sidebar inspector"><div class="section-label"><span class="eyebrow">03 / HEX INSPECTOR</span><span class="status-chip">LIVE</span></div><div id="inspection" aria-live="polite"><div class="empty-inspector"><span>⬡</span><h2>Read the landscape</h2><p>Select a hex to explore its terrain, waterways, settlements, and transport connections.</p></div></div><div class="legend"><span class="eyebrow">TERRAIN KEY</span><div id="terrain-legend"></div><div class="line-legend"><span><i class="river-line"></i>River</span><span><i class="road-line"></i>Road</span><span><i class="rail-line"></i>Rail</span></div></div><section class="world-summary"><span class="eyebrow">ATLAS NOTES</span><p id="world-summary">Generating geography…</p><p class="small-muted">East meets west. North and south are bounded. Nominal scale: 10 km across each hex.</p></section></aside>
  </main><footer><span><span class="live-dot"></span> <span id="generation-stats">INITIALIZING</span></span><span id="render-stats">WEBGL / PIXIJS</span><a href="https://github.com/Jlinscheid/SimpleEmpire" target="_blank" rel="noreferrer">SimpleEmpire ↗</a></footer>`;

let world: World | undefined, source: LocalWorldSource | undefined, selected: number | undefined;
let format: CoordinateFormat = DEFAULT_FORMAT;
let generation = 0, worker: Worker | undefined;
const renderer = new MapRenderer(el('map'), atlasTheme);
const message = (text: string, error = false) => { el('message').textContent = text; el('message').classList.toggle('error', error); };
const busy = (value: boolean) => { el('loading').hidden = !value; el<HTMLButtonElement>('generate').disabled = value; el<HTMLButtonElement>('import').disabled = value; el<HTMLButtonElement>('export').disabled = value || !world; };
const number = (id: string) => Number(el<HTMLInputElement>(id).value);
const coord = (id: number) => formatCoordinate(hexAt(id, world!.config), format);
const addFact = (parent: HTMLElement, label: string, value: string) => { const row = document.createElement('div'); row.className = 'fact'; const key = document.createElement('span'), val = document.createElement('strong'); key.textContent = label; val.textContent = value; row.append(key, val); parent.append(row); };

function inspect(id?: number): void {
  selected = id;
  if (id === undefined || !world || !source) {
    el('inspection').innerHTML = '<div class="empty-inspector"><span>⬡</span><h2>Read the landscape</h2><p>Select a hex to inspect its terrain and connections.</p></div>'; return;
  }
  const tile = world.tiles[id], terrain = world.definitions.terrains.find(t => t.id === tile.terrain)!;
  const panel = el('inspection'); panel.replaceChildren();
  const heading = document.createElement('h2'); heading.className = 'coordinate'; heading.textContent = coord(id); panel.append(heading);
  const type = document.createElement('div'); type.className = 'terrain-badge'; type.style.background = atlasTheme.terrains[tile.terrain].color; type.textContent = terrain.name; panel.append(type);
  addFact(panel, 'Axial q, r', `${hexAt(id, world.config).q}, ${hexAt(id, world.config).r}`);
  addFact(panel, 'Elevation index', tile.elevation.toFixed(3));
  addFact(panel, 'Moisture', Math.round(tile.moisture * 100) + '%');
  addFact(panel, 'Temperature index', tile.temperature.toFixed(2));
  const settlement = source.settlementAt(id);
  if (settlement) { const h = document.createElement('h3'); h.textContent = settlement.name; panel.append(h); addFact(panel, settlement.type, settlement.population.toLocaleString() + ' residents'); addFact(panel, 'Settlement ID', settlement.id); }
  const segments = source.segmentsFor(id);
  const heading2 = document.createElement('h3'); heading2.textContent = 'Connections'; panel.append(heading2);
  if (!segments.length) { const p = document.createElement('p'); p.className = 'small-muted'; p.textContent = 'No infrastructure or waterways in this hex.'; panel.append(p); }
  for (const segment of segments) {
    const block = document.createElement('div'); block.className = 'connection';
    const button = document.createElement('button'); const other = segment.a === id ? segment.b : segment.a;
    button.textContent = `${segment.type === 'river' ? 'River' : segment.type === 'rail' ? 'Railway' : 'Road'} → ${coord(other)}`;
    button.addEventListener('click', () => renderer.focus(other)); block.append(button);
    const info = document.createElement('small'); info.textContent = segment.id + (segment.edge ? ` · capacity ${segment.edge.capacity} · condition ${Math.round(segment.edge.condition * 100)}%` : ''); block.append(info); panel.append(block);
  }
}
function acceptWorld(next: World, duration: number, imported = false): void {
  // Renderer validates the theme before replacing its old world.
  const nextSource = new LocalWorldSource(next); renderer.setWorld(nextSource);
  world = next; source = nextSource; inspect();
  el('world-title').textContent = `The ${world.config.seed} world`;
  el('world-subtitle').textContent = `${world.config.width} × ${world.config.height} hexes · east–west wrap`;
  const land = world.tiles.filter(t => !world!.definitions.terrains.find(d => d.id === t.terrain)!.water).length;
  el('world-summary').textContent = `${world.tiles.length.toLocaleString()} hexes · ${Math.round(land / world.tiles.length * 100)}% land. ${world.settlements.length} settlements, ${world.rivers.length} rivers, and ${world.networks.reduce((n, net) => n + net.edges.length, 0)} transport segments.`;
  el('generation-stats').textContent = `${imported ? 'IMPORTED' : 'GENERATED'} IN ${Math.round(duration)} MS · ${world.tiles.length.toLocaleString()} HEXES`;
  el('terrain-legend').replaceChildren();
  for (const terrain of world.definitions.terrains) {
    const item = document.createElement('span'), swatch = document.createElement('i'); swatch.style.background = atlasTheme.terrains[terrain.id].color; item.append(swatch, document.createTextNode(terrain.name)); el('terrain-legend').append(item);
  }
  message(imported ? 'World file loaded and validated.' : `Seed “${world.config.seed}” is ready. Select a hex to explore.`); busy(false);
}
function requestWorld(config: GenerationConfig): void {
  try { validateConfig(config); } catch (error) { message((error as Error).message, true); return; }
  busy(true); el('loading-text').textContent = 'Surveying land & tracing connections…'; message('Generating a deterministic world…');
  worker?.terminate(); worker = new Worker(new URL('./generation.worker.ts', import.meta.url), { type: 'module' });
  const request = ++generation;
  worker.onmessage = event => {
    if (event.data.request !== generation) return;
    try {
      if (event.data.error) throw new Error(event.data.error);
      acceptWorld(event.data.world, event.data.duration);
    } catch (error) { message((error as Error).message, true); busy(false); }
    worker?.terminate(); worker = undefined;
  };
  worker.onerror = event => { if (request !== generation) return; message('Generation failed: ' + event.message, true); busy(false); worker?.terminate(); worker = undefined; };
  worker.postMessage({ request, config });
}
el('generation-form').addEventListener('submit', event => {
  event.preventDefault(); requestWorld({ ...DEFAULT_CONFIG, seed: el<HTMLInputElement>('seed').value, width: number('width'), height: number('height'), seaLevel: number('seaLevel'), roughness: number('roughness'), moisture: number('moisture'), settlements: number('settlement-count'), rivers: number('river-count') });
});
for (const name of ['seaLevel', 'roughness', 'moisture']) el(name).addEventListener('input', () => { el(name + '-value').textContent = Math.round(number(name) * 100) + '%'; });
for (const layer of DEFAULT_LAYERS) {
  const label = document.createElement('label'); label.className = 'layer-toggle';
  const input = document.createElement('input'); input.type = 'checkbox'; input.checked = true; input.dataset.layer = layer.id;
  const name = document.createElement('span'); name.textContent = layer.label;
  input.addEventListener('change', () => renderer.setLayerVisible(layer.id, input.checked)); label.append(input, name); el('layer-controls').append(label);
}
el('coordinate-format').addEventListener('change', () => {
  const minLetters = number('coordinate-format'); format = { minLetters, separator: minLetters === 2 ? ':' : '-' };
  el<HTMLInputElement>('locate').placeholder = minLetters === 2 ? 'AA:AA' : minLetters === 3 ? 'AAA-AAA' : 'A-A'; inspect(selected);
});
el('locate-form').addEventListener('submit', event => {
  event.preventDefault(); if (!world) return;
  try {
    const hex = parseCoordinate(el<HTMLInputElement>('locate').value, format);
    // Typed references are canonical; don't silently wrap an out-of-world column.
    const id = hex.q < world.config.width ? indexOf(hex, world.config) : undefined;
    if (id === undefined) throw new Error('That coordinate is outside this world.');
    renderer.focus(id); message('Located ' + coord(id));
  } catch (error) { message((error as Error).message, true); }
});
el('zoom-in').addEventListener('click', () => renderer.zoomBy(1.25));
el('zoom-out').addEventListener('click', () => renderer.zoomBy(0.8));
el('home').addEventListener('click', () => renderer.home());
el('export').addEventListener('click', () => {
  if (!world) return;
  const url = URL.createObjectURL(new Blob([serializeWorld(world)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'simple-empire-world.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('World exported with definitions and network data.');
});
el('import').addEventListener('click', () => el<HTMLInputElement>('import-file').click());
el('import-file').addEventListener('change', async () => {
  const input = el<HTMLInputElement>('import-file'), file = input.files?.[0]; if (!file) return;
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error('World files must be smaller than 50 MB.');
    const start = performance.now(), next = deserializeWorld(await file.text()); acceptWorld(next, performance.now() - start, true);
    for (const [id, value] of Object.entries({ seed: next.config.seed, width: next.config.width, height: next.config.height, seaLevel: next.config.seaLevel, roughness: next.config.roughness, moisture: next.config.moisture, 'settlement-count': next.config.settlements, 'river-count': next.config.rivers })) el<HTMLInputElement>(id).value = String(value);
    for (const name of ['seaLevel', 'roughness', 'moisture']) el(name + '-value').textContent = Math.round(number(name) * 100) + '%';
  } catch (error) { message('Import rejected: ' + (error as Error).message, true); } finally { input.value = ''; }
});
renderer.onSelect = inspect;
renderer.onHover = id => { el('hover-coordinate').textContent = id === undefined || !world ? 'NORTHERN / SOUTHERN BOUNDARY' : `${coord(id)} · ${world.definitions.terrains.find(t => t.id === world!.tiles[id].terrain)!.name.toUpperCase()}`; };
renderer.onStats = stats => {
  el('render-stats').textContent = `${stats.visibleChunks} CHUNKS · ${stats.visibleHexes.toLocaleString()} DRAWN HEXES · ${Math.round(stats.zoom * 100)}% · ${stats.drawMs.toFixed(1)} MS PREP`;
  el('scale-line').style.width = `${Math.sqrt(3) * 20 * stats.zoom}px`; el('scale-label').textContent = `${world?.config.hexKm ?? 10} km`;
};
busy(true);
renderer.init().then(() => requestWorld(DEFAULT_CONFIG)).catch(error => { busy(false); message('Map could not start. WebGL is required. ' + error.message, true); });
window.addEventListener('pagehide', () => { worker?.terminate(); renderer.destroy(); }, { once: true });
