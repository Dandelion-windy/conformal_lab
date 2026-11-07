// 典型例题：区域 → 上半平面 / 单位圆盘 的分步映射
// 每个例题：source 参数化 param(u,v)；边界 boundary；标记点 marks；steps 为依次作用的映射
import * as K from '../../core/complex.js';
import { segment, circlePts } from '../../core/mapcurve.js';

const { C } = K;
const PI = Math.PI;
const far = (u) => Math.tan(u * 0.985 * PI / 2);
const sym = (u) => Math.tan((u - 0.5) * 0.985 * PI);
// 辐角取 [0, 2π) 的平方根：把 ℂ∖[0,+∞) 映为上半平面
const sqrtUp = (z) => { let t = Math.atan2(z.im, z.re); if (t < 0) t += 2 * PI; return K.polar(Math.sqrt(K.abs(z)), t / 2); };
const cayley = (z) => K.div(K.sub(z, K.I), K.add(z, K.I));
const sq = (z) => K.mul(z, z);
const B = ['#ffb454', '#ff6b9a', '#6ee7a8', '#a78bfa', '#5cc8ff'];
const arc = (c, r, t0, t1, n = 200) => circlePts(c, r, n, t0, t1);
const R = 40;

export const EXAMPLES = [
  {
    id: 'halfdisk', title: '上半单位圆盘 → 上半平面', tag: '分式线性 + 幂',
    q: '求把 $D=\\{|z|<1,\\ \\operatorname{Im}z>0\\}$ 映为上半平面的共形映射。',
    param: (u, v) => K.polar(u, PI * v), cells: [6, 8], view: [0, 0.5, 1.3],
    boundary: [[segment(C(-1), C(1), 200), B[0], '直径 [−1,1]'], [arc(C(0), 1, 0, PI), B[1], '上半圆周']],
    marks: [[C(-1), '−1'], [C(1), '1'], [C(0, 1), 'i'], [C(0), '0']],
    steps: [
      { f: (z) => K.div(K.add(K.ONE, z), K.sub(K.ONE, z)), tex: '\\zeta=\\dfrac{1+z}{1-z}', view: [1.2, 1.2, 2.6],
        note: '两条边界交于 $\\pm1$，交角为直角。把 $-1\\mapsto0$、$1\\mapsto\\infty$：两条边界都变成从 0 出发的射线。直径 → 正实轴，半圆 → 正虚轴（取 $z=i$：$\\zeta=i$），所以 $D$ → 第一象限。' },
      { f: sq, tex: 'w=\\zeta^2', view: [0, 1.5, 3],
        note: '平方把直角撑成平角：第一象限 → 上半平面。' },
    ],
    answer: 'w=\\left(\\dfrac{1+z}{1-z}\\right)^2',
  },
  {
    id: 'lens', title: '两圆弧所围透镜形 → 上半平面', tag: '交点送到 0, ∞',
    q: '$D=\\{|z-i|<\\sqrt2\\}\\cap\\{|z+i|<\\sqrt2\\}$，两圆交于 $\\pm1$。求 $D$ 到上半平面的共形映射。',
    // 用逆映射参数化：ζ 在角形域 |arg ζ| < π/4，z = (ζ−1)/(ζ+1)
    param: (u, v) => { const s = K.polar(far(u), (v - 0.5) * PI / 2); return K.div(K.sub(s, K.ONE), K.add(s, K.ONE)); }, cells: [8, 6], view: [0, 0, 1.3],
    boundary: [[arc(C(0, -1), Math.SQRT2, PI / 4, 3 * PI / 4), B[0], '上弧（属于 |z+i|=√2）'], [arc(C(0, 1), Math.SQRT2, -3 * PI / 4, -PI / 4), B[1], '下弧（属于 |z−i|=√2）']],
    marks: [[C(-1), '−1'], [C(1), '1'], [C(0), '0']],
    steps: [
      { f: (z) => K.div(K.add(z, K.ONE), K.sub(K.ONE, z)), tex: '\\zeta_1=\\dfrac{1+z}{1-z}', view: [1.5, 0, 3],
        note: '把交点 $-1\\mapsto0$、$1\\mapsto\\infty$，两段圆弧变为从 0 出发的射线。$z=0\\mapsto1$，两弧在 $\\pm1$ 处的夹角是 $\\frac\\pi2$，所以像是角形域 $|\\arg\\zeta_1|<\\frac\\pi4$。' },
      { f: (z) => K.mul(K.cis(PI / 4), z), tex: '\\zeta_2=e^{i\\pi/4}\\zeta_1', view: [1, 1, 2.6],
        note: '旋转 $\\frac\\pi4$：角形域 → 第一象限 $0<\\arg\\zeta_2<\\frac\\pi2$。' },
      { f: sq, tex: 'w=\\zeta_2^2', view: [0, 1.5, 3], note: '平方：第一象限 → 上半平面。' },
    ],
    answer: 'w=i\\left(\\dfrac{1+z}{1-z}\\right)^2',
  },
  {
    id: 'lune', title: '两圆相切所围区域 → 上半平面', tag: '切点送到 ∞',
    q: '$D=\\{|z|<2,\\ |z-1|>1\\}$，两圆在 $z=2$ 处内切。求 $D$ 到上半平面的共形映射。',
    // 逆映射：ζ 在竖直带形 −1/2 < Re ζ < −1/4，z = 2 + 1/ζ
    param: (u, v) => K.add(C(2), K.inv(C(-0.5 + 0.25 * u, sym(v) * 0.6))), cells: [6, 16], view: [0, 0, 2.3],
    boundary: [[circlePts(C(0), 2, 300), B[0], '|z|=2'], [circlePts(C(1), 1, 300), B[1], '|z−1|=1']],
    marks: [[C(-2), '−2'], [C(0), '0'], [C(-1), '−1']],
    steps: [
      { f: (z) => K.inv(K.sub(z, C(2))), tex: '\\zeta_1=\\dfrac{1}{z-2}', view: [-0.375, 0, 1.2],
        note: '切点 $2\\mapsto\\infty$：两个相切的圆变成两条<b>平行直线</b>。$|z|=2$ 过 $-2\\mapsto-\\frac14$，$|z-1|=1$ 过 $0\\mapsto-\\frac12$，像都是竖直线；$-1\\mapsto-\\frac13$ 在中间，所以 $D$ → 带形 $-\\frac12<\\operatorname{Re}\\zeta_1<-\\frac14$。' },
      { f: (z) => K.mul(C(0, 4 * PI), K.add(z, C(0.5))), tex: '\\zeta_2=4\\pi i\\left(\\zeta_1+\\tfrac12\\right)', view: [0, 1.6, 4],
        note: '平移、旋转 $90^\\circ$ 并伸缩：竖直带形 → 水平带形 $0<\\operatorname{Im}\\zeta_2<\\pi$。' },
      { f: K.exp, tex: 'w=e^{\\zeta_2}', view: [0, 2, 4], note: '指数函数：带形 $0<\\operatorname{Im}\\zeta_2<\\pi$ → 上半平面。' },
    ],
    answer: 'w=\\exp\\!\\left(4\\pi i\\left(\\dfrac{1}{z-2}+\\dfrac12\\right)\\right)=\\exp\\!\\left(2\\pi i\\,\\dfrac{z}{z-2}\\right)',
  },
  {
    id: 'slitUHP', title: '上半平面去掉竖直线段 → 上半平面', tag: '平方 + 平移 + 开方',
    q: '$D$ 为上半平面去掉线段 $[0,\\,hi]$（取 $h=1$）。求 $D$ 到上半平面的共形映射。',
    param: (u, v) => C(sym(u) * 0.3, far(v) * 0.4), cells: [16, 8], view: [0, 1.2, 2.4],
    boundary: [[segment(C(-R, 1e-9), C(-1e-9, 1e-9), 400), B[3], '负实轴'], [segment(C(-1e-9, 1e-9), C(-1e-9, 1), 100), B[0], '割线左岸'], [segment(C(1e-9, 1), C(1e-9, 1e-9), 100), B[1], '割线右岸'], [segment(C(1e-9, 1e-9), C(R, 1e-9), 400), B[2], '正实轴']],
    marks: [[C(0, 1), 'i'], [C(-1), '−1'], [C(1), '1']],
    steps: [
      { f: sq, tex: '\\zeta_1=z^2', view: [0, 0, 3],
        note: '平方把上半平面映为 $\\mathbb C\\setminus[0,+\\infty)$；割线 $[0,i]$ 映为线段 $[-1,0]$，于是 $D$ → $\\mathbb C\\setminus[-1,+\\infty)$（沿 $[-1,+\\infty)$ 割开）。' },
      { f: (z) => K.add(z, K.ONE), tex: '\\zeta_2=\\zeta_1+1', view: [0, 0, 3], note: '平移 1：割线变为 $[0,+\\infty)$。' },
      { f: sqrtUp, tex: 'w=\\sqrt{\\zeta_2}\\ \\ (0<\\arg\\zeta_2<2\\pi)', view: [0, 1.2, 2.4],
        note: '取辐角在 $(0,2\\pi)$ 的开方分支，$\\mathbb C\\setminus[0,+\\infty)$ → 上半平面。割线两岸分别映到 $[0,1]$ 与 $[-1,0]$，顶点 $i\\mapsto0$。' },
    ],
    answer: 'w=\\sqrt{z^2+1}',
  },
  {
    id: 'slitDisk', title: '沿半径割开的单位圆盘 → 上半平面', tag: '开方 + 分式线性 + 平方',
    q: '$D=\\{|z|<1\\}\\setminus[0,1)$。求 $D$ 到上半平面的共形映射。',
    param: (u, v) => K.polar(u, 2 * PI * (0.002 + 0.996 * v)), cells: [6, 16], view: [0, 0, 1.3],
    boundary: [[segment(C(0, 1e-9), C(1, 1e-9), 100), B[0], '割线上岸'], [circlePts(C(0), 1, 300), B[2], '单位圆周'], [segment(C(1, -1e-9), C(0, -1e-9), 100), B[1], '割线下岸']],
    marks: [[C(-1), '−1'], [C(0, 1), 'i'], [C(0, -1), '−i']],
    steps: [
      { f: sqrtUp, tex: '\\zeta_1=\\sqrt z\\ \\ (0<\\arg z<2\\pi)', view: [0, 0.5, 1.3],
        note: '开方把“张角为 $2\\pi$ 的扇形”变为张角 $\\pi$ 的半圆盘：$D$ → 上半单位圆盘。割线上岸 → $[0,1]$，下岸 → $[-1,0]$。' },
      { f: (z) => K.div(K.add(K.ONE, z), K.sub(K.ONE, z)), tex: '\\zeta_2=\\dfrac{1+\\zeta_1}{1-\\zeta_1}', view: [1.2, 1.2, 2.6], note: '与第一个例题相同：上半单位圆盘 → 第一象限。' },
      { f: sq, tex: 'w=\\zeta_2^2', view: [0, 1.5, 3], note: '第一象限 → 上半平面。' },
    ],
    answer: 'w=\\left(\\dfrac{1+\\sqrt z}{1-\\sqrt z}\\right)^2',
  },
  {
    id: 'halfstrip', title: '半带形 → 上半平面（sin z 的分解）', tag: '指数 + 茹科夫斯基',
    q: '$D=\\{-\\frac\\pi2<\\operatorname{Re}z<\\frac\\pi2,\\ \\operatorname{Im}z>0\\}$。说明 $w=\\sin z$ 把 $D$ 映为上半平面。',
    param: (u, v) => C(PI * (u - 0.5), far(v) * 0.6), cells: [6, 10], view: [0, 1.4, 2.4],
    boundary: [[segment(C(-PI / 2, R), C(-PI / 2, 0), 400), B[1], '左边'], [segment(C(-PI / 2), C(PI / 2), 200), B[0], '底边'], [segment(C(PI / 2, 0), C(PI / 2, R), 400), B[2], '右边']],
    marks: [[C(-PI / 2), '−π/2'], [C(PI / 2), 'π/2'], [C(0), '0']],
    steps: [
      { f: (z) => K.exp(K.mul(K.I, z)), tex: '\\zeta_1=e^{iz}', view: [0.5, 0, 1.2],
        note: '$e^{iz}=e^{-y}e^{ix}$：模 $<1$，辐角在 $(-\\frac\\pi2,\\frac\\pi2)$，所以 $D$ → 右半单位圆盘。底边 → 右半圆周，两条竖边 → 虚轴上的两段。' },
      { f: (z) => K.mul(K.I, z), tex: '\\zeta_2=i\\zeta_1', view: [0, 0.5, 1.3], note: '旋转 $90^\\circ$：→ 上半单位圆盘。' },
      { f: (z) => K.scale(K.add(z, K.inv(z)), 0.5), tex: '\\zeta_3=\\tfrac12\\left(\\zeta_2+\\tfrac{1}{\\zeta_2}\\right)', view: [0, -1.5, 3],
        note: '茹科夫斯基函数：上半单位圆盘 → <b>下</b>半平面（半圆周 → $[-1,1]$，两段直径 → $(-\\infty,-1]$ 与 $[1,+\\infty)$）。' },
      { f: K.neg, tex: 'w=-\\zeta_3', view: [0, 1.5, 3], note: '取负号：下半平面 → 上半平面。合起来就是 $w=\\sin z$。' },
    ],
    answer: 'w=-\\tfrac12\\left(ie^{iz}+\\tfrac{1}{ie^{iz}}\\right)=\\sin z',
  },
  {
    id: 'stripDisk', title: '竖直带形 → 单位圆盘', tag: '旋转 + 指数 + Cayley',
    q: '$D=\\{0<\\operatorname{Re}z<1\\}$。求 $D$ 到单位圆盘的共形映射。',
    param: (u, v) => C(u, sym(v) * 0.5), cells: [6, 16], view: [0.5, 0, 1.6],
    boundary: [[segment(C(0, -R), C(0, R), 600), B[0], 'Re z=0'], [segment(C(1, R), C(1, -R), 600), B[1], 'Re z=1']],
    marks: [[C(0.5), '½'], [C(0), '0'], [C(1), '1']],
    steps: [
      { f: (z) => K.mul(C(0, PI), z), tex: '\\zeta_1=\\pi i z', view: [0, 1.6, 3.4], note: '旋转 $90^\\circ$ 并放大 $\\pi$ 倍：→ 水平带形 $0<\\operatorname{Im}\\zeta_1<\\pi$。' },
      { f: K.exp, tex: '\\zeta_2=e^{\\zeta_1}', view: [0, 1.5, 3], note: '带形 → 上半平面。$\\frac12\\mapsto\\frac{\\pi i}{2}\\mapsto i$。' },
      { f: cayley, tex: 'w=\\dfrac{\\zeta_2-i}{\\zeta_2+i}', view: [0, 0, 1.4], note: 'Cayley 变换：上半平面 → 单位圆盘，$i\\mapsto0$，所以 $z=\\frac12\\mapsto0$。' },
    ],
    answer: 'w=\\dfrac{e^{\\pi i z}-i}{e^{\\pi i z}+i}',
  },
  {
    id: 'sectorDisk', title: '角形域 → 单位圆盘', tag: '幂 + Cayley',
    q: '$D=\\{0<\\arg z<\\frac\\pi3\\}$。求 $D$ 到单位圆盘的共形映射，使 $e^{i\\pi/6}\\mapsto0$。',
    param: (u, v) => K.polar(far(u) * 0.6, (PI / 3) * v), cells: [8, 6], view: [1, 0.7, 2],
    boundary: [[segment(C(0), C(R), 400), B[0], 'arg z=0'], [segment(K.polar(R, PI / 3), C(0), 400), B[1], 'arg z=π/3']],
    marks: [[C(0), '0'], [K.cis(PI / 6), 'e^{iπ/6}']],
    steps: [
      { f: (z) => K.powi(z, 3), tex: '\\zeta=z^3', view: [0, 1.5, 3], note: '张角 $\\frac\\pi3$ 乘 3：→ 上半平面。$e^{i\\pi/6}\\mapsto e^{i\\pi/2}=i$。' },
      { f: cayley, tex: 'w=\\dfrac{\\zeta-i}{\\zeta+i}', view: [0, 0, 1.4], note: 'Cayley 变换：$i\\mapsto 0$。' },
    ],
    answer: 'w=\\dfrac{z^3-i}{z^3+i}',
  },
  {
    id: 'cylinder', title: '上半平面去掉半圆盘 → 上半平面', tag: '茹科夫斯基',
    q: '$D=\\{\\operatorname{Im}z>0,\\ |z|>1\\}$。求 $D$ 到上半平面的共形映射。（这正是第 10 章中绕圆柱流动的区域）',
    param: (u, v) => K.polar(1 / (1 - 0.975 * u), PI * (0.002 + 0.996 * v)), cells: [8, 8], view: [0, 1.2, 2.6],
    boundary: [[segment(C(R), C(1), 400), B[2], '[1,+∞)'], [arc(C(0), 1, 0, PI), B[0], '上半圆周'], [segment(C(-1), C(-R), 400), B[1], '(−∞,−1]']],
    marks: [[C(1), '1'], [C(-1), '−1'], [C(0, 1), 'i']],
    steps: [
      { f: (z) => K.add(z, K.inv(z)), tex: 'w=z+\\dfrac1z', view: [0, 1.5, 3.4],
        note: '$z=e^{i\\theta}$ 时 $w=2\\cos\\theta\\in[-2,2]$：半圆周被压成线段 $[-2,2]$；两段实轴 $[1,+\\infty)$、$(-\\infty,-1]$ 分别映为 $[2,+\\infty)$、$(-\\infty,-2]$。$2i\\mapsto\\frac32 i$，所以像是上半平面。' },
    ],
    answer: 'w=z+\\dfrac1z',
  },
  {
    id: 'diskExtSlits', title: '去掉两条射线的平面 → 单位圆盘', tag: '分式线性 + 开方',
    q: '$D=\\mathbb C\\setminus\\big((-\\infty,-1]\\cup[1,+\\infty)\\big)$。求 $D$ 到单位圆盘的共形映射，使 $0\\mapsto0$。',
    param: (u, v) => { const s = K.polar(far(u) * 0.8, PI * (2 * v - 1) * 0.998); return K.div(K.sub(s, K.ONE), K.add(s, K.ONE)); }, cells: [8, 16], view: [0, 0, 2.4],
    boundary: [[segment(C(1, 1e-9), C(R, 1e-9), 400), B[0], '[1,∞) 上岸'], [segment(C(R, -1e-9), C(1, -1e-9), 400), B[1], '[1,∞) 下岸'], [segment(C(-1, -1e-9), C(-R, -1e-9), 400), B[2], '(−∞,−1] 下岸'], [segment(C(-R, 1e-9), C(-1, 1e-9), 400), B[3], '(−∞,−1] 上岸']],
    marks: [[C(0), '0'], [C(0, 1), 'i'], [C(0, -1), '−i']],
    steps: [
      { f: (z) => K.div(K.add(K.ONE, z), K.sub(K.ONE, z)), tex: '\\zeta_1=\\dfrac{1+z}{1-z}', view: [0, 0, 3],
        note: '$-1\\mapsto0$、$1\\mapsto\\infty$：两条射线合并成一条射线 $(-\\infty,0]$（因为 $\\infty\\mapsto-1$）。$D$ → $\\mathbb C\\setminus(-\\infty,0]$，$0\\mapsto1$。' },
      { f: K.sqrt, tex: '\\zeta_2=\\sqrt{\\zeta_1}', view: [1, 0, 2], note: '主值开方：→ 右半平面，$1\\mapsto1$。' },
      { f: (z) => K.div(K.sub(z, K.ONE), K.add(z, K.ONE)), tex: 'w=\\dfrac{\\zeta_2-1}{\\zeta_2+1}', view: [0, 0, 1.4], note: '右半平面 → 单位圆盘，$1\\mapsto0$。' },
    ],
    answer: 'w=\\dfrac{\\sqrt{\\frac{1+z}{1-z}}-1}{\\sqrt{\\frac{1+z}{1-z}}+1}',
  },
];
