// 界面控件：滑块、下拉框、分段按钮、开关、按钮、读数表；以及 KaTeX 公式渲染
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

export function tex(src, display = false) {
  return katex.renderToString(src, { throwOnError: false, displayMode: display, strict: false });
}
export function setTex(el, src, display = false) { el.innerHTML = tex(src, display); }
export function renderMath(el) {
  renderMathInElement(el, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
    throwOnError: false, strict: false,
  });
}

export function slider({ label, min, max, step = 0.01, value, fmt = (v) => v.toFixed(2), onInput }) {
  const out = h('span', { class: 'ctl-val' }, fmt(value));
  const inp = h('input', { type: 'range', min, max, step, value });
  const fill = () => inp.style.setProperty('--p', `${((inp.value - min) / (max - min)) * 100}%`);
  inp.addEventListener('input', () => { out.textContent = fmt(+inp.value); fill(); onInput?.(+inp.value); });
  fill();
  const el = h('label', { class: 'ctl ctl-slider' }, h('span', { class: 'ctl-row' }, h('span', { class: 'ctl-label', html: label }), out), inp);
  return {
    el,
    get value() { return +inp.value; },
    set value(v) { inp.value = v; out.textContent = fmt(+inp.value); fill(); },
    input: inp,
  };
}

export function select({ label, options, value, onChange }) {
  const sel = h('select', {});
  let group = null;
  for (const o of options) {
    if (o.group && (!group || group.label !== o.group)) { group = h('optgroup', { label: o.group }); sel.append(group); }
    (o.group ? group : sel).append(h('option', { value: o.value }, o.label));
  }
  sel.value = value;
  sel.addEventListener('change', () => onChange?.(sel.value));
  const el = h('label', { class: 'ctl ctl-select' }, label ? h('span', { class: 'ctl-label', html: label }) : null, h('span', { class: 'select-wrap' }, sel));
  return { el, get value() { return sel.value; }, set value(v) { sel.value = v; }, sel };
}

export function segmented({ label, options, value, onChange }) {
  const btns = options.map((o) => h('button', { type: 'button', 'data-v': o.value, title: o.title || '', html: o.label }));
  const set = (v) => { for (const b of btns) b.classList.toggle('on', b.dataset.v === String(v)); cur = v; };
  let cur = value;
  btns.forEach((b, i) => b.addEventListener('click', () => { set(options[i].value); onChange?.(options[i].value); }));
  set(value);
  const el = h('div', { class: 'ctl ctl-seg' }, label ? h('span', { class: 'ctl-label', html: label }) : null, h('div', { class: 'seg' }, btns));
  return { el, get value() { return cur; }, set value(v) { set(v); } };
}

export function toggle({ label, value, onChange }) {
  const inp = h('input', { type: 'checkbox' });
  inp.checked = !!value;
  inp.addEventListener('change', () => onChange?.(inp.checked));
  const el = h('label', { class: 'ctl ctl-toggle' }, inp, h('span', { class: 'switch' }), h('span', { class: 'ctl-label', html: label }));
  return { el, get value() { return inp.checked; }, set value(v) { inp.checked = !!v; } };
}

export function button(label, onClick, cls = '') {
  return h('button', { type: 'button', class: `btn ${cls}`, onclick: onClick, html: label });
}

export function group(title, ...kids) {
  return h('div', { class: 'ctl-group' }, title ? h('div', { class: 'ctl-group-title', html: title }) : null, ...kids);
}

// 读数表：rows = [[键, 初值], ...]；返回 set(key, html)
export function readouts(rows) {
  const cells = {};
  const el = h('div', { class: 'readouts' }, rows.map(([k, label]) => {
    cells[k] = h('span', { class: 'ro-v' }, '—');
    return h('div', { class: 'ro' }, h('span', { class: 'ro-k', html: label }), cells[k]);
  }));
  return { el, set(k, v) { if (cells[k]) cells[k].innerHTML = v; } };
}

export function note(html, cls = '') { return h('div', { class: `note ${cls}`, html }); }
