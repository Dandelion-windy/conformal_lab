// 第 5 章 初等函数的映射：幂、根式、指数、对数、三角、茹科夫斯基
import { shell, theory } from './common.js';
import { Mapper } from '../components/mapper/index.js';
import { PRESETS_A } from '../components/mapper/presets-a.js';
import { PRESETS_B } from '../components/mapper/presets-b.js';

let M = null;
export default {
  mount(root, app, arg) {
    const { stage, panel, theory: th } = shell(root, {
      num: '05', title: '初等函数的映射',
      lead: '每个预设下方的“示例区域”按钮给出教材中的典型区域。注意观察：哪些曲线族被映成了哪些曲线族，区域的哪条边界去了哪里，以及 $f\'(z)=0$ 的点处发生了什么。',
    });
    M = new Mapper(stage, panel, { presets: [...PRESETS_A, ...PRESETS_B].filter((p) => p.elem), custom: false, initial: arg || 'sq' });
    theory(th, '初等函数映射要点', [
      { title: '幂函数 $w=z^n$ 与根式', tag: '幂', html: `
<p>写成极坐标 $z=re^{i\\theta}$，则 $w=r^ne^{in\\theta}$：模取 $n$ 次方，<b>辐角乘 $n$</b>。</p>
<ul>
<li>射线 $\\arg z=\\theta_0$ → 射线 $\\arg w=n\\theta_0$；圆周 $|z|=r$ → 圆周 $|w|=r^n$（绕 $n$ 圈）。</li>
<li>角形域 $0<\\arg z<\\alpha$（$\\alpha\\le \\frac{2\\pi}{n}$）→ 角形域 $0<\\arg w<n\\alpha$。</li>
<li>$z=0$ 处 $w'=nz^{n-1}=0$，此处<b>不共形</b>：过原点的两条曲线夹角被放大 $n$ 倍。</li>
<li>反函数 $\\sqrt[n]{z}$ 是多值的，取定一支需要<b>割线</b>；每一支把 $\\mathbb C\\setminus(-\\infty,0]$ 映为一个张角 $\\frac{2\\pi}{n}$ 的角形域。</li>
</ul>
<div class="tip" data-t="解题口诀">“角形域 → 上半平面”用 $w=z^{\\pi/\\alpha}$；若顶点不在原点，先平移/旋转。</div>` },
      { title: '指数函数 $w=e^z$ 与对数', tag: '指数', html: `
<p>$e^{x+iy}=e^x\\cdot e^{iy}$：实部控制模，虚部控制辐角。</p>
<ul>
<li>水平直线 $y=c$ → 射线 $\\arg w=c$；竖直直线 $x=c$ → 圆周 $|w|=e^c$。</li>
<li>水平带形 $0<\\operatorname{Im} z<h$（$0<h\\le2\\pi$）→ 角形域 $0<\\arg w<h$。</li>
<li>半带形 $\\operatorname{Re}z<0,\\ 0<\\operatorname{Im}z<\\pi$ → 上半单位圆盘。</li>
<li>$(e^z)'=e^z\\ne0$，所以 $e^z$ 处处共形，但它<b>不是单射</b>（周期 $2\\pi i$），单叶区域是宽度 $\\le 2\\pi$ 的水平带形。</li>
</ul>
<p>对数 $\\operatorname{Log}z=\\ln|z|+i\\arg z$ 把这些对应关系反过来：<b>极坐标网格 → 直角网格</b>。</p>
<div class="tip" data-t="解题口诀">“带形 → 上半平面”用 $e^{\\pi z/h}$；“两圆相切所围的月牙形”先用分式线性变换把切点送到 ∞，变成带形。</div>` },
      { title: '三角函数 $w=\\sin z$', tag: '三角', html: `
$$\\sin(x+iy)=\\sin x\\cosh y+i\\cos x\\sinh y$$
<ul>
<li>$y=c\\,(\\ne0)$ → 椭圆 $\\dfrac{u^2}{\\cosh^2 c}+\\dfrac{v^2}{\\sinh^2 c}=1$；</li>
<li>$x=c$ → 双曲线 $\\dfrac{u^2}{\\sin^2 c}-\\dfrac{v^2}{\\cos^2 c}=1$；焦点都在 $\\pm1$。</li>
<li>半带形 $-\\frac\\pi2<\\operatorname{Re}z<\\frac\\pi2,\\ \\operatorname{Im}z>0$ → 上半平面。</li>
</ul>
<p>由于 $\\sin z=\\dfrac{e^{iz}-e^{-iz}}{2i}$，它是“$\\zeta=e^{iz}$ + 茹科夫斯基函数”的复合：$\\sin z=\\dfrac{1}{2i}\\left(\\zeta-\\dfrac1\\zeta\\right)$。</p>` },
      { title: '茹科夫斯基函数 $w=\\frac12\\left(z+\\frac1z\\right)$', tag: '茹科夫斯基', html: `
<ul>
<li>$|z|=r$ → 椭圆，半轴 $\\frac12(r+\\frac1r)$、$\\frac12|r-\\frac1r|$；$|z|=1$ → 线段 $[-1,1]$。</li>
<li>$\\arg z=\\theta$ → 双曲线 $\\dfrac{u^2}{\\cos^2\\theta}-\\dfrac{v^2}{\\sin^2\\theta}=1$ 的一支。</li>
<li>$|z|>1$ 与 $|z|<1$ 都被<b>单叶</b>地映为 $\\mathbb C\\setminus[-1,1]$；上半单位圆盘 → 下半平面。</li>
<li>$w'=\\frac12(1-z^{-2})$ 在 $z=\\pm1$ 为零：这里的直角（圆周与实轴的交角）被拉成平角。</li>
</ul>
<p>在 <a href="#flow">物理应用</a> 一章中，它把绕圆柱的流动变为绕平板/翼型的流动。</p>` },
    ]);
  },
  show(arg) { if (M && arg) M.loadPreset(arg); },
};
