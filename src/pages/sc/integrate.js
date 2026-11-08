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
  if (a.re === b.re && a.im === b.im) return K.ZERO;
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
    this.vertices = new Map();
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
  // Cayley 坐标 p=(z-zb)/(z-conj(zb)) 中的导数。
  // 预先合并常数和无穷远因子；采样时只计算单位圆盘内的线性因子，
  // 不再反复构造巨大 z、查找最近顶点或从基点重新积分。
  diskDerivative() {
    const base = K.log(K.mul(this.A, K.C(0, 2 * this.L)));
    const factors = [];
    for (let k = 0; k < this.xs.length; k++) {
      const beta = this.beta[k];
      if (beta === 0) continue;
      const d = K.C(this.c - this.xs[k], this.L), l = K.log(d);
      base.re += beta * l.re; base.im += beta * l.im;
      const root = K.div(K.C(this.xs[k] - this.c, -this.L), K.C(this.xs[k] - this.c, this.L));
      factors.push({ re: root.re, im: root.im, beta });
    }
    if (this.alInf !== 1) factors.push({ re: 1, im: 0, beta: this.alInf - 1 });
    return (p) => {
      let re = base.re, im = base.im;
      for (const f of factors) {
        const x = 1 - f.re * p.re - f.im * p.im, y = f.im * p.re - f.re * p.im;
        re += 0.5 * f.beta * Math.log(x * x + y * y);
        im += f.beta * Math.atan2(y, x);
      }
      const r = Math.exp(re);
      return K.C(r * Math.cos(im), r * Math.sin(im));
    };
  }
  // 从最近的有限顶点消去端点奇异性；其余路径以对数距离积分，覆盖到无穷远附近。
  raw(z) {
    let k = 0;
    for (let j = 1; j < this.xs.length; j++) if (K.dist(z, K.C(this.xs[j])) < K.dist(z, K.C(this.xs[k]))) k = j;
    const distance = K.dist(z, K.C(this.xs[k]));
    if (distance === 0) return this.vertex(k);
    if (this.al[k] > 0 && distance < 2 * this.L) return K.add(this.vertex(k), this.fromVertex(k, z));
    const mid = K.lerp(this.zb, z, 0.5);
    const leg = (a, b, h) => {
      const d = K.sub(b, a), range = Math.log1p(K.abs(d) / h), den = Math.expm1(range);
      if (den === 0) return K.ZERO;
      return integrateS((t) => K.mul(this.g(K.add(a, K.scale(d, Math.expm1(range * t) / den))), K.scale(d, range * Math.exp(range * t) / den)));
    };
    return K.sub(leg(this.zb, mid, this.L), leg(z, mid, Math.min(this.L, distance)));
  }
  evaluate(z) { return this.apply(this.raw(z)); }
  fromVertex(k, z) {
    const d = K.sub(z, K.C(this.xs[k])), m = Math.max(1, Math.ceil(2 / this.al[k]));
    const ld = K.log(d);
    return integrateS((t) => {
      const lt = Math.log(t), dz = K.scale(d, t ** m), at = K.add(K.C(this.xs[k]), dz);
      // 合并奇异因子与雅可比的对数，避免小内角时出现 0·∞。
      let re = this.al[k] * ld.re + Math.log(m) + (m * this.al[k] - 1) * lt;
      let im = this.al[k] * ld.im;
      for (let j = 0; j < this.xs.length; j++) if (j !== k && this.beta[j] !== 0) {
        const l = K.log(K.C(at.re - this.xs[j], at.im));
        re += this.beta[j] * l.re; im += this.beta[j] * l.im;
      }
      return K.exp(K.C(re, im));
    });
  }
  // 顶点像：端点奇异性用 s^m 代换消去
  vertex(k) {
    const a = this.al[k];
    if (a <= 1e-9) return K.INF;
    if (!this.vertices.has(k)) this.vertices.set(k, K.neg(this.fromVertex(k, this.zb)));
    return this.vertices.get(k);
  }

  vertexInf() {
    const a = this.alInf;
    if (a <= 1e-9) return K.INF;
    if (this.vertices.has(Infinity)) return this.vertices.get(Infinity);
    const m = Math.max(1, Math.ceil(2 / a)), L = this.L;
    const I = integrateS((s) => {
      if (s <= 0) return K.ZERO;
      const z = K.add(this.zb, K.C(0, (s ** -m - 1) * L));
      return K.mul(this.g(z), K.C(0, -L * m * s ** (-m - 1)));
    });
    const value = K.neg(I);
    this.vertices.set(Infinity, value);
    return value;
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
}

// 圆盘 → 正 n 边形：f(z) = ∫_0^z (1 − ζⁿ)^{−2/n} dζ，沿射线累积积分
export function diskNgon(n) {
  const g = (z) => K.pow(K.sub(K.ONE, K.powi(z, n)), K.C(-2 / n));
  // 顶点：f(1) = ∫_0^1 (1 − tⁿ)^{−2/n} dt，用 t = 1 − s^m 代换
  const m = Math.ceil(2 / (1 - 2 / n)) + 1;
  const v1 = integrate((z) => {
    const s = z.re; if (s <= 0) return K.ZERO;
    // 1 − tⁿ，t = 1 − q：用 expm1/log1p 避免 q 很小时的抵消
    const q = s ** m, one = -Math.expm1(n * Math.log1p(-q));
    return K.C(one ** (-2 / n) * m * s ** (m - 1));
  }, K.ZERO, K.ONE, 1e-10);
  const verts = Array.from({ length: n }, (_, k) => K.mul(v1, K.cis((2 * Math.PI * k) / n)));
  const scale = 1.6 / K.abs(v1);
  const vertices = verts.map((v) => K.scale(v, scale));
  return {
    verts: vertices,
    derivative: (z) => K.scale(g(z), scale),
    evaluate: (z) => {
      for (let k = 0; k < n; k++) if (K.dist(z, K.cis(2 * Math.PI * k / n)) < 1e-14) return vertices[k];
      // zt = z(1-(1-t)^m) 在圆盘边界消去代数端点奇异性。
      const m = Math.ceil(2 / (1 - 2 / n)) + 1;
      return K.scale(integrateS((t) => {
        const q = 1 - t;
        return K.mul(g(K.scale(z, 1 - q ** m)), K.scale(z, m * q ** (m - 1)));
      }), scale);
    },
  };
}
