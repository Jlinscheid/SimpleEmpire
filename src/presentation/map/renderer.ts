import { Application, Assets, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { mod } from '../../core/world/hex';
import type { WorldSource, Chunk } from '../../core/world/store';
import { sample } from '../../core/world/random';
import { COLUMN_STEP, HEX_HEIGHT, RADIUS, circumference, corners, curvePoints, featureCurve, pickTile, tileCenter, visibleChunkKeys } from './geometry';
import { validateTheme, type MapTheme } from './theme';

export interface RenderContext { source: WorldSource; chunk: Chunk; theme: MapTheme; textures: ReadonlyMap<string, Texture>; detail: boolean }
export interface MapLayer {
  id: string;
  label: string;
  draw(context: RenderContext, container: Container): void;
}
export interface RenderStats { visibleChunks: number; visibleHexes: number; zoom: number; drawMs: number }
const graphics = (container: Container) => { const g = new Graphics(); container.addChild(g); return g; };

function transportLayer(id: string, label: string, type: string): MapLayer {
  return { id, label, draw({ source, chunk, theme, detail }, container) {
    const g = graphics(container), w = source.world;
    for (const tile of chunk.tiles) for (const segment of source.segmentsFor(tile)) {
      if (segment.type !== type) continue;
      const other = tile === segment.a ? segment.b : segment.a;
      const curve = featureCurve(tile, other, type, w.config, w.config.seed, !!source.settlementAt(tile), !!source.settlementAt(other));
      const draw = (color: string, width: number) => g.moveTo(curve.start.x, curve.start.y)
        .quadraticCurveTo(curve.controlA.x, curve.controlA.y, curve.portal.x, curve.portal.y)
        .stroke({ color, width, cap: 'round', join: 'round' });
      if (type === 'river') { draw('#c0d2bc', 4.6); draw(theme.river, 2.5); }
      if (type === 'road') { draw('#e2d6af', 3.4); draw(theme.road, 1.35); }
      if (type === 'rail') {
        draw('#ddd4b5', 3.9); draw(theme.rail, 1.5);
        if (detail) {
          const points = curvePoints(curve).slice(0, 13);
          for (let i = 2; i < points.length; i += 3) {
            const p = points[i], prev = points[i - 1], dx = p.x - prev.x, dy = p.y - prev.y, length = Math.hypot(dx, dy) || 1;
            g.moveTo(p.x - dy / length * 2, p.y + dx / length * 2).lineTo(p.x + dy / length * 2, p.y - dx / length * 2).stroke({ color: theme.rail, width: 1 });
          }
        }
      }
    }
  } };
}

export const DEFAULT_LAYERS: readonly MapLayer[] = [
  { id: 'terrain', label: 'Base terrain', draw({ source, chunk, theme }, container) {
    const g = graphics(container);
    for (const id of chunk.tiles) {
      const tile = source.world.tiles[id], p = tileCenter(id, source.world.config);
      g.poly(corners(p)).fill(theme.terrains[tile.terrain].color);
      // Low-amplitude ink grain: seeded placement, shared geometry, no per-hex texture allocation.
      const grain = sample(source.world.config.seed, 'grain:' + id);
      g.poly(corners(p)).fill({ color: grain > 0.5 ? '#fff8df' : '#405d4d', alpha: Math.abs(grain - 0.5) * 0.09 });
      if (source.world.definitions.terrains.find(t => t.id === tile.terrain)!.water) {
        g.moveTo(p.x - 6, p.y + 2).quadraticCurveTo(p.x, p.y + 4, p.x + 6, p.y + 2).stroke({ color: '#d6e2d5', width: 0.7, alpha: 0.3 });
      }
    }
  } },
  { id: 'details', label: 'Terrain details', draw({ source, chunk, theme, textures, detail }, container) {
    if (!detail) return;
    for (const id of chunk.tiles) {
      const symbol = theme.terrains[source.world.tiles[id].terrain].symbol;
      if (!symbol) continue;
      const sprite = new Sprite(textures.get(symbol)); const p = tileCenter(id, source.world.config);
      sprite.anchor.set(0.5); sprite.position.set(p.x, p.y); sprite.width = 29; sprite.height = 29; sprite.alpha = 0.85; container.addChild(sprite);
    }
  } },
  transportLayer('waterways', 'Waterways', 'river'),
  transportLayer('railways', 'Railways', 'rail'),
  transportLayer('roads', 'Roads', 'road'),
  { id: 'settlements', label: 'Settlements', draw({ source, chunk, theme, textures, detail }, container) {
    for (const id of chunk.tiles) {
      const settlement = source.settlementAt(id); if (!settlement) continue;
      const p = tileCenter(id, source.world.config), sprite = new Sprite(textures.get(theme.settlements[settlement.type]));
      sprite.anchor.set(0.5); sprite.position.set(p.x, p.y); sprite.width = 24; sprite.height = 24; container.addChild(sprite);
      if (detail) {
        const label = new Text({ text: settlement.name, style: { fontFamily: 'Georgia', fontSize: 10, fontWeight: '600', fill: '#3e4438', stroke: { color: '#e6e5c7', width: 3 }, letterSpacing: 0.3 } });
        label.anchor.set(0.5, 0); label.position.set(p.x, p.y + 12); container.addChild(label);
      }
    }
  } },
  { id: 'grid', label: 'Hex grid', draw({ source, chunk, theme }, container) {
    const g = graphics(container);
    for (const id of chunk.tiles) g.poly(corners(tileCenter(id, source.world.config))).stroke({ color: theme.grid, width: 0.45, alpha: 0.26 });
  } },
  { id: 'selection', label: 'Selection overlay', draw() { /* Dynamic selection is drawn once over the chunk layers. */ } },
];

/** Viewport-only chunk renderer. GPU objects exist only for visible chunks plus a one-hex margin.
 * Longitude copies are views of canonical data. Pan moves the camera, never the world. */
export class MapRenderer {
  readonly app = new Application();
  private source?: WorldSource;
  private roots = new Map<string, Container>();
  private chunks = new Map<string, { containers: Container[]; count: number }>();
  private textures = new Map<string, Texture>();
  private selected?: number;
  private overlay = new Graphics();
  private camera = { x: 0, y: 0, zoom: 1 };
  private detail = true;
  private dirty = true;
  private pointer?: { x: number; y: number; lastX: number; lastY: number; moved: boolean };
  private abort = new AbortController();
  private observer?: ResizeObserver;
  onSelect: (id: number | undefined) => void = () => {};
  onHover: (id: number | undefined) => void = () => {};
  onStats: (stats: RenderStats) => void = () => {};
  constructor(readonly host: HTMLElement, readonly theme: MapTheme, readonly layers = DEFAULT_LAYERS) {
    if (new Set(layers.map(l => l.id)).size !== layers.length || !layers.some(l => l.id === 'selection')) throw new Error('Layers need unique IDs and a selection overlay.');
  }
  async init(): Promise<void> {
    await this.app.init({ background: '#d7dfcb', antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true, preference: 'webgl', autoStart: false });
    this.host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', 'Interactive hex world map. Drag to pan, scroll to zoom, click a hex to inspect.');
    this.app.canvas.tabIndex = 0;
    const loaded = await Promise.all(Object.entries(this.theme.symbols).map(async ([key, url]) => [key, await Assets.load<Texture>(url)] as const));
    loaded.forEach(([key, texture]) => this.textures.set(key, texture));
    for (const layer of this.layers) { const root = new Container(); this.roots.set(layer.id, root); this.app.stage.addChild(root); }
    this.roots.get('selection')!.addChild(this.overlay);
    this.observer = new ResizeObserver(() => { this.app.renderer.resize(this.host.clientWidth, this.host.clientHeight); this.dirty = true; });
    this.observer.observe(this.host);
    this.app.renderer.resize(this.host.clientWidth, this.host.clientHeight);
    this.bindInput();
    this.app.ticker.add(() => { if (this.dirty && this.source) this.renderViewport(); });
    this.app.start();
  }
  setWorld(source: WorldSource): void {
    validateTheme(this.theme, source.world.definitions);
    this.clearChunks(); this.source = source; this.selected = undefined;
    const firstCity = source.world.settlements.find(s => s.type === 'city');
    const p = firstCity ? tileCenter(firstCity.tile, source.world.config) : tileCenter(Math.floor(source.world.tiles.length / 2), source.world.config);
    this.camera = { ...p, zoom: 1.1 }; this.dirty = true; this.onSelect(undefined);
  }
  setLayerVisible(id: string, visible: boolean): void { const root = this.roots.get(id); if (root) root.visible = visible; this.dirty = true; }
  zoomBy(factor: number): void { this.zoomAt(factor, this.host.clientWidth / 2, this.host.clientHeight / 2); }
  home(): void { if (this.source) { this.camera.x = circumference(this.source.world.config) / 2; this.camera.y = this.source.world.config.height * HEX_HEIGHT / 2; this.camera.zoom = 0.8; this.dirty = true; } }
  select(id: number): void { if (!this.source?.world.tiles[id]) return; this.selected = id; this.dirty = true; this.onSelect(id); }
  focus(id: number): void { if (!this.source?.world.tiles[id]) return; Object.assign(this.camera, tileCenter(id, this.source.world.config)); this.select(id); }
  private zoomAt(factor: number, x: number, y: number): void {
    const old = this.camera.zoom, next = Math.max(0.5, Math.min(3.5, old * factor));
    this.camera.x += (x - this.host.clientWidth / 2) * (1 / old - 1 / next);
    this.camera.y += (y - this.host.clientHeight / 2) * (1 / old - 1 / next);
    this.camera.zoom = next; this.dirty = true;
  }
  private screenToWorld(x: number, y: number) { return { x: (x - this.host.clientWidth / 2) / this.camera.zoom + this.camera.x, y: (y - this.host.clientHeight / 2) / this.camera.zoom + this.camera.y }; }
  private bindInput(): void {
    const canvas = this.app.canvas, options = { signal: this.abort.signal };
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      canvas.focus(); canvas.setPointerCapture(e.pointerId);
      this.pointer = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
      canvas.style.cursor = 'grabbing';
    }, options);
    canvas.addEventListener('pointermove', e => {
      if (this.pointer) {
        const p = this.pointer; p.moved ||= Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4;
        if (p.moved) { this.camera.x -= (e.clientX - p.lastX) / this.camera.zoom; this.camera.y -= (e.clientY - p.lastY) / this.camera.zoom; this.dirty = true; }
        p.lastX = e.clientX; p.lastY = e.clientY;
      }
      const rect = canvas.getBoundingClientRect();
      if (this.source) this.onHover(pickTile(this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top), this.source.world.config));
    }, options);
    canvas.addEventListener('pointerup', e => {
      if (this.pointer && !this.pointer.moved && this.source) {
        const rect = canvas.getBoundingClientRect(), id = pickTile(this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top), this.source.world.config);
        this.selected = id; this.onSelect(id); this.dirty = true;
      }
      this.pointer = undefined; canvas.style.cursor = 'grab';
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    }, options);
    canvas.addEventListener('pointercancel', () => { this.pointer = undefined; canvas.style.cursor = 'grab'; }, options);
    canvas.addEventListener('wheel', e => { e.preventDefault(); const rect = canvas.getBoundingClientRect(); this.zoomAt(Math.exp(-e.deltaY * 0.001), e.clientX - rect.left, e.clientY - rect.top); }, { ...options, passive: false });
    canvas.addEventListener('keydown', e => {
      const step = 80 / this.camera.zoom;
      if (e.key === 'ArrowLeft') this.camera.x -= step;
      else if (e.key === 'ArrowRight') this.camera.x += step;
      else if (e.key === 'ArrowUp') this.camera.y -= step;
      else if (e.key === 'ArrowDown') this.camera.y += step;
      else if (e.key === '+' || e.key === '=') this.zoomBy(1.2);
      else if (e.key === '-') this.zoomBy(1 / 1.2);
      else return;
      e.preventDefault(); this.dirty = true;
    }, options);
  }
  private clearChunks(): void {
    for (const chunk of this.chunks.values()) chunk.containers.forEach(c => c.destroy({ children: true }));
    this.chunks.clear();
  }
  private renderViewport(): void {
    const start = performance.now(), source = this.source!, size = source.world.config;
    const width = this.host.clientWidth, height = this.host.clientHeight;
    // Keep a bounded visible area even on very large/high-resolution monitors.
    this.camera.zoom = Math.max(this.camera.zoom, Math.sqrt(width * height / (7000 * COLUMN_STEP * HEX_HEIGHT)));
    this.camera.x = mod(this.camera.x, circumference(size));
    this.camera.y = Math.max(0, Math.min((size.height - 0.5) * HEX_HEIGHT, this.camera.y));
    const { zoom } = this.camera, detail = zoom >= 0.8;
    if (detail !== this.detail) { this.detail = detail; this.clearChunks(); }
    for (const root of this.roots.values()) { root.scale.set(zoom); root.position.set(width / 2 - this.camera.x * zoom, height / 2 - this.camera.y * zoom); }
    const topLeft = this.screenToWorld(0, 0), bottomRight = this.screenToWorld(width, height);
    const visible = visibleChunkKeys(size, source.chunkSize, topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
    const keys = new Set(visible.map(v => v.key));
    for (const [key, chunk] of this.chunks) if (!keys.has(key)) { chunk.containers.forEach(c => c.destroy({ children: true })); this.chunks.delete(key); }
    for (const view of visible) {
      if (this.chunks.has(view.key)) continue;
      const chunk = source.getChunk(view.column, view.row); if (!chunk) continue;
      const containers: Container[] = [];
      for (const layer of this.layers) {
        const container = new Container(); container.x = view.copy * circumference(size);
        layer.draw({ source, chunk, theme: this.theme, textures: this.textures, detail }, container);
        this.roots.get(layer.id)!.addChild(container); containers.push(container);
      }
      this.chunks.set(view.key, { containers, count: chunk.tiles.length });
    }
    this.overlay.clear();
    if (this.selected !== undefined) {
      const center = tileCenter(this.selected, size);
      for (let copy = Math.floor(topLeft.x / circumference(size)) - 1; copy <= Math.ceil(bottomRight.x / circumference(size)); copy++) {
        this.overlay.poly(corners({ x: center.x + copy * circumference(size), y: center.y })).fill({ color: this.theme.selection, alpha: 0.14 }).stroke({ color: this.theme.selection, width: 2 / zoom });
      }
    }
    this.dirty = false;
    this.onStats({ visibleChunks: this.chunks.size, visibleHexes: [...this.chunks.values()].reduce((n, c) => n + c.count, 0), zoom, drawMs: performance.now() - start });
  }
  destroy(): void { this.abort.abort(); this.observer?.disconnect(); this.clearChunks(); this.app.destroy(true, { children: true }); }
}
