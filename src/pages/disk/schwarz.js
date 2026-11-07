// 第 8 章 · 标签 2：施瓦茨引理与施瓦茨–皮克引理
import * as K from '../../core/complex.js';
import { h, slider, group, readouts, note, setTex, renderMath, select } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { DomainMesh } from '../../core/mesh.js';
import { compile } from '../../core/compile.js';
import { mapCurve, circlePts } from '../../core/mapcurve.js';
import { strokePath, dot, label } from '../../core/draw.js';
import { num } from '../../core/format.js';

const FNS = [
  { e: 'z^2', t: 'f(z)=z^2' },
  { e: 'z*(z-a)/(1-conj(a)*z)', t: 'f(z)=z\\cdot\\dfrac{z-a}{1-\\bar a z}', a: true },
  { e: '(z+z^2)/2', t: 'f(z)=\\tfrac12(z+z^2)' },
  { e: 'z*exp(z-1)', t: 'f(z)=z\\,e^{z-1}' },
  { e: 'z*(z+a)/2', t: 'f(z)=\\tfrac12 z(z+a),\\ |a|\\le1', a: true },
  { e: 'exp(i*t)*z', t: 'f(z)=e^{it}z\\ （等号情形：旋转）', t1: true },
  { e: 'sin(z)/2', t: 'f(z)=\\tfrac12\\sin z' },
];

export function mountSchwarz(stage, panel) {
  const b1 = h('div'), b2 = h('div'); stage.append(b1, b2);
  const zv = new PlaneView(b1, { title: '<b>z</b>：|z| &lt; 1，圆周 |z| = r', unitCircle: true });
  const wv = new PlaneView(b2, { title: '<b>w = f(z)</b>：f(0) = 0，|f| &lt; 1', unitCircle: true });
  zv.setHome(0, 0, 1.25); wv.setHome(0, 0, 1.25);
  const s = { i: 0, r: 0.7, a: K.C(0.5, 0.3), t: 0.8, p: K.C(0.3, 0.4), q: K.C(-0.5, 0.1) };
  let fn = compile(FNS[0].e);
  const P = () => ({ a: s.a, t: K.C(s.t) });
  const f = (z) => fn.js(z, P());
  const zMesh = new DomainMesh(90, 90, [6, 20]), wMesh = new DomainMesh(90, 90, [6, 20]);
  const param = (u, v) => K.polar(u * 0.999, 2 * Math.PI * v);
  zMesh.setDomain(param); wMesh.setDomain(param);
  const Z = zMesh.map(); zMesh.setGeometry(Z.pos, Z.tris);
  zv.glLayers.push((r, v, dpr) => zMesh.draw(r, v, dpr, { alpha: 0.45 }));
  wv.glLayers.push((r, v, dpr) => wMesh.draw(r, v, dpr, { alpha: 0.6 }));
  const pd = (p, q) => K.abs(K.div(K.sub(p, q), K.sub(K.ONE, K.mul(K.conj(p), q))));
  zv.overlays.push((ctx, v) => {
    strokePath(ctx, v, circlePts(K.ZERO, s.r, 200), { color: '#ffb454', width: 2.6 });
    dot(ctx, v, s.p, '#ff6b9a', 4.5); dot(ctx, v, s.q, '#6ee7a8', 4.5);
  });
  wv.overlays.push((ctx, v) => {
    const proj = (w) => v.toScreen(w), o = { W: v.W, H: v.H };
    strokePath(ctx, v, circlePts(K.ZERO, s.r, 200), { color: '#ffb454', width: 1.6, dash: [6, 5] });
    strokePath(ctx, v, mapCurve(f, circlePts(K.ZERO, s.r, 400), proj, o), { color: '#ffb454', width: 2.6 });
    for (const [z, t, c] of [[s.p, 'f(p)', '#ff6b9a'], [s.q, 'f(q)', '#6ee7a8']]) { const w = f(z); dot(ctx, v, w, c, 4.5); const [x, y] = v.toScreen(w); label(ctx, x + 7, y - 9, t, c); }
    const [x, y] = v.toScreen(K.C(s.r * Math.SQRT1_2, s.r * Math.SQRT1_2));
    label(ctx, x + 6, y - 6, '|w| = r', '#ffb454');
  });
  const mkH = (key, color, lab, lim, vis = () => true) => ({ color, r: 6, label: lab, hidden: () => !vis(), pos: () => s[key], move: (z) => { s[key] = K.abs(z) > lim ? K.scale(z, lim / K.abs(z)) : z; update(); } });
  zv.handles.push(mkH('p', '#ff6b9a', 'p', 0.98), mkH('q', '#6ee7a8', 'q', 0.98), mkH('a', '#5cc8ff', 'a', 1, () => !!FNS[s.i].a));
  const sel = select({ label: '函数（都满足 f(0)=0，f(D)⊂D）', options: FNS.map((q, i) => ({ value: i, label: q.e })), value: 0, onChange: (v) => { s.i = +v; fn = compile(FNS[s.i].e); tSl.el.hidden = !FNS[s.i].t1; update(); } });
  const rSl = slider({ label: '圆周半径 r', min: 0.05, max: 0.99, value: s.r, onInput: (x) => { s.r = x; update(); } });
  const tSl = slider({ label: 't', min: -Math.PI, max: Math.PI, value: s.t, onInput: (x) => { s.t = x; update(); } });
  tSl.el.hidden = true;
  const fBox = h('div', { class: 'formula-box' });
  const ro = readouts([['m', 'max|f| 在 |z|=r'], ['ratio', 'max|f(z)/z|'], ['d0', "|f′(0)|"], ['pk', 'Schwarz–Pick'], ['eq', '等号']]);
  panel.append(
    group('函数', sel.el, tSl.el, fBox, rSl.el),
    group('读数', ro.el),
    group('观察', note('橙色实线是圆周 $|z|=r$ 的像，它总落在虚线圆 $|w|=r$ 之内：这就是 $|f(z)|\\le|z|$。拖动 p、q 验证 Schwarz–Pick 引理：伪双曲距离不增。只有选“旋转”时等号成立。')),
  );
  renderMath(panel);
  function update() {
    setTex(fBox, FNS[s.i].t, true);
    const B = wMesh.map(f); wMesh.setGeometry(B.pos, B.tris);
    let m = 0, ratio = 0;
    for (let k = 0; k < 360; k++) {
      const z = K.polar(s.r, (k * Math.PI) / 180), w = f(z);
      m = Math.max(m, K.abs(w));
      for (const rr of [0.2, 0.5, 0.8, 0.98]) ratio = Math.max(ratio, K.abs(f(K.polar(rr, (k * Math.PI) / 180))) / rr);
    }
    const d0 = K.abs(K.deriv(f, K.ZERO));
    ro.set('m', `${num(m, 4)} ${m <= s.r + 1e-9 ? '≤' : '>'} r = ${num(s.r, 3)}`);
    ro.set('ratio', `${num(ratio, 4)} ≤ 1`);
    ro.set('d0', `${num(d0, 4)} ≤ 1`);
    const before = pd(s.p, s.q), after = pd(f(s.p), f(s.q));
    ro.set('pk', `ρ(f p, f q) = ${num(after, 4)} ≤ ρ(p, q) = ${num(before, 4)}`);
    ro.set('eq', Math.abs(d0 - 1) < 1e-6 ? '<span class="c-green">|f′(0)| = 1：f 是旋转</span>' : '严格不等');
    zv.redraw(); wv.redraw();
  }
  update();
  return {};
}
