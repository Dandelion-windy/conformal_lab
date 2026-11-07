// 第 1 章 黎曼球面与扩充复平面
import { tabbedShell, theory } from '../common.js';
import { mountProjection } from './projection.js';
import { mountCircles } from './circles.js';
import { mountMotion } from './motion.js';
import { mountFunctions } from './functions.js';
import { Mapper } from '../../components/mapper/index.js';
import { PRESETS_SPHERE } from '../../components/mapper/presets-sphere.js';

function mountMaps(stage, panel) {
  new Mapper(stage, panel, { presets: PRESETS_SPHERE, custom: true, initial: 'rot180', sphere: true });
  return {};
}

let page = null;
const TABS = [
  { id: 'proj', label: '球极投影', stageClass: 'one', mount: mountProjection },
  { id: 'circle', label: '保圆 · 保角', stageClass: 'one', mount: mountCircles },
  { id: 'motion', label: '球面运动 = 分式线性变换', stageClass: 'split-wide', mount: mountMotion },
  { id: 'maps', label: '共形映射在球面上', stageClass: 'two', mount: mountMaps },
  { id: 'func', label: '函数在 ∞ 处', stageClass: 'two', mount: mountFunctions },
];

export default {
  mount(root, app, arg) {
    page = tabbedShell(root, {
      num: '01', title: '黎曼球面与扩充复平面',
      lead: '在复平面上添加一个“无穷远点” $\\infty$，得到扩充复平面 $\\overline{\\mathbb C}=\\mathbb C\\cup\\{\\infty\\}$。球极投影把它与球面一一对应，$\\infty$ 对应北极 N。从球面上看，$\\infty$ 与其他点没有区别。',
      tabs: TABS,
    });
    page.select(TABS.some((t) => t.id === arg) ? arg : 'proj');
    theory(page.theory, '原理与要点', [
      { title: '球极投影', tag: '定义', html: `
<p>取球面与复平面，从北极 $N$ 向平面上的点 $z$ 作直线，与球面交于另一点 $P$，规定 $z\\leftrightarrow P$，并令 $\\infty\\leftrightarrow N$。这样得到 $\\overline{\\mathbb C}$ 与球面之间的<b>一一对应</b>，这个球面叫做<b>复球面（黎曼球面）</b>。</p>
<h4>（A）单位球 $\\xi^2+\\eta^2+\\zeta^2=1$，平面为赤道面（Ahlfors 等）</h4>
$$\\xi=\\frac{2x}{1+|z|^2},\\quad \\eta=\\frac{2y}{1+|z|^2},\\quad \\zeta=\\frac{|z|^2-1}{|z|^2+1};\\qquad z=\\frac{\\xi+i\\eta}{1-\\zeta}$$
<h4>（B）与平面切于原点、直径为 1 的球（国内多数教材）</h4>
$$\\xi=\\frac{x}{1+|z|^2},\\quad \\eta=\\frac{y}{1+|z|^2},\\quad \\zeta=\\frac{|z|^2}{1+|z|^2};\\qquad z=\\frac{\\xi+i\\eta}{1-\\zeta}$$
<p class="small muted">两种取法几何上完全一样（相差一个相似变换），反变换公式甚至相同。界面中可以切换。</p>` },
      { title: '几何性质', tag: '性质', html: `
<ul>
<li><b>单位圆周 $|z|=1$</b> ↔ 赤道（A）；<b>原点</b> ↔ 南极 $S$；<b>上/下半平面</b> ↔ 东/西半球（以经过实轴的大圆为界）。</li>
<li><b>平面上的圆 ↔ 球面上不过 $N$ 的圆；平面上的直线 ↔ 球面上过 $N$ 的圆</b>。所以在 $\\overline{\\mathbb C}$ 中把直线看作“过 $\\infty$ 的圆”，统称<b>广义圆</b>。</li>
<li>球极投影是<b>共形</b>的（保持曲线间夹角）。两条直线在 $z_0$ 与 $\\infty$ 处的夹角相等。</li>
<li>$z\\mapsto 1/z$ 对应球面<b>绕实轴旋转 $180^\\circ$</b>；$z\\mapsto\\bar z$ 对应关于 $\\xi O\\zeta$ 平面的反射；$z\\mapsto 1/\\bar z$ 对应关于赤道面的反射（A）。</li>
</ul>` },
      { title: '球面距离（弦距离）与 ∞ 的邻域', tag: '度量', html: `
<p>两点在球面上的像之间的弦长定义了 $\\overline{\\mathbb C}$ 上的距离（取法 A；取法 B 时去掉系数 2）：</p>
$$d(z_1,z_2)=\\frac{2|z_1-z_2|}{\\sqrt{(1+|z_1|^2)(1+|z_2|^2)}},\\qquad d(z,\\infty)=\\frac{2}{\\sqrt{1+|z|^2}}$$
<ul>
<li>$d\\le 2$，$\\overline{\\mathbb C}$ 在这个距离下是<b>紧</b>的（它就是一个球面）。</li>
<li>$\\infty$ 的邻域：$\\{|z|>R\\}\\cup\\{\\infty\\}$ ↔ 以 $N$ 为中心的<b>球冠</b>。$R$ 越大，球冠越小。</li>
<li>“$z_n\\to\\infty$”就是球面上的像点趋于 $N$；在平面距离下无界的序列，在球面距离下可以收敛。</li>
</ul>` },
      { title: '∞ 的运算约定与函数在 ∞ 处的性态', tag: '约定', html: `
<ul>
<li>$a\\pm\\infty=\\infty\\ (a\\ne\\infty)$，$a\\cdot\\infty=\\infty\\ (a\\ne0)$，$\\dfrac{a}{0}=\\infty\\ (a\\ne0)$，$\\dfrac{a}{\\infty}=0\\ (a\\ne\\infty)$；<br>$\\infty\\pm\\infty$、$0\\cdot\\infty$、$\\dfrac{0}{0}$、$\\dfrac\\infty\\infty$ 无意义。$\\infty$ 的实部、虚部、辐角都无意义，$|\\infty|=+\\infty$。</li>
<li>研究 $f$ 在 $\\infty$ 附近的性质，就令 $z=1/\\zeta$，研究 $g(\\zeta)=f(1/\\zeta)$ 在 $\\zeta=0$ 附近的性质：可去奇点、$m$ 阶极点、本性奇点、$m$ 阶零点的定义均如此转移。</li>
<li>例：$f(z)=\\dfrac{az+b}{cz+d}$ 在 $\\overline{\\mathbb C}$ 上处处有定义：$f(-d/c)=\\infty$，$f(\\infty)=a/c$。这就是第 04 章研究分式线性变换时必须使用扩充平面的原因。</li>
<li>“$f$ 在 $\\infty$ 处共形”的定义：$g(\\zeta)=f(1/\\zeta)$ 在 $\\zeta=0$ 处共形。若 $f(\\infty)=\\infty$，则看 $1/f(1/\\zeta)$。</li>
</ul>` },
      { title: '在球面上看映射：读图要点', tag: '读图', wide: true, html: `
<ul>
<li><b>经纬网 = 对数极坐标网</b>：射线 $\arg z=$ 常数是经线，圆 $|z|=$ 常数是纬线圈；$\ln|z|$ 与 $\arg z$ 等间距时，球面上的格子都是小正方形（球极投影共形）。直角网格的直线在球面上是<b>过 $N$ 的圆</b>。</li>
<li><b>分式线性变换是球面到自身的一一共形映射</b>，分四类：椭圆型（与刚体旋转共轭；$1/z$、Cayley 变换本身就是旋转）、双曲型（从一个不动点流向另一个）、斜驶型（螺旋流动）、抛物型（只有一个不动点）。“共形映射在球面上”标签页的动画沿单参数子群 $T_t$ 播放，每一帧都是共形的。</li>
<li><b>$d$ 次有理函数是球面的 $d$ 层覆盖</b>：每个 $w$（包括 $\infty$）恰有 $d$ 个原像（计重数）；零点、极点在球面上没有区别，只是分别映到 $S$、$N$。临界点（$f'=0$，或高阶极点）共有 $2d-2$ 个（Riemann–Hurwitz），只有在这些点处共形性失效。</li>
<li><b>超越整函数（$e^z$、$\sin z$）在 $N$ 处是本性奇点</b>，不能看成球面到球面的映射；这时把源区域限制在一个单叶区域（周期带）里观察。</li>
</ul>` },
      { title: '为什么要用黎曼球面看共形映射？', tag: '直观', wide: true, html: `
<p>共形映射理论中大量结论在 $\\overline{\\mathbb C}$ 上才完整：分式线性变换是 $\\overline{\\mathbb C}$ 到自身的双射；“圆 → 圆”在把直线看作过 $\\infty$ 的圆后才没有例外；区域 $|z|>1$ 是 $\\infty$ 的邻域，它与单位圆盘通过 $1/z$ 共形等价。第三个标签页演示了 <b>“Möbius Transformations Revealed”</b> 的思想：<b>平面的平移、伸缩、旋转、反演都是球面的刚体运动</b>。例如 $1/z$ 在平面上看起来很复杂（把圆盘内外翻转），在球面上只是绕实轴转半圈。</p>` },
    ]);
  },
  show(arg) { if (page && arg && TABS.some((t) => t.id === arg)) page.select(arg); },
};
