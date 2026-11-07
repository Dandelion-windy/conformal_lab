// ---- 扩展指数复数：vec3(m.x, m.y, e) 表示 m · 2^e，|m| 归一化到 [0.5, 1) ----
// 只用于着色：避免 e^z、sin z 等在 |w| 超出 32 位浮点范围（约 1e±38）时上溢/下溢，
// 着色只需要 arg w 与 log|w|，二者在这种表示下总是有限且精确
const float XZERO_E = -1e30;
vec3 xn(vec2 m, float e) {
  float a = max(abs(m.x), abs(m.y));
  if (a == 0.0) return vec3(0.0, 0.0, XZERO_E);
  if (isinf(a) || isnan(a)) return vec3(m, e);
  float k = floor(log2(a)) + 1.0;
  float k1 = floor(k * 0.5);
  return vec3(m * exp2(-k1) * exp2(k1 - k), e + k);
}
vec3 xfrom(vec2 a) { return xn(a, 0.0); }
vec3 xc(float re, float im) { return xn(vec2(re, im), 0.0); }
// 转回普通复数（超出范围时按方向截断）
vec2 xtoc(vec3 A) { return A.z < -120.0 ? vec2(0.0) : A.xy * exp2(min(A.z, 120.0)); }
float xlog2abs(vec3 A) { float l = length(A.xy); return l == 0.0 ? XZERO_E : log2(l) + A.z; }
vec3 xneg(vec3 A) { return vec3(-A.xy, A.z); }
vec3 xconj(vec3 A) { return vec3(A.x, -A.y, A.z); }
vec3 xmul(vec3 A, vec3 B) { return xn(cmul(A.xy, B.xy), A.z + B.z); }
vec3 xdiv(vec3 A, vec3 B) {
  if (B.x == 0.0 && B.y == 0.0) return vec3(1.0, 0.0, 1e30);
  return xn(cdiv(A.xy, B.xy), A.z - B.z);
}
vec3 xinv(vec3 A) { return xdiv(vec3(0.5, 0.0, 1.0), A); }
vec3 xadd(vec3 A, vec3 B) {
  if (A.z < B.z) { vec3 T = A; A = B; B = T; }
  float d = B.z - A.z;
  return xn(A.xy + (d < -60.0 ? vec2(0.0) : B.xy * exp2(d)), A.z);
}
vec3 xsub(vec3 A, vec3 B) { return xadd(A, xneg(B)); }
vec3 xsq(vec3 A) { return xmul(A, A); }
vec3 xpowi(vec3 A, int n) {
  vec3 r = vec3(0.5, 0.0, 1.0), x = A; int m = n < 0 ? -n : n;
  for (int i = 0; i < 8; i++) { if (m == 0) break; if ((m & 1) == 1) r = xmul(r, x); x = xsq(x); m >>= 1; }
  return n < 0 ? xinv(r) : r;
}
// e^A：|e^A| = 2^{Re A · log2 e}，指数部分直接作为 e，永不溢出
vec3 xexp(vec3 A) {
  vec2 a = xtoc(A);
  float e = clamp(a.x * 1.4426950408889634, -1e29, 1e29);
  return xn(vec2(cos(a.y), sin(a.y)), e);
}
vec3 xlog(vec3 A) {
  if (A.x == 0.0 && A.y == 0.0) return xc(-1e30, 0.0);
  return xfrom(vec2(log(length(A.xy)) + A.z * 0.6931471805599453, atan(A.y, A.x)));
}
vec3 xpow(vec3 A, vec3 B) {
  if (A.x == 0.0 && A.y == 0.0) return B.x > 0.0 ? vec3(0.0, 0.0, XZERO_E) : vec3(1.0, 0.0, 1e30);
  return xexp(xmul(B, xlog(A)));
}
vec3 xsqrt(vec3 A) {
  if (A.x == 0.0 && A.y == 0.0) return A;
  vec2 m = A.xy; float e = A.z;
  if (mod(e, 2.0) != 0.0) { m *= 2.0; e -= 1.0; }
  return xn(csqrt(m), e * 0.5);
}
vec3 xcbrt(vec3 A) { return xpow(A, xc(1.0 / 3.0, 0.0)); }
const vec3 XI = vec3(0.0, 0.5, 1.0);
vec3 xsin(vec3 A) { vec3 iA = xmul(XI, A); return xdiv(xsub(xexp(iA), xexp(xneg(iA))), xc(0.0, 2.0)); }
vec3 xcos(vec3 A) { vec3 iA = xmul(XI, A); return xmul(xadd(xexp(iA), xexp(xneg(iA))), xc(0.5, 0.0)); }
vec3 xtan(vec3 A) { return xdiv(xsin(A), xcos(A)); }
vec3 xcot(vec3 A) { return xdiv(xcos(A), xsin(A)); }
vec3 xsec(vec3 A) { return xinv(xcos(A)); }
vec3 xcsc(vec3 A) { return xinv(xsin(A)); }
vec3 xsinh(vec3 A) { return xmul(xsub(xexp(A), xexp(xneg(A))), xc(0.5, 0.0)); }
vec3 xcosh(vec3 A) { return xmul(xadd(xexp(A), xexp(xneg(A))), xc(0.5, 0.0)); }
vec3 xtanh(vec3 A) { return xdiv(xsinh(A), xcosh(A)); }
vec3 xasin(vec3 A) { return xmul(xc(0.0, -1.0), xlog(xadd(xmul(XI, A), xsqrt(xsub(xc(1.0, 0.0), xsq(A)))))); }
vec3 xacos(vec3 A) { return xsub(xc(0.5 * PI, 0.0), xasin(A)); }
vec3 xatan(vec3 A) { return xmul(xc(0.0, 0.5), xlog(xdiv(xadd(XI, A), xsub(XI, A)))); }
vec3 xre(vec3 A) { return xn(vec2(A.x, 0.0), A.z); }
vec3 xim(vec3 A) { return xn(vec2(A.y, 0.0), A.z); }
vec3 xabs(vec3 A) { return xn(vec2(length(A.xy), 0.0), A.z); }
vec3 xarg(vec3 A) { return xc(atan(A.y, A.x), 0.0); }
