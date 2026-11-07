// 第 2 章 共形性的几何意义
import { shell, theory } from '../common.js';
import { mountLocal } from './local.js';

export default {
  mount(root) {
    const { stage, panel, theory: th } = shell(root, {
      num: '02', title: '导数的几何意义与共形映射',
      lead: '解析函数在 $f\'(z_0)\\ne0$ 的点附近近似于 $w-w_0\\approx f\'(z_0)(z-z_0)$：一个<b>旋转</b> $\\arg f\'(z_0)$ 加一个<b>伸缩</b> $|f\'(z_0)|$。这就是“共形”（保角）的全部含义。',
    });
    mountLocal(stage, panel);
    theory(th, '原理与要点', [
      { title: '导数的辐角与模', tag: '几何意义', html: `
<p>设曲线 $C: z=z(t)$ 过 $z_0=z(t_0)$，$z'(t_0)\\ne0$。像曲线 $\\Gamma: w=f(z(t))$ 在 $w_0$ 处的切向量为</p>
$$w'(t_0)=f'(z_0)\\,z'(t_0)\\ \\Longrightarrow\\ \\arg w'(t_0)=\\arg f'(z_0)+\\arg z'(t_0)$$
<ul>
<li><b>旋转角</b> $\\arg f'(z_0)$：像曲线的切线方向 = 原曲线切线方向转过 $\\arg f'(z_0)$，<b>与曲线的选取无关</b>。</li>
<li>所以过 $z_0$ 的两条曲线的夹角（大小和方向）保持不变——<b>保角性</b>。</li>
<li><b>伸缩率</b> $|f'(z_0)|=\\lim\\limits_{z\\to z_0}\\dfrac{|w-w_0|}{|z-z_0|}$，<b>与方向无关</b>——<b>伸缩率不变性</b>。</li>
</ul>` },
      { title: '共形映射的定义', tag: '定义', html: `
<div class="defn" data-t="定义">若 $w=f(z)$ 在 $z_0$ 的邻域内是一一的，在 $z_0$ 处具有保角性与伸缩率不变性，则称 $f$ 在 $z_0$ 处是<b>共形的（第一类保角的）</b>；若在区域 $D$ 内每一点都共形，且在 $D$ 内<b>单叶</b>（一一），则称 $f$ 是 $D$ 上的<b>共形映射</b>。</div>
<div class="thm" data-t="定理">若 $f$ 在 $z_0$ 解析且 $f'(z_0)\\ne0$，则 $f$ 在 $z_0$ 处共形。若 $f$ 在区域 $D$ 内单叶解析，则 $f'(z)\\ne0$ 处处成立，从而 $f$ 是 $D$ 上的共形映射。</div>
<ul>
<li>若只保持夹角大小而<b>方向相反</b>（如 $w=\\bar z$），称为<b>第二类保角映射</b>。</li>
<li>局部共形 ≠ 整体共形：$e^z$ 处处 $f'\\ne0$，但在整个平面上不单叶。</li>
</ul>` },
      { title: '临界点：$f\'(z_0)=0$', tag: '共形失效', html: `
<p>若 $f'(z_0)=\\cdots=f^{(m-1)}(z_0)=0,\\ f^{(m)}(z_0)\\ne0$，则</p>
$$f(z)-f(z_0)=\\frac{f^{(m)}(z_0)}{m!}(z-z_0)^m\\,[1+o(1)]$$
<p>局部地看像 $w=z^m$：<b>夹角放大 $m$ 倍</b>，邻域被 $m$ 重覆盖，所以不共形。在左侧选 $z^2$、$z^3$ 或 $\\sin z$，点击“移到临界点”观察。</p>
<div class="tip" data-t="应用">区域边界上的角点常放在临界点处“拉直”：$z^2$ 把第一象限的直角撑成平角；$\\sin z$ 在 $\\pm\\frac{\\pi}{2}$ 处把半带形的直角拉直。</div>` },
      { title: '与 C-R 方程、Jacobi 行列式的关系', tag: '实分析视角', html: `
<p>把 $f=u+iv$ 看作 $\\mathbb R^2\\to\\mathbb R^2$ 的映射，其 Jacobi 矩阵在 C-R 方程 $u_x=v_y,\\ u_y=-v_x$ 下为</p>
$$J=\\begin{pmatrix}u_x&-v_x\\\\v_x&u_x\\end{pmatrix}=|f'|\\begin{pmatrix}\\cos\\theta&-\\sin\\theta\\\\\\sin\\theta&\\cos\\theta\\end{pmatrix},\\qquad \\det J=|f'(z)|^2$$
<p>即“旋转 × 数乘”，这是保角线性映射的唯一形式（保持定向时）。一般情形用 Wirtinger 导数 $f_z=\\frac12(f_x-if_y)$、$f_{\\bar z}=\\frac12(f_x+if_y)$：$df=f_z\\,dz+f_{\\bar z}\\,d\\bar z$。$f_{\\bar z}=0$ 就是 C-R 方程；$f_{\\bar z}\\ne0$ 时小圆变成椭圆。</p>
<ul><li><b>面积放大率</b>为 $|f'(z)|^2$，所以像区域的面积 $=\\iint_D|f'(z)|^2\\,dx\\,dy$；<b>曲线长度</b> $=\\int_C|f'(z)|\\,|dz|$。</li>
<li>$u=\\text{常数}$ 与 $v=\\text{常数}$ 两族等值线在 $f'\\ne0$ 处<b>正交</b>（在 <a href="#lab">映射实验室</a> 中把“背景线”设为“直角”观察）。</li></ul>` },
      { title: '单叶解析函数的性质', tag: '性质', html: `
<ul>
<li><b>保域定理</b>（开映射定理）：区域 $D$ 内不恒为常数的解析函数把 $D$ 映为区域（连通开集）。因此“区域的像”总是区域，只需确定它的边界。</li>
<li><b>局部单叶性</b>：$f'(z_0)\\ne0\\iff f$ 在 $z_0$ 的某个邻域内单叶；此时反函数 $z=f^{-1}(w)$ 在 $w_0$ 附近解析，且 $\\left(f^{-1}\\right)'(w_0)=\\dfrac{1}{f'(z_0)}$。</li>
<li>若 $z_0$ 是 $f(z)-f(z_0)$ 的 $m$ 阶零点，则 $f$ 在 $z_0$ 附近是 $m$ 对 1 的（每个靠近 $w_0$ 的值恰有 $m$ 个原像）。在 <a href="#lab/zn">映射实验室</a> 中悬停右图可看到所有原像。</li>
<li><b>单叶 $\\Rightarrow f'\\ne0$</b>，反之不成立（$e^z$）。单叶解析函数的反函数也单叶解析，所以“共形等价”是等价关系。</li>
</ul>` },
      { title: '共形映射的基本定理', tag: '理论框架', wide: true, html: `
<div class="thm" data-t="黎曼映射定理（Riemann Mapping Theorem）">设 $D\\subsetneq\\mathbb C$ 是单连通区域（其边界至少含两点），$z_0\\in D$，则存在<b>唯一</b>的单叶解析函数 $w=f(z)$ 把 $D$ 映为单位圆盘 $|w|<1$，且 $f(z_0)=0,\\ f'(z_0)>0$。</div>
<ul>
<li><b>唯一性</b>来自施瓦茨引理（见第 07 章）：单位圆盘的保持 0 的自同构只有旋转。</li>
<li><b>三个实参数的自由度</b>：映射可以由“一个内点及该点处导数的辐角”确定，也可以由“三个边界点的对应”确定（保持边界定向）。</li>
<li><b>边界对应原理</b>：若 $D,G$ 都由简单闭曲线围成，$f$ 在 $\\bar D$ 上连续、在 $D$ 内解析，且把 $\\partial D$ 一一地映为 $\\partial G$，并保持定向（沿 $\\partial D$ 正向绕行时 $D$ 在左侧，则像点沿 $\\partial G$ 绕行时 $G$ 也在左侧），则 $f$ 是 $D\\to G$ 的共形映射。这是求解“区域 → 区域”问题时最常用的判断方法。</li>
<li>$\\mathbb C$ 本身不能共形映为单位圆盘（刘维尔定理：有界整函数是常数）；多连通区域（如圆环 $r<|z|<1$）一般不能共形映成彼此（两个圆环共形等价当且仅当半径比相同）。</li>
</ul>` },
    ]);
  },
};
