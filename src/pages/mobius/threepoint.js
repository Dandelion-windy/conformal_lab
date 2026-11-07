// 第 4 章 · 标签 1：三点确定分式线性变换；交比不变；边界定向（左侧 → 左侧）
import * as K from '../../core/complex.js';
import { h, select, toggle, group, readouts, note, setTex, renderMath } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer, mobiusShader, matUniforms } from '../../core/gl.js';
import { from3, crossRatio, mobiusTex, classify } from '../../core/mobius.js';
import { circleThrough, sampleGC } from '../../core/circle.js';
import { mapCurve } from '../../core/mapcurve.js';
import { strokePath, dot, label, chevron } from '../../core/draw.js';
import { cx } from '../../core/format.js';

const COLS = ['#ff6b9a', '#6ee7a8', '#5cc8ff'];
const PRE = [
  { name: '上半平面 → 单位圆盘', z: [K.C(0), K.C(1), K.INF], w: [K.C(-1), K.C(0, -1), K.C(1)], zv: [0, 0.8, 2.6], wv: [0, 0, 1.8] },
  { name: '单位圆盘 → 右半平面', z: [K.C(-1), K.C(0, -1), K.C(1)], w: [K.C(0), K.C(0, -1), K.INF], zv: [0, 0, 1.8], wv: [0.8, 0, 2.6] },
  { name: '单位圆盘 → 上半平面', z: [K.C(1), K.C(0, 1), K.C(-1)], w: [K.INF, K.C(-1), K.C(0)], zv: [0, 0, 1.8], wv: [0, 0.8, 2.6] },
  { name: '一般的三点', z: [K.C(-1.2, -0.4), K.C(0.3, 1.1), K.C(1.4, -0.2)], w: [K.C(-0.6, 1.2), K.C(1.3, 0.3), K.C(-0.4, -1.3)], zv: [0, 0, 2.5], wv: [0, 0, 2.5] },
  { name: '把 z₃ 送到 ∞（得到直线）', z: [K.C(-1), K.C(0, 1), K.C(1)], w: [K.C(-1), K.C(0), K.INF], zv: [0, 0, 2], wv: [0, 0, 2.5] },
];

// 交比的 TeX：含 ∞ 的因子约去
function crTex(v, names) {
  const fac = (x, y) => (x === '\\infty' || y === '\\infty' ? null : `(${x}-${y})`);
  const num = [fac(v, names[0]), fac(names[1], names[2])].filter(Boolean);
  const den = [fac(v, names[2]), fac(names[1], names[0])].filter(Boolean);
  const j = (a) => (a.length ? a.join('') : '1');
  return den.length ? `\\dfrac{${j(num)}}{${j(den)}}` : j(num);
}

export function mountThreePoint(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>z</b> 平面：z₁, z₂, z₃', unitCircle: true });
  const wv = new PlaneView(b2, { title: '<b>w</b> 平面：w₁, w₂, w₃', unitCircle: true });
  const s = { z: [...PRE[0].z], w: [...PRE[0].w], color: 3, hover: null };
  let M = null, Mi = null;
  const r = renderer();
  const zProg = r.ok ? r.program(mobiusShader()) : null;
  const wProg = zProg;
  const uni = () => ({ u_colorMode: s.color, u_bright: 0.5, u_lines: s.color === 3 ? 2 : 1, u_lineStep: 0.5 });
  zv.bg = () => ({ prog: zProg, uniforms: { ...uni(), ...matUniforms(M) } });
  wv.bg = () => ({ prog: wProg, uniforms: { ...uni(), ...matUniforms([K.ONE, K.ZERO, K.ZERO, K.ONE]) } });
  const f = (z) => K.mobius(M, z);
  const fi = (w) => K.mobius(Mi, w);

  const drawCircle = (ctx, v, pts, g, color) => {
    const Kc = circleThrough(...pts);
    const samp = sampleGC(Kc, 400);
    strokePath(ctx, v, mapCurve(g, samp, (w) => v.toScreen(w), { W: v.W, H: v.H }), { color, width: 2.6 });
  };
  // 沿 a→b→c 方向在曲线上画小箭头（在两点间的参数中点处取切向）
  const dirArrow = (ctx, v, P, Q, R, color) => {
    for (const [A, B] of [[P, Q], [Q, R], [R, P]]) {
      if (!K.isFin(A) || !K.isFin(B)) continue;
      // 用交比参数化圆弧：过 A、B 与第三点的圆上，A→B 弧（不含第三点）的中点
      const third = A === P ? R : A === Q ? P : Q;
      const T = from3([A, B, third], [K.ZERO, K.INF, K.C(-1)]);
      const Ti = K.matInv(T);
      const m = K.mobius(Ti, K.ONE), m2 = K.mobius(Ti, K.C(1.08));
      if (!K.isFin(m) || !K.isFin(m2)) continue;
      const d = K.sub(m2, m);
      if (K.abs(d) < 1e-12) continue;
      chevron(ctx, v, m, d, color, 12);
    }
  };
  zv.overlays.push((ctx, v) => {
    drawCircle(ctx, v, s.z, (z) => z, '#ffb454');
    dirArrow(ctx, v, ...s.z, '#ffffff');
    const pole = fi(K.INF);
    if (K.isFin(pole)) { dot(ctx, v, pole, '#ffffff', 4); const [x, y] = v.toScreen(pole); label(ctx, x + 7, y + 12, '↦ ∞'); }
    s.z.forEach((z, i) => { if (!K.isFin(z)) { label(ctx, 10, v.H - 40 - 24 * i, `z${'₁₂₃'[i]} = ∞`, COLS[i]); } });
    if (s.hover?.side === 'w') dot(ctx, v, fi(s.hover.p), '#fff', 4.5);
    if (s.hover?.side === 'z') dot(ctx, v, s.hover.p, '#fff', 4.5);
  });
  wv.overlays.push((ctx, v) => {
    drawCircle(ctx, v, s.w, (w) => w, '#ffb454');
    dirArrow(ctx, v, ...s.w, '#ffffff');
    const fz = f(K.INF);
    if (K.isFin(fz)) { dot(ctx, v, fz, '#ffffff', 4); const [x, y] = v.toScreen(fz); label(ctx, x + 7, y + 12, 'f(∞)'); }
    s.w.forEach((w, i) => { if (!K.isFin(w)) label(ctx, 10, v.H - 40 - 24 * i, `w${'₁₂₃'[i]} = ∞`, COLS[i]); });
    if (s.hover?.side === 'z') dot(ctx, v, f(s.hover.p), '#fff', 4.5);
    if (s.hover?.side === 'w') dot(ctx, v, s.hover.p, '#fff', 4.5);
  });
  const mk = (arr, i, sub) => ({ color: COLS[i], r: 7, label: `${sub}${'₁₂₃'[i]}`, hidden: () => !K.isFin(arr[i]), pos: () => arr[i], move: (z) => { arr[i] = z; update(); } });
  zv.handles.push(...[0, 1, 2].map((i) => mk(s.z, i, 'z')));
  wv.handles.push(...[0, 1, 2].map((i) => mk(s.w, i, 'w')));
  zv.onHover = (z) => { s.hover = z ? { side: 'z', p: z } : null; readHover(); zv.redraw(); wv.redraw(); };
  wv.onHover = (w) => { s.hover = w ? { side: 'w', p: w } : null; readHover(); zv.redraw(); wv.redraw(); };

  const preSel = select({ label: '预设', options: PRE.map((p, i) => ({ value: i, label: p.name })), value: 0, onChange: (v) => load(+v) });
  const infT = [0, 1, 2].map((i) => toggle({ label: `w${'₁₂₃'[i]} = ∞`, value: false, onChange: (on) => { s.w[i] = on ? K.INF : [K.C(-1), K.C(0, 1), K.C(1)][i]; update(); } }));
  const infZ = [0, 1, 2].map((i) => toggle({ label: `z${'₁₂₃'[i]} = ∞`, value: false, onChange: (on) => { s.z[i] = on ? K.INF : [K.C(-1), K.C(0, 1), K.C(1)][i]; update(); } }));
  const colorSel = select({ label: '着色', options: [{ value: 3, label: '极坐标棋盘格（看 0 与 ∞）' }, { value: 2, label: '直角棋盘格' }, { value: 0, label: '相位' }], value: s.color, onChange: (v) => { s.color = +v; zv.redraw(); wv.redraw(); } });
  const fBox = h('div', { class: 'formula-box' }), crBox = h('div', { class: 'formula-box' });
  const ro = readouts([['type', '类型'], ['z', '悬停 z'], ['w', 'w = f(z)'], ['cz', '(z, z₁, z₂, z₃)'], ['cw', '(w, w₁, w₂, w₃)']]);
  panel.append(
    group('设置', preSel.el, colorSel.el, h('div', { class: 'toggles' }, ...infZ.map((t) => t.el), ...infT.map((t) => t.el))),
    group('变换', fBox, ro.el),
    group('交比不变', crBox),
    group('观察', note('拖动三对彩色点。橙色广义圆按 <b>z₁→z₂→z₃</b> 的方向（箭头）映为按 <b>w₁→w₂→w₃</b> 方向的广义圆，且<b>沿这个方向前进时左侧的区域映到左侧的区域</b>——这就是用三点对应确定“区域 → 区域”映射的方法。白点 “↦ ∞” 是被送到无穷远的点 $-d/c$。')),
  );
  renderMath(panel);

  function load(i) {
    const p = PRE[i];
    s.z = [...p.z]; s.w = [...p.w];
    zv.handles.forEach((hd, k) => { hd.pos = () => s.z[k]; hd.move = (z) => { s.z[k] = z; update(); }; hd.hidden = () => !K.isFin(s.z[k]); });
    wv.handles.forEach((hd, k) => { hd.pos = () => s.w[k]; hd.move = (z) => { s.w[k] = z; update(); }; hd.hidden = () => !K.isFin(s.w[k]); });
    infT.forEach((t, k) => (t.value = !K.isFin(s.w[k])));
    infZ.forEach((t, k) => (t.value = !K.isFin(s.z[k])));
    zv.setHome(...p.zv); wv.setHome(...p.wv);
    update();
  }
  function update() {
    M = from3(s.z, s.w); Mi = K.matInv(M);
    setTex(fBox, `w=f(z)=${mobiusTex(M, 'z', 3)}`, true);
    ro.set('type', classify(M).name);
    const zt = (k) => (K.isFin(s.z[k]) ? `z_${k + 1}` : '\\infty'), wt = (k) => (K.isFin(s.w[k]) ? `w_${k + 1}` : '\\infty');
    setTex(crBox, `${crTex('w', [0, 1, 2].map(wt))}=${crTex('z', [0, 1, 2].map(zt))}`, true);
    readHover();
    zv.redraw(); wv.redraw();
  }
  function readHover() {
    const hv = s.hover;
    if (!hv) { for (const k of ['z', 'w', 'cz', 'cw']) ro.set(k, '—'); return; }
    const z = hv.side === 'z' ? hv.p : fi(hv.p), w = hv.side === 'z' ? f(hv.p) : hv.p;
    ro.set('z', cx(z)); ro.set('w', cx(w));
    ro.set('cz', cx(crossRatio(z, ...s.z))); ro.set('cw', cx(crossRatio(w, ...s.w)));
  }
  load(0);
  return {};
}
