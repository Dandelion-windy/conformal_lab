// 映射器的叠加层：z 平面画源曲线，w 平面画像曲线；平面与球面两种视图
import { C, add, scale, isFin, I } from '../../core/complex.js';
import { mapCurve, circlePts, segment } from '../../core/mapcurve.js';
import { strokePath, dot, label, arrow } from '../../core/draw.js';
import { invStereoUnit } from '../../core/vec3.js';
import { drawOwn, drawUI, drawImages, drawPreimagePts, drawSphereOwn, drawSphereImages, drawSpherePreimagePts } from '../board/render.js';

// 特殊点的标记：零点 ○、极点 ◉、临界点 ✕（f′ = 0，共形性失效处）
function marker(ctx, x, y, kind, text) {
  ctx.save();
  ctx.lineWidth = 2.2;
  if (kind === 'zero') { ctx.strokeStyle = '#fff'; ctx.fillStyle = '#0a0f1e'; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.fill(); ctx.stroke(); }
  else if (kind === 'pole') { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0a0f1e'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0a0f1e'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); }
  else { ctx.strokeStyle = '#0a0f1e'; ctx.lineWidth = 4.5; for (const s of [1, -1]) { ctx.beginPath(); ctx.moveTo(x - 5, y - 5 * s); ctx.lineTo(x + 5, y + 5 * s); ctx.stroke(); }
    ctx.strokeStyle = '#ff6b9a'; ctx.lineWidth = 2.4; for (const s of [1, -1]) { ctx.beginPath(); ctx.moveTo(x - 5, y - 5 * s); ctx.lineTo(x + 5, y + 5 * s); ctx.stroke(); } }
  ctx.restore();
  if (text) label(ctx, x + 9, y + 11, text, kind === 'crit' ? '#ff6b9a' : '#e8ecf6');
}
const mult = (m) => (m > 1 ? `（${m} 阶）` : '');
// side：'z' 画零点、极点、临界点；'w' 画临界值（临界点的像）
export function specialPoints(M, side, place) {
  const I = M.info;
  if (!M.state.special || !I || M.state.morph < 1) return;
  if (side === 'z') {
    for (const q of I.zeros) place(q.z, 'zero', `零点${mult(q.m)}`);
    for (const q of I.poles) place(q.z, 'pole', `极点${mult(q.m)}`);
    for (const q of I.crit) place(q.z, 'crit', `f′=0${q.m > 1 ? `（${q.m + 1} 重）` : ''}`);
  } else {
    for (const q of I.crit) { const w = isFin(q.z) ? M.f(q.z) : I.inf; if (w) place(w, 'crit', '临界值'); }
  }
}
export { marker };

const probePts = (z0, rho) => ({ circ: circlePts(z0, rho, 64), e1: segment(z0, add(z0, C(rho)), 16), e2: segment(z0, add(z0, scale(I, rho)), 16) });

export function zOverlay(M) {
  return (ctx, v) => {
    const s = M.state;
    if (s.showBoundary) for (const B of M.boundary) strokePath(ctx, v, B.pts, { color: B.color, width: 3 });
    if (s.showBoundary) for (const [z, t] of M.marks) { dot(ctx, v, z, '#fff', 3.5); const [x, y] = v.toScreen(z); label(ctx, x + 7, y - 9, t); }
    const pz = M.probeZ;
    if (s.probe && pz) {
      const rho = 26 / v.ppu, P = probePts(pz, rho);
      strokePath(ctx, v, P.circ, { color: '#fff', width: 1.6 });
      arrow(ctx, v, pz, add(pz, C(rho)), '#ff6b9a', 2.2);
      arrow(ctx, v, pz, add(pz, scale(I, rho)), '#5cc8ff', 2.2);
    }
    specialPoints(M, 'z', (z, k, t) => { if (!isFin(z)) return; const [x, y] = v.toScreen(z); marker(ctx, x, y, k, t); });
    if (M.hoverZ && !s.probe) dot(ctx, v, M.hoverZ, '#fff', 4);
    if (M.preimages) for (const z of M.preimages) {
      if (!isFin(z)) continue;
      const [x, y] = v.toScreen(z);
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      dot(ctx, v, z, '#ffb454', 3);
    }
    drawPreimagePts(ctx, v, M.geo, M);
    drawOwn(ctx, v, M.geo, 'z');
    drawUI(ctx, v, M.geo, 'z');
  };
}

// 统一的映射绘制：proj 为屏幕投影，drawFn(pts, style) 负责实际描线
function mappedScene(M, proj, W, H, drawLine, drawDot) {
  const s = M.state, f = M.fm;
  const opt = { W, H };
  if (s.showBoundary) for (const B of M.boundary) drawLine(mapCurve(f, B.pts, proj, opt), { color: B.color, width: 3 });
  if (s.showBoundary) for (const [z, t] of M.marks) drawDot(f(z), '#fff', 3.5, `f(${t})`);
  const pz = M.probeZ;
  if (s.probe && pz) {
    const rho = 26 / M.zv.ppu, P = probePts(pz, rho);
    drawLine(mapCurve(f, P.circ, proj, opt), { color: '#fff', width: 1.6 });
    drawLine(mapCurve(f, P.e1, proj, opt), { color: '#ff6b9a', width: 2.6 });
    drawLine(mapCurve(f, P.e2, proj, opt), { color: '#5cc8ff', width: 2.6 });
    drawDot(f(pz), '#fff', 3);
  } else if (M.hoverZ) drawDot(f(M.hoverZ), '#fff', 4);
  if (M.hoverW) drawDot(M.hoverW, '#ffb454', 4);
}
const specialW = (M, ctx, v) => specialPoints(M, 'w', (w, k, t) => { if (!isFin(w)) return; const [x, y] = v.toScreen(w); marker(ctx, x, y, k, t); });

export function wOverlay(M) {
  return (ctx, v) => {
    const proj = (w) => v.toScreen(w);
    mappedScene(M, proj, v.W, v.H,
      (pts, st) => strokePath(ctx, v, pts, { ...st, maxJump: 80 }),
      (w, color, r, t) => {
        if (!isFin(w)) return;
        dot(ctx, v, w, color, r);
        if (t) { const [x, y] = v.toScreen(w); label(ctx, x + 7, y - 9, t); }
      });
    specialW(M, ctx, v);
    drawImages(ctx, v, M.geo, M);
    drawOwn(ctx, v, M.geo, 'w');
    drawUI(ctx, v, M.geo, 'w');
  };
}

// 曲线端点很远时沿原方向延伸到 ∞，使其在球面上一直画到 N（而不是在 |z|≈40 处提前终止）
function extendInf(pts) {
  const out = pts.slice(), far = (z) => z && isFin(z) && Math.hypot(z.re, z.im) > 25;
  const ext = (z) => { const o = []; for (let k = 1; k <= 22; k++) o.push(scale(z, 2 ** k)); return o; };
  const a = out[0], b = out[out.length - 1];
  return [...(far(a) ? ext(a).reverse() : []), ...out, ...(far(b) ? ext(b) : [])];
}

// 球面视图：网格与格子由 GPU 绘制；这里只画边界、标记点、用户曲线、探针与悬停点
export function sphereOverlay(M, which) {
  return (ctx, sv) => {
    const toP = (w) => invStereoUnit(w);
    const proj = (w) => { const s = sv.project(toP(w)); return s ? [s[0], s[1]] : null; };
    const to3 = (pts) => pts.map((w) => (w && isFin(w) ? toP(w) : w ? [0, 0, 1] : null));
    const s = M.state;
    const put = (z, k, t) => { const P = isFin(z) ? toP(z) : [0, 0, 1]; const q = sv.project(P); if (!q) return; ctx.globalAlpha = sv.visible(P) ? 1 : 0.35; marker(ctx, q[0], q[1], k, sv.visible(P) ? t : null); ctx.globalAlpha = 1; };
    specialPoints(M, which, put);
    if (which === 'z') {
      if (s.showBoundary) for (const B of M.boundary) sv.curve(ctx, to3(extendInf(B.pts)), { color: B.color, width: 3 });
      drawSphereOwn(ctx, sv, M.geo, 'z');
      drawSpherePreimagePts(ctx, sv, M.geo);
      if (s.showBoundary) for (const [z, t] of M.marks) sv.point(ctx, toP(z), '#fff', 3.5, t);
      if (M.hoverZ) sv.point(ctx, toP(M.hoverZ), '#fff', 4.5);
      if (M.preimages) for (const z of M.preimages) sv.point(ctx, isFin(z) ? toP(z) : [0, 0, 1], '#ffb454', 5.5);
      return;
    }
    const f = M.fm, opt = { W: sv.W, H: sv.H, tol: 3 };
    const line = (pts, st) => sv.curve(ctx, to3(mapCurve(f, pts, proj, opt)), st);
    if (s.showBoundary) for (const B of M.boundary) line(extendInf(B.pts), { color: B.color, width: 3 });
    drawSphereImages(ctx, sv, M.geo, M);
    drawSphereOwn(ctx, sv, M.geo, 'w');
    if (s.showBoundary) for (const [z, t] of M.marks) { const w = f(z); sv.point(ctx, isFin(w) ? toP(w) : [0, 0, 1], '#fff', 3.5, `f(${t})`); }
    if (M.hoverZ) { const w = f(M.hoverZ); sv.point(ctx, isFin(w) ? toP(w) : [0, 0, 1], '#fff', 4.5); }
    if (M.hoverW) sv.point(ctx, isFin(M.hoverW) ? toP(M.hoverW) : [0, 0, 1], '#ffb454', 5);
  };
}
