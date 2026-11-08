// 第 3 章 · 标签 1：关于圆的反演——对称点的作图、过对称点的正交圆族
import * as K from '../../core/complex.js';
import { h, group, readouts, note, toggle, setTex, renderMath } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { reflect } from '../../core/circle.js';
import { dot } from '../../core/draw.js';
import { cx, num } from '../../core/format.js';
import { COL, gammaOf, gammaHandles, drawGC, seg, rightMark, tag, pencilGC } from './common.js';

export function mountPoints(stage, panel) {
  const box = h('div'); stage.append(box);
  const v = new PlaneView(box, { title: '关于圆 Γ 的反演：$P\\mapsto P^*$', unitCircle: false, background: '#000' });
  renderMath(box);
  v.setHome(0.3, 0, 2.6);
  const s = { O: K.C(0), rp: K.polar(1.2, -2.3), P: K.C(1.9, 0.8), build: true, pencil: true };
  const G = () => gammaOf(s);

  // P 在 Γ 外时作切线，切点连线交 OP 于 P*；P 在 Γ 内时反过来
  function construction(ctx, g, P, Ps) {
    const dP = K.dist(P, g.c), dS = K.dist(Ps, g.c);
    if (!K.isFin(Ps) || dP < 1e-6 || Math.abs(dP - g.r) < 1e-3 * g.r) return;
    const [E, I] = dP > dS ? [P, Ps] : [Ps, P];
    const phi = K.arg(K.sub(E, g.c)), al = Math.acos(Math.min(1, K.dist(I, g.c) / g.r));
    const T1 = K.add(g.c, K.polar(g.r, phi + al)), T2 = K.add(g.c, K.polar(g.r, phi - al));
    const st = { color: 'rgba(255,180,84,0.9)', width: 1.4 };
    seg(ctx, v, E, T1, st); seg(ctx, v, E, T2, st);
    seg(ctx, v, T1, T2, { color: 'rgba(255,255,255,0.8)', width: 1.3 });
    seg(ctx, v, g.c, T1, { color: COL.gamma, width: 1.4 });
    rightMark(ctx, v, T1, g.c, E, '#ffb454');
    rightMark(ctx, v, I, g.c, T1, '#ffffff');
    dot(ctx, v, T1, '#ffb454', 3.5); dot(ctx, v, T2, '#ffb454', 3.5);
    tag(ctx, v, T1, 'T', '#ffb454');
  }
  v.overlays.push((ctx) => {
    const g = G(), Ps = reflect(g, s.P);
    if (s.pencil) for (const C of pencilGC(s.P, Ps)) drawGC(ctx, v, C, { color: 'rgba(110,231,168,0.55)', width: 1.2, casing: false });
    drawGC(ctx, v, g, { color: COL.gamma, width: 2.6 });
    if (K.isFin(Ps)) {
      const far = K.dist(s.P, g.c) > K.dist(Ps, g.c) ? s.P : Ps;
      seg(ctx, v, g.c, K.add(g.c, K.scale(K.sub(far, g.c), 1.3)), { color: 'rgba(255,255,255,0.55)', width: 1.2, dash: [5, 4] });
    }
    if (s.build) construction(ctx, g, s.P, Ps);
    dot(ctx, v, Ps, COL.q, 5.5);
    tag(ctx, v, Ps, 'P*', COL.q);
    if (!K.isFin(Ps)) tag(ctx, v, s.P, 'P* = ∞', COL.q, 10, 14);
    tag(ctx, v, K.add(g.c, K.polar(g.r, 2.2)), 'Γ', COL.gamma, 4, -4);
  });
  v.handles.push(...gammaHandles(s, update), { color: COL.p, r: 7, label: 'P', pos: () => s.P, move: (z) => { s.P = z; update(); } });

  const tB = toggle({ label: '作图（切线）', value: s.build, onChange: (x) => { s.build = x; v.redraw(); } });
  const tP = toggle({ label: '过 P、P* 的圆', value: s.pencil, onChange: (x) => { s.pencil = x; v.redraw(); } });
  const fBox = h('div', { class: 'formula-box' });
  setTex(fBox, 'P^*=O+\\dfrac{R^2}{\\overline{P-O}},\\qquad |OP|\\cdot|OP^*|=R^2', true);
  const ro = readouts([['R', 'R²'], ['a', '|OP|'], ['b', '|OP*|'], ['ab', '|OP|·|OP*|'], ['Ps', 'P*']]);
  const at = (t) => () => { const g = G(); s.P = K.add(g.c, K.polar(g.r * t, 0.6)); update(); };
  const chips = h('div', { class: 'chips' }, ...[['Γ 外', 1.6], ['Γ 内', 0.55], ['Γ 上', 1], ['靠近 O', 0.12]].map(([t, k]) => h('span', { class: 'chip', onclick: at(k) }, t)));
  panel.append(
    group('设置', h('div', { class: 'toggles' }, tB.el, tP.el)),
    group('把 P 移到', chips),
    group('定义', fBox, ro.el),
    group('观察', note(`
<b>作图</b>：P 在 Γ 外时作切线 PT，过 T 作 OP 的垂线，垂足就是 P*。两个直角三角形相似，$\\frac{|OP^*|}{R}=\\frac{R}{|OP|}$。<br>
<b>一眼可见</b>：Γ 上的点不动；内外互换；$O\\leftrightarrow\\infty$；反演两次回到原处。<br>
<b>对称</b>：绿色的圆都过 P 与 P*，而且全部与 Γ 正交。反过来，过两点的圆都与 Γ 正交，这两点就关于 Γ 对称。直线的镜面对称是 $R\\to\\infty$ 的特例。`)),
  );
  renderMath(panel);

  function update() {
    const g = G(), Ps = reflect(g, s.P), a = K.dist(s.P, g.c), b = K.dist(Ps, g.c);
    ro.set('R', num(g.r * g.r));
    ro.set('a', num(a)); ro.set('b', num(b));
    ro.set('ab', K.isFin(Ps) ? num(a * b) : '—');
    ro.set('Ps', cx(Ps));
    v.redraw();
  }
  update();
  return {};
}
