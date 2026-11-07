// 第 8 章 单位圆盘：自同构、施瓦茨引理
import { tabbedShell, theory } from '../common.js';
import { mountAutomorphism } from './automorphism.js';
import { mountSchwarz } from './schwarz.js';

let page = null;
const TABS = [
  { id: 'aut', label: '圆盘的自同构', mount: mountAutomorphism },
  { id: 'schwarz', label: '施瓦茨引理', mount: mountSchwarz },
];

export default {
  mount(root, app, arg) {
    page = tabbedShell(root, {
      num: '08', title: '单位圆盘：自同构与施瓦茨引理',
      lead: '单位圆盘 $\\mathbb D=\\{|z|<1\\}$ 是共形映射理论的“标准区域”。由黎曼映射定理，任何单连通真子区域都与它共形等价，因此 $\\mathbb D$ 到自身的共形映射（自同构）决定了映射的唯一性。',
      tabs: TABS,
    });
    page.select(TABS.some((t) => t.id === arg) ? arg : 'aut');
    theory(page.theory, '原理与要点', [
      { title: '圆盘的全部自同构', tag: '定理', html: `
<div class="thm" data-t="定理">$\\mathbb D\\to\\mathbb D$ 的共形映射全体为
$$\\varphi(z)=e^{i\\theta}\\,\\frac{z-a}{1-\\bar az},\\qquad |a|<1,\\ \\theta\\in\\mathbb R$$</div>
<ul>
<li>$\\varphi(a)=0$，$\\varphi'(a)=\\dfrac{e^{i\\theta}}{1-|a|^2}$，$\\varphi'(0)=e^{i\\theta}(1-|a|^2)$。</li>
<li>推导：$a$ 与 $1/\\bar a$ 关于单位圆对称，由保对称性它们的像 $0$ 与 $\\infty$ 关于单位圆对称，所以 $\\varphi(z)=k\\frac{z-a}{z-1/\\bar a}$；再由 $|\\varphi(1)|=1$ 定出 $|k|$。</li>
<li>$|z|<R$ 到 $|w|<1$ 且 $z_0\\mapsto0$：$w=e^{i\\theta}\\dfrac{R(z-z_0)}{R^2-\\bar z_0z}$。</li>
<li>上半平面的自同构：$w=\\dfrac{az+b}{cz+d}$，$a,b,c,d$ 实数且 $ad-bc>0$。</li>
</ul>` },
      { title: '施瓦茨引理', tag: '定理', html: `
<div class="thm" data-t="Schwarz 引理">若 $f$ 在 $\\mathbb D$ 内解析，$|f(z)|<1$，$f(0)=0$，则
$$|f(z)|\\le|z|\\ (z\\in\\mathbb D),\\qquad |f'(0)|\\le1$$
且若存在 $z_0\\ne0$ 使 $|f(z_0)|=|z_0|$，或 $|f'(0)|=1$，则 $f(z)=e^{i\\theta}z$。</div>
<p><b>证明要点</b>：$g(z)=f(z)/z$（$g(0)=f'(0)$）在 $\\mathbb D$ 内解析；在 $|z|=r$ 上 $|g|\\le\\frac1r$，由最大模原理 $|g|\\le\\frac1r$ 在 $|z|\\le r$ 内成立，令 $r\\to1$ 得 $|g|\\le1$。</p>
<div class="thm" data-t="Schwarz–Pick 引理">若 $f:\\mathbb D\\to\\mathbb D$ 解析，则
$$\\left|\\frac{f(z_1)-f(z_2)}{1-\\overline{f(z_1)}f(z_2)}\\right|\\le\\left|\\frac{z_1-z_2}{1-\\bar z_1z_2}\\right|,\\qquad |f'(z)|\\le\\frac{1-|f(z)|^2}{1-|z|^2}$$
即 $f$ 不增大双曲距离；等号成立当且仅当 $f$ 是自同构。</div>` },
      { title: '应用：黎曼映射的唯一性', tag: '应用', html: `
<p>设 $f_1,f_2:D\\to\\mathbb D$ 都是共形映射，$f_1(z_0)=f_2(z_0)=0$，$f_1'(z_0),f_2'(z_0)>0$。则 $g=f_2\\circ f_1^{-1}$ 是 $\\mathbb D$ 的自同构且 $g(0)=0$，由施瓦茨引理 $g(w)=e^{i\\theta}w$；再由 $g'(0)>0$ 得 $\\theta=0$，所以 $f_1=f_2$。</p>
<p>这说明“区域 → 圆盘”的映射有<b>三个实自由度</b>：内点的像（2 个）+ 一个旋转角（1 个）。</p>` },
      { title: '双曲几何（Poincaré 圆盘模型）', tag: '拓展', html: `
<p>在 $\\mathbb D$ 上取度量 $ds=\\dfrac{2|dz|}{1-|z|^2}$，得到双曲平面。圆盘的自同构恰好是保持方向的<b>双曲等距变换</b>；“直线”（测地线）是与单位圆正交的圆弧或直径。</p>
<ul><li>伪双曲距离 $\\rho(z_1,z_2)=\\left|\\dfrac{z_1-z_2}{1-\\bar z_1z_2}\\right|$，双曲距离 $d=2\\operatorname{artanh}\\rho$。</li>
<li>施瓦茨–皮克引理的几何意义：圆盘到自身的解析映射是双曲度量下的<b>压缩</b>映射。</li></ul>` },
    ]);
  },
  show(arg) { if (page && arg && TABS.some((t) => t.id === arg)) page.select(arg); },
};
