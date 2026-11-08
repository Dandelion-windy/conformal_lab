// 第 9 章 Schwarz–Christoffel 变换：上半平面（或圆盘）→ 多边形
import * as K from '../../core/complex.js';
import { h, select, slider, group, readouts, note, setTex, renderMath, toggle } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { dot, label } from '../../core/draw.js';
import { BCOL } from '../../core/domains.js';
import { num } from '../../core/format.js';
import { shell, theory } from '../common.js';
import { halfPlaneGeometry, diskGeometry, QUALITY } from './geometry.js';
import { scheduleGeometry } from './schedule.js';
import { CurveLayer } from '../../components/curves/index.js';
import { SourcePlane, SampledLayer, IDENTITY_MAP } from '../../components/mapper/layers.js';

const PRE = [
  { name: '等边三角形', xs: [-1, 0, 1], al: [1 / 3, 1 / 3, 1 / 3] },
  { name: '直角三角形（30°-60°-90°）', xs: [-1, 0, 1], al: [1 / 2, 1 / 3, 1 / 6] },
  { name: '矩形（椭圆积分）', xs: [-2, -1, 1, 2], al: [0.5, 0.5, 0.5, 0.5] },
  { name: '半带形：arcsin z', xs: [-1, 1], al: [0.5, 0.5] },
  { name: '带形：log z', xs: [0], al: [0] },
  { name: '台阶（台阶绕流区域）', xs: [-1, 1], al: [1.5, 0.5] },
  { name: '角形域：z^α', xs: [0], al: [0.6] },
  { name: 'L 形六边形', xs: [-3, -1.5, -0.5, 0.5, 1.5, 3], al: [0.5, 0.5, 0.5, 1.5, 0.5, 0.5] },
  { name: '平行四边形', xs: [-1.5, -0.5, 0.8, 2], al: [1 / 3, 2 / 3, 1 / 3, 2 / 3] },
  { name: '圆盘 → 正 n 边形', disk: true, n: 5 },
];
const ANGLE = (a) => `${num(a * 180, 1)}°`;

let api = null;
export default {
  mount(root) {
    const { stage, panel, theory: th } = shell(root, {
      num: '09', title: 'Schwarz–Christoffel 变换',
      lead: '把上半平面映为多边形的共形映射可以显式写出：$f(z)=A\\displaystyle\\int^z\\prod_k(\\zeta-x_k)^{\\alpha_k-1}d\\zeta+B$。实轴上的前顶点 $x_k$ 映为多边形顶点，$\\alpha_k\\pi$ 是该顶点处的内角。下面的图形都由数值积分实时计算。',
    });
    api = mountSC(stage, panel);
    theory(th, '原理与要点', [
      { title: 'Schwarz–Christoffel 公式', tag: '定理', html: `
<div class="thm" data-t="定理">设多边形 $P$ 的顶点为 $w_1,\\dots,w_n$，内角为 $\\alpha_1\\pi,\\dots,\\alpha_n\\pi$（$\\sum\\alpha_k=n-2$）。则把上半平面共形映为 $P$ 内部的映射形如
$$f(z)=A\\int_{z_0}^{z}(\\zeta-x_1)^{\\alpha_1-1}\\cdots(\\zeta-x_n)^{\\alpha_n-1}\\,d\\zeta+B$$
其中 $x_1<\\cdots<x_n$ 是实轴上的点，$f(x_k)=w_k$。</div>
<h4>为什么？</h4>
<p>在区间 $(x_k,x_{k+1})$ 上，$\\arg f'(x)=\\arg A+\\sum_j(\\alpha_j-1)\\arg(x-x_j)$，其中 $\\arg(x-x_j)$ 只取 $0$（$x>x_j$）或 $\\pi$（$x<x_j$）。所以 $\\arg f'$ 在每个区间上为常数——像是直线段；每经过一个 $x_k$，$\\arg f'$ 跳变 $-(\\alpha_k-1)\\pi=(1-\\alpha_k)\\pi$，即外角，于是边在 $w_k$ 处转过一个外角。</p>` },
      { title: '自由度与使用要点', tag: '要点', html: `
<ul>
<li><b>三个前顶点可以任意指定</b>（上半平面的自同构有三个实参数），其余的由多边形形状决定（参数问题，一般需数值求解）。所以<b>任何三角形</b>都可取 $x_k=-1,0,1$——拖动左图的前顶点，三角形只会相似变化。</li>
<li>四边形及以上：前顶点的位置会<b>改变形状</b>。拖动“矩形”的前顶点，长宽比随之变化（$\\frac{K'}{2K}$，$K$ 为第一类完全椭圆积分）。</li>
<li>也可以让某个顶点对应 $z=\\infty$：此时公式中略去这一因子；该顶点的内角 $\\alpha_\\infty\\pi$ 满足 $\\sum_{k}(\\alpha_k-1)+(\\alpha_\\infty-1)=-2$。</li>
<li>$\\alpha_k=0$ 表示顶点在 $\\infty$ 处、两边平行（如带形，$\\log z$）；$\\alpha_k<0$ 表示两边在 $\\infty$ 处“相交”。</li>
</ul>` },
      { title: '经典例子', tag: '例', wide: true, html: `
<table>
<tr><th>区域</th><th>前顶点与内角</th><th>映射</th></tr>
<tr><td>角形域 $0<\\arg w<\\alpha\\pi$</td><td>$x_1=0$，$\\alpha$</td><td>$w=z^{\\alpha}$</td></tr>
<tr><td>带形 $0<\\operatorname{Im}w<\\pi$</td><td>$x_1=0$，$\\alpha_1=0$</td><td>$w=\\log z$</td></tr>
<tr><td>半带形 $|\\operatorname{Re}w|<\\frac\\pi2,\\ \\operatorname{Im}w>0$</td><td>$\\pm1$，各 $\\frac12$</td><td>$w=\\displaystyle\\int_0^z\\frac{d\\zeta}{\\sqrt{1-\\zeta^2}}=\\arcsin z$</td></tr>
<tr><td>矩形</td><td>$\\pm1,\\pm\\frac1k$，各 $\\frac12$</td><td>$w=\\displaystyle\\int_0^z\\frac{d\\zeta}{\\sqrt{(1-\\zeta^2)(1-k^2\\zeta^2)}}$（椭圆积分）</td></tr>
<tr><td>三角形</td><td>$0,1,\\infty$，$\\alpha,\\beta,\\gamma$</td><td>$w=\\displaystyle\\int_0^z\\zeta^{\\alpha-1}(1-\\zeta)^{\\beta-1}d\\zeta$（不完全 Beta 函数）</td></tr>
<tr><td>圆盘 → 正 $n$ 边形</td><td>$n$ 次单位根</td><td>$w=\\displaystyle\\int_0^z\\frac{d\\zeta}{(1-\\zeta^n)^{2/n}}$</td></tr>
</table>` },
    ]);
  },
  show() { api?.redraw(); },
};

function mountSC(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>z</b>：上半平面与前顶点 x_k' });
  const wv = new PlaneView(b2, { title: '<b>w = f(z)</b>：多边形' });
  zv.setHome(0, 1.5, 3.4); wv.setHome(0, 0, 1.8);
  const source = new SourcePlane(zv), image = new SampledLayer(wv);
  source.setMap(IDENTITY_MAP);
  source.pattern.lines = image.pattern.lines = false;
  const s = { pi: 0, xs: [], al: [], n: 5, grid: true, fill: true };
  let geo = null, sourceKey = null, fit = false;
  const sourceGrid = new CurveLayer(), imageGrid = new CurveLayer();
  const sourceBoundary = new CurveLayer(), imageBoundary = new CurveLayer();
  const scheduler = scheduleGeometry(computeNow);
  const col = (i) => BCOL[i % BCOL.length];

  function gridCurves(side) {
    return geo.lines.map((L) => {
      const style = { color: L.family ? 'rgba(255,213,79,0.65)' : 'rgba(92,200,255,0.65)', width: 1, casing: false };
      if (side === 'z' && !geo.disk) {
        const p = L.point(L.t0);
        return L.family ? { kind: 'line', origin: p, direction: K.ONE, style }
          : { kind: 'line', origin: K.C(p.re), direction: K.I, range: [0, Infinity], style };
      }
      return { point: side === 'z' ? L.point : L.image, t0: L.t0, t1: L.t1,
        options: { samples: geo.quality.samples, flatness: geo.quality.flatness }, style };
    });
  }
  zv.overlays.push((ctx, v) => {
    if (!geo) return;
    if (s.grid) sourceGrid.draw(ctx, v);
    sourceBoundary.draw(ctx, v);
    if (geo.disk) for (let k = 0; k < s.n; k++) dot(ctx, v, K.cis(2 * Math.PI * k / s.n), col(k), 5);
  });
  wv.overlays.push((ctx, v) => {
    if (!geo) return;
    if (s.grid) imageGrid.draw(ctx, v);
    imageBoundary.draw(ctx, v);
    const vertices = geo.vertices.map((w, k) => [w, geo.disk ? `w${k + 1}` : `w${k + 1} (${ANGLE(s.al[k])})`]);
    if (!geo.disk && geo.S.alInf > 0 && Math.abs(geo.S.alInf - 1) > 1e-6) vertices.push([geo.infinity, `f(∞) (${ANGLE(geo.S.alInf)})`]);
    vertices.forEach(([w, text], k) => {
      if (!K.isFin(w)) return;
      dot(ctx, v, w, '#fff', 4.5);
      const [x, y] = v.toScreen(w); label(ctx, x + 8, y - 10, text, k === geo.vertices.length ? '#ff6b9a' : '#fff');
    });
  });

  const preSel = select({ label: '多边形', options: PRE.map((p, i) => ({ value: i, label: p.name })), value: 0, onChange: (v) => load(+v) });
  const sliders = h('div', { class: 'ctl-group', style: 'border:0;padding:0' });
  const nSl = slider({ label: '边数 n', min: 3, max: 10, step: 1, value: s.n, fmt: String, onInput: (x) => { s.n = x; compute(true); } });
  const tG = toggle({ label: '坐标网格的像', value: s.grid, onChange: (x) => { s.grid = x; redraw(); } });
  const tF = toggle({ label: '区域填色', value: s.fill, onChange: (x) => { s.fill = x; source.pattern.fill = image.pattern.fill = x; image.setMesh(x ? geo.mesh : null, geo.chart); redraw(); } });
  const fBox = h('div', { class: 'formula-box' });
  const ro = readouts([['inf', 'z = ∞ 的像'], ['sum', '内角和'], ['side', '边长']]);
  const tip = note('拖动左图实轴上的白色前顶点。每段彩色实轴区间映为同色的边。黄线与蓝线是源坐标网格的像，在区域内部保持正交。两侧棋盘格的填色来自同一个源点，颜色对应。滚轮缩放、拖动空白处平移。');
  panel.append(group('选择', preSel.el, nSl.el, tG.el, tF.el), group('内角 α_k π', sliders), group('公式', fBox), group('读数', ro.el), group('说明', tip));
  renderMath(panel);
  sliders.addEventListener('change', () => compute());
  nSl.input.addEventListener('change', () => compute());

  function redraw() { zv.redraw(); wv.redraw(); }
  function load(i) {
    s.pi = i;
    const p = PRE[i];
    nSl.el.hidden = !p.disk;
    zv.handles = [];
    sliders.innerHTML = '';
    source.setSource({ mask: p.disk ? 'dot(z, z) < 1.0' : 'z.y > 0.0' });
    if (p.disk) {
      zv.titleEl.innerHTML = '<b>z</b>：单位圆盘，前顶点为 n 次单位根';
      zv.setHome(0, 0, 1.3);
      source.pattern.grid = image.pattern.grid = 'polar';
      sliders.append(note('正 n 边形的每个内角都是 (1 − 2/n)π。'));
    } else {
      zv.titleEl.innerHTML = '<b>z</b>：上半平面与前顶点 x_k';
      s.xs = [...p.xs]; s.al = [...p.al];
      source.pattern.grid = image.pattern.grid = 'cart';
      zv.setHome(0, 1.5, Math.max(3.4, Math.max(...s.xs.map(Math.abs)) * 1.3));
      s.xs.forEach((_, k) => {
        zv.handles.push({ color: '#fff', r: 7, label: () => `x${k + 1}`, pos: () => K.C(s.xs[k]), move: (z) => {
          const lo = k > 0 ? s.xs[k - 1] + 0.05 : -1e3, hi = k < s.xs.length - 1 ? s.xs[k + 1] - 0.05 : 1e3;
          s.xs[k] = Math.min(hi, Math.max(lo, z.re)); compute(true);
        }, release: () => compute() });
        sliders.append(slider({ label: `α${k + 1}（前顶点 x${k + 1}）`, min: 0, max: 2, step: 1 / 120, value: s.al[k],
          fmt: (x) => `${num(x, 3)} · π = ${ANGLE(x)}`, onInput: (x) => { s.al[k] = x; compute(true); } }).el);
      });
    }
    renderMath(sliders);
    fit = true;
    compute();
  }
  function compute(interactive = false) {
    if (interactive) scheduler.request();
    else scheduler.finish();
  }
  function computeNow(interactive) {
    const p = PRE[s.pi], quality = interactive ? QUALITY.interactive : QUALITY.settled;
    geo = p.disk ? diskGeometry(s.n, quality) : halfPlaneGeometry(s.xs, s.al, quality);
    if (sourceKey !== geo.sourceKey) {
      sourceGrid.setCurves(gridCurves('z'));
      sourceKey = geo.sourceKey;
    }
    imageGrid.setCurves(gridCurves('w'));
    sourceBoundary.setCurves(geo.disk ? [{ kind: 'circle', center: K.ZERO, radius: 1, style: { color: '#ffb454', width: 3 } }]
      : Array.from({ length: s.xs.length + 1 }, (_, k) => {
        const style = { color: col(k), width: 3.4 };
        if (k === 0) return { kind: 'line', origin: K.C(s.xs[0]), direction: K.ONE, range: [-Infinity, 0], style };
        if (k === s.xs.length) return { kind: 'line', origin: K.C(s.xs[k - 1]), direction: K.ONE, range: [0, Infinity], style };
        return { kind: 'line', origin: K.C(s.xs[k - 1]), direction: K.C(s.xs[k] - s.xs[k - 1]), range: [0, 1], style };
      }));
    imageBoundary.setCurves(geo.boundary.map(({ a, b, origin, direction }, k) => {
      const style = { color: geo.disk ? '#ffb454' : col(k), width: 3.4 };
      if (K.isFin(a) && K.isFin(b)) return { kind: 'line', origin: a, direction: K.sub(b, a), range: [0, 1], style };
      if (K.isFin(a)) return { kind: 'line', origin: a, direction, range: [0, Infinity], style };
      if (K.isFin(b)) return { kind: 'line', origin: b, direction: K.neg(direction), range: [0, Infinity], style };
      return { kind: 'line', origin, direction, style };
    }));
    image.uniforms = { u_chart: geo.chartUniform };
    image.setMesh(s.fill ? geo.mesh : null, geo.chart);
    // KaTeX 与读数不参与拖动中的几何计算，结束后按最终参数更新。
    if (interactive) { redraw(); return; }
    if (p.disk) {
      setTex(fBox, `f(z)=\\int_0^z\\frac{d\\zeta}{(1-\\zeta^{${s.n}})^{2/${s.n}}}`, true);
      if (fit) wv.setHome(0, 0, 2);
      ro.set('inf', '—'); ro.set('sum', `${s.n} × ${ANGLE(1 - 2 / s.n)} = ${ANGLE(s.n - 2)}`);
    } else {
      const ai = geo.S.alInf;
      const fac = s.xs.map((x, j) => {
        const b = s.al[j] - 1; if (Math.abs(b) < 1e-9) return '';
        const base = Math.abs(x) < 1e-9 ? '\\zeta' : `(\\zeta${x < 0 ? '+' : '-'}${num(Math.abs(x), 2)})`;
        return `${base}^{${num(b, 3)}}`;
      }).join('');
      setTex(fBox, `f(z)=A\\int^z ${fac || '1'}\\,d\\zeta+B`, true);
      ro.set('inf', Math.abs(ai - 1) < 1e-6 ? '边上的普通点（α∞ = 1）' : ai <= 0 ? `无穷远（α∞ = ${num(ai, 3)}）` : `顶点 f(∞)，内角 ${ANGLE(ai)}`);
      ro.set('sum', ANGLE(s.al.reduce((a, b) => a + b, 0) + (Math.abs(ai - 1) < 1e-6 ? 0 : ai)));
      if (fit) {
        let points = [...geo.vertices, geo.infinity].filter(K.isFin);
        if (points.length < 2) points = [K.C(geo.S.c, geo.S.L), K.C(geo.S.c - geo.S.L, geo.S.L), K.C(geo.S.c + geo.S.L, geo.S.L), K.C(geo.S.c, 3 * geo.S.L)].map(geo.evaluate);
        const X = points.map((w) => w.re), Y = points.map((w) => w.im);
        const x0 = Math.min(...X), x1 = Math.max(...X), y0 = Math.min(...Y), y1 = Math.max(...Y);
        wv.setHome((x0 + x1) / 2, (y0 + y1) / 2, Math.max(0.5, 0.7 * Math.max(x1 - x0, y1 - y0)));
      }
    }
    const edges = geo.boundary.filter(({ a, b }) => K.isFin(a) && K.isFin(b));
    ro.set('side', edges.length ? edges.map(({ a, b }) => num(K.dist(a, b), 3)).join('，') : '无界边');
    fit = false;
    redraw();
  }
  load(0);
  return { redraw };
}
