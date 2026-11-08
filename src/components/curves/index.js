// 公共曲线图层：屏幕自适应细分、无界直线/射线裁剪、按视图缓存。
// 参数曲线：{ point(t), t0, t1, options?, style? }；resolve(view) 可提供随视野变化的参数域。
// 圆/圆弧：{ kind:'circle', center, radius, anchor?, arc?:[start,end], style? }
// 直线/射线/线段：{ kind:'line', origin, direction, range?:[min,max], style? }
import { C } from '../../core/complex.js';
import { mapParametricCurve } from '../../core/mapcurve.js';
import { strokePath } from '../../core/draw.js';

const DEFAULTS = { samples: 48, flatness: 0.35, jump: 80, maxDepth: 16 };

function clippedLine(curve, view) {
  const b = view.bounds(), pad = 4 / view.ppu;
  const { origin: p, direction: d, range = [-Infinity, Infinity] } = curve;
  let [lo, hi] = range;
  for (const [position, velocity, min, max] of [[p.re, d.re, b.xmin - pad, b.xmax + pad], [p.im, d.im, b.ymin - pad, b.ymax + pad]]) {
    if (velocity === 0) {
      if (position < min || position > max) return [];
    } else {
      const a = (min - position) / velocity, z = (max - position) / velocity;
      lo = Math.max(lo, Math.min(a, z)); hi = Math.min(hi, Math.max(a, z));
    }
  }
  return lo > hi ? [] : [C(p.re + d.re * lo, p.im + d.im * lo), C(p.re + d.re * hi, p.im + d.im * hi)];
}

function clippedCircle(curve, view, options) {
  const { center: c, radius: r, arc = [0, 2 * Math.PI] } = curve;
  const [start, end] = arc, tau = 2 * Math.PI;
  const b = view.bounds(), pad = 4 / view.ppu;
  const rect = { xmin: b.xmin - pad, xmax: b.xmax + pad, ymin: b.ymin - pad, ymax: b.ymax + pad };
  const cuts = [start, end];
  const cut = (angle) => {
    const t = start + ((angle - start) % tau + tau) % tau;
    if (t > start && t < end) cuts.push(t);
  };
  // 先精确求圆弧与视口边界的交点，再细分可见弧；大圆也不会因参数采样过疏而漏画。
  for (const x of [rect.xmin, rect.xmax]) {
    const u = (x - c.re) / r;
    if (Math.abs(u) <= 1) { const t = Math.acos(u); cut(t); cut(-t); }
  }
  for (const y of [rect.ymin, rect.ymax]) {
    const u = (y - c.im) / r;
    if (Math.abs(u) <= 1) { const t = Math.asin(u); cut(t); cut(Math.PI - t); }
  }
  const anchor = curve.anchor ?? C(c.re + r, c.im);
  const vx = anchor.re - c.re, vy = anchor.im - c.im, phase = Math.atan2(vy, vx);
  const point = (t) => {
    // 相对圆上一点求位置，避免大圆在可见小弧上用中心加半径相减。
    const a = t - phase, re = -2 * Math.sin(a / 2) ** 2, im = Math.sin(a);
    return C(anchor.re + vx * re - vy * im, anchor.im + vx * im + vy * re);
  };
  const ts = [...new Set(cuts)].sort((a, b) => a - b), points = [];
  for (let i = 1; i < ts.length; i++) {
    const mid = point((ts[i - 1] + ts[i]) / 2);
    if (mid.re < rect.xmin || mid.re > rect.xmax || mid.im < rect.ymin || mid.im > rect.ymax) continue;
    points.push(null, ...mapParametricCurve((z) => z, point, ts[i - 1], ts[i], (z) => view.toScreen(z), options));
  }
  return points;
}

export class CurveLayer {
  constructor(options = {}) {
    this.options = { ...DEFAULTS, ...options };
    this.setCurves([]);
  }
  setCurves(curves) {
    this.curves = curves;
    this.cache = new WeakMap();
  }
  draw(ctx, view) {
    const key = `${view.W}:${view.H}:${view.ppu}:${view.center.re}:${view.center.im}`;
    for (const curve of this.curves) {
      let entry = this.cache.get(curve);
      if (entry?.key !== key) {
        const path = curve.resolve ? curve.resolve(view) : curve;
        const options = { ...this.options, ...path.options, W: view.W, H: view.H };
        const points = path.kind === 'line' ? clippedLine(path, view)
          : path.kind === 'circle' ? clippedCircle(path, view, options)
            : mapParametricCurve((z) => z, path.point, path.t0, path.t1, (z) => view.toScreen(z), options);
        entry = { key, points };
        this.cache.set(curve, entry);
      }
      // 自适应采样已用 null 标出极点；裁剪后的长直线应当连续穿过视图。
      strokePath(ctx, view, entry.points, { maxJump: Infinity, ...curve.style });
    }
  }
}
