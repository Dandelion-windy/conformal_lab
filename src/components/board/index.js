// 几何画板控制器：z、w 两个平面各有一块画板，共用当前工具、吸附设置与撤销历史。
// 在哪个平面上点击，就在哪个平面上作图；z 平面对象的像画在 w 平面，w 平面对象的原像画在 z 平面
import * as K from '../../core/complex.js';
import { compile } from '../../core/compile.js';
import { renderer } from '../../core/gl.js';
import { cx } from '../../core/format.js';
import { globalPreimages } from '../mapper/special.js';
import { Board } from './board.js';
import { TOOLS, accepts } from './tools.js';
import { hitPoint, hitCurve, snapPoint, snapFree, visible } from './snap.js';
import * as G from './geom.js';

const PALETTE = ['#ff5c8a', '#5cffb0', '#ffd25c', '#7aa8ff', '#ff8c4a', '#d78bff', '#4ee6e6', '#ff9ad5'];
const PT_COLOR = { z: '#eef2ff', w: '#ffd27a' };
const POINT_KINDS = new Set(['free', 'param', 'on', 'inter', 'mid', 'emid', 'center', 'vtx']);
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const subs = (n) => String(n).split('').map((d) => SUB[d]).join('');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const TY = { line: 0, ray: 1, seg: 2, circle: 3, arc: 4 };
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// 复数常数输入："1+2i"、"2e^(i pi/3)"、"(1, 2)"、"sqrt(2)" 等
export function parseComplex(src, P) {
  let s = src.trim();
  const inner = s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1) : null;
  if (inner != null) {
    let depth = 0, cut = -1;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth < 0) break; }
      else if (ch === ',' && depth === 0) { cut = i; break; }
    }
    if (cut > 0 && depth === 0) s = `(${inner.slice(0, cut)}) + i*(${inner.slice(cut + 1)})`;
  }
  if (!s) throw new Error('请输入坐标');
  const fn = compile(s);
  const a = fn.js(K.C(0.123, 0.456), P), b = fn.js(K.C(-0.789, 0.321), P);
  if (!K.isFin(a)) throw new Error('坐标不是有限复数');
  if (K.abs(K.sub(a, b)) > 1e-12 * (1 + K.abs(a))) throw new Error('需要常数，不能含 z');
  return a;
}

export class Geo {
  constructor(M) {
    this.M = M;
    const env = { get P() { return M.P; } };
    this.boards = { z: new Board('z', env), w: new Board('w', env) };
    this.views = { z: M.zv, w: M.wv };
    this.tool = 'move';
    this.pend = null;          // 进行中的构造：{ plane, picks: [{ id }] }
    this.hov = null;           // 悬停：{ plane, z, cand, obj, res }
    this.sel = null;           // 选中：{ plane, id }
    this.snap = { inter: true, mid: true, center: true, on: true, grid: true, axes: true, special: true };
    this.disp = { labels: true, images: true };
    this.opt = { r: 1, n: 4 };
    this.undoS = []; this.redoS = [];
    this.ver = 0; this.uid = 0; this.ci = 0;
    this.texDirty = true;
    this.hints = {};
    for (const p of ['z', 'w']) {
      const v = this.views[p];
      v.tool = this.handler(p);
      this.hints[p] = Object.assign(document.createElement('div'), { className: 'pv-hint geo-hint' });
      v.el.appendChild(this.hints[p]);
    }
    window.addEventListener('keydown', (e) => this.key(e));
    this.syncHint();
  }

  // ---------------- 对象与历史 ----------------
  nextName(isPoint, g, want) {
    const used = new Set([...this.boards.z.objs, ...this.boards.w.objs].map((o) => o.name));
    if (want && !used.has(want)) return want;
    if (isPoint) {
      for (let k = 0; ; k++) { const n = LETTERS[k % 26] + (k >= 26 ? subs(Math.floor(k / 26)) : ''); if (!used.has(n)) return n; }
    }
    const pre = G.isRound(g) ? 'c' : g?.t === 'path' ? 'p' : g?.t === 'free' ? 'd' : 'l';
    for (let k = 1; ; k++) { const n = pre + subs(k); if (!used.has(n)) return n; }
  }
  create(plane, spec) {
    const B = this.boards[plane];
    const g = B.computeSpec(spec);
    const isPoint = g ? G.isPt(g) : POINT_KINDS.has(spec.kind) || (spec.kind === 'reflect' && G.isPt(B.get(spec.deps[0])?.g));
    const o = B.add({
      id: `o${++this.uid}`, name: this.nextName(isPoint, g, spec.kind === 'param' ? spec.par.k : null), kind: spec.kind, deps: [...spec.deps], par: structuredClone(spec.par || {}),
      color: isPoint ? PT_COLOR[plane] : PALETTE[this.ci++ % PALETTE.length], show: true,
    });
    if (spec.verts) for (let k = 2; k < spec.verts; k++) this.create(plane, { kind: 'vtx', deps: [o.id], par: { k } });
    return o;
  }
  snapshot() { return { z: this.boards.z.serialize(), w: this.boards.w.serialize() }; }
  pushHistory(s) {
    this.undoS.push(s);
    if (this.undoS.length > 200) this.undoS.shift();
    this.redoS = [];
  }
  restore(s) {
    this.boards.z.load(s.z); this.boards.w.load(s.w);
    this.pend = null;
    this.changed();
  }
  undo() { if (!this.undoS.length) return; this.redoS.push(this.snapshot()); this.restore(this.undoS.pop()); }
  redo() { if (!this.redoS.length) return; this.undoS.push(this.snapshot()); this.restore(this.redoS.pop()); }
  // 修改前调用：记录历史
  edit(fn) { const s = this.snapshot(); fn(); this.pushHistory(s); this.changed(); }
  remove(plane, id) { this.edit(() => this.boards[plane].remove(id)); }
  clear(plane) { this.edit(() => { for (const p of plane ? [plane] : ['z', 'w']) this.boards[p].clear(); }); }
  changed() {
    for (const B of Object.values(this.boards)) B.recompute();
    if (this.pend && !this.pend.picks.every((p) => this.boards[this.pend.plane].get(p.id))) this.pend = null;
    if (this.sel && !this.boards[this.sel.plane].get(this.sel.id)) this.sel = null;
    this.ver++;
    this.texDirty = true;
    this.M.redraw();
    this.syncHint();
    this.ui?.refresh();
  }
  addPoint(plane, src) { const z = parseComplex(src, this.M.P); let o; this.edit(() => { o = this.create(plane, { kind: 'free', deps: [], par: { z } }); }); return o; }
  setPoint(plane, o, src) { const z = parseComplex(src, this.M.P); this.edit(() => { o.par.z = z; }); }
  setRadius(o, src) {
    const r = parseComplex(src, this.M.P);
    if (Math.abs(r.im) > 1e-12 || !(r.re > 0)) throw new Error('半径须为正实数');
    this.edit(() => { o.par.r = r.re; });
  }
  setStyle(o, key, val) { o[key] = val; this.ver++; this.texDirty = true; this.M.redraw(); this.ui?.refresh(); }
  select(s) { this.sel = s; this.texDirty = true; this.M.redraw(); this.ui?.refresh(); }
  isHi(plane, id) {
    if (this.sel?.plane === plane && this.sel.id === id) return true;
    if (this.hov?.plane === plane && this.hov.obj?.id === id) return true;
    return this.pend?.plane === plane && this.pend.picks.some((p) => p.id === id);
  }
  cached(o, slot, key, fn) {
    const k = `${key}|${o.gv}`;
    o._c ||= {};
    if (o._c[slot]?.k !== k) o._c[slot] = { k, v: fn() };
    return o._c[slot].v;
  }

  // ---------------- 工具 ----------------
  setTool(id) {
    this.tool = id; this.pend = null; this.hov = null; this.texDirty = true;
    for (const p of ['z', 'w']) this.views[p].readout.textContent = '';
    this.syncHint(); this.ui?.syncTool(); this.M.redraw();
  }
  picks(plane) {
    if (!this.pend || this.pend.plane !== plane) return [];
    const B = this.boards[plane];
    return this.pend.picks.map((p) => ({ id: p.id, g: B.get(p.id)?.g })).filter((p) => p.g);
  }
  specials(plane) {
    const I = this.M.info;
    if (!this.snap.special || !I || this.M.state.morph < 1) return [];
    const fin = (q) => K.isFin(q.z);
    if (plane === 'z') return [...I.zeros.filter(fin).map((q) => ({ z: q.z, label: '零点' })), ...I.poles.filter(fin).map((q) => ({ z: q.z, label: '极点' })), ...I.crit.filter(fin).map((q) => ({ z: q.z, label: '临界点 f′=0' }))];
    return I.crit.filter(fin).map((q) => ({ z: this.M.f(q.z), label: '临界值' })).filter(fin);
  }
  // 可拖动的参数点 a、b、c（只在 z 平面视图中）
  params(plane) {
    const M = this.M;
    if (plane !== 'z' || !M.fn || M.state.zMode !== 'plane') return [];
    return M.fn.params.filter((k) => k !== 't').map((k) => ({ z: M.P[k], label: `参数 ${k}`, k }));
  }
  // 解析一次点击：已有点、符合要求的曲线，或按吸附规则新建的点
  resolve(plane, z, need, picks) {
    const B = this.boards[plane], v = this.views[plane];
    const P = hitPoint(B, v, z);
    if (P && accepts(need, P.g)) return { id: P.id, z: P.g.z, label: P.name, type: 'point' };
    const objNeed = need.filter((t) => t !== 'pt');
    const H = objNeed.length ? hitCurve(B, v, z, this.snap.axes, (o) => accepts(objNeed, o.g) && !picks.some((p) => p.id === o.id)) : null;
    if (H) return { id: H.o.id, curve: H.o, z: H.r.q };
    if (need.includes('pt')) return snapPoint(B, v, z, this.snap, this.specials(plane), this.params(plane));
    return null;
  }
  directInter(plane, z) {
    const c = snapPoint(this.boards[plane], this.views[plane], z, { inter: true, axes: this.snap.axes });
    return c.type === 'inter' ? c : null;
  }
  hitAny(plane, z) {
    const B = this.boards[plane], v = this.views[plane];
    return hitPoint(B, v, z) || hitCurve(B, v, z, false)?.o || null;
  }
  handler(plane) {
    const geo = this;
    return {
      get cursor() { return geo.cursor(plane); },
      down: (z, e) => this.down(plane, z, e),
      move: (z) => this.drag(plane, z),
      up: () => this.up(plane),
      click: (z, e) => this.click(plane, z, e),
      hover: (z) => this.hover(plane, z),
      cancel: () => this.cancel(),
    };
  }
  cursor(plane) {
    if (this.tool === 'move') { const h = this.hov?.plane === plane ? this.hov.obj : null; return h ? (h.drag ? 'move' : 'pointer') : null; }
    if (this.tool === 'erase') return this.hov?.plane === plane && this.hov.obj ? 'pointer' : 'default';
    return 'crosshair';
  }
  cancel() { if (this.pend) { this.pend = null; this.texDirty = true; this.syncHint(); this.M.redraw(); return true; } return false; }

  down(plane, z, e) {
    if (e.button !== 0) return false;
    const B = this.boards[plane], v = this.views[plane];
    if (this.tool === 'pen') { this.stroke = { plane, pts: [z] }; return true; }
    if (this.tool !== 'move') return false;
    const P = hitPoint(B, v, z);
    if (P && (P.kind === 'free' || P.kind === 'on')) { this.dragging = { plane, o: P, z0: z, snap: this.snapshot(), moved: false }; return true; }
    // 派生点（交点、中点、参数点…）不能拖动：交给单击去选中它，而不是拖动经过它的曲线
    if (P) return false;
    // 参数控制点优先于经过它的曲线
    if (v._hit(...v.toScreen(z))) return false;
    const H = hitCurve(B, v, z, false);
    if (H) {
      const anc = B.freeAncestors(H.o.id);
      if (anc.length) {
        this.dragging = { plane, o: H.o, anc, base: anc.map((a) => structuredClone(a.par)), z0: z, snap: this.snapshot(), moved: false };
        return true;
      }
    }
    return false;
  }
  drag(plane, z) {
    const v = this.views[plane], B = this.boards[plane];
    if (this.stroke) {
      const P = this.stroke.pts, last = P[P.length - 1];
      if (K.dist(last, z) * v.ppu > 2) { P.push(z); this.M.redraw(); }
      return;
    }
    const d = this.dragging;
    if (!d) return;
    if (!d.moved && K.dist(z, d.z0) * v.ppu < 2) return;
    d.moved = true;
    if (!d.anc) {
      if (d.o.kind === 'free') d.o.par.z = snapFree(v, z, this.snap, this.specials(plane), this.params(plane));
      else { const host = B.get(d.o.deps[0]); const r = host?.g && G.nearest(host.g, z); if (r) d.o.par.p = r.p; }
    } else {
      const dz = K.sub(z, d.z0);
      d.anc.forEach((a, i) => {
        if (a.kind === 'free') a.par.z = K.add(d.base[i].z, dz);
        else a.par.pts = d.base[i].pts.map((q) => q && K.add(q, dz));
      });
    }
    this.changed();
    if (!d.anc && d.o.g) { this.views[plane].readout.textContent = `${d.o.name} = ${cx(d.o.g.z, 4)}`; return d.o.g.z; }
  }
  up(plane) {
    if (this.stroke) {
      const S = this.stroke;
      this.stroke = null;
      if (S.pts.length >= 3) this.edit(() => this.create(S.plane, { kind: 'pen', deps: [], par: { pts: S.pts } }));
      else this.M.redraw();
      return;
    }
    const d = this.dragging;
    this.dragging = null;
    if (!d) return;
    if (d.moved) this.pushHistory(d.snap);
    else this.select({ plane, id: d.o.id });
  }
  click(plane, z, e) {
    const B = this.boards[plane];
    if (this.tool === 'move') { const o = this.hitAny(plane, z); this.select(o ? { plane, id: o.id } : null); return !!o; }
    if (this.tool === 'erase') { const o = this.hitAny(plane, z); if (o) this.remove(plane, o.id); return true; }
    if (this.tool === 'pen') return true;
    const T = TOOLS[this.tool];
    if (this.pend && this.pend.plane !== plane) this.pend = null;
    const picks = this.picks(plane);
    const need = T.need(picks);
    if (!need) return true;
    const snap = this.snapshot();
    let made = false;
    if (this.tool === 'inter' && !picks.length) {
      const c = this.directInter(plane, z);
      if (c) { this.create(plane, c.spec); this.pushHistory(snap); this.changed(); this.hover(plane, z); return true; }
    }
    const res = this.resolve(plane, z, need, picks);
    if (!res) { this.flash('这里没有符合要求的对象'); return true; }
    if (T.multi && res.id && picks.length) {
      const first = picks[0].id, last = picks[picks.length - 1].id;
      if ((T.multi === 'closed' && picks.length >= 3 && res.id === first) || (T.multi === 'open' && picks.length >= 2 && res.id === last)) {
        this.finish(plane); this.pushHistory(snap); this.changed(); this.hover(plane, z); return true;
      }
      if (res.id === last) return true;
    }
    let id = res.id;
    if (!id) { id = this.create(plane, res.spec).id; made = true; }
    this.pend = { plane, picks: [...picks.map((p) => ({ id: p.id })), { id }] };
    if (!T.multi && !T.need(this.picks(plane))) { this.finish(plane); made = true; }
    if (made) this.pushHistory(snap);
    this.changed();
    this.hover(plane, z);
    return true;
  }
  finish(plane) {
    const T = TOOLS[this.tool], picks = this.picks(plane);
    this.pend = null;
    if (T.multi && picks.length < (T.multi === 'closed' ? 3 : 2)) return;
    const specs = T.make(picks, this.opt);
    for (const s of specs) this.create(plane, s);
    if (!specs.length && this.tool === 'inter') this.flash('两条曲线没有交点');
    if (!specs.length && this.tool === 'tangent') this.flash('点在圆内，没有切线');
  }
  hover(plane, z) {
    const other = plane === 'z' ? 'w' : 'z';
    this.views[other].readout.textContent = '';
    if (!z) {
      if (this.hov?.plane === plane) { this.hov = null; this.texDirty = true; }
      this.views[plane].readout.textContent = '';
      return null;
    }
    const B = this.boards[plane], T = TOOLS[this.tool];
    const hov = { plane, z, cand: null, obj: null, res: null };
    if (this.tool === 'move' || this.tool === 'erase') {
      const P = hitPoint(B, this.views[plane], z);
      const o = P || hitCurve(B, this.views[plane], z, false)?.o || null;
      if (o) hov.obj = { id: o.id, drag: this.tool === 'move' && (o.kind === 'free' || o.kind === 'on' || (!P && B.freeAncestors(o.id).length > 0)) };
    } else if (T.need) {
      const picks = this.picks(plane), need = T.need(picks);
      if (need) {
        const res = (this.tool === 'inter' && !picks.length && this.directInter(plane, z)) || this.resolve(plane, z, need, picks);
        hov.res = res;
        if (res?.curve) { hov.obj = { id: res.curve.id }; hov.curve = res.curve; }
        else if (res) hov.cand = res;
      }
    }
    this.hov = hov;
    if (plane === 'w') this.texDirty = true;
    const c = hov.cand;
    this.views[plane].readout.textContent = c ? `${plane} = ${cx(c.z, 4)}${c.label ? ` · ${c.label}` : ''}` : hov.curve ? hov.curve.name : '';
    return c ? c.z : null;
  }
  // 预览：把悬停位置当作下一次点击，若构造已完整则画出结果
  previewGeoms(plane) {
    const h = this.hov, T = TOOLS[this.tool];
    if (!h || h.plane !== plane || !h.res || !T.need) return [];
    const B = this.boards[plane], picks = this.picks(plane);
    const vp = h.res.id ? { id: h.res.id, g: B.get(h.res.id)?.g } : { id: '$hover', g: G.pt(h.res.z) };
    // 悬停结果可能是上一步算出的（之后已点击），不符合当前这一步的要求时不预览
    if (!vp.g || !accepts(T.need(picks), vp.g) || (!T.multi && picks.some((p) => p.id === vp.id))) return [];
    const all = [...picks, vp];
    if (T.multi) {
      if (all.length < 2 || !all.every((p) => G.isPt(p.g))) return [];
      const g = G.polyPath(all.map((p) => p.g.z), T.multi === 'closed' && all.length >= 3);
      return g ? [g] : [];
    }
    if (T.need(all) || this.tool === 'point') return [];
    const virt = vp.id === '$hover' ? vp.g : null;
    return T.make(all, this.opt).map((s) => B.computeSpec(s, virt)).filter(Boolean);
  }
  // 尚不能预览结果时，用虚线把已选的点与光标连起来
  rubber(plane) {
    const h = this.hov;
    if (!h || h.plane !== plane || !h.res || this.previewGeoms(plane).length) return null;
    const P = this.picks(plane).filter((p) => G.isPt(p.g)).map((p) => p.g.z);
    return P.length ? [...P, h.res.z] : null;
  }
  strokePts(plane) { return this.stroke?.plane === plane ? this.stroke.pts : null; }
  hintText() {
    const T = TOOLS[this.tool];
    if (this.pend) return `${T.name}：${T.hint(this.picks(this.pend.plane))}`;
    return `${T.name}：${T.hint([])}`;
  }
  syncHint() {
    const s = this.M.state;
    this.ui?.sphereNote(s.zMode === 'sphere' || s.wMode === 'sphere');
    const msg = this.flashMsg || (this.tool === 'move' ? '' : this.hintText());
    for (const p of ['z', 'w']) { this.hints[p].textContent = msg; this.hints[p].classList.toggle('warn', !!this.flashMsg); }
  }
  flash(msg) {
    this.flashMsg = msg; this.syncHint();
    clearTimeout(this._ft);
    this._ft = setTimeout(() => { this.flashMsg = null; this.syncHint(); }, 1800);
  }
  key(e) {
    if (!this.ui?.bar || this.ui.bar.offsetParent === null) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === 'Escape') { if (!this.cancel()) { if (this.tool !== 'move') this.setTool('move'); else this.select(null); } }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.remove(this.sel.plane, this.sel.id); }
    else if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); }
    else if (mod && k === 'y') { e.preventDefault(); this.redo(); }
    else if (e.key === 'Enter' && this.pend && TOOLS[this.tool].multi) {
      const s = this.snapshot(), plane = this.pend.plane;
      this.finish(plane); this.pushHistory(s); this.changed();
    }
  }

  // ---------------- 映射 ----------------
  // w 平面的点在 z 平面中的原像：有理函数取整个球面上的全部原像，否则取 z 视图内的原像
  preimages(o) {
    const M = this.M, w = o.g.z;
    if (!M.fn) return [];
    if (M.info?.rational && M.state.morph >= 1) return this.cached(o, 'pre', `g|${M.mapVer}`, () => globalPreimages(M.f, w, M.info));
    // z 显示为球面时平面视图被隐藏（尺寸为 0），改用球面上的种子点求原像
    if (!M.zv.W) return this.cached(o, 'pre', `s|${M.mapVer}`, () => globalPreimages(M.fm, w, null));
    const v = M.zv, vk = `${M.ver}|${v.center.re}|${v.center.im}|${v.ppu}|${v.W}x${v.H}`;
    return this.cached(o, 'pre', `v|${M.mapVer}|${vk}`, () => { M.finder.prepare(M.fm, v, vk); return M.finder.find(w, M.fn.holomorphic); });
  }
  // w 平面曲线（及预览）打包成纹理，交给 z 平面的着色器逐像素求原像
  wTexture() {
    const r = renderer();
    if (!r.ok) return null;
    if (!this.texDirty && this.tex) return this.texInfo;
    const list = [];
    const push = (g, color, width) => {
      const ps = g.t === 'free' ? G.prims({ t: 'free', pts: G.simplify(g.pts, 0.6 / this.views.w.ppu) }) : G.prims(g);
      for (const p of ps) list.push([p, color, width]);
    };
    if (this.disp.images) {
      for (const o of this.boards.w.objs) if (visible(o) && G.isCurve(o.g)) push(o.g, o.color, this.isHi('w', o.id) ? 3.4 : 2.3);
      for (const g of this.previewGeoms('w')) if (G.isCurve(g)) push(g, '#ffffff', 1.4);
      if (this.stroke?.plane === 'w' && this.stroke.pts.length > 1) push({ t: 'free', pts: this.stroke.pts }, '#ffffff', 1.6);
    }
    const n = Math.min(list.length, 2048), data = new Float32Array(Math.max(1, n) * 12);
    list.slice(0, n).forEach(([p, col, wd], i) => {
      const o = i * 12;
      if (G.isLinear(p)) data.set([TY[p.t], p.a.re, p.a.im, p.b.re, p.b.im, 0, 0, 0], o);
      else data.set([TY[p.t], p.c.re, p.c.im, 0, 0, p.r, p.a0 || 0, p.da || 0], o);
      data.set([...rgb(col), wd], o + 8);
    });
    this.tex = r.dataTexture(this.tex, data, 3, Math.max(1, n));
    this.texInfo = { tex: this.tex, n };
    this.texDirty = false;
    return this.texInfo;
  }
}
