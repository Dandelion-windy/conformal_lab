// 第 3 章 · 标签 4：不动点、乘子与分类（椭圆 / 双曲 / 斜驶 / 抛物），轨道与流线
import * as K from '../../core/complex.js';
import { h, slider, segmented, group, readouts, note, setTex, renderMath, toggle } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer, mobiusShader, matUniforms } from '../../core/gl.js';
import { mobiusTex, classify } from '../../core/mobius.js';
import { strokePath, dot, label } from '../../core/draw.js';
import { cx, num, deg, texCx } from '../../core/format.js';
import { player } from '../common.js';

const TYPES = [
  { value: 'ell', label: '椭圆型', k: [1, 1.0] },
  { value: 'hyp', label: '双曲型', k: [2.2, 0] },
  { value: 'lox', label: '斜驶型', k: [1.8, 0.9] },
  { value: 'par', label: '抛物型' },
];

export function mountDynamics(stage, panel) {
  const b1 = h('div'); stage.append(b1);
  const v = new PlaneView(b1, { title: '不动点、轨道与不变曲线族', unitCircle: false });
  v.setHome(0, 0, 2.6);
  const s = { type: 'lox', p: K.C(-0.9, 0.2), q: K.C(1, -0.3), rho: 1.8, th: 0.9, beta: K.C(0.6, 0.5), z0: K.C(0.2, 0.9), t: 0, flow: true, orbit: true };
  // S: 把不动点送到 0, ∞（抛物型：p → ∞）
  let S, Si, M, D;
  // 流 T_t = S⁻¹ ∘ D_t ∘ S
  const Dt = (t) => (s.type === 'par' ? [K.ONE, K.scale(s.beta, t), K.ZERO, K.ONE] : [K.exp(K.scale(K.log(kval()), t)), K.ZERO, K.ZERO, K.ONE]);
  const kval = () => (s.type === 'ell' ? K.cis(s.th) : s.type === 'hyp' ? K.C(s.rho) : K.polar(s.rho, s.th));
  const Tt = (t) => K.matMul(Si, K.matMul(Dt(t), S));
  const prog = renderer().ok ? renderer().program(mobiusShader()) : null;
  // 背景：在共轭坐标 ζ = S(T_t⁻¹ z) 下的棋盘格——格线是不变圆族（阿波罗尼斯圆与施泰纳圆）
  v.bg = () => {
    const B = K.matMul(S, K.matInv(Tt(s.t)));
    return { prog, uniforms: { u_colorMode: s.type === 'par' ? 2 : 3, u_bright: 0.62, u_lines: 0, u_lineStep: 0.5, ...matUniforms(B) } };
  };
  v.overlays.push((ctx, view) => {
    if (s.flow) {
      // 若干条流线：T_t(z) 对 t ∈ ℝ
      const seeds = [];
      if (s.type === 'par') { const n = K.mul(K.I, K.scale(s.beta, 1 / (K.abs(s.beta) || 1))); for (let k = -6; k <= 6; k++) seeds.push(K.mobius(Si, K.scale(n, k * 0.35))); }
      else if (s.type === 'ell') for (let k = -5; k <= 5; k++) seeds.push(K.mobius(Si, K.C(2 ** (k / 2))));
      else for (let k = 0; k < 12; k++) seeds.push(K.mobius(Si, K.cis((k * Math.PI) / 6)));
      for (const z of seeds) {
        const pts = [];
        for (let i = -200; i <= 200; i++) pts.push(K.mobius(Tt(i / 20), z));
        strokePath(ctx, view, pts, { color: 'rgba(255,255,255,0.45)', width: 1.1, casing: false, maxJump: 120 });
      }
    }
    if (s.orbit) {
      const pts = [], orb = [];
      for (let i = -300; i <= 300; i++) pts.push(K.mobius(Tt(i / 30), s.z0));
      strokePath(ctx, view, pts, { color: '#ffb454', width: 2, maxJump: 160 });
      for (let n = -12; n <= 12; n++) orb.push([n, K.mobius(Tt(n), s.z0)]);
      for (const [n, z] of orb) if (n !== 0) dot(ctx, view, z, n > 0 ? '#ffb454' : '#7a5a30', n > 0 ? 3.6 : 3);
      const z1 = K.mobius(M, s.z0);
      if (K.isFin(z1)) { const [x, y] = view.toScreen(z1); label(ctx, x + 7, y - 9, 'T(z₀)', '#ffb454'); }
    }
    const zt = K.mobius(Tt(s.t), s.z0);
    dot(ctx, view, zt, '#ffffff', 4);
  });
  const fixH = (key, lab) => ({ color: '#6ee7a8', r: 7, label: lab, hidden: () => key === 'q' && s.type === 'par', pos: () => s[key], move: (z) => { s[key] = z; update(); } });
  v.handles.push(fixH('p', 'p'), fixH('q', 'q'),
    { color: '#ffb454', r: 6, label: 'z₀', pos: () => s.z0, move: (z) => { s.z0 = z; update(); } },
    { color: '#5cc8ff', r: 6, label: 'β', hidden: () => s.type !== 'par', pos: () => K.add(s.p, s.beta), move: (z) => { s.beta = K.sub(z, s.p); update(); } });

  const typeSeg = segmented({ label: '类型', options: TYPES, value: s.type, onChange: (val) => { s.type = val; const T = TYPES.find((x) => x.value === val); if (T.k) { s.rho = T.k[0]; s.th = T.k[1]; rhoSl.value = s.rho; thSl.value = s.th; } update(); } });
  const rhoSl = slider({ label: '乘子模 |k|', min: 0.25, max: 4, value: s.rho, onInput: (x) => { s.rho = x; update(); } });
  const thSl = slider({ label: '乘子辐角 arg k', min: -Math.PI, max: Math.PI, value: s.th, fmt: (x) => deg(x), onInput: (x) => { s.th = x; update(); } });
  const tF = toggle({ label: '不变曲线（流线）', value: s.flow, onChange: (x) => { s.flow = x; v.redraw(); } });
  const tO = toggle({ label: 'z₀ 的轨道', value: s.orbit, onChange: (x) => { s.orbit = x; v.redraw(); } });
  const play = player({ max: 1, value: 0, speed: 0.35, loop: true, onFrame: (t) => { s.t = t; v.redraw(); }, fmt: (x) => `t=${x.toFixed(2)}` });
  const fBox = h('div', { class: 'formula-box' });
  const ro = readouts([['k', '乘子 k'], ['tr', 'tr²/det'], ['ty', '分类'], ['att', '不动点性质']]);
  const expl = note('');
  panel.append(
    group('构造', typeSeg.el, rhoSl.el, thSl.el, h('div', { class: 'toggles' }, tF.el, tO.el)),
    group('连续作用 T_t（t 从 0 到 1 即一次 T）', play.el),
    group('变换', fBox, ro.el),
    group('解释', expl),
  );
  renderMath(panel);
  function update() {
    const par = s.type === 'par';
    rhoSl.el.hidden = par || s.type === 'ell';
    thSl.el.hidden = par || s.type === 'hyp';
    if (par) { S = [K.ZERO, K.ONE, K.ONE, K.neg(s.p)]; }
    else S = [K.ONE, K.neg(s.p), K.ONE, K.neg(s.q)];
    Si = K.matInv(S);
    M = K.matNormalize(Tt(1));
    D = classify(M);
    const k = kval();
    setTex(fBox, par ? `\\frac{1}{T(z)-p}=\\frac{1}{z-p}+\\beta,\\quad \\beta=${texCx(s.beta)}\\\\[4pt] T(z)=${mobiusTex(M)}` : `\\frac{T(z)-p}{T(z)-q}=k\\,\\frac{z-p}{z-q},\\quad k=${texCx(k)}\\\\[4pt] T(z)=${mobiusTex(M)}`, true);
    ro.set('k', par ? '—（只有一个不动点）' : `${cx(k)}　|k| = ${num(K.abs(k))}，arg k = ${deg(K.arg(k))}`);
    ro.set('tr', cx(D.t2));
    ro.set('ty', D.name);
    ro.set('att', par ? 'p 是二重不动点：所有轨道正反向都趋于 p' : K.abs(k) > 1 + 1e-9 ? 'q 吸引（Tⁿz → q），p 排斥' : K.abs(k) < 1 - 1e-9 ? 'p 吸引（Tⁿz → p），q 排斥' : 'p、q 都是中性的（无吸引）');
    expl.innerHTML = {
      ell: '<b>椭圆型</b>（$|k|=1$）：在共轭坐标 $\\zeta=\\frac{z-p}{z-q}$ 中是旋转 $\\zeta\\mapsto k\\zeta$。点沿以 $p,q$ 为对称点的<b>阿波罗尼斯圆</b>运动；过 $p,q$ 的圆族被相互置换。在黎曼球面上它就是一个绕轴的旋转（共轭后）。$\\operatorname{tr}^2\\in[0,4)$。',
      hyp: '<b>双曲型</b>（$k>0,\\ k\\ne1$）：$\\zeta\\mapsto k\\zeta$ 是伸缩。点沿<b>过 $p,q$ 的圆弧</b>从排斥不动点流向吸引不动点；阿波罗尼斯圆族被相互置换。$\\operatorname{tr}^2>4$。',
      lox: '<b>斜驶型</b>（$k$ 非正实数且 $|k|\\ne1$）：旋转与伸缩同时发生，轨道是从一个不动点盘旋到另一个的<b>螺线</b>（球面上的斜驶线）。$\\operatorname{tr}^2\\notin[0,+\\infty)$。',
      par: '<b>抛物型</b>：只有一个（二重）不动点 $p$。把 $p$ 送到 $\\infty$ 后它是平移 $\\zeta\\mapsto\\zeta+\\beta$，所以轨道是<b>在 $p$ 处彼此相切的圆</b>。$\\operatorname{tr}^2=4$（且非恒等）。',
    }[s.type];
    renderMath(expl);
    v.redraw();
  }
  update();
  return {};
}
