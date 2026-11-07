// 第 6 章 映射实验室：全部预设 + 自定义表达式
import { shell, theory } from './common.js';
import { Mapper } from '../components/mapper/index.js';
import { PRESETS_A } from '../components/mapper/presets-a.js';
import { PRESETS_B } from '../components/mapper/presets-b.js';

let M = null;
export default {
  mount(root, app, arg) {
    const { stage, panel, theory: th } = shell(root, {
      num: '06', title: '映射实验室',
      lead: '输入任意 $f(z)$ 或选择预设。左图是 $z$ 平面的坐标网格与格子，右图是它们在 $f$ 下的像，同色同形的格子互相对应；拖动画布平移、滚轮缩放。',
    });
    M = new Mapper(stage, panel, { presets: [...PRESETS_A, ...PRESETS_B], custom: true, initial: arg || 'sq' });
    theory(th, '怎样读图', [
      { title: '怎样对照左右两图', tag: '读图', html: `
<ul>
<li><b>源网格与格子</b>：左图在 $z$ 平面中画出固定间距的坐标网（直角网格，或对数极坐标网：$\\ln|z|$ 与 $\\arg z$ 等间距，格子是“共形正方形”）。右图在每个像素 $w$ 处求出它的原像 $z$，再画出 $z$ 所在的格子与线，所以<b>右图就是左图整张图案经过 $f$ 的像</b>，两图中同色、同形的格子一一对应。</li>
<li><b>源区域</b>：默认把整个平面（$e^{-8}<|z|<e^{8}$，也就包括了 $0$ 与 $\\infty$ 附近）映过去，与左图的显示范围无关。例如 $1/z$ 下，左图远处的格子出现在右图原点附近。周期函数（$e^z$、$\\sin z$ 等）默认只取一个周期带，避免多个周期的像互相覆盖；也可以改成“整个平面”“当前 z 视图范围”或某个常用区域。源区域以外在左图中压暗，像以外在右图中压暗。</li>
<li><b>线的颜色</b>：蓝线是 $x=$ 常数（或射线），橙线是 $y=$ 常数（或圆），白线是坐标轴与单位圆。共形映射下蓝、橙两族线的像在 $f'\\ne0$ 处保持正交，小格子保持近似正方形。</li>
<li><b>背景颜色（域着色）</b>：关闭“格子填充”后可见。右图按 $w$ 的值着色（色相 $=\\arg w$，明暗环为 $\\log_2|w|$ 的等值线）；左图在 $z$ 处涂上 $f(z)$ 在右图中的颜色，即 $f$ 的<b>相位图</b>：绕零点一圈颜色转 $n$ 圈即 $n$ 阶零点，极点处颜色反向汇聚。“背景线”选“直角”时，左图白线是 $\\operatorname{Re}f$、$\\operatorname{Im}f$ 的等值线。</li>
</ul>` },
      { title: '实验建议', tag: '练习', html: `
<ol>
<li>选 $z^2$，打开“局部探针”，把鼠标移到 $z=0$ 附近：红、蓝两条切向量的夹角在像中被放大成 $180^\\circ$。</li>
<li>选 $1/z$，用“圆”工具画一个经过原点的圆，看它的像为什么是直线。</li>
<li>选 $e^z$，打开右侧“悬停 w 显示全部原像”，在右图移动鼠标：原像沿竖直方向以 $2\\pi$ 为间隔排列（周期性）。</li>
<li>选“非共形对比”中的 $x+2iy$，打开探针：小圆的像是椭圆。</li>
<li>自己输入 <code>(z-a)/(1-conj(a)z)</code>，拖动 $a$，把它切换到 w 的“黎曼球面”视图。</li>
</ol>` },
    ]);
  },
  show(arg) { if (M && arg) M.loadPreset(arg); },
};
