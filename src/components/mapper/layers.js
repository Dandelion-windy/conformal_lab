// 映射图层：页面借用映射实验室的着色器（shaders.js），画“源区域 + 它在某个映射下的像”。
// 图案（棋盘格 + 网格线）只由源点 z 决定，所以两边严格对应：
// · SourcePlane：z 平面逐像素画源区域内的图案，背景为源点处 f 的域着色（color.mode = 4 时为暗色）
// · PushedLayer：源网格经 f 推前到 w 平面，片元着色器用牛顿法求每个像素的精确原像并按区域判定式裁剪，
//   极点、割线附近不会出现被拉长或错位的三角形，动画中也不会闪烁
import { renderer } from '../../core/gl.js';
import { SourceMeshGL } from './gpu.js';
import { zShader, wBgShader, meshShaders, sampledMeshShaders, patternUniforms } from './shaders.js';

// 着色器声明了、但这些页面不用的 uniform（变形动画、选叶参考点、画板曲线）
const FIXED = {
  u_morph: 1, u_mob: 0, u_pa: [0, 0], u_pb: [0, 0], u_pc: [0, 0], u_pt: 0, u_rect: [0, 0, 0, 0],
  u_lines: 0, u_lineStep: 1, u_ref: [0, 0], u_refR: 1, u_refP: [0, 0, -1], u_nw: 0,
};

class MapLayer {
  constructor() {
    this.pattern = { grid: 'cart', density: 2, fill: true, lines: true, cellA: 0.9 };
    this.color = { mode: 4, bright: 0.6, dim: 1 };   // 背景域着色（u_colorMode / u_bright）与源区域外的压暗系数
    this.uniforms = {};                               // 映射本身的 uniform，例如 matUniforms(M)、u_pa、u_pt
    this.src = null; this.map = null; this.prog = null;
  }
  allUniforms() {
    const c = this.color;
    return { ...FIXED, ...patternUniforms(this.pattern), u_colorMode: c.mode, u_bright: c.bright, u_dim: c.dim, u_dp: this.src?.dp ?? 0, ...this.uniforms };
  }
  // src：{ mask, dp }（见 source.js 的 domainSource）
  setSource(src) { this.src = src; this.compile(); }
  // map：{ glsl, xglsl, defs?, holo? }，glsl 以 z（vec2）、xglsl 以 Z（扩展指数 vec3）为自变量；同一个对象不会重复编译
  setMap(map) { if (map === this.map) return; this.map = map; this.compile(); }
  compile() {
    const r = renderer();
    if (r.ok && this.src && this.map) this.prog = this.build(r, this.map, this.src.mask);
  }
}

export class SourcePlane extends MapLayer {
  constructor(view) {
    super();
    view.bg = () => ({ prog: this.prog, uniforms: this.allUniforms() });
  }
  build(r, m, mask) { return r.program(zShader(m.glsl, mask, m.xglsl, m.defs || '')); }
}

let wBgProg;
export class PushedLayer extends MapLayer {
  // bg：同时画 w 平面的域着色背景（与 SourcePlane 的背景同色即对应点）
  constructor(view, { bg = false } = {}) {
    super();
    this.mesh = new SourceMeshGL();
    if (bg) {
      wBgProg ??= renderer().ok ? renderer().program(wBgShader()) : null;
      view.bg = () => ({ prog: wBgProg, uniforms: this.allUniforms() });
    }
    view.glLayers.push((r, v, dpr) => this.mesh.draw(r, v, dpr, this.prog, this.allUniforms()));
  }
  // data 为 gridMesh 的结果，可在多个图层间共享
  setSource(src, data = src.build()) { this.mesh.set(data); super.setSource(src); }
  build(r, m, mask) {
    const { vs, fs } = meshShaders(m.glsl, mask, m.holo !== false, m.xglsl, m.defs || '');
    return r.program(fs, vs);
  }
}

export const IDENTITY_MAP = { glsl: 'z', xglsl: 'Z' };
// 分式线性变换，系数由 uniform u_ma…u_md 给出（见 gl.js 的 matUniforms）
export const MOBIUS_MAP = {
  glsl: 'cdiv(cmul(u_ma, z) + u_mb, cmul(u_mc, z) + u_md)',
  xglsl: 'xdiv(xadd(xmul(xfrom(u_ma), Z), xfrom(u_mb)), xadd(xmul(xfrom(u_mc), Z), xfrom(u_md)))',
};
// compile() 的结果；参数 a、t 通过 uniform u_pa、u_pt 传入
export const exprMap = (fn) => ({ glsl: fn.glsl, xglsl: fn.xglsl, holo: fn.holomorphic });

// 分步映射：fns 为各步 compile() 的结果，stageMap(fns, k) 是前 k 步的复合
const stepDefs = (fns) => fns.map((fn, i) => `vec2 stepF${i}(vec2 z) { return ${fn.glsl}; }\nvec3 stepX${i}(vec3 Z) { return ${fn.xglsl}; }`).join('\n');
const nest = (k, name, arg) => { let e = arg; for (let i = 0; i < k; i++) e = `${name}${i}(${e})`; return e; };
const allHolo = (fns) => fns.every((f) => f.holomorphic);
export function stageMap(fns, k) {
  return { glsl: nest(k, 'stepF', 'z'), xglsl: nest(k, 'stepX', 'Z'), defs: stepDefs(fns), holo: allHolo(fns) };
}
// 第 a 步与第 b 步之间的线性插值 (1 − t)·A + t·B（只作示意），t 由 uniform u_pt 给出
export function stageMixMap(fns, a, b) {
  return {
    glsl: `mix(${nest(a, 'stepF', 'z')}, ${nest(b, 'stepF', 'z')}, u_pt)`,
    xglsl: `xadd(xmul(xfrom(vec2(1.0 - u_pt, 0.0)), ${nest(a, 'stepX', 'Z')}), xmul(xfrom(vec2(u_pt, 0.0)), ${nest(b, 'stepX', 'Z')}))`,
    defs: stepDefs(fns), holo: allHolo(fns),
  };
}

// 没有闭式 GLSL 表达式的数值映射，和解析映射共享缓冲、着色与视图生命周期。
export class SampledLayer extends MapLayer {
  constructor(view) {
    super();
    this.mesh = new SourceMeshGL();
    view.glLayers.push((r, v, dpr) => this.mesh.draw(r, v, dpr, this.prog, this.allUniforms()));
  }
  setMesh(data, chart = 'v_z') {
    this.mesh.set(data);
    const r = renderer();
    if (r.ok) {
      const { vs, fs } = sampledMeshShaders(chart);
      this.prog = r.program(fs, vs);
    }
  }
}
