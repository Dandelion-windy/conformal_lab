// 第 3 章 · 标签 4：球面上的反演——关于单位圆的反演 = 关于赤道面的镜面对称，以及由此得到的 z̄、1/z、−1/z̄
import * as K from '../../core/complex.js';
import { h, segmented, toggle, group, readouts, note, renderMath, setTex } from '../../core/ui.js';
import { SphereView } from '../../core/sphere3d.js';
import { renderer } from '../../core/gl.js';
import { sphereShader } from '../../core/sphere-shader.js';
import { vsub, vlen, vlerp } from '../../core/vec3.js';
import { sampleGC } from '../../core/circle.js';
import { num } from '../../core/format.js';
import { COL } from './common.js';
import { NP, EQUATOR, flat, projRay, inDisk, onSphere } from './stereo.js';

const cinv = (z) => K.div(K.ONE, K.conj(z));
const MODES = [
  { value: 'cinv', label: '1/z̄', f: cinv, m: ([x, y, t]) => [x, y, -t], tex: 'w=\\dfrac1{\\bar z}\\quad\\longleftrightarrow\\quad(\\xi,\\eta,\\zeta)\\mapsto(\\xi,\\eta,-\\zeta)',
    tip: 'z 与 $1/\\bar z$ 关于单位圆对称；放到空间里，它们也关于单位球面 S 对称（同一条射线上，$|z|\\cdot|1/\\bar z|=1$）。上一页的反演 $I_K$ <b>保对称性</b>，并且把 S 变成复平面 Π（S 过 K 的球心 N，$S\\cap K$ 是赤道），所以像点 P、P′ 关于 Π 对称：上下镜像。' },
  { value: 'conj', label: 'z̄', f: K.conj, m: ([x, y, t]) => [x, -y, t], tex: 'w=\\bar z\\quad\\longleftrightarrow\\quad(\\xi,\\eta,\\zeta)\\mapsto(\\xi,-\\eta,\\zeta)',
    tip: '关于实轴对称，就是关于竖直平面 $\\xi O\\zeta$ 的镜面对称。这个平面过 N，$I_K$ 把它变成自己，所以在球面上仍是关于它的镜面对称。' },
  { value: 'inv', label: '1/z', f: K.inv, m: ([x, y, t]) => [x, -y, -t], tex: 'w=\\dfrac1z\\quad\\longleftrightarrow\\quad(\\xi,\\eta,\\zeta)\\mapsto(\\xi,-\\eta,-\\zeta)',
    tip: '$\\dfrac1z=\\overline{\\left(1/\\bar z\\right)}$：先关于赤道面镜像，再关于 $\\xi O\\zeta$ 镜像。两个镜面垂直、交线是实轴，两次镜像合成<b>绕实轴转 $180^\\circ$</b>。所以 ±1 不动，0 ↔ ∞，上半平面 ↔ 下半平面。' },
  { value: 'anti', label: '−1/z̄', f: (z) => K.neg(cinv(z)), m: ([x, y, t]) => [-x, -y, -t], tex: 'w=-\\dfrac1{\\bar z}\\quad\\longleftrightarrow\\quad(\\xi,\\eta,\\zeta)\\mapsto(-\\xi,-\\eta,-\\zeta)',
    tip: '$-\\dfrac1{\\bar z}$：关于赤道面镜像，再乘 −1（绕竖直轴转 $180^\\circ$），合起来是关于球心的中心对称：z 与 $-1/\\bar z$ 在球面上是<b>对径点</b>。' },
];
const rotX = ([x, y, t], a) => [x, y * Math.cos(a) - t * Math.sin(a), y * Math.sin(a) + t * Math.cos(a)];

export function mountMirror(stage, panel) {
  const box = h('div'); stage.append(box);
  const sv = new SphereView(box, { title: '平面上的反演 ↔ 球面上的镜面对称', plane: true, planeR: 3, sAlpha: 0.55, pAlpha: 0.88 });
  sv.prog = renderer().program(sphereShader('z'));
  sv.uniforms = { u_colorMode: 3, u_bright: 0.75, u_lines: 0, u_lineStep: 0.5 };
  sv.cam.dist = 6.6; sv.cam.pitch = 0.36;
  const s = { mode: 'cinv', circ: true, z: K.C(0.55, 0.35), c: K.C(1.35, 0.6), cr: K.C(1.75, 0.6) };
  const M = () => MODES.find((x) => x.value === s.mode);
  // 竖直镜面 ξOζ（η = 0）
  function mirrorY(ctx, alpha) {
    const q = [[-1.7, 0, -1.25], [1.7, 0, -1.25], [1.7, 0, 1.45], [-1.7, 0, 1.45]].map((P) => sv.project(P));
    if (q.some((p) => !p)) return;
    ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = `rgba(167,139,250,${alpha})`; ctx.fill();
    ctx.strokeStyle = 'rgba(167,139,250,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  sv.overlays.push((ctx) => {
    const m = M(), w = m.f(s.z), P = sv.toSphere(s.z), Q = sv.toSphere(w);
    if (m.value === 'conj' || m.value === 'inv') mirrorY(ctx, m.value === 'inv' ? 0.06 : 0.13);
    sv.curve(ctx, EQUATOR, { color: COL.gamma, width: m.value === 'conj' ? 1.6 : 3 });
    if (m.value === 'inv') {
      sv.curve(ctx, Array.from({ length: 61 }, (_, i) => [-1.8 + (3.6 * i) / 60, 0, 0]), { color: '#ffffff', width: 2.4 });
      sv.curve(ctx, Array.from({ length: 61 }, (_, i) => rotX(P, (Math.PI * i) / 60)), { color: 'rgba(255,255,255,0.75)', width: 1.4, casing: false });
    }
    if (s.circ) {
      const pts = sampleGC({ line: false, c: s.c, r: K.dist(s.c, s.cr) }, 200), img = pts.map(m.f);
      sv.curve(ctx, inDisk(pts), { color: COL.src, width: 2.2 });
      sv.curve(ctx, inDisk(img), { color: COL.img, width: 2.2 });
      sv.curve(ctx, onSphere(sv, pts), { color: COL.src, width: 2.8 });
      sv.curve(ctx, onSphere(sv, img), { color: COL.img, width: 2.8 });
    }
    projRay(sv, ctx, s.z, { color: 'rgba(255,180,84,0.55)', width: 1 });
    if (K.isFin(w)) projRay(sv, ctx, w, { color: 'rgba(92,200,255,0.55)', width: 1 });
    sv.curve(ctx, Array.from({ length: 31 }, (_, i) => vlerp(P, Q, i / 30)), { color: '#ffffff', width: 2, hiddenAlpha: 0.55 });
    if (m.value === 'cinv') sv.point(ctx, [P[0], P[1], 0], '#ffffff', 3);
    if (m.value === 'anti') sv.point(ctx, [0, 0, 0], '#ffffff', 3.5, '球心');
    sv.point(ctx, P, COL.src, 5, 'P');
    sv.point(ctx, Q, COL.img, 5, 'P′');
    if (K.isFin(w)) sv.point(ctx, flat(w), COL.img, 4.5, 'w');
    sv.point(ctx, NP, '#ffffff', 4, 'N ↔ ∞');
  });
  const H = (key, color, lab, vis = () => true, kind = 'plane') => ({ kind, color, r: 6, label: lab, invisible: kind === 'sphere', hidden: () => !vis(), pos: () => s[key], move: (z) => { s[key] = z; update(); } });
  sv.handles.push(H('z', COL.src, 'z'), H('z', COL.src, '', undefined, 'sphere'), H('c', COL.src, '', () => s.circ), H('cr', '#ffd27a', '', () => s.circ));

  const modeSeg = segmented({ label: '平面上的变换', options: MODES.map((x) => ({ value: x.value, label: x.label })), value: s.mode, onChange: (x) => { s.mode = x; update(); } });
  const tC = toggle({ label: '再画一个圆', value: s.circ, onChange: (x) => { s.circ = x; sv.redraw(); } });
  const fBox = h('div', { class: 'formula-box' }), tip = note('');
  const ro = readouts([['P', 'P'], ['Q', 'P′（w 的像）'], ['err', '|P′ − 镜像(P)|']]);
  panel.append(
    group('设置', modeSeg.el, tC.el),
    group('对应', fBox, ro.el),
    group('为什么', tip),
    group('操作', note('拖动平面上的 <b class="c-amb">z</b>（或球面上的 P）、圆心与半径点；拖动空白处旋转视角。橙色是原来的点与圆，蓝色是像。')),
  );
  renderMath(panel);

  const v3 = (P) => `(${P.map((x) => num(x)).join(', ')})`;
  function update() {
    const m = M(), P = sv.toSphere(s.z), Q = sv.toSphere(m.f(s.z));
    setTex(fBox, m.tex, true);
    tip.innerHTML = m.tip; renderMath(tip);
    ro.set('P', v3(P)); ro.set('Q', v3(Q));
    ro.set('err', vlen(vsub(Q, m.m(P))).toExponential(1));
    sv.redraw();
  }
  update();
  return {};
}
