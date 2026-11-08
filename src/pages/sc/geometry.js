// SC 的几何数据：数值模型、增量采样与页面控件各自独立。
import * as K from '../../core/complex.js';
import { gridMesh } from '../../components/mapper/source.js';
import { SCMap, diskNgon } from './integrate.js';
import { IntegralPath } from './sampling.js';

const TAU = 2 * Math.PI;
const angle = (z) => (K.arg(z) + TAU) % TAU;
const ordered = (values) => [...new Set(values)].sort((a, b) => a - b);

// 数值误差远小于绘图像素；交互阶段减少采样，松手后恢复细节。
export const QUALITY = {
  interactive: { radial: 16, angular: 32, nearVertices: [0.002], tolerance: 2e-6, samples: 16, flatness: 1.1 },
  settled: { radial: 56, angular: 96, nearVertices: [0.02, 0.002, 0.00002], tolerance: 2e-8, samples: 48, flatness: 0.35 },
};

function curve(point, model, t0, t1, family, quality) {
  let path;
  return { point, t0, t1, family, image: (t) => {
    path ??= new IntegralPath({ point: (s) => model.toDisk(point(s)), derivative: model.derivative,
      valueAt: (s) => model.evaluate(point(s)), known: model.known, t0, t1, samples: quality.samples, tolerance: quality.tolerance });
    return path.at(t);
  } };
}

// 只在单位圆盘边界的前顶点使用精确值，内部点仍由局部积分求出。
const vertexValues = (roots, values) => (p) => {
  for (let k = 0; k < roots.length; k++) if (K.dist(p, roots[k]) < 1e-14) return values[k];
};

// 每条径向采样线从圆心开始累积，相邻径向节点之间仅积分一个小区间。
function fillMesh(model, prevertices, singularAngles, quality) {
  const angles = ordered([0, TAU, ...Array.from({ length: quality.angular + 1 }, (_, i) => TAU * i / quality.angular), ...prevertices,
    ...prevertices.flatMap((t) => quality.nearVertices.flatMap((d) => [(t + d) % TAU, (t - d + TAU) % TAU]))]);
  const units = angles.map((t) => t === TAU ? K.ONE : K.cis(t));
  const radialPoint = (j, u) => {
    const r = u === 1 && singularAngles.includes(angles[j] % TAU) ? 1 - 1e-10 : 1 - (1 - u) ** 3;
    return K.scale(units[j], r);
  };
  const data = gridMesh((u, v) => radialPoint(Math.round(v * (angles.length - 1)), u), quality.radial, angles.length - 1);
  const ws = new Float32Array(data.z.length);
  for (let j = 0; j < angles.length; j++) {
    const path = new IntegralPath({ point: (u) => radialPoint(j, u), derivative: model.derivative,
      valueAt: () => model.origin, known: model.known, t0: 0, t1: 1, samples: quality.radial, tolerance: quality.tolerance, anchor: 0 });
    path.values.forEach((w, i) => { const k = 2 * (j * (quality.radial + 1) + i); ws[k] = w.re; ws[k + 1] = w.im; });
  }
  data.w = ws;
  return data;
}

export function halfPlaneGeometry(xs, al, quality = QUALITY.settled) {
  // 保留该帧的参数快照，后续拖动不会改变已绘制模型的导数。
  xs = [...xs]; al = [...al];
  const S = new SCMap(xs, al);
  S.normalize();
  const infinity = S.apply(S.vertexInf());
  const vertices = xs.map((_, k) => S.apply(S.vertex(k)));
  const roots = xs.map((x) => K.div(K.C(x - S.c, -S.L), K.C(x - S.c, S.L)));
  const prevertices = roots.map(angle);
  const singular = prevertices.filter((_, k) => al[k] <= 0);
  if (S.alInf <= 0) singular.push(0);
  const model = {
    origin: S.B, derivative: S.diskDerivative(), known: vertexValues([...roots, K.ONE], [...vertices, infinity]),
    toDisk: (z) => {
      const x = z.re - S.c, y = z.im + S.L, den = x * x + y * y;
      return K.C(1 - 2 * S.L * y / den, -2 * S.L * x / den);
    },
    evaluate: (z) => K.isFin(z) ? S.evaluate(z) : infinity,
  };
  const offsets = ordered([...Array.from({ length: 25 }, (_, i) => (i - 12) / 2), -2048, -512, -128, -32, -16, -8, 8, 16, 32, 128, 512, 2048]);
  const heights = [0.03125, 0.0625, 0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 16, 32, 128, 512, 2048];
  const lines = offsets.map((x) => curve((t) => K.C(S.c + S.L * x, S.L * Math.expm1(t)), model, 0, 30, 0, quality));
  lines.push(...heights.map((y) => curve((t) => K.C(S.c + S.L * Math.sinh(t), S.L * y), model, -30, 30, 1, quality)));
  const ends = [-Infinity, ...xs, Infinity];
  const images = [infinity, ...vertices, infinity];
  const boundary = [];
  for (let k = 0; k < ends.length - 1; k++) {
    const a = ends[k], b = ends[k + 1];
    const x = a === -Infinity ? b - S.L : b === Infinity ? a + S.L : (a + b) / 2;
    const start = images[k], end = images[k + 1];
    if (K.isFin(start) && K.isFin(end)) boundary.push({ a: start, b: end });
    else {
      const direction = K.mul(S.A, S.g(K.C(x)));
      boundary.push({ a: start, b: end, origin: !K.isFin(start) && !K.isFin(end) ? model.evaluate(K.C(x)) : undefined,
        direction: K.scale(direction, 1 / K.abs(direction)) });
    }
  }
  let mesh;
  return { S, quality, evaluate: model.evaluate, get mesh() { return mesh ??= fillMesh(model, [0, ...prevertices], singular, quality); },
    lines, vertices, infinity, boundary, sourceKey: `plane:${S.c}:${S.L}`,
    chart: 'vec2(u_chart.x, 0.0) + cmul(vec2(0.0, u_chart.y), cdiv(vec2(1.0, 0.0) + v_z, vec2(1.0, 0.0) - v_z))',
    chartUniform: [S.c, S.L] };
}

export function diskGeometry(n, quality = QUALITY.settled) {
  const D = diskNgon(n), roots = Array.from({ length: n }, (_, k) => TAU * k / n);
  const model = { origin: K.ZERO, derivative: D.derivative, evaluate: D.evaluate, toDisk: (z) => z,
    known: vertexValues(roots.map(K.cis), D.verts) };
  const rays = ordered([...roots, ...Array.from({ length: 24 }, (_, i) => TAU * i / 24)]);
  const lines = rays.map((a) => curve((r) => K.polar(r, a), model, 0, 1, 0, quality));
  lines.push(...[0.08, 0.16, 0.28, 0.44, 0.62, 0.78, 0.9, 0.97, 0.995].map((r) => curve((t) => K.polar(r, t), model, 0, TAU, 1, quality)));
  let mesh;
  return { disk: true, quality, evaluate: D.evaluate, get mesh() { return mesh ??= fillMesh(model, roots, [], quality); },
    lines, vertices: D.verts, sourceKey: `disk:${n}`,
    boundary: D.verts.map((a, k) => ({ a, b: D.verts[(k + 1) % n] })), chart: 'v_z', chartUniform: [0, 1] };
}
