// 在共轭坐标中直接计算流，避免逐个采样点重建 T_t 矩阵。
// 圆/直线用完整几何表示；螺线尾部按屏幕精度收敛到不动点。
import * as K from '../../core/complex.js';

const TAU = 2 * Math.PI;
const positiveAngle = (t) => (t % TAU + TAU) % TAU;


export function createFlow({ inverse, p, q, rate, beta, parabolic }) {
  // 齐次坐标 ζ=n/d：ζ=∞ 也直接计算，不先除出巨大复数。
  const project = (n, d) => K.div(K.add(K.mul(inverse[0], n), K.mul(inverse[1], d)),
    K.add(K.mul(inverse[2], n), K.mul(inverse[3], d)));
  const logarithmicPoint = (u, phase) => u >= 0
    ? project(K.ONE, K.polar(Math.exp(-u), -phase))
    : project(K.polar(Math.exp(u), phase), K.ONE);
  const stationary = (seed) => parabolic ? K.abs(beta) === 0 || !K.isFin(seed)
    : !K.isFin(seed) || K.abs(seed) === 0 || rate.re === 0 && rate.im === 0;

  function at(seed, t) {
    if (stationary(seed)) return K.mobius(inverse, seed);
    if (parabolic) return project(K.add(seed, K.scale(beta, t)), K.ONE);
    return logarithmicPoint(Math.log(K.abs(seed)) + rate.re * t, K.arg(seed) + rate.im * t);
  }
  function curves(seed) {
    if (stationary(seed)) return [];
    if (parabolic) {
      const normal = K.mul(K.I, beta), offset = normal.re * seed.re + normal.im * seed.im;
      if (offset === 0) return [{ kind: 'line', origin: p, direction: K.conj(beta) }];
      return [{ kind: 'circle', center: K.add(p, K.scale(K.conj(normal), 1 / (2 * offset))),
        radius: K.abs(beta) / (2 * Math.abs(offset)), anchor: p }];
    }
    const direction = K.sub(q, p), distance = K.abs(direction);
    if (rate.re === 0) {
      const r = K.abs(seed), coefficient = 1 - r * r;
      if (coefficient === 0) return [{ kind: 'line', origin: K.lerp(p, q, 0.5), direction: K.mul(direction, K.I) }];
      return [{ kind: 'circle', center: K.add(q, K.scale(K.sub(p, q), 1 / coefficient)),
        radius: distance * r / Math.abs(coefficient), anchor: K.scale(K.add(p, K.scale(q, r)), 1 / (1 + r)) }];
    }
    if (rate.im === 0) {
      // 等辐角线的两支分别是同一广义圆上的两段，保留经过初始点的那一支。
      if (seed.im === 0) return seed.re < 0
        ? [{ kind: 'line', origin: p, direction, range: [0, 1] }]
        : [{ kind: 'line', origin: p, direction: K.neg(direction), range: [0, Infinity] },
          { kind: 'line', origin: q, direction, range: [0, Infinity] }];
      const center = K.sub(K.lerp(p, q, 0.5), K.scale(K.mul(direction, K.I), seed.re / (2 * seed.im)));
      const radius = distance * K.abs(seed) / (2 * Math.abs(seed.im));
      const start = K.arg(K.sub(p, center)), span = positiveAngle(K.arg(K.sub(q, center)) - start);
      const mid = project(seed, K.ONE), inside = positiveAngle(K.arg(K.sub(mid, center)) - start) <= span;
      return [{ kind: 'circle', center, radius, anchor: p, arc: inside ? [start, start + span] : [start + span, start + TAU] }];
    }
    const logRadius = Math.log(K.abs(seed)), phase = K.arg(seed), slope = rate.im / rate.re;
    return [{ resolve: (view) => {
      // |z-p| ≤ |p-q|r/(1-r)，|z-q| ≤ |p-q|/(r-1)。
      // 尾部误差小于 0.2 像素，缩放后重新确定范围，不固定截断时间。
      const limit = Math.log1p(K.dist(p, q) * view.ppu / 0.2);
      const samples = Math.min(2048, Math.max(48, Math.ceil(2 * limit * Math.abs(slope) / (Math.PI / 3))));
      return { t0: -limit, t1: limit, options: { samples, knots: [0, logRadius] },
        point: (u) => u === -limit ? p : u === limit ? q : logarithmicPoint(u, phase + (u - logRadius) * slope) };
    } }];
  }
  function seeds() {
    if (parabolic) {
      if (K.abs(beta) === 0) return [];
      const normal = K.mul(K.I, K.scale(beta, 1 / K.abs(beta)));
      return Array.from({ length: 13 }, (_, i) => K.scale(normal, (i - 6) * 0.35));
    }
    return rate.re === 0 ? Array.from({ length: 11 }, (_, i) => K.C(2 ** ((i - 5) / 2)))
      : Array.from({ length: 12 }, (_, i) => i % 3 === 0 ? [K.ONE, K.I, K.neg(K.ONE), K.neg(K.I)][i / 3] : K.cis(i * Math.PI / 6));
  }
  return { at, curves, seeds };
}
