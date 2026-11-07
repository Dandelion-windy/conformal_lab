// 画板对象的绘制：所在平面（平面视图 / 球面视图）上的图形，以及在另一平面中的像（z → w）或原像点（w → z）
import { isFin } from '../../core/complex.js';
import { tracePath, strokePath, label } from '../../core/draw.js';
import { mapCurve } from '../../core/mapcurve.js';
import { invStereoUnit } from '../../core/vec3.js';
import * as G from './geom.js';
import { visible } from './snap.js';

// 直线类图形裁剪到视图（Liang–Barsky），返回参数区间
function clip(g, v) {
  const b = v.bounds(), m = 30 / v.ppu, d = { re: g.b.re - g.a.re, im: g.b.im - g.a.im };
  let t0 = g.t === 'line' ? -Infinity : 0, t1 = g.t === 'seg' ? 1 : Infinity;
  for (const [p, q, lo, hi] of [[d.re, g.a.re, b.xmin - m, b.xmax + m], [d.im, g.a.im, b.ymin - m, b.ymax + m]]) {
    if (Math.abs(p) < 1e-300) { if (q < lo || q > hi) return null; continue; }
    let ta = (lo - q) / p, tb = (hi - q) / p;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
  }
  return t0 <= t1 ? [t0, t1] : null;
}
function inArc(g, th) {
  if (g.t === 'circle') return true;
  const T = G.TAU, rel = g.da > 0 ? (((th - g.a0) % T) + T) % T : (((g.a0 - th) % T) + T) % T;
  return rel <= Math.abs(g.da);
}
export function traceGeom(ctx, v, g) {
  switch (g.t) {
    case 'line': case 'ray': case 'seg': {
      const t = clip(g, v);
      if (!t) return;
      const [x0, y0] = v.toScreen(G.at(g, t[0])), [x1, y1] = v.toScreen(G.at(g, t[1]));
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      return;
    }
    case 'circle': case 'arc': {
      const a0 = g.t === 'arc' ? g.a0 : 0, da = g.t === 'arc' ? g.da : G.TAU, R = g.r * v.ppu;
      if (R < 3e4) {
        const [cx, cy] = v.toScreen(g.c);
        ctx.moveTo(cx + R * Math.cos(a0), cy - R * Math.sin(a0));
        ctx.arc(cx, cy, R, -a0, -(a0 + da), da > 0);
        return;
      }
      // 半径极大（几乎是直线）：只采样视图附近的一段
      const b = v.bounds(), diag = Math.hypot(b.xmax - b.xmin, b.ymax - b.ymin);
      const th = Math.atan2(v.center.im - g.c.im, v.center.re - g.c.re), hs = (1.5 * diag) / g.r, pts = [];
      for (let i = 0; i <= 160; i++) { const t = th - hs + (2 * hs * i) / 160; pts.push(inArc(g, t) ? G.at({ t: 'circle', c: g.c, r: g.r }, t) : null); }
      tracePath(ctx, v, pts);
      return;
    }
    case 'path': for (const q of g.parts) traceGeom(ctx, v, q); return;
    case 'free': tracePath(ctx, v, g.pts); return;
  }
}
export function strokeGeom(ctx, v, g, { color = '#fff', width = 2.2, dash = null, alpha = 1, glow = false } = {}) {
  ctx.beginPath();
  traceGeom(ctx, v, g);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (glow) { ctx.globalAlpha = 0.3; ctx.strokeStyle = color; ctx.lineWidth = width + 8; ctx.stroke(); }
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(4,6,14,0.55)'; ctx.lineWidth = width + 2.2; ctx.stroke();
  if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}

// 点：自由点实心，派生点（交点、中点…）为空心环；原像/像点为小一号的环
const FREE = new Set(['free', 'on']);
export function pointMark(ctx, x, y, color, { dep = false, r = 4.6, hi = false, ring = false } = {}) {
  if (hi) { ctx.beginPath(); ctx.arc(x, y, r + 6, 0, 7); ctx.fillStyle = 'rgba(92,200,255,0.28)'; ctx.fill(); }
  ctx.beginPath(); ctx.arc(x, y, r + 1.8, 0, 7); ctx.fillStyle = 'rgba(5,8,18,0.8)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
  if (dep || ring) { ctx.fillStyle = '#0b1020'; ctx.fill(); ctx.lineWidth = ring ? 1.8 : 2.2; ctx.strokeStyle = color; ctx.stroke(); }
  else { ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#0b1020'; ctx.stroke(); }
}
const curveStyle = (geo, plane, o) => {
  const hi = geo.isHi(plane, o.id);
  return { color: o.color, width: hi ? 3.4 : 2.3, glow: hi };
};

// ---------------- 所在平面：平面视图 ----------------
export function drawOwn(ctx, v, geo, plane) {
  const B = geo.boards[plane];
  for (const o of B.objs) if (visible(o) && G.isCurve(o.g)) strokeGeom(ctx, v, o.g, curveStyle(geo, plane, o));
  const hb = geo.hov?.plane === plane && geo.hov.curve?.builtin ? geo.hov.curve : null;
  if (hb) strokeGeom(ctx, v, hb.g, { color: '#ffffff', width: 1.6, glow: true, alpha: 0.9 });
  for (const o of B.objs) {
    if (!visible(o) || !G.isPt(o.g)) continue;
    const [x, y] = v.toScreen(o.g.z);
    if (!Number.isFinite(x) || Math.abs(x) > 1e5 || Math.abs(y) > 1e5) continue;
    pointMark(ctx, x, y, o.color, { dep: !FREE.has(o.kind), hi: geo.isHi(plane, o.id) });
    if (geo.disp.labels) label(ctx, x + 8, y - 11, o.name, '#e8ecf6');
  }
}
// 预览（虚线）、橡皮筋、吸附提示：画在最上层
export function drawUI(ctx, v, geo, plane) {
  const h = geo.hov;
  for (const g of geo.previewGeoms(plane)) {
    if (G.isPt(g)) { const [x, y] = v.toScreen(g.z); pointMark(ctx, x, y, '#ffffff', { ring: true, r: 3.6 }); }
    else strokeGeom(ctx, v, g, { color: '#ffffff', width: 1.7, dash: [7, 5], alpha: 0.9 });
  }
  const sp = geo.strokePts(plane);
  if (sp) strokePath(ctx, v, sp, { color: '#ffffff', width: 2 });
  const rb = geo.rubber(plane);
  if (rb) strokePath(ctx, v, rb, { color: 'rgba(255,255,255,0.75)', width: 1.2, dash: [3, 4], casing: false });
  if (!h || h.plane !== plane) return;
  const c = h.cand;
  if (!c) return;
  const [x, y] = v.toScreen(c.z);
  ctx.save();
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.fillStyle = 'rgba(92,200,255,0.9)';
  const k = 6.5;
  ctx.beginPath();
  if (c.type === 'inter') { ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k); ctx.moveTo(x - k, y + k); ctx.lineTo(x + k, y - k); }
  else if (c.type === 'mid') { ctx.moveTo(x, y - k); ctx.lineTo(x + k, y + k * 0.75); ctx.lineTo(x - k, y + k * 0.75); ctx.closePath(); }
  else if (c.type === 'center') { ctx.arc(x, y, k, 0, 7); ctx.moveTo(x - k, y); ctx.lineTo(x + k, y); ctx.moveTo(x, y - k); ctx.lineTo(x, y + k); }
  else if (c.type === 'grid') ctx.rect(x - 5, y - 5, 10, 10);
  else if (c.type === 'on') { ctx.moveTo(x, y - k); ctx.lineTo(x + k, y); ctx.lineTo(x, y + k); ctx.lineTo(x - k, y); ctx.closePath(); }
  else if (c.type === 'special') ctx.arc(x, y, k + 2, 0, 7);
  ctx.strokeStyle = 'rgba(4,6,14,0.7)'; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
  ctx.restore();
  if (c.label) label(ctx, x + 10, y + 14, c.label, '#bfe9ff');
}

// ---------------- 映射到另一平面 ----------------
const viewKey = (v) => `${v.center.re},${v.center.im},${v.ppu},${v.W},${v.H}`;
const imageLabel = (o) => `f(${o.name})`;
const preLabel = (o) => `f⁻¹(${o.name})`;

// z 平面对象在 w 平面的像
export function drawImages(ctx, v, geo, M) {
  if (!geo.disp.images) return;
  const f = M.fm, proj = (w) => v.toScreen(w), opt = { W: v.W, H: v.H }, key = `${M.mapVer}|${viewKey(v)}`;
  for (const o of geo.boards.z.objs) {
    if (!visible(o) || !G.isCurve(o.g)) continue;
    const pts = geo.cached(o, 'pw', key, () => mapCurve(f, G.sample(o.g), proj, opt));
    strokePath(ctx, v, pts, { ...curveStyle(geo, 'z', o), maxJump: 80 });
  }
  if (geo.hov?.plane === 'z') for (const g of geo.previewGeoms('z')) {
    if (G.isCurve(g)) strokePath(ctx, v, mapCurve(f, G.sample(g), proj, opt), { color: '#ffffff', width: 1.7, dash: [7, 5], maxJump: 80 });
  }
  for (const o of geo.boards.z.objs) {
    if (!visible(o) || !G.isPt(o.g)) continue;
    const w = f(o.g.z);
    if (!isFin(w)) continue;
    const [x, y] = v.toScreen(w);
    if (Math.abs(x) > 1e5 || Math.abs(y) > 1e5) continue;
    pointMark(ctx, x, y, o.color, { dep: !FREE.has(o.kind), r: 4, hi: geo.isHi('z', o.id) });
    if (geo.disp.labels) label(ctx, x + 8, y - 11, imageLabel(o), '#c9d3ea');
  }
}
// w 平面的点在 z 平面中的全部原像（曲线的原像由 z 平面的着色器逐像素绘制）
export function drawPreimagePts(ctx, v, geo, M) {
  if (!geo.disp.images) return;
  for (const o of geo.boards.w.objs) {
    if (!visible(o) || !G.isPt(o.g)) continue;
    const zs = geo.preimages(o);
    zs.forEach((z, i) => {
      if (!isFin(z)) return;
      const [x, y] = v.toScreen(z);
      if (Math.abs(x) > 1e5 || Math.abs(y) > 1e5) return;
      pointMark(ctx, x, y, o.color, { ring: true, r: 4, hi: geo.isHi('w', o.id) });
      if (geo.disp.labels && i < 8) label(ctx, x + 8, y - 11, preLabel(o), '#c9d3ea');
    });
  }
}

// ---------------- 球面视图 ----------------
const to3 = (pts) => pts.map((w) => (w && isFin(w) ? invStereoUnit(w) : w ? [0, 0, 1] : null));
export function drawSphereOwn(ctx, sv, geo, plane) {
  const B = geo.boards[plane];
  for (const o of B.objs) if (visible(o) && G.isCurve(o.g)) sv.curve(ctx, to3(geo.cached(o, 'smp', '', () => G.sample(o.g))), curveStyle(geo, plane, o));
  for (const o of B.objs) if (visible(o) && G.isPt(o.g)) sv.point(ctx, invStereoUnit(o.g.z), o.color, 4.5, geo.disp.labels ? o.name : null);
}
export function drawSphereImages(ctx, sv, geo, M) {
  if (!geo.disp.images) return;
  const f = M.fm, opt = { W: sv.W, H: sv.H, tol: 3 }, c = sv.cam;
  const proj = (w) => { const s = sv.project(invStereoUnit(w)); return s ? [s[0], s[1]] : null; };
  const key = `${M.mapVer}|${c.yaw},${c.pitch},${c.dist},${sv.W},${sv.H}`;
  for (const o of geo.boards.z.objs) {
    if (!visible(o) || !G.isCurve(o.g)) continue;
    const pts = geo.cached(o, 'sw', key, () => mapCurve(f, G.sample(o.g), proj, opt));
    sv.curve(ctx, to3(pts), curveStyle(geo, 'z', o));
  }
  for (const o of geo.boards.z.objs) {
    if (!visible(o) || !G.isPt(o.g)) continue;
    const w = f(o.g.z);
    sv.point(ctx, isFin(w) ? invStereoUnit(w) : [0, 0, 1], o.color, 4, geo.disp.labels ? imageLabel(o) : null);
  }
}
export function drawSpherePreimagePts(ctx, sv, geo) {
  if (!geo.disp.images) return;
  for (const o of geo.boards.w.objs) {
    if (!visible(o) || !G.isPt(o.g)) continue;
    geo.preimages(o).forEach((z, i) => sv.point(ctx, isFin(z) ? invStereoUnit(z) : [0, 0, 1], o.color, 4, geo.disp.labels && i < 8 ? preLabel(o) : null));
  }
}
