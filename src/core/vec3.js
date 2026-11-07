// 三维向量与球极投影（一般位置的球面：球心 c、半径 r，从球面最高点 N = c + (0,0,r) 投影到 z=0 平面）
export const v3 = (x, y, z) => [x, y, z];
export const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vscale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
export const vnorm = (a) => vscale(a, 1 / (vlen(a) || 1));
export const vlerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// 3×3 矩阵（行优先数组）
export const mat3Id = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const mulMV = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
export function mulMM(a, b) {
  const o = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    o[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
  }
  return o;
}
export const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export function rotX(t) { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, -s, 0, s, c]; }
export function rotY(t) { const c = Math.cos(t), s = Math.sin(t); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
export function rotZ(t) { const c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
// GLSL mat3 为列优先
export const toGL = (m) => new Float32Array(transpose(m));

// 单位球（球心原点）的标准球极投影
export function stereoUnit(q) {
  const d = 1 - q[2];
  if (d < 1e-12) return { re: Infinity, im: Infinity };
  return { re: q[0] / d, im: q[1] / d };
}
export function invStereoUnit(z) {
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return [0, 0, 1];
  const r2 = z.re * z.re + z.im * z.im;
  return [(2 * z.re) / (1 + r2), (2 * z.im) / (1 + r2), (r2 - 1) / (r2 + 1)];
}

// 一般球面 S = {c, r}：球面点 P ↔ 平面点 z
export function sphereToPlane(S, P) {
  const N = [S.c[0], S.c[1], S.c[2] + S.r];
  const dz = N[2] - P[2];
  if (dz < 1e-10 * S.r) return { re: Infinity, im: Infinity };
  const s = N[2] / dz;
  return { re: N[0] + s * (P[0] - N[0]), im: N[1] + s * (P[1] - N[1]) };
}
export function planeToSphere(S, z) {
  const N = [S.c[0], S.c[1], S.c[2] + S.r];
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return N;
  const D = [z.re - N[0], z.im - N[1], -N[2]];
  const t = (2 * S.r * N[2]) / vdot(D, D);
  return vadd(N, vscale(D, t));
}
// 射线与球面求交，返回最近的正参数 t（无交点返回 null）
export function raySphere(o, d, c, r) {
  const oc = vsub(o, c);
  const b = vdot(oc, d), cc = vdot(oc, oc) - r * r;
  const h = b * b - cc;
  if (h < 0) return null;
  const s = Math.sqrt(h);
  const t1 = -b - s, t2 = -b + s;
  return t1 > 0 ? [t1, t2] : t2 > 0 ? [t2, t2] : null;
}
