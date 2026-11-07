// 广义圆（圆或直线）：三点确定、对称点、采样
import { C, add, sub, scale, abs, conj, div, mul, isFin, cis, arg, INF } from './complex.js';

// 过三点的广义圆：{ line:false, c, r } 或 { line:true, p, d }（d 为单位方向）
export function circleThrough(a, b, c) {
  const fin = [a, b, c].filter(isFin);
  if (fin.length < 3) {
    const [p, q] = fin;
    return { line: true, p, d: scale(sub(q, p), 1 / (abs(sub(q, p)) || 1)) };
  }
  const ax = a.re, ay = a.im, bx = b.re, by = b.im, cx = c.re, cy = c.im;
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const scaleL = Math.max(abs(sub(a, b)), abs(sub(b, c)), abs(sub(a, c)), 1e-12);
  if (Math.abs(D) < 1e-9 * scaleL * scaleL) return { line: true, p: a, d: scale(sub(c, a), 1 / (abs(sub(c, a)) || 1)) };
  const A2 = ax * ax + ay * ay, B2 = bx * bx + by * by, C2 = cx * cx + cy * cy;
  const ux = (A2 * (by - cy) + B2 * (cy - ay) + C2 * (ay - by)) / D;
  const uy = (A2 * (cx - bx) + B2 * (ax - cx) + C2 * (bx - ax)) / D;
  const o = C(ux, uy);
  const r = abs(sub(a, o));
  if (r > 1e7) return { line: true, p: a, d: scale(sub(c, a), 1 / abs(sub(c, a))) };
  return { line: false, c: o, r };
}

// 关于广义圆的对称点
export function reflect(K, z) {
  if (K.line) {
    const v = sub(z, K.p);
    return add(K.p, mul(mul(K.d, K.d), conj(v)));
  }
  if (!isFin(z)) return K.c;
  const v = sub(z, K.c);
  if (abs(v) < 1e-300) return INF;
  return add(K.c, div(C(K.r * K.r), conj(v)));
}

// 采样：直线用 tan 参数覆盖 ∞（返回 null 作为断点）
export function sampleGC(K, n = 240) {
  const pts = [];
  if (K.line) {
    for (let i = 0; i <= n; i++) {
      const s = -Math.PI / 2 + (Math.PI * i) / n;
      pts.push(Math.abs(Math.cos(s)) < 1e-9 ? null : add(K.p, scale(K.d, Math.tan(s))));
    }
    return pts;
  }
  for (let i = 0; i <= n; i++) pts.push(add(K.c, scale(cis((2 * Math.PI * i) / n), K.r)));
  return pts;
}

// 广义圆 C 关于圆 G 反演的像（过 G 的圆心时为直线）
export function invertGC(G, C) {
  const O = G.c, f = (z) => reflect(G, z), eps = 1e-9 * Math.max(1, G.r);
  if (C.line) {
    const v = sub(O, C.p), off = Math.abs(v.re * C.d.im - v.im * C.d.re);
    if (off < eps) return { line: true, p: O, d: C.d };
    return circleThrough(f(C.p), f(add(C.p, C.d)), O);
  }
  const t0 = arg(sub(O, C.c));
  const pts = [1, 3, 5].map((k) => add(C.c, scale(cis(t0 + (k * Math.PI) / 3), C.r)));
  if (Math.abs(abs(sub(O, C.c)) - C.r) < eps) return circleThrough(f(pts[0]), f(pts[1]), INF);
  return circleThrough(...pts.map(f));
}
