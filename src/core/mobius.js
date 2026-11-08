// 分式线性变换工具：三点确定、不动点、分类、TeX 公式
import * as K from './complex.js';
import { texCoef, texCx } from './format.js';

const fin = K.isFin;
// 把 z1→0, z2→1, z3→∞ 的矩阵（允许某个点为 ∞）
export function toStd(z1, z2, z3) {
  const { sub, neg, C } = K;
  if (!fin(z1)) return [C(0), sub(z2, z3), C(1), neg(z3)];
  if (!fin(z2)) return [C(1), neg(z1), C(1), neg(z3)];
  if (!fin(z3)) return [C(1), neg(z1), C(0), sub(z2, z1)];
  const a = sub(z2, z3), c = sub(z2, z1);
  return [a, K.mul(neg(z1), a), c, K.mul(neg(z3), c)];
}
// 唯一的 M 使 M(zk) = wk
export function from3(zs, ws) {
  return K.matNormalize(K.matMul(K.matInv(toStd(...ws)), toStd(...zs)));
}
// 交比 (z, z1, z2, z3) = ((z−z1)(z2−z3)) / ((z−z3)(z2−z1))
export const crossRatio = (z, z1, z2, z3) => K.mobius(toStd(z1, z2, z3), z);

export function fixedPoints(m) {
  const [a, b, c, d] = m;
  const eps = 1e-12;
  if (K.abs(c) < eps) {
    // 仿射：az + b 型（d 归一）
    const am = K.sub(a, d);
    return K.abs(am) < eps ? [K.INF] : [K.div(b, K.neg(am)), K.INF];
  }
  // c z² + (d − a) z − b = 0
  const B = K.sub(d, a), disc = K.add(K.mul(B, B), K.scale(K.mul(c, b), 4));
  const s = K.sqrt(disc), c2 = K.scale(c, 2);
  const p = K.div(K.add(K.neg(B), s), c2), q = K.div(K.sub(K.neg(B), s), c2);
  return K.abs(s) < 1e-9 ? [p] : [p, q];
}

// 按 tr² / det 分类
export function classify(m) {
  const tr = K.add(m[0], m[3]), det = K.matDet(m);
  const t2 = K.div(K.mul(tr, tr), det);
  const eps = 1e-7;
  if (K.abs(K.sub(K.mul(m[0], K.C(1)), m[3])) < eps && K.abs(m[1]) < eps && K.abs(m[2]) < eps) return { type: 'identity', name: '恒等变换', t2 };
  if (Math.abs(t2.im) > eps) return { type: 'loxodromic', name: '斜驶型（loxodromic）', t2 };
  if (Math.abs(t2.re - 4) < 1e-6) return { type: 'parabolic', name: '抛物型（parabolic）', t2 };
  if (t2.re >= 0 && t2.re < 4) return { type: 'elliptic', name: '椭圆型（elliptic）', t2 };
  if (t2.re > 4) return { type: 'hyperbolic', name: '双曲型（hyperbolic）', t2 };
  return { type: 'loxodromic', name: '斜驶型（loxodromic）', t2 };
}

// 单参数子群 T_t（T_0 = 恒等，T_1 = M），用于动画与动力学：
// 两个不动点 p, q 时共轭为 ζ ↦ k^t ζ；一个不动点（抛物型）时 M^t = I + tN
export function mobiusFlow(m) {
  const M = K.matNormalize(m);
  const tr = K.add(M[0], M[3]);
  const disc = K.sub(K.mul(tr, tr), K.C(4));
  if (K.abs(disc) < 1e-9) {
    const s = tr.re >= 0 ? 1 : -1;
    const N = [K.sub(K.scale(M[0], s), K.ONE), K.scale(M[1], s), K.scale(M[2], s), K.sub(K.scale(M[3], s), K.ONE)];
    return (t) => [K.add(K.ONE, K.scale(N[0], t)), K.scale(N[1], t), K.scale(N[2], t), K.add(K.ONE, K.scale(N[3], t))];
  }
  const [p, q] = fixedPoints(M);
  const S = !K.isFin(q) ? [K.ONE, K.neg(p), K.ZERO, K.ONE] : !K.isFin(p) ? [K.ZERO, K.ONE, K.ONE, K.neg(q)] : [K.ONE, K.neg(p), K.ONE, K.neg(q)];
  const Si = K.matInv(S);
  const zs = K.mobius(Si, K.ONE);
  const k = K.mobius(S, K.mobius(M, zs));
  const lk = K.log(k);
  return (t) => K.matMul(Si, K.matMul([K.exp(K.scale(lk, t)), K.ZERO, K.ZERO, K.ONE], S));
}

// 把矩阵写成 TeX："\frac{az+b}{cz+d}"，尽量去掉 0/1 系数
export function mobiusTex(m, v = 'z', d = 3) {
  const eps = Math.min(1e-9, 0.5 * 10 ** -d);
  // 归一：让第一个非零系数（c 或 d 优先）为正实数便于阅读
  let [a, b, c, dd] = m;
  const piv = K.abs(c) > eps ? c : dd;
  const s = K.div(K.C(1), piv);
  [a, b, c, dd] = [a, b, c, dd].map((x) => K.mul(x, s));
  const lin = (p, q) => {
    const pz = K.abs(p) < eps, qz = K.abs(q) < eps;
    if (pz && qz) return '0';
    let s1 = '';
    if (!pz) { const t = texCoef(p, d); s1 = t === '1' ? v : t === '-1' ? `-${v}` : `${t}${v}`; }
    if (qz) return s1;
    const tq = texCx(q, d);
    if (!s1) return tq;
    return `${s1} ${tq.startsWith('-') ? '' : '+ '}${tq}`;
  };
  const num = lin(a, b), den = lin(c, dd);
  return den === '1' ? num : `\\dfrac{${num}}{${den}}`;
}
