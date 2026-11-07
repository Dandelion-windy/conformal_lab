// 复平面视图：背景着色（共享 WebGL）+ 2D 叠加层（网格线、曲线、点）；支持平移、缩放、拖动控制点
import { C } from './complex.js';
import { renderer } from './gl.js';
import { drawAxes, drawHandle } from './draw.js';

export class PlaneView {
  constructor(el, opts = {}) {
    this.el = el;
    el.classList.add('plane-view');
    this.canvas = document.createElement('canvas');
    el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.opts = { axes: true, grid: true, labels: true, pannable: true, zoomable: true, ...opts };
    this.center = C(0, 0);
    this.ppu = 80;
    this.home = null;
    this.handles = [];
    this.bg = null;          // () => { prog, uniforms } 或 null
    this.glLayers = [];      // (renderer, view) => void
    this.overlays = [];      // (ctx, view) => void
    // 工具：{ down(z,e) → 是否捕获指针, move, up, click(z,e) → 是否已处理, hover(z) → 吸附后的位置, cancel(), cursor }
    this.tool = null;
    this.onHover = null; this.onChange = null; this.onView = null;
    if (opts.title) {
      const t = document.createElement('div');
      t.className = 'pv-title';
      t.innerHTML = opts.title;
      el.appendChild(t);
      this.titleEl = t;
    }
    const reset = document.createElement('button');
    reset.className = 'pv-reset';
    reset.title = '重置视图';
    reset.textContent = '⟲';
    reset.onclick = () => this.resetView();
    el.appendChild(reset);
    this.readout = document.createElement('div');
    this.readout.className = 'pv-readout';
    el.appendChild(this.readout);
    this._bind();
    new ResizeObserver(() => this.redraw()).observe(el);
  }
  get W() { return this.el.clientWidth; }
  get H() { return this.el.clientHeight; }
  toScreen(z) { return [this.W / 2 + (z.re - this.center.re) * this.ppu, this.H / 2 - (z.im - this.center.im) * this.ppu]; }
  toWorld(x, y) { return C(this.center.re + (x - this.W / 2) / this.ppu, this.center.im - (y - this.H / 2) / this.ppu); }
  bounds() {
    const a = this.toWorld(0, this.H), b = this.toWorld(this.W, 0);
    return { xmin: a.re, ymin: a.im, xmax: b.re, ymax: b.im };
  }
  setView(cx, cy, halfWidth) {
    this.center = C(cx, cy);
    this._hw = halfWidth;
    this.ppu = Math.max(1e-6, Math.min(this.W || 400, this.H || 400)) / (2 * halfWidth);
    this._lastSize = null;
    if (!this.home) this.home = [cx, cy, halfWidth];
    this.redraw();
    this.onView?.(this);
  }
  setHome(cx, cy, hw) { this.home = [cx, cy, hw]; this.setView(cx, cy, hw); }
  resetView() { if (this.home) this.setView(...this.home); }
  redraw() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
  }
  draw() {
    const W = this.W, H = this.H;
    if (!W || !H) return;
    const size = W + 'x' + H;
    if (this._hw && this._lastSize !== size) {
      // 尺寸变化时保持可见半宽
      this.ppu = Math.min(W, H) / (2 * this._hw);
      this._lastSize = size;
      this.onView?.(this);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#080c18';
    ctx.fillRect(0, 0, cw, ch);
    const r = renderer();
    const bg = this.bg?.();
    if (r.ok && (bg?.prog || this.glLayers.length)) {
      r.begin(cw, ch);
      if (bg?.prog) {
        r.fullscreen(bg.prog, { u_res: [cw, ch], u_center: [this.center.re, this.center.im], u_ppu: this.ppu * dpr, ...bg.uniforms });
      }
      for (const L of this.glLayers) L(r, this, dpr);
      r.copyTo(ctx);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.opts.axes) drawAxes(ctx, this, this.opts);
    for (const o of this.overlays) { ctx.save(); o(ctx, this); ctx.restore(); }
    for (const h of this.handles) if (!h.hidden?.()) drawHandle(ctx, this, h);
  }
  _hit(x, y) {
    let best = null, bd = 14;
    for (const h of this.handles) {
      if (h.hidden?.() || h.locked) continue;
      const [sx, sy] = this.toScreen(h.pos());
      const d = Math.hypot(sx - x, sy - y);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }
  _bind() {
    const c = this.canvas;
    let mode = null, last = null, grabbed = null, down = null, moved = false;
    const pt = (e) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    c.addEventListener('pointerdown', (e) => {
      const [x, y] = pt(e), z = this.toWorld(x, y);
      if (e.button === 2) { this.tool?.cancel?.(); return; }
      down = [x, y]; moved = false;
      c.setPointerCapture(e.pointerId);
      grabbed = null;
      if (this.tool?.down?.(z, e, this)) mode = 'tool';
      else if ((grabbed = this._hit(x, y))) mode = 'handle';
      else if (this.opts.pannable) { mode = 'pan'; c.style.cursor = 'grabbing'; }
      last = [x, y];
    });
    c.addEventListener('contextmenu', (e) => { if (this.tool?.cancel) e.preventDefault(); });
    c.addEventListener('pointermove', (e) => {
      const [x, y] = pt(e);
      let z = this.toWorld(x, y);
      if (mode === 'handle') {
        // 有工具时先等指针移动一小段再拖动，使在控制点上的单击可以交给工具（例如过参数点 a 作图）
        if (moved || !this.tool?.click || Math.hypot(x - down[0], y - down[1]) >= 4) { moved = true; grabbed.move(z, e); this.onChange?.(grabbed); this.redraw(); }
      }
      else if (mode === 'tool') z = this.tool.move?.(z, e, this) || z;
      else if (mode === 'pan') {
        this.center = C(this.center.re - (x - last[0]) / this.ppu, this.center.im + (y - last[1]) / this.ppu);
        this._hw = Math.min(this.W, this.H) / (2 * this.ppu);
        this.redraw(); this.onView?.(this);
      } else {
        z = this.tool?.hover?.(z, this) || z;
        c.style.cursor = this._hit(x, y) ? 'pointer' : this.tool?.cursor || (this.opts.pannable ? 'grab' : 'crosshair');
      }
      last = [x, y];
      if (mode !== 'pan') this.onHover?.(z, this);
    });
    const up = (e) => {
      const [x, y] = pt(e), z = this.toWorld(x, y);
      if (mode === 'tool') this.tool.up?.(z, e, this);
      if (mode === 'handle') { if (!moved) this.tool?.click?.(z, e, this); grabbed.release?.(); }
      if (mode === 'pan' && down && Math.hypot(x - down[0], y - down[1]) < 4 && !this.tool?.click?.(z, e, this)) this.onClick?.(z, this);
      mode = null; grabbed = null; c.style.cursor = '';
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { if (!mode) { this.tool?.hover?.(null, this); this.onHover?.(null, this); } });
    c.addEventListener('wheel', (e) => {
      if (!this.opts.zoomable) return;
      e.preventDefault();
      const [x, y] = pt(e), z0 = this.toWorld(x, y);
      const k = Math.exp(-e.deltaY * 0.0015);
      this.ppu = Math.min(1e6, Math.max(2, this.ppu * k));
      this.center = C(z0.re - (x - this.W / 2) / this.ppu, z0.im + (y - this.H / 2) / this.ppu);
      this._hw = Math.min(this.W, this.H) / (2 * this.ppu);
      this.redraw(); this.onView?.(this);
    }, { passive: false });
  }
}
