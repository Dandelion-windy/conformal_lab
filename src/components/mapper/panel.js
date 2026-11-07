// 映射器控制面板
import * as K from '../../core/complex.js';
import { h, select, segmented, slider, toggle, group, readouts, button, renderMath } from '../../core/ui.js';
import { DOMAINS } from '../../core/domains.js';
import { cx, num, deg } from '../../core/format.js';
import { player } from '../../pages/common.js';

export function buildPanel(M, panel) {
  const s = M.state;
  const presetSel = select({ label: '预设映射', options: M.presets.map((p) => ({ value: p.id, label: p.name, group: p.g })), value: M.presets[0].id, onChange: (v) => M.loadPreset(v) });
  const exprIn = h('input', { class: 'text-input', spellcheck: 'false', placeholder: '例如 (z^2+1)/(z-i)' });
  const err = h('div', { class: 'err-msg' });
  const apply = () => {
    try { const fn = M.setExpr(exprIn.value); exprIn.classList.remove('err'); err.textContent = fn.holomorphic ? '' : '提示：含 z̄ / Re / Im / |z| 等，非解析函数，一般不共形。'; }
    catch (e) { exprIn.classList.add('err'); err.textContent = e.message; }
  };
  exprIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
  const exprRow = M.custom ? h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, 'f(z) = （回车应用）'), h('div', { class: 'expr-row' }, exprIn, button('应用', apply, 'small primary')), err,
    h('div', { class: 'small muted' }, '支持 + − * / ^、隐式乘法、sin cos tan sinh cosh exp log sqrt conj abs re im；常数 i e pi；参数 a b c（可拖动）与 t（滑块）')) : null;
  const chips = h('div', { class: 'chips' });
  const tSl = slider({ label: '参数 t', min: -3, max: 3, step: 0.01, value: 1, onInput: (v) => { M.P.t = K.C(v); M.remap(); } });
  const paramRo = h('div', { class: 'readouts' });

  const domSel = select({ label: '源区域（把 z 平面的哪一部分映过去）', options: [
    { value: 'none', label: '自动：整个平面（周期函数取一个周期带）', group: '整体' }, { value: 'plane', label: '整个平面（含全部周期）', group: '整体' },
    { value: 'view', label: '当前 z 视图范围', group: '整体' },
    ...Object.values(DOMAINS).map((d) => ({ value: d.id, label: d.name, group: '常用区域' }))], value: 'none', onChange: (v) => { M.setDomain(v); const d = DOMAINS[v]; if (d) M.zv.setHome(...d.view); } });
  const srcInfo = h('div', { class: 'small muted' });
  const domSl = slider({ label: '区域参数', min: 0, max: 1, step: 0.01, value: 0.5, onInput: (v) => M.setDomain(s.dom, v) });
  const gridSeg = segmented({ label: '源网格（z 的坐标网）', options: [{ value: 'cart', label: '直角 x, y' }, { value: 'polar', label: '对数极坐标 ln|z|, arg z' }], value: s.grid, onChange: (v) => M.setGrid(v) });
  const densSeg = segmented({ label: '网格密度', options: [{ value: 1, label: '疏' }, { value: 2, label: '中' }, { value: 3, label: '密' }], value: s.density, onChange: (v) => M.setDensity(v) });
  const tg = (label, key, after) => toggle({ label, value: s[key], onChange: (v) => { s[key] = v; after?.(); M.redraw(); } });
  // 选择背景着色时自动关闭格子填充，否则背景会被格子盖住
  const showBg = (on) => { if (on && s.fill) { s.fill = false; tFill.value = false; } };
  const tFill = tg('格子填充', 'fill'), tLines = tg('网格线', 'showLines'), tBd = tg('边界/标记点', 'showBoundary');
  const legend = h('div', { class: 'note small', html: '<b class="c-acc">蓝线</b>：x = 常数（或射线 arg z = 常数）；<b class="c-amb">橙线</b>：y = 常数（或圆 |z| = 常数）；<b>白线</b>：坐标轴与单位圆。格子的颜色由它在 z 平面中的位置决定（色相 = arg z，离原点越远越鲜艳），左右两图中同色同形的格子互相对应。若 f 不是单叶的（如 z²、z³），每个 w 有多个原像，右图显示<b>离左图中心最近</b>（球面：正对观察者）的那个原像，平移或旋转左图即可切换到另一叶。关闭“格子填充”可以看到背景着色。' });

  const colorSel = select({ label: '背景着色（左图颜色 = 其像点在右图的颜色）', options: [
    { value: 0, label: '相位 + 模环（增强相位图）' }, { value: 1, label: '黎曼球着色（0 黑 · ∞ 白）' },
    { value: 2, label: '直角棋盘格' }, { value: 3, label: '极坐标棋盘格' }, { value: 4, label: '关闭（暗色）' }], value: 0, onChange: (v) => { s.colorMode = +v; showBg(+v !== 4); M.redraw(); } });
  const bgLineSeg = segmented({ label: '背景线（w 的坐标线及其原像）', options: [{ value: 0, label: '无' }, { value: 1, label: '直角' }, { value: 2, label: '极坐标' }], value: 0, onChange: (v) => { s.bgLines = v; showBg(v !== 0); M.redraw(); } });
  const brSl = slider({ label: '背景亮度', min: 0.1, max: 1, value: s.bright, onInput: (v) => { s.bright = v; M.redraw(); } });

  const zMode = segmented({ label: 'z 视图', options: [{ value: 'plane', label: '平面' }, { value: 'sphere', label: '黎曼球面' }], value: 'plane', onChange: (v) => M.setMode('z', v) });
  const wMode = segmented({ label: 'w 视图', options: [{ value: 'plane', label: '平面' }, { value: 'sphere', label: '黎曼球面' }], value: 'plane', onChange: (v) => M.setMode('w', v) });
  const tLink = tg('两个球面同步旋转', 'linkCam');
  const looks = h('div', { class: 'btn-row' }, button('看 N（∞）', () => M.look('N'), 'small'), button('看 S（0）', () => M.look('S'), 'small'), button('侧面', () => M.look('side'), 'small'));
  const sphereCtl = h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, '球面视角（拖动球面旋转）'), looks, tLink.el);
  const toolSeg = segmented({ label: '在 z 平面上作图', options: [{ value: 'pan', label: '✋ 平移' }, { value: 'draw', label: '✎ 画笔' }, { value: 'line', label: '╱ 线段' }, { value: 'circle', label: '◯ 圆' }], value: 'pan', onChange: (v) => M.tools.setMode(v) });
  const tProbe = tg('局部探针（点击固定）', 'probe', () => { M.pinned = null; });
  const tPre = tg('悬停 w 显示全部原像', 'preimg');
  const morphLabel = h('span', { class: 'ctl-label' });
  const morph = player({ max: 1, value: 1, speed: 0.35, onFrame: (t) => M.setMorph(t), fmt: (v) => `t=${v.toFixed(2)}` });

  const tSpecial = tg('标出零点 ○、极点 ◉、临界点 ✕', 'special');
  const globalBox = h('div', { class: 'readouts' });
  const ro = readouts([['z', 'z'], ['w', 'w = f(z)'], ['d', "f′(z)"], ['k', '伸缩率 |f′|'], ['r', '旋转角 arg f′'], ['st', '状态']]);
  const info = h('div', { class: 'note' });

  panel.append(
    group('映射函数', presetSel.el, exprRow, chips, tSl.el, paramRo),
    group('源区域与网格', domSel.el, srcInfo, domSl.el, gridSeg.el, densSeg.el, h('div', { class: 'toggles' }, tFill.el, tLines.el, tBd.el), legend),
    group('着色', colorSel.el, bgLineSeg.el, brSl.el),
    group('视图与工具', h('div', { class: 'toggles' }, zMode.el, wMode.el), sphereCtl, toolSeg.el, button('清除所画曲线', () => M.tools.clear(), 'small'), h('div', { class: 'toggles' }, tProbe.el, tPre.el),
      h('div', { class: 'ctl' }, morphLabel, morph.el)),
    group('整体结构（在黎曼球面上看）', tSpecial.el, globalBox),
    group('读数（鼠标悬停 z 平面）', ro.el),
    group('说明', info),
  );
  renderMath(panel);

  sphereCtl.hidden = true;
  return {
    syncModes() {
      zMode.value = s.zMode; wMode.value = s.wMode;
      sphereCtl.hidden = s.zMode !== 'sphere' && s.wMode !== 'sphere';
    },
    onPreset(p) {
      presetSel.value = p.id;
      exprIn.value = p.expr; exprIn.classList.remove('err'); err.textContent = '';
      tSl.el.hidden = !/t/.test(M.fn?.params.join('') || '');
      if (p.P?.tRange) { tSl.input.min = p.P.tRange[0]; tSl.input.max = p.P.tRange[1]; }
      else { tSl.input.min = -3; tSl.input.max = 3; }
      tSl.value = M.P.t.re;
      chips.innerHTML = '';
      for (const e of p.ex || []) chips.append(h('span', { class: 'chip', onclick: () => { M.setDomain(e.dom, e.domP, e.grid); const d = DOMAINS[e.dom]; if (d) M.zv.setHome(...d.view); } }, e.label));
      info.innerHTML = p.info || '';
      renderMath(info);
      morph.set(1, false);
      densSeg.value = s.density;
      this.syncParams();
    },
    onDomain() {
      const d = M.domain;
      domSel.value = s.dom;
      domSl.el.hidden = !d?.p;
      if (d?.p) {
        domSl.input.min = d.p.min; domSl.input.max = d.p.max;
        domSl.el.querySelector('.ctl-label').textContent = d.p.label;
        domSl.value = s.domP;
      }
      gridSeg.value = s.grid;
      densSeg.value = s.density;
      srcInfo.textContent = `当前：${M.src?.name || ''}`;
    },
    syncParams() {
      const ps = M.fn?.params || [];
      tSl.el.hidden = !ps.includes('t');
      paramRo.innerHTML = ps.filter((k) => k !== 't').map((k) => `<div class="ro"><span class="ro-k">参数 ${k}（拖动）</span><span class="ro-v">${cx(M.P[k])}</span></div>`).join('');
    },
    readZ(z) {
      if (!z) { for (const k of ['z', 'w', 'd', 'k', 'r', 'st']) ro.set(k, '—'); return; }
      const w = M.f(z), d = K.deriv(M.f, z), k = K.abs(d);
      ro.set('z', cx(z)); ro.set('w', cx(w)); ro.set('d', cx(d));
      ro.set('k', num(k)); ro.set('r', deg(K.arg(d)));
      ro.set('st', !M.fn.holomorphic ? '<span class="c-amb">非解析：一般不共形</span>' : !K.isFin(d) ? '<span class="c-pink">奇点</span>' : k < 1e-4 ? '<span class="c-pink">f′ = 0：临界点，共形性失效</span>' : '<span class="c-green">f′ ≠ 0：此处共形</span>');
    },
    playMorph() { morph.stop(); morph.set(0); morph.play(); },
    syncMorph() {
      morphLabel.innerHTML = M.flow ? '变形动画：沿单参数子群 $T_t$（$T_0=$ 恒等，$T_1=f$；每个 $T_t$ 都是分式线性变换，椭圆型在球面上就是旋转）'
        : '变形动画 $w_t=(1-t)z+t\\,f(z)$（线性插值，仅示意）';
      renderMath(morphLabel);
    },
    showInfo(I) {
      this.syncMorph();
      const row = (k, v) => `<div class="ro"><span class="ro-k">${k}</span><span class="ro-v">${v}</span></div>`;
      if (!I) { globalBox.innerHTML = row('—', '非解析函数，不讨论'); return; }
      const list = (L) => (L.length ? L.slice(0, 8).map((q) => (K.isFin(q.z) ? cx(q.z, 3) : '∞') + (q.m > 1 ? `（${q.m}）` : '')).join('，') + (L.length > 8 ? ' …' : '') : '无');
      const inf = I.infKind === 'pole' ? `∞（${I.infOrder} 阶极点）` : I.infKind === 'value' ? `${cx(I.inf, 3)}${I.infOrder > 1 ? `（${I.infOrder} 重）` : ''}` : '本性奇点 / 支点（没有极限）';
      let html = row('f(∞)', inf) + row('零点', list(I.zeros)) + row('极点', list(I.poles)) + row('临界点 f′=0', list(I.crit));
      if (I.rational) {
        const c = I.crit.reduce((t, q) => t + q.m, 0);
        html += row('次数 d', `${I.degree}：每个 w 恰有 ${I.degree} 个原像（计重数，含 ∞）`);
        html += row('Riemann–Hurwitz', `临界点个数 ${c} ${c === 2 * I.degree - 2 ? '=' : '≠'} 2d − 2 = ${2 * I.degree - 2}`);
      } else html += row('类型', I.infKind === 'essential' ? '不是有理函数：∞ 处不连续，不能看成球面到球面的映射' : '—');
      globalBox.innerHTML = html;
    },
    readW(w, pre) {
      if (!w) return;
      ro.set('w', cx(w)); ro.set('z', pre ? (M.info?.rational ? `全部原像 ${pre.length} 个：${pre.map((q) => cx(q, 2)).join('，')}` : `视图内原像 ${pre.length} 个`) : '—');
      for (const k of ['d', 'k', 'r', 'st']) ro.set(k, '—');
    },
  };
}
