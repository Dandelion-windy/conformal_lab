// 几何画板的界面：画布上方的工具栏；控制面板中的吸附设置、精确输入与对象列表
import { h, button } from '../../core/ui.js';
import { cx, num, deg } from '../../core/format.js';
import { abs, arg, dist } from '../../core/complex.js';
import { TOOLS, GROUPS } from './tools.js';
import { parseComplex } from './index.js';
import * as G from './geom.js';

const d = (x, y, r = 2.3) => `<circle class="d" cx="${x}" cy="${y}" r="${r}"/>`;
const o = (x, y, r = 2.3) => `<circle class="o" cx="${x}" cy="${y}" r="${r}"/>`;
const dash = 'stroke-dasharray="2.6 2.4"';
const ICONS = {
  move: '<path class="f" d="M6 3.5l12 8.2-5.3 1.2-2.6 5.6z"/>',
  point: `<path d="M12 4.5v3.5M12 16v3.5M4.5 12H8M16 12h3.5"/>${d(12, 12, 3)}`,
  inter: `<path d="M4 19L20 5M4 7l16 10"/>${d(12, 12, 2.8)}`,
  mid: `<path d="M4 18L20 6"/>${o(4, 18)}${o(20, 6)}${d(12, 12, 2.8)}`,
  line: `<path d="M3 19L21 5"/>${d(8, 15.1)}${d(16, 8.9)}`,
  seg: `<path d="M5 18L19 6"/>${d(5, 18)}${d(19, 6)}`,
  ray: `<path d="M5 18L21 4M21 4l-5.4.9M21 4l-.9 5.4"/>${d(5, 18)}${d(12, 11.9)}`,
  perp: `<path d="M3 18h18M11 4v14M11 14h4v4"/>${d(11, 7)}`,
  par: `<path d="M3 15L15 4M9 20L21 9"/>${d(15, 14.5)}`,
  bisect: `<path d="M4 15h16"/><path d="M12 3v18" ${dash}/>${d(4, 15)}${d(20, 15)}`,
  abis: `<path d="M20 19H4l12-14"/><path d="M4 19l15.6-7.2" ${dash}/>${d(4, 19)}`,
  tangent: `<circle cx="10" cy="14" r="6"/><path d="M2 8h20"/>${d(19, 8)}${o(10, 8, 1.6)}`,
  circle: `<circle cx="12" cy="12" r="8"/>${d(12, 12)}${d(17.66, 6.34)}`,
  circleR: `<circle cx="12" cy="12" r="8"/><path d="M12 12h8"/>${d(12, 12)}`,
  circle3: `<circle cx="12" cy="12" r="8"/>${d(12, 4)}${d(5.07, 16)}${d(18.93, 16)}`,
  tcircle: `<path d="M2 20.5h20"/><circle cx="12" cy="12.5" r="7.5"/>${d(12, 12.5)}${o(12, 20.5, 1.6)}`,
  arc: `<path d="M19 17A12 12 0 0 0 7 5"/><path d="M7 17h12M7 17V5" ${dash}/>${d(7, 17)}${d(19, 17)}${d(7, 5)}`,
  arc3: `<path d="M4 18A9 9 0 0 1 20 18"/>${d(4, 18)}${d(12, 9.88)}${d(20, 18)}`,
  poly: `<path d="M5 18L4 9l8-5 8 5-2 9z"/>${d(5, 18)}${d(4, 9)}${d(12, 4)}${d(20, 9)}${d(18, 18)}`,
  polyline: `<path d="M3 17l5-9 5 7 4-10 4 6"/>${d(3, 17)}${d(8, 8)}${d(13, 15)}${d(17, 5)}${d(21, 11)}`,
  regpoly: `<path d="M20 12l-4 6.93H8L4 12l4-6.93h8z"/>${d(8, 18.93)}${d(16, 18.93)}`,
  reflect: `<path d="M12 3v18" ${dash}/><path class="h" d="M3.5 17L8.5 6 10 17z"/><path class="h" d="M20.5 17L15.5 6 14 17z"/>`,
  pen: '<path d="M3.5 17c3-9 6 3 9-5s5 2 8-5"/>',
  erase: '<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13M10.5 10.5v6M13.5 10.5v6"/>',
  undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/>',
};
const icon = (k) => `<svg class="geo-ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

// 对象的数值读数
function valueOf(plane, ob) {
  const g = ob.g;
  if (!g) return '无定义';
  switch (g.t) {
    case 'pt': return cx(g.z, 4);
    case 'seg': return `长 ${num(dist(g.a, g.b), 4)}`;
    case 'line': case 'ray': {
      let a = ((arg(G.dir(g)) % Math.PI) + Math.PI) % Math.PI;
      if (Math.PI - a < 1e-9) a = 0;
      return `倾角 ${deg(a)}`;
    }
    case 'circle': return abs(g.c) < 1e-12 ? `|${plane}| = ${num(g.r, 4)}` : `|${plane} − (${cx(g.c, 3)})| = ${num(g.r, 4)}`;
    case 'arc': return `r = ${num(g.r, 4)}，${deg(Math.abs(g.da))}`;
    case 'path': return g.closed ? `${g.parts.length} 条边` : `${g.parts.length} 段`;
    case 'free': return `${g.pts.filter(Boolean).length} 个采样点`;
  }
  return '';
}

export function buildGeoUI(geo) {
  // ---------------- 工具栏 ----------------
  const btns = {};
  const tools = h('div', { class: 'geo-tools' });
  GROUPS.forEach((grp, i) => {
    if (i) tools.append(h('span', { class: 'geo-sep' }));
    for (const id of grp) {
      btns[id] = h('button', { type: 'button', class: 'geo-btn', title: `${TOOLS[id].name}\n${TOOLS[id].hint([])}`, html: icon(id), onclick: () => geo.setTool(geo.tool === id && id !== 'move' ? 'move' : id) });
      tools.append(btns[id]);
    }
  });
  const optErr = (inp, ok) => inp.classList.toggle('err', !ok);
  const rIn = h('input', { class: 'geo-num', value: '1', spellcheck: 'false', title: '半径（可输入表达式，如 sqrt(2)）' });
  rIn.addEventListener('input', () => {
    try { const r = parseComplex(rIn.value, geo.M.P); const ok = Math.abs(r.im) < 1e-12 && r.re > 0; optErr(rIn, ok); if (ok) geo.opt.r = r.re; } catch { optErr(rIn, false); }
  });
  const nIn = h('input', { class: 'geo-num', value: '4', type: 'number', min: 3, max: 40, step: 1, title: '正多边形的边数' });
  nIn.addEventListener('input', () => { const n = Math.round(+nIn.value); const ok = n >= 3 && n <= 40; optErr(nIn, ok); if (ok) geo.opt.n = n; });
  const rBox = h('label', { class: 'geo-opt' }, '半径', rIn), nBox = h('label', { class: 'geo-opt' }, '边数', nIn);
  // 工具参数：浮在当前工具按钮下方，不改变工具栏的高度
  const pop = h('div', { class: 'geo-pop', hidden: true }, rBox, nBox);
  const undoB = h('button', { type: 'button', class: 'geo-btn', title: '撤销（Ctrl+Z）', html: icon('undo'), onclick: () => geo.undo() });
  const redoB = h('button', { type: 'button', class: 'geo-btn', title: '重做（Ctrl+Y / Ctrl+Shift+Z）', html: icon('redo'), onclick: () => geo.redo() });
  tools.append(h('span', { class: 'geo-sep' }), undoB, redoB);
  const note = h('span', { class: 'geo-note', hidden: true }, '球面视图中只显示图形，作图请切换到平面视图');
  const bar = h('div', { class: 'geo-bar' }, tools, note, pop);

  // ---------------- 面板 ----------------
  const SNAPS = [['inter', '交点'], ['mid', '中点'], ['center', '圆心'], ['on', '曲线上'], ['grid', '网格'], ['axes', '坐标轴 · 单位圆'], ['special', '零点 · 极点 · 临界点']];
  const chips = h('div', { class: 'chips' }, SNAPS.map(([k, label]) => {
    const c = h('span', { class: `chip ${geo.snap[k] ? 'on' : ''}`, onclick: () => { geo.snap[k] = !geo.snap[k]; c.classList.toggle('on', geo.snap[k]); } }, label);
    return c;
  }));
  const tog = (label, key) => {
    const inp = h('input', { type: 'checkbox' });
    inp.checked = geo.disp[key];
    inp.addEventListener('change', () => { geo.disp[key] = inp.checked; geo.texDirty = true; geo.M.redraw(); });
    return h('label', { class: 'ctl ctl-toggle' }, inp, h('span', { class: 'switch' }), h('span', { class: 'ctl-label' }, label));
  };
  let addPlane = 'z';
  const planeBtns = ['z', 'w'].map((p) => h('button', { type: 'button', class: p === addPlane ? 'on' : '', onclick: () => { addPlane = p; planeBtns.forEach((b, i) => b.classList.toggle('on', ['z', 'w'][i] === p)); } }, `${p} 平面`));
  const addIn = h('input', { class: 'text-input', spellcheck: 'false', placeholder: '如 1+2i、(1, 2)、2e^(i pi/3)' });
  const addErr = h('div', { class: 'err-msg' });
  const doAdd = () => {
    try { const ob = geo.addPoint(addPlane, addIn.value); addIn.classList.remove('err'); addErr.textContent = ''; addIn.value = ''; geo.select({ plane: addPlane, id: ob.id }); }
    catch (e) { addIn.classList.add('err'); addErr.textContent = e.message; }
  };
  addIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
  const list = h('div', { class: 'geo-list' });
  const group = h('div', { class: 'ctl-group' },
    h('div', { class: 'ctl-group-title' }, '几何画板'),
    h('div', { class: 'small muted' }, '用画布上方的工具在 z 或 w 平面上作图。z 平面的图形在右图画出它的像；w 平面的图形在左图画出它的全部原像。Esc 取消，Delete 删除选中对象。'),
    h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, '吸附（取点时自动对齐到）'), chips),
    h('div', { class: 'toggles' }, tog('显示名称', 'labels'), tog('显示像与原像', 'images')),
    h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, '按坐标添加点（回车）'), h('div', { class: 'seg' }, planeBtns),
      h('div', { class: 'expr-row' }, addIn, button('添加', doAdd, 'small primary')), addErr),
    h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, '对象'), list),
    h('div', { class: 'btn-row' }, button('清空 z 平面', () => geo.clear('z'), 'small'), button('清空 w 平面', () => geo.clear('w'), 'small'), button('全部清空', () => geo.clear(), 'small')),
  );

  // 对象列表：结构变化时重建，否则只更新读数（不打断正在编辑的输入框）
  let sig = '', cells = [], built = [];
  const editCell = (plane, ob, val, apply) => {
    const inp = h('input', { class: 'geo-edit', value: val, spellcheck: 'false', title: '回车确认' });
    const err = (m) => { inp.classList.toggle('err', !!m); inp.title = m || '回车确认'; };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { try { apply(inp.value); err(null); inp.blur(); } catch (x) { err(x.message); } }
      if (e.key === 'Escape') { inp.blur(); }
    });
    inp.addEventListener('blur', () => { inp.classList.remove('err'); ui.refresh(); });
    return inp;
  };
  function rebuild() {
    list.innerHTML = '';
    cells = [];
    for (const plane of ['z', 'w']) {
      const B = geo.boards[plane];
      list.append(h('div', { class: 'geo-list-head' }, `${plane} 平面 · ${B.objs.length} 个对象`));
      if (!B.objs.length) list.append(h('div', { class: 'geo-empty' }, '（空）'));
      for (const ob of B.objs) {
        const sel = geo.sel?.plane === plane && geo.sel.id === ob.id;
        const color = h('input', { type: 'color', value: ob.color, title: '颜色' });
        color.addEventListener('input', () => geo.setStyle(ob, 'color', color.value));
        const eye = h('button', { type: 'button', class: `geo-eye ${ob.show === false ? 'off' : ''}`, title: ob.show === false ? '显示' : '隐藏', onclick: (e) => { e.stopPropagation(); geo.setStyle(ob, 'show', ob.show === false); } }, ob.show === false ? '○' : '●');
        const del = h('button', { type: 'button', class: 'geo-del', title: '删除（含依赖它的对象）', onclick: (e) => { e.stopPropagation(); geo.remove(plane, ob.id); } }, '×');
        let val;
        if (ob.kind === 'free') val = editCell(plane, ob, ob.g ? cx(ob.g.z, 6) : '', (s) => geo.setPoint(plane, ob, s));
        else if (ob.kind === 'circleR') val = editCell(plane, ob, num(ob.par.r, 6), (s) => geo.setRadius(ob, s));
        else val = h('span', { class: 'geo-val' }, valueOf(plane, ob));
        cells.push({ plane, id: ob.id, val });
        const row = h('div', { class: `geo-row ${sel ? 'sel' : ''} ${ob.g ? '' : 'undef'}`, onclick: (e) => { if (e.target.tagName !== 'INPUT') geo.select({ plane, id: ob.id }); } },
          color, eye, h('span', { class: 'geo-oname' }, ob.name), h('span', { class: 'geo-desc', title: geo.boards[plane].describe(ob) }, geo.boards[plane].describe(ob)), val, del);
        list.append(row);
      }
    }
  }
  function update() {
    for (const { plane, id, val } of cells) {
      const ob = geo.boards[plane].get(id);
      if (!ob || val === document.activeElement) continue;
      if (val.tagName === 'INPUT') val.value = ob.kind === 'free' ? (ob.g ? cx(ob.g.z, 6) : '') : num(ob.par.r, 6);
      else val.textContent = valueOf(plane, ob);
    }
  }
  let raf = 0;
  const ui = {
    bar, group,
    refresh() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const objs = [...geo.boards.z.objs, ...geo.boards.w.objs];
        const s = JSON.stringify([geo.sel, ['z', 'w'].map((p) => geo.boards[p].objs.map((x) => [x.id, x.name, x.show, x.color, !!x.g]))]);
        // 撤销后对象被重新创建，因此按引用比较；只在编辑坐标时推迟重建
        const editing = document.activeElement?.classList.contains('geo-edit') && list.contains(document.activeElement);
        if ((s !== sig || objs.some((x, i) => x !== built[i])) && !editing) { sig = s; built = objs; rebuild(); } else update();
        undoB.disabled = !geo.undoS.length; redoB.disabled = !geo.redoS.length;
      });
    },
    sphereNote(on) { note.hidden = !on; },
    syncTool() {
      for (const id in btns) btns[id].classList.toggle('on', id === geo.tool);
      const opt = TOOLS[geo.tool].opt;
      rBox.hidden = opt !== 'r';
      nBox.hidden = opt !== 'n';
      pop.hidden = !opt;
      if (opt) pop.style.left = `${btns[geo.tool].offsetLeft}px`;
    },
  };
  ui.syncTool();
  ui.refresh();
  return ui;
}
