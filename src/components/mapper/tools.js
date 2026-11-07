// 用户曲线工具：自由画笔、直线段、圆；直线与圆生成可拖动的控制点
import { dist } from '../../core/complex.js';
import { segment, circlePts } from '../../core/mapcurve.js';

const PALETTE = ['#ff5c8a', '#5cffb0', '#ffd25c', '#7aa8ff', '#ff8c4a', '#d78bff'];

export class CurveTools {
  constructor(view, onChange) {
    this.view = view; this.onChange = onChange;
    this.curves = [];
    this.mode = 'pan';
    this.k = 0;
  }
  nextColor() { return PALETTE[this.k++ % PALETTE.length]; }
  setMode(m) {
    this.mode = m;
    this.view.tool = m === 'pan' ? null : this;
    this.cursor = m === 'pan' ? null : 'crosshair';
  }
  clear() {
    this.curves = [];
    this.view.handles = this.view.handles.filter((h) => !h.curve);
    this.onChange();
  }
  addHandle(curve, key) {
    const h = { curve, color: curve.color, r: 5, pos: () => curve[key], move: (z) => { curve[key] = z; this.onChange(); } };
    this.view.handles.push(h);
  }
  down(z) {
    const color = this.nextColor();
    if (this.mode === 'draw') this.cur = { kind: 'free', color, raw: [z] };
    if (this.mode === 'line') this.cur = { kind: 'line', color, a: z, b: z };
    if (this.mode === 'circle') this.cur = { kind: 'circle', color, c: z, p: z };
    if (!this.cur) return false;
    const cur = this.cur;
    if (cur.kind === 'free') cur.pts = () => cur.raw;
    if (cur.kind === 'line') cur.pts = () => segment(cur.a, cur.b, 96);
    if (cur.kind === 'circle') cur.pts = () => circlePts(cur.c, Math.max(1e-6, dist(cur.c, cur.p)), 160);
    this.curves.push(cur);
    return true;
  }
  move(z, e, view) {
    const cur = this.cur;
    if (!cur) return;
    if (cur.kind === 'free') {
      const last = cur.raw[cur.raw.length - 1];
      if (dist(last, z) * view.ppu > 2.5) cur.raw.push(z);
    } else if (cur.kind === 'line') cur.b = z;
    else cur.p = z;
    this.onChange();
  }
  up() {
    const cur = this.cur;
    this.cur = null;
    if (!cur) return;
    const tiny = cur.kind === 'free' ? cur.raw.length < 3 : dist(cur.kind === 'line' ? cur.a : cur.c, cur.kind === 'line' ? cur.b : cur.p) * this.view.ppu < 4;
    if (tiny) { this.curves.pop(); this.onChange(); return; }
    if (cur.kind === 'line') { this.addHandle(cur, 'a'); this.addHandle(cur, 'b'); }
    if (cur.kind === 'circle') { this.addHandle(cur, 'c'); this.addHandle(cur, 'p'); }
    this.onChange();
  }
}
