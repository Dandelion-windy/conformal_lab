// 第 4 章 · 标签 2：双极坐标网格——p, q 的阿波罗尼斯圆与施泰纳圆弧整体变为 p′, q′ 的网格，并据此求区域间的变换
import * as K from '../../core/complex.js';
import { h, select, slider, toggle, button, group, readouts, note, setTex, renderMath } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer, PRELUDE } from '../../core/gl.js';
import { mobiusTex } from '../../core/mobius.js';
import { mapCurve, circlePts } from '../../core/mapcurve.js';
import { strokePath, label, dot } from '../../core/draw.js';
import { cx, num, deg, texCx, texCoef } from '../../core/format.js';

// 背景：双极坐标 ζ = B·z 下的极坐标棋盘格，格线即阿波罗尼斯圆 |ζ| = 常数与施泰纳圆弧 arg ζ = 常数；区域外压暗
const SHADER = `uniform vec2 u_res; uniform float u_ppu;
uniform vec2 u_p; uniform vec2 u_q; uniform vec2 u_delta;
uniform int u_kind; uniform vec2 u_shift; uniform vec2 u_step;
uniform vec4 u_reg; uniform int u_regOn;
out vec4 outColor;
${PRELUDE}
// log(1+d)：两极接近时保留微小差值，不先在浮点数中计算 1+d。
vec2 logOnePlus(vec2 d) {
  if (length(d) > 0.25) return clog(vec2(1.0, 0.0) + d);
  vec2 t = cdiv(d, vec2(2.0, 0.0) + d), t2 = csq(t);
  return 2.0 * cmul(t, vec2(1.0, 0.0) + cmul(t2,
    vec2(1.0/3.0, 0.0) + cmul(t2, vec2(1.0/5.0, 0.0) + cmul(t2, vec2(1.0/7.0, 0.0)))));
}
void main() {
  vec2 z = (gl_FragCoord.xy - 0.5 * u_res) / u_ppu;
  vec2 l;
  if (u_kind == 1) l = clog(z - u_p);
  else if (u_kind == 2) l = -clog(z - u_q);
  else {
    vec2 d = cdiv(u_delta, z - u_q);
    l = length(d) < 0.25 ? logOnePlus(d) : clog(z - u_p) - clog(z - u_q);
  }
  l -= u_shift;
  l.y = mod(l.y + PI, TAU) - PI;
  vec2 g = l / u_step;
  // 在辐角割线两侧使用相同的像素宽度。
  vec2 fw = vec2(fwidth(g.x), min(fwidth(l.y), fwidth(mod(l.y, TAU))) / u_step.y);
  vec2 cell = fract(g);
  vec2 parity = 1.0 - 2.0 * step(vec2(0.5), fract(g * 0.5));
  float fade = 1.0 - smoothstep(0.3, 1.0, max(fw.x, fw.y));
  float check = 0.79 + 0.21 * parity.x * parity.y * fade;
  vec3 col = mix(vec3(0.62), softHue(l.y / TAU), 0.55) * check * 0.62;
  vec2 dist = min(cell, 1.0 - cell);
  float lines = max(lineMask(dist.x, fw.x, 1.0), lineMask(dist.y, fw.y, 1.0));
  col = mix(col, vec3(0.88, 0.92, 1.0), lines * fade * 0.48);
  float lr = l.x / log(2.0), a = l.y;
  bool inside = lr >= u_reg.x && lr <= u_reg.y && mod(a - u_reg.z, TAU) <= u_reg.w;
  if (u_regOn == 1 && !inside) col *= 0.3;
  outColor = vec4(col, 1.0);
}`;

const TAU = 2 * Math.PI, S3 = Math.sqrt(3), BIG = 1e30;
const A0 = K.C(0.45, 0.25), A0s = K.div(K.ONE, K.conj(A0));
const B0 = K.C(-0.35, 0.4), B0s = K.div(K.ONE, K.conj(B0));
const DISK_K = K.div(K.conj(B0), K.conj(A0));
// 把不同的 p, q 送到 0, ∞；无穷远点的因子按极限约去。
const std = (p, q) => !K.isFin(p) ? [K.ZERO, K.ONE, K.ONE, K.neg(q)]
  : K.isFin(q) ? [K.ONE, K.neg(p), K.ONE, K.neg(q)] : [K.ONE, K.neg(p), K.ZERO, K.ONE];
const same = (p, q) => p.re === q.re && p.im === q.im;
// reg = [log₂|ζ| 下限, 上限, arg ζ 起点, 张角]
const PRE = [
  { name: 'p, q → 0, ∞：变成极坐标网格', p: K.C(-1), q: K.C(1), pw: K.ZERO, qw: K.INF, k: [1, 0], reg: null, zv: [0, 0, 2.6], wv: [0, 0, 2.6],
    tip: '把 p ↦ 0、q ↦ ∞：阿波罗尼斯圆 $\\left|\\frac{z-p}{z-q}\\right|=\\rho$ 变成同心圆 $|w|=|k|\\rho$，过 p、q 的圆弧 $\\arg\\frac{z-p}{z-q}=\\theta$ 变成射线 $\\arg w=\\theta+\\arg k$。p、q 关于每个阿波罗尼斯圆都对称，0、∞ 关于每个同心圆都对称，这正是保对称性。' },
  { name: '上半平面 → 单位圆盘（i ↦ 0）', p: K.I, q: K.C(0, -1), pw: K.ZERO, qw: K.INF, k: [1, 0], reg: [-BIG, 0, 0, TAU], zv: [0, 0.4, 2.6], wv: [0, 0, 1.8],
    tip: '要 i ↦ 0。由保对称，i 关于实轴的对称点 −i ↦ 0 关于像圆的对称点 ∞，所以 $w=k\\frac{z-i}{z+i}$。实轴是 $|\\zeta|=1$ 的阿波罗尼斯圆，像为 $|w|=|k|$；要它是单位圆 ⟹ $|k|=1$，$\\arg k$ 只是旋转。' },
  { name: '单位圆盘 → 单位圆盘（非零点 a ↦ b）', p: A0, q: A0s, pw: B0, qw: B0s, k: [K.abs(DISK_K), K.arg(DISK_K)], reg: [-BIG, Math.log2(K.abs(A0)), 0, TAU], zv: [0, 0, 2.2], wv: [0, 0, 2.2],
    tip: '把圆盘内非零点 $a\\mapsto b$。由保对称，$1/\\bar a\\mapsto1/\\bar b$，所以取 $p=a,q=1/\\bar a,p\'=b,q\'=1/\\bar b$。两侧单位圆分别满足 $|S_{a,a^*}(z)|=|a|$、$|S_{b,b^*}(w)|=|b|$，故 $|k|=|b|/|a|$。取 $k=\\bar b/\\bar a$ 得 $\\dfrac{w-b}{1-\\bar bw}=\\dfrac{z-a}{1-\\bar az}$，即先把 a 移到 0，再把 0 移到 b。保持上述 $|k|$ 并改变 $\\arg k$，可观察仍满足 a ↦ b 的其他圆盘自同构。' },
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
const lin = (v, a) => { if (K.abs(a) === 0) return v; const t = texCx(K.neg(a), 12); return `${v}${t.startsWith('-') ? '' : '+'}${t}`; };
const ratio = (v, a, b) => !K.isFin(a) ? `\\dfrac{1}{${lin(v, b)}}` : (K.isFin(b) ? `\\dfrac{${lin(v, a)}}{${lin(v, b)}}` : K.abs(a) === 0 ? v : `(${lin(v, a)})`);

export function mountBipolar(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>z</b> 平面：p, q 的双极坐标网格', unitCircle: true });
  const wv = new PlaneView(b2, { title: '<b>w</b> 平面：p′, q′ 的双极坐标网格', unitCircle: true });
  const s = { pre: 0, p: K.C(-1), q: K.C(1), pw: K.ZERO, qw: K.INF, kl: 0, ka: 0, m: K.C(0.35, 0.8), region: true, probe: true };
  // Sz：z ↦ ζ；Bw = D_k⁻¹·S_w：w ↦ ζ（两边同一个 ζ 着色，同色即对应点）；F = S_w⁻¹·D_k·S_z
  let Sz, Szi, Bw, Bwi, F;
  const collapsed = () => same(s.p, s.q) || same(s.pw, s.qw);
  const prog = renderer().ok ? renderer().program(SHADER) : null;
  // 相对视图中心传入两极，并独立传入 q-p，保留小间距的有效数字。
  const span = (v) => Math.max(v.W, v.H) / v.ppu;
  const sensitivity = (p, q, v) => K.isFin(p) && K.isFin(q) ? Math.min(1, K.dist(p, q) / span(v)) : 1;
  const uni = (p, q, v, shift) => {
    if (collapsed()) return null;
    const r = PRE[s.pre].reg;
    const density = 2 ** Math.floor(Math.log2(Math.min(sensitivity(s.p, s.q, zv), sensitivity(s.pw, s.qw, wv))));
    const relative = (z) => K.isFin(z) ? [z.re - v.center.re, z.im - v.center.im] : [0, 0];
    const d = K.isFin(p) && K.isFin(q) ? K.sub(q, p) : K.ZERO;
    return { prog, uniforms: { u_p: relative(p), u_q: relative(q), u_delta: [d.re, d.im],
      u_kind: !K.isFin(q) ? 1 : !K.isFin(p) ? 2 : 0, u_shift: shift,
      u_step: [Math.LN2 * 0.5 * density, TAU / (16 / density)],
      u_regOn: s.region && r ? 1 : 0, u_reg: r || [0, 0, 0, 0] } };
  };
  zv.bg = () => uni(s.p, s.q, zv, [0, 0]);
  wv.bg = () => uni(s.pw, s.qw, wv, [s.kl * Math.LN10, s.ka]);
  zv.onView = () => wv.redraw();
  wv.onView = () => zv.redraw();
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
    if (collapsed()) return;
    curves(ctx, v, (zeta) => K.mobius(Szi, zeta));
    if (!K.isFin(s.p)) label(ctx, 10, v.H - 54, 'p = ∞', PC);
    if (!K.isFin(s.q)) label(ctx, 10, v.H - 34, 'q = ∞', QC);
  });
  wv.overlays.push((ctx, v) => {
    if (collapsed()) return;
    curves(ctx, v, (zeta) => K.mobius(Bwi, zeta));
    if (s.probe) { const fm = K.mobius(F, s.m); dot(ctx, v, fm, '#ffffff', 5); if (K.isFin(fm)) { const [x, y] = v.toScreen(fm); label(ctx, x + 8, y - 10, 'f(m)'); } }
    if (!K.isFin(s.pw)) label(ctx, 10, v.H - 54, 'p′ = ∞', PC);
    if (!K.isFin(s.qw)) label(ctx, 10, v.H - 34, 'q′ = ∞', QC);
  });
  const H = (key, color, lab) => ({ color, r: 7, label: lab, hidden: () => !K.isFin(s[key]), pos: () => s[key], move: (z) => { s[key] = z; update(); } });
  zv.handles.push(H('p', PC, 'p'), H('q', QC, 'q'), { color: '#ffffff', r: 6, label: 'm', hidden: () => !s.probe, pos: () => s.m, move: (z) => { s.m = z; update(); } });
  wv.handles.push(H('pw', PC, 'p′'), H('qw', QC, 'q′'));

  const preSel = select({ label: '预设', options: PRE.map((p, i) => ({ value: i, label: p.name })), value: 0, onChange: (x) => load(+x) });
  const klSl = slider({ label: '|k|', min: -1.5, max: 1.5, value: 0, fmt: (x) => num(10 ** x), onInput: (x) => { s.kl = x; update(); } });
  const kaSl = slider({ label: 'arg k', min: -Math.PI, max: Math.PI, value: 0, fmt: (x) => deg(x), onInput: (x) => { s.ka = x; update(); } });
  const pointControls = [['p', 'p'], ['q', 'q'], ['pw', 'p′'], ['qw', 'q′']].map(([key, name]) => {
    const control = select({ label: name, options: [{ value: 'finite', label: '有限点（拖动）' }, { value: 'zero', label: '0' }, { value: 'inf', label: '∞' }], value: 'finite',
      onChange: (value) => { s[key] = value === 'inf' ? K.INF : value === 'zero' ? K.ZERO : K.C(key.startsWith('p') ? -1 : 1); update(); } });
    return { key, control };
  });
  const separation = (p, q, name) => slider({ label: name, min: -10, max: 1, step: 0.05, value: 0, fmt: (x) => (10 ** x).toExponential(2), onInput: (x) => {
    const a = K.isFin(s[p]) ? s[p] : K.C(-1), b = K.isFin(s[q]) ? s[q] : K.C(1);
    const mid = K.lerp(a, b, 0.5), dir = K.cis(same(a, b) ? 0 : K.arg(K.sub(b, a))), d = K.scale(dir, 10 ** x / 2);
    s[p] = K.sub(mid, d); s[q] = K.add(mid, d); update();
  } });
  const sepZ = separation('p', 'q', '|p − q|（对数）'), sepW = separation('pw', 'qw', '|p′ − q′|（对数）');
  const tR = toggle({ label: '区域着色', value: s.region, onChange: (x) => { s.region = x; zv.redraw(); wv.redraw(); } });
  const tM = toggle({ label: '过 m 的两条网格线', value: s.probe, onChange: (x) => { s.probe = x; update(); } });
  const polarBtn = button('p′ = 0，q′ = ∞', () => { s.pw = K.ZERO; s.qw = K.INF; update(); }, 'small');
  const fBox = h('div', { class: 'formula-box' }), tip = note('');
  const ro = readouts([['k', 'k'], ['m', 'm 的双极坐标 ζ']]);
  panel.append(
    group('设置', preSel.el, ...pointControls.map(({ control }) => control.el), h('div', { class: 'toggles' }, tR.el, tM.el), polarBtn),
    group('两极间距', sepZ.el, sepW.el, note('缩小间距可观察两极合并前的网格；格线密度随视野调整。滚轮缩放可继续观察局部。')),
    group('系数 k', klSl.el, kaSl.el),
    group('变换', fBox, ro.el),
    group('思路', tip),
    group('观察', note('$\\zeta=\\frac{z-p}{z-q}$ 把 p、q 送到 0、∞。棋盘格的格线就是两族圆：<b class="c-pink">阿波罗尼斯圆</b> $|\\zeta|=$ 常数（p、q 关于每一个都对称）和过 p、q 的<b class="c-acc">施泰纳圆弧</b> $\\arg\\zeta=$ 常数，两族处处正交。左右同色即对应点：变换把一张网格整体搬到另一张上。拖动 p、q、p′、q′、m。')),
  );
  renderMath(panel);

  function update() {
    for (const { key, control } of pointControls) control.value = !K.isFin(s[key]) ? 'inf' : same(s[key], K.ZERO) ? 'zero' : 'finite';
    for (const [p, q, sl] of [['p', 'q', sepZ], ['pw', 'qw', sepW]]) {
      sl.el.hidden = !K.isFin(s[p]) || !K.isFin(s[q]);
      if (!sl.el.hidden) sl.value = Math.log10(K.dist(s[p], s[q]));
    }
    if (collapsed()) {
      fBox.textContent = '同一侧两极重合，双极坐标退化，不能再由该坐标式确定莫比乌斯变换。相切圆族应改用 1/(z−a) 的直角网格；详见下方“怎样求分式线性变换”。';
      ro.set('m', '双极坐标未定义');
      zv.redraw(); wv.redraw();
      return;
    }
    const k = K.polar(10 ** s.kl, s.ka);
    Sz = std(s.p, s.q); Szi = K.matInv(Sz);
    const Sw = std(s.pw, s.qw);
    Bw = K.matMul([K.ONE, K.ZERO, K.ZERO, k], Sw); Bwi = K.matInv(Bw);
    F = K.matMul(Bwi, Sz);
    const symZ = ratio('z', s.p, s.q), symW = ratio('w', s.pw, s.qw);
    setTex(fBox, `\\begin{aligned}&${symW}=k\\,${symZ}\\\\[2pt]&${ratio('w', s.pw, s.qw)}=${texCoef(k)}\\,${ratio('z', s.p, s.q)}\\\\[2pt]&w=${mobiusTex(F, 'z', 12)}\\end{aligned}`, true);
    ro.set('k', `${cx(k)}　|k| = ${num(K.abs(k))}，arg k = ${deg(s.ka)}`);
    const zm = K.mobius(Sz, s.m);
    ro.set('m', `|ζ| = ${num(K.abs(zm))}，arg ζ = ${deg(K.arg(zm))}`);
    zv.redraw(); wv.redraw();
  }
  function load(i) {
    const P = PRE[i];
    Object.assign(s, { pre: i, p: P.p, q: P.q, pw: P.pw, qw: P.qw, kl: Math.log10(P.k[0]), ka: P.k[1] });
    klSl.value = s.kl; kaSl.value = s.ka;
    zv.setHome(...P.zv); wv.setHome(...P.wv);
    tip.innerHTML = P.tip; renderMath(tip);
    update();
  }
  load(0);
  return {};
}
