// 首页：导览与使用说明；右侧是缓慢自转的黎曼球面
import { h, renderMath } from '../core/ui.js';
import { SphereView } from '../core/sphere3d.js';
import { renderer } from '../core/gl.js';
import { sphereShader } from '../core/sphere-shader.js';
import { compile } from '../core/compile.js';

const CARDS = {
  sphere: '球极投影的实时公式、圆 ↔ 圆、保角、弦距离、∞ 的邻域；在两个球面上直接看映射：分式线性变换是球面的旋转或流动，有理函数是球面的多层覆盖。',
  conformal: '局部探针：旋转角与伸缩率、无穷小圆 → 无穷小圆、Jacobi 矩阵与 C-R 方程、临界点处角度放大。',
  inversion: '对称点的作图与正交圆刻画、各种位置的圆与直线的像、黎曼球面是复平面的空间反演、球面上的反演就是镜面对称。',
  mobius: '群结构、三点确定与交比、双极坐标网格与求变换的方法、分解为平移/倒数/伸缩的动画、不动点与四种类型。',
  elementary: '幂函数、根式、指数、对数、三角函数、茹科夫斯基函数的映射性质，每个都附典型区域示例。',
  lab: '输入任意 f(z)：网格、区域、自由画线、域着色、原像、变形动画、黎曼球面视图。',
  regions: '十道典型例题：透镜形、月牙形、割缝区域、半带形……逐步展示每一个初等映射的作用。',
  disk: '圆盘自同构与双曲几何，施瓦茨引理与施瓦茨–皮克引理的可视化验证。',
  sc: '数值计算的 Schwarz–Christoffel 映射：三角形、矩形、台阶、L 形、正多边形，拖动前顶点观察形状变化。',
  sheet: '初等映射、标准区域映射、核心定理、解题步骤的汇总表。',
};

let sv = null, raf = 0;
export default {
  mount(root, app) {
    const viewBox = h('div', { class: 'hero-view' });
    const hero = h('section', { class: 'hero' },
      h('div', {},
        h('div', { class: 'eyebrow', style: 'color:var(--accent);font:600 12px var(--mono);letter-spacing:.16em' }, 'COMPLEX ANALYSIS · CONFORMAL MAPPINGS'),
        h('h1', { html: '用眼睛理解<br><span>共形映射</span>' }),
        h('p', { class: 'lead', html: '本页把复变函数中“共形映射”一章的主要内容做成可交互的图形：从黎曼球面与扩充复平面出发，到导数的几何意义、反演、分式线性变换、初等函数的映射、区域之间的映射、施瓦茨引理、Schwarz–Christoffel 公式。所有图形实时计算，可以拖动、缩放、改参数。' }),
        h('div', { class: 'btn-row', style: 'margin-top:16px' },
          h('a', { class: 'btn primary', href: '#sphere', style: 'text-decoration:none' }, '从黎曼球面开始 →'),
          h('a', { class: 'btn', href: '#lab', style: 'text-decoration:none' }, '打开映射实验室'),
          h('a', { class: 'btn', href: '#sheet', style: 'text-decoration:none' }, '公式速查'))),
      viewBox);
    const grid = h('div', { class: 'home-grid' }, app.chapters.filter((c) => c.id !== 'home').map((c) =>
      h('a', { class: 'home-card', href: `#${c.id}` }, h('div', { class: 'hc-num' }, c.num), h('h3', {}, c.title), h('p', {}, CARDS[c.id] || c.sub))));
    const howto = h('div', { class: 'howto', html: `
<div><b>平移与缩放</b>在画布上拖动平移，滚轮缩放；右上角 ⟲ 恢复视图。三维视图中拖动旋转视角。</div>
<div><b>控制点</b>彩色圆点可以拖动，例如分式线性变换的三对点、自同构中的 a、前顶点 x_k。</div>
<div><b>域着色</b>颜色 = 辐角（红 0°、黄 60°、绿 120°、青 180°、蓝 240°、品红 300°），明暗环 = 模的等比刻度。左图在 z 处显示 f(z) 的颜色，同色即对应点。</div>
<div><b>网格的像</b>冷色线与暖色线是两族坐标线；白色粗线是坐标轴或单位圆。共形映射下两族线的像仍然正交。</div>
<div><b>链接</b>地址栏的 #章节/参数 可直接跳转，例如 <code>#lab/exp</code>、<code>#mobius/dyn</code>。</div>
<div><b>离线可用</b>本文件不依赖网络（公式渲染器与字体已内嵌）。建议使用新版 Chrome / Edge / Firefox。</div>` });
    root.append(hero, h('div', { class: 'theory-title', style: 'margin-top:26px' }, '章节'), grid, h('div', { class: 'theory-title', style: 'margin-top:26px' }, '使用说明'), howto);
    renderMath(root);
    sv = new SphereView(viewBox, { plane: true, planeR: 3, sAlpha: 0.92, pAlpha: 0.75 });
    sv.cam.dist = 6.8; sv.cam.pitch = 0.38;
    const fn = compile('(z^3-1)/(z^2+0.5)');
    sv.prog = renderer().program(sphereShader(fn.glsl, fn.xglsl));
    sv.uniforms = { u_colorMode: 0, u_bright: 0.85, u_lines: 2, u_lineStep: 0.5 };
  },
  show() {
    if (!sv || raf) return;
    let last = 0;
    const tick = (t) => { if (last) sv.cam.yaw += (t - last) * 0.00012; last = t; sv.redraw(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  },
  hide() { cancelAnimationFrame(raf); raf = 0; },
};
