// 第 4 章 分式线性变换
import { tabbedShell, theory } from '../common.js';
import { mountThreePoint } from './threepoint.js';
import { mountBipolar } from './bipolar.js';
import { mountDynamics } from './dynamics.js';

let page = null;
const TABS = [
  { id: 'three', label: '三点确定 · 交比', mount: mountThreePoint },
  { id: 'bipolar', label: '双极坐标网格', mount: mountBipolar },
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
<li><b>生成元</b>：平移 $z+b$、旋转伸缩 $az$、倒数 $\\frac1z$。一个性质对这三种成立，就对所有分式线性变换成立。</li>
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
<h4>双极坐标的特殊值与退化</h4>
<p>记 $S_{p,q}(z)$ 为把 $p,q$ 送到 $0,\\infty$ 的坐标。扩充复平面只有一个无穷远点；沿正实轴趋于 $+\\infty$ 也到达这个点。无穷远点的因子应先约去，不能把 $\\infty$ 当普通数代入。</p>
<table>
<tr><th>两极</th><th>可用坐标 $S_{p,q}(z)$</th><th>网格几何</th></tr>
<tr><td>$p,q$ 有限且不同</td><td>$\\dfrac{z-p}{z-q}$</td><td>等模线为阿波罗尼斯圆，等辐角线为过两极的圆弧；$\\rho=1$ 是两极的垂直平分线。</td></tr>
<tr><td>$p=0$，$q$ 有限非零</td><td>$\\dfrac{z}{z-q}$</td><td>仍是普通双极网格，原点只是一极。</td></tr>
<tr><td>$q=0$，$p$ 有限非零</td><td>$\\dfrac{z-p}{z}$</td><td>仍是普通双极网格；交换两极将坐标取倒数。</td></tr>
<tr><td>$q=\\infty$，$p$ 有限</td><td>$z-p$</td><td>以 $p$ 为心的同心圆与射线；特别地 $p=0$ 时是标准极坐标。</td></tr>
<tr><td>$p=\\infty$，$q$ 有限</td><td>$\\dfrac1{z-q}$</td><td>以 $q$ 为心的同心圆与射线，模的大小次序与辐角方向反转；$q=0$ 时为 $1/z$。</td></tr>
</table>
<p>目标点 $p',q'$ 完全同理。在 $S_{p',q'}(w)=kS_{p,q}(z)$ 中，两边各按表格独立化简。例如 $p'=0,q'=\\infty$ 得 $w=kS_{p,q}(z)$；$p'=\\infty,q'=0$ 得 $1/w=kS_{p,q}(z)$。源点与目标点可以相等：$p=p',q=q'$ 表示两极是不动点；$p=q',q=p'$ 表示交换两极。只有同一侧两极重合才使双极坐标失效。</p>
<p><b>$p=q=a$（包括 $a=0$）</b>：直接代入得到常数 $1$（$a$ 处为 $0/0$），不再是可逆坐标；不能再用上面的双极公式求变换。若想观察两极合并的几何，必须同时放大坐标：$$\\frac{S_{p,q}(z)-1}{q-p}=\\frac1{z-q}\\ \\longrightarrow\\ \\frac1{z-a}.$$ 在这个极限坐标上使用直角网格，其逆像是两族在 $a$ 相切的圆，穿过原点的直线还原为过 $a$ 的直线。相切边界因此可用 $u=1/(z-a)$ 化成平行直线；$p=q=\\infty$ 时切点已经在无穷远，可直接使用平面直角坐标。</p>
<p><b>$p'=q'$ 同样使目标双极坐标失效。</b>一一的莫比乌斯变换不可能把两个不同源点送到同一个目标点，也不能把一个源点送到两个不同目标点。若两侧都合并到 $a,a'$，应另用极限坐标确定变换，例如 $$\\frac1{w-a'}=A\\frac1{z-a}+B,\\qquad A\\ne0.$$ 此式包含平移项 $B$，不能把两边的重合点直接塞回双极公式。</p>
<p>还要区分“点取零”与“系数取零”：$k$ 必须有限且非零，$k=0$ 或 $k=\\infty$ 会使变换退化为常值。等模线的 $\\rho=0,\\infty$ 分别缩成两极；极点处的辐角没有定义。</p>
<div class="ex" data-t="例：单位圆盘 → 单位圆盘，指定非零点 a ↦ b">
<p><b>题目：</b>已知 $0<|a|<1$、$0<|b|<1$，求一个莫比乌斯变换，把 $|z|<1$ 一一映为 $|w|<1$，并使 $w(a)=b$。</p>
<p><b>① 用保对称性确定两对点。</b>关于单位圆的对称点分别为 $a^*=1/\\bar a$、$b^*=1/\\bar b$。既然 $a\\mapsto b$，就有 $a^*\\mapsto b^*$。取 $p=a,q=a^*,p'=b,q'=b^*$，得到双极坐标关系 $$\\frac{w-b}{w-1/\\bar b}=k\\,\\frac{z-a}{z-1/\\bar a}.$$</p>
<p><b>② 用边界确定系数的模。</b>在 $|z|=1$ 上，右侧分式的模为 $|a|$；在 $|w|=1$ 上，左侧分式的模为 $|b|$，所以 $$|k|=\\frac{|b|}{|a|},\\qquad k=e^{i\\theta}\\frac{\\bar b}{\\bar a},\\quad\\theta\\in\\mathbb R.$$ 这就把单位圆周对应到了单位圆周；又因内部点 $a$ 的像 $b$ 在圆内，圆盘内部也对应到内部。</p>
<p><b>③ 化成便于使用的形式。</b>令 $\\phi_a(z)=\\dfrac{z-a}{1-\\bar az}$、$\\phi_b(w)=\\dfrac{w-b}{1-\\bar bw}$，把两个指定点分别移到原点。上式等价于 $$\\phi_b(w)=e^{i\\theta}\\phi_a(z),$$ 即先把 $a$ 移到 $0$，再旋转，最后把 $0$ 移到 $b$。因此全部解为 $$w=\\frac{b+e^{i\\theta}\\dfrac{z-a}{1-\\bar az}}{1+\\bar b\\,e^{i\\theta}\\dfrac{z-a}{1-\\bar az}}.$$</p>
<p><b>取 $\\theta=0$ 就得到一个所求变换：</b>$$\\boxed{\\displaystyle w=\\frac{(1-b\\bar a)z+b-a}{(\\bar b-\\bar a)z+1-\\bar ba}}.$$ 代入 $z=a$ 得 $w=b$；它是两个圆盘自同构的复合，故把整个单位圆盘一一映为自身。只给定 $a\\mapsto b$ 还留有一个旋转参数，所以解不唯一。</p>
<p><a href="#mobius/bipolar">打开双极坐标网格</a>，选择“单位圆盘 → 单位圆盘（非零点 a ↦ b）”可观察这两对对称点及对应网格。</p>
</div>` },
    ]);
  },
  show(arg) { if (page && arg && TABS.some((t) => t.id === arg)) page.select(arg); },
};
