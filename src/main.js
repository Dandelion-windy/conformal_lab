// 入口：章节注册与路由（#章节id 或 #章节id/参数）
import 'katex/dist/katex.min.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/controls.css';
import './styles/views.css';
import './styles/theory.css';
import { h } from './core/ui.js';
import { renderer } from './core/gl.js';
import home from './pages/home.js';
import sphere from './pages/sphere/index.js';
import conformal from './pages/conformal/index.js';
import mobius from './pages/mobius/index.js';
import elementary from './pages/elementary.js';
import lab from './pages/lab.js';
import regions from './pages/regions/index.js';
import disk from './pages/disk/index.js';
import sc from './pages/sc/index.js';
import flow from './pages/flow/index.js';
import sheet from './pages/sheet/index.js';

const CHAPTERS = [
  { id: 'home', num: '00', title: '首页', sub: '导览与使用说明', mod: home },
  { sec: '基础' },
  { id: 'sphere', num: '01', title: '黎曼球面', sub: '扩充复平面 · 球极投影', mod: sphere },
  { id: 'conformal', num: '02', title: '共形性的几何意义', sub: '旋转角 · 伸缩率', mod: conformal },
  { sec: '变换' },
  { id: 'mobius', num: '03', title: '分式线性变换', sub: '保圆 · 保对称 · 交比', mod: mobius },
  { id: 'elementary', num: '04', title: '初等函数的映射', sub: '幂 · 指数 · 三角 · 茹科夫斯基', mod: elementary },
  { id: 'lab', num: '05', title: '映射实验室', sub: '任意 f(z) 自由探索', mod: lab },
  { sec: '区域与定理' },
  { id: 'regions', num: '06', title: '区域的共形映射', sub: '典型例题 · 分步演示', mod: regions },
  { id: 'disk', num: '07', title: '单位圆盘', sub: '自同构 · 施瓦茨引理', mod: disk },
  { id: 'sc', num: '08', title: 'Schwarz–Christoffel', sub: '上半平面 → 多边形', mod: sc },
  { sec: '应用与总结' },
  { id: 'flow', num: '09', title: '物理应用', sub: '复势 · 绕流 · 翼型', mod: flow },
  { id: 'sheet', num: '10', title: '公式速查', sub: '常用映射与定理', mod: sheet },
];

const nav = document.getElementById('nav');
const main = document.getElementById('main');
const pages = {};
let current = null;

for (const ch of CHAPTERS) {
  if (ch.sec) { nav.append(h('div', { class: 'nav-sec' }, ch.sec)); continue; }
  ch.link = h('a', { class: 'nav-item', href: `#${ch.id}` },
    h('span', { class: 'nav-num' }, ch.num),
    h('span', {}, ch.title, h('small', {}, ch.sub)));
  nav.append(ch.link);
  ch.el = h('section', { class: 'page', id: `page-${ch.id}` });
  main.append(ch.el);
  pages[ch.id] = ch;
}

export const app = {
  chapters: CHAPTERS.filter((c) => c.id),
  go(id, arg) { location.hash = arg ? `${id}/${arg}` : id; },
};
window.conformalApp = app;

function route() {
  const [id, ...rest] = decodeURIComponent(location.hash.slice(1)).split('/');
  const ch = pages[id] || pages.home;
  const arg = rest.join('/') || null;
  if (current && current !== ch) { current.el.classList.remove('active'); current.link.classList.remove('active'); current.mod.hide?.(); }
  ch.el.classList.add('active');
  ch.link.classList.add('active');
  if (!ch.mounted) {
    ch.mounted = true;
    try { ch.mod.mount(ch.el, app, arg); } catch (e) { console.error(e); ch.el.append(h('pre', { class: 'note bad' }, String(e.stack || e))); }
  }
  if (current !== ch) window.scrollTo(0, 0);
  ch.mod.show?.(arg);
  current = ch;
}

if (!renderer().ok) {
  main.prepend(h('div', { class: 'note bad', style: 'margin-bottom:12px' }, '当前浏览器不支持 WebGL2，着色背景将不可用（曲线仍可显示）。建议使用新版 Chrome / Edge / Firefox。'));
}
window.addEventListener('hashchange', route);
route();
