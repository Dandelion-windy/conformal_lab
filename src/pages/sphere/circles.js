// 黎曼球面 · 标签 2：圆 ↔ 圆（直线 ↔ 过 N 的圆），球极投影保角
import { C, add, sub, scale, abs, dist, arg } from '../../core/complex.js';
import { h, segmented, group, readouts, note, renderMath, select } from '../../core/ui.js';
import { SphereView } from '../../core/sphere3d.js';
import { renderer } from '../../core/gl.js';
import { sphereShader } from '../../core/sphere-shader.js';
import { vsub, vdot, vnorm, vcross } from '../../core/vec3.js';
import { num, deg } from '../../core/format.js';
import { applyConv } from './projection.js';

const flat = (z) => [z.re, z.im, 0];
// 直线 a + t(b−a)，t = tan(s) 覆盖整条直线（含 ∞）
function linePts(a, b, n = 400) {
  const d = sub(b, a), out = [];
  for (let i = 0; i <= n; i++) {
    const s = -Math.PI / 2 + (Math.PI * i) / n;
    out.push(Math.abs(Math.cos(s)) < 1e-9 ? null : add(a, scale(d, Math.tan(s))));
  }
  return out;
}
const circ = (c, r, n = 200) => { const o = []; for (let i = 0; i <= n; i++) o.push(add(c, scale(C(Math.cos((2 * Math.PI * i) / n), Math.sin((2 * Math.PI * i) / n)), r))); return o; };

export function mountCircles(stage, panel) {
  const box = h('div'); stage.append(box);
  const sv = new SphereView(box, { title: '平面上的圆/直线 ↔ 球面上的圆', plane: true, planeR: 3.6, sAlpha: 0.55, pAlpha: 0.9 });
  sv.prog = renderer().program(sphereShader('z'));
  sv.uniforms = { u_colorMode: 4, u_bright: 1, u_lines: 1, u_lineStep: 0.5 };
  const s = { mode: 'circle', conv: 'eq', c0: C(0.9, 0.6), p0: C(1.9, 0.6), a: C(-1.5, -0.5), b: C(1.2, 1.4), v: C(0.6, -0.4), d1: C(1.8, 0.2), d2: C(1.0, 1.0) };
  applyConv(sv, s.conv);
  sv.cam.pitch = 0.55;
  const N = () => [sv.S.c[0], sv.S.c[1], sv.S.c[2] + sv.S.r];
  const toS = (pts) => pts.map((z) => (z ? sv.toSphere(z) : N()));
  const inPlane = (pts) => pts.filter((z) => z && abs(z) < 3.6 * 0.995);
  sv.overlays.push((ctx) => {
    if (s.mode === 'circle') {
      const r = dist(s.c0, s.p0), pts = circ(s.c0, r);
      for (let k = 0; k < 12; k++) {
        const z = pts[Math.round((k * 200) / 12)], seg = [];
        for (let i = 0; i <= 30; i++) seg.push([N()[0] + (z.re - N()[0]) * i / 30, N()[1] + (z.im - N()[1]) * i / 30, N()[2] * (1 - i / 30)]);
        sv.curve(ctx, seg, { color: 'rgba(255,180,84,0.55)', width: 0.9, casing: false, hiddenAlpha: 0.25 });
      }
      sv.curve(ctx, pts.map(flat), { color: '#ffb454', width: 2.6 });
      sv.curve(ctx, toS(pts), { color: '#ffb454', width: 2.6 });
    } else if (s.mode === 'line') {
      const pts = linePts(s.a, s.b);
      sv.curve(ctx, inPlane(pts).map(flat), { color: '#5cc8ff', width: 2.6 });
      sv.curve(ctx, toS(pts), { color: '#5cc8ff', width: 2.6 });
      sv.point(ctx, N(), '#ffffff', 5, 'N（直线上的 ∞）');
    } else {
      const L1 = linePts(s.v, s.d1), L2 = linePts(s.v, s.d2);
      sv.curve(ctx, inPlane(L1).map(flat), { color: '#ff6b9a', width: 2.4 });
      sv.curve(ctx, inPlane(L2).map(flat), { color: '#5cc8ff', width: 2.4 });
      sv.curve(ctx, toS(L1), { color: '#ff6b9a', width: 2.4 });
      sv.curve(ctx, toS(L2), { color: '#5cc8ff', width: 2.4 });
      sv.point(ctx, sv.toSphere(s.v), '#ffffff', 5, 'P');
      sv.point(ctx, N(), '#ffffff', 5, 'N');
    }
  });
  const H = (key, color, label, mode) => ({ kind: 'plane', color, label, r: 6, hidden: () => !mode.includes(s.mode), pos: () => s[key], move: (z) => { s[key] = z; update(); } });
  sv.handles.push(H('c0', '#ffb454', '圆心', ['circle']), H('p0', '#ffd27a', '', ['circle']), H('a', '#5cc8ff', 'A', ['line']), H('b', '#5cc8ff', 'B', ['line']),
    H('v', '#ffffff', 'z₀', ['angle']), H('d1', '#ff6b9a', '', ['angle']), H('d2', '#5cc8ff', '', ['angle']));

  const modeSeg = segmented({ label: '对象', options: [{ value: 'circle', label: '圆' }, { value: 'line', label: '直线' }, { value: 'angle', label: '两直线夹角' }], value: s.mode, onChange: (v) => { s.mode = v; update(); } });
  const convSel = select({ label: '球面', options: [{ value: 'eq', label: '单位球（赤道平面）' }, { value: 'tan', label: '切于原点（直径 1）' }], value: s.conv, onChange: (v) => { s.conv = v; applyConv(sv, v); update(); } });
  const ro = readouts([['a', '平面上'], ['b', '球面上'], ['c', '说明']]);
  const tip = note('');
  panel.append(group('设置', modeSeg.el, convSel.el), group('读数', ro.el), group('观察', tip));
  renderMath(panel);

  // 在球面上的切向量：沿平面方向 d 对逆投影求方向导数
  const tangent = (z, d) => vnorm(vsub(sv.toSphere(add(z, scale(d, 1e-5))), sv.toSphere(sub(z, scale(d, 1e-5)))));
  const angle3 = (u, v) => Math.acos(Math.max(-1, Math.min(1, vdot(u, v))));
  function update() {
    if (s.mode === 'circle') {
      const r = dist(s.c0, s.p0), pts = circ(s.c0, r, 60).map((z) => sv.toSphere(z));
      // 检验共面：取三点定平面，计算其余点到该平面的最大距离
      const n = vnorm(vcross(vsub(pts[20], pts[0]), vsub(pts[40], pts[0])));
      const dev = Math.max(...pts.map((P) => Math.abs(vdot(vsub(P, pts[0]), n))));
      ro.set('a', `圆心 ${num(s.c0.re)}${s.c0.im < 0 ? '−' : '+'}${num(Math.abs(s.c0.im))}i，半径 ${num(r)}`);
      ro.set('b', `像点共面，偏离平面 ≤ ${dev.toExponential(1)}`);
      ro.set('c', abs(s.c0) < r ? '圆包含原点：像圆包围南极 S' : '圆不含原点');
      tip.innerHTML = '球面上的像（橙色）与平面上的圆一样是圆：它是球面与某个平面的交线。淡橙色的线是从 N 出发穿过圆周的投影线，组成一个斜圆锥。把圆拖得经过原点或变得很大，观察像圆的位置变化。';
    } else if (s.mode === 'line') {
      ro.set('a', '直线 AB（两端延伸到 ∞）');
      ro.set('b', '经过北极 N 的圆');
      ro.set('c', '平面上所有直线的像都经过 N');
      tip.innerHTML = '在扩充复平面中，<b>直线 = 经过 ∞ 的圆</b>。这就是为什么分式线性变换的“保圆性”可以把直线和圆统一起来叙述。两条平行线的像在 N 处相切（它们只在 ∞ 处“相交”一次）。';
    } else {
      const d1 = sub(s.d1, s.v), d2 = sub(s.d2, s.v);
      let a = Math.abs(arg(d2) - arg(d1)); if (a > Math.PI) a = 2 * Math.PI - a;
      const t1 = tangent(s.v, d1), t2 = tangent(s.v, d2);
      const aP = angle3(t1, t2);
      // 在 N 处的夹角：沿直线趋于 ∞ 时的切向量
      const far = 1e4, w1 = add(s.v, scale(d1, far / abs(d1))), w2 = add(s.v, scale(d2, far / abs(d2)));
      const n1 = vnorm(vsub(sv.toSphere(w1), N())), n2 = vnorm(vsub(sv.toSphere(w2), N()));
      const aN = angle3(n1, n2);
      ro.set('a', `夹角 ${deg(a)}`);
      ro.set('b', `在 P 处 ${deg(aP)}，在 N 处 ${deg(aN)}`);
      ro.set('c', '球极投影保角');
      tip.innerHTML = '两条直线的像是两个都经过 N 的圆，它们在 P（对应 z₀）与 N（对应 ∞）两处相交，<b>两处的夹角都等于原来的夹角</b>。这说明球极投影是共形的，也说明在 ∞ 处讨论“两条曲线的夹角”是有意义的。';
    }
    sv.redraw();
  }
  update();
  return {};
}
