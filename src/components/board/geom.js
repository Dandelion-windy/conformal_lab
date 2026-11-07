// 几何画板的图形计算。图形 g 的形式：
//   { t: 'pt', z }
//   { t: 'line' | 'ray' | 'seg', a, b }   点 a + s(b − a)，s ∈ ℝ / [0, ∞) / [0, 1]
//   { t: 'circle', c, r }                  c + r·e^{iθ}
//   { t: 'arc', c, r, a0, da }             θ = a0 + u·da，u ∈ [0, 1]，da 带符号（> 0 为逆时针）
//   { t: 'path', parts, closed }           由线段、射线、圆弧组成（多边形、折线、经过 ∞ 的广义圆弧）
//   { t: 'free', pts }                     手绘折线，null 表示断开
// 曲线上的点用参数 p 表示：直线类为 s，圆为 θ，圆弧为 u，路径为 { i, t }，手绘曲线为分数下标
import { C, add, sub, scale, mul, div, conj, abs, abs2, dist, isFin, INF, cis, arg, lerp } from '../../core/complex.js';
import { segment, circlePts } from '../../core/mapcurve.js';

export const TAU = 2 * Math.PI;
export const cross = (a, b) => a.re * b.im - a.im * b.re;
export const dot = (a, b) => a.re * b.re + a.im * b.im;
export const perp = (v) => C(-v.im, v.re);
const mod = (a) => ((a % TAU) + TAU) % TAU;
const same = (a, b) => dist(a, b) <= 1e-12 * Math.max(1, abs(a), abs(b));

export const isPt = (g) => g?.t === 'pt';
export const isLinear = (g) => g?.t === 'line' || g?.t === 'ray' || g?.t === 'seg';
export const isRound = (g) => g?.t === 'circle' || g?.t === 'arc';
export const isCurve = (g) => !!g && g.t !== 'pt';

export const pt = (z) => (z && isFin(z) ? { t: 'pt', z } : null);
export const lin = (t, a, b) => (a && b && isFin(a) && isFin(b) && !same(a, b) ? { t, a, b } : null);
export const circle = (c, r) => (c && isFin(c) && Number.isFinite(r) && r > 1e-12 ? { t: 'circle', c, r } : null);
export const dir = (g) => { const v = sub(g.b, g.a); return scale(v, 1 / abs(v)); };
export const arcEnds = (g) => [add(g.c, scale(cis(g.a0), g.r)), add(g.c, scale(cis(g.a0 + g.da), g.r))];

// 圆心为 c、从 A 逆时针转到射线 cB 的圆弧
export function arcCenter(c, A, B) {
  const r = dist(c, A);
  if (!(r > 1e-12) || same(c, B)) return null;
  const a0 = arg(sub(A, c));
  const da = mod(arg(sub(B, c)) - a0) || TAU;
  return { t: 'arc', c, r, a0, da };
}

// 曲线上参数 p 处的点
export function at(g, p) {
  switch (g.t) {
    case 'pt': return g.z;
    case 'line': case 'ray': case 'seg': return add(g.a, scale(sub(g.b, g.a), p));
    case 'circle': return add(g.c, scale(cis(p), g.r));
    case 'arc': return add(g.c, scale(cis(g.a0 + p * g.da), g.r));
    case 'path': { const q = g.parts[p?.i]; return q ? at(q, p.t) : null; }
    case 'free': {
      const P = g.pts, i = Math.max(0, Math.min(P.length - 1, Math.floor(p))), a = P[i], b = P[i + 1];
      return a && b ? lerp(a, b, p - i) : a || null;
    }
  }
  return null;
}

// 曲线上离 z 最近的点：{ q, p, d }
export function nearest(g, z) {
  switch (g.t) {
    case 'pt': return { q: g.z, p: 0, d: dist(g.z, z) };
    case 'line': case 'ray': case 'seg': {
      const v = sub(g.b, g.a);
      let s = dot(sub(z, g.a), v) / abs2(v);
      if (g.t !== 'line') s = Math.max(0, s);
      if (g.t === 'seg') s = Math.min(1, s);
      const q = add(g.a, scale(v, s));
      return { q, p: s, d: dist(q, z) };
    }
    case 'circle': {
      const th = same(z, g.c) ? 0 : arg(sub(z, g.c)), q = at(g, th);
      return { q, p: th, d: dist(q, z) };
    }
    case 'arc': {
      const th = arg(sub(z, g.c)), A = Math.abs(g.da);
      const rel = g.da > 0 ? mod(th - g.a0) : mod(g.a0 - th);
      let u;
      if (rel <= A) u = rel / A;
      else { const [e0, e1] = arcEnds(g); u = dist(z, e0) <= dist(z, e1) ? 0 : 1; }
      const q = at(g, u);
      return { q, p: u, d: dist(q, z) };
    }
    case 'path': {
      let best = null;
      g.parts.forEach((part, i) => { const r = nearest(part, z); if (!best || r.d < best.d) best = { q: r.q, p: { i, t: r.p }, d: r.d }; });
      return best;
    }
    case 'free': {
      let best = null;
      const P = g.pts;
      for (let i = 0; i + 1 < P.length; i++) {
        if (!P[i] || !P[i + 1]) continue;
        const r = nearest({ t: 'seg', a: P[i], b: P[i + 1] }, z);
        if (!best || r.d < best.d) best = { q: r.q, p: i + r.p, d: r.d };
      }
      if (!best && P[0]) best = { q: P[0], p: 0, d: dist(P[0], z) };
      return best;
    }
  }
  return null;
}

// ---------------- 交点 ----------------
// 返回固定长度的槽位数组（不存在的交点为 null），使“第 k 个交点”在图形连续变动时保持稳定
const inLin = (g, s) => g.t === 'line' || (s >= -1e-9 && (g.t === 'ray' || s <= 1 + 1e-9));
function onRound(g, z) {
  if (g.t === 'circle') return true;
  const th = arg(sub(z, g.c)), rel = g.da > 0 ? mod(th - g.a0) : mod(g.a0 - th);
  return rel <= Math.abs(g.da) + 1e-9 || rel >= TAU - 1e-9;
}
function llx(P, Q) {
  const d1 = sub(P.b, P.a), d2 = sub(Q.b, Q.a), den = cross(d1, d2);
  if (Math.abs(den) <= 1e-12 * abs(d1) * abs(d2)) return [null];
  const w = sub(Q.a, P.a), s = cross(w, d2) / den, t = cross(w, d1) / den;
  return [inLin(P, s) && inLin(Q, t) ? add(P.a, scale(d1, s)) : null];
}
function lcx(L, R) {
  const d = sub(L.b, L.a), f = sub(L.a, R.c);
  const A = abs2(d), B = dot(f, d), Cc = abs2(f) - R.r * R.r;
  const D = B * B - A * Cc;
  if (D < -1e-12 * Math.max(B * B, A * R.r * R.r)) return [null, null];
  const q = Math.sqrt(Math.max(0, D));
  return [(-B - q) / A, (-B + q) / A].map((s) => { const z = add(L.a, scale(d, s)); return inLin(L, s) && onRound(R, z) ? z : null; });
}
function ccx(P, Q) {
  const v = sub(Q.c, P.c), d = abs(v);
  if (d <= 1e-12 * Math.max(P.r, Q.r)) return [null, null];
  const a = (P.r * P.r - Q.r * Q.r + d * d) / (2 * d), h2 = P.r * P.r - a * a;
  if (h2 < -1e-12 * P.r * P.r) return [null, null];
  const h = Math.sqrt(Math.max(0, h2)), u = scale(v, 1 / d), base = add(P.c, scale(u, a)), n = scale(perp(u), h);
  return [add(base, n), sub(base, n)].map((z) => (onRound(P, z) && onRound(Q, z) ? z : null));
}
// 把图形拆成基本图元（线段、射线、直线、圆、圆弧）
export function prims(g) {
  if (!g) return [];
  if (g.t === 'path') return g.parts.flatMap(prims);
  if (g.t === 'free') {
    const out = [];
    for (let i = 0; i + 1 < g.pts.length; i++) if (g.pts[i] && g.pts[i + 1]) out.push({ t: 'seg', a: g.pts[i], b: g.pts[i + 1] });
    return out;
  }
  return isLinear(g) || isRound(g) ? [g] : [];
}
export function intersect(g1, g2) {
  const out = [];
  for (const a of prims(g1)) for (const b of prims(g2)) {
    if (isLinear(a) && isLinear(b)) out.push(...llx(a, b));
    else if (isLinear(a)) out.push(...lcx(a, b));
    else if (isLinear(b)) out.push(...lcx(b, a));
    else out.push(...ccx(a, b));
  }
  return out;
}

// ---------------- 广义圆与对称 ----------------
// 过三点的广义圆（某点为 ∞ 或三点共线时为直线）
export function gcircle3(A, B, Cc) {
  const fin = [A, B, Cc].filter((z) => z && isFin(z));
  if (fin.length < 2) return null;
  if (fin.length === 2) return lin('line', fin[0], fin[1]);
  const b = sub(B, A), c = sub(Cc, A), sc = abs(b) * abs(c);
  if (!(sc > 0) || same(B, Cc)) return null;
  const D = 2 * cross(b, c);
  if (Math.abs(D) <= 2e-9 * sc) {
    const pairs = [[A, B], [A, Cc], [B, Cc]].sort((p, q) => dist(q[0], q[1]) - dist(p[0], p[1]));
    return lin('line', pairs[0][0], pairs[0][1]);
  }
  const b2 = abs2(b), c2 = abs2(c);
  const u = C((c.im * b2 - b.im * c2) / D, (b.re * c2 - c.re * b2) / D);
  return circle(add(A, u), abs(u));
}
const twoRays = (A, Cc) => {
  const v = sub(A, Cc), r1 = lin('ray', A, add(A, v)), r2 = lin('ray', Cc, sub(Cc, v));
  return r1 && r2 ? { t: 'path', parts: [r1, r2], closed: false } : null;
};
// 从 A 经 B 到 C 的广义圆弧：三点共线时为线段，或经过 ∞ 的两条射线；含 ∞ 的端点给出射线
export function garc3(A, B, Cc) {
  if (!A || !B || !Cc) return null;
  const fa = isFin(A), fb = isFin(B), fc = isFin(Cc);
  if (!fb) return fa && fc ? twoRays(A, Cc) : null;
  if (!fa) return fc ? lin('ray', Cc, B) : null;
  if (!fc) return lin('ray', A, B);
  const b = sub(B, A), c = sub(Cc, A), sc = abs(b) * abs(c);
  if (!(sc > 0) || same(A, Cc)) return null;
  if (Math.abs(cross(b, c)) <= 1e-9 * sc) return dot(sub(A, B), sub(Cc, B)) <= 0 ? lin('seg', A, Cc) : twoRays(A, Cc);
  const K = gcircle3(A, B, Cc);
  if (!K || K.t !== 'circle') return null;
  const ta = arg(sub(A, K.c)), s = mod(arg(sub(Cc, K.c)) - ta), u = mod(arg(sub(B, K.c)) - ta);
  return { t: 'arc', c: K.c, r: K.r, a0: ta, da: u < s ? s : s - TAU };
}

// 镜面：点（中心对称）、直线（轴对称）、圆（反演，即关于圆的对称点）
export function mirrorOf(g) {
  if (isPt(g)) return g;
  if (isLinear(g)) return { t: 'line', a: g.a, b: g.b };
  if (isRound(g)) return { t: 'circle', c: g.c, r: g.r };
  return null;
}
export function reflectPt(m, z) {
  if (!isFin(z)) return m.t === 'circle' ? m.c : INF;
  if (m.t === 'pt') return sub(scale(m.z, 2), z);
  if (m.t === 'line') { const v = sub(m.b, m.a); return add(m.a, mul(v, conj(div(sub(z, m.a), v)))); }
  const w = sub(z, m.c), q = abs2(w);
  return q > 0 ? add(m.c, scale(w, (m.r * m.r) / q)) : INF;
}
// 图形关于镜面的像：直线、圆变为广义圆；线段、射线、圆弧变为广义圆弧
export function reflect(g, m) {
  if (!g || !m) return null;
  const R = (z) => reflectPt(m, z);
  switch (g.t) {
    case 'pt': return pt(R(g.z));
    case 'line': { const v = sub(g.b, g.a); return gcircle3(R(sub(g.a, v)), R(g.a), R(g.b)); }
    case 'circle': return gcircle3(...[0, 1, 2].map((k) => R(at(g, 0.3 + (k * TAU) / 3))));
    case 'seg': return garc3(R(g.a), R(lerp(g.a, g.b, 0.5)), R(g.b));
    case 'ray': return garc3(R(g.a), R(g.b), R(INF));
    case 'arc': return garc3(R(at(g, 0)), R(at(g, 0.5)), R(at(g, 1)));
    case 'path': {
      const parts = g.parts.map((q) => reflect(q, m));
      if (parts.some((q) => !q)) return null;
      return { t: 'path', parts: parts.flatMap((q) => (q.t === 'path' ? q.parts : [q])), closed: g.closed };
    }
    case 'free': return { t: 'free', pts: g.pts.map((z) => { if (!z) return null; const w = R(z); return isFin(w) ? w : null; }) };
  }
  return null;
}

// 过 P 的圆 K 的切线：P 在圆外两条，在圆上一条，在圆内没有
export function tangents(P, K) {
  const v = sub(P, K.c), d = abs(v), r = K.r;
  if (d < r * (1 - 1e-9)) return [null, null];
  if (d <= r * (1 + 1e-9)) return [lin('line', P, add(P, perp(v))), null];
  const phi = arg(v), al = Math.acos(r / d);
  return [phi + al, phi - al].map((t) => lin('line', P, add(K.c, scale(cis(t), r))));
}
// 以 O 为圆心、与直线类或圆相切的圆的半径（对圆取较近的那个切圆）
export function tangentRadius(O, X) {
  if (isLinear(X)) { const v = sub(X.b, X.a); return Math.abs(cross(sub(O, X.a), v)) / abs(v); }
  if (isRound(X)) return Math.abs(dist(O, X.c) - X.r);
  return null;
}
// 以 AB 为一边、逆时针排列的正 n 边形顶点
export function regVerts(A, B, n) {
  const out = [A, B], rot = cis(TAU / n);
  for (let k = 2; k < n; k++) out.push(add(out[k - 1], mul(sub(out[k - 1], out[k - 2]), rot)));
  return out;
}
export function polyPath(P, closed) {
  const parts = [];
  for (let i = 0; i + 1 < P.length; i++) { const s = lin('seg', P[i], P[i + 1]); if (s) parts.push(s); }
  if (closed && P.length > 2) { const s = lin('seg', P[P.length - 1], P[0]); if (s) parts.push(s); }
  return parts.length ? { t: 'path', parts, closed } : null;
}

// ---------------- 采样（用于映射到另一平面、在球面上绘制） ----------------
// 直线与射线：中间等距，远处按几何级数一直取到 |z| ≈ 10⁷（像曲线经过 ∞ 的部分由此得到）
function spread(L0) {
  const out = [];
  const h = L0 / 24;
  for (let s = 0; s < 8 * L0; s += h) out.push(s);
  for (let s = 8 * L0; s < 1e7; s *= 1.18) out.push(s);
  return out;
}
export function sample(g) {
  switch (g.t) {
    case 'seg': return segment(g.a, g.b, 64);
    case 'ray': {
      const d = dir(g);
      return spread(Math.max(1, abs(g.a))).map((s) => add(g.a, scale(d, s)));
    }
    case 'line': {
      const d = dir(g), f = add(g.a, scale(d, -dot(g.a, d))), S = spread(Math.max(1, abs(f)));
      return [...S.slice(1).reverse().map((s) => -s), ...S].map((s) => add(f, scale(d, s)));
    }
    case 'circle': return circlePts(g.c, g.r, 192);
    case 'arc': return circlePts(g.c, g.r, Math.max(12, Math.ceil((192 * Math.abs(g.da)) / TAU)), g.a0, g.a0 + g.da);
    case 'path': {
      const out = [];
      for (const q of g.parts) {
        const s = sample(q), last = out[out.length - 1];
        if (out.length && !(last && s[0] && same(last, s[0]))) out.push(null);
        out.push(...s);
      }
      return out;
    }
    case 'free': return g.pts;
  }
  return [];
}

// Ramer–Douglas–Peucker 化简：手绘曲线转成少量线段（交给着色器求原像）
export function simplify(pts, tol) {
  const runs = [], out = [];
  let cur = [];
  for (const z of pts) { if (z) cur.push(z); else { if (cur.length) runs.push(cur); cur = []; } }
  if (cur.length) runs.push(cur);
  for (const P of runs) {
    const keep = new Uint8Array(P.length);
    keep[0] = keep[P.length - 1] = 1;
    const stack = [[0, P.length - 1]];
    while (stack.length) {
      const [i, j] = stack.pop();
      let best = -1, bd = tol;
      for (let k = i + 1; k < j; k++) {
        const d = same(P[i], P[j]) ? dist(P[i], P[k]) : nearest({ t: 'seg', a: P[i], b: P[j] }, P[k]).d;
        if (d > bd) { bd = d; best = k; }
      }
      if (best > 0) { keep[best] = 1; stack.push([i, best], [best, j]); }
    }
    if (out.length) out.push(null);
    P.forEach((z, k) => keep[k] && out.push(z));
  }
  return out;
}
