// 第 3 章 反演 · 共用：反演圆 Γ、折叠着色背景、作图小工具
import * as K from '../../core/complex.js';
import { renderer, mobiusShader, matUniforms } from '../../core/gl.js';
import { sampleGC } from '../../core/circle.js';
import { mapCurve } from '../../core/mapcurve.js';
import { strokePath, label } from '../../core/draw.js';
import { cx, num } from '../../core/format.js';

export const COL = { gamma: '#a78bfa', src: '#ffb454', img: '#5cc8ff', p: '#ff6b9a', q: '#6ee7a8' };

export const gammaOf = (s) => ({ line: false, c: s.O, r: K.dist(s.O, s.rp) });

// Γ 的两个控制点：圆心 O（拖动时整个圆跟着平移）与半径点
export function gammaHandles(s, update) {
  return [
    { color: COL.gamma, r: 7, label: 'O', pos: () => s.O, move: (z) => { s.rp = K.add(s.rp, K.sub(z, s.O)); s.O = z; update(); } },
    { color: '#d6c8ff', r: 5, pos: () => s.rp, move: (z) => { if (K.dist(z, s.O) > 0.05) s.rp = z; update(); } },
  ];
}

// 背景：以 O 为中心的极坐标棋盘格，Γ 内的点取其反演点的颜色——同色的两点互为反演
let foldProg;
export function foldBg(view, G, on) {
  if (foldProg === undefined) foldProg = renderer().ok ? renderer().program(mobiusShader('dot(m, m) < 1.0 ? m / dot(m, m) : m')) : null;
  view.bg = () => {
    const g = G(), k = 1 / g.r;
    return { prog: on() ? foldProg : null, uniforms: { u_colorMode: 3, u_bright: 0.36, u_lines: 0, u_lineStep: 0.5, ...matUniforms([K.C(k), K.scale(K.neg(g.c), k), K.ZERO, K.ONE]) } };
  };
}

// 广义圆及其在 f 下的像（自适应细分，经过 ∞ 时自动断开）
export function drawGC(ctx, v, C, style, f = (z) => z) {
  strokePath(ctx, v, mapCurve(f, sampleGC(C, 300), (w) => v.toScreen(w), { W: v.W, H: v.H }), style);
}

// 线段（过长时截断在视野附近，避免画布坐标溢出）
export function seg(ctx, v, a, b, style) {
  if (!K.isFin(a) || !K.isFin(b)) return;
  const L = (4 * Math.hypot(v.W, v.H)) / v.ppu, d = K.dist(a, b);
  if (d > L) b = K.add(a, K.scale(K.sub(b, a), L / d));
  strokePath(ctx, v, [a, b], { casing: false, maxJump: Infinity, ...style });
}
// 过 a、b 的整条直线
export function fullLine(ctx, v, a, b, style) {
  const d = K.sub(b, a), L = (4 * Math.hypot(v.W, v.H)) / v.ppu / (K.abs(d) || 1);
  seg(ctx, v, K.sub(a, K.scale(d, L)), K.add(a, K.scale(d, L)), style);
}

// 直角符号：顶点 V，两边指向 A、B
export function rightMark(ctx, v, V, A, B, color = '#fff', size = 9) {
  if (![V, A, B].every(K.isFin)) return;
  const [x, y] = v.toScreen(V);
  const unit = (P) => { const [px, py] = v.toScreen(P), L = Math.hypot(px - x, py - y); return L > 1e-6 ? [(px - x) / L, (py - y) / L] : null; };
  const a = unit(A), b = unit(B);
  if (!a || !b) return;
  ctx.beginPath();
  ctx.moveTo(x + a[0] * size, y + a[1] * size);
  ctx.lineTo(x + (a[0] + b[0]) * size, y + (a[1] + b[1]) * size);
  ctx.lineTo(x + b[0] * size, y + b[1] * size);
  ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.stroke();
}

export function tag(ctx, v, z, text, color, dx = 8, dy = -11) {
  if (!K.isFin(z)) return;
  const [x, y] = v.toScreen(z);
  if (x < -50 || y < -50 || x > v.W + 50 || y > v.H + 50) return;
  label(ctx, x + dx, y + dy, text, color);
}

// 过 P、Q 的圆族（都与以 P、Q 为对称点的圆正交）；Q = ∞ 时为过 P 的直线族
export function pencilGC(P, Q) {
  if (!K.isFin(P) && !K.isFin(Q)) return [];
  if (!K.isFin(P) || !K.isFin(Q)) {
    const A = K.isFin(P) ? P : Q;
    return [0, 1, 2, 3, 4, 5].map((k) => ({ line: true, p: A, d: K.cis((k * Math.PI) / 6) }));
  }
  const mid = K.lerp(P, Q, 0.5), d = K.sub(Q, P), L = K.abs(d);
  if (L < 1e-9) return [];
  const n = K.mul(K.scale(d, 1 / L), K.I), out = [];
  for (const t of [-2.4, -1.2, -0.55, 0, 0.55, 1.2, 2.4]) {
    const c = K.add(mid, K.scale(n, t * L));
    out.push({ line: false, c, r: K.dist(c, P) });
  }
  out.push({ line: true, p: P, d: K.scale(d, 1 / L) });
  return out;
}

export function describeGC(C, O) {
  const v = C.line ? K.sub(O, C.p) : null;
  const thru = C.line ? Math.abs(v.re * C.d.im - v.im * C.d.re) < 1e-6 : Math.abs(K.dist(O, C.c) - C.r) < 1e-6 * Math.max(1, C.r);
  return (C.line ? '直线' : `圆心 ${cx(C.c)}，半径 ${num(C.r)}`) + (thru ? '（过 O）' : '');
}
