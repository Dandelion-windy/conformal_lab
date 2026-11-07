// 第 6 章 区域的共形映射：典型例题分步演示
import * as K from '../../core/complex.js';
import { h, select, group, note, tex, setTex, renderMath, toggle } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { DomainMesh, intersectTris } from '../../core/mesh.js';
import { mapCurve } from '../../core/mapcurve.js';
import { strokePath, dot, label } from '../../core/draw.js';
import { lineColor } from '../../components/mapper/lines.js';
import { shell, theory, player } from '../common.js';
import { EXAMPLES } from './examples.js';

const NAMES = (n) => ['z', ...Array.from({ length: n - 1 }, (_, i) => (n - 1 === 1 ? '\\zeta' : `\\zeta_${i + 1}`)), 'w'];

let api = null;
export default {
  mount(root, app, arg) {
    const { stage, panel, theory: th } = shell(root, {
      num: '06', title: '区域的共形映射：典型例题',
      lead: '求“区域 → 上半平面/单位圆盘”的映射，基本思路是用初等映射逐步化简：<b>分式线性变换</b>把交点/切点送到 $0,\\infty$，<b>幂函数</b>调整张角，<b>指数/对数</b>在带形与角形之间转换。每一步都可以单独观察。',
      stageClass: 'two',
    });
    api = mountChain(stage, panel, arg);
    theory(th, '方法总结', [
      { title: '一般步骤', tag: '方法', html: `
<ol>
<li><b>看边界</b>：区域由哪些圆弧/直线段围成？它们交于哪些点、交角多大？是否相切？</li>
<li><b>交点送到 $0$ 与 $\\infty$</b>：用 $\\zeta=k\\dfrac{z-z_1}{z-z_2}$。过 $z_1,z_2$ 的圆弧都变为从原点出发的射线，区域变为<b>角形域</b>，张角 = 原交角。</li>
<li><b>切点送到 $\\infty$</b>：用 $\\zeta=\\dfrac{1}{z-z_0}$，两相切圆变为两平行直线，区域变为<b>带形</b>。</li>
<li><b>标准化</b>：角形域 $0<\\arg\\zeta<\\alpha$ 用 $\\zeta^{\\pi/\\alpha}$；带形 $0<\\operatorname{Im}\\zeta<h$ 用 $e^{\\pi\\zeta/h}$；都得到上半平面。</li>
<li><b>最后一步</b>：上半平面 → 单位圆盘用 $w=e^{i\\theta}\\dfrac{\\zeta-\\zeta_0}{\\zeta-\\bar\\zeta_0}$；附加条件（某点 → 0、某点导数辐角）在这里确定 $\\zeta_0$ 和 $\\theta$。</li>
</ol>
<div class="warnbox" data-t="检验">每一步都可取一个内点检验其像落在哪一侧；或用边界对应原理：沿边界正向（区域在左侧）行进，像也应使像区域在左侧。</div>` },
      { title: '映射工具箱', tag: '工具', html: `
<table>
<tr><th>作用</th><th>映射</th></tr>
<tr><td>交点 $a,b$ → $0,\\infty$</td><td>$\\dfrac{z-a}{z-b}$</td></tr>
<tr><td>切点 $a$ → $\\infty$</td><td>$\\dfrac{1}{z-a}$</td></tr>
<tr><td>张角 $\\alpha$ → $\\pi$</td><td>$z^{\\pi/\\alpha}$</td></tr>
<tr><td>带形（宽 $h$）→ 上半平面</td><td>$e^{\\pi z/h}$</td></tr>
<tr><td>上半平面 → 带形</td><td>$\\frac{h}{\\pi}\\operatorname{Log} z$</td></tr>
<tr><td>半带形 → 上半平面</td><td>$\\sin z$、$\\cosh z$ 等</td></tr>
<tr><td>去掉线段/半圆的区域</td><td>$z^2$、$\\sqrt z$、$z+\\frac1z$</td></tr>
<tr><td>上半平面 → 圆盘</td><td>$\\dfrac{z-z_0}{z-\\bar z_0}$</td></tr>
</table>` },
      { title: '对称原理（Schwarz 反射原理）', tag: '定理', html: `
<div class="thm" data-t="对称原理">设区域 $D$ 关于实轴对称，$D^+=D\\cap\\{\\operatorname{Im}z>0\\}$，$\\sigma=D\\cap\\mathbb R$。若 $f$ 在 $D^+$ 内解析、在 $D^+\\cup\\sigma$ 上连续，且在 $\\sigma$ 上取实值，则
$$F(z)=\\begin{cases}f(z),&z\\in D^+\\cup\\sigma\\\\ \\overline{f(\\bar z)},&\\bar z\\in D^+\\end{cases}$$
在整个 $D$ 内解析。</div>
<p>更一般地，把“实轴”换成圆弧或线段：若 $f$ 把边界上的一段圆弧 $\\gamma$ 映到圆弧 $\\Gamma$ 上，则 $f$ 可以越过 $\\gamma$ 解析延拓，使关于 $\\gamma$ 对称的点映为关于 $\\Gamma$ 对称的点。</p>
<div class="tip" data-t="用途">求对称区域的映射时，可以只考虑一半：例如半带形、上半单位圆盘都是“一半”的区域；它也是 Schwarz–Christoffel 公式证明的关键一步。</div>` },
      { title: '常见易错点', tag: '注意', wide: true, html: `
<ul>
<li><b>多值函数选分支</b>：$\\sqrt z$ 的割线必须放在区域<b>外面</b>（或正好在割缝上）。例如“上半平面去掉线段”一题中需要辐角取 $(0,2\\pi)$ 的分支，而不是主值。</li>
<li><b>$z^n$ 的单叶性</b>：只有当张角 $\\alpha\\le\\frac{2\\pi}{n}$ 时，$z^n$ 在角形域内才单叶。</li>
<li><b>$e^z$ 的单叶性</b>：只在宽度 $\\le2\\pi$ 的水平带形内单叶。</li>
<li>最终答案往往不唯一：上半平面 → 上半平面的自同构有三个实参数；题目中的附加条件用于确定唯一解。</li>
</ul>` },
    ]);
  },
  show(arg) { if (api && arg) api.load(arg); },
};

function mountChain(stage, panel, initial) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const L = new PlaneView(b1, { title: ' ' }), R = new PlaneView(b2, { title: ' ' });
  const meshL = new DomainMesh(111, 111), meshR = new DomainMesh(111, 111);
  L.glLayers.push((r, v, dpr) => meshL.draw(r, v, dpr));
  R.glLayers.push((r, v, dpr) => meshR.draw(r, v, dpr));
  const s = { ex: null, k: 1, t: 1, grid: true, all: false };
  let comps = [], stageGeo = [], gridLines = [], morphTris = null;
  // 第 k 阶段：前 k 个映射的复合
  const compose = (k) => (z) => { for (let i = 0; i < k; i++) { z = s.ex.steps[i].f(z); if (!K.isFin(z)) return z; } return z; };
  const fromIdx = () => (s.all ? 0 : s.k - 1), toIdx = () => (s.all ? s.ex.steps.length : s.k);
  const morph = (z) => { const a = comps[fromIdx()](z), b = comps[toIdx()](z); return s.t >= 1 ? b : K.lerp(a, b, s.t); };

  const drawStage = (fn) => (ctx, v) => {
    const proj = (w) => v.toScreen(w), o = { W: v.W, H: v.H };
    if (s.grid) for (const G of gridLines) strokePath(ctx, v, mapCurve(fn(), G.pts, proj, o), { color: lineColor(G), width: 1, casing: false, alpha: 0.6, maxJump: 90 });
    for (const [pts, color] of s.ex.boundary) strokePath(ctx, v, mapCurve(fn(), pts, proj, o), { color, width: 3, maxJump: 90 });
    for (const [z, t] of s.ex.marks) {
      const w = fn()(z);
      if (!K.isFin(w)) continue;
      dot(ctx, v, w, '#fff', 3.5); const [x, y] = v.toScreen(w); label(ctx, x + 7, y - 9, t);
    }
  };
  L.overlays.push(drawStage(() => comps[fromIdx()]));
  R.overlays.push(drawStage(() => morph));

  const exSel = select({ label: '例题', options: EXAMPLES.map((e) => ({ value: e.id, label: e.title })), value: EXAMPLES[0].id, onChange: (v) => load(v) });
  const qBox = h('div', { class: 'note' });
  const stepper = h('div', { class: 'stepper' });
  const play = player({ max: 1, value: 1, speed: 0.45, onFrame: (t) => { s.t = t; applyMorph(); }, fmt: (v) => `${(v * 100).toFixed(0)}%` });
  const stepNote = h('div', { class: 'note' });
  const ansBox = h('div', { class: 'formula-box' });
  const tGrid = toggle({ label: '坐标网格', value: s.grid, onChange: (v) => { s.grid = v; L.redraw(); R.redraw(); } });
  const legend = h('div', { class: 'legend' });
  panel.append(
    group('题目', exSel.el, qBox),
    group('步骤（点击箭头选择一步）', stepper, h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, '形变动画（线性插值，仅示意）'), play.el), tGrid.el),
    group('本步说明', stepNote),
    group('边界', legend),
    group('答案', ansBox),
  );

  function load(id) {
    const ex = EXAMPLES.find((e) => e.id === id) || EXAMPLES[0];
    s.ex = ex; exSel.value = ex.id; s.k = 1; s.all = false;
    qBox.innerHTML = `<b class="c-amb">${ex.tag}</b>　${ex.q}`;
    renderMath(qBox);
    comps = Array.from({ length: ex.steps.length + 1 }, (_, k) => compose(k));
    meshL.cells = meshR.cells = ex.cells;
    meshL.setDomain(ex.param); meshR.setDomain(ex.param);
    stageGeo = comps.map((f) => meshL.map(f));
    // 网格线：参数 u、v 的等值线
    gridLines = [];
    const n = 8;
    for (let i = 1; i < n; i++) {
      const pu = [], pv = [];
      for (let j = 0; j <= 240; j++) { pu.push(ex.param(i / n, j / 240)); pv.push(ex.param(j / 240, i / n)); }
      gridLines.push({ pts: pu, fam: 0, t: i / n }, { pts: pv, fam: 1, t: i / n });
    }
    legend.innerHTML = ex.boundary.map(([, c, name]) => `<span><i style="background:${c}"></i>${name}</span>`).join('');
    setTex(ansBox, ex.answer, true);
    buildStepper();
    select_(1);
  }
  function buildStepper() {
    const ex = s.ex, names = NAMES(ex.steps.length);
    stepper.innerHTML = '';
    names.forEach((nm, i) => {
      if (i > 0) {
        const st = ex.steps[i - 1];
        stepper.append(h('div', { class: 'step', 'data-k': i, title: '选择这一步', onclick: () => select_(i), style: 'min-width:auto' },
          h('span', { class: 'st-name' }, `第 ${i} 步`), h('span', { class: 'st-tex', html: tex(st.tex.replace(/\\dfrac/g, '\\tfrac')) })));
      }
      if (i === 0 || i === names.length - 1) stepper.append(h('div', { class: 'step-arrow', html: tex(nm) }));
    });
    stepper.append(h('div', { class: 'step', 'data-k': 'all', onclick: () => select_('all') }, h('span', { class: 'st-name' }, '整体'), h('span', { class: 'st-tex', html: tex('z\\mapsto w') })));
  }
  function select_(k) {
    const ex = s.ex, n = ex.steps.length;
    s.all = k === 'all';
    s.k = s.all ? n : k;
    [...stepper.querySelectorAll('.step')].forEach((el) => el.classList.toggle('on', el.dataset.k === String(k)));
    const names = NAMES(n);
    const a = fromIdx(), b = toIdx();
    L.titleEl.innerHTML = `${tex(names[a])} 平面`;
    R.titleEl.innerHTML = `${tex(names[b])} 平面`;
    const vA = a === 0 ? ex.view : ex.steps[a - 1].view, vB = b === 0 ? ex.view : ex.steps[b - 1].view;
    L.setHome(...vA); R.setHome(...vB);
    stepNote.innerHTML = s.all ? `复合全部 ${n} 步，得到 $w=f(z)$。比较左右两图：同色的格子、同色的边界互相对应。` : `$${ex.steps[k - 1].tex}$<br>${ex.steps[k - 1].note}`;
    renderMath(stepNote);
    const A = stageGeo[a];
    meshL.setGeometry(A.pos, A.tris);
    morphTris = intersectTris(A.tris, stageGeo[b].tris);
    play.stop(); s.t = 1; play.set(1, false);
    applyMorph();
  }
  function applyMorph() {
    const A = stageGeo[fromIdx()], B = stageGeo[toIdx()], t = s.t;
    if (t >= 1) meshR.setGeometry(B.pos, B.tris);
    else {
      const pos = new Float32Array(A.pos.length);
      for (let i = 0; i < pos.length; i++) pos[i] = A.pos[i] + (B.pos[i] - A.pos[i]) * t;
      meshR.setGeometry(pos, morphTris);
    }
    L.redraw(); R.redraw();
  }
  load(initial || EXAMPLES[0].id);
  return { load };
}
