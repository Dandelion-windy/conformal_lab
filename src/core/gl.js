// 共享 WebGL2 渲染器：所有视图共用一个离屏上下文（避免浏览器 WebGL 上下文数量上限），
// 渲染后用 drawImage 拷贝到各视图自己的 2D 画布
import COMPLEX from '../glsl/complex.glsl';
import COLOR from '../glsl/color.glsl';
import XCOMPLEX from '../glsl/xcomplex.glsl';

const HEADER = '#version 300 es\nprecision highp float;\nprecision highp int;\n';
const FS_VERT = `#version 300 es
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
export const PRELUDE = COMPLEX + '\n' + XCOMPLEX + '\n' + COLOR + '\n';
export const COMPLEX_GLSL = COMPLEX;
export const XCOMPLEX_GLSL = XCOMPLEX;

class Renderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = 1;
    const gl = this.canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true, alpha: true, depth: true });
    this.gl = gl;
    this.ok = !!gl;
    this.programs = new Map();
    this.errors = new Map();
    if (gl) this.vao = gl.createVertexArray();
  }
  ensure(w, h) {
    const c = this.canvas;
    if (c.width < w || c.height < h) {
      c.width = Math.max(c.width, Math.ceil(w));
      c.height = Math.max(c.height, Math.ceil(h));
    }
  }
  // 编译并缓存程序；失败返回 null，错误信息存入 this.errors
  program(fsBody, vs = FS_VERT, key = null) {
    const k = key || vs + '\n//--\n' + fsBody;
    if (this.programs.has(k)) return this.programs.get(k);
    if (this.errors.has(k)) return null;
    const gl = this.gl;
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    try {
      const p = gl.createProgram();
      gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, mk(gl.FRAGMENT_SHADER, HEADER + fsBody));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const uniforms = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        uniforms[info.name] = { loc: gl.getUniformLocation(p, info.name), type: info.type };
      }
      const prog = { p, uniforms, attribs: {} };
      if (this.programs.size > 60) this.programs.delete(this.programs.keys().next().value);
      this.programs.set(k, prog);
      return prog;
    } catch (e) {
      console.warn('[shader]', e.message);
      this.errors.set(k, e.message);
      return null;
    }
  }
  setUniforms(prog, u) {
    const gl = this.gl;
    for (const name in u) {
      const info = prog.uniforms[name];
      if (!info) continue;
      const v = u[name], L = info.loc;
      switch (info.type) {
        case gl.FLOAT: gl.uniform1f(L, v); break;
        case gl.FLOAT_VEC2: gl.uniform2f(L, v[0], v[1]); break;
        case gl.FLOAT_VEC3: gl.uniform3f(L, v[0], v[1], v[2]); break;
        case gl.FLOAT_VEC4: gl.uniform4f(L, v[0], v[1], v[2], v[3]); break;
        case gl.INT: case gl.BOOL: gl.uniform1i(L, v | 0); break;
        case gl.FLOAT_MAT3: gl.uniformMatrix3fv(L, false, v); break;
        default: break;
      }
    }
  }
  begin(w, h) {
    const gl = this.gl;
    this.ensure(w, h);
    this.w = w; this.h = h;
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  fullscreen(prog, uniforms) {
    const gl = this.gl;
    gl.useProgram(prog.p);
    this.setUniforms(prog, uniforms);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  // 把当前帧（左下角 w×h 区域）拷贝到 2D 上下文
  copyTo(ctx) {
    const H = this.canvas.height;
    ctx.drawImage(this.canvas, 0, H - this.h, this.w, this.h, 0, 0, this.w, this.h);
  }
}

let inst = null;
export function renderer() {
  if (!inst) inst = new Renderer();
  return inst;
}

// 平面视图的背景着色程序：F(z) 由 GLSL 表达式给出；xExpr（自变量为 vec3 Z）存在时用扩展指数着色，避免上溢/下溢
export function planeShader(glslExpr, extra = '', xExpr = null) {
  return `uniform vec2 u_res; uniform vec2 u_center; uniform float u_ppu;
uniform vec2 u_pa; uniform vec2 u_pb; uniform vec2 u_pc; uniform float u_pt;
out vec4 outColor;
${PRELUDE}
${extra}
vec2 F(vec2 z) { return ${glslExpr}; }
${xExpr ? `vec3 FXX(vec3 Z) { return ${xExpr}; }` : ''}
void main() {
  vec2 z = u_center + (gl_FragCoord.xy - 0.5 * u_res) / u_ppu;
  outColor = vec4(${xExpr ? 'colorOfX(FXX(xfrom(z)))' : 'colorOf(F(z))'}, 1.0);
}`;
}

// 背景为 colorOf(G(M·z))：M 为分式线性变换（uniform 传入），G 为可选的后续 GLSL 表达式（以 m 为自变量）
export function mobiusShader(post = 'm') {
  return planeShader(`G(cdiv(cmul(u_ma, z) + u_mb, cmul(u_mc, z) + u_md))`,
    `uniform vec2 u_ma; uniform vec2 u_mb; uniform vec2 u_mc; uniform vec2 u_md;\nvec2 G(vec2 m) { return ${post}; }`);
}
export const matUniforms = (M) => ({ u_ma: [M[0].re, M[0].im], u_mb: [M[1].re, M[1].im], u_mc: [M[2].re, M[2].im], u_md: [M[3].re, M[3].im] });
