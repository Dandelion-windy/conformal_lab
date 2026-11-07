// 复数运算：复数用 {re, im} 普通对象表示；∞ 用 INF 表示（re/im 为 Infinity）
export const C = (re, im = 0) => ({ re, im });
export const ZERO = C(0, 0);
export const ONE = C(1, 0);
export const I = C(0, 1);
export const INF = C(Infinity, Infinity);

export const isFin = (z) => Number.isFinite(z.re) && Number.isFinite(z.im);
export const add = (a, b) => C(a.re + b.re, a.im + b.im);
export const sub = (a, b) => C(a.re - b.re, a.im - b.im);
export const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const scale = (a, s) => C(a.re * s, a.im * s);
export const neg = (a) => C(-a.re, -a.im);
export const conj = (a) => C(a.re, -a.im);
export const abs = (a) => Math.hypot(a.re, a.im);
export const abs2 = (a) => a.re * a.re + a.im * a.im;
export const arg = (a) => Math.atan2(a.im, a.re);
export const polar = (r, t) => C(r * Math.cos(t), r * Math.sin(t));
export const cis = (t) => C(Math.cos(t), Math.sin(t));
export const dist = (a, b) => Math.hypot(a.re - b.re, a.im - b.im);
export const lerp = (a, b, t) => C(a.re + (b.re - a.re) * t, a.im + (b.im - a.im) * t);

// Smith 算法除法，避免大数溢出；除以 0 得 ∞
export function div(a, b) {
  if (!isFin(b)) return isFin(a) ? ZERO : C(NaN, NaN);
  if (!isFin(a)) return INF;
  if (b.re === 0 && b.im === 0) return (a.re === 0 && a.im === 0) ? C(NaN, NaN) : INF;
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re, d = b.re + b.im * r;
    return C((a.re + a.im * r) / d, (a.im - a.re * r) / d);
  }
  const r = b.re / b.im, d = b.re * r + b.im;
  return C((a.re * r + a.im) / d, (a.im * r - a.re) / d);
}
export const inv = (a) => div(ONE, a);

export function exp(a) {
  const e = Math.exp(a.re);
  return C(e * Math.cos(a.im), e * Math.sin(a.im));
}
export function log(a) {
  if (a.re === 0 && a.im === 0) return C(-Infinity, 0);
  return C(Math.log(abs(a)), arg(a));
}
export function pow(a, b) {
  if (a.re === 0 && a.im === 0) {
    if (b.re > 0) return ZERO;
    return b.re === 0 && b.im === 0 ? ONE : INF;
  }
  if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 64) return powi(a, b.re);
  return exp(mul(b, log(a)));
}
export function powi(a, n) {
  if (n < 0) return inv(powi(a, -n));
  let r = ONE, x = a;
  while (n > 0) {
    if (n & 1) r = mul(r, x);
    x = mul(x, x);
    n >>= 1;
  }
  return r;
}
// 主值平方根（割线沿负实轴，Re √z ≥ 0）
export function sqrt(a) {
  const r = abs(a);
  if (r === 0) return ZERO;
  const re = Math.sqrt((r + a.re) / 2);
  const im = Math.sqrt(Math.max(0, (r - a.re) / 2));
  return C(re, a.im < 0 ? -im : im);
}
export const sin = (a) => C(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
export const cos = (a) => C(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
export const tan = (a) => div(sin(a), cos(a));
export const sinh = (a) => C(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im));
export const cosh = (a) => C(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im));
export const tanh = (a) => div(sinh(a), cosh(a));
// 反三角函数（主值）
export const asin = (a) => mul(neg(I), log(add(mul(I, a), sqrt(sub(ONE, mul(a, a))))));
export const acos = (a) => sub(C(Math.PI / 2), asin(a));
export const atan = (a) => mul(C(0, 0.5), log(div(add(I, a), sub(I, a))));

// 数值导数（中心差分），用于共形性读数
export function deriv(f, z, h) {
  const s = h ?? 1e-6 * Math.max(1, abs(z));
  const a = f(C(z.re + s, z.im)), b = f(C(z.re - s, z.im));
  return scale(sub(a, b), 0.5 / s);
}

// 莫比乌斯变换：矩阵 [a,b,c,d] 作用在扩充平面上
export function mobius(m, z) {
  const [a, b, c, d] = m;
  if (!isFin(z)) return (c.re === 0 && c.im === 0) ? INF : div(a, c);
  const num = add(mul(a, z), b), den = add(mul(c, z), d);
  return div(num, den);
}
export const matMul = (m, n) => [
  add(mul(m[0], n[0]), mul(m[1], n[2])), add(mul(m[0], n[1]), mul(m[1], n[3])),
  add(mul(m[2], n[0]), mul(m[3], n[2])), add(mul(m[2], n[1]), mul(m[3], n[3])),
];
export const matInv = (m) => [m[3], neg(m[1]), neg(m[2]), m[0]];
export const matDet = (m) => sub(mul(m[0], m[3]), mul(m[1], m[2]));
// 归一化使 ad - bc = 1
export function matNormalize(m) {
  const s = inv(sqrt(matDet(m)));
  return m.map((x) => mul(x, s));
}
