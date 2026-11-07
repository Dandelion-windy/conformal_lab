// 拾取与吸附（均在屏幕像素中度量，view 需提供 toScreen / ppu）
import { C } from '../../core/complex.js';
import { niceStep } from '../../core/draw.js';
import * as G from './geom.js';
import { BUILTIN } from './board.js';

export const R_PT = 10, R_CURVE = 8, R_HANDLE = 14;
const px = (v, a, b) => { const [x0, y0] = v.toScreen(a), [x1, y1] = v.toScreen(b); return Math.hypot(x1 - x0, y1 - y0); };

export const visible = (o) => o.g && o.show !== false;
export function curves(board, withBuiltin) {
  const out = board.objs.filter((o) => visible(o) && G.isCurve(o.g));
  return withBuiltin ? out.concat(Object.values(BUILTIN)) : out;
}

// 光标附近最近的已有点
export function hitPoint(board, v, z, filter = () => true) {
  let best = null, bd = R_PT;
  for (const o of board.objs) {
    if (!visible(o) || !G.isPt(o.g) || !filter(o)) continue;
    const d = px(v, o.g.z, z);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
// 光标附近最近的曲线（可含坐标轴与单位圆）
export function hitCurve(board, v, z, withBuiltin, filter = () => true, R = R_CURVE) {
  let best = null, bd = R;
  for (const o of curves(board, withBuiltin)) {
    if (!filter(o)) continue;
    const r = G.nearest(o.g, z);
    if (!r) continue;
    const d = r.d * v.ppu;
    if (d < bd) { bd = d; best = { o, r }; }
  }
  return best;
}

// 吸附：返回 { id }（已有点）或 { spec, z, label, type }（将要创建的点）
// S：吸附开关；specials：[{ z, label }]（零点、极点、临界点等）
// params：[{ z, label, k }]（可拖动的参数点 a、b、c），吸附后生成随参数移动的点
export function snapPoint(board, v, z, S, specials = [], params = []) {
  const P = hitPoint(board, v, z);
  if (P) return { id: P.id, z: P.g.z, label: P.name, type: 'point' };
  let pb = null, pd = R_HANDLE;
  for (const s of params) { const d = px(v, s.z, z); if (d < pd) { pd = d; pb = s; } }
  if (pb) return { spec: { kind: 'param', deps: [], par: { k: pb.k } }, z: pb.z, label: pb.label, type: 'special' };
  if (S.special) {
    let best = null, bd = R_PT;
    for (const s of specials) { const d = px(v, s.z, z); if (d < bd) { bd = d; best = s; } }
    if (best) return { spec: { kind: 'free', deps: [], par: { z: best.z } }, z: best.z, label: best.label, type: 'special' };
  }
  const near = curves(board, S.axes).map((o) => ({ o, r: G.nearest(o.g, z) })).filter((c) => c.r && c.r.d * v.ppu < 16);
  if (S.inter) {
    let best = null, bd = R_PT;
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      G.intersect(near[i].o.g, near[j].o.g).forEach((q, k) => {
        if (!q) return;
        const d = px(v, q, z);
        if (d < bd) { bd = d; best = { spec: { kind: 'inter', deps: [near[i].o.id, near[j].o.id], par: { k } }, z: q, label: '交点', type: 'inter' }; }
      });
    }
    if (best) return best;
  }
  if (S.mid || S.center) {
    let best = null, bd = R_PT;
    const consider = (q, cand) => { const d = px(v, q, z); if (d < bd) { bd = d; best = { ...cand, z: q }; } };
    for (const o of board.objs) {
      if (!visible(o)) continue;
      if (S.mid && o.g.t === 'seg') consider(G.at(o.g, 0.5), { spec: { kind: 'mid', deps: [o.id] }, label: `${o.name} 的中点`, type: 'mid' });
      if (S.mid && o.g.t === 'path') o.g.parts.forEach((q, i) => {
        if (q.t === 'seg') consider(G.at(q, 0.5), { spec: { kind: 'emid', deps: [o.id], par: { i } }, label: `${o.name} 边的中点`, type: 'mid' });
      });
      if (S.center && G.isRound(o.g)) consider(o.g.c, { spec: { kind: 'center', deps: [o.id] }, label: `${o.name} 的圆心`, type: 'center' });
    }
    if (best) return best;
  }
  // 网格结点与曲线：取离光标更近者；网格结点恰在曲线上时生成该曲线上的点
  let grid = null, gd = R_PT;
  if (S.grid) {
    const step = niceStep(v.ppu) / 2;
    const q = C(Math.round(z.re / step) * step, Math.round(z.im / step) * step);
    const d = px(v, q, z);
    if (d < gd) { grid = q; gd = d; }
  }
  let on = null, od = R_CURVE;
  if (S.on) for (const c of near) { const d = c.r.d * v.ppu; if (d < od) { od = d; on = c; } }
  if (grid) {
    const host = near.find((c) => G.nearest(c.o.g, grid).d < 1e-9 * Math.max(1, Math.hypot(grid.re, grid.im)));
    if (host && S.on) return { spec: { kind: 'on', deps: [host.o.id], par: { p: G.nearest(host.o.g, grid).p } }, z: grid, label: `网格 · ${host.o.name} 上`, type: 'grid' };
    if (!on || gd <= od) return { spec: { kind: 'free', deps: [], par: { z: grid } }, z: grid, label: '网格', type: 'grid' };
  }
  if (on) return { spec: { kind: 'on', deps: [on.o.id], par: { p: on.r.p } }, z: on.r.q, label: `${on.o.name} 上`, type: 'on' };
  return { spec: { kind: 'free', deps: [], par: { z } }, z, label: '', type: 'free' };
}

// 拖动自由点时的吸附：只吸附网格与特殊点（自由点保持自由）
export function snapFree(v, z, S, specials = [], params = []) {
  for (const s of params) if (px(v, s.z, z) < R_PT) return s.z;
  if (S.special) for (const s of specials) if (px(v, s.z, z) < R_PT) return s.z;
  if (S.grid) {
    const step = niceStep(v.ppu) / 2;
    const q = C(Math.round(z.re / step) * step, Math.round(z.im / step) * step);
    if (px(v, q, z) < R_PT * 0.8) return q;
  }
  return z;
}
