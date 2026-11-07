// 第 9 章 · 标签 2：茹科夫斯基翼型——用 z = ζ + 1/ζ 把绕圆柱流动变为绕翼型流动，Kutta 条件
import * as K from '../../core/complex.js';
import { h, slider, toggle, group, readouts, note, renderMath } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer } from '../../core/gl.js';
import { strokePath, dot, label } from '../../core/draw.js';
import { num, deg } from '../../core/format.js';
import { fieldShader } from './shader.js';
import { Particles } from './particles.js';

const PI = Math.PI;
// GLSL：u_pa = 圆心 c，u_pb = e^{iα}，u_pc = (Γ, R)
const WZETA = `vec2 Wzeta(vec2 zeta) {
  vec2 d = zeta - u_pa;
  vec2 L = clog(d);
  return cmul(d, cconj(u_pb)) + cdiv(u_pc.y * u_pc.y * u_pb, d) + (u_pc.x / TAU) * vec2(L.y, -L.x);
}`;
const ZETA_BODY = `${WZETA}
vec2 W(vec2 z) { return Wzeta(z); }
bool solid(vec2 z) { return length(z - u_pa) < u_pc.y; }`;
const Z_BODY = `${WZETA}
vec2 inv(vec2 z) {
  vec2 s = cmul(csqrt(z - vec2(2.0, 0.0)), csqrt(z + vec2(2.0, 0.0)));
  vec2 a = 0.5 * (z + s), b = 0.5 * (z - s);
  return length(a - u_pa) >= length(b - u_pa) ? a : b;
}
vec2 W(vec2 z) { return Wzeta(inv(z)); }
bool solid(vec2 z) { return length(inv(z) - u_pa) < u_pc.y * 0.9999; }`;

export function mountAirfoil(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>ζ</b> 平面：绕圆柱（有环量）' });
  const wv = new PlaneView(b2, { title: '<b>z = ζ + 1/ζ</b>：绕茹科夫斯基翼型' });
  zv.setHome(0, 0, 2.6); wv.setHome(0, 0, 3.2);
  const s = { al: 8 * PI / 180, cx: 0.1, cy: 0.12, kutta: true, G: 0, psi: true, phi: false, bg: true, parts: true };
  const r = renderer();
  const pZ = r.ok ? r.program(fieldShader(ZETA_BODY, 'flow')) : null, pW = r.ok ? r.program(fieldShader(Z_BODY, 'flow')) : null;
  const c = () => K.C(-s.cx, s.cy), R = () => K.abs(K.sub(K.ONE, c()));
  const beta = () => -K.arg(K.sub(K.ONE, c()));
  const gamma = () => (s.kutta ? -4 * PI * R() * Math.sin(s.al + beta()) : s.G);
  const ea = () => K.cis(s.al);
  const Wz = (zeta) => {
    const d = K.sub(zeta, c()), L = K.log(d), g = gamma();
    return K.add(K.add(K.mul(d, K.conj(ea())), K.div(K.scale(ea(), R() * R()), d)), K.scale(K.C(L.im, -L.re), g / (2 * PI)));
  };
  const dWz = (zeta) => { const d = K.sub(zeta, c()); return K.add(K.sub(K.conj(ea()), K.div(K.scale(ea(), R() * R()), K.mul(d, d))), K.scale(K.div(K.C(0, -1), d), gamma() / (2 * PI))); };
  const J = (zeta) => K.add(zeta, K.inv(zeta));
  const Jinv = (z) => {
    const sq = K.mul(K.sqrt(K.sub(z, K.C(2))), K.sqrt(K.add(z, K.C(2))));
    const a = K.scale(K.add(z, sq), 0.5), b = K.scale(K.sub(z, sq), 0.5);
    return K.abs(K.sub(a, c())) >= K.abs(K.sub(b, c())) ? a : b;
  };
  const uni = () => {
    const e = ea();
    return { u_pa: [-s.cx, s.cy], u_pb: [e.re, e.im], u_pc: [gamma(), R()], u_dpsi: 0.2, u_dphi: 0.2, u_U: 1, u_showPhi: s.phi ? 1 : 0, u_showPsi: s.psi ? 1 : 0, u_bg: s.bg ? 1 : 0, u_base: 0 };
  };
  zv.bg = () => ({ prog: pZ, uniforms: uni() });
  wv.bg = () => ({ prog: pW, uniforms: uni() });
  const solidZ = (x, y) => Math.hypot(x + s.cx, y - s.cy) < R();
  const solidW = (x, y) => K.abs(K.sub(Jinv(K.C(x, y)), c())) < R() * 0.9999;
  const pz = new Particles(zv, (x, y) => { const d = dWz(K.C(x, y)); return [d.re, -d.im]; }, solidZ, 500);
  const pw = new Particles(wv, (x, y) => {
    const zeta = Jinv(K.C(x, y)), d = K.div(dWz(zeta), K.sub(K.ONE, K.inv(K.mul(zeta, zeta))));
    return [d.re, -d.im];
  }, solidW, 650);
  // 圆周上的驻点：切向速度为零
  const stagnation = () => {
    const out = [], n = 720, Rr = R(), cc = c();
    const ft = (t) => { const e = K.cis(t), d = dWz(K.add(cc, K.scale(e, Rr))); return K.mul(d, K.mul(K.I, e)).re; };
    let prev = ft(0);
    for (let k = 1; k <= n; k++) {
      const t = (2 * PI * k) / n, cur = ft(t);
      if (prev === 0 || prev * cur < 0) {
        let a = (2 * PI * (k - 1)) / n, b = t;
        for (let it = 0; it < 40; it++) { const m = (a + b) / 2; if (ft(a) * ft(m) <= 0) b = m; else a = m; }
        out.push(K.add(cc, K.scale(K.cis((a + b) / 2), Rr)));
      }
      prev = cur;
    }
    return out;
  };
  const circ = () => Array.from({ length: 361 }, (_, k) => K.add(c(), K.scale(K.cis((2 * PI * k) / 360), R())));
  zv.overlays.push((ctx, v) => {
    strokePath(ctx, v, circ(), { color: '#ffb454', width: 2.4 });
    dot(ctx, v, K.ONE, '#ff6b9a', 4.5); dot(ctx, v, K.C(-1), '#ffffff', 3.5);
    let [x, y] = v.toScreen(K.ONE); label(ctx, x + 8, y + 12, 'ζ = 1（后缘）', '#ff6b9a');
    [x, y] = v.toScreen(K.C(-1)); label(ctx, x - 8, y + 14, '−1', '#fff', 'right');
    for (const p of stagnation()) dot(ctx, v, p, '#6ee7a8', 5);
  });
  wv.overlays.push((ctx, v) => {
    strokePath(ctx, v, circ().map(J), { color: '#ffb454', width: 2.4 });
    for (const p of stagnation()) dot(ctx, v, J(p), '#6ee7a8', 5);
    const [x, y] = v.toScreen(K.C(2)); label(ctx, x + 8, y + 12, '后缘 z = 2', '#ff6b9a');
  });

  const deg2 = (x) => deg(x, 1);
  const aSl = slider({ label: '攻角 α', min: -0.3, max: 0.45, value: s.al, fmt: deg2, onInput: (x) => { s.al = x; refresh(); } });
  const cxSl = slider({ label: '厚度参数（圆心向左偏移）', min: 0, max: 0.3, value: s.cx, onInput: (x) => { s.cx = x; refresh(); } });
  const cySl = slider({ label: '弯度参数（圆心向上偏移）', min: -0.3, max: 0.3, value: s.cy, onInput: (x) => { s.cy = x; refresh(); } });
  const tK = toggle({ label: 'Kutta 条件（自动确定环量）', value: s.kutta, onChange: (x) => { s.kutta = x; gSl.el.hidden = x; refresh(); } });
  const gSl = slider({ label: '环量 Γ（手动）', min: -12, max: 12, value: 0, onInput: (x) => { s.G = x; refresh(); } });
  gSl.el.hidden = true;
  const tg = (lab, key, f) => toggle({ label: lab, value: s[key], onChange: (x) => { s[key] = x; f?.(x); zv.redraw(); wv.redraw(); } });
  const ro = readouts([['R', '圆半径 R'], ['b', 'β'], ['G', '环量 Γ'], ['L', '升力 L = −ρUΓ'], ['cl', '升力系数 C_L']]);
  panel.append(
    group('翼型与来流', aSl.el, cxSl.el, cySl.el, tK.el, gSl.el),
    group('显示', h('div', { class: 'toggles' }, tg('流线', 'psi').el, tg('等势线', 'phi').el, tg('速度背景', 'bg').el, tg('示踪粒子', 'parts', (x) => { pz.on = x; pw.on = x; }).el)),
    group('读数（U = 1, ρ = 1）', ro.el),
    group('说明', note('左图：圆心为 $c$、过 $\\zeta=1$ 的圆，绕它的流动 $W(\\zeta)=U\\left[(\\zeta-c)e^{-i\\alpha}+\\frac{R^2e^{i\\alpha}}{\\zeta-c}\\right]+\\frac{\\Gamma}{2\\pi i}\\log(\\zeta-c)$。右图：经茹科夫斯基映射 $z=\\zeta+\\frac1\\zeta$ 后，圆变为翼型，流动随之变换（复势只是换了变量）。绿点是驻点。<b>Kutta 条件</b>选择 $\\Gamma=-4\\pi UR\\sin(\\alpha+\\beta)$，使后驻点恰好位于尖锐的后缘，流体从后缘平顺流出。关闭 Kutta 条件、令 Γ=0，可以看到流体绕过后缘的不合物理的流动。')),
  );
  renderMath(panel);
  function refresh() {
    const g = gamma();
    ro.set('R', num(R(), 4)); ro.set('b', deg(beta(), 2)); ro.set('G', num(g, 4));
    ro.set('L', `${num(-g, 4)}（${-g > 0 ? '向上' : -g < 0 ? '向下' : '无'}，垂直于来流）`);
    const pts = circ().map(J), xs = pts.map((p) => p.re), chord = Math.max(...xs) - Math.min(...xs);
    ro.set('cl', `${num(-2 * g / chord, 3)}（弦长 ${num(chord, 3)}）`);
    pz.calibrate(); pw.calibrate();
    zv.redraw(); wv.redraw();
  }
  refresh();
  return { show() { pz.start(); pw.start(); }, hide() { pz.stop(); pw.stop(); } };
}
