// 源网格的 GPU 缓冲：顶点为源点 z 与局部格子尺寸 h，像点由顶点着色器计算
export class SourceMeshGL {
  constructor() { this.data = null; this.dirty = false; this.buf = null; }
  set(data) { this.data = data; this.dirty = true; }
  draw(r, view, dpr, prog, uniforms) {
    this.drawWith(r, prog, { u_center: [view.center.re, view.center.im], u_ppu: view.ppu * dpr, u_res: [view.canvas.width, view.canvas.height], ...uniforms });
  }
  drawWith(r, prog, uniforms) {
    if (!prog || !this.data) return;
    const gl = r.gl;
    if (!this.buf) this.buf = { z: gl.createBuffer(), h: gl.createBuffer(), idx: gl.createBuffer(), vao: gl.createVertexArray() };
    const B = this.buf;
    gl.bindVertexArray(B.vao);
    if (this.dirty) {
      gl.bindBuffer(gl.ARRAY_BUFFER, B.z); gl.bufferData(gl.ARRAY_BUFFER, this.data.z, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, B.h); gl.bufferData(gl.ARRAY_BUFFER, this.data.h, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.data.idx, gl.STATIC_DRAW);
      this.dirty = false;
    }
    // 不同程序的属性位置可能不同，每次绘制时重新指定
    const lz = gl.getAttribLocation(prog.p, 'a_z'), lh = gl.getAttribLocation(prog.p, 'a_h');
    gl.bindBuffer(gl.ARRAY_BUFFER, B.z); gl.enableVertexAttribArray(lz); gl.vertexAttribPointer(lz, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, B.h); gl.enableVertexAttribArray(lh); gl.vertexAttribPointer(lh, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.idx);
    gl.useProgram(prog.p);
    r.setUniforms(prog, uniforms);
    // 深度 = 原像到参考点的距离：f 不单叶时，每个像素只保留离参考点最近的那个原像（同一叶）
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
    gl.drawElements(gl.TRIANGLES, this.data.idx.length, gl.UNSIGNED_INT, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
