// 黎曼球面上的整体结构：零点、极点、∞ 处的值、临界点（f′ = 0 或高阶极点），以及次数
// 用于在球面上标出共形性失效的点，并验证有理函数的 Riemann–Hurwitz 公式（临界点个数 = 2d − 2）
import * as K from '../../core/complex.js';

const chord = (a, b) => {
  if (!K.isFin(a) && !K.isFin(b)) return 0;
  if (!K.isFin(a)) return 2 / Math.sqrt(1 + K.abs2(b));
  if (!K.isFin(b)) return 2 / Math.sqrt(1 + K.abs2(a));
  return (2 * K.abs(K.sub(a, b))) / Math.sqrt((1 + K.abs2(a)) * (1 + K.abs2(b)));
};
// 球面上的种子点：经纬网格
function seeds() {
  const out = [];
  for (let i = 1; i < 18; i++) for (let j = 0; j < 32; j++) {
    const th = (Math.PI * i) / 18, ph = (2 * Math.PI * j) / 32 + i * 0.37;
    const z = Math.cos(th), r = Math.sin(th);
    out.push(K.C((r * Math.cos(ph)) / (1 - z), (r * Math.sin(ph)) / (1 - z)));
  }
  return out;
}
const SEEDS = seeds();
function newton(g, z0, hs = 1e-6, it = 60) {
  let z = z0;
  for (let k = 0; k < it; k++) {
    const d = K.deriv(g, z, hs * Math.max(1, K.abs(z)));
    let st = K.div(g(z), d);
    if (!K.isFin(st)) return null;
    const L = K.abs(st), lim = 0.5 * Math.max(1, K.abs(z));
    if (L > lim) st = K.scale(st, lim / L);
    z = K.sub(z, st);
    if (K.abs(st) < 1e-13 * Math.max(1, K.abs(z))) break;
  }
  return z;
}
function collect(g, ok, hs = 1e-6) {
  const out = [];
  for (const s of SEEDS) {
    const z = newton(g, s, hs);
    if (!z || !K.isFin(z) || K.abs(z) > 1e6 || !ok(z)) continue;
    if (out.every((q) => chord(q, z) > 1e-4)) out.push(z);
    if (out.length > 24) break;
  }
  return out;
}
// 阶数：|g(p + ε)| ~ c ε^m
const order = (g, p) => {
  if (!K.isFin(p)) return 1;
  const e1 = 1e-3 * Math.max(1, K.abs(p)), e2 = e1 / 4, dir = K.cis(0.7);
  const a = K.abs(g(K.add(p, K.scale(dir, e1)))), b = K.abs(g(K.add(p, K.scale(dir, e2))));
  return Math.max(1, Math.round(Math.log(a / b) / Math.log(4)));
};

// g 在 z 处“真的”为零：比相邻点小得多（排除 e^z 在左半平面远处那种只是很小的值）
const isZero = (g, z) => {
  const v = K.abs(g(z)), d = 1e-3 * (1 + K.abs(z));
  const near = Math.max(K.abs(g(K.add(z, K.C(d)))), K.abs(g(K.add(z, K.C(0, d)))));
  return near > 1e-7 && v < 1e-9 * Math.max(1, near) && v < 1e-6 * near;
};
const LIM = 300;

export function analyze(f) {
  const res = { zeros: [], poles: [], crit: [], inf: null, infOrder: 0, infKind: '', rational: false, degree: null };
  // ∞ 处：沿多个方向取 |z| = 10⁸，判断是极点、确定值还是本性奇点
  const dirs = [0, 0.3, 1.57, 2.2, 3.14, 4.1, 5.3];
  const far = dirs.map((t) => f(K.polar(1e8, t)));
  if (far.every((w) => !K.isFin(w) || K.abs(w) > 1e6)) {
    res.inf = K.INF; res.infKind = 'pole';
    const m = Math.log(K.abs(f(K.polar(4e3, 0.3))) / K.abs(f(K.polar(1e3, 0.3)))) / Math.log(4);
    res.infOrder = Number.isFinite(m) ? Math.max(1, Math.round(m)) : 1;
  } else if (far.every((w) => K.isFin(w) && chord(w, far[0]) < 1e-5)) {
    const v = far[0], d1 = K.abs(K.sub(f(K.polar(1e3, 0.3)), v)), d2 = K.abs(K.sub(f(K.polar(4e3, 0.3)), v));
    res.inf = K.abs(v) < 1e-6 ? K.ZERO : v; res.infKind = 'value';
    const m = Math.log(d1 / d2) / Math.log(4);
    res.infOrder = Number.isFinite(m) && d1 > 1e-14 ? Math.max(1, Math.round(m)) : 1;
  } else res.infKind = 'essential';
  const inv = (z) => K.inv(f(z));
  res.zeros = collect(f, (z) => K.abs(z) < LIM && isZero(f, z)).map((z) => ({ z, m: order(f, z) }));
  res.poles = collect(inv, (z) => K.abs(z) < LIM && isZero(inv, z)).map((z) => ({ z, m: order(inv, z) }));
  const fp = (z) => K.deriv(f, z, 1e-5 * Math.max(1, K.abs(z)));
  const crit = collect(fp, (z) => K.abs(z) < LIM && isZero(fp, z) && res.poles.every((p) => chord(p.z, z) > 1e-3), 1e-4)
    .map((z) => ({ z, m: Math.max(1, order((u) => K.sub(f(u), f(z)), z) - 1) }));
  for (const p of res.poles) if (p.m >= 2) crit.push({ z: p.z, m: p.m - 1 });
  if (res.infKind !== 'essential' && res.infOrder >= 2) crit.push({ z: K.INF, m: res.infOrder - 1 });
  res.crit = crit.filter((q) => Number.isFinite(q.m) && q.m <= 12);
  if (res.infKind !== 'essential' && res.zeros.length < 20 && res.poles.length < 20) {
    const zeroInf = res.infKind === 'value' && K.abs(res.inf) === 0;
    const nz = res.zeros.reduce((t, q) => t + q.m, 0) + (zeroInf ? res.infOrder : 0);
    const np = res.poles.reduce((t, q) => t + q.m, 0) + (res.infKind === 'pole' ? res.infOrder : 0);
    if (nz === np && nz > 0) { res.rational = true; res.degree = nz; }
  }
  return res;
}

// 整个球面上 f(z) = w 的全部原像（含 ∞）
export function globalPreimages(f, w, info) {
  const g = K.isFin(w) ? (z) => K.sub(f(z), w) : (z) => K.inv(f(z));
  const ok = (z) => chord(f(z), w) < 1e-6;
  const out = collect(g, ok);
  if (info && info.infKind !== 'essential' && info.inf && chord(info.inf, w) < 1e-6) out.push(K.INF);
  return out;
}
export { chord };
