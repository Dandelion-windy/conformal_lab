// 第 10 章 物理应用：复势与平面势流、茹科夫斯基翼型、稳态温度场
import { tabbedShell, theory } from '../common.js';
import { mountBasic } from './basic.js';
import { mountAirfoil } from './airfoil.js';
import { mountHeat } from './heat.js';

let page = null;
const TABS = [
  { id: 'basic', label: '复势与基本流动', stageClass: 'one', mount: mountBasic },
  { id: 'airfoil', label: '茹科夫斯基翼型', mount: mountAirfoil },
  { id: 'heat', label: '温度场 / 静电场', stageClass: 'one', mount: mountHeat },
];

export default {
  mount(root, app, arg) {
    page = tabbedShell(root, {
      num: '10', title: '物理应用：复势与共形映射法',
      lead: '平面上的理想流体势流、稳态温度场、静电场都由调和函数描述。解析函数 $W=\\varphi+i\\psi$ 的实部、虚部都是调和函数且等值线正交，而<b>共形映射保持调和性</b>——所以可以先在简单区域中求解，再用共形映射搬到复杂区域。',
      tabs: TABS,
    });
    page.select(TABS.some((t) => t.id === arg) ? arg : 'basic');
    theory(page.theory, '原理与要点', [
      { title: '复势', tag: '流体', html: `
<p>不可压缩、无旋的平面流动，速度 $v=(v_x,v_y)$ 满足 $\\operatorname{div}v=0$、$\\operatorname{curl}v=0$。存在速度势 $\\varphi$ 与流函数 $\\psi$：</p>
$$v_x=\\varphi_x=\\psi_y,\\qquad v_y=\\varphi_y=-\\psi_x$$
<p>这正是 C-R 方程，所以 $W(z)=\\varphi+i\\psi$ 是解析函数，称为<b>复势</b>。</p>
<ul>
<li><b>复速度</b> $W'(z)=v_x-iv_y=\\overline{v}$，速度大小 $|v|=|W'(z)|$。</li>
<li>流线 $\\psi=$ 常数，等势线 $\\varphi=$ 常数，二者正交（$W'\\ne0$ 处）；$W'=0$ 的点是<b>驻点</b>。</li>
<li>固体边界必须是一条流线（流体不能穿透）。</li>
<li>伯努利方程 $p+\\frac12\\rho|v|^2=$ 常数，压强系数 $C_p=1-\\frac{|v|^2}{U^2}$。</li>
</ul>` },
      { title: '共形映射法', tag: '方法', html: `
<div class="thm" data-t="原理">若 $\\zeta=f(z)$ 把物理区域 $D$ 共形映为 $G$，$\\Omega(\\zeta)$ 是 $G$ 中的复势，则 $W(z)=\\Omega(f(z))$ 是 $D$ 中的复势。边界（流线）对应边界，源、涡等奇点对应奇点，速度 $W'(z)=\\Omega'(\\zeta)f'(z)$。</div>
<ul>
<li><b>角形区域</b>：$\\zeta=z^n$ 把张角 $\\frac\\pi n$ 的角形域变为上半平面，$\\Omega=U\\zeta$，得 $W=Uz^n$。</li>
<li><b>绕平板 / 翼型</b>：$z=\\zeta+\\frac{1}{\\zeta}$ 把圆外部变为平板或翼型外部；绕圆柱的流动给出绕翼型的流动。</li>
<li><b>Kutta–Joukowski 定理</b>：绕物体的环量为 $\\Gamma$ 时，单位长度受到的升力 $L=-\\rho U\\Gamma$，方向垂直于来流。Kutta 条件确定 $\\Gamma$：尖锐后缘处速度有限。</li>
</ul>` },
      { title: '调和函数与狄利克雷问题', tag: '热 / 电', wide: true, html: `
<div class="thm" data-t="定理">若 $u(\\xi,\\eta)$ 在 $G$ 内调和，$\\zeta=f(z)$ 把 $D$ 共形映为 $G$，则 $u(f(z))$ 在 $D$ 内调和。（因为 $\\Delta_z(u\\circ f)=|f'(z)|^2(\\Delta_\\zeta u)\\circ f$。）</div>
<p><b>求解步骤</b>：① 用共形映射把区域 $D$ 映为上半平面（或圆盘、带形）；② 边界值随边界点一起转移；③ 在上半平面中写出解——分段常数边界值的解是辐角的线性组合（$\\frac1\\pi\\arg(\\zeta-x_k)$ 在 $x>x_k$ 处为 $0$、$x<x_k$ 处为 $1$）；也可以用泊松积分 $u(x,y)=\\frac{y}{\\pi}\\displaystyle\\int_{-\\infty}^{\\infty}\\frac{u(t,0)}{(x-t)^2+y^2}dt$；④ 代回 $\\zeta=f(z)$。</p>
<p>同心圆环 $r<|z|<1$ 中，$\\ln|z|$ 是调和函数，解为 $u=\\dfrac{\\ln|z|}{\\ln r}$（内圆 1，外圆 0）。偏心圆环先用分式线性变换化为同心圆环：关键是找到<b>关于两圆都对称的一对点</b>，把它们送到 $0$ 与 $\\infty$。</p>` },
    ]);
  },
  show(arg) {
    if (!page) return;
    if (arg && TABS.some((t) => t.id === arg)) page.select(arg);
    page.ctx[page.current]?.show?.();
  },
  hide() { if (page) for (const k in page.ctx) page.ctx[k].hide?.(); },
};
