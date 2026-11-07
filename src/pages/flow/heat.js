// 第 9 章 · 标签 3：稳态温度场 / 静电场——用共形映射解拉普拉斯方程的狄利克雷问题
import * as K from '../../core/complex.js';
import { h, select, toggle, group, readouts, note, setTex, renderMath, slider } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer } from '../../core/gl.js';
import { compile } from '../../core/compile.js';
import { segment, circlePts } from '../../core/mapcurve.js';
import { strokePath } from '../../core/draw.js';
import { cx, num } from '../../core/format.js';
import { fieldShader } from './shader.js';

const PI = Math.PI, R = 60;
const hot = '#ff6b5a', cold = '#5aa8ff', warm = '#ffd27a';
const tc = (T) => (T >= 0.99 ? hot : T <= 0.01 ? cold : warm);
// 映到上半平面的 φ；实轴分点 xs 与各段温度 cs（共 xs.length+1 段）
const PRE = [
  { name: '上半平面：左半边界 T=1，右半 T=0', phi: 'z', ptex: '\\zeta=z', xs: [0], cs: [1, 0], view: [0, 1.2, 2.4], solid: 'z.y < 0.0',
    bd: [[segment(K.C(-R), K.C(0), 400), 1], [segment(K.C(0), K.C(R), 400), 0]], sol: 'u=\\frac{1}{\\pi}\\arg z' },
  { name: '上半平面：|x|<1 为 T=1，其余 T=0', phi: 'z', ptex: '\\zeta=z', xs: [-1, 1], cs: [0, 1, 0], view: [0, 1.2, 2.4], solid: 'z.y < 0.0',
    bd: [[segment(K.C(-R), K.C(-1), 400), 0], [segment(K.C(-1), K.C(1), 100), 1], [segment(K.C(1), K.C(R), 400), 0]], sol: 'u=\\frac1\\pi\\left[\\arg(z-1)-\\arg(z+1)\\right]' },
  { name: '单位圆盘：上半圆周 T=1，下半圆周 T=0', phi: 'i*(1+z)/(1-z)', ptex: '\\zeta=i\\frac{1+z}{1-z}', xs: [0], cs: [1, 0], view: [0, 0, 1.3], solid: 'dot(z, z) > 1.0',
    bd: [[circlePts(K.ZERO, 1, 200, 0, PI), 1], [circlePts(K.ZERO, 1, 200, PI, 2 * PI), 0]], sol: 'u=\\frac1\\pi\\arg\\left(i\\frac{1+z}{1-z}\\right)=\\frac12+\\frac1\\pi\\arctan\\frac{2y}{1-x^2-y^2}' },
  { name: '单位圆盘：四段圆弧交替 1, 0, 1, 0', phi: 'i*(1+z)/(1-z)', ptex: '\\zeta=i\\frac{1+z}{1-z}', xs: [-1, 0, 1], cs: [1, 0, 1, 0], view: [0, 0, 1.3], solid: 'dot(z, z) > 1.0',
    bd: [0, 1, 2, 3].map((k) => [circlePts(K.ZERO, 1, 100, (k * PI) / 2, ((k + 1) * PI) / 2), k % 2 === 0 ? 1 : 0]), sol: 'u=\\frac1\\pi\\left[\\arg(\\zeta+1)-\\arg\\zeta+\\arg(\\zeta-1)\\right]' },
  { name: '第一象限：x 轴 T=0，y 轴 T=1', phi: 'z^2', ptex: '\\zeta=z^2', xs: [0], cs: [1, 0], view: [1, 1, 1.8], solid: 'z.x < 0.0 || z.y < 0.0',
    bd: [[segment(K.C(0), K.C(R), 400), 0], [segment(K.C(0), K.C(0, R), 400), 1]], sol: 'u=\\frac{2}{\\pi}\\arg z' },
  { name: '带形 0<Im z<π：下边 T=0，上边 T=1', phi: 'exp(z)', ptex: '\\zeta=e^{z}', xs: [0], cs: [1, 0], view: [0, 1.57, 3], solid: 'z.y < 0.0 || z.y > PI',
    bd: [[segment(K.C(-R), K.C(R), 400), 0], [segment(K.C(-R, PI), K.C(R, PI), 400), 1]], sol: 'u=\\frac{y}{\\pi}' },
  { name: '半带形：底边 T=1，两侧 T=0', phi: 'sin(z)', ptex: '\\zeta=\\sin z', xs: [-1, 1], cs: [0, 1, 0], view: [0, 1.4, 2.2], solid: 'abs(z.x) > 0.5 * PI || z.y < 0.0',
    bd: [[segment(K.C(-PI / 2, R), K.C(-PI / 2, 0), 400), 0], [segment(K.C(-PI / 2), K.C(PI / 2), 100), 1], [segment(K.C(PI / 2), K.C(PI / 2, R), 400), 0]], sol: 'u=\\frac1\\pi\\left[\\arg(\\sin z-1)-\\arg(\\sin z+1)\\right]' },
  { name: '同心圆环：内圆 T=1，外圆 T=0', direct: (r) => `i*log(z)/${Math.log(r).toFixed(9)}`, r: 0.3, view: [0, 0, 1.3], solid: (r) => `dot(z, z) > 1.0 || dot(z, z) < ${(r * r).toFixed(9)}`,
    bd: (r) => [[circlePts(K.ZERO, 1, 240), 0], [circlePts(K.ZERO, r, 160), 1]], sol: (r) => `u=\\frac{\\ln|z|}{\\ln ${num(r)}}` },
  { name: '偏心圆环（先用分式线性变换化为同心）', ecc: true, c0: 0.35, rho: 0.3, view: [0, 0, 1.3] },
];

// 偏心圆环：求关于两圆都对称的实点 p（|p|<1），T(z) = (z − p)/(1 − pz) 把两圆变为同心圆
function eccentric(c0, rho) {
  const b = 1 + c0 * c0 - rho * rho, disc = Math.sqrt(b * b - 4 * c0 * c0);
  const p = [(b - disc) / (2 * c0), (b + disc) / (2 * c0)].find((x) => Math.abs(x) < 1);
  const T = (z) => K.div(K.sub(z, K.C(p)), K.sub(K.ONE, K.scale(z, p)));
  const r = K.abs(T(K.C(c0 + rho)));
  return { p, r, T };
}

export function mountHeat(stage, panel) {
  const b1 = h('div'); stage.append(b1);
  const v = new PlaneView(b1, { title: '温度 u（颜色），等温线（白），热流线（暗）' });
  const s = { i: 2, iso: true, flux: true, bg: true, n: 10 };
  let prog = null, fjs = null, base = 0, bd = [];
  v.bg = () => ({ prog, uniforms: { u_dpsi: 1 / s.n, u_dphi: 1 / s.n, u_U: 1, u_showPhi: s.flux ? 1 : 0, u_showPsi: s.iso ? 1 : 0, u_bg: s.bg ? 1 : 0, u_base: base } });
  v.overlays.push((ctx, view) => { for (const [pts, T] of bd) strokePath(ctx, view, pts, { color: tc(T), width: 4 }); });
  const sel = select({ label: '区域与边界温度', options: PRE.map((p, i) => ({ value: i, label: p.name })), value: s.i, onChange: (x) => load(+x) });
  const fBox = h('div', { class: 'formula-box' });
  const tg = (lab, key) => toggle({ label: lab, value: s[key], onChange: (x) => { s[key] = x; v.redraw(); } });
  const nSl = slider({ label: '等温线条数', min: 4, max: 24, step: 1, value: s.n, fmt: (x) => String(x), onInput: (x) => { s.n = x; v.redraw(); } });
  const ro = readouts([['z', 'z'], ['u', '温度 u(z)']]);
  panel.append(
    group('问题', sel.el, fBox),
    group('显示', h('div', { class: 'toggles' }, tg('等温线', 'iso').el, tg('热流线', 'flux').el, tg('温度着色', 'bg').el), nSl.el),
    group('读数', ro.el),
    group('方法', note('拉普拉斯方程在共形映射下保持不变：若 $\\zeta=\\varphi(z)$ 解析且 $U(\\zeta)$ 调和，则 $u=U\\circ\\varphi$ 也调和，边界值随边界一起对应。上半平面中，边界值在 $x_k$ 处从 $c_{k-1}$ 跳到 $c_k$ 的解为 $$U=c_n+\\sum_k\\frac{c_{k-1}-c_k}{\\pi}\\arg(\\zeta-x_k)$$ 它是解析函数 $F=\\sum_k\\frac{c_{k-1}-c_k}{\\pi}\\log(\\zeta-x_k)$ 的虚部；$\\operatorname{Re}F=$ 常数 就是与等温线正交的热流线。换成静电场：$u$ 是电势，边界是保持定电压的导体。')),
  );
  renderMath(panel);
  v.onHover = (z) => {
    if (!z || !fjs) return;
    ro.set('z', cx(z)); ro.set('u', num(base + fjs(z).im, 4));
  };
  function load(i) {
    s.i = i;
    const p = PRE[i];
    let glsl, solid, tx;
    if (p.ecc) {
      const E = eccentric(p.c0, p.rho);
      const pf = E.p.toFixed(9), lr = Math.log(E.r).toFixed(9);
      glsl = `vec2 W(vec2 z) { vec2 t = cdiv(z - vec2(${pf}, 0.0), vec2(1.0, 0.0) - ${pf} * z); vec2 L = clog(t); return vec2(-L.y, L.x) / ${lr}; }`;
      solid = `dot(z, z) > 1.0 || length(z - vec2(${p.c0}, 0.0)) < ${p.rho}`;
      fjs = (z) => { const L = K.log(E.T(z)); return K.scale(K.C(-L.im, L.re), 1 / Math.log(E.r)); };
      base = 0;
      bd = [[circlePts(K.ZERO, 1, 240), 0], [circlePts(K.C(p.c0), p.rho, 160), 1]];
      tx = `T(z)=\\frac{z-p}{1-pz},\\ p=${num(E.p, 4)}\\ \\Rightarrow\\ \\text{同心圆环 } ${num(E.r, 4)}<|T|<1\\\\ u=\\frac{\\ln|T(z)|}{\\ln ${num(E.r, 4)}}`;
    } else if (p.direct) {
      const e = p.direct(p.r), f = compile(e);
      glsl = `vec2 W(vec2 z) { return ${f.glsl}; }`; solid = p.solid(p.r); fjs = (z) => f.js(z, {}); base = 0; bd = p.bd(p.r);
      tx = p.sol(p.r);
    } else {
      const ph = compile(p.phi);
      const n = p.xs.length, a = p.xs.map((_, k) => (p.cs[k] - p.cs[k + 1]) / PI);
      base = p.cs[n];
      const terms = p.xs.map((x, k) => `${a[k].toFixed(9)} * clog(p - vec2(${x.toFixed(9)}, 0.0))`).join(' + ');
      glsl = `vec2 W(vec2 z) { vec2 p = ${ph.glsl}; return ${terms}; }`;
      solid = p.solid;
      fjs = (z) => { const q = ph.js(z, {}); let r = K.ZERO; p.xs.forEach((x, k) => { r = K.add(r, K.scale(K.log(K.sub(q, K.C(x))), a[k])); }); return r; };
      bd = p.bd;
      tx = `${p.ptex}\\ \\ (\\text{映为上半平面})\\\\ ${p.sol}`;
    }
    prog = renderer().ok ? renderer().program(fieldShader(`${glsl}\nbool solid(vec2 z) { return ${solid}; }`, 'heat')) : null;
    setTex(fBox, `\\begin{gathered}${tx}\\end{gathered}`, true);
    v.setHome(...p.view);
    v.redraw();
  }
  load(s.i);
  return {};
}
