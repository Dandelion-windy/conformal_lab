// 第 4 章 分式线性变换
import { tabbedShell, theory } from '../common.js';
import { mountThreePoint } from './threepoint.js';
import { mountBipolar } from './bipolar.js';
import { mountDecompose } from './decompose.js';
import { mountDynamics } from './dynamics.js';

let page = null;
const TABS = [
  { id: 'three', label: '三点确定 · 交比', mount: mountThreePoint },
  { id: 'bipolar', label: '双极坐标网格', mount: mountBipolar },
  { id: 'dec', label: '分解与动画', mount: mountDecompose },
  { id: 'dyn', label: '不动点与分类', stageClass: 'one', mount: mountDynamics },
];

export default {
  mount(root, app, arg) {
    page = tabbedShell(root, {
      num: '04', title: '分式线性变换（莫比乌斯变换）',
      lead: '$w=\\dfrac{az+b}{cz+d}\\ (ad-bc\\ne0)$ 是扩充复平面到自身的共形双射，全体构成一个群。保圆、保对称由反演直接得到（第 03 章）；本章看交比、双极坐标网格与不动点，以及怎样求出满足要求的变换。',
      tabs: TABS,
    });
    page.select(TABS.some((t) => t.id === arg) ? arg : 'three');
    theory(page.theory, '原理与要点', [
      { title: '定义与群结构', tag: '定义', html: `
<p>$w=\\dfrac{az+b}{cz+d}\\ \\longleftrightarrow\\ \\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$，$ad-bc\\ne0$，矩阵差一个非零倍数表示同一个变换。约定 $-\\frac dc\\mapsto\\infty$，$\\infty\\mapsto\\frac ac$。</p>
<ul>
<li><b>复合 = 矩阵乘法，逆变换 = 逆矩阵</b>，全体构成群（$PSL(2,\\mathbb C)$）。</li>
<li><b>生成元</b>：平移 $z+b$、旋转伸缩 $az$、倒数 $\\frac1z$（见“分解与动画”）。一个性质对这三种成立，就对所有分式线性变换成立。</li>
<li><b>换坐标</b>：用 $S(z)=\\frac{z-p}{z-q}$ 把 $p,q$ 送到 $0,\\infty$，与 $p,q$ 有关的问题就变成与 $0,\\infty$ 有关的问题。双极坐标网格、不动点分类都是这个思路。</li>
</ul>` },
      { title: '保圆与保对称', tag: '性质', html: `
<p>$\\frac1z$ 是关于单位圆的反演再关于实轴对称；平移、旋转伸缩也都是两次反演。反演保圆、保对称，所以：</p>
<div class="thm" data-t="定理">分式线性变换把广义圆变成广义圆，把关于 $C$ 对称的两点变成关于像 $w(C)$ 对称的两点。</div>` },
      { title: '交比', tag: '交比', html: `
<p>$(z,z_1,z_2,z_3)=\\dfrac{z-z_1}{z-z_3}:\\dfrac{z_2-z_1}{z_2-z_3}$ 就是把 $z_1,z_2,z_3$ 送到 $0,1,\\infty$ 的那个变换在 $z$ 处的值，所以在分式线性变换下不变（含 $\\infty$ 时约去对应因子）。</p>
<ul><li>四点共圆 $\\iff$ 交比为实数。</li>
<li>沿 $z_1\\to z_2\\to z_3$ 绕行时左侧的区域，映为沿 $w_1\\to w_2\\to w_3$ 绕行时左侧的区域。</li></ul>` },
      { title: '不动点与分类', tag: '动力学', html: `
<p>不动点满足 $cz^2+(d-a)z-b=0$。非恒等变换有一个或两个不动点（在 $\\overline{\\mathbb C}$ 中计重数恰好两个）。</p>
<ul>
<li><b>两个不动点 $p,q$</b>：$\\dfrac{w-p}{w-q}=k\\,\\dfrac{z-p}{z-q}$，$k$ 为乘子。$|k|=1$ 椭圆型；$k>0$ 双曲型；其余斜驶型。</li>
<li><b>一个不动点 $p$</b>：$\\dfrac{1}{w-p}=\\dfrac{1}{z-p}+\\beta$，抛物型。</li>
<li>用迹分类（$ad-bc=1$ 归一化）：$\\operatorname{tr}^2=(a+d)^2$。$\\operatorname{tr}^2\\in[0,4)$ 椭圆，$=4$ 抛物，$>4$ 双曲，其余（非实数或负数）斜驶。$k+\\frac1k+2=\\operatorname{tr}^2$。</li>
</ul>
<p class="small muted">在“不动点与分类”中，背景棋盘格的格线就是两族不变圆（阿波罗尼斯圆与施泰纳圆），播放动画可以看到格子沿着它们滑动。</p>` },
      { title: '怎样求分式线性变换', tag: '方法', wide: true, html: `
<h4>① 已知三对点 $z_k\\mapsto w_k$</h4>
<p>直接代入交比并化简：$$\\frac{w-w_1}{w-w_3}:\\frac{w_2-w_1}{w_2-w_3}=\\frac{z-z_1}{z-z_3}:\\frac{z_2-z_1}{z_2-z_3}$$</p>
<h4>② 只知道区域 → 区域：看双极坐标网格</h4>
<p>先看边界圆属于哪一族，找出对应的一对点 $p,q$ 和它们的像 $p',q'$（常取 $0,\\infty$），再另设一个系数 $k$：$$\\frac{w-p'}{w-q'}=k\\,\\frac{z-p}{z-q}$$</p>
<ul>
<li>边界圆<b>相交于两点</b>：取交点为 $p,q$。边界是施泰纳圆弧，变成射线，区域变成角形。</li>
<li>边界圆<b>不相交</b>，或要求某点 $z_0\\mapsto0$：取两圆的公共对称点（或 $z_0$ 与它关于边界的对称点）为 $p,q$。边界是阿波罗尼斯圆，变成同心圆，区域变成圆盘、圆环或圆外。</li>
<li>边界圆<b>相切</b>：$p=q$ 退化，把切点送到 $\\infty$，边界变成平行直线（带形）。</li>
<li>最后用一个条件定 $k$：边界上一点的像的模定 $|k|$，某点的像或导数的辐角定 $\\arg k$。</li>
</ul>
<div class="ex" data-t="例">上半平面 → 单位圆盘，$z_0\\mapsto0$：$\\bar z_0$ 与 $z_0$ 关于实轴对称，所以 $\\bar z_0\\mapsto\\infty$，$w=k\\dfrac{z-z_0}{z-\\bar z_0}$。实轴上 $|z-z_0|=|z-\\bar z_0|$，要 $|w|=1$ 就得 $|k|=1$：$w=e^{i\\theta}\\dfrac{z-z_0}{z-\\bar z_0}$。</div>` },
    ]);
  },
  show(arg) { if (page && arg && TABS.some((t) => t.id === arg)) page.select(arg); },
};
