// 几何画板的对象模型：每个对象由“构造方式 kind + 依赖对象 deps + 参数 par”定义，
// 图形 g 按创建顺序重新计算（依赖总在前面），因此拖动自由点时所有派生对象随之更新
import { C, add, sub, scale, abs, dist, lerp } from '../../core/complex.js';
import * as G from './geom.js';

const z = (g) => g.z;
const unit = (v) => scale(v, 1 / abs(v));
const linOf = (g) => (G.isLinear(g) ? g : null);

// 内置对象：坐标轴与单位圆（可选作构造的依赖，例如“过 A 垂直于实轴”）
export const BUILTIN = {
  $re: { id: '$re', name: '实轴', builtin: true, kind: 'builtin', deps: [], g: { t: 'line', a: C(0), b: C(1) } },
  $im: { id: '$im', name: '虚轴', builtin: true, kind: 'builtin', deps: [], g: { t: 'line', a: C(0), b: C(0, 1) } },
  $unit: { id: '$unit', name: '单位圆', builtin: true, kind: 'builtin', deps: [], g: { t: 'circle', c: C(0), r: 1 } },
};

// compute(依赖图形, par) → 图形或 null（无定义）；desc(依赖名称, par) → 文字说明
export const KINDS = {
  free: { compute: (_, p) => G.pt(p.z), desc: () => '自由点' },
  param: { compute: (_, p, env) => G.pt(env.P[p.k]), desc: (_, p) => `参数 ${p.k}（随参数移动）` },
  on: { compute: ([g], p) => G.pt(G.at(g, p.p)), desc: ([a]) => `${a} 上的点` },
  inter: { compute: ([a, b], p) => G.pt(G.intersect(a, b)[p.k]), desc: ([a, b]) => `${a} 与 ${b} 的交点` },
  mid: {
    compute: (D) => {
      if (D.length === 2) return G.isPt(D[0]) && G.isPt(D[1]) ? G.pt(lerp(z(D[0]), z(D[1]), 0.5)) : null;
      return G.isLinear(D[0]) && D[0].t === 'seg' ? G.pt(lerp(D[0].a, D[0].b, 0.5)) : null;
    },
    desc: (n) => (n.length === 2 ? `${n[0]}、${n[1]} 的中点` : `${n[0]} 的中点`),
  },
  emid: { compute: ([g], p) => (g.t === 'path' && g.parts[p.i]?.t === 'seg' ? G.pt(G.at(g.parts[p.i], 0.5)) : null), desc: ([a], p) => `${a} 第 ${p.i + 1} 条边的中点` },
  center: { compute: ([g]) => (G.isRound(g) ? G.pt(g.c) : null), desc: ([a]) => `${a} 的圆心` },
  vtx: { compute: ([g], p) => (g.t === 'path' ? G.pt(g.parts[p.k]?.a) : null), desc: ([a]) => `${a} 的顶点` },
  reflect: {
    compute: ([g, m]) => G.reflect(g, G.mirrorOf(m)),
    desc: ([a, b], p, D) => `${a} 关于 ${b} 的${G.isRound(D?.[1]) ? '反演（对称' : '对称'}${G.isPt(D?.[0]) ? '点' : '图形'}${G.isRound(D?.[1]) ? '）' : ''}`,
  },
  line: { compute: ([A, B]) => G.lin('line', z(A), z(B)), desc: ([a, b]) => `直线 ${a}${b}` },
  ray: { compute: ([A, B]) => G.lin('ray', z(A), z(B)), desc: ([a, b]) => `射线 ${a}${b}` },
  seg: { compute: ([A, B]) => G.lin('seg', z(A), z(B)), desc: ([a, b]) => `线段 ${a}${b}` },
  perp: {
    compute: ([P, L]) => (linOf(L) ? G.lin('line', z(P), add(z(P), G.perp(G.dir(L)))) : null),
    desc: ([a, b]) => `过 ${a} 垂直于 ${b}`,
  },
  par: {
    compute: ([P, L]) => (linOf(L) ? G.lin('line', z(P), add(z(P), G.dir(L))) : null),
    desc: ([a, b]) => `过 ${a} 平行于 ${b}`,
  },
  bisect: {
    compute: (D) => {
      const [A, B] = D.length === 2 ? [z(D[0]), z(D[1])] : D[0].t === 'seg' ? [D[0].a, D[0].b] : [];
      if (!A) return null;
      const m = lerp(A, B, 0.5);
      return G.lin('line', m, add(m, G.perp(sub(B, A))));
    },
    desc: (n) => `${n.join('')} 的中垂线`,
  },
  abis: {
    compute: ([A, B, Cc]) => {
      const u1 = sub(z(A), z(B)), u2 = sub(z(Cc), z(B));
      if (!(abs(u1) > 0 && abs(u2) > 0)) return null;
      let d = add(unit(u1), unit(u2));
      if (abs(d) < 1e-9) d = G.perp(unit(u1));
      return G.lin('line', z(B), add(z(B), d));
    },
    desc: ([a, b, c]) => `∠${a}${b}${c} 的平分线`,
  },
  tangent: {
    compute: ([P, K], p) => (G.isRound(K) ? G.tangents(z(P), K)[p.k] : null),
    desc: ([a, b]) => `过 ${a} 作 ${b} 的切线`,
  },
  circle: { compute: ([O, A]) => G.circle(z(O), dist(z(O), z(A))), desc: ([a, b]) => `圆心 ${a}，过 ${b}` },
  circleR: { compute: ([O], p) => G.circle(z(O), p.r), desc: ([a]) => `圆心 ${a}，给定半径` },
  circle3: { compute: ([A, B, Cc]) => G.gcircle3(z(A), z(B), z(Cc)), desc: ([a, b, c]) => `过 ${a}、${b}、${c} 的圆` },
  tcircle: { compute: ([O, X]) => G.circle(z(O), G.tangentRadius(z(O), X)), desc: ([a, b]) => `圆心 ${a}，与 ${b} 相切` },
  arc: { compute: ([O, A, B]) => G.arcCenter(z(O), z(A), z(B)), desc: ([a, b, c]) => `圆心 ${a}，${b} → ${c} 的圆弧` },
  arc3: { compute: ([A, B, Cc]) => G.garc3(z(A), z(B), z(Cc)), desc: ([a, b, c]) => `${a} → ${b} → ${c} 的圆弧` },
  poly: { compute: (D, p) => G.polyPath(D.map(z), p.closed), desc: (n, p) => `${p.closed ? '多边形' : '折线'} ${n.join('')}` },
  regpoly: { compute: ([A, B], p) => G.polyPath(G.regVerts(z(A), z(B), p.n), true), desc: ([a, b], p) => `以 ${a}${b} 为边的正 ${p.n} 边形` },
  pen: { compute: (_, p) => ({ t: 'free', pts: p.pts }), desc: () => '手绘曲线' },
};

export class Board {
  // env.P：映射的参数 a、b、c（参数点据此计算）
  constructor(plane, env) {
    this.plane = plane;
    this.env = env;
    this.objs = [];
    this.map = new Map();
  }
  get(id) { return this.map.get(id) || BUILTIN[id] || null; }
  // 依赖可以是 '$hover'（预览用的虚拟点）
  computeSpec(spec, virt) {
    const D = spec.deps.map((id) => (id === '$hover' ? virt : this.get(id)?.g));
    if (!D.every(Boolean)) return null;
    try { return KINDS[spec.kind].compute(D, spec.par || {}, this.env); } catch (e) { console.warn(e); return null; }
  }
  // gv：图形每次真正改变时加一，供绘制缓存判断是否失效（手绘曲线按点数组的引用比较）
  update(o) {
    o.g = this.computeSpec(o);
    const s = !o.g ? null : o.g.t === 'free' ? o.g.pts : JSON.stringify(o.g);
    if (s !== o._sig) { o._sig = s; o.gv = (o.gv || 0) + 1; }
  }
  recompute() { for (const o of this.objs) this.update(o); }
  add(o) {
    this.update(o);
    this.objs.push(o);
    this.map.set(o.id, o);
    return o;
  }
  // 删除对象及其所有派生对象
  remove(id) {
    const dead = new Set([id]);
    for (const o of this.objs) if (o.deps.some((d) => dead.has(d))) dead.add(o.id);
    this.objs = this.objs.filter((o) => !dead.has(o.id));
    for (const k of dead) this.map.delete(k);
    return dead.size;
  }
  clear() { this.objs = []; this.map.clear(); }
  // 对象依赖的全部自由点（拖动曲线时一起平移）与手绘曲线
  freeAncestors(id) {
    const out = new Set(), seen = new Set();
    const walk = (k) => {
      if (seen.has(k)) return;
      seen.add(k);
      const o = this.map.get(k);
      if (!o) return;
      if (o.kind === 'free' || o.kind === 'pen') out.add(o);
      o.deps.forEach(walk);
    };
    walk(id);
    return [...out];
  }
  describe(o) {
    const names = o.deps.map((d) => this.get(d)?.name ?? '?');
    return KINDS[o.kind]?.desc(names, o.par || {}, o.deps.map((d) => this.get(d)?.g)) ?? o.kind;
  }
  serialize() { return this.objs.map(({ id, name, kind, deps, par, color, show }) => ({ id, name, kind, deps: [...deps], par: structuredClone(par || {}), color, show })); }
  load(list) {
    this.clear();
    for (const o of list) this.add({ ...o, deps: [...o.deps], par: structuredClone(o.par) });
  }
}
