// 示踪粒子：速度 v = conj(W′(z))，RK2 积分；离开视图、进入物体或寿命结束时重新投放
export class Particles {
  constructor(view, vel, solid, n = 700) {
    this.v = view; this.vel = vel; this.solid = solid; this.n = n;
    this.p = []; this.on = true; this.raf = 0; this.speed = 1;
    view.overlays.push((ctx) => this.draw(ctx));
  }
  spawn(q) {
    const b = this.v.bounds();
    for (let k = 0; k < 8; k++) {
      q.x = b.xmin + Math.random() * (b.xmax - b.xmin);
      q.y = b.ymin + Math.random() * (b.ymax - b.ymin);
      if (!this.solid(q.x, q.y)) break;
    }
    q.age = 0; q.life = 80 + Math.random() * 160; q.px = q.x; q.py = q.y;
  }
  reset() { this.p = Array.from({ length: this.n }, () => { const q = {}; this.spawn(q); q.age = Math.random() * q.life; return q; }); }
  step() {
    const b = this.v.bounds(), span = b.xmax - b.xmin;
    // 每帧最大位移约为视图宽度的 0.4%
    const dt0 = 0.004 * span * this.speed;
    for (const q of this.p) {
      q.px = q.x; q.py = q.y;
      const v1 = this.vel(q.x, q.y);
      if (!v1 || !Number.isFinite(v1[0])) { this.spawn(q); continue; }
      const s1 = Math.hypot(v1[0], v1[1]);
      const dt = dt0 / Math.max(this.vRef, 1e-9);
      const mx = q.x + 0.5 * dt * v1[0], my = q.y + 0.5 * dt * v1[1];
      const v2 = this.vel(mx, my);
      if (!v2 || !Number.isFinite(v2[0])) { this.spawn(q); continue; }
      let dx = dt * v2[0], dy = dt * v2[1];
      const L = Math.hypot(dx, dy);
      if (L > 0.03 * span) { dx *= (0.03 * span) / L; dy *= (0.03 * span) / L; }
      q.x += dx; q.y += dy; q.age++; q.s = s1;
      if (q.age > q.life || q.x < b.xmin || q.x > b.xmax || q.y < b.ymin || q.y > b.ymax || this.solid(q.x, q.y)) this.spawn(q);
    }
  }
  draw(ctx) {
    if (!this.on || !this.p.length) return;
    const v = this.v;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6;
    for (const q of this.p) {
      if (q.age < 1) continue;
      const a = Math.min(1, q.age / 12, (q.life - q.age) / 12);
      const [x0, y0] = v.toScreen({ re: q.px, im: q.py }), [x1, y1] = v.toScreen({ re: q.x, im: q.y });
      // 拖尾长度按位移放大，便于看清方向
      const tx = x1 + (x1 - x0) * 2.5, ty = y1 + (y1 - y0) * 2.5;
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * a})`;
      ctx.beginPath(); ctx.moveTo(x0 - (x1 - x0) * 1.5, y0 - (y1 - y0) * 1.5); ctx.lineTo(tx, ty); ctx.stroke();
    }
  }
  // 参考速度：在视图中采样速度的中位数，使粒子在各种流动中都以合适的速度移动
  calibrate() {
    const b = this.v.bounds(), s = [];
    for (let k = 0; k < 200; k++) {
      const x = b.xmin + Math.random() * (b.xmax - b.xmin), y = b.ymin + Math.random() * (b.ymax - b.ymin);
      if (this.solid(x, y)) continue;
      const v = this.vel(x, y);
      if (v && Number.isFinite(v[0])) s.push(Math.hypot(v[0], v[1]));
    }
    s.sort((a, b2) => a - b2);
    this.vRef = s.length ? s[Math.floor(s.length / 2)] : 1;
  }
  start() {
    if (this.raf) return;
    if (!this.p.length) this.reset();
    this.calibrate();
    const tick = () => { if (this.on) { this.step(); this.v.redraw(); } this.raf = requestAnimationFrame(tick); };
    this.raf = requestAnimationFrame(tick);
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
}
