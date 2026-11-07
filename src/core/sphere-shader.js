// 黎曼球面光线投射着色器：球面（可半透明，可平移/旋转）+ z=0 平面，二者纹理均由 colorOf(F(z)) 给出
import { PRELUDE } from './gl.js';

export function sphereShader(glslExpr, xExpr = glslExpr === 'z' ? 'Z' : null) {
  return `uniform vec2 u_res;
uniform vec3 u_cam; uniform vec3 u_fwd; uniform vec3 u_right; uniform vec3 u_up; uniform vec2 u_tan;
uniform vec3 u_sc; uniform float u_sr; uniform mat3 u_srot;
uniform vec2 u_texOff; uniform float u_texScale;
uniform float u_sAlpha; uniform float u_pAlpha; uniform float u_pR; uniform int u_plane; uniform int u_sphere;
uniform vec2 u_pa; uniform vec2 u_pb; uniform vec2 u_pc; uniform float u_pt;
out vec4 o;
${PRELUDE}
vec2 F(vec2 z) { return ${glslExpr}; }
${xExpr ? `vec3 FXX(vec3 Z) { return ${xExpr}; }` : ''}
vec3 texZX(vec3 P) {
  vec3 q = u_srot * ((P - u_sc) / u_sr);
  return xadd(xmul(xfrom(vec2(u_texScale, 0.0)), sphereX(q)), xfrom(u_texOff));
}
vec2 texZ(vec3 P) {
  vec3 q = u_srot * ((P - u_sc) / u_sr);
  float d = max(1.0 - q.z, 1e-9);
  return u_texOff + u_texScale * q.xy / d;
}
vec3 bgColor(vec2 p) {
  float v = 1.0 - 0.35 * length(p);
  return vec3(0.035, 0.05, 0.10) * v + vec3(0.01, 0.015, 0.03);
}
void main() {
  vec2 p = (gl_FragCoord.xy / u_res) * 2.0 - 1.0;
  vec3 dir = normalize(u_fwd + p.x * u_tan.x * u_right + p.y * u_tan.y * u_up);
  vec3 oc = u_cam - u_sc;
  float b = dot(oc, dir);
  float h = b * b - (dot(oc, oc) - u_sr * u_sr);
  bool hitS = h > 0.0 && u_sphere == 1;
  float sq = sqrt(max(h, 0.0));
  float t1 = -b - sq, t2 = -b + sq;
  vec3 P1 = u_cam + t1 * dir, P2 = u_cam + t2 * dir;
  // 平面交点
  float tp = abs(dir.z) > 1e-6 ? -u_cam.z / dir.z : -1.0;
  vec3 X = u_cam + max(tp, 0.0) * dir;
  float rX = length(X.xy);
  bool hitP = u_plane == 1 && tp > 0.0 && rX < u_pR;
  // 平面点 → 从当前北极投影到球面 → 纹理坐标
  vec3 N = u_sc + vec3(0.0, 0.0, u_sr);
  vec3 D = X - N;
  vec3 PX = N + D * (2.0 * u_sr * N.z / max(dot(D, D), 1e-12));
  // 所有颜色在统一控制流中计算（fwidth 要求）
  vec3 cF = ${xExpr ? 'colorOfX(FXX(texZX(P1)))' : 'colorOf(F(texZ(P1)))'};
  vec3 cB = ${xExpr ? 'colorOfX(FXX(texZX(P2)))' : 'colorOf(F(texZ(P2)))'};
  vec3 cP = ${xExpr ? 'colorOfX(FXX(texZX(PX)))' : 'colorOf(F(texZ(PX)))'};
  vec3 L = normalize(-u_fwd * 0.6 + u_up * 0.7 - u_right * 0.4);
  vec3 n1 = (P1 - u_sc) / u_sr;
  float dif = max(dot(n1, L), 0.0);
  float rim = pow(1.0 - abs(dot(n1, dir)), 3.0);
  float spec = pow(max(dot(reflect(-L, n1), -dir), 0.0), 40.0);
  cF = cF * (0.62 + 0.45 * dif) + vec3(0.25, 0.32, 0.45) * rim * 0.35 + vec3(spec * 0.28);
  cB *= 0.5;
  float pa = u_pAlpha * (1.0 - smoothstep(0.82 * u_pR, u_pR, rX));
  // 由近到远合成：球面前表面、平面、球面后表面、背景
  vec3 col = vec3(0.0); float acc = 0.0;
  float tS1 = hitS ? t1 : 1e9, tS2 = hitS ? t2 : 1e9, tP = hitP ? tp : 1e9;
  for (int k = 0; k < 3; k++) {
    float tm = min(tS1, min(tP, tS2));
    if (tm > 1e8) break;
    vec3 c; float a;
    if (tm == tS1) { c = cF; a = u_sAlpha; tS1 = 1e9; }
    else if (tm == tP) { c = cP; a = pa; tP = 1e9; }
    else { c = cB; a = u_sAlpha; tS2 = 1e9; }
    if (tm <= 0.0) continue;
    col += (1.0 - acc) * a * c; acc += (1.0 - acc) * a;
  }
  col += (1.0 - acc) * bgColor(p);
  o = vec4(col, 1.0);
}`;
}
