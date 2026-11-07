// 2D 叠加层绘图工具：坐标轴、控制点、复数折线、箭头与标签
import { isFin } from './complex.js';
import { num } from './format.js';

export function niceStep(ppu, minPx = 64) {
  const raw = minPx / ppu;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

export function drawAxes(ctx, v, o) {
  const W = v.W, H = v.H, b = v.bounds();
  const step = niceStep(v.ppu);
  ctx.lineWidth = 1;
  if (o.grid) {
    ctx.strokeStyle = 'rgba(150,170,220,0.07)';
    ctx.beginPath();
    for (let x = Math.ceil(b.xmin / step) * step; x <= b.xmax; x += step) { const s = Math.round(v.toScreen({ re: x, im: 0 })[0]) + 0.5; ctx.moveTo(s, 0); ctx.lineTo(s, H); }
    for (let y = Math.ceil(b.ymin / step) * step; y <= b.ymax; y += step) { const s = Math.round(v.toScreen({ re: 0, im: y })[1]) + 0.5; ctx.moveTo(0, s); ctx.lineTo(W, s); }
    ctx.stroke();
  }
  const [ox, oy] = v.toScreen({ re: 0, im: 0 });
  ctx.strokeStyle = 'rgba(200,212,240,0.42)';
  ctx.beginPath();
  if (oy >= 0 && oy <= H) { ctx.moveTo(0, Math.round(oy) + 0.5); ctx.lineTo(W, Math.round(oy) + 0.5); }
  if (ox >= 0 && ox <= W) { ctx.moveTo(Math.round(ox) + 0.5, 0); ctx.lineTo(Math.round(ox) + 0.5, H); }
  ctx.stroke();
  if (o.unitCircle) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath(); ctx.arc(ox, oy, v.ppu, 0, 2 * Math.PI); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (!o.labels) return;
  ctx.font = '10.5px ui-monospace, "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = 'rgba(175,190,222,0.72)';
  const ly = Math.min(Math.max(oy + 4, 4), H - 14), lx = Math.min(Math.max(ox - 5, 30), W - 4);
  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  for (let x = Math.ceil(b.xmin / step) * step; x <= b.xmax; x += step) {
    if (Math.abs(x) < step * 1e-6) continue;
    ctx.fillText(num(x, 4), v.toScreen({ re: x, im: 0 })[0], ly);
  }
  ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  for (let y = Math.ceil(b.ymin / step) * step; y <= b.ymax; y += step) {
    if (Math.abs(y) < step * 1e-6) continue;
    const s = num(y, 4);
    ctx.fillText((s === '1' ? '' : s === '−1' ? '−' : s) + 'i', lx, v.toScreen({ re: 0, im: y })[1]);
  }
}

export function drawHandle(ctx, v, h) {
  const [x, y] = v.toScreen(h.pos());
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const r = h.r || 6;
  ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(5,8,18,0.65)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = h.color || '#5cc8ff'; ctx.fill();
  ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.stroke();
  if (h.label) label(ctx, x + r + 5, y - r - 5, typeof h.label === 'function' ? h.label() : h.label, h.color);
}

export function label(ctx, x, y, text, color = '#e8ecf6', align = 'left') {
  ctx.font = '600 12px "Noto Sans SC", "PingFang SC", system-ui, sans-serif';
  const w = ctx.measureText(text).width;
  const bx = align === 'center' ? x - w / 2 - 4 : align === 'right' ? x - w - 8 : x;
  ctx.fillStyle = 'rgba(8,12,24,0.78)';
  ctx.beginPath(); ctx.roundRect(bx, y - 9, w + 8, 18, 5); ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 4, y);
}

// 复数折线：遇到 ∞/NaN 或屏幕上跳变过大时断开
export function tracePath(ctx, v, pts, maxJump = Infinity) {
  let pen = false, px = 0, py = 0;
  for (const z of pts) {
    if (!z || !isFin(z)) { pen = false; continue; }
    const [x, y] = v.toScreen(z);
    if (Math.abs(x) > 1e5 || Math.abs(y) > 1e5) { pen = false; continue; }
    if (pen && Math.hypot(x - px, y - py) < maxJump) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    pen = true; px = x; py = y;
  }
}

export function strokePath(ctx, v, pts, { color = '#fff', width = 1.5, casing = true, dash = null, alpha = 1, maxJump } = {}) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  tracePath(ctx, v, pts, maxJump ?? Math.max(v.W, v.H) * 0.5);
  if (casing) { ctx.strokeStyle = 'rgba(4,6,14,0.55)'; ctx.lineWidth = width + 2.2; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}


export function dot(ctx, v, z, color = '#fff', r = 4) {
  if (!z || !isFin(z)) return;
  const [x, y] = v.toScreen(z);
  ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(5,8,18,0.7)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
}

export function arrow(ctx, v, z0, z1, color = '#fff', width = 2) {
  const [x0, y0] = v.toScreen(z0), [x1, y1] = v.toScreen(z1);
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  if (!(L > 1)) return;
  const hs = Math.min(10, L * 0.4);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hs * 0.8, y1 - Math.sin(a) * hs * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - hs * Math.cos(a - 0.4), y1 - hs * Math.sin(a - 0.4));
  ctx.lineTo(x1 - hs * Math.cos(a + 0.4), y1 - hs * Math.sin(a + 0.4));
  ctx.closePath(); ctx.fill();
}

// 曲线方向标记：在 z 处沿方向 d（复数）画一个带描边的三角箭头
export function chevron(ctx, v, z, d, color = '#fff', size = 11) {
  const [x, y] = v.toScreen(z);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const a = Math.atan2(-d.im, d.re);
  const p = (r, t) => [x + r * Math.cos(a + t), y + r * Math.sin(a + t)];
  ctx.beginPath();
  ctx.moveTo(...p(size, 0)); ctx.lineTo(...p(size * 0.8, 2.45)); ctx.lineTo(...p(size * 0.25, Math.PI)); ctx.lineTo(...p(size * 0.8, -2.45));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,8,18,0.85)'; ctx.stroke();
  ctx.fillStyle = color; ctx.fill();
}
