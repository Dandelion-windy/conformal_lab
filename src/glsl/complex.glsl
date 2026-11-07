// ---- 复数运算（vec2 = 复数） ----
const float PI = 3.14159265358979;
const float TAU = 6.28318530717959;
const float BIG = 1e30;
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 csq(vec2 a) { return vec2(a.x * a.x - a.y * a.y, 2.0 * a.x * a.y); }
vec2 cdiv(vec2 a, vec2 b) {
  if (b.x == 0.0 && b.y == 0.0) return vec2(BIG, 0.0);
  if (abs(b.x) >= abs(b.y)) {
    float r = b.y / b.x; float d = b.x + b.y * r;
    return vec2(a.x + a.y * r, a.y - a.x * r) / d;
  }
  float r = b.x / b.y; float d = b.x * r + b.y;
  return vec2(a.x * r + a.y, a.y * r - a.x) / d;
}
vec2 cinv(vec2 a) { return cdiv(vec2(1.0, 0.0), a); }
vec2 cpowi(vec2 a, int n) {
  vec2 r = vec2(1.0, 0.0); vec2 x = a; int m = n < 0 ? -n : n;
  for (int i = 0; i < 8; i++) { if (m == 0) break; if ((m & 1) == 1) r = cmul(r, x); x = csq(x); m >>= 1; }
  return n < 0 ? cinv(r) : r;
}
vec2 cexp(vec2 a) { return exp(min(a.x, 85.0)) * vec2(cos(a.y), sin(a.y)); }
vec2 clog(vec2 a) { return vec2(log(length(a)), atan(a.y, a.x)); }
vec2 cpow(vec2 a, vec2 b) { if (a.x == 0.0 && a.y == 0.0) return b.x > 0.0 ? vec2(0.0) : vec2(BIG, 0.0); return cexp(cmul(b, clog(a))); }
vec2 csqrt(vec2 a) {
  float r = length(a);
  float im = sqrt(max(0.0, (r - a.x) * 0.5));
  return vec2(sqrt(max(0.0, (r + a.x) * 0.5)), a.y < 0.0 ? -im : im);
}
vec2 ccbrt(vec2 a) { return cpow(a, vec2(1.0 / 3.0, 0.0)); }
// 双曲函数的自变量限制在 ±85 以内，避免 cosh 溢出成 ∞ 后与 0 相乘得到 NaN
float chc(float t) { return cosh(clamp(t, -85.0, 85.0)); }
float shc(float t) { return sinh(clamp(t, -85.0, 85.0)); }
vec2 csin(vec2 a) { return vec2(sin(a.x) * chc(a.y), cos(a.x) * shc(a.y)); }
vec2 ccos(vec2 a) { return vec2(cos(a.x) * chc(a.y), -sin(a.x) * shc(a.y)); }
vec2 ctan(vec2 a) { return cdiv(csin(a), ccos(a)); }
vec2 ccot(vec2 a) { return cdiv(ccos(a), csin(a)); }
vec2 csec(vec2 a) { return cinv(ccos(a)); }
vec2 ccsc(vec2 a) { return cinv(csin(a)); }
vec2 csinh(vec2 a) { return vec2(shc(a.x) * cos(a.y), chc(a.x) * sin(a.y)); }
vec2 ccosh(vec2 a) { return vec2(chc(a.x) * cos(a.y), shc(a.x) * sin(a.y)); }
vec2 ctanh(vec2 a) { return cdiv(csinh(a), ccosh(a)); }
vec2 casin(vec2 a) { vec2 w = clog(vec2(-a.y, a.x) + csqrt(vec2(1.0, 0.0) - csq(a))); return vec2(w.y, -w.x); }
vec2 cacos(vec2 a) { return vec2(PI * 0.5, 0.0) - casin(a); }
vec2 catan(vec2 a) { vec2 w = clog(cdiv(vec2(a.x, 1.0 + a.y), vec2(-a.x, 1.0 - a.y))); return vec2(-0.5 * w.y, 0.5 * w.x); }
vec2 cconj(vec2 a) { return vec2(a.x, -a.y); }
vec2 cre(vec2 a) { return vec2(a.x, 0.0); }
vec2 cim(vec2 a) { return vec2(a.y, 0.0); }
vec2 cabs(vec2 a) { return vec2(length(a), 0.0); }
vec2 carg(vec2 a) { return vec2(atan(a.y, a.x), 0.0); }
