// 数值格式化：纯文本与 TeX 两种输出
import { isFin } from './complex.js';

export function num(x, d = 3) {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'NaN';
  if (Math.abs(x) < 0.5 * 10 ** -d) x = 0;
  const ax = Math.abs(x);
  let s = ax !== 0 && (ax >= 1e5 || ax < 1e-3) ? x.toExponential(2) : x.toFixed(d);
  if (s.includes('.') && !s.includes('e')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('-', '−');
}

// 复数 → "1.2 − 0.5i"
export function cx(z, d = 3) {
  if (!z) return '—';
  if (!isFin(z)) return Number.isNaN(z.re) ? '未定义' : '∞';
  const re = num(z.re, d), im = num(Math.abs(z.im), d);
  const imZero = im === '0', reZero = re === '0';
  if (imZero) return re;
  const imPart = (im === '1' ? '' : im) + 'i';
  if (reZero) return (z.im < 0 ? '−' : '') + imPart;
  return `${re} ${z.im < 0 ? '−' : '+'} ${imPart}`;
}

export const deg = (rad, d = 1) => `${num((rad * 180) / Math.PI, d)}°`;

// 复数 → TeX；用于动态公式
export function texNum(x, d = 3) {
  return num(x, d).replace('−', '-').replace(/e([+-]?)(\d+)/, (_, s, e) => `\\times10^{${s === '-' ? '-' : ''}${e}}`);
}
export function texCx(z, d = 3) {
  if (!isFin(z)) return '\\infty';
  return cx(z, d).replace(/−/g, '-');
}
// 作为系数出现时加括号："(1+2i)"
export function texCoef(z, d = 3) {
  const s = texCx(z, d);
  return /[+-]/.test(s.slice(1)) ? `(${s})` : s;
}
