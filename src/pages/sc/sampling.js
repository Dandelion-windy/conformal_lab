// 全纯原函数的增量采样：相邻采样点之间只积分一次。
// 自适应细分新增中点时，从已有邻点继续积分；精确顶点值直接作为端点。
import * as K from '../../core/complex.js';
import { integrate } from './integrate.js';

export class IntegralPath {
  constructor({ point, derivative, valueAt, known, t0, t1, samples, tolerance, anchor = Math.floor(samples / 2) }) {
    this.point = point;
    this.derivative = derivative;
    this.known = known;
    this.tolerance = tolerance;
    this.ts = Array.from({ length: samples + 1 }, (_, i) => t0 + (t1 - t0) * i / samples);
    this.points = this.ts.map(point);
    this.values = new Array(samples + 1);
    this.values[anchor] = valueAt(this.ts[anchor]);
    for (let i = anchor + 1; i <= samples; i++) this.values[i] = this.extend(this.points[i - 1], this.values[i - 1], this.points[i]);
    for (let i = anchor - 1; i >= 0; i--) this.values[i] = this.extend(this.points[i + 1], this.values[i + 1], this.points[i]);
  }
  extend(a, value, b) {
    const fixed = this.known(b);
    return fixed === undefined ? K.add(value, integrate(this.derivative, a, b, this.tolerance)) : fixed;
  }
  at(t) {
    let lo = 0, hi = this.ts.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.ts[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    if (this.ts[lo] === t) return this.values[lo];
    const p = this.point(t), left = lo - 1, right = lo;
    const from = K.isFin(this.values[left]) && (!K.isFin(this.values[right]) || K.dist(p, this.points[left]) <= K.dist(p, this.points[right])) ? left : right;
    const value = this.extend(this.points[from], this.values[from], p);
    this.ts.splice(lo, 0, t); this.points.splice(lo, 0, p); this.values.splice(lo, 0, value);
    return value;
  }
}
