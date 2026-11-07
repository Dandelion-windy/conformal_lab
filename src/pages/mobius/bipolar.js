// 第 4 章 · 标签 2：双极坐标网格——p, q 的阿波罗尼斯圆与施泰纳圆弧整体变为 p′, q′ 的网格，并据此求区域间的变换
import * as K from '../../core/complex.js';
import { h, select, slider, toggle, button, group, readouts, note, setTex, renderMath } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer, PRELUDE, matUniforms } from '../../core/gl.js';
import { mobiusTex } from '../../core/mobius.js';
import { mapCurve, circlePts } from '../../core/mapcurve.js';
import { strokePath, label, dot } from '../../core/draw.js';
import { cx, num, deg, texCx, texCoef } from '../../core/format.js';

// 背景：双极坐标 ζ = B·z 下的极坐标棋盘格，格线即阿波罗尼斯圆 |ζ| = 常数与施泰纳圆弧 arg ζ = 常数；区域外压暗
const SHADER = `uniform vec2 u_res; uniform vec2 u_center; uniform float u_ppu;
uniform vec2 u_ma; uniform vec2 u_mb; uniform vec2 u_mc; uniform vec2 u_md;
uniform vec4 u_reg; uniform int u_regOn;
out vec4 outColor;
${PRELUDE}
void main() {
  vec2 z = u_center + (gl_FragCoord.xy - 0.5 * u_res) / u_ppu;
  vec2 m = cdiv(cmul(u_ma, z) + u_mb, cmul(u_mc, z) + u_md);
  vec3 col = colorOf(m);
  float lr = log2(length(m)), a = atan(m.y, m.x);
  bool inside = lr >= u_reg.x && lr <= u_reg.y && mod(a - u_reg.z, TAU) <= u_reg.w;
  if (u_regOn == 1 && !inside) col *= 0.3;
  outColor = vec4(col, 1.0);
}`;

const TAU = 2 * Math.PI, S3 = Math.sqrt(3), BIG = 1e30;
const A0 = K.C(0.45, 0.25), A0s = K.div(K.ONE, K.conj(A0)), K0 = K.neg(A0s);
// 把 p, q 送到 0, ∞ 的矩阵（q 可为 ∞）
const std = (p, q) => (K.isFin(q) ? [K.ONE, K.neg(p), K.ONE, K.neg(q)] : [K.ONE, K.neg(p), K.ZERO, K.ONE]);
// reg = [log₂|ζ| 下限, 上限, arg ζ 起点, 张角]
const PRE = [
  { name: 'p, q → 0, ∞：变成极坐标网格', p: K.C(-1), q: K.C(1), pw: K.ZERO, qw: K.INF, k: [1, 0], reg: null, zv: [0, 0, 2.6], wv: [0, 0, 2.6],
    tip: '把 p ↦ 0、q ↦ ∞：阿波罗尼斯圆 $\\left|\\frac{z-p}{z-q}\\right|=\\rho$ 变成同心圆 $|w|=|k|\\rho$，过 p、q 的圆弧 $\\arg\\frac{z-p}{z-q}=\\theta$ 变成射线 $\\arg w=\\theta+\\arg k$。p、q 关于每个阿波罗尼斯圆都对称，0、∞ 关于每个同心圆都对称，这正是保对称性。' },
  { name: '上半平面 → 单位圆盘（i ↦ 0）', p: K.I, q: K.C(0, -1), pw: K.ZERO, qw: K.INF, k: [1, 0], reg: [-BIG, 0, 0, TAU], zv: [0, 0.4, 2.6], wv: [0, 0, 1.8],
    tip: '要 i ↦ 0。由保对称，i 关于实轴的对称点 −i ↦ 0 关于像圆的对称点 ∞，所以 $w=k\\frac{z-i}{z+i}$。实轴是 $|\\zeta|=1$ 的阿波罗尼斯圆，像为 $|w|=|k|$；要它是单位圆 ⟹ $|k|=1$，$\\arg k$ 只是旋转。' },
  { name: '单位圆盘 → 单位圆盘（a ↦ 0）', p: A0, q: A0s, pw: K.ZERO, qw: K.INF, k: [1 / K.abs(A0), K.arg(K0)], reg: [-BIG, Math.log2(K.abs(A0)), 0, TAU], zv: [0.5, 0.2, 2.2], wv: [0, 0, 1.8],
    tip: '要 a ↦ 0，所以 a 关于单位圆的对称点 $1/\\bar a\\mapsto\\infty$。单位圆是 $|\\zeta|=|a|$ 的阿波罗尼斯圆，像为 $|w|=|k|\\,|a|$ ⟹ $|k|=1/|a|$。取 $k=-1/\\bar a$ 就是 $w=\\dfrac{z-a}{1-\\bar az}$。' },
  { name: '偏心圆环 → 同心圆环', p: K.C(2 - S3), q: K.C(2 + S3), pw: K.ZERO, qw: K.INF, k: [2 + S3, 0], reg: [2 * Math.log2(2 - S3), Math.log2(2 - S3), 0, TAU], zv: [0.6, 0, 1.9], wv: [0, 0, 1.5],
    tip: '区域 $|z|<1,\\ |z-\\frac14|>\\frac14$。两圆不相交：找它们的公共对称点 p、q。由 $pq=1$ 与 $(p-\\frac14)(q-\\frac14)=\\frac1{16}$ 得 $p,q=2\\mp\\sqrt3$。两圆都是 p、q 的阿波罗尼斯圆，变成同心圆；取 $k=2+\\sqrt3$ 使外圆变为单位圆，得圆环 $2-\\sqrt3<|w|<1$。' },
  { name: '上半圆盘 → 第一象限', p: K.C(-1), q: K.C(1), pw: K.ZERO, qw: K.INF, k: [1, Math.PI], reg: [-BIG, BIG, -Math.PI, Math.PI / 2], zv: [0, 0.4, 1.8], wv: [0.8, 0.8, 2.2],
    tip: '两段边界（单位圆、实轴）都过 −1 与 1，都是施泰纳圆。取 p = −1、q = 1，它们变成从 0 出发的两条射线，区域变成角形（直角保持）。$\\zeta=\\frac{z+1}{z-1}$ 给出第三象限，取 $k=-1$ 转到第一象限：$w=\\frac{1+z}{1-z}$。' },
  { name: '一般的两对点', p: K.C(-0.8, 0.3), q: K.C(0.9, -0.4), pw: K.C(-0.6, -0.7), qw: K.C(1.1, 0.8), k: [1.5, 0.6], reg: null, zv: [0, 0, 2.6], wv: [0, 0, 2.6],
    tip: 'p、q 的网格整体变成 p′、q′ 的网格：$|k|$ 让阿波罗尼斯圆彼此替换，$\\arg k$ 让施泰纳圆弧彼此替换。p′、q′ 再加上 k，恰好是三个复参数，与“三对点确定一个变换”一致。' },
];
const PC = '#6ee7a8', QC = '#a78bfa';
// ζ 平面上的曲线：|ζ| = ρ 的圆；arg ζ = θ 的射线（从 0 到 ∞，即从 p 到 q 的圆弧）
const modPts = (rho) => circlePts(K.ZERO, rho, 240);
const argPts = (th) => { const u = K.cis(th), out = [K.ZERO]; for (let i = -400; i <= 400; i++) out.push(K.scale(u, Math.exp(i / 40))); return out; };
// TeX：v − a（a = 0 时只写 v），以及 (v − a)/(v − b)（b = ∞ 时约去分母）
const lin = (v, a) => { if (K.abs(a) < 1e-9) return v; const t = texCx(K.neg(a)); return `${v}${t.startsWith('-') ? '' : '+'}${t}`; };
const ratio = (v, a, b) => (K.isFin(b) ? `\\dfrac{${lin(v, a)}}{${lin(v, b)}}` : K.abs(a) < 1e-9 ? v : `(${lin(v, a)})`);

export function mountBipolar(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>z</b> 平面：p, q 的双极坐标网格', unitCircle: true });
  const wv = new PlaneView(b2, { title: '<b>w</b> 平面：p′, q′ 的双极坐标网格', unitCircle: true });
  const s = { pre: 0, p: K.C(-1), q: K.C(1), pw: K.ZERO, qw: K.INF, kl: 0, ka: 0, m: K.C(0.35, 0.8), region: true, probe: true };
  // Sz：z ↦ ζ；Bw = D_k⁻¹·S_w：w ↦ ζ（两边同一个 ζ 着色，同色即对应点）；F = S_w⁻¹·D_k·S_z
  let Sz, Szi, Bw, Bwi, F;
  const prog = renderer().ok ? renderer().program(SHADER) : null;
  const uni = (B) => {
    const r = PRE[s.pre].reg;
    return { prog, uniforms: { u_colorMode: 3, u_bright: 0.62, u_lines: 0, u_lineStep: 0.5, u_regOn: s.region && r ? 1 : 0, u_reg: r || [0, 0, 0, 0], ...matUniforms(B) } };
  };
  zv.bg = () => uni(Sz);
  wv.bg = () => uni(Bw);
  function curves(ctx, v, g) {
    const o = { W: v.W, H: v.H }, draw = (pts, style) => strokePath(ctx, v, mapCurve(g, pts, (w) => v.toScreen(w), o), style);
    const r = PRE[s.pre].reg;
    if (r) {
      const st = { color: '#ffb454', width: 3 };
      if (r[0] > -BIG / 2) draw(modPts(2 ** r[0]), st);
      if (r[1] < BIG / 2) draw(modPts(2 ** r[1]), st);
      if (r[3] < TAU - 1e-9) { draw(argPts(r[2]), st); draw(argPts(r[2] + r[3]), st); }
    }
    const zm = K.mobius(Sz, s.m);
    if (s.probe && K.isFin(zm) && K.abs(zm) > 1e-12) {
      draw(modPts(K.abs(zm)), { color: '#ff6b9a', width: 2 });
      draw(argPts(K.arg(zm)), { color: '#5cc8ff', width: 2 });
      draw(argPts(K.arg(zm) + Math.PI), { color: '#5cc8ff', width: 2, dash: [6, 5] });
    }
  }
  zv.overlays.push((ctx, v) => {
    curves(ctx, v, (zeta) => K.mobius(Szi, zeta));
    if (!K.isFin(s.q)) label(ctx, 10, v.H - 34, 'q = ∞', QC);
  });
  wv.overlays.push((ctx, v) => {
    curves(ctx, v, (zeta) => K.mobius(Bwi, zeta));
    if (s.probe) { const fm = K.mobius(F, s.m); dot(ctx, v, fm, '#ffffff', 5); if (K.isFin(fm)) { const [x, y] = v.toScreen(fm); label(ctx, x + 8, y - 10, 'f(m)'); } }
    if (!K.isFin(s.qw)) label(ctx, 10, v.H - 34, 'q′ = ∞', QC);
  });
  // p 与 q 不能重合
  const H = (key, other, color, lab) => ({ color, r: 7, label: lab, hidden: () => !K.isFin(s[key]), pos: () => s[key], move: (z) => { if (!K.isFin(s[other]) || K.dist(z, s[other]) > 0.03) { s[key] = z; update(); } } });
  zv.handles.push(H('p', 'q', PC, 'p'), H('q', 'p', QC, 'q'), { color: '#ffffff', r: 6, label: 'm', hidden: () => !s.probe, pos: () => s.m, move: (z) => { s.m = z; update(); } });
  wv.handles.push(H('pw', 'qw', PC, 'p′'), H('qw', 'pw', QC, 'q′'));

  const preSel = select({ label: '预设', options: PRE.map((p, i) => ({ value: i, label: p.name })), value: 0, onChange: (x) => load(+x) });
  const klSl = slider({ label: '|k|', min: -1.5, max: 1.5, value: 0, fmt: (x) => num(10 ** x), onInput: (x) => { s.kl = x; update(); } });
  const kaSl = slider({ label: 'arg k', min: -Math.PI, max: Math.PI, value: 0, fmt: (x) => deg(x), onInput: (x) => { s.ka = x; update(); } });
  const tq = toggle({ label: 'q = ∞', value: false, onChange: (on) => { s.q = on ? K.INF : K.C(1); update(); } });
  const tqw = toggle({ label: 'q′ = ∞', value: true, onChange: (on) => { s.qw = on ? K.INF : K.C(1); update(); } });
  const tR = toggle({ label: '区域着色', value: s.region, onChange: (x) => { s.region = x; zv.redraw(); wv.redraw(); } });
  const tM = toggle({ label: '过 m 的两条网格线', value: s.probe, onChange: (x) => { s.probe = x; update(); } });
  const polarBtn = button('p′ = 0，q′ = ∞', () => { s.pw = K.ZERO; s.qw = K.INF; tqw.value = true; update(); }, 'small');
  const fBox = h('div', { class: 'formula-box' }), tip = note('');
  const ro = readouts([['k', 'k'], ['m', 'm 的双极坐标 ζ']]);
  panel.append(
    group('设置', preSel.el, h('div', { class: 'toggles' }, tq.el, tqw.el, tR.el, tM.el), polarBtn),
    group('系数 k', klSl.el, kaSl.el),
    group('变换', fBox, ro.el),
    group('思路', tip),
    group('观察', note('$\\zeta=\\frac{z-p}{z-q}$ 把 p、q 送到 0、∞。棋盘格的格线就是两族圆：<b class="c-pink">阿波罗尼斯圆</b> $|\\zeta|=$ 常数（p、q 关于每一个都对称）和过 p、q 的<b class="c-acc">施泰纳圆弧</b> $\\arg\\zeta=$ 常数，两族处处正交。左右同色即对应点：变换把一张网格整体搬到另一张上。拖动 p、q、p′、q′、m。')),
  );
  renderMath(panel);

  function update() {
    const k = K.polar(10 ** s.kl, s.ka);
    Sz = std(s.p, s.q); Szi = K.matInv(Sz);
    const Sw = std(s.pw, s.qw);
    Bw = K.matMul([K.ONE, K.ZERO, K.ZERO, k], Sw); Bwi = K.matInv(Bw);
    F = K.matNormalize(K.matMul(Bwi, Sz));
    const symZ = K.isFin(s.q) ? '\\dfrac{z-p}{z-q}' : '(z-p)', symW = K.isFin(s.qw) ? '\\dfrac{w-p\'}{w-q\'}' : "w-p'";
    setTex(fBox, `\\begin{aligned}&${symW}=k\\,${symZ}\\\\[2pt]&${ratio('w', s.pw, s.qw)}=${texCoef(k)}\\,${ratio('z', s.p, s.q)}\\\\[2pt]&w=${mobiusTex(F)}\\end{aligned}`, true);
    ro.set('k', `${cx(k)}　|k| = ${num(K.abs(k))}，arg k = ${deg(s.ka)}`);
    const zm = K.mobius(Sz, s.m);
    ro.set('m', `|ζ| = ${num(K.abs(zm))}，arg ζ = ${deg(K.arg(zm))}`);
    zv.redraw(); wv.redraw();
  }
  function load(i) {
    const P = PRE[i];
    Object.assign(s, { pre: i, p: P.p, q: P.q, pw: P.pw, qw: P.qw, kl: Math.log10(P.k[0]), ka: P.k[1] });
    klSl.value = s.kl; kaSl.value = s.ka;
    tq.value = !K.isFin(s.q); tqw.value = !K.isFin(s.qw);
    zv.setHome(...P.zv); wv.setHome(...P.wv);
    tip.innerHTML = P.tip; renderMath(tip);
    update();
  }
  load(0);
  return {};
}
