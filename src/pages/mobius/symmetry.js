// 第 3 章 · 标签 2：保圆性与保对称性
import * as K from '../../core/complex.js';
import { h, select, segmented, group, readouts, note, setTex, renderMath, toggle } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer, mobiusShader, matUniforms } from '../../core/gl.js';
import { mobiusTex } from '../../core/mobius.js';
import { circleThrough, reflect, sampleGC } from '../../core/circle.js';
import { mapCurve } from '../../core/mapcurve.js';
import { strokePath, dot, label } from '../../core/draw.js';
import { cx, num } from '../../core/format.js';

const MAPS = [
  { name: 'w = 1/z', m: () => [K.ZERO, K.ONE, K.ONE, K.ZERO] },
  { name: 'w = (z − i)/(z + i)', m: () => [K.ONE, K.C(0, -1), K.ONE, K.C(0, 1)] },
  { name: 'w = (z − a)/(1 − āz)，拖动 a', m: (a) => [K.ONE, K.neg(a), K.neg(K.conj(a)), K.ONE], a: true },
  { name: 'w = (z − a)/(z − b)，拖动 a, b', m: (a, b) => [K.ONE, K.neg(a), K.ONE, K.neg(b)], a: true, b: true },
  { name: 'w = (2z + i)/(iz + 1)', m: () => [K.C(2), K.C(0, 1), K.C(0, 1), K.ONE] },
];

export function mountSymmetry(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>z</b> 平面：广义圆 C 与对称点 P, P*', unitCircle: true });
  const wv = new PlaneView(b2, { title: '<b>w</b> 平面：像圆 Γ 与 f(P), f(P*)', unitCircle: true });
  zv.setHome(0, 0, 2.4); wv.setHome(0, 0, 2.4);
  const s = { mi: 2, kind: 'circle', c0: K.C(0.6, 0.3), rp: K.C(1.5, 0.3), la: K.C(-1, -1), lb: K.C(1.2, 0.8), P: K.C(0.9, 0.9), a: K.C(0.4, 0.2), b: K.C(1.4, -0.6), pencil: true, bg: true };
  let M, Mi;
  const prog = renderer().ok ? renderer().program(mobiusShader()) : null;
  const uni = () => ({ u_colorMode: s.bg ? 3 : 4, u_bright: 0.38, u_lines: 0, u_lineStep: 0.5 });
  zv.bg = () => ({ prog, uniforms: { ...uni(), ...matUniforms(M) } });
  wv.bg = () => ({ prog, uniforms: { ...uni(), ...matUniforms([K.ONE, K.ZERO, K.ZERO, K.ONE]) } });
  const f = (z) => K.mobius(M, z);
  const gc = () => (s.kind === 'circle' ? { line: false, c: s.c0, r: K.dist(s.c0, s.rp) } : circleThrough(s.la, s.lb, K.INF));
  // 过 P 与 P* 的圆族（都与 C 正交）
  function pencil(P, Q) {
    const out = [];
    if (!K.isFin(P) || !K.isFin(Q)) return out;
    const mid = K.lerp(P, Q, 0.5), d = K.sub(Q, P), L = K.abs(d);
    if (L < 1e-9) return out;
    const n = K.mul(K.scale(d, 1 / L), K.I);
    for (const t of [-2.4, -1.2, -0.55, 0, 0.55, 1.2, 2.4]) {
      const c = K.add(mid, K.scale(n, t * L));
      out.push(sampleGC({ line: false, c, r: K.dist(c, P) }, 200));
    }
    out.push(sampleGC({ line: true, p: P, d: K.scale(d, 1 / L) }, 300));
    return out;
  }
  const proj = (v) => (w) => v.toScreen(w);
  zv.overlays.push((ctx, v) => {
    const C0 = gc(), Ps = reflect(C0, s.P);
    if (s.pencil) for (const c of pencil(s.P, Ps)) strokePath(ctx, v, c, { color: 'rgba(167,139,250,0.75)', width: 1.3, casing: false });
    strokePath(ctx, v, mapCurve((z) => z, sampleGC(C0, 300), proj(v), { W: v.W, H: v.H }), { color: '#ffb454', width: 3 });
    dot(ctx, v, Ps, '#6ee7a8', 5.5);
    if (K.isFin(Ps)) { const [x, y] = v.toScreen(Ps); label(ctx, x + 8, y - 10, 'P*', '#6ee7a8'); }
    const pole = K.mobius(Mi, K.INF);
    if (K.isFin(pole)) { dot(ctx, v, pole, '#fff', 4); const [x, y] = v.toScreen(pole); label(ctx, x + 7, y + 12, '↦ ∞'); }
  });
  wv.overlays.push((ctx, v) => {
    const C0 = gc(), Ps = reflect(C0, s.P), o = { W: v.W, H: v.H };
    if (s.pencil) for (const c of pencil(s.P, Ps)) strokePath(ctx, v, mapCurve(f, c, proj(v), o), { color: 'rgba(167,139,250,0.75)', width: 1.3, casing: false });
    strokePath(ctx, v, mapCurve(f, sampleGC(C0, 300), proj(v), o), { color: '#ffb454', width: 3 });
    for (const [z, t, c] of [[s.P, 'f(P)', '#ff6b9a'], [Ps, 'f(P*)', '#6ee7a8']]) {
      const w = f(z);
      if (!K.isFin(w)) { label(ctx, 10, v.H - 34, `${t} = ∞`, c); continue; }
      dot(ctx, v, w, c, 5.5); const [x, y] = v.toScreen(w); label(ctx, x + 8, y - 10, t, c);
    }
    const fi = f(K.INF);
    if (K.isFin(fi)) { dot(ctx, v, fi, '#fff', 4); const [x, y] = v.toScreen(fi); label(ctx, x + 7, y + 12, 'f(∞)'); }
  });
  const H = (key, color, lab, vis) => ({ color, label: lab, r: 7, hidden: () => !vis(), pos: () => s[key], move: (z) => { s[key] = z; update(); } });
  zv.handles.push(
    H('c0', '#ffb454', '圆心', () => s.kind === 'circle'), H('rp', '#ffd27a', '', () => s.kind === 'circle'),
    H('la', '#ffb454', '', () => s.kind === 'line'), H('lb', '#ffb454', '', () => s.kind === 'line'),
    H('P', '#ff6b9a', 'P', () => true),
    H('a', '#5cc8ff', 'a', () => !!MAPS[s.mi].a), H('b', '#ffb454', 'b', () => !!MAPS[s.mi].b),
  );
  const mapSel = select({ label: '分式线性变换', options: MAPS.map((m, i) => ({ value: i, label: m.name })), value: s.mi, onChange: (v) => { s.mi = +v; update(); } });
  const kindSeg = segmented({ label: '广义圆 C', options: [{ value: 'circle', label: '圆' }, { value: 'line', label: '直线' }], value: s.kind, onChange: (v) => { s.kind = v; update(); } });
  const tP = toggle({ label: '过 P, P* 的圆族', value: s.pencil, onChange: (v) => { s.pencil = v; update(); } });
  const tB = toggle({ label: '背景着色', value: s.bg, onChange: (v) => { s.bg = v; update(); } });
  const fBox = h('div', { class: 'formula-box' });
  const ro = readouts([['P', 'P'], ['Ps', 'P*'], ['G', '像 Γ'], ['chk', '验证']]);
  panel.append(
    group('设置', mapSel.el, kindSeg.el, h('div', { class: 'toggles' }, tP.el, tB.el), fBox),
    group('读数', ro.el),
    group('观察', note('拖动 <b class="c-pink">P</b>、圆心、半径点（或直线上两点）。<br>① <b>保圆性</b>：橙色广义圆的像仍是广义圆；当 C 经过 “↦∞” 点时像是直线。<br>② <b>保对称性</b>：P 与 P*（绿）关于 C 对称，它们的像关于 Γ 对称。<br>③ 紫色是过 P、P* 的圆族，它们都与 C <b>正交</b>，像也都与 Γ 正交并过 f(P)、f(P*)。这正是“对称点”的几何刻画。')),
  );
  renderMath(panel);
  function update() {
    const m = MAPS[s.mi];
    M = K.matNormalize(m.m(s.a, s.b)); Mi = K.matInv(M);
    setTex(fBox, `w=${mobiusTex(M, 'z', 3)}`, true);
    const C0 = gc(), Ps = reflect(C0, s.P);
    ro.set('P', cx(s.P)); ro.set('Ps', cx(Ps));
    const samp = C0.line ? [K.add(C0.p, C0.d), K.sub(C0.p, C0.d), C0.p] : [0, 2, 4].map((t) => K.add(C0.c, K.scale(K.cis(t), C0.r)));
    const G = circleThrough(...samp.map(f));
    ro.set('G', G.line ? '直线' : `圆心 ${cx(G.c)}，半径 ${num(G.r)}`);
    const err = K.abs(K.sub(reflect(G, f(s.P)), f(Ps)));
    ro.set('chk', K.isFin(f(s.P)) && K.isFin(f(Ps)) ? `|Γ 对称点(f(P)) − f(P*)| = ${err.toExponential(1)}` : '一个像为 ∞，另一个为 Γ 的圆心');
    zv.redraw(); wv.redraw();
  }
  update();
  return {};
}
