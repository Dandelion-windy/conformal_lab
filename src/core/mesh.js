// 区域网格：参数化 (u,v)∈[0,1]² → z，映射后用 WebGL 绘制成棋盘格填充；
// 跨越割线（不连续处）的三角形通过"中点检验"剔除
import { renderer } from './gl.js';
import { isFin } from './complex.js';

const VS = `#version 300 es
in vec2 a_pos; in vec2 a_uv;
uniform vec2 u_center; uniform float u_ppu; uniform vec2 u_res;
out vec2 v_uv;
void main() { gl_Position = vec4((a_pos - u_center) * u_ppu / (0.5 * u_res), 0.0, 1.0); v_uv = a_uv; }`;
const FS = `in vec2 v_uv;
uniform vec2 u_cells; uniform float u_alpha; uniform float u_lineA;
out vec4 o;
void main() {
  vec2 g = v_uv * u_cells;
  vec2 cell = floor(g);
  float chk = mod(cell.x + cell.y, 2.0);
  vec3 A = mix(vec3(0.20, 0.62, 0.96), vec3(0.62, 0.40, 0.95), clamp(v_uv.x, 0.0, 1.0));
  A = mix(A, vec3(0.98, 0.50, 0.62), 0.55 * clamp(v_uv.y, 0.0, 1.0));
  vec3 col = chk > 0.5 ? A : mix(A, vec3(0.04, 0.06, 0.14), 0.42);
  vec2 fw = fwidth(g);
  vec2 d = abs(fract(g + 0.5) - 0.5) / max(fw, vec2(1e-6));
  float line = (1.0 - smoothstep(0.4, 1.4, min(d.x, d.y))) * (1.0 - smoothstep(0.15, 0.5, max(fw.x, fw.y)));
  col = mix(col, vec3(1.0), line * u_lineA);
  o = vec4(col * u_alpha, u_alpha);
}`;

export class DomainMesh {
  constructor(nu = 120, nv = 120, cells = [12, 12]) {
    this.nu = nu; this.nv = nv; this.cells = cells;
    const N = (nu + 1) * (nv + 1);
    this.N = N;
    this.uv = new Float32Array(2 * N);
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = j * (nu + 1) + i;
      this.uv[2 * k] = i / nu; this.uv[2 * k + 1] = j / nv;
    }
    this.src = new Array(N);
    this.pos = new Float32Array(2 * N);
    this.dirty = true;
  }
  idx(i, j) { return j * (this.nu + 1) + i; }
  // param(u, v) → z（复数）
  setDomain(param) {
    for (let j = 0; j <= this.nv; j++) for (let i = 0; i <= this.nu; i++) {
      this.src[this.idx(i, j)] = param(i / this.nu, j / this.nv);
    }
  }
  // 计算像点与有效三角形；f 缺省为恒等映射
  map(f = (z) => z) {
    const { nu, nv, src } = this;
    const img = src.map((z) => (z && isFin(z) ? f(z) : null));
    const ok = (a, b) => {
      const za = src[a], zb = src[b], wa = img[a], wb = img[b];
      if (!wa || !wb || !isFin(wa) || !isFin(wb)) return false;
      const wm = f({ re: (za.re + zb.re) / 2, im: (za.im + zb.im) / 2 });
      if (!isFin(wm)) return false;
      const ch = Math.hypot(wb.re - wa.re, wb.im - wa.im);
      const dv = Math.hypot(wm.re - (wa.re + wb.re) / 2, wm.im - (wa.im + wb.im) / 2);
      return dv <= 0.3 * ch + 1e-12 && ch < 1e6;
    };
    const tris = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = this.idx(i, j), b = this.idx(i + 1, j), c = this.idx(i + 1, j + 1), d = this.idx(i, j + 1);
      const ac = ok(a, c);
      if (ac && ok(a, b) && ok(b, c)) tris.push(a, b, c);
      if (ac && ok(c, d) && ok(a, d)) tris.push(a, c, d);
    }
    const pos = new Float32Array(2 * this.N);
    img.forEach((w, k) => { if (w && isFin(w)) { pos[2 * k] = w.re; pos[2 * k + 1] = w.im; } });
    return { img, pos, tris: new Uint32Array(tris) };
  }
  // 设置当前要绘制的位置与三角形（可来自不同阶段的插值）
  setGeometry(pos, tris) { this.pos = pos; this.tris = tris; this.dirty = true; }
  draw(r, view, dpr, { alpha = 0.86, lineA = 0.4 } = {}) {
    if (!this.tris || !this.tris.length) return;
    const gl = r.gl;
    const prog = r.program(FS, VS, 'domain-mesh');
    if (!prog) return;
    if (!this.buf) {
      this.buf = { pos: gl.createBuffer(), uv: gl.createBuffer(), idx: gl.createBuffer(), vao: gl.createVertexArray() };
      gl.bindVertexArray(this.buf.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.uv);
      gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);
      const lu = gl.getAttribLocation(prog.p, 'a_uv');
      gl.enableVertexAttribArray(lu); gl.vertexAttribPointer(lu, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.pos);
      const lp = gl.getAttribLocation(prog.p, 'a_pos');
      gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(this.buf.vao);
    if (this.dirty) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.pos);
      gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf.idx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.tris, gl.DYNAMIC_DRAW);
      this.dirty = false;
    }
    gl.useProgram(prog.p);
    r.setUniforms(prog, {
      u_center: [view.center.re, view.center.im], u_ppu: view.ppu * dpr,
      u_res: [view.canvas.width, view.canvas.height], u_cells: this.cells, u_alpha: alpha, u_lineA: lineA,
    });
    gl.drawElements(gl.TRIANGLES, this.tris.length, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
}

// 两个阶段的线性插值（动画用）；三角形取两阶段都有效的部分
export function lerpGeometry(A, B, t) {
  const pos = new Float32Array(A.pos.length);
  for (let k = 0; k < pos.length; k++) pos[k] = A.pos[k] + (B.pos[k] - A.pos[k]) * t;
  return pos;
}
export function intersectTris(A, B) {
  const key = (t, k) => t[k] + ',' + t[k + 1] + ',' + t[k + 2];
  const s = new Set();
  for (let k = 0; k < B.length; k += 3) s.add(key(B, k));
  const out = [];
  for (let k = 0; k < A.length; k += 3) if (s.has(key(A, k))) out.push(A[k], A[k + 1], A[k + 2]);
  return new Uint32Array(out);
}
