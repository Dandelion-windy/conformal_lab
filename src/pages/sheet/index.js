// 第 10 章 公式速查：常用映射、区域对照、定理
import { h, renderMath } from '../../core/ui.js';

const open = (id, text = '在实验室中打开') => `<a class="open-lab" href="#lab/${id}">${text} →</a>`;

const MAPS = `
<table>
<tr><th>映射</th><th>几何作用</th><th>典型区域对应</th><th></th></tr>
<tr><td>$w=az+b$</td><td>旋转 $\\arg a$、伸缩 $|a|$、平移 $b$</td><td>圆 → 圆，直线 → 直线</td><td>${open('affine')}</td></tr>
<tr><td>$w=\\dfrac1z$</td><td>关于单位圆反演 + 关于实轴反射</td><td>$|z|<1\\to|w|>1$；$\\operatorname{Im}z>0\\to\\operatorname{Im}w<0$</td><td>${open('inv')}</td></tr>
<tr><td>$w=\\dfrac{az+b}{cz+d}$</td><td>保圆、保对称、保交比</td><td>广义圆 → 广义圆</td><td>${open('twoPts')}</td></tr>
<tr><td>$w=z^n$</td><td>辐角 ×$n$，模 $n$ 次方</td><td>$0<\\arg z<\\frac\\pi n\\to\\operatorname{Im}w>0$</td><td>${open('zn')}</td></tr>
<tr><td>$w=z^\\alpha$</td><td>张角 $\\theta\\to\\alpha\\theta$</td><td>$0<\\arg z<\\theta_0\\to 0<\\arg w<\\alpha\\theta_0$</td><td>${open('zalpha')}</td></tr>
<tr><td>$w=\\sqrt z$</td><td>辐角减半（需选分支）</td><td>$\\mathbb C\\setminus(-\\infty,0]\\to\\operatorname{Re}w>0$</td><td>${open('sqrt')}</td></tr>
<tr><td>$w=e^z$</td><td>水平线 → 射线，竖直线 → 圆</td><td>$0<\\operatorname{Im}z<\\pi\\to\\operatorname{Im}w>0$；$0<\\operatorname{Im}z<2\\pi\\to\\mathbb C\\setminus[0,\\infty)$</td><td>${open('exp')}</td></tr>
<tr><td>$w=\\operatorname{Log}z$</td><td>极坐标网格 → 直角网格</td><td>$\\operatorname{Im}z>0\\to0<\\operatorname{Im}w<\\pi$</td><td>${open('log')}</td></tr>
<tr><td>$w=\\sin z$</td><td>水平线 → 椭圆，竖直线 → 双曲线（焦点 $\\pm1$）</td><td>$|\\operatorname{Re}z|<\\frac\\pi2,\\operatorname{Im}z>0\\to\\operatorname{Im}w>0$</td><td>${open('sin')}</td></tr>
<tr><td>$w=\\cos z$</td><td>$\\sin$ 平移 $\\frac\\pi2$</td><td>$0<\\operatorname{Re}z<\\pi,\\operatorname{Im}z>0\\to\\operatorname{Im}w<0$</td><td>${open('cos')}</td></tr>
<tr><td>$w=\\tan z$</td><td>$e^{2iz}$ 与分式线性变换的复合</td><td>$|\\operatorname{Re}z|<\\frac\\pi4\\to|w|<1$</td><td>${open('tan')}</td></tr>
<tr><td>$w=\\frac12\\left(z+\\frac1z\\right)$</td><td>圆 → 共焦椭圆，射线 → 共焦双曲线</td><td>$|z|>1\\to\\mathbb C\\setminus[-1,1]$；上半单位圆盘 → 下半平面</td><td>${open('jouk')}</td></tr>
</table>`;

const REGIONS = `
<table>
<tr><th>从</th><th>到</th><th>映射</th></tr>
<tr><td>上半平面</td><td>单位圆盘，$z_0\\mapsto0$</td><td>$w=e^{i\\theta}\\dfrac{z-z_0}{z-\\bar z_0}$</td></tr>
<tr><td>单位圆盘</td><td>单位圆盘，$z_0\\mapsto0$</td><td>$w=e^{i\\theta}\\dfrac{z-z_0}{1-\\bar z_0z}$</td></tr>
<tr><td>单位圆盘</td><td>上半平面</td><td>$w=i\\dfrac{1+z}{1-z}$</td></tr>
<tr><td>单位圆盘</td><td>右半平面</td><td>$w=\\dfrac{1+z}{1-z}$</td></tr>
<tr><td>上半平面</td><td>上半平面</td><td>$w=\\dfrac{az+b}{cz+d}$，实系数，$ad-bc>0$</td></tr>
<tr><td>角形域 $0<\\arg z<\\alpha$</td><td>上半平面</td><td>$w=z^{\\pi/\\alpha}$</td></tr>
<tr><td>带形 $0<\\operatorname{Im}z<h$</td><td>上半平面</td><td>$w=e^{\\pi z/h}$</td></tr>
<tr><td>带形 $|\\operatorname{Im}z|<\\frac\\pi2$</td><td>单位圆盘</td><td>$w=\\tanh\\frac z2=\\dfrac{e^z-1}{e^z+1}$</td></tr>
<tr><td>上半单位圆盘</td><td>上半平面</td><td>$w=\\left(\\dfrac{1+z}{1-z}\\right)^2$</td></tr>
<tr><td>上半单位圆盘</td><td>第一象限</td><td>$w=\\dfrac{1+z}{1-z}$</td></tr>
<tr><td>半带形 $\\operatorname{Re}z<0,\\ 0<\\operatorname{Im}z<\\pi$</td><td>上半单位圆盘</td><td>$w=e^z$</td></tr>
<tr><td>上半平面去掉 $[0,ih]$</td><td>上半平面</td><td>$w=\\sqrt{z^2+h^2}$</td></tr>
<tr><td>$\\{|z|>1,\\ \\operatorname{Im}z>0\\}$</td><td>上半平面</td><td>$w=z+\\dfrac1z$</td></tr>
<tr><td>两圆交于 $a,b$ 所围区域（交角 $\\alpha$）</td><td>上半平面</td><td>$w=\\left(e^{i\\theta}\\dfrac{z-a}{z-b}\\right)^{\\pi/\\alpha}$</td></tr>
<tr><td>两圆切于 $a$ 所围区域</td><td>带形</td><td>$w=\\dfrac{k}{z-a}+c$，再用 $e^{(\\cdot)}$ 化为半平面</td></tr>
<tr><td>上半平面</td><td>多边形</td><td>Schwarz–Christoffel：$A\\displaystyle\\int^z\\prod(\\zeta-x_k)^{\\alpha_k-1}d\\zeta+B$</td></tr>
</table>
<p class="small">逐步演示见 <a href="#regions">第 07 章 · 区域的共形映射</a>。</p>`;

const THMS = `
<div class="thm" data-t="导数的几何意义">$f'(z_0)\\ne0$：旋转角 $\\arg f'(z_0)$，伸缩率 $|f'(z_0)|$，与方向无关；面积放大 $|f'|^2$。</div>
<div class="thm" data-t="共形映射">$f$ 在 $D$ 内单叶解析 $\\Rightarrow$ $f'\\ne0$，$f$ 是 $D$ 上的共形映射。</div>
<div class="thm" data-t="黎曼映射定理">边界多于一点的单连通区域都可共形映为单位圆盘；$f(z_0)=0,\\ f'(z_0)>0$ 时唯一。</div>
<div class="thm" data-t="边界对应原理">$f$ 在 $\\bar D$ 上连续、$D$ 内解析，把 $\\partial D$ 一一且保持方向地映为 $\\partial G$，则 $f$ 把 $D$ 共形映为 $G$。</div>
<div class="thm" data-t="分式线性变换">由三对点唯一确定；保圆性、保对称性、保交比；按 $\\operatorname{tr}^2$ 分为椭圆、抛物、双曲、斜驶四类。</div>
<div class="thm" data-t="施瓦茨引理">$f:\\mathbb D\\to\\mathbb D$，$f(0)=0\\Rightarrow|f(z)|\\le|z|,\\ |f'(0)|\\le1$；等号当且仅当 $f=e^{i\\theta}z$。</div>
<div class="thm" data-t="调和函数的共形不变性">$u$ 调和，$f$ 解析 $\\Rightarrow u\\circ f$ 调和。狄利克雷问题可以搬到标准区域求解。</div>`;

const FORMULAS = `
<table>
<tr><th>内容</th><th>公式</th></tr>
<tr><td>球极投影（单位球）</td><td>$(\\xi,\\eta,\\zeta)=\\left(\\frac{2x}{1+|z|^2},\\frac{2y}{1+|z|^2},\\frac{|z|^2-1}{|z|^2+1}\\right)$，$z=\\frac{\\xi+i\\eta}{1-\\zeta}$</td></tr>
<tr><td>弦距离</td><td>$d(z_1,z_2)=\\dfrac{2|z_1-z_2|}{\\sqrt{(1+|z_1|^2)(1+|z_2|^2)}}$，$d(z,\\infty)=\\dfrac{2}{\\sqrt{1+|z|^2}}$</td></tr>
<tr><td>交比</td><td>$(z,z_1,z_2,z_3)=\\dfrac{z-z_1}{z-z_3}:\\dfrac{z_2-z_1}{z_2-z_3}$</td></tr>
<tr><td>三点确定</td><td>$(w,w_1,w_2,w_3)=(z,z_1,z_2,z_3)$</td></tr>
<tr><td>关于圆 $|z-a|=R$ 的对称点</td><td>$z^*=a+\\dfrac{R^2}{\\overline{z-a}}$</td></tr>
<tr><td>不动点</td><td>$cz^2+(d-a)z-b=0$；$\\dfrac{w-p}{w-q}=k\\dfrac{z-p}{z-q}$ 或 $\\dfrac1{w-p}=\\dfrac1{z-p}+\\beta$</td></tr>
<tr><td>Jacobi 行列式</td><td>$J=u_xv_y-u_yv_x=|f'(z)|^2$</td></tr>
<tr><td>像的面积与长度</td><td>$A=\\iint_D|f'|^2dxdy$，$L=\\int_C|f'||dz|$</td></tr>
</table>`;

const STEPS = `
<ol>
<li>画出区域，标出边界的组成（圆弧/直线）、交点和交角、切点。</li>
<li>有交点：$\\frac{z-a}{z-b}$ 把交点送到 $0,\\infty$ → 角形域；有切点：$\\frac{1}{z-a}$ → 带形。</li>
<li>角形域用幂函数、带形用指数函数化为上半平面；割缝用平方/开方处理。</li>
<li>上半平面 → 圆盘：$\\frac{z-z_0}{z-\\bar z_0}$，用附加条件定 $z_0$ 与旋转角。</li>
<li>检验：取一个内点看像是否在目标区域内；检查每一步所用的函数是否单叶、分支是否取对。</li>
</ol>`;


const EXERCISES = [
  ['求把上半平面映为单位圆盘，且 $w(i)=0,\\ \\arg w\'(i)=-\\frac\\pi2$ 的分式线性变换。',
   '设 $w=e^{i\\theta}\\frac{z-i}{z+i}$，$w\'(i)=e^{i\\theta}\\frac{2i}{(2i)^2}=\\frac{e^{i\\theta}}{2i}$，$\\arg w\'(i)=\\theta-\\frac\\pi2=-\\frac\\pi2$，故 $\\theta=0$，$w=\\dfrac{z-i}{z+i}$。', 'mobius/three'],
  ['求把 $|z|<1$ 映为 $|w|<1$，且 $w(\\frac12)=0,\\ \\arg w\'(\\frac12)=0$ 的映射。',
   '$w=e^{i\\theta}\\frac{z-\\frac12}{1-\\frac12z}$，$w\'(\\frac12)=\\frac{e^{i\\theta}}{1-\\frac14}$，所以 $\\theta=0$，$w=\\dfrac{2z-1}{2-z}$。', 'disk'],
  ['求把角形域 $0<\\arg z<\\frac\\pi4$ 映为单位圆盘的映射。',
   '$\\zeta=z^4$ 映为上半平面，再用 $w=\\dfrac{\\zeta-i}{\\zeta+i}$，得 $w=\\dfrac{z^4-i}{z^4+i}$。', 'regions/sectorDisk'],
  ['求把带形 $0<\\operatorname{Im}z<\\pi$ 映为单位圆盘的映射。',
   '$\\zeta=e^z$ 映为上半平面，$w=\\dfrac{e^z-i}{e^z+i}$。', 'lab/exp'],
  ['求把 $\\{|z|<1,\\ \\operatorname{Im}z>0\\}$ 映为上半平面的映射。',
   '$\\zeta=\\frac{1+z}{1-z}$ 映为第一象限，$w=\\zeta^2=\\left(\\dfrac{1+z}{1-z}\\right)^2$。', 'regions/halfdisk'],
  ['$w=\\frac1z$ 把圆周 $x^2+y^2=2x$ 映为什么曲线？',
   '圆周过原点，像为直线。$|z-1|=1$ 上取 $z=2\\mapsto\\frac12$，$z=1+i\\mapsto\\frac{1-i}{2}$，所以像为直线 $u=\\frac12$。', 'lab/inv'],
  ['判断 $w=\\dfrac{z+1}{z-1}$ 的类型并求不动点。',
   '不动点：$z^2-2z-1=0$，$z=1\\pm\\sqrt2$。矩阵 $\\begin{pmatrix}1&1\\\\1&-1\\end{pmatrix}$，$\\det=-2$，$\\operatorname{tr}^2/\\det=0$，属于椭圆型（$k=-1$，是一个对合：$w(w(z))=z$）。', 'mobius/dyn'],
  ['求把上半平面去掉线段 $[0,2i]$ 映为上半平面的映射。',
   '$\\zeta_1=z^2$，$\\zeta_2=\\zeta_1+4$，$w=\\sqrt{\\zeta_2}$（辐角取 $(0,2\\pi)$），即 $w=\\sqrt{z^2+4}$。', 'regions/slitUHP'],
  ['设 $f$ 在 $|z|<1$ 内解析，$|f(z)|<1$，$f(0)=0$，$f(\\frac12)=\\frac12$。求 $f$。',
   '$|f(\\frac12)|=|\\frac12|$，施瓦茨引理的等号成立，$f(z)=e^{i\\theta}z$，再由 $f(\\frac12)=\\frac12$ 得 $f(z)=z$。', 'disk/schwarz'],
  ['用共形映射求上半平面内的调和函数 $u$，使 $u(x,0)=1\\ (x<0)$，$u(x,0)=0\\ (x>0)$。',
   '$u=\\frac1\\pi\\arg z=\\frac1\\pi\\operatorname{Im}\\operatorname{Log}z$。（$\\operatorname{Log}z$ 解析，其虚部调和，边界值正确。）', null],
];
const EX_HTML = EXERCISES.map(([q, a, link], i) => `<details class="ex-item"><summary><b>${i + 1}.</b> ${q}</summary><div class="ex-ans">${a}${link ? `<br><a class="open-lab" href="#${link}">看图 →</a>` : ''}</div></details>`).join('');

export default {
  mount(root) {
    const card = (title, tag, html, wide = false) => h('div', { class: `card ${wide ? 'wide' : ''}`, html: `<h3><span class="tag">${tag}</span>${title}</h3>${html}` });
    root.append(
      h('header', { class: 'page-head' }, h('div', {}, h('div', { class: 'eyebrow' }, 'Chapter 10'), h('h1', {}, '公式速查'),
        h('p', { class: 'lead' }, '复习用的汇总表。点击“在实验室中打开”可直接查看对应映射的图像。'))),
      h('div', { class: 'theory', style: 'margin-top:0' },
        card('初等映射', '映射', MAPS, true),
        card('标准区域之间的映射', '区域', REGIONS, true),
        card('核心定理', '定理', THMS),
        card('求共形映射的一般步骤', '方法', STEPS),
        card('常用公式', '公式', FORMULAS, true),
        card('自测练习（点击题目展开答案）', '练习', EX_HTML, true)),
    );
    renderMath(root);
  },
};
