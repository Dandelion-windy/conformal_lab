// Schwarz–Christoffel 数值积分：f(z) = ∫ ∏(ζ − x_k)^{α_k − 1} dζ（上半平面），或 ∫ (1 − ζⁿ)^{−2/n} dζ（圆盘 → 正 n 边形）
import * as K from '../../core/complex.js';

// 5 点 Gauss–Legendre 节点与权
const GX = [0, -0.5384693101056831, 0.5384693101056831, -0.906179845938664, 0.906179845938664];
const GW = [0.5688888888888889, 0.4786286704993665, 0.4786286704993665, 0.2369268850561891, 0.2369268850561891];

function gauss(g, a, b) {
  const m = K.lerp(a, b, 0.5), hh = K.scale(K.sub(b, a), 0.5);
  let re = 0, im = 0;
  for (let i = 0; i < 5; i++) {
    const v = g(K.add(m, K.scale(hh, GX[i])));
    re += GW[i] * v.re; im += GW[i] * v.im;
  }
  return K.mul(hh, K.C(re, im));
}
// 自适应积分（复直线段 a → b）
export function integrate(g, a, b, tol = 1e-9, depth = 0, whole = null) {
  const I = whole || gauss(g, a, b);
  const m = K.lerp(a, b, 0.5);
  const L = gauss(g, a, m), R = gauss(g, m, b), S = K.add(L, R);
  if (depth > 14 || K.abs(K.sub(S, I)) < tol * Math.max(1, K.abs(S))) return S;
  return K.add(integrate(g, a, m, tol, depth + 1, L), integrate(g, m, b, tol, depth + 1, R));
}
// 实参数积分 ∫_0^1 h(s) ds，h 返回复数
function integrateS(hf, s0 = 0, s1 = 1) {
  return integrate((z) => hf(z.re), K.C(s0), K.C(s1));
}

export class SCMap {
  // xs：前顶点（实数，已排序）；al：对应的内角 / π
  constructor(xs, al) {
    this.xs = xs; this.al = al;
    this.beta = al.map((a) => a - 1);
    // Σ(α_k − 1) + (α∞ − 1) = −2  ⇒  α∞ = −1 − Σβ
    this.alInf = -1 - this.beta.reduce((p, q) => p + q, 0);
    const lo = Math.min(...xs), hi = Math.max(...xs);
    this.c = (lo + hi) / 2; this.L = Math.max(1, (hi - lo) / 2);
    this.zb = K.C(this.c, this.L);
    this.A = K.ONE; this.B = K.ZERO;
  }
  // 第 kk 个因子可直接给出 ζ − x_kk = dz，避免在顶点附近相减失去精度
  g(z, kk = -1, dz = null) {
    let re = 0, im = 0;
    for (let k = 0; k < this.xs.length; k++) {
      const b = this.beta[k];
      if (b === 0) continue;
      const lg = K.log(k === kk ? dz : K.C(z.re - this.xs[k], z.im));
      re += b * lg.re; im += b * lg.im;
    }
    return K.exp(K.C(re, im));
  }
  raw(z) { return integrate((t) => this.g(t), this.zb, z); }
  // 顶点像：端点奇异性用 s^m 代换消去
  vertex(k) {
    const a = this.al[k];
    if (a <= 1e-9) return K.INF;
    const xk = K.C(this.xs[k]), d = K.sub(this.zb, xk), m = Math.max(1, Math.ceil(2 / a));
    const I = integrateS((s) => {
      if (s <= 0) return K.ZERO;
      const dz = K.scale(d, s ** m);
      return K.mul(this.g(K.add(xk, dz), k, dz), K.scale(d, m * s ** (m - 1)));
    });
    return K.neg(I);
  }
  vertexInf() {
    const a = this.alInf;
    if (a <= 1e-9) return K.INF;
    const m = Math.max(1, Math.ceil(2 / a)), L = this.L;
    const I = integrateS((s) => {
      if (s <= 0) return K.ZERO;
      const z = K.add(this.zb, K.C(0, (s ** -m - 1) * L));
      return K.mul(this.g(z), K.C(0, -L * m * s ** (-m - 1)));
    });
    return K.neg(I);
  }
  // 归一化：第一条有限边水平，图形尺寸约为 2，中心在原点
  normalize() {
    const V = this.al.map((_, k) => this.vertex(k)).concat(this.alInf > 1e-9 && Math.abs(this.alInf - 1) > 1e-9 ? [this.vertexInf()] : []).filter(K.isFin);
    this.A = K.ONE; this.B = K.ZERO;
    if (V.length >= 2) {
      const d = K.sub(V[1], V[0]);
      let mx = 0;
      for (const p of V) for (const q of V) mx = Math.max(mx, K.abs(K.sub(p, q)));
      this.A = K.scale(K.cis(-K.arg(d)), 2.4 / mx);
      const ctr = V.reduce((p, q) => K.add(p, q), K.ZERO);
      this.B = K.neg(K.mul(this.A, K.scale(ctr, 1 / V.length)));
    } else if (V.length === 1) {
      this.A = K.C(1 / this.L); this.B = K.neg(K.mul(this.A, V[0]));
    } else {
      this.A = K.C(1 / this.L);
    }
  }
  apply(w) { return K.isFin(w) ? K.add(K.mul(this.A, w), this.B) : w; }
  // 网格：列 x_i、行 y_j；先沿基准列积分，再沿行逐段积分
  grid(X, Y) {
    const nu = X.length - 1, nv = Y.length - 1, N = (nu + 1) * (nv + 1);
    const out = new Array(N);
    let i0 = 0; for (let i = 1; i <= nu; i++) if (Math.abs(X[i] - this.c) < Math.abs(X[i0] - this.c)) i0 = i;
    const gf = (t) => this.g(t);
    for (let j = 0; j <= nv; j++) {
      const z0 = K.C(X[i0], Y[j]);
      const f0 = integrate(gf, this.zb, z0, 1e-8);
      out[j * (nu + 1) + i0] = f0;
      let f = f0;
      for (let i = i0 + 1; i <= nu; i++) { f = K.add(f, integrate(gf, K.C(X[i - 1], Y[j]), K.C(X[i], Y[j]), 1e-8)); out[j * (nu + 1) + i] = f; }
      f = f0;
      for (let i = i0 - 1; i >= 0; i--) { f = K.add(f, integrate(gf, K.C(X[i + 1], Y[j]), K.C(X[i], Y[j]), 1e-8)); out[j * (nu + 1) + i] = f; }
    }
    return out.map((w) => this.apply(w));
  }
}

// 圆盘 → 正 n 边形：f(z) = ∫_0^z (1 − ζⁿ)^{−2/n} dζ，沿射线累积积分
export function diskNgon(n, R, T) {
  const nr = R.length - 1, nt = T.length - 1, out = new Array((nr + 1) * (nt + 1));
  const g = (z) => K.pow(K.sub(K.ONE, K.powi(z, n)), K.C(-2 / n));
  for (let j = 0; j <= nt; j++) {
    let f = K.ZERO;
    out[j * (nr + 1)] = f;
    for (let i = 1; i <= nr; i++) {
      f = K.add(f, integrate(g, K.polar(R[i - 1], T[j]), K.polar(R[i], T[j]), 1e-8));
      out[j * (nr + 1) + i] = f;
    }
  }
  // 顶点：f(1) = ∫_0^1 (1 − tⁿ)^{−2/n} dt，用 t = 1 − s^m 代换
  const m = Math.ceil(2 / (1 - 2 / n)) + 1;
  const v1 = integrate((z) => {
    const s = z.re; if (s <= 0) return K.ZERO;
    // 1 − tⁿ，t = 1 − q：用 expm1/log1p 避免 q 很小时的抵消
    const q = s ** m, one = -Math.expm1(n * Math.log1p(-q));
    return K.C(one ** (-2 / n) * m * s ** (m - 1));
  }, K.ZERO, K.ONE, 1e-10);
  const verts = Array.from({ length: n }, (_, k) => K.mul(v1, K.cis((2 * Math.PI * k) / n)));
  return { pos: out, verts };
}
