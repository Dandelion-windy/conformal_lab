// 第 4 章 · 标签 3：分解为 平移 → 倒数 → 旋转伸缩 → 平移，并连续动画
import * as K from '../../core/complex.js';
import { h, group, note, setTex, tex, renderMath, select, toggle } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { matUniforms } from '../../core/gl.js';
import { DOMAINS, DOMAIN_GRID } from '../../core/domains.js';
import { compile } from '../../core/compile.js';
import { mobiusTex } from '../../core/mobius.js';
import { mapCurve, segment, circlePts } from '../../core/mapcurve.js';
import { strokePath } from '../../core/draw.js';
import { texCoef } from '../../core/format.js';
import { player } from '../common.js';
import { lineColor } from '../../components/mapper/lines.js';
import { SourcePlane, PushedLayer, IDENTITY_MAP, MOBIUS_MAP } from '../../components/mapper/layers.js';
import { domainSource } from '../../components/mapper/source.js';

const PRE = [
  { name: 'Cayley：(z − i)/(z + i)', v: ['1', '-i', '1', 'i'], dom: 'uhp' },
  { name: '1/z', v: ['0', '1', '1', '0'], dom: 'disk' },
  { name: '(z + 1)/(z − 1)', v: ['1', '1', '1', '-1'], dom: 'disk' },
  { name: '(2z + i)/(iz + 1)', v: ['2', 'i', 'i', '1'], dom: 'uhp' },
  { name: '仿射：(1 + i)z + 2', v: ['1+i', '2', '0', '1'], dom: 'disk' },
];
const ID = [K.ONE, K.ZERO, K.ZERO, K.ONE];
// 每个基本步骤是一个单参数流 t ∈ [0,1] → 矩阵
const flows = {
  trans: (b) => (t) => [K.ONE, K.scale(b, t), K.ZERO, K.ONE],
  rotscale: (k) => { const lk = K.log(k); return (t) => [K.exp(K.scale(lk, t)), K.ZERO, K.ZERO, K.ONE]; },
  // 球面绕实轴转 tπ：t=1 时为 1/z
  inv: () => (t) => { const th = (t * Math.PI) / 2; return [K.C(Math.cos(th)), K.C(0, Math.sin(th)), K.C(0, Math.sin(th)), K.C(Math.cos(th))]; },
};

function decompose(a, b, c, d) {
  if (K.abs(c) < 1e-12) {
    const k = K.div(a, d), t = K.div(b, d);
    return [
      { name: '旋转伸缩', op: `\\times ${texCoef(k)}`, flow: flows.rotscale(k) },
      { name: '平移', op: `+${texCoef(t)}`, flow: flows.trans(t) },
    ];
  }
  const s1 = K.div(d, c), k = K.div(K.sub(K.mul(b, c), K.mul(a, d)), K.mul(c, c)), s2 = K.div(a, c);
  const steps = [];
  if (K.abs(s1) > 1e-12) steps.push({ name: '平移', op: `+${texCoef(s1)}`, flow: flows.trans(s1) });
  steps.push({ name: '倒数', op: '1/\\zeta', flow: flows.inv() });
  if (K.abs(K.sub(k, K.ONE)) > 1e-12) steps.push({ name: '旋转伸缩', op: `\\times ${texCoef(k)}`, flow: flows.rotscale(k) });
  if (K.abs(s2) > 1e-12) steps.push({ name: '平移', op: `+${texCoef(s2)}`, flow: flows.trans(s2) });
  return steps;
}

export function mountDecompose(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '原像 <b>z</b>', unitCircle: true });
  const wv = new PlaneView(b2, { title: '当前步骤的像', unitCircle: true });
  zv.setHome(0, 0, 2.4); wv.setHome(0, 0, 2.6);
  // 演示区域：左边逐像素画出，右边经当前矩阵 Mt 由 GPU 推前（与映射实验室同一套着色器）
  const zLay = new SourcePlane(zv), wLay = new PushedLayer(wv);
  zLay.setMap(IDENTITY_MAP); wLay.setMap(MOBIUS_MAP);
  const s = { v: [...PRE[0].v], dom: PRE[0].dom, t: 0, grid: true };
  let steps = [], mats = [], M = ID, Mt = ID, src = null;
  // 网格线：直角网格 [-3,3]²
  const lines = [];
  for (let k = -6; k <= 6; k++) {
    lines.push({ pts: segment(K.C(k * 0.5, -3), K.C(k * 0.5, 3), 120), fam: 0, t: (k + 6) / 12, axis: k === 0 });
    lines.push({ pts: segment(K.C(-3, k * 0.5), K.C(3, k * 0.5), 120), fam: 1, t: (k + 6) / 12, axis: k === 0 });
  }
  const unit = circlePts(K.ZERO, 1, 200);
  const g = (z) => K.mobius(Mt, z);
  zv.overlays.push((ctx, v) => {
    if (s.grid) for (const L of lines) strokePath(ctx, v, L.pts, { color: lineColor(L), width: L.axis ? 1.6 : 1, casing: false, alpha: 0.75 });
    for (const B of src.boundary) strokePath(ctx, v, B.pts, { color: B.color, width: 3 });
    strokePath(ctx, v, unit, { color: '#fff', width: 1.2, dash: [4, 4] });
  });
  wv.overlays.push((ctx, v) => {
    const proj = (w) => v.toScreen(w), o = { W: v.W, H: v.H };
    if (s.grid) for (const L of lines) strokePath(ctx, v, mapCurve(g, L.pts, proj, o), { color: lineColor(L), width: L.axis ? 1.6 : 1, casing: false, alpha: 0.75, maxJump: 80 });
    for (const B of src.boundary) strokePath(ctx, v, mapCurve(g, B.pts, proj, o), { color: B.color, width: 3, maxJump: 80 });
  });

  const inputs = ['a', 'b', 'c', 'd'].map((n, i) => {
    const inp = h('input', { class: 'text-input', value: s.v[i], spellcheck: 'false' });
    inp.addEventListener('change', () => { s.v[i] = inp.value; rebuild(); });
    return { inp, el: h('label', { class: 'ctl', style: 'flex:1' }, h('span', { class: 'ctl-label' }, n), inp) };
  });
  const err = h('div', { class: 'err-msg' });
  const preSel = select({ label: '预设', options: PRE.map((p, i) => ({ value: i, label: p.name })), value: 0, onChange: (v) => { const p = PRE[+v]; s.v = [...p.v]; s.dom = p.dom; inputs.forEach((x, i) => (x.inp.value = s.v[i])); domSel.value = s.dom; rebuild(); } });
  const domSel = select({ label: '演示区域', options: ['uhp', 'disk', 'halfdisk', 'rect', 'strip'].map((k) => ({ value: k, label: DOMAINS[k].name })), value: s.dom, onChange: (v) => { s.dom = v; rebuild(); } });
  const tG = toggle({ label: '直角网格', value: s.grid, onChange: (v) => { s.grid = v; zv.redraw(); wv.redraw(); } });
  const fBox = h('div', { class: 'formula-box' });
  const stepper = h('div', { class: 'stepper' });
  const play = player({ max: 1, value: 0, speed: 0.12, onFrame: (t) => setT(t), fmt: (v) => `${(v * steps.length).toFixed(2)} / ${steps.length}` });
  const stepNote = note('');
  panel.append(
    group('w = (az + b)/(cz + d)', preSel.el, h('div', { class: 'expr-row' }, ...inputs.map((x) => x.el)), err, domSel.el, tG.el),
    group('分解', fBox, stepper, play.el, stepNote),
    group('原理', note('当 $c\\ne0$ 时 $$\\frac{az+b}{cz+d}=\\frac ac+\\frac{bc-ad}{c^2}\\cdot\\frac{1}{z+\\frac dc}$$ 所以任何分式线性变换都由<b>平移、倒数 $1/z$、旋转伸缩</b>复合而成。$1/z$ 是关于单位圆的反演再关于实轴对称，在黎曼球面上就是绕实轴转半圈（第 03 章），动画按此连续实现。')),
  );
  renderMath(panel);

  function rebuild() {
    let vals;
    try { vals = s.v.map((x) => compile(x).js(K.ZERO, {})); err.textContent = ''; }
    catch (e) { err.textContent = e.message; return; }
    const [a, b, c, d] = vals;
    if (K.abs(K.sub(K.mul(a, d), K.mul(b, c))) < 1e-12) { err.textContent = 'ad − bc = 0：退化为常数，不是分式线性变换'; return; }
    M = [a, b, c, d];
    steps = decompose(a, b, c, d);
    mats = [ID];
    for (const st of steps) mats.push(K.matMul(st.flow(1), mats[mats.length - 1]));
    setTex(fBox, `w=${mobiusTex(M, 'z', 3)}`, true);
    stepper.innerHTML = '';
    stepper.append(h('div', { class: 'step', onclick: () => { play.stop(); play.set(0); } }, h('span', { class: 'st-name' }, '开始'), h('span', { class: 'st-tex', html: tex('z') })));
    steps.forEach((st, i) => {
      stepper.append(h('div', { class: 'step-arrow', html: tex(st.op) }));
      stepper.append(h('div', { class: 'step', onclick: () => { play.stop(); play.set((i + 1) / steps.length); } }, h('span', { class: 'st-name' }, st.name), h('span', { class: 'st-tex', html: tex(`\\zeta_{${i + 1}}`) })));
    });
    const D = DOMAINS[s.dom];
    src = domainSource(D);
    for (const lay of [zLay, wLay]) { lay.pattern.grid = DOMAIN_GRID[s.dom]; lay.setSource(src); }
    zv.setHome(...D.view);
    setT(play.value);
  }
  function setT(t) {
    s.t = t;
    const n = steps.length, x = Math.min(n - 1e-9, t * n), i = Math.floor(x), u = x - i;
    Mt = t >= 1 ? mats[n] : K.matMul(steps[i].flow(u), mats[i]);
    wLay.uniforms = matUniforms(Mt);
    [...stepper.querySelectorAll('.step')].forEach((el, k) => el.classList.toggle('on', k === Math.round(t * n)));
    const cur = t >= 1 ? n : x <= 1e-9 ? 0 : i + 1;
    const st = steps[cur - 1];
    stepNote.innerHTML = cur === 0 ? '原始区域与网格。点击 ▶ 逐步播放，或点击上方步骤跳转。'
      : `第 ${cur} 步：${st.name}（$${st.op}$）。${st.name === '倒数' ? '黎曼球面绕实轴旋转半圈：±1 保持不动，单位圆内外互换。' : st.name === '平移' ? '平移只移动位置，形状不变。' : '旋转伸缩以原点为中心，形状相似。'}`;
    renderMath(stepNote);
    zv.redraw(); wv.redraw();
  }
  rebuild();
  return {};
}
