// 黎曼球面 · 标签 1：球极投影、弦距离、∞ 的邻域
import { C, abs, abs2, sub, polar } from '../../core/complex.js';
import { h, segmented, slider, toggle, select, group, readouts, setTex, note, renderMath } from '../../core/ui.js';
import { SphereView } from '../../core/sphere3d.js';
import { renderer } from '../../core/gl.js';
import { sphereShader } from '../../core/sphere-shader.js';
import { vlerp, vsub, vlen } from '../../core/vec3.js';
import { cx, num, texNum, texCx } from '../../core/format.js';

export const CONV = {
  eq: { name: '单位球（赤道平面）', c: [0, 0, 0], r: 1, target: [0, 0, 0] },
  tan: { name: '与平面切于原点（直径 1）', c: [0, 0, 0.5], r: 0.5, target: [0, 0, 0.35] },
};
export function applyConv(sv, key) {
  const k = CONV[key];
  sv.S.c = [...k.c]; sv.S.r = k.r;
  sv.cam.target = [...k.target];
  sv.cam.dist = key === 'eq' ? 6.4 : 4.2;
}
const circle3 = (c, r, n = 160) => { const o = []; for (let i = 0; i <= n; i++) { const t = (2 * Math.PI * i) / n; o.push([c.re + r * Math.cos(t), c.im + r * Math.sin(t), 0]); } return o; };

export function mountProjection(stage, panel) {
  const box = h('div'); stage.append(box);
  const sv = new SphereView(box, { title: '球极投影：$z\\ \\leftrightarrow\\ P$', plane: true, planeR: 3.4, sAlpha: 0.6, pAlpha: 0.92 });
  renderMath(box);
  sv.prog = renderer().program(sphereShader('z'));
  const s = { conv: 'eq', colorMode: 3, lines: 2, z1: C(1.3, 0.9), z2: C(-0.7, -1.2), chord: false, cap: false, R: 2, rays: true };
  sv.uniforms = () => ({ u_colorMode: s.colorMode, u_bright: 0.9, u_lines: s.lines, u_lineStep: 0.5 });
  applyConv(sv, s.conv);

  const N = () => [sv.S.c[0], sv.S.c[1], sv.S.c[2] + sv.S.r];
  const S0 = () => [sv.S.c[0], sv.S.c[1], sv.S.c[2] - sv.S.r];
  const ray = (ctx, z, color) => {
    const P = sv.toSphere(z), Z = [z.re, z.im, 0], n = N(), pts = [];
    const far = abs(z) > 3.4 ? vlerp(n, Z, 3.4 / Math.max(abs(z), 1e-9) * 0.98 + 0.02) : Z;
    for (let i = 0; i <= 60; i++) pts.push(vlerp(n, far, i / 60));
    sv.curve(ctx, pts, { color, width: 1.6, hiddenAlpha: 0.5 });
    return P;
  };
  sv.overlays.push((ctx) => {
    if (s.cap) {
      sv.curve(ctx, circle3(C(0), s.R), { color: '#ff6b9a', width: 2.4 });
      sv.curve(ctx, circle3(C(0), s.R).map((p) => sv.toSphere(C(p[0], p[1]))), { color: '#ff6b9a', width: 2.4 });
    }
    const P1 = ray(ctx, s.z1, '#ffb454');
    sv.point(ctx, P1, '#ffb454', 5, 'P');
    if (s.chord) {
      const P2 = ray(ctx, s.z2, '#6ee7a8');
      sv.point(ctx, P2, '#6ee7a8', 5, 'P′');
      const seg = []; for (let i = 0; i <= 40; i++) seg.push(vlerp(P1, P2, i / 40));
      sv.curve(ctx, seg, { color: '#ffffff', width: 2.6, hiddenAlpha: 0.6 });
    }
    sv.point(ctx, N(), '#ffffff', 5, 'N ↔ ∞');
    sv.point(ctx, S0(), '#ffffff', 4, s.conv === 'tan' ? 'S = O ↔ 0' : 'S ↔ 0');
  });
  const hz1 = { kind: 'plane', color: '#ffb454', r: 6, label: 'z', pos: () => s.z1, move: (z) => { s.z1 = z; update(); } };
  const hp1 = { kind: 'sphere', color: '#ffb454', invisible: true, pos: () => s.z1, move: (z) => { s.z1 = z; update(); } };
  const hz2 = { kind: 'plane', color: '#6ee7a8', r: 6, label: 'z′', hidden: () => !s.chord, pos: () => s.z2, move: (z) => { s.z2 = z; update(); } };
  const hp2 = { kind: 'sphere', color: '#6ee7a8', invisible: true, hidden: () => !s.chord, pos: () => s.z2, move: (z) => { s.z2 = z; update(); } };
  sv.handles.push(hz1, hz2, hp1, hp2);

  // 面板
  const convSeg = segmented({ label: '球面的取法', options: [{ value: 'eq', label: '单位球 · 赤道面' }, { value: 'tan', label: '切于原点 · 直径 1' }], value: s.conv, onChange: (v) => { s.conv = v; applyConv(sv, v); update(); } });
  const colorSel = select({ label: '平面着色（并投影到球面）', options: [{ value: 3, label: '极坐标棋盘格' }, { value: 2, label: '直角棋盘格' }, { value: 0, label: '相位着色' }, { value: 1, label: '黎曼球着色（0 黑 · ∞ 白）' }], value: s.colorMode, onChange: (v) => { s.colorMode = +v; s.lines = +v === 2 ? 1 : 2; sv.redraw(); } });
  const alphaSl = slider({ label: '球面不透明度', min: 0.1, max: 1, value: sv.opts.sAlpha, onInput: (v) => { sv.opts.sAlpha = v; sv.redraw(); } });
  const tChord = toggle({ label: '弦距离（第二个点）', value: s.chord, onChange: (v) => { s.chord = v; update(); } });
  const tCap = toggle({ label: '∞ 的邻域 |z|>R', value: s.cap, onChange: (v) => { s.cap = v; rSl.el.hidden = !v; update(); } });
  const rSl = slider({ label: 'R', min: 0.3, max: 5, value: s.R, onInput: (v) => { s.R = v; update(); } });
  rSl.el.hidden = true;
  const ro = readouts([['z', 'z'], ['P', 'P = (ξ, η, ζ)'], ['m', '|z|'], ['ch', '弦距离 d(z, z′)'], ['cinf', 'd(z, ∞)'], ['cap', '球冠']]);
  const fBox = h('div', { class: 'formula-box' });
  const quick = h('div', { class: 'chips' }, ...[['0', C(0)], ['1', C(1)], ['i', C(0, 1)], ['−1', C(-1)], ['大 |z|', C(12, 9)], ['单位圆上', polar(1, 0.9)]].map(([t, z]) => h('span', { class: 'chip', onclick: () => { s.z1 = z; update(); } }, t)));
  panel.append(
    group('设置', convSeg.el, colorSel.el, alphaSl.el, h('div', { class: 'toggles' }, tChord.el, tCap.el), rSl.el),
    group('把 z 移到', quick),
    group('投影公式（实时代入）', fBox),
    group('读数', ro.el),
    group('操作', note('拖动平面上的 <b class="c-amb">z</b> 或球面上的 <b class="c-amb">P</b>（两者联动）；拖动空白处旋转视角，滚轮缩放。从 <b>N</b> 出发的射线依次穿过 P 与 z。')),
  );

  function update() {
    const z = s.z1, P = sv.toSphere(z);
    const k = s.conv === 'eq' ? 2 : 1, r2 = abs2(z);
    ro.set('z', cx(z));
    ro.set('P', `(${num(P[0])}, ${num(P[1])}, ${num(P[2])})`);
    ro.set('m', num(abs(z)));
    const dinf = k / Math.sqrt(1 + r2);
    ro.set('cinf', `${num(dinf)}　（= |PN|）`);
    if (s.chord) {
      const z2 = s.z2, d = (k * abs(sub(z, z2))) / Math.sqrt((1 + r2) * (1 + abs2(z2)));
      ro.set('ch', `${num(d)}　|PP′| = ${num(vlen(vsub(P, sv.toSphere(z2))))}`);
    } else ro.set('ch', '（打开“弦距离”）');
    ro.set('cap', s.cap ? `|z|>${num(s.R)} ⟺ ζ > ${num(s.conv === 'eq' ? (s.R ** 2 - 1) / (s.R ** 2 + 1) : s.R ** 2 / (1 + s.R ** 2))}` : '—');
    const x = texNum(z.re), m2 = texNum(r2);
    if (s.conv === 'eq') {
      setTex(fBox, `\\begin{aligned}\\xi&=\\frac{2x}{1+|z|^2}=\\frac{2\\cdot(${x})}{1+${m2}}=${texNum(P[0])}\\\\ \\eta&=\\frac{2y}{1+|z|^2}=${texNum(P[1])}\\\\ \\zeta&=\\frac{|z|^2-1}{|z|^2+1}=${texNum(P[2])}\\\\ z&=\\frac{\\xi+i\\eta}{1-\\zeta}=${texCx(z)}\\end{aligned}`, true);
    } else {
      setTex(fBox, `\\begin{aligned}\\xi&=\\frac{x}{1+|z|^2}=\\frac{${x}}{1+${m2}}=${texNum(P[0])}\\\\ \\eta&=\\frac{y}{1+|z|^2}=${texNum(P[1])}\\\\ \\zeta&=\\frac{|z|^2}{1+|z|^2}=${texNum(P[2])}\\\\ z&=\\frac{\\xi+i\\eta}{1-\\zeta}=${texCx(z)}\\end{aligned}`, true);
    }
    sv.redraw();
  }
  update();
  return {};
}
