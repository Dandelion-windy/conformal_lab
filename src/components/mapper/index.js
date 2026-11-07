// 映射器：z 平面 ↔ w 平面（或黎曼球面）的双视图，支持预设/自定义 f(z)、源区域、网格、探针、原像、变形动画。
// 网格线与格子填充由 GPU 按源点 z 逐像素绘制（见 shaders.js），两图严格对应
import * as K from '../../core/complex.js';
import { h } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { SphereView } from '../../core/sphere3d.js';
import { compile } from '../../core/compile.js';
import { renderer } from '../../core/gl.js';
import { DOMAINS, DOMAIN_GRID } from '../../core/domains.js';
import { zOverlay, wOverlay, sphereOverlay } from './overlays.js';
import { CurveTools } from './tools.js';
import { PreimageFinder } from './preimage.js';
import { buildPanel } from './panel.js';
import { zShader, wBgShader, meshShaders, sphereZShader, sphereWBgShader, sphereMeshShaders } from './shaders.js';
import { stereoUnit, invStereoUnit } from '../../core/vec3.js';
import { resolveSource } from './source.js';
import { SourceMeshGL } from './gpu.js';
import { analyze, globalPreimages } from './special.js';
import { from3, mobiusFlow } from '../../core/mobius.js';

const PCOL = { a: '#5cc8ff', b: '#ffb454', c: '#6ee7a8' };
export const CART_STEP = [0.5, 0.25, 0.125];
export const POLAR_N = [16, 24, 48];

export class Mapper {
  constructor(stage, panel, { presets, custom = true, initial, sphere = false }) {
    this.presets = presets;
    this.custom = custom;
    this.state = { colorMode: 0, bright: 0.6, bgLines: 0, lineStep: 1, showLines: true, showBoundary: true, fill: true,
      grid: 'cart', density: 2, dom: 'none', domP: null, probe: false, preimg: true, morph: 1, zMode: 'plane', wMode: 'plane', linkCam: false, special: true };
    this.P = { a: K.C(0.5, 0.3), b: K.C(1, 0), c: K.C(0, 1), t: K.C(1) };
    this.boundary = []; this.marks = [];
    const col = () => {
      const stack = h('div', { class: 'view-stack' });
      const plane = h('div'), sph = h('div', { hidden: true });
      stack.append(plane, sph);
      stage.append(stack);
      return { plane, sph };
    };
    this.zBox = col(); this.wBox = col();
    this.zv = new PlaneView(this.zBox.plane, { title: '<b>z</b> 平面 · 原像' });
    this.wv = new PlaneView(this.wBox.plane, { title: '<b>w = f(z)</b> 平面 · 像' });
    this.mesh = new SourceMeshGL();
    this.tools = new CurveTools(this.zv, () => this.redraw());
    this.finder = new PreimageFinder();
    this.f = (z) => this.fn.js(z, this.P);
    this.fm = (z) => {
      const t = this.state.morph;
      if (t >= 1) return this.f(z);
      if (this.flow) return K.mobius(this.flow(t), z);
      return K.lerp(z, this.f(z), t);
    };
    const r = renderer();
    this.wBgProg = r.ok ? r.program(wBgShader()) : null;
    this.zv.bg = () => ({ prog: this.zProg, uniforms: this.uniforms() });
    this.wv.bg = () => ({ prog: this.wBgProg, uniforms: this.uniforms() });
    this.wv.glLayers.push((rr, v, dpr) => this.mesh.draw(rr, v, dpr, this.meshProg, this.uniforms()));
    this.zv.overlays.push(zOverlay(this));
    this.wv.overlays.push(wOverlay(this));
    this.bindHover();
    this.zv.onView = () => { this.ver++; if (this.state.dom === 'view') this.scheduleSource(); this.redraw(); };
    this.wv.onView = () => this.wv.redraw();
    this.ver = 0;
    this.ui = buildPanel(this, panel);
    this.loadPreset(initial || presets[0].id);
    if (sphere) { this.setMode('z', 'sphere'); this.setMode('w', 'sphere'); if (this.preset.play && this.flow) this.ui.playMorph(); }
  }
  gridStep() { const k = this.state.density - 1; return this.state.grid === 'polar' ? (2 * Math.PI) / POLAR_N[k] : CART_STEP[k]; }
  uniforms() {
    const s = this.state, P = this.P, src = this.src || {};
    return { u_colorMode: s.colorMode, u_bright: s.bright, u_lines: s.bgLines, u_lineStep: s.lineStep,
      u_pa: [P.a.re, P.a.im], u_pb: [P.b.re, P.b.im], u_pc: [P.c.re, P.c.im], u_pt: P.t.re,
      u_morph: s.morph, u_dp: src.dp ?? 0, u_rect: src.rect || [0, 0, 0, 0],
      u_gmode: s.grid === 'polar' ? 1 : 0, u_gstep: this.gridStep(), u_cells: s.fill ? 1 : 0, u_glines: s.showLines ? 1 : 0,
      u_cellA: 0.9, u_dim: s.fill && src.key !== 'plane' ? 0.72 : 1, ...this.flowUniforms(), ...this.refUniforms() };
  }
  // 选叶的参考点：z 平面视图的中心；z 显示为球面时取球面上正对观察者的点
  refUniforms() {
    const v = this.zv, c = v.center, hw = Math.min(v.W || 400, v.H || 400) / (2 * v.ppu);
    let P;
    if (this.zs && this.state.zMode === 'sphere') { const { yaw, pitch } = this.zs.cam; P = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)]; }
    else P = invStereoUnit(c);
    return { u_ref: [c.re, c.im], u_refR: hw, u_refP: P };
  }
  flowUniforms() {
    if (!this.flow || this.state.morph >= 1) return { u_mob: 0 };
    const m = this.flow(this.state.morph);
    return { u_mob: 1, u_ma: [m[0].re, m[0].im], u_mb: [m[1].re, m[1].im], u_mc: [m[2].re, m[2].im], u_md: [m[3].re, m[3].im] };
  }
  // f 是否为分式线性变换：用三点确定的变换在其他点上检验
  detectMobius() {
    this.mob = null; this.flow = null;
    if (!this.fn?.holomorphic) return;
    const zs = [K.C(0.31, 0.17), K.C(-0.53, 0.41), K.C(0.77, -0.62)], ws = zs.map(this.f);
    if (!ws.every(K.isFin)) return;
    const M = from3(zs, ws);
    if (!M.every(K.isFin)) return;
    for (const z of [K.C(1.3, 0.9), K.C(-2.1, -0.4), K.C(0.05, 1.7), K.C(-0.6, -1.1)]) {
      const a = this.f(z), b = K.mobius(M, z);
      if (!(K.abs(K.sub(a, b)) < 1e-7 * (1 + K.abs(a)))) return;
    }
    this.mob = M;
    this.flow = mobiusFlow(M);
  }
  // 编译 z 平面与 w 平面的程序（依赖 f 与源区域的判定式）
  compilePrograms() {
    const r = renderer();
    if (!r.ok || !this.fn || !this.src) return;
    this.zProg = r.program(zShader(this.fn.glsl, this.src.mask, this.fn.xglsl));
    const { vs, fs } = meshShaders(this.fn.glsl, this.src.mask, this.fn.holomorphic, this.fn.xglsl);
    this.meshProg = r.program(fs, vs);
    if (this.zs) this.zs.prog = r.program(sphereZShader(this.fn.glsl, this.src.mask, this.fn.xglsl));
    if (this.ws) {
      this.ws.prog = r.program(sphereWBgShader());
      const S = sphereMeshShaders(this.fn.glsl, this.src.mask, this.fn.holomorphic, this.fn.xglsl);
      this.sMeshProg = r.program(S.fs, S.vs);
    }
  }
  setExpr(src) {
    const fn = compile(src);       // 出错时抛出，由面板显示
    this.fn = fn;
    this.compilePrograms();
    this.syncParamHandles();
    this.remap();
    return fn;
  }
  syncParamHandles() {
    const hs = this.fn.params.filter((k) => k !== 't').map((k) => ({
      param: true, color: PCOL[k], label: k, r: 7,
      pos: () => this.P[k],
      move: (z) => {
        const lim = this.preset?.lim?.[k];
        this.P[k] = lim && K.abs(z) > lim ? K.scale(z, lim / K.abs(z)) : z;
        this.ui.syncParams(); this.remap();
      },
    }));
    this.zv.handles = this.zv.handles.filter((x) => !x.param).concat(hs);
    if (this.zs) this.zs.handles = hs.map((x) => ({ ...x, kind: 'sphere', r: 6 }));
    this.ui.syncParams();
  }
  loadPreset(id) {
    const p = this.presets.find((q) => q.id === id) || this.presets[0];
    this.preset = p;
    this.fn = null;
    for (const k in p.P || {}) if (k !== 'tRange') this.P[k] = typeof p.P[k] === 'number' ? K.C(p.P[k]) : p.P[k];
    this.state.morph = 1;
    this.zv.setHome(...(p.zv || [0, 0, 2.5]));
    this.wv.setHome(...(p.wv || [0, 0, 2.5]));
    if (p.density) this.state.density = p.density;
    this.setDomain(p.dom || 'none', p.domP, p.grid);
    try { this.setExpr(p.expr); } catch (e) { console.error(e); }
    this.ui.onPreset(p);
    this.orientSpheres();
    if (p.play && this.flow && (this.zs || this.ws)) this.ui.playMorph();
  }
  // id：'none' 自动（整个平面，周期函数取一个周期带）、'plane' 整个平面、'view' 当前 z 视图，或 DOMAINS 中的区域
  setDomain(id, domP, grid) {
    const s = this.state;
    s.dom = id;
    const d = DOMAINS[id] || null;
    this.domain = d;
    s.domP = d?.p ? (domP ?? d.p.def) : null;
    if (grid) s.grid = grid;
    else if (d) s.grid = DOMAIN_GRID[d.id] || s.grid;
    this.rebuildSource();
    this.ui?.onDomain();
    if (this.fn) this.orientSpheres();
  }
  rebuildSource() {
    const prev = this.src?.key;
    this.src = resolveSource(this);
    this.mesh.set(this.src.build());
    this.boundary = this.src.boundary; this.marks = this.src.marks;
    if (prev !== this.src.key) this.compilePrograms();
    this.remap();
  }
  scheduleSource() {
    if (this._srcRaf) return;
    this._srcRaf = requestAnimationFrame(() => { this._srcRaf = 0; this.rebuildSource(); });
  }
  remap() { this.ver++; if (this.fn) this.detectMobius(); this.scheduleInfo(); this.redraw(); }
  // 零点、极点、临界点、∞ 处的值（数值求解，稍作防抖）
  scheduleInfo() {
    clearTimeout(this._infoT);
    this._infoT = setTimeout(() => {
      if (!this.fn) return;
      this.info = this.fn.holomorphic ? analyze(this.f) : null;
      this.ui.showInfo?.(this.info);
      this.redraw();
    }, 120);
  }
  setMorph(t) { this.state.morph = t; this.ver++; this.redraw(); }
  setGrid(g) { this.state.grid = g; this.redraw(); }
  setDensity(n) { this.state.density = n; this.redraw(); }
  setMode(which, mode) {
    const box = which === 'z' ? this.zBox : this.wBox;
    this.state[which + 'Mode'] = mode;
    box.plane.hidden = mode !== 'plane';
    box.sph.hidden = mode !== 'sphere';
    const key = which + 's';
    if (mode === 'sphere' && !this[key]) {
      const sv = new SphereView(box.sph, { plane: false, sAlpha: 1, title: which === 'z' ? '<b>z</b> 的黎曼球面（N = ∞，S = 0）' : '<b>w = f(z)</b> 的黎曼球面' });
      sv.cam.dist = 4.4;
      sv.uniforms = () => this.uniforms();
      if (which === 'w') {
        sv.glLayers.push((r, view, camU) => this.mesh.drawWith(r, this.sMeshProg, {
          ...this.uniforms(), ...camU, u_pix: (2 * view.cam.dist * camU.u_tan[1]) / camU.u_res[1] }));
      }
      sv.overlays.push(sphereOverlay(this, which));
      sv.overlays.push((ctx) => { sv.point(ctx, [0, 0, 1], '#ffffff', 3.5, 'N'); sv.point(ctx, [0, 0, -1], '#ffffff', 3.5, 'S'); });
      // 悬停：球面点 → 复数，与平面视图共用读数与原像逻辑
      sv.onHover = (P) => { const z = P ? stereoUnit(P) : null; (which === 'z' ? this.zv : this.wv).onHover(z && K.isFin(z) ? z : null); };
      sv.onCamera = () => {
        if (which === 'z') { this.wv.redraw(); this.ws?.redraw(); }   // 参考点随视角改变，重新选叶
        if (!this.state.linkCam) return;
        const o = which === 'z' ? this.ws : this.zs;
        if (o) { Object.assign(o.cam, sv.cam); o.redraw(); }
      };
      const other = which === 'z' ? this.ws : this.zs;
      if (other) Object.assign(sv.cam, other.cam);
      this[key] = sv;
      this.compilePrograms();
      if (which === 'z' && this.fn) this.syncParamHandles();
      this.orientSpheres();
    }
    this.ui?.syncModes?.();
    this.redraw();
  }
  // 让 z 球面朝向源区域的中心、w 球面朝向它的像；预设可用 zLook / wLook 指定
  orientSpheres() {
    const face = (sv, z) => {
      if (!sv) return;
      if (z == null) { sv.cam.pitch = 0.42; sv.cam.yaw = -0.9; sv.redraw(); return; }
      const P = typeof z === 'string' ? (z === 'N' ? [0, 0, 1] : [0, 0, -1]) : invStereoUnit(z);
      if (Math.hypot(P[0], P[1]) > 1e-6) sv.cam.yaw = Math.atan2(P[1], P[0]);
      sv.cam.pitch = Math.max(-1.35, Math.min(1.35, Math.asin(Math.max(-1, Math.min(1, P[2])))));
      sv.redraw();
    };
    const p = this.preset || {}, c = this.src?.center;
    const zc = p.zLook ?? c, wc = p.wLook ?? (c == null ? null : K.isFin(c) ? this.f(c) : this.info?.inf);
    face(this.zs, zc);
    face(this.ws, wc && (typeof wc === 'string' || K.isFin(wc)) ? wc : wc ? 'N' : null);
  }
  look(name) { for (const sv of [this.zs, this.ws]) if (sv) { if (name === 'N') sv.cam.pitch = 1.5; else if (name === 'S') sv.cam.pitch = -1.45; else { sv.cam.pitch = 0.35; sv.cam.yaw = -0.9; } sv.redraw(); } }
  redraw() { this.zv.redraw(); this.wv.redraw(); this.zs?.redraw(); this.ws?.redraw(); }
  bindHover() {
    this.zv.onHover = (z) => {
      this.hoverZ = z; this.hoverW = null; this.preimages = null;
      if (!this.pinned) this.probeZ = z;
      this.ui.readZ(this.pinned || z);
      this.redraw();
    };
    this.zv.onClick = (z) => { if (!this.state.probe) return; this.pinned = this.pinned ? null : z; this.probeZ = z; this.redraw(); };
    this.wv.onHover = (w) => {
      this.hoverW = w; this.hoverZ = null;
      if (!this.pinned) this.probeZ = null;
      this.preimages = null;
      if (w && this.state.preimg) {
        if (this.info?.rational && this.state.morph >= 1) this.preimages = globalPreimages(this.f, w, this.info);
        else {
          const v = this.zv;
          this.finder.prepare(this.fm, v, `${this.ver}|${v.center.re}|${v.center.im}|${v.ppu}|${v.W}x${v.H}`);
          this.preimages = this.finder.find(w, this.fn.holomorphic);
        }
      }
      this.ui.readW(w, this.preimages);
      this.redraw();
    };
  }
}
