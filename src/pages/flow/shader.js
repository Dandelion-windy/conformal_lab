// 场的着色器：流动（复势 W：流线 Im W、等势线 Re W、背景为速度大小）与温度场（u = c + Im F）
import { PRELUDE } from '../../core/gl.js';

// body：GLSL 代码，需定义 vec2 W(vec2 z) 与 bool solid(vec2 z)
export function fieldShader(body, mode = 'flow') {
  return `uniform vec2 u_res; uniform vec2 u_center; uniform float u_ppu;
uniform vec2 u_pa; uniform vec2 u_pb; uniform vec2 u_pc; uniform float u_pt;
uniform float u_dpsi; uniform float u_dphi; uniform float u_U; uniform float u_base; uniform int u_showPhi; uniform int u_showPsi; uniform int u_bg;
out vec4 o;
${PRELUDE}
${body}
float contour(float f, float step, float px) {
  float d = abs(fract(f / step + 0.5) - 0.5) * step;
  float fw = max(fwidth(f), 1e-9);
  float dens = 1.0 - smoothstep(0.15, 0.45, fw / step);
  return (1.0 - smoothstep(0.6, 1.6, d / fw)) * dens;
}
vec3 speedMap(float t) {
  vec3 a = vec3(0.03, 0.05, 0.12), b = vec3(0.05, 0.27, 0.42), c = vec3(0.16, 0.60, 0.62), d = vec3(0.96, 0.86, 0.45);
  return t < 0.33 ? mix(a, b, t / 0.33) : t < 0.66 ? mix(b, c, (t - 0.33) / 0.33) : mix(c, d, (t - 0.66) / 0.34);
}
vec3 heatMap(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 a = vec3(0.12, 0.22, 0.62), b = vec3(0.30, 0.62, 0.86), c = vec3(0.96, 0.92, 0.80), d = vec3(0.95, 0.55, 0.30), e = vec3(0.74, 0.16, 0.22);
  return t < 0.25 ? mix(a, b, t / 0.25) : t < 0.5 ? mix(b, c, (t - 0.25) / 0.25) : t < 0.75 ? mix(c, d, (t - 0.5) / 0.25) : mix(d, e, (t - 0.75) / 0.25);
}
void main() {
  vec2 z = u_center + (gl_FragCoord.xy - 0.5 * u_res) / u_ppu;
  vec2 w = W(z);
  float h = 0.5 / u_ppu;
  vec2 dw = (W(z + vec2(h, 0.0)) - W(z - vec2(h, 0.0))) / (2.0 * h);
  bool body = solid(z);
  float px = 1.0 / u_ppu;
  float cPsi = contour(w.y, u_dpsi, px), cPhi = contour(w.x, u_dphi, px);
  vec3 col;
  ${mode === 'flow'
    ? `float sp = length(dw) / max(u_U, 1e-6);
  col = u_bg == 1 ? speedMap(clamp(sp / (sp + 1.0) * 1.3 - 0.15, 0.0, 1.0)) : vec3(0.04, 0.06, 0.12);
  if (u_showPhi == 1) col = mix(col, vec3(1.0, 0.72, 0.35), cPhi * 0.45);
  if (u_showPsi == 1) col = mix(col, vec3(0.92, 0.97, 1.0), cPsi * 0.85);`
    : `float u = u_base + w.y;
  col = u_bg == 1 ? heatMap(u) * 0.85 : vec3(0.04, 0.06, 0.12);
  if (u_showPhi == 1) col = mix(col, vec3(0.1, 0.12, 0.2), cPhi * 0.55);
  if (u_showPsi == 1) col = mix(col, vec3(1.0), cPsi * 0.9);`}
  if (body) col = vec3(0.16, 0.18, 0.24);
  o = vec4(col, 1.0);
}`;
}
