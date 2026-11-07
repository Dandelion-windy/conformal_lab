// 黎曼球面 · 标签 4：函数在扩充平面上（∞ 处的零点、极点、本性奇点）
import { h, select, segmented, group, note, renderMath, setTex, button } from '../../core/ui.js';
import { SphereView } from '../../core/sphere3d.js';
import { PlaneView } from '../../core/view2d.js';
import { renderer, planeShader } from '../../core/gl.js';
import { sphereShader } from '../../core/sphere-shader.js';
import { compile } from '../../core/compile.js';

const FNS = [
  { e: 'z', t: 'z', inf: '$\\infty$ 是一阶极点：$f(1/\\zeta)=1/\\zeta$。恒等映射在球面上着色：0 处黑、∞ 处白（黎曼球着色）。' },
  { e: 'z^2', t: 'z^2', inf: '$f(1/\\zeta)=\\zeta^{-2}$，$\\infty$ 是二阶极点：绕 N 一圈颜色转两圈（方向与绕 0 相反）。' },
  { e: 'z^3-1', t: 'z^3-1', inf: '三个零点是三次单位根；$\\infty$ 是三阶极点。零点个数 = 极点个数（计重数）= 3，这是<b>有理函数在黎曼球面上的普遍规律</b>。' },
  { e: '1/z', t: '1/z', inf: '$f(1/\\zeta)=\\zeta$，$\\infty$ 是一阶零点；$0$ 是一阶极点。球面上看，$0$ 与 $\\infty$ 地位完全对称。' },
  { e: '(z-1)/(z+1)', t: '\\frac{z-1}{z+1}', inf: '$f(\\infty)=1$，$\\infty$ 是可去奇点（在球面上是普通点）。零点 1，极点 −1。' },
  { e: '(z^2+1)/(z^2-1)', t: '\\frac{z^2+1}{z^2-1}', inf: '$f(\\infty)=1$。两个零点 $\\pm i$，两个极点 $\\pm1$：二次有理函数是球面到球面的 2 对 1 映射。' },
  { e: 'z+1/z', t: 'z+\\frac1z', inf: '$0$ 与 $\\infty$ 都是一阶极点；零点 $\\pm i$。' },
  { e: 'exp(z)', t: 'e^z', inf: '$\\infty$ 是<b>本性奇点</b>：$e^{1/\\zeta}$ 在 $\\zeta\\to0$ 时没有极限。在球面上，N 附近颜色无限次地振荡。右图是 $f(1/\\zeta)$ 在 $\\zeta=0$ 附近的样子。' },
  { e: 'sin(z)', t: '\\sin z', inf: '整函数，零点 $k\\pi$ 沿实轴排列并在 N 处聚集；$\\infty$ 是本性奇点（非有理的整函数都如此）。' },
  { e: 'z^4-z', t: 'z^4-z', inf: '$n$ 次多项式在 $\\infty$ 处有 $n$ 阶极点：右图中 $\\zeta=0$ 处颜色绕 4 圈。' },
];

export function mountFunctions(stage, panel) {
  const b1 = h('div'), b2 = h('div');
  stage.append(b1, b2);
  const sv = new SphereView(b1, { title: '函数的相位图贴在黎曼球面上', plane: false, sAlpha: 1 });
  sv.cam.pitch = 0.35; sv.cam.dist = 5.2;
  const pv = new PlaneView(b2, { title: '$\\infty$ 附近：$g(\\zeta)=f(1/\\zeta)$，$\\zeta\\to0$' });
  renderMath(b2);
  pv.setHome(0, 0, 1.2);
  const s = { i: 0, colorMode: 0 };
  const uni = () => ({ u_colorMode: s.colorMode, u_bright: 0.85, u_lines: 0, u_lineStep: 1 });
  sv.uniforms = uni;
  let prog2 = null;
  pv.bg = () => ({ prog: prog2, uniforms: uni() });
  sv.overlays.push((ctx) => {
    sv.point(ctx, [0, 0, 1], '#ffffff', 4, 'N = ∞');
    sv.point(ctx, [0, 0, -1], '#ffffff', 4, 'S = 0');
  });
  const sel = select({ label: '函数 f(z)', options: FNS.map((f, i) => ({ value: i, label: f.e })), value: 0, onChange: (v) => load(+v) });
  const cm = segmented({ label: '着色', options: [{ value: 0, label: '相位 + 模环' }, { value: 1, label: '黎曼球着色' }], value: 0, onChange: (v) => { s.colorMode = v; sv.redraw(); pv.redraw(); } });
  const fBox = h('div', { class: 'formula-box' });
  const info = note('');
  const views = h('div', { class: 'btn-row' }, button('看 N（∞）', () => { sv.cam.pitch = 1.4; sv.redraw(); }, 'small'), button('看 S（0）', () => { sv.cam.pitch = -1.4; sv.redraw(); }, 'small'), button('侧面', () => { sv.cam.pitch = 0.35; sv.redraw(); }, 'small'));
  panel.append(group('函数', sel.el, cm.el, fBox), group('视角', views), group('∞ 处的性态', info),
    group('读图', note('相位着色中，绕一点一圈颜色按 <b>红→黄→绿→蓝</b>（逆时针）转 $n$ 圈表示 $n$ 阶零点，反向转表示极点。在球面上看，“绕 ∞ 一圈”就是绕北极 N 一圈。')));
  renderMath(panel);
  function load(i) {
    s.i = i;
    const f = FNS[i], fn = compile(f.e), r = renderer();
    sv.prog = r.program(sphereShader(fn.glsl, fn.xglsl));
    // g(ζ) = f(1/ζ)：在 GLSL 中把 z 替换为 1/ζ
    prog2 = r.ok ? r.program(planeShader('Fz(cinv(z))', `vec2 Fz(vec2 z) { return ${fn.glsl}; }`, fn.xglslOf('xinv(Z)'))) : null;
    setTex(fBox, `f(z)=${f.t}`, true);
    info.innerHTML = f.inf;
    renderMath(info);
    sv.redraw(); pv.redraw();
  }
  load(0);
  return {};
}
