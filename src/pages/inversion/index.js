// 第 3 章 反演：对称点、保圆、保对称；黎曼球面是复平面的空间反演像
import { tabbedShell, theory } from '../common.js';
import { mountPoints } from './points.js';
import { mountCircles } from './circles.js';
import { mountStereo } from './stereo.js';
import { mountMirror } from './mirror.js';

let page = null;
const TABS = [
  { id: 'point', label: '反演与对称点', stageClass: 'one', mount: mountPoints },
  { id: 'circle', label: '圆与直线的像', stageClass: 'one', mount: mountCircles },
  { id: 'stereo', label: '黎曼球面 = 空间反演', stageClass: 'one', mount: mountStereo },
  { id: 'mirror', label: '球面上的反演', stageClass: 'one', mount: mountMirror },
];

export default {
  mount(root, app, arg) {
    page = tabbedShell(root, {
      num: '03', title: '反演',
      lead: '关于圆的反演把圆变成圆、把对称点变成对称点。黎曼球面本身就是复平面在空间中的一个反演像，所以球极投影的性质、分式线性变换的保圆与保对称，都可以从反演直接看出来。',
      tabs: TABS,
    });
    page.select(TABS.some((t) => t.id === arg) ? arg : 'point');
    theory(page.theory, '原理与要点', [
      { title: '定义', tag: '定义', html: `
<p>Γ：$|z-z_0|=R$。$z$ 的反演点 $z^*$ 在射线 $z_0z$ 上，且 $|z-z_0|\\cdot|z^*-z_0|=R^2$：</p>
$$z^*=z_0+\\frac{R^2}{\\overline{z-z_0}},\\qquad \\text{单位圆：}\\ z^*=\\frac1{\\bar z}$$
<p>规定 $z_0\\leftrightarrow\\infty$。$z$ 与 $z^*$ 叫做关于 Γ <b>对称</b>。Γ 是直线时就是普通的镜面对称。</p>` },
      { title: '从图上直接看出的性质', tag: '性质', html: `
<ul>
<li>Γ 上的点不动；Γ 内外互换；$z_0\\leftrightarrow\\infty$；做两次回到原处。</li>
<li>过 $z_0$ 的直线不变；与 Γ 正交的圆不变。</li>
<li>保角，但转向相反（公式里是 $\\bar z$）。</li>
<li>$z_1,z_2$ 关于 Γ 对称 $\\iff$ 过它们的圆都与 Γ 正交。</li>
</ul>` },
      { title: '保圆与保对称', tag: '定理', html: `
<ul>
<li><b>过 $z_0$ 的圆 ↔ 不过 $z_0$ 的直线</b>：直径所对的圆周角是直角，相似三角形把直角搬到像上。</li>
<li><b>不过 $z_0$ 的圆 → 圆</b>：过 $z_0$ 的直线截圆所得两段之积是常数（圆幂），像就是原来那个圆的位似。</li>
<li><b>保对称</b>：对称点 = 正交圆族的公共点；反演保圆、保角，正交圆族的像仍是正交圆族。</li>
</ul>
<p class="small muted">推论：圆 $C$ 的圆心 $c$ 与 $\\infty$ 关于 $C$ 对称，所以 $c^*$ 与 $z_0$ 关于 $C^*$ 对称，一般不是 $C^*$ 的圆心。</p>` },
      { title: '两次反演', tag: '复合', html: `
<ul>
<li>关于两条夹角为 $\\theta$ 的相交直线：旋转 $2\\theta$；两条平行线：平移。</li>
<li>关于两个同心圆 $R_1,R_2$：伸缩 $z\\mapsto (R_2/R_1)^2z$。</li>
<li>$\\dfrac1z$：先关于单位圆反演得 $\\dfrac1{\\bar z}$，再关于实轴对称。</li>
</ul>
<p>平移、旋转、伸缩、$\\frac1z$ 都是两次反演，分式线性变换是它们的复合，所以<b>保圆、保对称直接继承自反演</b>（第 04 章）。</p>` },
      { title: '黎曼球面与球面上的反演', tag: '球面', wide: true, html: `
<ul>
<li>取单位球面 $S$，复平面 Π 为赤道面。以北极 $N$ 为球心、半径 $\\sqrt2$ 的球面 $K$ 作空间反演 $I_K$：$K\\cap\\Pi$ 是单位圆（不动），$I_K(\\Pi)$ 是过 $N$、含赤道与南极的球面，即 $S$。球极投影就是 $I_K$ 在 Π 上的限制。</li>
<li>于是“平面上的圆 ↔ 球面上的圆”“直线 ↔ 过 $N$ 的圆”“保角”都是空间反演的性质，不用再计算。</li>
<li>$z$ 与 $1/\\bar z$ 关于 $S$ 对称，$I_K$ 保对称且 $I_K(S)=\\Pi$，所以<b>关于单位圆的反演在球面上是关于赤道面的镜面对称</b>。再加上 $\\bar z$ ↔ 关于 $\\xi O\\zeta$ 面的对称：$\\frac1z$ ↔ 绕实轴转 $180^\\circ$，$-\\frac1{\\bar z}$ ↔ 对径点，$e^{i\\theta}z$ ↔ 绕竖直轴旋转。</li>
</ul>
<p class="small muted">若用与平面切于原点、直径为 1 的球面，对应的 K 以 N 为球心、半径为 1，恰好与复平面切于原点。</p>` },
    ]);
  },
  show(arg) { if (page && arg && TABS.some((t) => t.id === arg)) page.select(arg); },
};
