// 黎曼球面三维视图：光线投射背景 + 2D 叠加（曲线按可见性分实线/虚线），拖动旋转视角，滚轮缩放
import { renderer } from './gl.js';
import { vadd, vsub, vscale, vdot, vcross, vnorm, mat3Id, toGL, raySphere, planeToSphere, sphereToPlane } from './vec3.js';
import { label } from './draw.js';

export class SphereView {
  constructor(el, opts = {}) {
    this.el = el;
    el.classList.add('plane-view', 'sphere-view');
    this.canvas = document.createElement('canvas');
    el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.cam = { yaw: -0.9, pitch: 0.42, dist: 6.2, fov: 0.5, target: [0, 0, 0] };
    this.S = { c: [0, 0, 0], r: 1, rot: mat3Id(), texOff: [0, 0], texScale: 1 };
    this.opts = { plane: true, planeR: 3.2, sAlpha: 0.88, pAlpha: 0.85, ...opts };
    this.prog = null; this.uniforms = {};
    this.overlays = []; this.handles = []; this.glLayers = [];
    this.onChange = null; this.onCamera = null; this.onHover = null;
    if (opts.title) { const t = document.createElement('div'); t.className = 'pv-title'; t.innerHTML = opts.title; el.appendChild(t); }
    this._bind();
    new ResizeObserver(() => this.redraw()).observe(el);
  }
  get W() { return this.el.clientWidth; }
  get H() { return this.el.clientHeight; }
  basis() {
    const { yaw, pitch, dist, target } = this.cam;
    const cam = vadd(target, [dist * Math.cos(pitch) * Math.cos(yaw), dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch)]);
    const fwd = vnorm(vsub(target, cam));
    const right = vnorm(vcross(fwd, [0, 0, 1]));
    const up = vcross(right, fwd);
    const tf = Math.tan(this.cam.fov / 2), asp = (this.W || 1) / (this.H || 1);
    return { cam, fwd, right, up, tx: asp >= 1 ? tf * asp : tf, ty: asp >= 1 ? tf : tf / asp };
  }
  project(P) {
    const B = this._B || this.basis();
    const v = vsub(P, B.cam), zc = vdot(v, B.fwd);
    if (zc <= 1e-6) return null;
    const sx = vdot(v, B.right) / (zc * B.tx), sy = vdot(v, B.up) / (zc * B.ty);
    return [((sx + 1) / 2) * this.W, ((1 - sy) / 2) * this.H, zc];
  }
  ray(x, y) {
    const B = this.basis();
    const px = (x / this.W) * 2 - 1, py = 1 - (y / this.H) * 2;
    return { o: B.cam, d: vnorm(vadd(B.fwd, vadd(vscale(B.right, px * B.tx), vscale(B.up, py * B.ty)))) };
  }
  // 点是否被球面（或平面）遮挡
  visible(P) {
    const B = this._B || this.basis();
    const d = vsub(P, B.cam), L = Math.hypot(...d), dir = vscale(d, 1 / L);
    const hit = raySphere(B.cam, dir, this.S.c, this.S.r);
    if (hit && hit[0] < L * (1 - 2e-4)) return false;
    if (this.opts.plane && (B.cam[2] > 0) !== (P[2] > 1e-9) && Math.abs(P[2]) > 1e-9) {
      const t = -B.cam[2] / dir[2], X = vadd(B.cam, vscale(dir, t));
      if (t < L && Math.hypot(X[0], X[1]) < this.opts.planeR) return false;
    }
    return true;
  }
  toSphere(z) { return planeToSphere(this.S, z); }
  // 视角预设：'N' 俯视北极（∞），'S' 仰视南极（0），'side' 侧面
  look(name) {
    if (name === 'N') this.cam.pitch = 1.5;
    else if (name === 'S') this.cam.pitch = -1.45;
    else { this.cam.pitch = 0.35; this.cam.yaw = -0.9; }
    this.redraw(); this.onCamera?.(this);
  }
  toPlane(P) { return sphereToPlane(this.S, P); }
  redraw() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
  }
  draw() {
    const W = this.W, H = this.H;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
    const ctx = this.ctx, r = renderer();
    this._B = this.basis();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#080c18'; ctx.fillRect(0, 0, cw, ch);
    if (r.ok && this.prog) {
      const B = this._B, S = this.S, o = this.opts;
      const camU = { u_res: [cw, ch], u_cam: B.cam, u_fwd: B.fwd, u_right: B.right, u_up: B.up, u_tan: [B.tx, B.ty] };
      r.begin(cw, ch);
      r.fullscreen(this.prog, {
        ...camU,
        u_sc: S.c, u_sr: S.r, u_srot: toGL(S.rot), u_texOff: S.texOff, u_texScale: S.texScale,
        u_sAlpha: o.sAlpha, u_pAlpha: o.pAlpha, u_pR: o.planeR, u_plane: o.plane ? 1 : 0, u_sphere: o.sphere === false ? 0 : 1,
        ...(typeof this.uniforms === 'function' ? this.uniforms() : this.uniforms),
      });
      for (const L of this.glLayers) L(r, this, camU);
      r.copyTo(ctx);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const ov of this.overlays) { ctx.save(); ov(ctx, this); ctx.restore(); }
    for (const h of this.handles) if (!h.hidden?.() && !h.invisible) this._drawHandle(ctx, h);
    this._B = null;
  }
  // 三维折线：可见部分实线，被遮挡部分虚线淡显；null 表示断开
  curve(ctx, pts, { color = '#fff', width = 1.8, hiddenAlpha = 0.32, casing = true } = {}) {
    const runs = [];
    let cur = null, vis = null, prev = null;
    for (const P of pts) {
      const s = P && this.project(P);
      if (!s) { cur = null; prev = null; continue; }
      const v = this.visible(P);
      if (!cur || v !== vis) {
        cur = { vis: v, pts: prev ? [prev] : [] };
        runs.push(cur); vis = v;
      }
      cur.pts.push(s);
      prev = s;
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const pass of [false, true]) for (const run of runs) {
      if (run.vis !== pass || run.pts.length < 2) continue;
      ctx.beginPath();
      run.pts.forEach((s, i) => (i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])));
      if (run.vis) {
        if (casing) { ctx.strokeStyle = 'rgba(4,6,14,0.5)'; ctx.lineWidth = width + 2; ctx.stroke(); }
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else { ctx.setLineDash([4, 4]); ctx.globalAlpha = hiddenAlpha; }
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  point(ctx, P, color = '#fff', r = 4.5, text = null) {
    const s = this.project(P);
    if (!s) return;
    const vis = this.visible(P);
    ctx.globalAlpha = vis ? 1 : 0.45;
    ctx.beginPath(); ctx.arc(s[0], s[1], r + 1.8, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(5,8,18,0.7)'; ctx.fill();
    ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
    ctx.globalAlpha = 1;
    if (text && vis) label(ctx, s[0] + r + 5, s[1] - r - 5, text, color);
  }
  _drawHandle(ctx, h) {
    const P = h.kind === 'sphere' ? this.toSphere(h.pos()) : [h.pos().re, h.pos().im, 0];
    this.point(ctx, P, h.color, h.r || 6, typeof h.label === 'function' ? h.label() : h.label);
  }
  _hit(x, y) {
    for (const h of this.handles) {
      if (h.hidden?.()) continue;
      const P = h.kind === 'sphere' ? this.toSphere(h.pos()) : [h.pos().re, h.pos().im, 0];
      const s = this.project(P);
      if (s && Math.hypot(s[0] - x, s[1] - y) < 13) return h;
    }
    return null;
  }
  _bind() {
    const c = this.canvas;
    let mode = null, last = null, grabbed = null;
    const pt = (e) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    c.addEventListener('pointerdown', (e) => {
      const [x, y] = pt(e);
      c.setPointerCapture(e.pointerId);
      grabbed = this._hit(x, y);
      mode = grabbed ? 'handle' : 'orbit';
      last = [x, y];
    });
    c.addEventListener('pointermove', (e) => {
      const [x, y] = pt(e);
      if (mode === 'orbit') {
        this.cam.yaw -= (x - last[0]) * 0.008;
        this.cam.pitch = Math.max(-1.45, Math.min(1.52, this.cam.pitch + (y - last[1]) * 0.008));
        this.redraw(); this.onCamera?.(this);
      } else if (mode === 'handle') {
        const { o, d } = this.ray(x, y);
        let z = null;
        if (grabbed.kind === 'sphere') {
          const hit = raySphere(o, d, this.S.c, this.S.r);
          if (hit) z = this.toPlane(vadd(o, vscale(d, hit[0])));
        } else if (Math.abs(d[2]) > 1e-6) {
          const t = -o[2] / d[2];
          if (t > 0) { const X = vadd(o, vscale(d, t)); z = { re: X[0], im: X[1] }; }
        }
        if (z) { grabbed.move(z); this.onChange?.(grabbed); this.redraw(); }
      } else {
        c.style.cursor = this._hit(x, y) ? 'pointer' : 'grab';
        if (this.onHover) {
          const { o, d } = this.ray(x, y), hit = raySphere(o, d, this.S.c, this.S.r);
          this.onHover(hit ? vadd(o, vscale(d, hit[0])) : null, this);
        }
      }
      last = [x, y];
    });
    c.addEventListener('pointerleave', () => { if (!mode) this.onHover?.(null, this); });
    const up = () => { mode = null; grabbed = null; };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cam.dist = Math.max(2.2, Math.min(30, this.cam.dist * Math.exp(e.deltaY * 0.001)));
      this.redraw(); this.onCamera?.(this);
    }, { passive: false });
  }
}
