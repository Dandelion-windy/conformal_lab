// 表达式解析器：把 "(z^2+1)/(z-i)"、"2sin z"、"e^(i*pi*t) z" 之类的输入解析成语法树
// 支持隐式乘法、|z|、π、函数名后省略括号；变量 z, x, y 与参数 a, b, c, t
export const FUNCS = {
  sin: 1, cos: 1, tan: 1, cot: 1, sec: 1, csc: 1, sinh: 1, cosh: 1, tanh: 1,
  asin: 1, acos: 1, atan: 1, arcsin: 1, arccos: 1, arctan: 1,
  exp: 1, log: 1, ln: 1, sqrt: 1, cbrt: 1, conj: 1, re: 1, im: 1, abs: 1, arg: 1,
};
const ALIAS = { arcsin: 'asin', arccos: 'acos', arctan: 'atan', ln: 'log' };
export const CONSTS = { i: 1, e: 1, pi: 1 };
export const VARS = { z: 1, x: 1, y: 1, a: 1, b: 1, c: 1, t: 1 };
const NAMES = [...Object.keys(FUNCS), ...Object.keys(CONSTS), ...Object.keys(VARS)].sort((p, q) => q.length - p.length);

export class ParseError extends Error {}

function splitIdent(word) {
  // 未知标识符按已知名称最长匹配拆分，例如 "iz" → i·z，"sinz" → sin z
  const out = [];
  let s = word;
  while (s) {
    const n = NAMES.find((k) => s.startsWith(k));
    if (!n) throw new ParseError(`无法识别的符号 “${word}”`);
    out.push(n);
    s = s.slice(n.length);
  }
  return out;
}

export function tokenize(src) {
  const s = src.toLowerCase().replace(/\*\*/g, '^').replace(/[·×]/g, '*').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/²/g, '^2').replace(/³/g, '^3').replace(/[−–]/g, '-');
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
    if (m) { toks.push({ k: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
    const w = /^[a-z]+/.exec(s.slice(i));
    if (w) {
      const word = w[0];
      const parts = FUNCS[word] || CONSTS[word] || VARS[word] ? [word] : splitIdent(word);
      for (const p of parts) toks.push({ k: 'id', v: ALIAS[p] || p });
      i += word.length;
      continue;
    }
    if ('+-*/^(),|'.includes(ch)) { toks.push({ k: ch }); i++; continue; }
    throw new ParseError(`非法字符 “${ch}”`);
  }
  toks.push({ k: 'end' });
  return toks;
}

export function parse(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (k) => {
    if (toks[p].k !== k) throw new ParseError(k === ')' ? '括号不匹配' : `此处应为 “${k}”`);
    return toks[p++];
  };
  const startsPrimary = (t) => t.k === 'num' || t.k === 'id' || t.k === '(';

  function expr() {
    let left = term();
    while (peek().k === '+' || peek().k === '-') {
      const op = toks[p++].k;
      left = { t: 'bin', op, a: left, b: term() };
    }
    return left;
  }
  function term() {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t.k === '*' || t.k === '/') { p++; left = { t: 'bin', op: t.k, a: left, b: unary() }; }
      else if (startsPrimary(t)) left = { t: 'bin', op: '*', a: left, b: power() };
      else return left;
    }
  }
  function unary() {
    if (peek().k === '-') { p++; return { t: 'neg', a: unary() }; }
    if (peek().k === '+') { p++; return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek().k === '^') { p++; return { t: 'bin', op: '^', a: base, b: unary() }; }
    return base;
  }
  function primary() {
    const t = toks[p++];
    if (t.k === 'num') return { t: 'num', v: { re: t.v, im: 0 } };
    if (t.k === '(') { const e = expr(); eat(')'); return e; }
    if (t.k === '|') { const e = expr(); eat('|'); return { t: 'call', f: 'abs', args: [e] }; }
    if (t.k === 'id') {
      if (FUNCS[t.v]) {
        if (peek().k === '(') {
          p++;
          const args = [expr()];
          while (peek().k === ',') { p++; args.push(expr()); }
          eat(')');
          return { t: 'call', f: t.v, args };
        }
        if (!startsPrimary(peek())) throw new ParseError(`函数 ${t.v} 缺少自变量`);
        return { t: 'call', f: t.v, args: [power()] };
      }
      if (t.v === 'i') return { t: 'num', v: { re: 0, im: 1 } };
      if (t.v === 'e') return { t: 'num', v: { re: Math.E, im: 0 }, e: true };
      if (t.v === 'pi') return { t: 'num', v: { re: Math.PI, im: 0 } };
      return { t: 'var', n: t.v };
    }
    if (t.k === 'end') throw new ParseError('表达式不完整');
    throw new ParseError(`意外的 “${t.k}”`);
  }

  if (peek().k === 'end') throw new ParseError('表达式为空');
  const ast = expr();
  if (peek().k !== 'end') throw new ParseError(peek().k === ')' ? '括号不匹配' : '表达式有多余部分');
  return ast;
}
