// 黎曼球面 · 标签 3：球面的刚体运动 + 球极投影 = 分式线性变换（“Möbius Transformations Revealed”）
import * as K from '../../core/complex.js';
import { h, slider, group, readouts, note, setTex, renderMath, button, select } from '../../core/ui.js';
import { SphereView } from '../../core/sphere3d.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer, planeShader } from '../../core/gl.js';
import { sphereShader } from '../../core/sphere-shader.js';
import { invStereoUnit, mulMM, mulMV, rotX, rotY, rotZ, transpose, sphereToPlane } from '../../core/vec3.js';
import { from3, fixedPoints, classify, mobiusTex } from '../../core/mobius.js';
import { mapCurve, circlePts, segment } from '../../core/mapcurve.js';
import { strokePath, dot, label } from '../../core/draw.js';
import { cx } from '../../core/format.js';
import { player } from '../common.js';

const PRESETS = [
  { name: '平移 w = z + b', p: { tx: 1, ty: 0.6, h: 0, rx: 0, ry: 0, rz: 0 } },
  { name: '伸缩 w = kz（k>0）', p: { tx: 0, ty: 0, h: 1.2, rx: 0, ry: 0, rz: 0 } },
  { name: '旋转 w = e^{iθ}z', p: { tx: 0, ty: 0, h: 0, rx: 0, ry: 0, rz: 1.2 } },
  { name: '反演 w = 1/z（绕实轴转 π）', p: { tx: 0, ty: 0, h: 0, rx: Math.PI, ry: 0, rz: 0 } },
  { name: '绕虚轴转 π：w = −1/z', p: { tx: 0, ty: 0, h: 0, rx: 0, ry: Math.PI, rz: 0 } },
  { name: '斜驶型：旋转 + 伸缩', p: { tx: 0, ty: 0, h: 0.8, rx: 0, ry: 0, rz: 1.4 } },
  { name: '一般运动', p: { tx: 0.6, ty: -0.4, h: 0.5, rx: 0.9, ry: -0.5, rz: 0.4 } },
];
const KEYS = [['tx', '平移 x', -2.5, 2.5], ['ty', '平移 y', -2.5, 2.5], ['h', '升高（球心高度）', -0.6, 3], ['rx', '绕 x 轴旋转', -Math.PI, Math.PI], ['ry', '绕 y 轴旋转', -Math.PI, Math.PI], ['rz', '绕 z 轴旋转', -Math.PI, Math.PI]];

export function mountMotion(stage, panel) {
  const b1 = h('div'), b2 = h('div');
  stage.append(b1, b2);
  const sv = new SphereView(b1, { title: '移动球面，再从新的北极投影', plane: true, planeR: 6, sAlpha: 0.8, pAlpha: 0.95 });
  sv.cam.dist = 9; sv.cam.pitch = 0.5; sv.cam.target = [0, 0, 0.6];
  const pv = new PlaneView(b2, { title: '得到的 <b>w</b> 平面', unitCircle: true });
  pv.setHome(0, 0, 3);
  sv.prog = renderer().program(sphereShader('z'));
  const pr = renderer().ok ? renderer().program(planeShader('cdiv(cmul(u_ma, z) + u_mb, cmul(u_mc, z) + u_md)', 'uniform vec2 u_ma; uniform vec2 u_mb; uniform vec2 u_mc; uniform vec2 u_md;')) : null;
  const target = { ...PRESETS[6].p };
  let t = 1, colorMode = 2;
  const cur = () => Object.fromEntries(Object.keys(target).map((k) => [k, target[k] * t]));
  let T = null, Minv = null, M = null;

  function apply() {
    const p = cur();
    const Rbw = mulMM(rotZ(p.rz), mulMM(rotY(p.ry), rotX(p.rx)));   // 本体 → 世界
    sv.S.c = [p.tx, p.ty, p.h]; sv.S.r = 1; sv.S.rot = transpose(Rbw);
    T = (z) => {
      const q = invStereoUnit(z), P = mulMV(Rbw, q);
      return sphereToPlane(sv.S, [P[0] + p.tx, P[1] + p.ty, P[2] + p.h]);
    };
    M = from3([K.ZERO, K.ONE, K.INF], [T(K.ZERO), T(K.ONE), T(K.INF)]);
    Minv = K.matInv(M);
    readout();
    sv.redraw(); pv.redraw();
  }
  const uni = () => ({ u_colorMode: colorMode, u_bright: 0.9, u_lines: colorMode === 3 ? 2 : 1, u_lineStep: 0.5 });
  sv.uniforms = uni;
  pv.bg = () => ({ prog: pr, uniforms: { ...uni(), u_ma: [Minv[0].re, Minv[0].im], u_mb: [Minv[1].re, Minv[1].im], u_mc: [Minv[2].re, Minv[2].im], u_md: [Minv[3].re, Minv[3].im] } });
  // w 平面：单位圆、实轴、虚轴的像；不动点与 T(0), T(1), T(∞)
  pv.overlays.push((ctx, v) => {
    const proj = (w) => v.toScreen(w), o = { W: v.W, H: v.H };
    strokePath(ctx, v, mapCurve(T, circlePts(K.ZERO, 1, 200), proj, o), { color: '#ffffff', width: 2.2 });
    strokePath(ctx, v, mapCurve(T, segment(K.C(-60), K.C(60), 600), proj, o), { color: '#ffb454', width: 2 });
    strokePath(ctx, v, mapCurve(T, segment(K.C(0, -60), K.C(0, 60), 600), proj, o), { color: '#5cc8ff', width: 2 });
    for (const [z, t2, c] of [[K.ZERO, 'T(0)', '#ffffff'], [K.ONE, 'T(1)', '#ffb454'], [K.INF, 'T(∞)', '#ff6b9a']]) {
      const w = T(z);
      if (!K.isFin(w)) continue;
      dot(ctx, v, w, c, 4.5); const [x, y] = v.toScreen(w); label(ctx, x + 7, y - 9, t2, c);
    }
    for (const f of fixedPoints(M)) if (K.isFin(f)) { const [x, y] = v.toScreen(f); ctx.strokeStyle = '#6ee7a8'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.stroke(); label(ctx, x + 10, y + 12, '不动点', '#6ee7a8'); }
  });
  sv.overlays.push((ctx) => {
    sv.point(ctx, [sv.S.c[0], sv.S.c[1], sv.S.c[2] + 1], '#ffffff', 5, '投影中心 N');
  });

  const sl = {};
  const sliders = KEYS.map(([k, lab, mn, mx]) => (sl[k] = slider({ label: lab, min: mn, max: mx, value: target[k], onInput: (v) => { target[k] = v; t = 1; play.set(1, false); apply(); } })).el);
  const syncSl = () => { for (const [k] of KEYS) sl[k].value = target[k]; };
  const presetBtns = h('div', { class: 'chips' }, PRESETS.map((P) => h('span', { class: 'chip', onclick: () => { Object.assign(target, P.p); syncSl(); play.set(0); play.play(); } }, P.name)));
  const play = player({ max: 1, value: 1, speed: 0.5, onFrame: (v) => { t = v; apply(); }, fmt: (v) => `${(v * 100).toFixed(0)}%` });
  const colorSel = select({ label: '平面图案', options: [{ value: 2, label: '直角棋盘格' }, { value: 3, label: '极坐标棋盘格' }, { value: 0, label: '相位着色' }], value: colorMode, onChange: (v) => { colorMode = +v; sv.redraw(); pv.redraw(); } });
  const fBox = h('div', { class: 'formula-box' });
  const ro = readouts([['t0', 'T(0)'], ['t1', 'T(1)'], ['ti', 'T(∞)'], ['fp', '不动点'], ['ty', '类型']]);
  panel.append(
    group('预设（点击播放动画）', presetBtns, play.el),
    group('球面的运动', ...sliders, button('复位为恒等', () => { for (const [k] of KEYS) target[k] = 0; syncSl(); apply(); }, 'small')),
    group('图案', colorSel.el),
    group('得到的变换', fBox, ro.el),
    group('原理', note('平面上的图案先由逆球极投影“贴”到单位球上，然后让球面作刚体运动（平移、升降、旋转），再从<b>运动后球面的最高点</b>投影回平面。所得的映射总是分式线性变换；反过来，<b>每个分式线性变换都可以这样得到</b>。白线、橙线、蓝线分别是单位圆、实轴、虚轴的像。')),
  );
  renderMath(panel);
  function readout() {
    setTex(fBox, `T(z)=${mobiusTex(M, 'z', 3)}`, true);
    ro.set('t0', cx(T(K.ZERO))); ro.set('t1', cx(T(K.ONE))); ro.set('ti', cx(T(K.INF)));
    ro.set('fp', fixedPoints(M).map((z) => cx(z)).join('，'));
    ro.set('ty', classify(M).name);
  }
  apply();
  return {};
}
