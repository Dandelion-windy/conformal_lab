// 第 9 章 · 标签 1：基本平面势流（复势 W = φ + iψ）
import * as K from '../../core/complex.js';
import { h, select, slider, toggle, group, readouts, note, setTex, renderMath, button } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer } from '../../core/gl.js';
import { compile } from '../../core/compile.js';
import { dot, label } from '../../core/draw.js';
import { cx, num } from '../../core/format.js';
import { fieldShader } from './shader.js';
import { Particles } from './particles.js';

const PI = Math.PI;
const PRE = [
  { name: '均匀流', e: 'exp(-i*t)*z', tex: 'W=Ue^{-i\\alpha}z', t: { label: '方向 α', min: -1.57, max: 1.57, def: 0.3 }, dpsi: () => 0.25, view: [0, 0, 3],
    info: '速度 $\\overline{W\'}=Ue^{i\\alpha}$ 处处相同。流线是倾角为 $\\alpha$ 的平行直线，等势线与之正交。' },
  { name: '点源 / 点汇', e: 't/(2*pi)*log(z)', tex: 'W=\\frac{m}{2\\pi}\\log z', t: { label: '强度 m（负为汇）', min: -6, max: 6, def: 3 }, dpsi: (t) => Math.abs(t) / 16 || 0.1, view: [0, 0, 3],
    info: '$\\psi=\\frac{m}{2\\pi}\\arg z$：流线是从原点出发的射线，等势线是同心圆。速度 $|v|=\\frac{|m|}{2\\pi r}$，单位时间流出的流量为 $m$。' },
  { name: '点涡', e: '-i*t/(2*pi)*log(z)', tex: 'W=\\frac{\\Gamma}{2\\pi i}\\log z', t: { label: '环量 Γ', min: -12, max: 12, def: 6 }, dpsi: (t) => Math.abs(t) / 24 || 0.1, view: [0, 0, 3],
    info: '与点源互为“共轭”：流线是同心圆，等势线是射线。沿任意绕原点的闭曲线，环量 $\\oint v\\cdot ds=\\Gamma$。' },
  { name: '偶极子', e: 't/z', tex: 'W=\\frac{\\mu}{z}', t: { label: '强度 μ', min: 0.2, max: 3, def: 1 }, dpsi: (t) => t / 8, view: [0, 0, 2.5],
    info: '源与汇无限靠近的极限。流线是在原点与实轴相切的圆族 $\\frac{-\\mu y}{x^2+y^2}=c$。' },
  { name: '角形区域内的流动', e: 'z^t', tex: 'W=z^{n}', t: { label: 'n（夹角 π/n）', min: 1, max: 4, def: 2 }, dpsi: () => 0.2, view: [0.9, 0.7, 1.7],
    glsl: 'bool solid(vec2 z) { float a = atan(z.y, z.x); return !(a > 0.0 && a < PI / u_pt); }', js: (x, y, t) => { const a = Math.atan2(y, x); return !(a > 0 && a < PI / t); },
    info: '$z^n$ 把角形域 $0<\\arg z<\\frac\\pi n$ 映为上半平面，上半平面中的均匀流 $W=\\zeta$ 拉回即得角内的流动。$n=2$ 是直角内的流动（流线是双曲线 $xy=c$），原点是驻点。' },
  { name: '绕圆柱', e: 'z+1/z', tex: 'W=U\\left(z+\\frac{R^2}{z}\\right)', t: null, dpsi: () => 0.2, view: [0, 0, 3],
    glsl: 'bool solid(vec2 z) { return dot(z, z) < 1.0; }', js: (x, y) => x * x + y * y < 1,
    info: '均匀流 + 偶极子。$|z|=R$ 上 $\\psi=U\\left(r-\\frac{R^2}{r}\\right)\\sin\\theta=0$，所以圆周是一条流线（不可穿透）。驻点在 $\\pm R$，圆柱顶部速度最大为 $2U$。' },
  { name: '有环量的绕圆柱', e: 'z+1/z-i*t/(2*pi)*log(z)', tex: 'W=U\\left(z+\\frac{R^2}{z}\\right)+\\frac{\\Gamma}{2\\pi i}\\log z', t: { label: '环量 Γ', min: -20, max: 20, def: -6 }, dpsi: () => 0.2, view: [0, 0, 3],
    glsl: 'bool solid(vec2 z) { return dot(z, z) < 1.0; }', js: (x, y) => x * x + y * y < 1,
    info: '驻点满足 $\\sin\\theta=\\frac{\\Gamma}{4\\pi UR}$：$|\\Gamma|<4\\pi UR$ 时两个驻点在圆周上；$|\\Gamma|=4\\pi UR$ 时合并；更大时离开圆柱。<b>Kutta–Joukowski 定理</b>：升力 $L=-\\rho U\\Gamma$（垂直于来流），这就是马格努斯效应。' },
  { name: '源汇对', e: 't/(2*pi)*log((z+1)/(z-1))', tex: 'W=\\frac{m}{2\\pi}\\log\\frac{z+1}{z-1}', t: { label: '强度 m', min: 0.5, max: 8, def: 4 }, dpsi: (t) => t / 16, view: [0, 0, 2.5],
    info: '源在 $-1$，汇在 $1$。流线是过 $\\pm1$ 的圆弧（施泰纳圆），等势线是以 $\\pm1$ 为对称点的阿波罗尼斯圆——与第 03 章分式线性变换 $\\frac{z+1}{z-1}$ 的不变圆族一致。' },
  { name: '兰金半体', e: 'z+t/(2*pi)*log(z)', tex: 'W=Uz+\\frac{m}{2\\pi}\\log z', t: { label: '源强度 m', min: 0.5, max: 8, def: 3 }, dpsi: () => 0.2, view: [0.5, 0, 3],
    glsl: 'bool solid(vec2 z) { return abs(W(z).y) < 0.5 * u_pt; }', js: null,
    info: '均匀流 + 点源。源流出的流体被来流包住，分界流线 $\\psi=\\pm\\frac m2$ 围成“半无限物体”（灰色）。驻点在 $z=-\\frac{m}{2\\pi U}$，物体在下游的半宽趋于 $\\frac{m}{2U}$。' },
];

export function mountBasic(stage, panel) {
  const b1 = h('div'); stage.append(b1);
  const v = new PlaneView(b1, { title: '流线 ψ = 常数（白）与等势线 φ = 常数（橙）', unitCircle: false });
  const s = { i: 5, t: 0, phi: true, psi: true, bg: true, parts: true, dens: 1 };
  let fn = null, prog = null, solidJS = () => false, stag = [];
  const P = () => ({ t: K.C(s.t) });
  const W = (z) => fn.js(z, P());
  const Wp = (z) => K.deriv(W, z, 1e-5);
  const vel = (x, y) => { if (!fn) return null; const d = Wp(K.C(x, y)); return [d.re, -d.im]; };
  v.bg = () => ({ prog, uniforms: { u_pt: s.t, u_dpsi: PRE[s.i].dpsi(s.t) / s.dens, u_dphi: PRE[s.i].dpsi(s.t) / s.dens, u_U: 1, u_showPhi: s.phi ? 1 : 0, u_showPsi: s.psi ? 1 : 0, u_bg: s.bg ? 1 : 0, u_base: 0 } });
  const parts = new Particles(v, vel, (x, y) => solidJS(x, y), 650);
  v.overlays.push((ctx, view) => {
    for (const z of stag) { dot(ctx, view, z, '#ff6b9a', 5); const [x, y] = view.toScreen(z); label(ctx, x + 8, y - 10, '驻点', '#ff6b9a'); }
  });
  const sel = select({ label: '流动', options: PRE.map((p, i) => ({ value: i, label: p.name })), value: s.i, onChange: (x) => load(+x) });
  const tSl = slider({ label: '参数', min: 0, max: 1, value: 0, onInput: (x) => { s.t = x; refresh(); } });
  const exprIn = h('input', { class: 'text-input', spellcheck: 'false', placeholder: '自定义复势 W(z)，可用参数 t' });
  const err = h('div', { class: 'err-msg' });
  exprIn.addEventListener('keydown', (e) => { if (e.key !== 'Enter') return; try { setExpr(exprIn.value, null); err.textContent = ''; exprIn.classList.remove('err'); } catch (x) { err.textContent = x.message; exprIn.classList.add('err'); } });
  const tg = (lab, key) => toggle({ label: lab, value: s[key], onChange: (x) => { s[key] = x; if (key === 'parts') { parts.on = x; } v.redraw(); } });
  const densSl = slider({ label: '线的密度', min: 0.5, max: 3, value: 1, onInput: (x) => { s.dens = x; v.redraw(); } });
  const fBox = h('div', { class: 'formula-box' });
  const info = note('');
  const ro = readouts([['z', 'z'], ['W', 'W = φ + iψ'], ['v', '速度 v = conj(W′)'], ['sp', '|v|'], ['cp', '压强系数 Cₚ']]);
  panel.append(
    group('复势', sel.el, fBox, tSl.el, h('div', { class: 'ctl' }, exprIn, err)),
    group('显示', h('div', { class: 'toggles' }, tg('流线 ψ', 'psi').el, tg('等势线 φ', 'phi').el, tg('速度背景', 'bg').el, tg('示踪粒子', 'parts').el), densSl.el, button('重新投放粒子', () => { parts.reset(); parts.calibrate(); }, 'small')),
    group('说明', info),
    group('读数（鼠标悬停）', ro.el),
  );
  renderMath(panel);
  v.onHover = (z) => {
    if (!z) return;
    const w = W(z), d = Wp(z), sp = K.abs(d);
    ro.set('z', cx(z)); ro.set('W', cx(w)); ro.set('v', cx(K.conj(d))); ro.set('sp', num(sp)); ro.set('cp', num(1 - sp * sp));
  };
  v.onView = () => { if (fn) parts.calibrate(); };
  function setExpr(src, pre) {
    fn = compile(src);
    const body = `vec2 W(vec2 z) { return ${fn.glsl}; }\n${pre?.glsl || 'bool solid(vec2 z) { return false; }'}`;
    prog = renderer().ok ? renderer().program(fieldShader(body, 'flow')) : null;
    solidJS = pre?.js ? (x, y) => pre.js(x, y, s.t) : pre?.glsl ? (x, y) => Math.abs(W(K.C(x, y)).im) < 0.5 * s.t : () => false;
    refresh();
  }
  function findStagnation() {
    const b = v.bounds(), out = [];
    for (let i = 0; i <= 16; i++) for (let j = 0; j <= 12; j++) {
      let z = K.C(b.xmin + ((b.xmax - b.xmin) * i) / 16, b.ymin + ((b.ymax - b.ymin) * j) / 12);
      for (let k = 0; k < 30; k++) {
        const d = Wp(z), d2 = K.deriv(Wp, z, 1e-4), st = K.div(d, d2);
        if (!K.isFin(st)) break;
        z = K.sub(z, st);
        if (K.abs(st) < 1e-10) break;
      }
      if (!K.isFin(z) || K.abs(Wp(z)) > 1e-6 || z.re < b.xmin || z.re > b.xmax || z.im < b.ymin || z.im > b.ymax) continue;
      if (solidJS(z.re + 1e-6, z.im) && solidJS(z.re - 1e-6, z.im) && solidJS(z.re, z.im + 1e-6) && solidJS(z.re, z.im - 1e-6)) continue;
      if (out.every((q) => K.abs(K.sub(q, z)) > 1e-3)) out.push(z);
    }
    return out;
  }
  function refresh() {
    stag = findStagnation();
    parts.calibrate();
    v.redraw();
  }
  function load(i) {
    s.i = i;
    const p = PRE[i];
    tSl.el.hidden = !p.t;
    if (p.t) {
      tSl.input.min = p.t.min; tSl.input.max = p.t.max; tSl.input.step = (p.t.max - p.t.min) / 400;
      tSl.el.querySelector('.ctl-label').textContent = p.t.label;
      s.t = p.t.def; tSl.value = s.t;
    }
    setTex(fBox, p.tex, true);
    info.innerHTML = p.info; renderMath(info);
    exprIn.value = p.e;
    v.setHome(...p.view);
    setExpr(p.e, p);
    parts.reset();
  }
  load(s.i);
  return { show() { parts.start(); }, hide() { parts.stop(); } };
}
