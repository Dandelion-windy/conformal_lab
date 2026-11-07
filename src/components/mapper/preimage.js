// 求 w 在当前 z 视图内的全部原像：采样网格 → 找包含 w 的像三角形 → 牛顿迭代精化
import { C, sub, div, abs, isFin, deriv } from '../../core/complex.js';

export class PreimageFinder {
  constructor(nx = 90, ny = 70) { this.nx = nx; this.ny = ny; this.key = null; }
  prepare(f, view, key) {
    if (key === this.key) return;
    this.key = key;
    const b = view.bounds(), { nx, ny } = this;
    this.z = []; this.w = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const z = C(b.xmin + ((b.xmax - b.xmin) * i) / nx, b.ymin + ((b.ymax - b.ymin) * j) / ny);
      this.z.push(z); this.w.push(f(z));
    }
    this.f = f;
    this.tol = (b.xmax - b.xmin) / nx;
  }
  find(w, holo = true) {
    const { nx, ny, z: Z, w: Wv, f } = this;
    const res = [];
    const id = (i, j) => j * (nx + 1) + i;
    const tryTri = (a, b, c) => {
      const A = Wv[a], B = Wv[b], Cc = Wv[c];
      if (!isFin(A) || !isFin(B) || !isFin(Cc)) return;
      const d = (B.im - Cc.im) * (A.re - Cc.re) + (Cc.re - B.re) * (A.im - Cc.im);
      if (Math.abs(d) < 1e-300) return;
      const l1 = ((B.im - Cc.im) * (w.re - Cc.re) + (Cc.re - B.re) * (w.im - Cc.im)) / d;
      const l2 = ((Cc.im - A.im) * (w.re - Cc.re) + (A.re - Cc.re) * (w.im - Cc.im)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) return;
      let z = C(l1 * Z[a].re + l2 * Z[b].re + l3 * Z[c].re, l1 * Z[a].im + l2 * Z[b].im + l3 * Z[c].im);
      if (holo) {
        for (let k = 0; k < 6; k++) {
          const dz = div(sub(f(z), w), deriv(f, z));
          if (!isFin(dz)) break;
          z = sub(z, dz);
          if (abs(dz) < 1e-12) break;
        }
      }
      const err = abs(sub(f(z), w));
      if (!(err < 1e-3 * Math.max(1, abs(w))) && holo) return;
      if (res.every((q) => abs(sub(q, z)) > this.tol * 0.5)) res.push(z);
    };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      tryTri(a, b, c); tryTri(a, c, d);
      if (res.length > 40) return res;
    }
    return res;
  }
}
