// 第 3 章 · 标签 3：黎曼球面 = 复平面关于球面 K 的空间反演（K 的球心为北极 N，半径 √2）
import * as K from '../../core/complex.js';
import { h, segmented, toggle, group, readouts, note, renderMath, setTex } from '../../core/ui.js';
import { SphereView } from '../../core/sphere3d.js';
import { renderer } from '../../core/gl.js';
import { sphereShader } from '../../core/sphere-shader.js';
import { vsub, vlen, vlerp } from '../../core/vec3.js';
import { sampleGC } from '../../core/circle.js';
import { num } from '../../core/format.js';
import { COL } from './common.js';

export const NP = [0, 0, 1];
const RK = Math.SQRT2, PR = 3.2;
export const flat = (z) => [z.re, z.im, 0];
const ballPt = (th, ph) => [RK * Math.sin(th) * Math.cos(ph), RK * Math.sin(th) * Math.sin(ph), 1 + RK * Math.cos(th)];
// K 的线框：绕竖直轴的纬线圈与三个经线大圆（θ = 3π/4 的纬线圈就是赤道，单独画）
const WIRE = [
  ...[0.6, 1.2, 1.8, 2.8].map((th) => Array.from({ length: 121 }, (_, i) => ballPt(th, (2 * Math.PI * i) / 120))),
  ...[0, 1, 2].map((k) => Array.from({ length: 241 }, (_, i) => ballPt((2 * Math.PI * i) / 240, (k * Math.PI) / 3))),
];
export const EQUATOR = Array.from({ length: 161 }, (_, i) => [Math.cos((2 * Math.PI * i) / 160), Math.sin((2 * Math.PI * i) / 160), 0]);

// 从 N 出发经过球面点 P 与平面点 z 的射线（平面点超出画出的圆盘时截断）
export function projRay(sv, ctx, z, style) {
  const P = sv.toSphere(z), Z = flat(z), r = K.abs(z);
  const end = vlen(vsub(P, NP)) > vlen(vsub(Z, NP)) ? P : r > PR ? vlerp(NP, Z, PR / r) : Z;
  sv.curve(ctx, Array.from({ length: 41 }, (_, i) => vlerp(NP, end, i / 40)), { casing: false, hiddenAlpha: 0.3, ...style });
}
// 平面上的曲线（超出圆盘的部分断开）与它在球面上的像（∞ ↦ N）
export const inDisk = (pts) => pts.map((z) => (z && K.isFin(z) && K.abs(z) < PR * 0.995 ? flat(z) : null));
export const onSphere = (sv, pts) => pts.map((z) => (z ? sv.toSphere(z) : NP));

export function mountStereo(stage, panel) {
  const box = h('div'); stage.append(box);
  const sv = new SphereView(box, { title: '以 N 为球心、半径 $\\sqrt2$ 的球面 K 作空间反演：复平面 ↦ 黎曼球面', plane: true, planeR: PR, sAlpha: 0.6, pAlpha: 0.9 });
  renderMath(box);
  sv.prog = renderer().program(sphereShader('z'));
  sv.uniforms = { u_colorMode: 3, u_bright: 0.8, u_lines: 0, u_lineStep: 0.5 };
  sv.cam.dist = 8.4; sv.cam.pitch = 0.3; sv.cam.target = [0, 0, 0.55];
  const s = { mode: 'point', K: true, z: K.C(1.7, 0.9), c: K.C(1.1, -0.9), cr: K.C(1.75, -0.9), a: K.C(-1.6, 1.4), b: K.C(1.4, 0.9) };
  const circ = () => ({ line: false, c: s.c, r: K.dist(s.c, s.cr) });
  const line = () => ({ line: true, p: s.a, d: K.scale(K.sub(s.b, s.a), 1 / (K.dist(s.a, s.b) || 1)) });
  sv.overlays.push((ctx) => {
    if (s.K) for (const c of WIRE) sv.curve(ctx, c, { color: 'rgba(167,139,250,0.55)', width: 1, casing: false, hiddenAlpha: 0.16 });
    sv.curve(ctx, EQUATOR, { color: COL.gamma, width: 3 });
    if (s.mode === 'point') {
      projRay(sv, ctx, s.z, { color: '#ffffff', width: 1.6 });
      sv.point(ctx, sv.toSphere(s.z), COL.img, 5, 'P = I_K(z)');
    } else if (s.mode === 'circle') {
      const pts = sampleGC(circ(), 200);
      for (let k = 0; k < 12; k++) projRay(sv, ctx, pts[Math.round((k * 200) / 12)], { color: 'rgba(255,180,84,0.5)', width: 0.9 });
      sv.curve(ctx, inDisk(pts), { color: COL.src, width: 2.6 });
      sv.curve(ctx, onSphere(sv, pts), { color: COL.img, width: 2.6 });
    } else {
      const pts = sampleGC(line(), 400);
      sv.curve(ctx, inDisk(pts), { color: COL.src, width: 2.6 });
      sv.curve(ctx, onSphere(sv, pts), { color: COL.img, width: 2.6 });
    }
    sv.point(ctx, NP, '#ffffff', 5, 'N：K 的球心 ↔ ∞');
    sv.point(ctx, [0, 0, -1], '#ffffff', 4, 'S ↔ 0');
  });
  const H = (key, color, lab, mode, kind = 'plane') => ({ kind, color, r: 6, label: lab, invisible: kind === 'sphere', hidden: () => s.mode !== mode, pos: () => s[key], move: (z) => { s[key] = z; update(); } });
  sv.handles.push(H('z', COL.src, 'z', 'point'), H('z', COL.src, '', 'point', 'sphere'),
    H('c', COL.src, '圆心', 'circle'), H('cr', '#ffd27a', '', 'circle'), H('a', COL.src, '', 'line'), H('b', COL.src, '', 'line'));

  const modeSeg = segmented({ label: '平面上的对象', options: [{ value: 'point', label: '点' }, { value: 'circle', label: '圆' }, { value: 'line', label: '直线' }], value: s.mode, onChange: (x) => { s.mode = x; update(); } });
  const tK = toggle({ label: '显示反演球面 K', value: s.K, onChange: (x) => { s.K = x; sv.redraw(); } });
  const fBox = h('div', { class: 'formula-box' });
  setTex(fBox, 'I_K:\\ X\\mapsto N+\\frac{2\\,(X-N)}{|X-N|^2},\\qquad |NX|\\cdot|NX^*|=2', true);
  const ro = readouts([['a', '|Nz|'], ['b', '|NP|'], ['ab', '|Nz|·|NP|'], ['im', '像']]);
  panel.append(
    group('设置', modeSeg.el, tK.el),
    group('空间反演', fBox, ro.el),
    group('为什么是黎曼球面', note(`
<b>K 与复平面 Π 交于单位圆</b>，单位圆上的点不动——它就是赤道。<br>
<b>Π 不过 N</b>，像是过 N 的球面；它含赤道，又含南极（$|NS|\\cdot|NO|=2\\cdot1=2$），所以就是单位球面 S。平面上越远的点越靠近 N，$\\infty\\mapsto N$。<br>
<b>不用再算的结论</b>：空间反演把球面、平面变成球面、平面，又保角。平面上的圆是 Π 与某个球面的交线，像是 S 上的圆；直线的像过 N；球极投影保角。`)),
    group('操作', note('拖动平面上的点（或球面上的 P）、圆心与半径点、直线上两点；拖动空白处旋转视角，滚轮缩放。')),
  );
  renderMath(panel);

  function update() {
    if (s.mode === 'point') {
      const a = Math.hypot(1, K.abs(s.z)), b = vlen(vsub(sv.toSphere(s.z), NP));
      ro.set('a', num(a)); ro.set('b', num(b)); ro.set('ab', num(a * b));
      ro.set('im', K.abs(s.z) < 1 ? '|z| < 1：P 在南半球，比 z 离 N 更远' : '|z| > 1：P 在北半球，介于 N 与 z 之间');
    } else {
      for (const k of ['a', 'b', 'ab']) ro.set(k, '—');
      ro.set('im', s.mode === 'circle' ? '球面上不过 N 的圆' : '球面上过 N 的圆（直线经过 ∞）');
    }
    sv.redraw();
  }
  update();
  return {};
}
