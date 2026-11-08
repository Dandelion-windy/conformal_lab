// 共享网格的 GPU 缓冲：z 为源坐标，h 为局部尺寸；数值映射可另提供预计算的 w。
export class SourceMeshGL {
  constructor() { this.data = null; this.dirty = false; this.buf = null; }
  set(data) { this.data = data; this.dirty = true; }
  draw(r, view, dpr, prog, uniforms) {
    this.drawWith(r, prog, { u_center: [view.center.re, view.center.im], u_ppu: view.ppu * dpr, u_res: [view.canvas.width, view.canvas.height], ...uniforms });
  }
  drawWith(r, prog, uniforms) {
    if (!prog || !this.data) return;
    const gl = r.gl;
    if (!this.buf) this.buf = { attrs: {}, idx: gl.createBuffer(), vao: gl.createVertexArray() };
    const B = this.buf;
    gl.bindVertexArray(B.vao);
    for (const [name, location] of Object.entries(prog.attribs)) {
      const key = name.slice(2), size = key === 'h' ? 1 : 2;
      B.attrs[key] ||= gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, B.attrs[key]);
      if (this.dirty) gl.bufferData(gl.ARRAY_BUFFER, this.data[key], gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.idx);
    if (this.dirty) gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.data.idx, gl.STATIC_DRAW);
    this.dirty = false;
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
