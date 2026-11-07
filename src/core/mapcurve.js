// 曲线的像：自适应细分，使像曲线在屏幕上光滑；在极点/割线处自动断开（输出 null 表示断点）
import { lerp, isFin } from './complex.js';

// proj: w → [x, y]（屏幕坐标）或 null；W/H 用于跳过远在屏幕外的线段
export function mapCurve(f, zs, proj, { tol = 2.5, jump = 60, maxDepth = 10, W = 1e4, H = 1e4, budget = 30000 } = {}) {
  const out = [];
  let count = 0;
  const M = 200;
  const off = (s0, s1) => (s0[0] < -M && s1[0] < -M) || (s0[0] > W + M && s1[0] > W + M) ||
    (s0[1] < -M && s1[1] < -M) || (s0[1] > H + M && s1[1] > H + M);
  function rec(z0, w0, s0, z1, w1, s1, depth) {
    if (s0 && s1) {
      const d = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]);
      if (d < tol || off(s0, s1) && depth > 3) { out.push(w1); return; }
      if (depth >= maxDepth || count > budget) {
        if (d > jump) out.push(null);
        out.push(w1);
        return;
      }
    } else if (depth >= maxDepth || count > budget) {
      out.push(null);
      if (s1) out.push(w1);
      return;
    }
    const zm = lerp(z0, z1, 0.5), wm = f(zm), sm = isFin(wm) ? proj(wm) : null;
    count++;
    rec(z0, w0, s0, zm, wm, sm, depth + 1);
    rec(zm, wm, sm, z1, w1, s1, depth + 1);
  }
  let z0 = null, w0 = null, s0 = null;
  for (let i = 0; i < zs.length; i++) {
    const z1 = zs[i];
    if (!z1) { out.push(null); z0 = null; continue; }
    const w1 = f(z1), s1 = isFin(w1) ? proj(w1) : null;
    if (!z0) out.push(s1 ? w1 : null);
    else rec(z0, w0, s0, z1, w1, s1, 0);
    z0 = z1; w0 = w1; s0 = s1;
  }
  return out;
}

// 采样工具
export function segment(a, b, n = 48) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(lerp(a, b, i / n));
  return pts;
}
export function circlePts(c, r, n = 96, t0 = 0, t1 = 2 * Math.PI) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    pts.push({ re: c.re + r * Math.cos(t), im: c.im + r * Math.sin(t) });
  }
  return pts;
}
export const planeProj = (view) => (w) => view.toScreen(w);
