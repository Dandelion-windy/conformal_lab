// 网格线与颜色：根据区域或当前 z 视图生成源曲线族
import { C, polar } from '../../core/complex.js';
import { segment } from '../../core/mapcurve.js';
import { niceStep } from '../../core/draw.js';

// 两族曲线的配色：fam 0（竖线/射线）冷色渐变，fam 1（横线/圆）暖色渐变
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const FAM = [[[79, 195, 247], [150, 110, 255]], [[255, 213, 79], [255, 82, 140]]];
export function lineColor(L) {
  if (L.axis) return '#ffffff';
  const [a, b] = FAM[L.fam];
  return rgb(mix(a, b, Math.min(1, Math.max(0, L.t))));
}

// 不指定区域时：按 z 视图范围生成直角或极坐标网格
export function viewLines(view, mode, density) {
  const b = view.bounds();
  if (!(b.xmax > b.xmin)) return [];
  const step = niceStep(view.ppu, 70 / density);
  const out = [];
  const pad = step;
  if (mode === 'cart') {
    const x0 = Math.floor((b.xmin - pad) / step), x1 = Math.ceil((b.xmax + pad) / step);
    const y0 = Math.floor((b.ymin - pad) / step), y1 = Math.ceil((b.ymax + pad) / step);
    for (let k = x0; k <= x1; k++) {
      const x = k * step;
      out.push({ pts: segment(C(x, b.ymin - pad), C(x, b.ymax + pad), 160), fam: 0, t: (k - x0) / (x1 - x0 || 1), axis: k === 0 });
    }
    for (let k = y0; k <= y1; k++) {
      const y = k * step;
      out.push({ pts: segment(C(b.xmin - pad, y), C(b.xmax + pad, y), 160), fam: 1, t: (k - y0) / (y1 - y0 || 1), axis: k === 0 });
    }
  } else if (mode === 'polar') {
    const rmax = Math.max(Math.hypot(b.xmin, b.ymin), Math.hypot(b.xmax, b.ymax), Math.hypot(b.xmin, b.ymax), Math.hypot(b.xmax, b.ymin));
    const n = Math.ceil(rmax / step);
    for (let k = 1; k <= n; k++) {
      const r = k * step, pts = [];
      for (let i = 0; i <= 240; i++) pts.push(polar(r, (2 * Math.PI * i) / 240));
      out.push({ pts, fam: 1, t: (k - 1) / Math.max(1, n - 1), axis: Math.abs(r - 1) < 1e-9 });
    }
    const na = 12 * density;
    for (let k = 0; k < 2 * na; k++) {
      const th = (Math.PI * k) / na, pts = [];
      for (let i = 0; i <= 160; i++) { const s = i / 160; pts.push(polar(rmax * s * s, th)); }
      out.push({ pts, fam: 0, t: k / (2 * na), axis: false });
    }
  }
  return out;
}

