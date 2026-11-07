// 第 7 章 · 标签 1：单位圆盘的自同构 φ(z) = e^{iθ}(z − a)/(1 − āz)，双曲几何视角
import * as K from '../../core/complex.js';
import { h, slider, group, readouts, note, setTex, renderMath, toggle } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { DomainMesh } from '../../core/mesh.js';
import { renderer, mobiusShader, matUniforms } from '../../core/gl.js';
import { mapCurve, circlePts } from '../../core/mapcurve.js';
import { strokePath, dot, label } from '../../core/draw.js';
import { cx, num, deg, texCx, texNum } from '../../core/format.js';
import { player } from '../common.js';

// 双曲网格：以 0 为中心的双曲圆（欧氏同心圆）与测地线（直径）
function hypGrid() {
  const out = [];
  for (let k = 1; k <= 6; k++) { const r = Math.tanh(k * 0.35); out.push({ pts: circlePts(K.ZERO, r, 200), c: 'rgba(255,214,120,0.75)' }); }
  for (let k = 0; k < 12; k++) {
    const th = (k * Math.PI) / 12, pts = [];
    for (let i = -100; i <= 100; i++) pts.push(K.polar(0.999 * i / 100, th));
    out.push({ pts, c: 'rgba(120,200,255,0.75)' });
  }
  return out;
}
const GRID = hypGrid();
// 过两点的测地线（与单位圆正交的圆弧）
function geodesic(p, q, n = 120) {
  const T = [K.ONE, K.neg(p), K.neg(K.conj(p)), K.ONE], Ti = K.matInv(T);
  const qq = K.mobius(T, q), d = K.scale(qq, 1 / (K.abs(qq) || 1)), pts = [];
  for (let i = -n; i <= n; i++) pts.push(K.mobius(Ti, K.scale(d, 0.9995 * i / n)));
  return pts;
}

export function mountAutomorphism(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>z</b>：单位圆盘', unitCircle: true });
  const wv = new PlaneView(b2, { title: '<b>w = φ(z)</b>：仍是单位圆盘', unitCircle: true });
  zv.setHome(0, 0, 1.25); wv.setHome(0, 0, 1.25);
  const s = { a: K.C(0.45, 0.25), th: 0, t: 1, p: K.C(-0.4, 0.3), q: K.C(0.2, -0.5), fill: true, bg: true };
  const zMesh = new DomainMesh(100, 100, [8, 24]), wMesh = new DomainMesh(100, 100, [8, 24]);
  const param = (u, v) => K.polar(Math.tanh(u * 2.4), 2 * Math.PI * v);
  zMesh.setDomain(param); wMesh.setDomain(param);
  const Z = zMesh.map(); zMesh.setGeometry(Z.pos, Z.tris);
  zv.glLayers.push((r, v, dpr) => s.fill && zMesh.draw(r, v, dpr, { alpha: 0.55 }));
  wv.glLayers.push((r, v, dpr) => s.fill && wMesh.draw(r, v, dpr, { alpha: 0.55 }));
  const prog = renderer().ok ? renderer().program(mobiusShader()) : null;
  let M = null;
  // 当前（动画中）的 a_t = t·a、θ_t = t·θ
  const cur = () => ({ a: K.scale(s.a, s.t), th: s.th * s.t });
  const mat = () => { const { a, th } = cur(); return K.matMul([K.cis(th), K.ZERO, K.ZERO, K.ONE], [K.ONE, K.neg(a), K.neg(K.conj(a)), K.ONE]); };
  const f = (z) => K.mobius(M, z);
  const uni = () => ({ u_colorMode: s.bg ? 3 : 4, u_bright: 0.32, u_lines: 0, u_lineStep: 0.25 });
  zv.bg = () => ({ prog, uniforms: { ...uni(), ...matUniforms(M) } });
  wv.bg = () => ({ prog, uniforms: { ...uni(), ...matUniforms([K.ONE, K.ZERO, K.ZERO, K.ONE]) } });
  const pd = (p, q) => K.abs(K.div(K.sub(p, q), K.sub(K.ONE, K.mul(K.conj(p), q))));
  zv.overlays.push((ctx, v) => {
    for (const g of GRID) strokePath(ctx, v, g.pts, { color: g.c, width: 1.1, casing: false });
    strokePath(ctx, v, geodesic(s.p, s.q), { color: '#ff6b9a', width: 2.6 });
    const ai = K.inv(K.conj(cur().a));
    if (K.isFin(ai) && K.abs(ai) < 50) { dot(ctx, v, ai, '#ffffff', 4); const [x, y] = v.toScreen(ai); label(ctx, x + 7, y - 9, '1/ā ↦ ∞'); }
  });
  wv.overlays.push((ctx, v) => {
    const proj = (w) => v.toScreen(w), o = { W: v.W, H: v.H };
    for (const g of GRID) strokePath(ctx, v, mapCurve(f, g.pts, proj, o), { color: g.c, width: 1.1, casing: false });
    strokePath(ctx, v, mapCurve(f, geodesic(s.p, s.q), proj, o), { color: '#ff6b9a', width: 2.6 });
    for (const [z, t, c] of [[cur().a, 'φ(a) = 0', '#5cc8ff'], [s.p, 'φ(p)', '#ff6b9a'], [s.q, 'φ(q)', '#ff6b9a'], [K.ZERO, 'φ(0)', '#ffffff']]) {
      const w = f(z); dot(ctx, v, w, c, 4.5); const [x, y] = v.toScreen(w); label(ctx, x + 7, y - 9, t, c);
    }
  });
  zv.handles.push(
    { color: '#5cc8ff', r: 7, label: 'a', pos: () => s.a, move: (z) => { s.a = K.abs(z) > 0.97 ? K.scale(z, 0.97 / K.abs(z)) : z; update(); } },
    { color: '#ff6b9a', r: 6, label: 'p', pos: () => s.p, move: (z) => { s.p = K.abs(z) > 0.98 ? K.scale(z, 0.98 / K.abs(z)) : z; update(); } },
    { color: '#ff6b9a', r: 6, label: 'q', pos: () => s.q, move: (z) => { s.q = K.abs(z) > 0.98 ? K.scale(z, 0.98 / K.abs(z)) : z; update(); } },
  );
  const thSl = slider({ label: '旋转 θ', min: -Math.PI, max: Math.PI, value: s.th, fmt: (x) => deg(x), onInput: (x) => { s.th = x; update(); } });
  const play = player({ max: 1, value: 1, speed: 0.4, onFrame: (t) => { s.t = t; update(); }, fmt: (x) => `${(x * 100).toFixed(0)}%` });
  const tF = toggle({ label: '区域填充', value: s.fill, onChange: (x) => { s.fill = x; zv.redraw(); wv.redraw(); } });
  const tB = toggle({ label: '背景着色', value: s.bg, onChange: (x) => { s.bg = x; zv.redraw(); wv.redraw(); } });
  const fBox = h('div', { class: 'formula-box' });
  const ro = readouts([['a', 'a'], ['d', "φ′(a)"], ['d0', "φ′(0)"], ['pd', '伪双曲距离'], ['bd', '边界']]);
  panel.append(
    group('自同构 φ', fBox, thSl.el, h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, '从恒等连续变到 φ'), play.el), h('div', { class: 'toggles' }, tF.el, tB.el)),
    group('读数', ro.el),
    group('观察', note('拖动 <b class="c-acc">a</b>：$a\\mapsto0$，单位圆周映为自身。黄色的“同心圆”与蓝色直径构成以 0 为中心的<b>双曲坐标网</b>；它们的像是以 $\\varphi(0)$ 为中心的双曲圆与过它的<b>测地线</b>（与单位圆正交的圆弧）。粉色是过 p、q 的测地线：<b>自同构把测地线映为测地线</b>，并保持伪双曲距离 $\\left|\\frac{p-q}{1-\\bar pq}\\right|$。')),
  );
  renderMath(panel);
  function update() {
    M = mat();
    const B = wMesh.map(f); wMesh.setGeometry(B.pos, B.tris);
    const { a, th } = cur();
    setTex(fBox, `\\varphi(z)=e^{i\\theta}\\frac{z-a}{1-\\bar a z},\\quad a=${texCx(a)},\\ \\theta=${texNum((th * 180) / Math.PI, 1)}^\\circ`, true);
    const d = K.deriv(f, a), d0 = K.deriv(f, K.ZERO);
    ro.set('a', cx(a));
    ro.set('d', `${cx(d)}　|φ′(a)| = 1/(1−|a|²) = ${num(1 / (1 - K.abs2(a)))}`);
    ro.set('d0', `${cx(d0)}　|φ′(0)| = 1−|a|² = ${num(1 - K.abs2(a))}`);
    ro.set('pd', `ρ(p,q) = ${num(pd(s.p, s.q), 5)}　ρ(φp,φq) = ${num(pd(f(s.p), f(s.q)), 5)}`);
    let mx = 0; for (let k = 0; k < 64; k++) mx = Math.max(mx, Math.abs(K.abs(f(K.cis((k * Math.PI) / 32))) - 1));
    ro.set('bd', `max | |φ(e^{it})| − 1 | = ${mx.toExponential(1)}`);
    zv.redraw(); wv.redraw();
  }
  update();
  return {};
}
