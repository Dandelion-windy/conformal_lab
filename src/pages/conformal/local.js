// 第 2 章 · 标签 1：局部几何——旋转角、伸缩率、保角、方向；Jacobian 与 C-R 方程
import * as K from '../../core/complex.js';
import { h, select, slider, toggle, group, readouts, note, button, setTex, renderMath } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer, planeShader } from '../../core/gl.js';
import { compile } from '../../core/compile.js';
import { mapCurve, circlePts, segment } from '../../core/mapcurve.js';
import { strokePath, arrow, dot } from '../../core/draw.js';
import { cx, num, deg, texCx, texNum } from '../../core/format.js';

export const FNS = [
  { e: 'z^2', z0: K.C(0.8, 0.5) }, { e: 'z^3', z0: K.C(0.7, 0.4) }, { e: 'exp(z)', z0: K.C(0.3, 0.6) }, { e: '1/z', z0: K.C(0.8, 0.4) },
  { e: 'sin(z)', z0: K.C(0.6, 0.4) }, { e: '(z-1)/(z+1)', z0: K.C(0.3, 0.5) }, { e: '(z+1/z)/2', z0: K.C(1.3, 0.5) }, { e: 'log(z)', z0: K.C(1, 0.6) },
  { e: 'conj(z)', z0: K.C(0.8, 0.5), g: '非解析' }, { e: 'x+2i*y', z0: K.C(0.8, 0.5), g: '非解析' }, { e: 'z+0.5conj(z)', z0: K.C(0.8, 0.5), g: '非解析' }, { e: 'z*abs(z)', z0: K.C(0.8, 0.5), g: '非解析' },
];
// 字母 F：用于判断是否保持定向
const GLYPH = [[[0, 0], [0, 1]], [[0, 1], [0.62, 1]], [[0, 0.52], [0.46, 0.52]]];

// 数值 Wirtinger 导数
export function wirt(f, z) {
  const hh = 1e-6 * Math.max(1, K.abs(z));
  const fx = K.scale(K.sub(f(K.C(z.re + hh, z.im)), f(K.C(z.re - hh, z.im))), 0.5 / hh);
  const fy = K.scale(K.sub(f(K.C(z.re, z.im + hh)), f(K.C(z.re, z.im - hh))), 0.5 / hh);
  const mi = K.mul(K.I, fy);
  return { fx, fy, fz: K.scale(K.sub(fx, mi), 0.5), fzb: K.scale(K.add(fx, mi), 0.5) };
}

export function mountLocal(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>z</b> 平面：过 z₀ 的两条曲线与小圆' });
  const wv = new PlaneView(b2, { title: '<b>w</b> 平面：它们的像' });
  const s = { i: 0, z0: K.C(0.8, 0.5), rho: 0.35, t1: 0.15, t2: 1.2, follow: true, bg: true, curved: false };
  let fn = compile(FNS[0].e), f = (z) => fn.js(z, {});
  let zProg = null;
  const wProg = renderer().ok ? renderer().program(planeShader('z')) : null;
  const uni = () => ({ u_colorMode: s.bg ? 0 : 4, u_bright: 0.32, u_lines: 0, u_lineStep: 1 });
  zv.bg = () => ({ prog: zProg, uniforms: uni() });
  wv.bg = () => ({ prog: wProg, uniforms: uni() });
  zv.setHome(0, 0, 2); wv.setHome(0, 0, 2.5);

  // 源图形：两条曲线（直线或弯曲的圆弧）、同心小圆、字母 F
  const dirOf = (t) => K.cis(t);
  const curve = (t, sgn) => {
    const pts = [];
    for (let i = -40; i <= 40; i++) {
      const u = (i / 40) * s.rho * 1.6;
      let z = K.add(s.z0, K.scale(dirOf(t), u));
      if (s.curved) z = K.add(z, K.scale(dirOf(t + Math.PI / 2), sgn * 0.9 * u * u / s.rho));
      pts.push(z);
    }
    return pts;
  };
  const glyph = () => GLYPH.map(([a, b]) => segment(K.add(s.z0, K.C((0.18 + a[0] * 0.5) * s.rho, (-0.9 + a[1] * 0.5) * s.rho)), K.add(s.z0, K.C((0.18 + b[0] * 0.5) * s.rho, (-0.9 + b[1] * 0.5) * s.rho)), 24));
  const rings = () => [0.5, 1].map((k) => circlePts(s.z0, s.rho * k, 120));
  const dirDeriv = (t) => { const d = dirOf(t), hh = 1e-6 * Math.max(1, K.abs(s.z0)); return K.scale(K.sub(f(K.add(s.z0, K.scale(d, hh))), f(K.sub(s.z0, K.scale(d, hh)))), 0.5 / hh); };

  zv.overlays.push((ctx, v) => {
    for (const r of rings()) strokePath(ctx, v, r, { color: 'rgba(255,255,255,0.85)', width: 1.4 });
    for (const g of glyph()) strokePath(ctx, v, g, { color: '#6ee7a8', width: 3 });
    strokePath(ctx, v, curve(s.t1, 1), { color: '#ff6b9a', width: 2.4 });
    strokePath(ctx, v, curve(s.t2, -1), { color: '#5cc8ff', width: 2.4 });
    arrow(ctx, v, s.z0, K.add(s.z0, K.scale(dirOf(s.t1), s.rho)), '#ff6b9a', 2.6);
    arrow(ctx, v, s.z0, K.add(s.z0, K.scale(dirOf(s.t2), s.rho)), '#5cc8ff', 2.6);
  });
  wv.overlays.push((ctx, v) => {
    const proj = (w) => v.toScreen(w), o = { W: v.W, H: v.H };
    for (const r of rings()) strokePath(ctx, v, mapCurve(f, r, proj, o), { color: 'rgba(255,255,255,0.85)', width: 1.4 });
    for (const g of glyph()) strokePath(ctx, v, mapCurve(f, g, proj, o), { color: '#6ee7a8', width: 3 });
    strokePath(ctx, v, mapCurve(f, curve(s.t1, 1), proj, o), { color: '#ff6b9a', width: 2.4 });
    strokePath(ctx, v, mapCurve(f, curve(s.t2, -1), proj, o), { color: '#5cc8ff', width: 2.4 });
    const w0 = f(s.z0);
    const R = imgRadius();
    for (const [t, c] of [[s.t1, '#ff6b9a'], [s.t2, '#5cc8ff']]) {
      const d = dirDeriv(t), L = K.abs(d);
      if (L > 1e-9 && K.isFin(d)) arrow(ctx, v, w0, K.add(w0, K.scale(d, R / Math.max(L, 1e-12) * Math.min(1, L * s.rho / R))), c, 2.6);
    }
    dot(ctx, v, w0, '#fff', 3.5);
  });
  const hz = { color: '#ffffff', label: 'z₀', r: 7, pos: () => s.z0, move: (z) => { s.z0 = z; update(); } };
  const hd1 = { color: '#ff6b9a', r: 5, pos: () => K.add(s.z0, K.scale(dirOf(s.t1), s.rho)), move: (z) => { s.t1 = K.arg(K.sub(z, s.z0)); update(); } };
  const hd2 = { color: '#5cc8ff', r: 5, pos: () => K.add(s.z0, K.scale(dirOf(s.t2), s.rho)), move: (z) => { s.t2 = K.arg(K.sub(z, s.z0)); update(); } };
  zv.handles.push(hd1, hd2, hz);
  // 与 f(z₀) 处的局部放大率一致：使像在屏幕上与原图同样大小
  function imgRadius() {
    const w0 = f(s.z0);
    let m = 0;
    for (let k = 0; k < 48; k++) { const w = f(K.add(s.z0, K.scale(K.cis((2 * Math.PI * k) / 48), s.rho))); if (K.isFin(w)) m = Math.max(m, K.abs(K.sub(w, w0))); }
    return m || s.rho;
  }
  function follow() {
    if (!s.follow) return;
    const w0 = f(s.z0);
    if (!K.isFin(w0)) return;
    const hwz = Math.min(zv.W, zv.H) / (2 * zv.ppu);
    wv.setView(w0.re, w0.im, (hwz * imgRadius()) / s.rho);
  }
  zv.onView = () => { follow(); };

  const sel = select({ label: '映射 f(z)', options: FNS.map((q, i) => ({ value: i, label: q.e, group: q.g || '解析函数' })), value: 0, onChange: (v) => load(+v) });
  const exprIn = h('input', { class: 'text-input', spellcheck: 'false', placeholder: '自定义，如 z^2+2z' });
  const err = h('div', { class: 'err-msg' });
  exprIn.addEventListener('keydown', (e) => { if (e.key !== 'Enter') return; try { setFn(exprIn.value); exprIn.classList.remove('err'); err.textContent = ''; } catch (x) { exprIn.classList.add('err'); err.textContent = x.message; } });
  const rhoSl = slider({ label: '邻域半径 ρ', min: 0.02, max: 1.2, step: 0.005, value: s.rho, onInput: (v) => { s.rho = v; update(); } });
  const tFollow = toggle({ label: 'w 视图跟随并同比放大', value: s.follow, onChange: (v) => { s.follow = v; update(); } });
  const tBg = toggle({ label: '相位背景', value: s.bg, onChange: (v) => { s.bg = v; zv.redraw(); wv.redraw(); } });
  const tCurved = toggle({ label: '用弯曲的曲线', value: s.curved, onChange: (v) => { s.curved = v; update(); } });
  const zoomBtn = button('放大到 z₀ 附近', () => { zv.setView(s.z0.re, s.z0.im, s.rho * 2.4); update(); }, 'small');
  const homeBtn = button('还原视图', () => { zv.resetView(); update(); }, 'small');
  const critBtn = button('移到临界点', () => { const c = crit(); if (c) { s.z0 = c; update(); } }, 'small');
  const ro = readouts([['z0', 'z₀'], ['w0', 'f(z₀)'], ['d', 'f′(z₀)'], ['k', '伸缩率 |f′|'], ['a', '旋转角 arg f′'], ['ang', '两曲线夹角'], ['ori', '定向'], ['area', '面积放大 J']]);
  const jac = h('div', { class: 'formula-box' });
  const verdict = note('');
  panel.append(
    group('映射', sel.el, h('div', { class: 'ctl' }, exprIn, err)),
    group('局部探针', rhoSl.el, h('div', { class: 'toggles' }, tFollow.el, tBg.el, tCurved.el), h('div', { class: 'btn-row' }, zoomBtn, homeBtn, critBtn)),
    group('读数', ro.el),
    group('Jacobi 矩阵与 C-R 方程', jac),
    group('结论', verdict),
    group('操作', note('拖动白点 <b>z₀</b> 及红、蓝两个方向点。把 ρ 调小（或点“放大到 z₀ 附近”），右图会越来越像左图的<b>旋转 + 伸缩</b>。字母 <b class="c-green">F</b> 用来观察定向：若像变成镜像的 F，映射反转定向。')),
  );
  renderMath(panel);

  function crit() {
    // 在 z₀ 附近用牛顿法求 f′ 的零点
    const fp = (z) => K.deriv(f, z, 1e-4);
    let z = s.z0;
    for (let k = 0; k < 40; k++) {
      const d = K.deriv(fp, z, 1e-4);
      const step = K.div(fp(z), d);
      if (!K.isFin(step)) break;
      z = K.sub(z, step);
      if (K.abs(step) < 1e-10) break;
    }
    return K.abs(fp(z)) < 1e-5 ? z : null;
  }
  function setFn(src) {
    fn = compile(src); f = (z) => fn.js(z, {});
    zProg = renderer().ok ? renderer().program(planeShader(fn.glsl, '', fn.xglsl)) : null;
    critBtn.hidden = !fn.holomorphic;
    update();
  }
  function load(i) { s.i = i; s.z0 = FNS[i].z0; exprIn.value = FNS[i].e; setFn(FNS[i].e); }

  function update() {
    const z0 = s.z0, w0 = f(z0), W = wirt(f, z0);
    const holo = K.abs(W.fzb) < 1e-5 * Math.max(1, K.abs(W.fz));
    const d = W.fz, k = K.abs(d);
    const d1 = dirDeriv(s.t1), d2 = dirDeriv(s.t2);
    const norm = (a) => { a %= 2 * Math.PI; if (a > Math.PI) a -= 2 * Math.PI; if (a < -Math.PI) a += 2 * Math.PI; return a; };
    const before = norm(s.t2 - s.t1), after = norm(K.arg(d2) - K.arg(d1));
    const J = K.abs2(W.fz) - K.abs2(W.fzb);
    ro.set('z0', cx(z0)); ro.set('w0', cx(w0));
    ro.set('d', holo ? cx(d) : `不存在（f_z̄ = ${cx(W.fzb)}）`);
    ro.set('k', holo ? num(k) : `随方向变化：${num(Math.abs(K.abs(W.fz) - K.abs(W.fzb)))} ~ ${num(K.abs(W.fz) + K.abs(W.fzb))}`);
    ro.set('a', holo ? (k > 1e-6 ? deg(K.arg(d)) : '无定义（f′=0）') : '随方向变化');
    // 临界点处用像曲线的割线方向估计夹角
    let afterTxt = deg(after);
    if (holo && k < 1e-4) {
      const sec = (t) => K.arg(K.sub(f(K.add(z0, K.scale(dirOf(t), s.rho * 0.05))), w0));
      afterTxt = `${deg(norm(sec(s.t2) - sec(s.t1)))}（f′=0 处）`;
    }
    ro.set('ang', `${deg(before)} → ${afterTxt}`);
    ro.set('ori', J > 1e-9 ? '<span class="c-green">保持</span>' : J < -1e-9 ? '<span class="c-pink">反转</span>' : '退化');
    ro.set('area', num(J));
    const ux = W.fx.re, vx = W.fx.im, uy = W.fy.re, vy = W.fy.im;
    const ok1 = Math.abs(ux - vy) < 1e-5 * (1 + Math.abs(ux)), ok2 = Math.abs(uy + vx) < 1e-5 * (1 + Math.abs(uy));
    setTex(jac, `J=\\begin{pmatrix}u_x&u_y\\\\v_x&v_y\\end{pmatrix}=\\begin{pmatrix}${texNum(ux)}&${texNum(uy)}\\\\${texNum(vx)}&${texNum(vy)}\\end{pmatrix}\\\\[4pt]
u_x-v_y=${texNum(ux - vy)}\\ ${ok1 ? '\\color{#6ee7a8}\\checkmark' : '\\color{#ff6b9a}\\times'},\\qquad u_y+v_x=${texNum(uy + vx)}\\ ${ok2 ? '\\color{#6ee7a8}\\checkmark' : '\\color{#ff6b9a}\\times'}\\\\[4pt]
f_z=${texCx(W.fz)},\\quad f_{\\bar z}=${texCx(W.fzb)},\\quad \\det J=|f_z|^2-|f_{\\bar z}|^2=${texNum(J)}`, true);
    if (holo && k > 1e-4) {
      verdict.className = 'note good';
      verdict.innerHTML = `$f'(z_0)=${texCx(d)}\\ne0$：过 $z_0$ 的每条曲线的切线都<b>转过同一个角</b> $\\arg f'(z_0)=${deg(K.arg(d))}$，每个方向上的长度都放大 $|f'(z_0)|=${num(k)}$ 倍。因此夹角大小与方向都保持，无穷小圆映成无穷小圆——<b>f 在 z₀ 处共形</b>。`;
    } else if (holo) {
      const m = Math.log(K.abs(K.sub(f(K.add(z0, K.C(2e-3))), w0)) / K.abs(K.sub(f(K.add(z0, K.C(1e-3))), w0))) / Math.LN2;
      verdict.className = 'note bad';
      verdict.innerHTML = `$f'(z_0)=0$：<b>临界点</b>。在这里 $f(z)-f(z_0)\\approx c\\,(z-z_0)^{m}$，$m\\approx${Math.round(m)}$，所以夹角被放大 $${Math.round(m)}$ 倍，<b>不共形</b>。`;
    } else {
      verdict.className = 'note warn';
      verdict.innerHTML = `$f_{\\bar z}\\ne0$，不满足 C-R 方程，$f$ 在 $z_0$ 处不可导。局部线性部分 $df=f_z\\,dz+f_{\\bar z}\\,d\\bar z$ 把小圆映成<b>椭圆</b>，长短半轴之比 $\\dfrac{|f_z|+|f_{\\bar z}|}{\\big||f_z|-|f_{\\bar z}|\\big|}=${num((K.abs(W.fz) + K.abs(W.fzb)) / Math.max(1e-12, Math.abs(K.abs(W.fz) - K.abs(W.fzb))))}$。${J < 0 ? '且 $\\det J<0$，<b>定向反转</b>（若 $f_z=0$，是保持角的大小但反转方向的“第二类保角映射”）。' : ''}`;
    }
    renderMath(verdict);
    follow();
    zv.redraw(); wv.redraw();
  }
  load(0);
  return {};
}
