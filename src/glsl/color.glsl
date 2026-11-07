// ---- 复值着色：同一着色函数同时用于 z 平面（拉回 f(z)）与 w 平面（恒等），颜色一致即对应点 ----
uniform int u_colorMode;   // 0 相位+模环  1 黎曼球着色(0黑∞白)  2 直角棋盘  3 极坐标棋盘  4 暗色背景
uniform float u_bright;    // 背景强度
uniform int u_lines;       // 0 无  1 直角网格线 Re/Im  2 极坐标线 |w|, arg w
uniform float u_lineStep;  // 网格间距

vec3 hue(float h) { return 0.5 + 0.5 * cos(TAU * (h + vec3(0.0, -1.0 / 3.0, 1.0 / 3.0))); }
vec3 softHue(float h) { return mix(vec3(0.5), hue(h), 0.82); }

float lineMask(float d, float px, float width) { return 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.0, d / max(px, 1e-12)); }

// lr = log2|w|（可以远超浮点范围，例如 e^z 在 Re z = −1000 处 lr ≈ −1443）
vec3 baseColor(vec2 w, float r, float lr, float a, float flr) {
  float h = a / TAU;
  if (u_colorMode == 0) {
    float ring = fract(lr);
    float fade = 1.0 - smoothstep(0.2, 0.6, flr);
    float sector = fract(h * 12.0 + 0.5);
    float s = mix(1.0, 0.68 + 0.32 * ring, fade) * mix(1.0, 0.92 + 0.08 * smoothstep(0.0, 0.08, abs(sector - 0.5)), fade);
    return softHue(h) * s;
  }
  if (u_colorMode == 1) {
    // atan(|w|)·2/π，用 log2|w| 计算，避免 |w| 溢出
    float L = clamp(0.5 + atan(sinh(clamp(0.6931472 * lr, -80.0, 80.0))) / PI, 0.0, 1.0);
    vec3 b = softHue(h);
    return L < 0.5 ? b * pow(L * 2.0, 0.75) : mix(b, vec3(1.0), pow(L * 2.0 - 1.0, 1.3));
  }
  if (u_colorMode == 2) {
    vec2 g = floor(w / u_lineStep);
    float c = mod(g.x + g.y, 2.0);
    return mix(vec3(0.62), softHue(h), 0.55) * (c > 0.5 ? 1.0 : 0.58);
  }
  if (u_colorMode == 3) {
    float g = floor(lr * 2.0) + floor(h * 16.0);
    float c = mod(g, 2.0);
    return mix(vec3(0.62), softHue(h), 0.55) * (c > 0.5 ? 1.0 : 0.58);
  }
  return vec3(0.045, 0.06, 0.11);
}

// w：普通浮点值（直角网格、棋盘用）；lr = log2|w|；a = arg w。导数必须在统一控制流中求
vec3 colorCore(vec2 w, float lr, float a) {
  float r = exp2(clamp(lr, -126.0, 126.0));
  vec2 fw = fwidth(w);
  float flr = fwidth(lr);
  float fr = fwidth(r);
  float a2 = a > 0.0 ? a - PI : a + PI;
  float fa = min(fwidth(a), fwidth(a2));
  // 只有真正无定义（NaN）的点才没有颜色
  if (isnan(lr) || isnan(a)) return vec3(0.3);
  vec3 col = baseColor(w, r, lr, a, flr);
  // 相位在一个像素内转过太多（如 e^z、sin z 缩得很小时）：取平均色，避免摩尔纹
  if (u_colorMode != 4) col = mix(col, vec3(0.46), smoothstep(0.5, 1.6, fa));
  if (u_colorMode != 4) col *= u_bright;
  float px = max(fw.x, fw.y);
  float m = 0.0;
  if (u_lines == 1) {
    vec2 d = abs(fract(w / u_lineStep + 0.5) - 0.5) * u_lineStep;
    float dens = 1.0 - smoothstep(0.12, 0.35, px / u_lineStep);
    m = max(lineMask(d.x, fw.x, 1.0), lineMask(d.y, fw.y, 1.0)) * dens * 0.55;
    m = max(m, max(lineMask(abs(w.x), fw.x, 2.0), lineMask(abs(w.y), fw.y, 2.0)) * 0.9);
  } else if (u_lines == 2) {
    float dr = abs(fract(r / u_lineStep + 0.5) - 0.5) * u_lineStep;
    float sec = TAU / 24.0;
    float da = abs(fract(a / sec + 0.5) - 0.5) * sec;
    float faa = min(fa, 1.0);
    m = lineMask(dr, fr, 1.0) * (1.0 - smoothstep(0.12, 0.35, fr / u_lineStep)) * 0.55;
    m = max(m, lineMask(da, faa, 1.0) * (1.0 - smoothstep(0.08, 0.2, faa / sec)) * 0.55);
    m = max(m, lineMask(abs(r - 1.0), fr, 2.0) * 0.9);
  }
  return mix(col, vec3(0.97, 0.98, 1.0), m);
}

vec3 colorOf(vec2 w) {
  // 防溢出：分量超过 ~1e19 时 length() 会溢出成 ∞
  if (any(isinf(w))) w = vec2(isinf(w.x) ? sign(w.x) : 0.0, isinf(w.y) ? sign(w.y) : 0.0) * 3.0e38;
  float mxw = max(abs(w.x), abs(w.y));
  float r = mxw == 0.0 ? 0.0 : mxw * length(w / mxw);
  return colorCore(w, r == 0.0 ? -1e30 : log2(r), atan(w.y, w.x));
}
// 扩展指数复数的着色：模与辐角在任何量级下都精确
vec3 colorOfX(vec3 W) { return colorCore(xtoc(W), xlog2abs(W), atan(W.y, W.x)); }
// 黎曼球面上的点 → 扩展指数复数（北半球用 1/z̄ 的形式，N 附近依然精确）
vec3 sphereX(vec3 P) {
  if (P.z <= 0.0) return xfrom(P.xy / (1.0 - P.z));
  vec2 q = P.xy / (1.0 + P.z);
  if (q.x == 0.0 && q.y == 0.0) return vec3(1.0, 0.0, 1e30);
  return xinv(xconj(xfrom(q)));
}
