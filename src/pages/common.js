// 章节页面骨架与常用组合件
import { h, renderMath } from '../core/ui.js';

export function shell(root, { num, title, lead, stageClass = 'two' }) {
  const head = h('header', { class: 'page-head' },
    h('div', {}, h('div', { class: 'eyebrow' }, `Chapter ${num}`), h('h1', { html: title }), lead ? h('p', { class: 'lead', html: lead }) : null));
  const stage = h('div', { class: `stage ${stageClass}` });
  const panel = h('aside', { class: 'panel' });
  const workspace = h('div', { class: 'workspace' }, stage, panel);
  const theory = h('div', { class: 'theory' });
  root.append(head, workspace, theory);
  renderMath(head);
  return { head, workspace, stage, panel, theory };
}

// 多标签章节：每个标签页有独立的 stage 与 panel；tabs = [{id, label, stageClass, mount(stage, panel)}]
// 标签页在首次显示时才挂载
export function tabbedShell(root, { num, title, lead, tabs }) {
  const head = h('header', { class: 'page-head' },
    h('div', {}, h('div', { class: 'eyebrow' }, `Chapter ${num}`), h('h1', { html: title }), lead ? h('p', { class: 'lead', html: lead }) : null));
  const bodies = {}, ctx = {};
  const T = subtabs(tabs.map((t) => ({ id: t.id, label: t.label })), (id) => {
    const t = tabs.find((x) => x.id === id);
    if (!bodies[id].mounted) { bodies[id].mounted = true; ctx[id] = t.mount(bodies[id].stage, bodies[id].panel, bodies[id]) || {}; }
    for (const k in ctx) if (k !== id) ctx[k].hide?.();
    ctx[id].show?.();
  });
  const wrap = h('div', {});
  for (const t of tabs) {
    const stage = h('div', { class: `stage ${t.stageClass || 'two'}` });
    const panel = h('aside', { class: 'panel' });
    const pane = T.panes[t.id];
    pane.append(h('div', { class: 'workspace' }, stage, panel));
    bodies[t.id] = { stage, panel, pane };
    wrap.append(pane);
  }
  const theory = h('div', { class: 'theory' });
  root.append(head, T.bar, wrap, theory);
  renderMath(head);
  return { theory, select: (id) => T.set(id), get current() { return T.current; }, ctx };
}

// 子标签页：tabs = [{id, label}]，返回 { bar, panes:{id:el}, onSwitch }
export function subtabs(tabs, onSwitch) {
  const panes = {};
  const btns = tabs.map((t) => h('button', { type: 'button', html: t.label, onclick: () => set(t.id) }));
  const bar = h('div', { class: 'subtabs' }, btns);
  for (const t of tabs) panes[t.id] = h('div', { class: 'sub' });
  let cur = null;
  function set(id) {
    if (cur === id) return;
    cur = id;
    tabs.forEach((t, i) => { btns[i].classList.toggle('on', t.id === id); panes[t.id].classList.toggle('on', t.id === id); });
    onSwitch?.(id);
  }
  return { bar, panes, set, get current() { return cur; } };
}

// 理论卡片：html 中可用 $...$ 与 $$...$$
export function theory(container, title, cards) {
  container.append(h('div', { class: 'theory-title' }, title || '原理与要点'));
  for (const c of cards) {
    const el = h('div', { class: `card ${c.wide ? 'wide' : ''}`, html: (c.title ? `<h3>${c.tag ? `<span class="tag">${c.tag}</span>` : ''}${c.title}</h3>` : '') + c.html });
    container.append(el);
  }
  renderMath(container);
}

// 视图容器：返回一个占位 div，可选标题
export function viewBox(cls = '') { return h('div', { class: cls }); }

// 简单的播放控制：滑块 + 播放按钮，onFrame(t) 在 [0, max] 内
export function player({ max = 1, step = 0.001, value = 0, speed = 0.4, loop = false, onFrame, fmt }) {
  const btn = h('button', { class: 'play-btn', type: 'button', title: '播放 / 暂停' }, '▶');
  const inp = h('input', { type: 'range', min: 0, max, step, value });
  const out = h('span', { class: 'ctl-val' }, fmt ? fmt(value) : value.toFixed(2));
  let raf = 0, last = 0;
  const fill = () => inp.style.setProperty('--p', `${(inp.value / max) * 100}%`);
  const set = (v, fire = true) => { inp.value = v; out.textContent = fmt ? fmt(+v) : (+v).toFixed(2); fill(); if (fire) onFrame(+v); };
  function tick(ts) {
    const dt = last ? (ts - last) / 1000 : 0; last = ts;
    let v = +inp.value + dt * speed * max;
    if (v >= max) { if (loop) v = 0; else { v = max; stop(); } }
    set(v);
    if (raf) raf = requestAnimationFrame(tick);
  }
  function play() { if (+inp.value >= max) set(0); last = 0; raf = requestAnimationFrame(tick); btn.textContent = '❚❚'; }
  function stop() { cancelAnimationFrame(raf); raf = 0; btn.textContent = '▶'; }
  btn.onclick = () => (raf ? stop() : play());
  inp.addEventListener('input', () => { stop(); set(+inp.value); });
  fill();
  const el = h('div', { class: 'play-row' }, btn, inp, out);
  return { el, set, play, stop, get value() { return +inp.value; }, get playing() { return !!raf; } };
}
