// 第 3 章 · 标签 2：圆与直线的像——特殊位置、几何上的理由、保对称性
import * as K from '../../core/complex.js';
import { h, select, segmented, button, group, readouts, note, renderMath } from '../../core/ui.js';
import { PlaneView } from '../../core/view2d.js';
import { reflect, invertGC } from '../../core/circle.js';
import { dot } from '../../core/draw.js';
import { num, deg } from '../../core/format.js';
import { COL, gammaOf, gammaHandles, drawGC, seg, fullLine, rightMark, tag, pencilGC, describeGC } from './common.js';

const unit = (z) => K.scale(z, 1 / (K.abs(z) || 1));
const diam = (O, A) => ({ line: false, c: K.lerp(O, A, 0.5), r: K.dist(O, A) / 2 });
const onC = (C, t) => K.add(C.c, K.polar(C.r, t));
const onL = (L, u) => K.add(L.p, K.scale(L.d, u));

const PRE = [
  { id: 'gen', name: '一般的圆 → 圆', def: { c: K.C(1.5, 0.7), cr: K.C(2.05, 0.7), D: K.C(1.6, 0.95) },
    tip: '过 O 的直线交 C 于 P、Q，$|OP|\\cdot|OQ|=k$ 与直线无关（O 对 C 的幂）。所以 $P^*=O+\\frac{R^2}{k}(Q-O)$：$C^*$ 就是 C 以 O 为中心、比为 $R^2/k$ 的位似像。<br>注意 $c^*$ 不是 $C^*$ 的圆心（蓝色小点才是）：c 与 ∞ 关于 C 对称，所以 $c^*$ 与 O 关于 $C^*$ 对称。' },
  { id: 'thru', name: '过 O 的圆 → 直线', def: { A: K.C(0.7, 0.55), t: 2.6 },
    tip: '$\\angle OPA=90^\\circ$（直径所对的圆周角）。$|OP|\\cdot|OP^*|=|OA|\\cdot|OA^*|=R^2$ ⟹ $\\triangle OPA\\sim\\triangle OA^*P^*$ ⟹ $\\angle OA^*P^*=90^\\circ$。所以 $P^*$ 总在过 $A^*$、垂直于 OA 的直线上；O 本身 ↦ ∞。' },
  { id: 'line', name: '不过 O 的直线 → 过 O 的圆', def: { F: K.C(1.7, -0.45), u: 1.0 },
    tip: '上一种反过来看（反演做两次回到原处）。F 是 O 到直线的垂足，像是以 $OF^*$ 为直径的圆；直线上的 ∞ ↦ O，所以像圆过 O。' },
  { id: 'lineO', name: '过 O 的直线 → 自身', def: { D: K.C(1.6, 0.8), u: 0.5 },
    tip: '射线上的点仍在这条射线上，只是 $|OP|\\mapsto R^2/|OP|$：Γ 内的一段与 Γ 外的一段互换，直线整体不变。' },
  { id: 'conc', name: '与 Γ 同心的圆 → 同心圆', def: { rc: K.C(0.55, 0.3), t: 0.5 },
    tip: '半径 $r\\mapsto R^2/r$。以 O 为中心的同心圆与射线组成的网格整体不变，只是内外翻转。' },
  { id: 'orth', name: '与 Γ 正交的圆 → 自身', def: { oc: K.C(1.7, 0.7), D: K.C(1.5, 0.35) },
    tip: 'C ⊥ Γ ⟺ 交点 T 处两条半径垂直 ⟺ OT 与 C 相切且 $|OT|=R$ ⟹ O 对 C 的幂是 $R^2$。过 O 的直线交 C 于 P、Q 时 $|OP|\\cdot|OQ|=R^2$，即 $Q=P^*$：C 整体不动，Γ 内外两段弧互换。' },
  { id: 'pair', name: '两个过 O 的圆 → 两条直线', def: { A1: K.C(0.6, 0.8), A2: K.C(0.9, -0.45) },
    tip: '两圆在 O 之外还交于 X，像是交于 $X^*$ 的两条直线，夹角不变（反演保角，转向相反）。点“让两圆在 O 相切”：它们只交于 O，像只交于 ∞，是平行线。月牙形 → 带形就是这样来的。' },
];

export function mountCircles(stage, panel) {
  const box = h('div'); stage.append(box);
  const v = new PlaneView(box, { title: '<span class="c-amb">C</span> 与它关于 <span class="c-violet">Γ</span> 的反演像 <span class="c-acc">C*</span>', unitCircle: false, background: '#000' });
  v.setHome(0.4, 0, 2.8);
  const s = { O: K.C(0), rp: K.polar(1.2, -2.3), pre: 0, over: 'proof', z1: K.C(1.0, 1.5), t: 0, u: 0, ...PRE[0].def };
  const G = () => gammaOf(s), f = (z) => reflect(G(), z), P0 = () => PRE[s.pre];
  const srcs = () => {
    const O = s.O;
    switch (P0().id) {
      case 'gen': return [{ line: false, c: s.c, r: K.dist(s.c, s.cr) }];
      case 'thru': return [diam(O, s.A)];
      case 'line': return [{ line: true, p: s.F, d: K.mul(K.dist(s.F, O) > 1e-9 ? unit(K.sub(s.F, O)) : K.ONE, K.I) }];
      case 'lineO': return [{ line: true, p: O, d: unit(K.sub(s.D, O)) }];
      case 'conc': return [{ line: false, c: O, r: K.dist(O, s.rc) }];
      case 'orth': return [{ line: false, c: s.oc, r: Math.sqrt(Math.max(1e-9, K.abs2(K.sub(s.oc, O)) - G().r ** 2)) }];
      default: return [diam(O, s.A1), diam(O, s.A2)];
    }
  };
  const self = () => ['lineO', 'orth'].includes(P0().id);
  // 动点 P：在圆上用角度参数 t，在直线上用参数 u
  const movingP = () => { const [C0] = srcs(); return C0.line ? onL(C0, s.u) : onC(C0, s.t); };
  // 像曲线：能精确算出的就直接画像圆，半径极大时改为逐点映射原曲线
  const drawImg = (ctx, C, style) => {
    const Cs = invertGC(G(), C);
    if (Cs.line || Cs.r < 50) drawGC(ctx, v, Cs, style); else drawGC(ctx, v, C, style, f);
  };
  const ST = {
    ray: { color: 'rgba(255,255,255,0.5)', width: 1.1, dash: [5, 4] },
    a: { color: 'rgba(255,180,84,0.95)', width: 1.4 }, b: { color: 'rgba(92,200,255,0.95)', width: 1.4 },
  };
  // 从 O 出发、经过 X 与 X* 的射线
  const ray = (ctx, X, Xs) => {
    const far = K.dist(X, s.O) > K.dist(Xs, s.O) ? X : Xs;
    if (K.isFin(far)) seg(ctx, v, s.O, K.add(s.O, K.scale(K.sub(far, s.O), 1.25)), ST.ray);
  };
  const pt = (ctx, z, text, color, r = 4.5) => { dot(ctx, v, z, color, r); tag(ctx, v, z, text, color); };
  function proof(ctx) {
    const O = s.O, id = P0().id, [C0] = srcs();
    if (id === 'thru' || id === 'line') {
      // 相似三角形：A 为直径端点（或垂足 F），P 为动点
      const A = id === 'thru' ? s.A : s.F, P = movingP(), As = f(A), Ps = f(P);
      ray(ctx, A, As); ray(ctx, P, Ps);
      seg(ctx, v, A, P, ST.a); seg(ctx, v, As, Ps, ST.b);
      if (id === 'thru') { rightMark(ctx, v, P, O, A, COL.src); rightMark(ctx, v, As, O, Ps, COL.img); }
      else { rightMark(ctx, v, A, O, P, COL.src); rightMark(ctx, v, Ps, O, As, COL.img); }
      pt(ctx, As, id === 'thru' ? 'A*' : 'F*', COL.img); pt(ctx, Ps, 'P*', COL.img);
    } else if (id === 'lineO' || id === 'conc') {
      const P = movingP(), Ps = f(P);
      ray(ctx, P, Ps); pt(ctx, Ps, 'P*', COL.img);
    } else if (id === 'gen' || id === 'orth') {
      // 过 O 的直线 O + t·u 与 C 的交点：t² − 2bt + k = 0，k 为 O 对 C 的幂
      const u = unit(K.sub(s.D, O)), w = K.sub(C0.c, O), b = u.re * w.re + u.im * w.im, k = K.abs2(w) - C0.r ** 2, disc = b * b - k;
      fullLine(ctx, v, O, s.D, ST.ray);
      if (disc > 0) {
        const P = K.add(O, K.scale(u, b - Math.sqrt(disc))), Q = K.add(O, K.scale(u, b + Math.sqrt(disc)));
        pt(ctx, P, 'P', COL.src, 4);
        if (id === 'gen') { pt(ctx, Q, 'Q', COL.src, 4); pt(ctx, f(P), 'P*', COL.img, 4); pt(ctx, f(Q), 'Q*', COL.img, 4); }
        else pt(ctx, Q, 'Q = P*', COL.img, 4);
      }
      pt(ctx, C0.c, 'c', COL.src, 3.5);
      if (id === 'gen') {
        const Cs = invertGC(G(), C0);
        pt(ctx, f(C0.c), 'c*', '#ffffff', 3.5);
        if (!Cs.line) dot(ctx, v, Cs.c, COL.img, 3);
      } else {
        // Γ 与 C 的交点 T：OT ⊥ cT
        const g = G(), phi = K.arg(w), be = Math.acos(Math.min(1, g.r / K.abs(w)));
        for (const sg of [1, -1]) {
          const T = K.add(O, K.polar(g.r, phi + sg * be));
          seg(ctx, v, O, T, { color: COL.gamma, width: 1.4 }); seg(ctx, v, C0.c, T, ST.a);
          rightMark(ctx, v, T, O, C0.c, '#ffffff');
        }
      }
    } else {
      // 两圆的另一个交点 X 是 O 到直线 A₁A₂ 的垂足
      const d = K.sub(s.A2, s.A1), L2 = K.abs2(d);
      if (L2 > 1e-12) {
        const t = ((O.re - s.A1.re) * d.re + (O.im - s.A1.im) * d.im) / L2, X = K.add(s.A1, K.scale(d, t));
        if (K.dist(X, O) > 1e-6) { pt(ctx, X, 'X', COL.src); pt(ctx, f(X), 'X*', COL.img); }
      }
      pt(ctx, f(s.A1), 'A₁*', COL.img, 3.5); pt(ctx, f(s.A2), 'A₂*', COL.img, 3.5);
    }
  }
  // 保对称：z₂ 是 z₁ 关于 C 的对称点；过 z₁、z₂ 的圆族都与 C 正交
  const z2 = () => reflect(srcs()[0], s.z1);
  function symLines(ctx) {
    for (const L of pencilGC(s.z1, z2())) {
      drawGC(ctx, v, L, { color: 'rgba(110,231,168,0.45)', width: 1.1, casing: false });
      drawImg(ctx, L, { color: 'rgba(92,200,255,0.5)', width: 1.1, casing: false });
    }
  }
  function symDots(ctx) {
    const q = z2();
    pt(ctx, q, 'z₂', COL.q); pt(ctx, f(s.z1), 'z₁*', COL.p); pt(ctx, f(q), 'z₂*', COL.q);
  }
  v.overlays.push((ctx) => {
    const L = srcs();
    if (s.over === 'sym') symLines(ctx);
    drawGC(ctx, v, G(), { color: COL.gamma, width: 2.4 });
    for (const C of L) drawGC(ctx, v, C, { color: COL.src, width: 3 });
    for (const C of L) drawImg(ctx, C, { color: COL.img, width: self() ? 2.2 : 3, dash: self() ? [8, 7] : null });
    if (s.over === 'proof') proof(ctx);
    else if (s.over === 'sym') symDots(ctx);
    tag(ctx, v, K.add(s.O, K.polar(G().r, 2.2)), 'Γ', COL.gamma, 4, -4);
  });

  const H = (key, color, lab, ids, move) => ({ color, label: lab, r: 6.5, hidden: () => !ids.includes(P0().id), pos: () => s[key], move: move || ((z) => { s[key] = z; update(); }) });
  const keepOut = (z) => { const g = G(), d = K.sub(z, s.O), L = K.abs(d); s.oc = L > 1.03 * g.r ? z : K.add(s.O, K.scale(d, (1.03 * g.r) / (L || 1))); update(); };
  const moveP = (z) => {
    const [C0] = srcs();
    if (C0.line) s.u = (z.re - C0.p.re) * C0.d.re + (z.im - C0.p.im) * C0.d.im;
    else s.t = K.arg(K.sub(z, C0.c));
    update();
  };
  v.handles.push(...gammaHandles(s, update),
    H('c', COL.src, 'c', ['gen']), H('cr', '#ffd27a', '', ['gen']),
    H('A', COL.src, 'A', ['thru']), H('F', COL.src, 'F', ['line']),
    H('D', COL.src, '', ['lineO']), H('rc', COL.src, '', ['conc']), H('oc', COL.src, 'c', ['orth'], keepOut),
    H('A1', COL.src, 'A₁', ['pair']), H('A2', COL.src, 'A₂', ['pair']),
    { color: '#ffffff', r: 5, hidden: () => s.over !== 'proof' || !['gen', 'orth'].includes(P0().id), pos: () => s.D, move: (z) => { s.D = z; update(); } },
    { color: COL.src, r: 6, label: 'P', hidden: () => s.over !== 'proof' || !['thru', 'line', 'lineO', 'conc'].includes(P0().id), pos: movingP, move: moveP },
    { color: COL.p, r: 6.5, label: 'z₁', hidden: () => s.over !== 'sym', pos: () => s.z1, move: (z) => { s.z1 = z; update(); } },
  );
  const preSel = select({ label: 'C 的位置', options: PRE.map((p, i) => ({ value: i, label: p.name })), value: 0, onChange: (x) => load(+x) });
  const overSeg = segmented({ label: '叠加', options: [{ value: 'proof', label: '为什么' }, { value: 'sym', label: '对称点' }, { value: 'none', label: '无' }], value: s.over, onChange: (x) => { s.over = x; update(); } });
  const tangentBtn = button('让两圆在 O 相切', () => { s.A2 = K.add(s.O, K.scale(K.sub(s.A1, s.O), 0.6)); update(); }, 'small');
  const ro = readouts([['C', 'C'], ['Cs', 'C*'], ['x', '读数'], ['chk', '保对称']]);
  const tip = note('');
  const symTip = note('<b>保对称</b>：$z_1,z_2$ 关于 C 对称 ⟺ 过它们的圆（绿）都与 C 正交。反演保圆、保角，这些圆的像（蓝）都过 $z_1^*,z_2^*$ 且与 $C^*$ 正交，所以 $z_1^*,z_2^*$ 关于 $C^*$ 对称。整个过程不需要计算。', 'good');
  panel.append(
    group('设置', preSel.el, overSeg.el, tangentBtn),
    group('读数', ro.el),
    group('为什么', tip, symTip),
  );
  renderMath(panel);

  function update() {
    const id = P0().id, g = G(), [C0] = srcs(), Cs = invertGC(g, C0);
    ro.set('C', describeGC(C0, s.O));
    ro.set('Cs', describeGC(Cs, s.O));
    let x = '—';
    if (id === 'gen' || id === 'orth') {
      const k = K.abs2(K.sub(C0.c, s.O)) - C0.r ** 2;
      x = `O 对 C 的幂 k = ${num(k)}，R²/k = ${num((g.r * g.r) / k)}`;
    } else if (id === 'thru' || id === 'line') {
      const A = id === 'thru' ? s.A : s.F, n = id === 'thru' ? 'A' : 'F';
      x = `|O${n}|·|O${n}*| = ${num(K.dist(A, s.O) * K.dist(f(A), s.O))} = R²`;
    } else if (id === 'pair') {
      let a = Math.abs(K.arg(K.div(K.sub(s.A2, s.O), K.sub(s.A1, s.O))));
      a = Math.min(a, Math.PI - a);
      x = a < 2e-3 ? '两圆在 O 相切 → 像是平行线' : `两圆夹角 = 两直线夹角 = ${deg(a)}`;
    }
    ro.set('x', x);
    if (s.over === 'sym') {
      const w1 = f(s.z1), w2 = f(z2());
      ro.set('chk', K.isFin(w1) && K.isFin(w2) ? `|z₂* − z₁* 关于 C* 的对称点| = ${K.abs(K.sub(reflect(Cs, w1), w2)).toExponential(1)}` : '有一个像是 ∞，另一个是 C* 的圆心');
    } else ro.set('chk', '（叠加选“对称点”）');
    symTip.hidden = s.over !== 'sym';
    v.redraw();
  }
  function load(i) {
    s.pre = i;
    Object.assign(s, PRE[i].def);
    tip.innerHTML = PRE[i].tip;
    renderMath(tip);
    tangentBtn.hidden = PRE[i].id !== 'pair';
    update();
  }
  load(0);
  return {};
}
