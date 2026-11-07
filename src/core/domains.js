// 常用区域：网格参数化 param(u,v)、自然坐标网格线、按段着色的边界、标记点
import { C, polar } from './complex.js';
import { segment, circlePts } from './mapcurve.js';

export const BCOL = ['#ffb454', '#ff6b9a', '#6ee7a8', '#a78bfa', '#5cc8ff'];
const PI = Math.PI;
const far = (u) => Math.tan(u * 0.998 * PI / 2);              // [0,1] → [0, ~318)，在黎曼球面上几乎到达 N
const sym = (u) => Math.tan((u - 0.5) * 0.998 * PI);           // [0,1] → (−318, 318)

// 直线族：x = 常数 / y = 常数，限制在给定范围内
function hLines(ys, x0, x1, fam = 1) { return ys.map((y, i) => ({ pts: segment(C(x0, y), C(x1, y), 160), fam, t: i / Math.max(1, ys.length - 1), axis: Math.abs(y) < 1e-9 })); }
function vLines(xs, y0, y1, fam = 0) { return xs.map((x, i) => ({ pts: segment(C(x, y0), C(x, y1), 160), fam, t: i / Math.max(1, xs.length - 1), axis: Math.abs(x) < 1e-9 })); }
const range = (a, b, s) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(+x.toFixed(10)); return o; };
function circles(rs, t0 = 0, t1 = 2 * PI, fam = 1) { return rs.map((r, i) => ({ pts: circlePts(C(0), r, 200, t0, t1), fam, t: i / Math.max(1, rs.length - 1), axis: Math.abs(r - 1) < 1e-9 })); }
function rays(ts, r0, r1, fam = 0) {
  return ts.map((t, i) => {
    const pts = [];
    for (let k = 0; k <= 160; k++) { const s = k / 160; pts.push(polar(r0 + (r1 - r0) * s * s, t)); }
    return { pts, fam, t: i / Math.max(1, ts.length - 1), axis: false };
  });
}
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

export const DOMAINS = {
  disk: {
    name: '单位圆盘', tex: '|z|<1', view: [0, 0, 1.6], cells: [6, 16],
    param: (u, v) => polar(u, 2 * PI * v),
    seed: (u, v) => polar(Math.exp(-es(1 - u, LOGR, 3)), 2 * PI * v),
    lines: (n) => [...circles(range(1 / n, 1 - 1e-9, 1 / n).filter((r) => r < 0.999)), ...rays(range(0, 2 * PI - 1e-9, PI / (4 * n)), 0, 1)],
    boundary: () => [bd(circlePts(C(0), 1, 240), 0, '|z|=1')],
    marks: [[C(1), '1'], [C(0, 1), 'i'], [C(-1), '−1'], [C(0, -1), '−i'], [C(0), '0']],
  },
  uhp: {
    name: '上半平面', tex: '\\operatorname{Im} z>0', view: [0, 1.5, 2.6], cells: [16, 8],
    param: (u, v) => C(sym(u), far(v)),
    lines: (n) => [...vLines(range(-4, 4, 0.5 / n), 0, 6), ...hLines(range(0.5 / n, 6, 0.5 / n), -6, 6)],
    seed: (u, v) => polar(Math.exp(ss(u, LOGR, 6)), PI * v),
    boundary: () => [bd(gray(PI, true), 1, '负实轴'), bd(gray(0), 0, '正实轴')],
    marks: [[C(0), '0'], [C(1), '1'], [C(-1), '−1'], [C(0, 1), 'i']],
  },
  rhp: {
    name: '右半平面', tex: '\\operatorname{Re} z>0', view: [1.5, 0, 2.6], cells: [8, 16],
    param: (u, v) => C(far(u), sym(v)),
    lines: (n) => [...vLines(range(0.5 / n, 6, 0.5 / n), -6, 6), ...hLines(range(-4, 4, 0.5 / n), 0, 6)],
    seed: (u, v) => polar(Math.exp(ss(u, LOGR, 6)), PI * (v - 0.5)),
    boundary: () => [bd(gray(-PI / 2, true), 1, '负虚轴'), bd(gray(PI / 2), 0, '正虚轴')],
    marks: [[C(0), '0'], [C(0, 1), 'i'], [C(0, -1), '−i'], [C(1), '1']],
  },
  sector: {
    name: '角形域', tex: '0<\\arg z<\\alpha', view: [0.8, 0.8, 2.2], cells: [8, 6],
    param: (u, v, a) => polar(far(u), a * v), p: { label: '张角 α / π', min: 0.1, max: 2, def: 1 / 3, scale: PI },
    lines: (n, a) => [...circles(range(0.5 / n, 5, 0.5 / n), 0, a), ...rays(range(0, a, a / (6 * n)).slice(1, -1), 0, 6)],
    seed: (u, v, a) => polar(Math.exp(ss(u, LOGR, 6)), a * v),
    boundary: (a) => [bd(gray(0), 0, 'arg z=0'), bd(gray(a), 1, 'arg z=α')],
    marks: [[C(0), '0'], [C(1), '1']],
  },
  strip: {
    name: '水平带形', tex: '0<\\operatorname{Im} z<h', view: [0, 1.6, 3.2], cells: [16, 6],
    param: (u, v, h) => C(sym(u) * 0.35, h * v), p: { label: '宽度 h / π', min: 0.1, max: 2, def: 1, scale: PI },
    lines: (n, h) => [...hLines(range(0, h, h / (6 * n)).slice(1, -1), -6, 6), ...vLines(range(-5, 5, 0.5 / n), 0, h)],
    seed: (u, v, h) => C(ss(u, 40, 8), h * v),
    boundary: (h) => [bd(hline(0), 0, 'Im z=0'), bd(hline(h), 1, 'Im z=h')],
    marks: [[C(0), '0'], [C(0, PI), 'πi']],
  },
  halfstrip: {
    name: '竖直半带形', tex: '|\\operatorname{Re} z|<\\tfrac{\\pi}{2},\\ \\operatorname{Im} z>0', view: [0, 1.5, 2.6], cells: [6, 10],
    param: (u, v) => C(PI * (u - 0.5), far(v) * 0.6),
    lines: (n) => [...vLines(range(-PI / 2, PI / 2, PI / (12 * n)).slice(1, -1), 0, 5), ...hLines(range(0.25 / n, 5, 0.25 / n), -PI / 2, PI / 2)],
    seed: (u, v) => C(PI * (u - 0.5), es(v, 40, 2)),
    boundary: () => [bd(vray(-PI / 2, 40, 500, true), 1, '左边'), bd(segment(C(-PI / 2), C(PI / 2), 200), 0, '底边'), bd(vray(PI / 2), 2, '右边')],
    marks: [[C(-PI / 2), '−π/2'], [C(PI / 2), 'π/2'], [C(0), '0']],
  },
  halfdisk: {
    name: '上半单位圆盘', tex: '|z|<1,\\ \\operatorname{Im}z>0', view: [0, 0.5, 1.4], cells: [6, 8],
    param: (u, v) => polar(u, PI * v),
    seed: (u, v) => polar(Math.exp(-es(1 - u, LOGR, 3)), PI * v),
    lines: (n) => [...circles(range(0.2 / n, 0.999, 0.2 / n).filter((r) => r < 0.999), 0, PI), ...rays(range(0, PI, PI / (8 * n)).slice(1, -1), 0, 1)],
    boundary: () => [bd(segment(C(-1), C(1), 200), 0, '直径'), bd(circlePts(C(0), 1, 200, 0, PI), 1, '半圆周')],
    marks: [[C(-1), '−1'], [C(1), '1'], [C(0), '0'], [C(0, 1), 'i']],
  },
  annulus: {
    name: '圆环', tex: 'r<|z|<1', view: [0, 0, 1.6], cells: [4, 16],
    param: (u, v, r) => polar(r + (1 - r) * u, 2 * PI * v), p: { label: '内半径 r', min: 0.1, max: 0.9, def: 0.4 },
    lines: (n, r) => [...circles(range(r, 1, (1 - r) / (4 * n)).slice(1, -1)), ...rays(range(0, 2 * PI - 1e-9, PI / (4 * n)), r, 1)],
    boundary: (r) => [bd(circlePts(C(0), r, 200), 1, '内圆'), bd(circlePts(C(0), 1, 240), 0, '外圆')],
    marks: [[C(1), '1']],
  },
  exterior: {
    name: '单位圆外部', tex: '|z|>1', view: [0, 0, 3], cells: [8, 16],
    param: (u, v) => polar(1 / (1 - 0.975 * u), 2 * PI * v),
    seed: (u, v) => polar(Math.exp(es(u, LOGR, 3)), 2 * PI * v),
    lines: (n) => [...circles(range(1 + 0.25 / n, 4, 0.25 / n)), ...rays(range(0, 2 * PI - 1e-9, PI / (4 * n)), 1, 5)],
    boundary: () => [bd(circlePts(C(0), 1, 240), 0, '|z|=1')],
    marks: [[C(1), '1'], [C(0, 1), 'i'], [C(-1), '−1'], [C(0, -1), '−i']],
  },
  rect: {
    name: '矩形', tex: '|\\operatorname{Re}z|<a,\\ |\\operatorname{Im}z|<a', view: [0, 0, 1.8], cells: [8, 8],
    param: (u, v, a) => C(a * (2 * u - 1), a * (2 * v - 1)), p: { label: '半边长 a', min: 0.2, max: 3.2, def: 1 },
    lines: (n, a) => [...vLines(range(-a, a, a / (4 * n)).slice(1, -1), -a, a), ...hLines(range(-a, a, a / (4 * n)).slice(1, -1), -a, a)],
    boundary: (a) => [bd(segment(C(-a, -a), C(a, -a)), 0, '下'), bd(segment(C(a, -a), C(a, a)), 2, '右'), bd(segment(C(a, a), C(-a, a)), 1, '上'), bd(segment(C(-a, a), C(-a, -a)), 3, '左')],
    marks: [],
  },
  slit: {
    name: '沿负实轴割开的平面', tex: '\\mathbb C\\setminus(-\\infty,0]', view: [0, 0, 3], cells: [8, 16],
    param: (u, v) => polar(far(u), PI * (2 * v - 1) * 0.9995),
    lines: (n) => [...circles(range(0.5 / n, 5, 0.5 / n), -PI * 0.9995, PI * 0.9995), ...rays(range(-PI, PI, PI / (6 * n)).slice(1, -1), 0, 6)],
    seed: (u, v) => polar(Math.exp(ss(u, LOGR, 6)), PI * (2 * v - 1) * 0.9995),
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
