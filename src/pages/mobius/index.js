// 第 3 章 分式线性变换
import { tabbedShell, theory } from '../common.js';
import { mountThreePoint } from './threepoint.js';
import { mountSymmetry } from './symmetry.js';
import { mountDecompose } from './decompose.js';
import { mountDynamics } from './dynamics.js';

let page = null;
const TABS = [
  { id: 'three', label: '三点确定 · 交比', mount: mountThreePoint },
  { id: 'sym', label: '保圆性 · 保对称性', mount: mountSymmetry },
  { id: 'dec', label: '分解与动画', mount: mountDecompose },
  { id: 'dyn', label: '不动点与分类', stageClass: 'one', mount: mountDynamics },
];

export default {
  mount(root, app, arg) {
    page = tabbedShell(root, {
      num: '03', title: '分式线性变换（莫比乌斯变换）',
      lead: '$w=\\dfrac{az+b}{cz+d}\\ (ad-bc\\ne0)$ 是扩充复平面到自身的共形双射。它有三个核心性质：<b>保圆性、保对称性、保交比</b>，并且由三对点唯一确定。',
      tabs: TABS,
    });
    page.select(TABS.some((t) => t.id === arg) ? arg : 'three');
    theory(page.theory, '原理与要点', [
      { title: '定义与基本性质', tag: '定义', html: `
<p>$w=\\dfrac{az+b}{cz+d}$，$ad-bc\\ne0$。约定 $c\\ne0$ 时 $-\\frac dc\\mapsto\\infty$，$\\infty\\mapsto\\frac ac$；$c=0$ 时 $\\infty\\mapsto\\infty$。</p>
<ul>
<li>导数 $w'=\\dfrac{ad-bc}{(cz+d)^2}\\ne0$，在 $\\overline{\\mathbb C}$ 上<b>处处共形</b>（包括 $\\infty$ 与 $-d/c$，用 $\\zeta=1/z$ 检验）。</li>
<li>它是 $\\overline{\\mathbb C}\\to\\overline{\\mathbb C}$ 的双射，逆变换 $z=\\dfrac{dw-b}{-cw+a}$ 也是分式线性的。全体构成群，复合对应矩阵乘法：$\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$，矩阵差一个非零倍数表示同一变换（$PSL(2,\\mathbb C)$）。</li>
<li><b>分解</b>：平移 $z+b$、旋转伸缩 $az$、反演 $1/z$ 的复合（见“分解与动画”）。</li>
</ul>` },
      { title: '保圆性与保对称性', tag: '定理', html: `
<div class="thm" data-t="保圆性">分式线性变换把扩充平面上的<b>广义圆</b>（圆或直线）映为广义圆。若圆周上有点映到 $\\infty$（即 $-d/c$ 在圆周上），像为直线；否则为圆。</div>
<div class="defn" data-t="对称点">$z_1,z_2$ 关于圆 $|z-z_0|=R$ 对称，指它们在从 $z_0$ 出发的同一射线上且 $|z_1-z_0|\\,|z_2-z_0|=R^2$，即 $z_2=z_0+\\dfrac{R^2}{\\overline{z_1-z_0}}$；规定 $z_0$ 与 $\\infty$ 对称。<br><b>等价刻画</b>：$z_1,z_2$ 对称 $\\iff$ 过 $z_1,z_2$ 的每个圆都与该圆正交。</div>
<div class="thm" data-t="保对称性">若 $z_1,z_2$ 关于广义圆 $C$ 对称，则 $w(z_1),w(z_2)$ 关于像 $\\Gamma=w(C)$ 对称。</div>
<div class="tip" data-t="典型用法">求把上半平面映为单位圆盘、且 $z_0\\mapsto0$ 的变换：$z_0$ 与 $\\bar z_0$ 关于实轴对称，故像 $0$ 与 $\\infty$ 关于单位圆对称，所以 $\\bar z_0\\mapsto\\infty$，得 $w=e^{i\\theta}\\dfrac{z-z_0}{z-\\bar z_0}$。</div>` },
      { title: '交比与三点确定', tag: '交比', html: `
<p>四点的交比 $(z,z_1,z_2,z_3)=\\dfrac{z-z_1}{z-z_3}:\\dfrac{z_2-z_1}{z_2-z_3}$（含 $\\infty$ 时约去对应因子）。它是唯一一个把 $z_1,z_2,z_3$ 送到 $0,1,\\infty$ 的分式线性变换在 $z$ 处的值。</p>
<div class="thm" data-t="定理">分式线性变换保持交比不变；给定两组各不相同的三点 $z_k\\mapsto w_k\\ (k=1,2,3)$，存在唯一的分式线性变换，由下式确定：
$$\\frac{w-w_1}{w-w_3}:\\frac{w_2-w_1}{w_2-w_3}=\\frac{z-z_1}{z-z_3}:\\frac{z_2-z_1}{z_2-z_3}$$</div>
<ul><li>四点共圆 $\\iff$ 交比为实数。</li>
<li><b>区域对应</b>：沿 $z_1\\to z_2\\to z_3$ 绕行时位于左侧的区域，映为沿 $w_1\\to w_2\\to w_3$ 绕行时位于左侧的区域。也可以取一个内点检验它的像落在哪一侧。</li></ul>` },
      { title: '不动点与分类', tag: '动力学', html: `
<p>不动点满足 $cz^2+(d-a)z-b=0$。非恒等变换有一个或两个不动点（在 $\\overline{\\mathbb C}$ 中计重数恰好两个）。</p>
<ul>
<li><b>两个不动点 $p,q$</b>：$\\dfrac{w-p}{w-q}=k\\,\\dfrac{z-p}{z-q}$，$k$ 为乘子。$|k|=1$ 椭圆型；$k>0$ 双曲型；其余斜驶型。</li>
<li><b>一个不动点 $p$</b>：$\\dfrac{1}{w-p}=\\dfrac{1}{z-p}+\\beta$，抛物型。</li>
<li>用迹分类（$ad-bc=1$ 归一化）：$\\operatorname{tr}^2=(a+d)^2$。$\\operatorname{tr}^2\\in[0,4)$ 椭圆，$=4$ 抛物，$>4$ 双曲，其余（非实数或负数）斜驶。$k+\\frac1k+2=\\operatorname{tr}^2$。</li>
</ul>
<p class="small muted">在“不动点与分类”中，背景棋盘格的格线就是两族不变圆（阿波罗尼斯圆与施泰纳圆），播放动画可以看到格子沿着它们滑动。</p>` },
      { title: '常用的分式线性变换', tag: '速查', wide: true, html: `
<table>
<tr><th>映射</th><th>公式</th><th>说明</th></tr>
<tr><td>上半平面 → 单位圆盘</td><td>$w=e^{i\\theta}\\dfrac{z-z_0}{z-\\bar z_0},\\ \\operatorname{Im}z_0>0$</td><td>$z_0\\mapsto0$；$\\theta=-\\frac\\pi2$, $z_0=i$ 时为 $-i\\frac{z-i}{z+i}$</td></tr>
<tr><td>单位圆盘 → 单位圆盘</td><td>$w=e^{i\\theta}\\dfrac{z-z_0}{1-\\bar z_0z},\\ |z_0|<1$</td><td>$z_0\\mapsto0$，$\\theta=\\arg w'(z_0)$</td></tr>
<tr><td>上半平面 → 上半平面</td><td>$w=\\dfrac{az+b}{cz+d},\\ a,b,c,d\\in\\mathbb R,\\ ad-bc>0$</td><td>实系数且行列式为正</td></tr>
<tr><td>单位圆盘 → 上半平面</td><td>$w=i\\dfrac{1+z}{1-z}$</td><td>$1\\mapsto\\infty,\\ -1\\mapsto0,\\ 0\\mapsto i$</td></tr>
<tr><td>单位圆盘 → 右半平面</td><td>$w=\\dfrac{1+z}{1-z}$</td><td>$0\\mapsto1$</td></tr>
<tr><td>$|z|<R\\to|w|<1$, $z_0\\mapsto0$</td><td>$w=e^{i\\theta}\\dfrac{R(z-z_0)}{R^2-\\bar z_0z}$</td><td>先 $z/R$ 再用圆盘自同构</td></tr>
<tr><td>两圆所围区域 → 带形/角形</td><td>$w=\\dfrac{z-z_1}{z-z_2}$</td><td>$z_1,z_2$ 为两圆交点（相切时 $w=\\frac{1}{z-z_1}$ 得带形）</td></tr>
</table>` },
    ]);
  },
  show(arg) { if (page && arg && TABS.some((t) => t.id === arg)) page.select(arg); },
};
