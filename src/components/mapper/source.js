// 源区域：决定把 z 平面的哪一部分映过去。
// · 整个平面：对数极坐标网格覆盖 e^{-8} < |z| < e^{8}（含 ∞ 附近），不受 z 视图范围限制
// · 周期函数的基本周期带：避免多个周期的像互相覆盖
// · 当前 z 视图、或常用区域（core/domains.js）
import { C, polar, isFin, INF, cis } from '../../core/complex.js';
import { DOMAIN_MASK, BCOL, ss, domainParam } from '../../core/domains.js';

const PI = Math.PI;
const bd = (pts, k, name) => ({ pts, color: BCOL[k % BCOL.length], name });

// 周期函数的基本区域（预设中以 src 字段引用）
const hl = (y, X, n = 800) => { const p = []; for (let i = 0; i <= n; i++) p.push(C(ss(i / n, X, 6), y)); return p; };
const vl = (x, Y, n = 800) => { const p = []; for (let i = 0; i <= n; i++) p.push(C(x, ss(i / n, Y, 6))); return p; };
const FUND = {
  hstrip: { name: '一个周期带 −π < Im z < π', mask: 'abs(z.y) < PI && abs(z.x) < 40.0', fundRect: [-40, -PI, 40, PI],
    param: (u, v) => C(ss(u, 40, 8), -PI + 2 * PI * v), n: [320, 90],
    boundary: () => [bd(hl(-PI, 40), 1, 'Im z = −π'), bd(hl(PI, 40), 0, 'Im z = π')] },
  vsin: { name: '一个单叶带 |Re z| < π/2', mask: 'abs(z.x) < 0.5 * PI && abs(z.y) < 40.0', fundRect: [-PI / 2, -40, PI / 2, 40],
    param: (u, v) => C(PI * (u - 0.5), ss(v, 40, 6)), n: [70, 300],
    boundary: () => [bd(vl(-PI / 2, 40), 1, 'Re z = −π/2'), bd(vl(PI / 2, 40), 0, 'Re z = π/2')] },
  vcos: { name: '一个单叶带 0 < Re z < π', mask: 'z.x > 0.0 && z.x < PI && abs(z.y) < 40.0', fundRect: [0, -40, PI, 40],
    param: (u, v) => C(PI * u, ss(v, 40, 6)), n: [70, 300],
    boundary: () => [bd(vl(0, 40), 1, 'Re z = 0'), bd(vl(PI, 40), 0, 'Re z = π')] },
  hsinh: { name: '一个单叶带 |Im z| < π/2', mask: 'abs(z.y) < 0.5 * PI && abs(z.x) < 40.0', fundRect: [-40, -PI / 2, 40, PI / 2],
    param: (u, v) => C(ss(u, 40, 6), PI * (v - 0.5)), n: [300, 70],
    boundary: () => [bd(hl(-PI / 2, 40), 1, 'Im z = −π/2'), bd(hl(PI / 2, 40), 0, 'Im z = π/2')] },
  // e^{1/z}：|Im(1/z)| < π，即两个相切于 0 的圆盘之外
  essential: { name: '一个周期区域 |Im(1/z)| < π', mask: 'abs(cinv(z).y) < PI', plane: true, boundary: () => [] },
};

// 区域的“中心”：球面视图默认朝向它
const DOM_CENTER = { disk: () => C(0), uhp: () => C(0, 1), rhp: () => C(1), sector: (a) => cis(a / 2), strip: (h) => C(0, h / 2), halfstrip: () => C(0, 1),
  halfdisk: () => C(0, 0.5), annulus: (r) => C((1 + r) / 2), exterior: () => INF, rect: () => C(0), slit: () => C(1) };
const FUND_CENTER = { hstrip: C(0), vsin: C(0), vcos: C(PI / 2), hsinh: C(0), essential: C(0.3) };

// 常用区域作为源（seed 参数化覆盖到 0 与 ∞ 附近）；raw 为未缩放的区域参数
export function domainSource(d, raw) {
  const a = domainParam(d, raw);
  return { key: 'dom:' + d.id, name: d.name, mask: DOMAIN_MASK[d.id] || 'true', dp: a ?? 0, center: DOM_CENTER[d.id]?.(a),
    build: () => gridMesh((u, v) => d.param(u, v, a), 160, 160), boundary: d.boundary(a), marks: d.marks };
}

// 解析当前源：返回 { key, name, mask, build() → {z:Float32Array, h:Float32Array, idx:Uint32Array}, boundary, marks, rect? }
export function resolveSource(M) {
  const s = M.state, d = M.domain;
  if (d) return domainSource(d, s.domP);
  if (s.dom === 'view') {
    const b = M.zv.bounds();
    return { key: 'view', name: '当前 z 视图', center: C((b.xmin + b.xmax) / 2, (b.ymin + b.ymax) / 2), mask: 'z.x > u_rect.x && z.y > u_rect.y && z.x < u_rect.z && z.y < u_rect.w', rect: [b.xmin, b.ymin, b.xmax, b.ymax],
      build: () => gridMesh((u, v) => C(b.xmin + (b.xmax - b.xmin) * u, b.ymin + (b.ymax - b.ymin) * v), 150, 150), boundary: [], marks: [] };
  }
  const F = FUND[M.preset?.src];
  if (F && s.dom !== 'plane') {
    return { key: 'fund:' + M.preset.src, name: F.name, mask: F.mask, fundRect: F.fundRect, center: FUND_CENTER[M.preset.src],
      build: () => (F.plane ? planeMesh() : gridMesh(F.param, F.n[0], F.n[1])), boundary: F.boundary(), marks: [] };
  }
  return { key: 'plane', name: '整个平面', mask: 'true', build: planeMesh, boundary: [], marks: [] };
}

// 参数网格 (u,v) ∈ [0,1]²；a_h 取到相邻顶点的最大距离（局部格子尺寸）
export function gridMesh(param, nu, nv, map = null) {
  const N = (nu + 1) * (nv + 1), z = new Float32Array(2 * N), hh = new Float32Array(N), P = new Array(N);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) P[j * (nu + 1) + i] = param(i / nu, j / nv);
  const at = (i, j) => P[Math.min(nv, Math.max(0, j)) * (nu + 1) + Math.min(nu, Math.max(0, i))];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const k = j * (nu + 1) + i, p = P[k];
    if (!p || !isFin(p)) { hh[k] = 0; continue; }
    z[2 * k] = p.re; z[2 * k + 1] = p.im;
    let m = 0;
    for (const q of [at(i + 1, j), at(i - 1, j), at(i, j + 1), at(i, j - 1), at(i + 1, j + 1), at(i - 1, j - 1)]) if (q && isFin(q)) m = Math.max(m, Math.hypot(q.re - p.re, q.im - p.im));
    hh[k] = m || 1e-3;
  }
  const idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 2, e = a + nu + 1;
    idx.push(a, b, c, a, c, e);
  }
  const data = { z, h: hh, idx: new Uint32Array(idx) };
  if (map) data.w = Float32Array.from(P.flatMap((p) => { const w = map(p); return [w.re, w.im]; }));
  return data;
}

// 整个平面：ln|z| ∈ [−30, 30]（|z| = 1 附近最密）、arg z ∈ [0, 2π] 的对数极坐标网格
function planeMesh() {
  return gridMesh((u, v) => polar(Math.exp(ss(u, 30, 6)), 2 * PI * v), 300, 160);
}
