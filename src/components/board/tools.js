// 作图工具：每个工具声明下一步需要的对象类型 need(picks)（返回 null 表示已选齐）与生成的对象 make(picks, opt)
// picks = [{ id, g }]；同一步可以接受多种类型，因此“垂线”等工具点与直线的选择顺序不限
import * as G from './geom.js';

export const ACCEPT = {
  pt: G.isPt,
  lin: G.isLinear,
  seg: (g) => g?.t === 'seg',
  rnd: G.isRound,
  curve: G.isCurve,
  any: (g) => !!g,
  mirror: (g) => G.isPt(g) || G.isLinear(g) || G.isRound(g),
  touch: (g) => G.isLinear(g) || G.isRound(g),
};
export const accepts = (need, g) => !!need && need.some((t) => ACCEPT[t](g));

const find = (picks, t) => picks.find((p) => ACCEPT[t](p.g));
const pts = (n) => (picks) => (picks.length < n ? ['pt'] : null);
// 一个点 + 一个 t 类型的对象，顺序任意
const ptAnd = (t) => (picks) => {
  if (picks.length >= 2) return null;
  if (!picks.length) return ['pt', t];
  return ACCEPT.pt(picks[0].g) ? [t] : ['pt'];
};
const ptAndIds = (t) => (picks) => [find(picks, 'pt').id, picks.find((p) => p !== find(picks, 'pt') && ACCEPT[t](p.g)).id];
const two = (kind) => (picks) => [{ kind, deps: picks.map((p) => p.id) }];
const steps = (...h) => (picks) => h[Math.min(picks.length, h.length - 1)];

export const TOOLS = {
  move: { name: '移动 / 选择', hint: () => '拖动自由点、曲线上的点或整条曲线；拖动空白处平移；点击对象选中（Delete 删除）' },
  point: { name: '点', need: pts(1), make: () => [], hint: () => '点击放置一个点，按“吸附”设置吸附到已有点、交点、中点、圆心、网格或曲线上' },
  inter: {
    name: '交点', need: (p) => (p.length < 2 ? ['curve'] : null),
    make: (picks) => {
      const [a, b] = picks;
      if (a.id === b.id) return [];
      return G.intersect(a.g, b.g).map((z, k) => (z ? { kind: 'inter', deps: [a.id, b.id], par: { k } } : null)).filter(Boolean);
    },
    hint: steps('选择第一条曲线（或直接点击两曲线的交点）', '选择第二条曲线：生成它们的全部交点'),
  },
  mid: {
    name: '中点 / 圆心',
    need: (p) => (!p.length ? ['pt', 'seg', 'rnd'] : p.length === 1 && G.isPt(p[0].g) ? ['pt'] : null),
    make: (picks) => {
      const [a] = picks;
      if (G.isRound(a.g)) return [{ kind: 'center', deps: [a.id] }];
      return [{ kind: 'mid', deps: picks.map((p) => p.id) }];
    },
    hint: steps('选择两个点，或一条线段（中点）、一个圆（圆心）', '选择第二个点'),
  },
  line: { name: '直线（两点）', need: pts(2), make: two('line'), hint: steps('选择直线经过的第一个点', '选择第二个点') },
  seg: { name: '线段', need: pts(2), make: two('seg'), hint: steps('选择线段的起点', '选择终点') },
  ray: { name: '射线', need: pts(2), make: two('ray'), hint: steps('选择射线的端点', '选择射线经过的点') },
  perp: {
    name: '垂线', need: ptAnd('lin'), make: (p) => [{ kind: 'perp', deps: ptAndIds('lin')(p) }],
    hint: (p) => (!p.length ? '选择一个点与一条直线（或线段、射线、坐标轴），顺序任意' : G.isPt(p[0].g) ? '选择要垂直的直线' : '选择垂线经过的点'),
  },
  par: {
    name: '平行线', need: ptAnd('lin'), make: (p) => [{ kind: 'par', deps: ptAndIds('lin')(p) }],
    hint: (p) => (!p.length ? '选择一个点与一条直线（或线段、射线、坐标轴），顺序任意' : G.isPt(p[0].g) ? '选择要平行的直线' : '选择平行线经过的点'),
  },
  bisect: {
    name: '中垂线', need: (p) => (!p.length ? ['pt', 'seg'] : p.length === 1 && G.isPt(p[0].g) ? ['pt'] : null),
    make: two('bisect'), hint: steps('选择两个点或一条线段', '选择第二个点'),
  },
  abis: { name: '角平分线', need: pts(3), make: two('abis'), hint: steps('选择角的一边上的点 A', '选择顶点 B', '选择另一边上的点 C：作 ∠ABC 的平分线') },
  tangent: {
    name: '切线', need: ptAnd('rnd'),
    make: (picks) => {
      const P = find(picks, 'pt'), K = find(picks, 'rnd');
      return G.tangents(P.g.z, K.g).map((l, k) => (l ? { kind: 'tangent', deps: [P.id, K.id], par: { k } } : null)).filter(Boolean);
    },
    hint: (p) => (!p.length ? '选择一个点与一个圆（或圆弧），顺序任意：过该点作圆的切线' : G.isPt(p[0].g) ? '选择圆' : '选择切线经过的点（圆外两条，圆上一条）'),
  },
  circle: { name: '圆（圆心、圆上一点）', need: pts(2), make: two('circle'), hint: steps('选择圆心', '选择圆上的一点') },
  circleR: {
    name: '圆（圆心、半径）', need: pts(1), opt: 'r',
    make: (picks, o) => [{ kind: 'circleR', deps: [picks[0].id], par: { r: o.r } }],
    hint: () => '在工具栏输入半径，然后选择圆心',
  },
  circle3: { name: '三点圆', need: pts(3), make: two('circle3'), hint: steps('选择圆上的第一个点', '选择第二个点', '选择第三个点（三点共线时得到直线，即广义圆）') },
  tcircle: {
    name: '切圆（圆心、相切对象）', need: ptAnd('touch'),
    make: (p) => [{ kind: 'tcircle', deps: ptAndIds('touch')(p) }],
    hint: (p) => (!p.length ? '选择圆心与要相切的直线或圆，顺序任意' : G.isPt(p[0].g) ? '选择要相切的直线或圆' : '选择圆心'),
  },
  arc: { name: '圆弧（圆心、起点、终点）', need: pts(3), make: two('arc'), hint: steps('选择圆心', '选择起点（决定半径）', '选择终点方向：从起点逆时针转到终点') },
  arc3: { name: '三点圆弧', need: pts(3), make: two('arc3'), hint: steps('选择起点', '选择圆弧经过的点', '选择终点') },
  poly: {
    name: '多边形', multi: 'closed', need: () => ['pt'],
    make: (picks) => [{ kind: 'poly', deps: picks.map((p) => p.id), par: { closed: true } }],
    hint: (p) => (p.length < 3 ? '依次选择顶点' : '继续选择顶点；再次点击第一个顶点（或按 Enter）闭合'),
  },
  polyline: {
    name: '折线', multi: 'open', need: () => ['pt'],
    make: (picks) => [{ kind: 'poly', deps: picks.map((p) => p.id), par: { closed: false } }],
    hint: (p) => (p.length < 2 ? '依次选择折线的顶点' : '继续选择；再次点击最后一个点（或按 Enter）结束'),
  },
  regpoly: {
    name: '正多边形', need: pts(2), opt: 'n',
    make: (picks, o) => {
      const n = Math.max(3, Math.min(40, Math.round(o.n) || 4));
      return [{ kind: 'regpoly', deps: picks.map((p) => p.id), par: { n }, verts: n }];
    },
    hint: steps('在工具栏输入边数，选择一条边的起点', '选择这条边的终点（顶点按逆时针排列）'),
  },
  reflect: {
    name: '对称 / 反演', need: (p) => (!p.length ? ['any'] : p.length === 1 ? ['mirror'] : null),
    make: (picks) => [{ kind: 'reflect', deps: picks.map((p) => p.id) }],
    hint: steps('选择要对称的点或曲线', '选择对称轴（直线）、对称中心（点）或圆（关于圆对称即反演）'),
  },
  pen: { name: '画笔', hint: () => '按住拖动，自由画曲线' },
  erase: { name: '删除', hint: () => '点击要删除的对象（依赖它的对象一并删除）' },
};

// 工具栏分组
export const GROUPS = [
  ['move'],
  ['point', 'inter', 'mid'],
  ['line', 'seg', 'ray'],
  ['perp', 'par', 'bisect', 'abis', 'tangent'],
  ['circle', 'circleR', 'circle3', 'tcircle', 'arc', 'arc3'],
  ['poly', 'polyline', 'regpoly'],
  ['reflect'],
  ['pen', 'erase'],
];
