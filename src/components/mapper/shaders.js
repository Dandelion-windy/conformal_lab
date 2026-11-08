// 映射器着色器：源图案只由源点 z 决定（固定间距的网格线 + 棋盘格），
// z 平面逐像素直接绘制；w 平面把源网格经 f 推前，再对每个像素用牛顿法求出精确原像，
// 因此两图的网格线、格子一一精确对应，且与视图范围无关
import { PRELUDE, COMPLEX_GLSL, XCOMPLEX_GLSL } from '../../core/gl.js';

const UNIFORMS = `uniform vec2 u_res; uniform vec2 u_center; uniform float u_ppu;
uniform vec2 u_pa; uniform vec2 u_pb; uniform vec2 u_pc; uniform float u_pt;
uniform float u_morph; uniform float u_dp; uniform vec4 u_rect;
uniform int u_mob; uniform vec2 u_ma; uniform vec2 u_mb; uniform vec2 u_mc; uniform vec2 u_md;
uniform vec2 u_ref; uniform float u_refR; uniform vec3 u_refP;`;

// 源图案的格距：直角网格 CART_STEP，对数极坐标每圈 POLAR_N 格；density = 1, 2, 3
const CART_STEP = [0.5, 0.25, 0.125];
const POLAR_N = [16, 24, 48];
const gridStep = (grid, density) => (grid === 'polar' ? (2 * Math.PI) / POLAR_N[density - 1] : CART_STEP[density - 1]);
// PATTERN 所需的 uniform
export const patternUniforms = ({ grid, density, fill, lines, cellA = 0.9 }) => ({
  u_gmode: grid === 'polar' ? 1 : 0, u_gstep: gridStep(grid, density), u_cells: fill ? 1 : 0, u_glines: lines ? 1 : 0, u_cellA: cellA,
});

// 源图案：u_gmode 0 直角（格距 u_gstep），1 对数极坐标（ln r 与 θ 的格距均为 u_gstep，格子是“共形正方形”）
const PATTERN =`uniform int u_gmode; uniform float u_gstep; uniform int u_cells; uniform int u_glines; uniform float u_cellA; uniform float u_dim;
float secArg(vec2 z) { float a = atan(z.y, z.x); return a < 0.0 ? a + TAU : a; }
float aaLine(float dpx, float width) { return 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.0, dpx); }
vec3 cellBase(vec2 z) {
  float r = length(z);
  vec3 hc = 0.5 + 0.5 * cos(TAU * (atan(z.y, z.x) / TAU + vec3(0.0, -1.0 / 3.0, 1.0 / 3.0)));
  return mix(vec3(0.58), hc, 0.18 + 0.62 * tanh(min(r / 2.2, 9.0)));   // tanh 的参数过大时部分实现会得到 NaN
}
// 必须在统一控制流中调用（使用了 fwidth）；返回 (颜色, 不透明度)
vec4 srcPattern(vec2 z) {
  float r = length(z);
  float a1 = atan(z.y, z.x), a2 = atan(-z.y, -z.x);
  float lr = log(max(r, 1e-30));
  vec2 g = u_gmode == 0 ? z / u_gstep : vec2(lr, a1) / u_gstep;
  vec2 fw = u_gmode == 0 ? fwidth(z) / u_gstep : vec2(fwidth(lr), min(fwidth(a1), fwidth(a2))) / u_gstep;
  fw = max(fw, vec2(1e-9));
  float fr = max(fwidth(r), 1e-12), fx = max(fwidth(z.x), 1e-12), fy = max(fwidth(z.y), 1e-12);
  float fa = max(min(fwidth(a1), fwidth(a2)), 1e-12), flr = max(fwidth(lr), 1e-12);
  vec2 cell = floor(g);
  float chk = mod(cell.x + cell.y, 2.0);
  vec3 base = cellBase(z);
  // 格子太小时淡化棋盘，避免摩尔纹
  float blur = smoothstep(0.3, 0.8, max(fw.x, fw.y));
  vec3 col = mix(base * (chk > 0.5 ? 1.0 : 0.64), base * 0.82, blur) * 0.92;
  float alpha = u_cells == 1 ? u_cellA : 0.0;
  if (u_glines == 1) {
    vec2 d = abs(fract(g + 0.5) - 0.5) / fw;
    vec2 fade = 1.0 - smoothstep(0.15, 0.38, fw);
    float lx = aaLine(d.x, 1.15) * fade.x, ly = aaLine(d.y, 1.15) * fade.y;
    // 冷色：x = 常数 或 射线 arg z = 常数；暖色：y = 常数 或 圆 |z| = 常数
    vec3 cool = vec3(0.36, 0.78, 1.0), warm = vec3(1.0, 0.76, 0.32);
    float lc = u_gmode == 0 ? lx : ly, lw = u_gmode == 0 ? ly : lx;
    float ax, ay;
    if (u_gmode == 0) { ax = aaLine(abs(z.x) / fx, 2.2); ay = aaLine(abs(z.y) / fy, 2.2); }
    else { float q = abs(fract(a1 / (0.5 * PI) + 0.5) - 0.5) * 0.5 * PI; ax = aaLine(q / fa, 2.2) * (1.0 - smoothstep(0.1, 0.3, fa * 4.0)); ay = 0.0; }
    float unit = aaLine(abs(r - 1.0) / fr, u_gmode == 0 ? 1.6 : 2.2);
    float white = max(max(ax, ay), unit);
    vec3 lineCol = mix(cool, warm, lw / max(lc + lw, 1e-6));
    float la = max(lc, lw) * 0.95;
    // 细分线：格子在屏幕上被放大（> 约 60 像素）时，在格内补画 1/4 间距的淡线，保持可读
    vec2 fw4 = fw * 4.0;
    vec2 d4 = abs(fract(g * 4.0 + 0.5) - 0.5) / fw4;
    vec2 fade4 = 1.0 - smoothstep(0.05, 0.12, fw4);
    float mx = aaLine(d4.x, 0.9) * fade4.x, my = aaLine(d4.y, 0.9) * fade4.y;
    float mc = u_gmode == 0 ? mx : my, mw = u_gmode == 0 ? my : mx;
    vec3 c1 = mix(col, cool, mc * 0.38);
    c1 = mix(c1, warm, mw * 0.38);
    col = alpha > 0.0 ? c1 : col;
    vec3 c2 = mix(col, lineCol, la);
    c2 = mix(c2, vec3(1.0), white);
    float a2_ = max(la, white);
    col = alpha > 0.0 ? c2 : mix(lineCol, vec3(1.0), white / max(a2_, 1e-6));
    alpha = alpha > 0.0 ? max(alpha, a2_) : a2_;
  }
  return vec4(col, alpha);
}`;

// w 平面画板曲线的原像：在 z 处求 w = f(z)，量出 w 到每条曲线的距离并换算成屏幕像素
// （距离沿法向 n 的变化率为 |(n·∂w/∂x, n·∂w/∂y)|），因此曲线的全部原像分支都被精确画出。
// 曲线来自数据纹理：每条 3 个纹素 (类型, x1, y1, x2)、(y2, r, θ0, Δθ)、(R, G, B, 线宽)；类型 0 直线 1 射线 2 线段 3 圆 4 圆弧
const WOBJ = `uniform sampler2D u_wobj; uniform int u_nw; uniform float u_dpr;
vec2 wNear(int ty, vec4 A, vec4 B, vec2 w) {
  vec2 p = A.yz;
  if (ty <= 2) {
    vec2 d = vec2(A.w, B.x) - p;
    float t = dot(w - p, d) / max(dot(d, d), 1e-30);
    if (ty >= 1) t = max(t, 0.0);
    if (ty == 2) t = min(t, 1.0);
    return p + t * d;
  }
  vec2 v = w - p; float L = length(v);
  vec2 u = L > 0.0 ? v / L : vec2(1.0, 0.0);
  if (ty == 4) {
    float th = atan(u.y, u.x);
    float rel = B.w > 0.0 ? mod(th - B.z, TAU) : mod(B.z - th, TAU);
    if (rel > abs(B.w)) {
      vec2 e0 = p + B.y * vec2(cos(B.z), sin(B.z)), e1 = p + B.y * vec2(cos(B.z + B.w), sin(B.z + B.w));
      return distance(w, e0) < distance(w, e1) ? e0 : e1;
    }
  }
  return p + B.y * u;
}
// ∂w/∂x、∂w/∂y 用相邻像素处的 z 直接求 f 的差分，并取前、后差分中较小者，避免在割线处把 f 的跳跃当成导数
vec2 dmin(vec2 a, vec2 b) { return dot(a, a) < dot(b, b) ? a : b; }
// 必须在统一控制流中调用（使用了 dFdx）
vec3 wObjects(vec3 col, vec2 z, float k) {
  vec2 ex = dFdx(z), ey = dFdy(z), w = Ft(z);
  vec2 jx = dmin(Ft(z + ex) - w, w - Ft(z - ex)), jy = dmin(Ft(z + ey) - w, w - Ft(z - ey));
  if (any(isnan(w)) || any(isinf(w)) || any(isnan(jx)) || any(isnan(jy)) || any(isinf(jx)) || any(isinf(jy))) return col;
  for (int i = 0; i < u_nw; i++) {
    vec4 A = texelFetch(u_wobj, ivec2(0, i), 0), B = texelFetch(u_wobj, ivec2(1, i), 0), S = texelFetch(u_wobj, ivec2(2, i), 0);
    vec2 dv = w - wNear(int(A.x + 0.5), A, B, w);
    float d = length(dv);
    vec2 n = d > 0.0 ? dv / d : vec2(0.0);
    float g = d > 0.0 ? length(vec2(dot(n, jx), dot(n, jy))) : max(length(jx), length(jy));
    float px = d / max(g, 1e-30);
    if (isnan(px)) continue;
    float wd = S.w * u_dpr;
    col = mix(col, vec3(0.016, 0.024, 0.055), aaLine(px, wd + 2.2 * u_dpr) * 0.55 * k);
    col = mix(col, S.rgb, aaLine(px, wd) * k);
  }
  return col;
}`;

const ft = (expr, xexpr = null) => `vec2 F(vec2 z) { return ${expr}; }
// 变形动画：分式线性变换沿单参数子群 T_t（每一步都共形），其他函数用线性插值
vec2 Ft(vec2 z) {
  if (u_morph >= 1.0) return F(z);
  if (u_mob == 1) return cdiv(cmul(u_ma, z) + u_mb, cmul(u_mc, z) + u_md);
  return mix(z, F(z), u_morph);
}
${xexpr ? `vec3 FXX(vec3 Z) { return ${xexpr}; }
// 着色用的扩展指数版本：e^z 在 Re z = −1000 处也有正确的模与辐角
vec3 FtX(vec3 Z) { return u_morph >= 1.0 ? FXX(Z) : xfrom(Ft(xtoc(Z))); }` : ''}`;

// z 平面：背景（f(z) 的域着色）+ 源区域内的图案；源区域外压暗。defs 同 meshShaders
export function zShader(expr, mask, xexpr, defs = '') {
  return `${UNIFORMS}
out vec4 o;
${PRELUDE}
${PATTERN}
${defs}
${ft(expr, xexpr)}
${WOBJ}
bool inSrc(vec2 z) { return ${mask}; }
void main() {
  vec2 z = u_center + (gl_FragCoord.xy - 0.5 * u_res) / u_ppu;
  vec3 bg = colorOfX(FtX(xfrom(z)));
  vec4 p = srcPattern(z);
  bool ins = inSrc(z);
  vec3 col = ins ? mix(bg, p.rgb, p.a) : bg * u_dim;
  if (u_nw > 0) col = wObjects(col, z, ins ? 1.0 : 0.6);
  o = vec4(col, 1.0);
}`;
}

// w 平面背景：w 的域着色（源区域的像以外压暗）
export function wBgShader() {
  return `${UNIFORMS}
out vec4 o;
${PRELUDE}
uniform float u_dim;
void main() {
  vec2 w = u_center + (gl_FragCoord.xy - 0.5 * u_res) / u_ppu;
  o = vec4(colorOf(w) * u_dim, 1.0);
}`;
}

// w 平面：源网格推前（顶点着色器求 f），片元着色器用牛顿法把插值得到的 z 修正为该像素的精确原像
// 顶点像点用扩展指数计算：模超出浮点范围时按方向截断到 |w| = 1e6，不会出现 ∞
const VPOS = `vec2 vertW(vec2 z, out float bad) {
  vec3 W = FtX(xfrom(z));
  float lr = xlog2abs(W);
  bad = (isnan(lr) || isnan(W.x) || isnan(W.y)) ? 1.0 : 0.0;
  if (bad > 0.0 || (W.x == 0.0 && W.y == 0.0)) return vec2(0.0);
  return normalize(W.xy) * exp2(clamp(lr, -126.0, 19.9));
}`;

// defs：expr / xexpr 用到的辅助函数（例如分步映射的各个步骤），放在 F 之前
export function meshShaders(expr, mask, holo, xexpr, defs = '') {
  const vs = `#version 300 es
precision highp float; precision highp int;
${UNIFORMS}
in vec2 a_z; in float a_h;
out vec2 v_z; out float v_h; out float v_bad;
${COMPLEX_GLSL}
${XCOMPLEX_GLSL}
${defs}
${ft(expr, xexpr)}
${VPOS}
void main() {
  float bad;
  vec2 w = vertW(a_z, bad);
  v_z = a_z; v_h = a_h; v_bad = bad;
  gl_Position = vec4((w - u_center) * u_ppu / (0.5 * u_res), 0.0, 1.0);
}`;
  const step = holo
    ? `vec2 f0 = Ft(z) - w0;
    vec2 d = (Ft(z + vec2(hh, 0.0)) - Ft(z)) / hh;
    vec2 dz = cdiv(f0, d);`
    : `vec2 f0 = Ft(z) - w0;
    vec2 fx = (Ft(z + vec2(hh, 0.0)) - Ft(z)) / hh, fy = (Ft(z + vec2(0.0, hh)) - Ft(z)) / hh;
    float det = fx.x * fy.y - fy.x * fx.y;
    vec2 dz = vec2(fy.y * f0.x - fy.x * f0.y, -fx.y * f0.x + fx.x * f0.y) / det;`;
  const fs = `${UNIFORMS}
in vec2 v_z; in float v_h; in float v_bad;
out vec4 o;
${PRELUDE}
${PATTERN}
${defs}
${ft(expr)}
bool inSrc(vec2 z) { return ${mask}; }
void main() {
  vec2 w0 = u_center + (gl_FragCoord.xy - 0.5 * u_res) / u_ppu;
  vec2 z = v_z;
  for (int k = 0; k < 5; k++) {
    float hh = max(0.004 * v_h, 2e-6 * length(z) + 1e-12);
    ${step}
    if (any(isnan(dz)) || any(isinf(dz))) break;
    float L = length(dz);
    if (L > 1.5 * v_h) dz *= 1.5 * v_h / L;   // 阻尼：只在本格子附近寻找原像
    z -= dz;
  }
  vec2 fz = Ft(z);
  vec4 p = srcPattern(z);
  vec3 bg = colorOf(w0);
  float tol = max(2.0 / u_ppu, 2e-5 * length(w0));
  if (v_bad > 1e-5 || !(length(fz - w0) < tol) || length(z - v_z) > 3.0 * v_h || !inSrc(z)) discard;
  vec2 dr = z - u_ref;
  float dk = length(dr);
  gl_FragDepth = clamp(0.998 * dk / (dk + u_refR) + 1e-3 * fract(atan(dr.y, dr.x) / TAU + 0.3), 0.0, 0.9999);
  o = vec4(mix(bg, p.rgb, p.a), 1.0);
}`;
  return { vs, fs };
}

// ---------------- 黎曼球面（单位球，球心在原点，北极 N = ∞） ----------------
const SPH = `uniform vec3 u_cam; uniform vec3 u_fwd; uniform vec3 u_right; uniform vec3 u_up; uniform vec2 u_tan; uniform float u_pix;
vec3 rayDir() { vec2 p = (gl_FragCoord.xy / u_res) * 2.0 - 1.0; return normalize(u_fwd + p.x * u_tan.x * u_right + p.y * u_tan.y * u_up); }
// 与单位球的前交点；未命中时取离射线最近的球面点（使导数在轮廓处连续）
bool hitUnit(vec3 dir, out vec3 P, out float edge) {
  float b = dot(u_cam, dir), c = dot(u_cam, u_cam) - 1.0, h = b * b - c;
  edge = h;
  if (h < 0.0) { P = normalize(u_cam - b * dir); return false; }
  P = u_cam + (-b - sqrt(h)) * dir;
  return true;
}
vec2 stereo(vec3 P) { float d = P.x * P.x + P.y * P.y; return P.z < 0.0 ? P.xy / (1.0 - P.z) : P.xy * (1.0 + P.z) / max(d, 1e-30); }
vec3 shade(vec3 col, vec3 P, vec3 dir) {
  vec3 L = normalize(-u_fwd * 0.6 + u_up * 0.7 - u_right * 0.4);
  float dif = max(dot(P, L), 0.0), rim = pow(1.0 - abs(dot(P, dir)), 3.0);
  float spec = pow(max(dot(reflect(-L, P), -dir), 0.0), 48.0);
  return col * (0.7 + 0.38 * dif) + vec3(0.25, 0.32, 0.45) * rim * 0.3 + vec3(spec * 0.18);
}
vec3 sky() { vec2 p = (gl_FragCoord.xy / u_res) * 2.0 - 1.0; return vec3(0.035, 0.05, 0.10) * (1.0 - 0.35 * length(p)) + vec3(0.01, 0.015, 0.03); }`;

const INV_STEREO = `vec3 invStereo(vec2 w) {
  float r2 = dot(w, w);
  if (r2 <= 1.0) return vec3(2.0 * w, r2 - 1.0) / (r2 + 1.0);
  vec2 q = w / r2; float q2 = dot(q, q);
  return vec3(2.0 * q, 1.0 - q2) / (1.0 + q2);
}`;

// z 球面：球面点 P ↦ z = stereo(P)，直接绘制源图案（网格线一直延伸到 N）
export function sphereZShader(expr, mask, xexpr) {
  return `${UNIFORMS}
${SPH}
out vec4 o;
${PRELUDE}
${PATTERN}
${ft(expr, xexpr)}
${WOBJ}
bool inSrc(vec2 z) { return ${mask}; }
void main() {
  vec3 dir = rayDir(), P; float edge;
  bool hit = hitUnit(dir, P, edge);
  vec2 z = stereo(P);
  vec3 bg = colorOfX(FtX(sphereX(P)));
  vec4 p = srcPattern(z);
  bool ins = inSrc(z);
  vec3 col = ins ? mix(bg, p.rgb, p.a) : bg * u_dim;
  if (u_nw > 0) col = wObjects(col, z, ins ? 1.0 : 0.6);
  o = vec4(hit ? shade(col, P, dir) : sky(), 1.0);
}`;
}

// w 球面背景：w 的域着色（像以外压暗）
export function sphereWBgShader() {
  return `${UNIFORMS}
${SPH}
out vec4 o;
${PRELUDE}
uniform float u_dim;
void main() {
  vec3 dir = rayDir(), P; float edge;
  bool hit = hitUnit(dir, P, edge);
  vec3 col = colorOfX(sphereX(P)) * u_dim;
  o = vec4(hit ? shade(col, P, dir) : sky(), 1.0);
}`;
}

// w 球面：源网格经 f 推到球面上；片元着色器在 |w| ≤ 1 时解 f(z) = w，|w| > 1 时解 1/f(z) = 1/w（换坐标卡），
// 因此极点与 ∞ 附近同样精确；背面的三角形因原像不在本格子附近而被丢弃
export function sphereMeshShaders(expr, mask, holo, xexpr) {
  const vs = `#version 300 es
precision highp float; precision highp int;
${UNIFORMS}
uniform vec3 u_cam; uniform vec3 u_fwd; uniform vec3 u_right; uniform vec3 u_up; uniform vec2 u_tan;
in vec2 a_z; in float a_h;
out vec2 v_z; out float v_h; out float v_bad;
${COMPLEX_GLSL}
${XCOMPLEX_GLSL}
${INV_STEREO}
${ft(expr, xexpr)}
void main() {
  vec3 W = FtX(xfrom(a_z));
  float lr = xlog2abs(W), bad = 0.0;
  vec3 P;
  if (isnan(lr) || isnan(W.x)) { P = vec3(0.0, 0.0, -1.0); bad = 1.0; }
  else if (lr <= 0.0) P = invStereo(xtoc(W));
  else { vec2 q = xtoc(xinv(xconj(W))); float q2 = dot(q, q); P = vec3(2.0 * q, 1.0 - q2) / (1.0 + q2); }
  v_z = a_z; v_h = a_h; v_bad = bad;
  vec3 v = P - u_cam;
  float zc = dot(v, u_fwd);
  gl_Position = vec4(dot(v, u_right) / u_tan.x, dot(v, u_up) / u_tan.y, 0.0, max(zc, 1e-4));
}`;
  const G = 'vec2 G(vec2 z) { vec2 f = Ft(z); return chartInv ? cinv(f) : f; }';
  const step = holo
    ? `vec2 g0 = G(z) - W0;
    vec2 d = (G(z + vec2(hh, 0.0)) - G(z)) / hh;
    vec2 dz = cdiv(g0, d);`
    : `vec2 g0 = G(z) - W0;
    vec2 fx = (G(z + vec2(hh, 0.0)) - G(z)) / hh, fy = (G(z + vec2(0.0, hh)) - G(z)) / hh;
    float det = fx.x * fy.y - fy.x * fx.y;
    vec2 dz = vec2(fy.y * g0.x - fy.x * g0.y, -fx.y * g0.x + fx.x * g0.y) / det;`;
  const fs = `${UNIFORMS}
${SPH}
in vec2 v_z; in float v_h; in float v_bad;
out vec4 o;
${PRELUDE}
${PATTERN}
${INV_STEREO}
${ft(expr)}
bool inSrc(vec2 z) { return ${mask}; }
bool chartInv;
${G}
void main() {
  vec3 dir = rayDir(), P0; float edge;
  bool hit = hitUnit(dir, P0, edge);
  vec2 w0 = stereo(P0);
  chartInv = dot(w0, w0) > 1.0;
  vec2 W0 = chartInv ? cinv(w0) : w0;
  vec2 z = v_z;
  for (int k = 0; k < 6; k++) {
    float hh = max(0.004 * v_h, 2e-6 * length(z) + 1e-12);
    ${step}
    if (any(isnan(dz)) || any(isinf(dz))) break;
    float L = length(dz);
    if (L > 1.5 * v_h) dz *= 1.5 * v_h / L;
    z -= dz;
  }
  vec2 fz = Ft(z);
  vec4 p = srcPattern(z);
  vec3 bg = colorOfX(sphereX(P0));
  vec3 Pz = any(isinf(fz)) || length(fz) > 1e18 ? vec3(0.0, 0.0, 1.0) : invStereo(fz);
  if (!hit || v_bad > 1e-5 || !(length(Pz - P0) < 3.0 * u_pix) || length(z - v_z) > 3.0 * v_h || !inSrc(z)) discard;
  vec3 Ps = invStereo(z);
  gl_FragDepth = clamp(0.998 * 0.5 * length(Ps - u_refP) + 1e-3 * fract(atan(Ps.y, Ps.x) / TAU + 0.3), 0.0, 0.9999);
  o = vec4(shade(mix(bg, p.rgb, p.a), P0, dir), 1.0);
}`;
  return { vs, fs };
}

// 数值映射：CPU 提供像点，片元阶段仍复用同一源图案与域着色。
// 源坐标采用有界坐标卡，避免在无穷远附近插值巨大复数。
export function sampledMeshShaders(chart) {
  const vs = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform vec2 u_center; uniform float u_ppu;
in vec2 a_z; in vec2 a_w;
out vec2 v_z;
void main() {
  v_z = a_z;
  gl_Position = vec4((a_w - u_center) * u_ppu / (0.5 * u_res), 0.0, 1.0);
}`;
  const fs = `uniform vec2 u_res; uniform vec2 u_center; uniform float u_ppu;
uniform vec2 u_chart;
in vec2 v_z;
out vec4 o;
${PRELUDE}
${PATTERN}
void main() {
  vec2 z = ${chart};
  vec2 w = u_center + (gl_FragCoord.xy - 0.5 * u_res) / u_ppu;
  vec4 p = srcPattern(z);
  o = vec4(mix(colorOf(w), p.rgb, p.a), 1.0);
}`;
  return { vs, fs };
}
