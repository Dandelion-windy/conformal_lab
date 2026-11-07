// 常用区域：网格参数化 param(u,v)（对数尺度，覆盖到 0、∞ 与角点附近）、按段着色的边界、标记点；
// 以及区域的 GLSL 判定式与自然坐标网格
import { C, polar } from './complex.js';
import { segment, circlePts } from './mapcurve.js';

export const BCOL = ['#ffb454', '#ff6b9a', '#6ee7a8', '#a78bfa', '#5cc8ff'];
const PI = Math.PI;
const bd = (pts, k, name) => ({ pts, color: BCOL[k % BCOL.length], name });

// 拉伸函数：中心（或起点）附近密、远处疏，用于覆盖到 0 与 ∞ 附近
function solve(fn, target) { let lo = 1e-6, hi = 400; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (fn(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; }
const cache = new Map();
// [0,1] → [−L, L]，u = ½ 处斜率为 c
export function ss(u, L, c) {
  if (L <= c / 2) return (u - 0.5) * 2 * L;
  const k = `s${L}|${c}`;
  if (!cache.has(k)) cache.set(k, solve((B) => (c / B) * Math.sinh(B / 2), L));
  const B = cache.get(k);
  return (c / B) * Math.sinh(B * (u - 0.5));
}
// [0,1] → [0, L]，u = 0 处斜率为 c
export function es(u, L, c) {
  if (L <= c) return u * L;
  const k = `e${L}|${c}`;
  if (!cache.has(k)) cache.set(k, solve((B) => (c / B) * Math.expm1(B), L));
  const B = cache.get(k);
  return (c / B) * Math.expm1(B * u);
}
// 从原点出发的射线，|z| 按几何级数取样（e^{−30} 到 e^{30}），inward 为从 ∞ 指向 0
const LOGR = 30;
function gray(th, inward = false, n = 700) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(polar(Math.exp(-LOGR + (2 * LOGR * i) / n), th));
  return inward ? pts.reverse() : pts;
}
// 水平/竖直直线：参数按 ss 拉伸，延伸到 ±X
const hline = (y, X = 40, n = 800, rev = false) => { const p = []; for (let i = 0; i <= n; i++) p.push(C(ss(i / n, X, 6), y)); return rev ? p.reverse() : p; };
const vray = (x, Y = 40, n = 500, down = false) => { const p = []; for (let i = 0; i <= n; i++) p.push(C(x, es(i / n, Y, 1))); return down ? p.reverse() : p; };
// 常用的参数化：ln|z| 在 [−30, 30] 内按 ss 拉伸（覆盖 0 与 ∞）；圆盘类在 |z| → 1 处加密
const logR = (u) => Math.exp(ss(u, LOGR, 6));
const toEdge = (u) => Math.exp(-es(1 - u, LOGR, 3));

export const DOMAINS = {
  disk: {
    name: '单位圆盘', view: [0, 0, 1.6],
    param: (u, v) => polar(toEdge(u), 2 * PI * v),
    boundary: () => [bd(circlePts(C(0), 1, 240), 0, '|z|=1')],
    marks: [[C(1), '1'], [C(0, 1), 'i'], [C(-1), '−1'], [C(0, -1), '−i'], [C(0), '0']],
  },
  uhp: {
    name: '上半平面', view: [0, 1.5, 2.6],
    param: (u, v) => polar(logR(u), PI * v),
    boundary: () => [bd(gray(PI, true), 1, '负实轴'), bd(gray(0), 0, '正实轴')],
    marks: [[C(0), '0'], [C(1), '1'], [C(-1), '−1'], [C(0, 1), 'i']],
  },
  rhp: {
    name: '右半平面', view: [1.5, 0, 2.6],
    param: (u, v) => polar(logR(u), PI * (v - 0.5)),
    boundary: () => [bd(gray(-PI / 2, true), 1, '负虚轴'), bd(gray(PI / 2), 0, '正虚轴')],
    marks: [[C(0), '0'], [C(0, 1), 'i'], [C(0, -1), '−i'], [C(1), '1']],
  },
  sector: {
    name: '角形域', view: [0.8, 0.8, 2.2], p: { label: '张角 α / π', min: 0.1, max: 2, def: 1 / 3, scale: PI },
    param: (u, v, a) => polar(logR(u), a * v),
    boundary: (a) => [bd(gray(0), 0, 'arg z=0'), bd(gray(a), 1, 'arg z=α')],
    marks: [[C(0), '0'], [C(1), '1']],
  },
  strip: {
    name: '水平带形', view: [0, 1.6, 3.2], p: { label: '宽度 h / π', min: 0.1, max: 2, def: 1, scale: PI },
    param: (u, v, h) => C(ss(u, 40, 8), h * v),
    boundary: (h) => [bd(hline(0), 0, 'Im z=0'), bd(hline(h), 1, 'Im z=h')],
    marks: [[C(0), '0'], [C(0, PI), 'πi']],
  },
  halfstrip: {
    name: '竖直半带形', view: [0, 1.5, 2.6],
    param: (u, v) => C(PI * (u - 0.5), es(v, 40, 2)),
    boundary: () => [bd(vray(-PI / 2, 40, 500, true), 1, '左边'), bd(segment(C(-PI / 2), C(PI / 2), 200), 0, '底边'), bd(vray(PI / 2), 2, '右边')],
    marks: [[C(-PI / 2), '−π/2'], [C(PI / 2), 'π/2'], [C(0), '0']],
  },
  halfdisk: {
    name: '上半单位圆盘', view: [0, 0.5, 1.4],
    param: (u, v) => polar(toEdge(u), PI * v),
    boundary: () => [bd(segment(C(-1), C(1), 200), 0, '直径'), bd(circlePts(C(0), 1, 200, 0, PI), 1, '半圆周')],
    marks: [[C(-1), '−1'], [C(1), '1'], [C(0), '0'], [C(0, 1), 'i']],
  },
  annulus: {
    name: '圆环', view: [0, 0, 1.6], p: { label: '内半径 r', min: 0.1, max: 0.9, def: 0.4 },
    param: (u, v, r) => polar(r + (1 - r) * u, 2 * PI * v),
    boundary: (r) => [bd(circlePts(C(0), r, 200), 1, '内圆'), bd(circlePts(C(0), 1, 240), 0, '外圆')],
    marks: [[C(1), '1']],
  },
  exterior: {
    name: '单位圆外部', view: [0, 0, 3],
    param: (u, v) => polar(Math.exp(es(u, LOGR, 3)), 2 * PI * v),
    boundary: () => [bd(circlePts(C(0), 1, 240), 0, '|z|=1')],
    marks: [[C(1), '1'], [C(0, 1), 'i'], [C(-1), '−1'], [C(0, -1), '−i']],
  },
  rect: {
    name: '矩形', view: [0, 0, 1.8], p: { label: '半边长 a', min: 0.2, max: 3.2, def: 1 },
    param: (u, v, a) => C(a * (2 * u - 1), a * (2 * v - 1)),
    boundary: (a) => [bd(segment(C(-a, -a), C(a, -a)), 0, '下'), bd(segment(C(a, -a), C(a, a)), 2, '右'), bd(segment(C(a, a), C(-a, a)), 1, '上'), bd(segment(C(-a, a), C(-a, -a)), 3, '左')],
    marks: [],
  },
  slit: {
    name: '沿负实轴割开的平面', view: [0, 0, 3],
    param: (u, v) => polar(logR(u), PI * (2 * v - 1) * 0.9995),
    boundary: () => [bd(gray(PI - 1e-7, true), 0, '割线上岸'), bd(gray(-PI + 1e-7, true), 1, '割线下岸')],
    marks: [[C(0), '0'], [C(1), '1']],
  },
};
for (const k in DOMAINS) DOMAINS[k].id = k;

// 取区域参数值（带缩放，例如 α/π → α）
export function domainParam(d, raw) { return d.p ? (raw ?? d.p.def) * (d.p.scale || 1) : undefined; }

// 区域的 GLSL 判定式（u_dp 为缩放后的区域参数），用于精确裁剪映射图案
export const DOMAIN_MASK = {
  disk: 'dot(z, z) < 1.0',
  uhp: 'z.y > 0.0',
  rhp: 'z.x > 0.0',
  sector: 'secArg(z) > 0.0 && secArg(z) < u_dp',
  strip: 'z.y > 0.0 && z.y < u_dp',
  halfstrip: 'abs(z.x) < 0.5 * PI && z.y > 0.0',
  halfdisk: 'dot(z, z) < 1.0 && z.y > 0.0',
  annulus: 'dot(z, z) < 1.0 && dot(z, z) > u_dp * u_dp',
  exterior: 'dot(z, z) > 1.0',
  rect: 'abs(z.x) < u_dp && abs(z.y) < u_dp',
  slit: 'true',
};
// 区域的自然坐标网格
export const DOMAIN_GRID = { disk: 'polar', sector: 'polar', annulus: 'polar', exterior: 'polar', halfdisk: 'polar', slit: 'polar', uhp: 'cart', rhp: 'cart', strip: 'cart', halfstrip: 'cart', rect: 'cart' };
