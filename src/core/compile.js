// 语法树 → JS 闭包 与 GLSL 表达式；附带常量折叠与"是否全纯"分析
import * as K from './complex.js';
import { parse } from './parser.js';

const JSF = {
  sin: K.sin, cos: K.cos, tan: K.tan, sinh: K.sinh, cosh: K.cosh, tanh: K.tanh,
  cot: (z) => K.inv(K.tan(z)), sec: (z) => K.inv(K.cos(z)), csc: (z) => K.inv(K.sin(z)),
  asin: K.asin, acos: K.acos, atan: K.atan, exp: K.exp, log: K.log, sqrt: K.sqrt,
  cbrt: (z) => K.pow(z, K.C(1 / 3)), conj: K.conj, re: (z) => K.C(z.re), im: (z) => K.C(z.im),
  abs: (z) => K.C(K.abs(z)), arg: (z) => K.C(K.arg(z)),
};
const NON_HOLO = new Set(['conj', 're', 'im', 'abs', 'arg']);

function freeVars(n, acc = new Set()) {
  if (n.t === 'var') acc.add(n.n);
  else if (n.t === 'neg') freeVars(n.a, acc);
  else if (n.t === 'bin') { freeVars(n.a, acc); freeVars(n.b, acc); }
  else if (n.t === 'call') n.args.forEach((a) => freeVars(a, acc));
  return acc;
}
function usesNonHolo(n) {
  if (n.t === 'var') return n.n === 'x' || n.n === 'y';
  if (n.t === 'neg') return usesNonHolo(n.a);
  if (n.t === 'bin') return usesNonHolo(n.a) || usesNonHolo(n.b);
  if (n.t === 'call') {
    if (NON_HOLO.has(n.f)) { const v = freeVars(n.args[0]); return v.has('z') || v.has('x') || v.has('y'); }
    return n.args.some(usesNonHolo);
  }
  return false;
}
const isIntNum = (n) => n.t === 'num' && n.v.im === 0 && Number.isInteger(n.v.re) && Math.abs(n.v.re) <= 64;

function toJS(n) {
  switch (n.t) {
    case 'num': { const v = n.v; return () => v; }
    case 'var':
      switch (n.n) {
        case 'z': return (z) => z;
        case 'x': return (z) => K.C(z.re);
        case 'y': return (z) => K.C(z.im);
        default: { const k = n.n; return (z, P) => P[k]; }
      }
    case 'neg': { const f = toJS(n.a); return (z, P) => K.neg(f(z, P)); }
    case 'call': {
      const fn = JSF[n.f], g = toJS(n.args[0]);
      return (z, P) => fn(g(z, P));
    }
    case 'bin': {
      const f = toJS(n.a);
      if (n.op === '^' && isIntNum(n.b)) { const k = n.b.v.re; return (z, P) => K.powi(f(z, P), k); }
      if (n.op === '^' && n.a.e) { const g = toJS(n.b); return (z, P) => K.exp(g(z, P)); }
      const g = toJS(n.b);
      const op = { '+': K.add, '-': K.sub, '*': K.mul, '/': K.div, '^': K.pow }[n.op];
      return (z, P) => op(f(z, P), g(z, P));
    }
  }
  throw new Error('bad node');
}

// 常量折叠：不含变量的子树直接求值
function fold(n) {
  if (n.t === 'num' || n.t === 'var') return n;
  const m = { ...n };
  if (n.t === 'neg') m.a = fold(n.a);
  if (n.t === 'bin') { m.a = fold(n.a); m.b = fold(n.b); }
  if (n.t === 'call') m.args = n.args.map(fold);
  if (freeVars(m).size === 0 && !(m.t === 'bin' && m.op === '^' && m.a.e)) {
    return { t: 'num', v: toJS(m)(K.ZERO, {}) };
  }
  return m;
}

const gf = (x) => {
  if (!Number.isFinite(x)) return x > 0 ? '1e30' : '-1e30';
  const s = Number.isInteger(x) ? x.toFixed(1) : String(+x.toPrecision(9));
  return s.includes('.') || s.includes('e') ? s : s + '.0';
};
const isReal = (n) => n.t === 'num' && n.v.im === 0;

function toGLSL(n) {
  switch (n.t) {
    case 'num': return `vec2(${gf(n.v.re)}, ${gf(n.v.im)})`;
    case 'var':
      return { z: 'z', x: 'vec2(z.x, 0.0)', y: 'vec2(z.y, 0.0)', a: 'u_pa', b: 'u_pb', c: 'u_pc', t: 'vec2(u_pt, 0.0)' }[n.n];
    case 'neg': return `(-${toGLSL(n.a)})`;
    case 'call': return `c${n.f}(${toGLSL(n.args[0])})`;
    case 'bin': {
      const A = toGLSL(n.a), B = n.op === '^' && (isIntNum(n.b) || n.a.e) ? null : toGLSL(n.b);
      switch (n.op) {
        case '+': return `(${A} + ${B})`;
        case '-': return `(${A} - ${B})`;
        case '*':
          if (isReal(n.a)) return `(${gf(n.a.v.re)} * ${B})`;
          if (isReal(n.b)) return `(${A} * ${gf(n.b.v.re)})`;
          return `cmul(${A}, ${B})`;
        case '/':
          if (isReal(n.b)) return `(${A} / ${gf(n.b.v.re)})`;
          return `cdiv(${A}, ${B})`;
        case '^': {
          if (n.a.e) return `cexp(${toGLSL(n.b)})`;
          if (!isIntNum(n.b)) return `cpow(${A}, ${B})`;
          const k = n.b.v.re;
          if (k === 0) return 'vec2(1.0, 0.0)';
          if (k === 1) return A;
          if (k === 2) return `csq(${A})`;
          return `cpowi(${A}, ${k})`;
        }
      }
    }
  }
  throw new Error('bad node');
}

// 扩展指数版本（vec3 = m·2^e），只用于着色：任何量级下 arg 与 log|w| 都精确。zv 为自变量 z 的 GLSL 表达式
function toXGLSL(n, zv) {
  switch (n.t) {
    case 'num': return `xc(${gf(n.v.re)}, ${gf(n.v.im)})`;
    case 'var':
      return { z: zv, x: `xre(${zv})`, y: `xim(${zv})`, a: 'xfrom(u_pa)', b: 'xfrom(u_pb)', c: 'xfrom(u_pc)', t: 'xfrom(vec2(u_pt, 0.0))' }[n.n];
    case 'neg': return `xneg(${toXGLSL(n.a, zv)})`;
    case 'call': return `x${n.f}(${toXGLSL(n.args[0], zv)})`;
    case 'bin': {
      if (n.op === '^' && n.a.e) return `xexp(${toXGLSL(n.b, zv)})`;
      const A = toXGLSL(n.a, zv);
      if (n.op === '^' && isIntNum(n.b)) { const k = n.b.v.re; return k === 0 ? 'xc(1.0, 0.0)' : k === 1 ? A : `xpowi(${A}, ${k})`; }
      const B = toXGLSL(n.b, zv);
      return `${{ '+': 'xadd', '-': 'xsub', '*': 'xmul', '/': 'xdiv', '^': 'xpow' }[n.op]}(${A}, ${B})`;
    }
  }
  throw new Error('bad node');
}

// 编译用户输入；返回 { js(z,P), glsl, params:[...], holomorphic }，出错时抛出 ParseError
export function compile(src) {
  const ast = fold(parse(src));
  const vars = freeVars(ast);
  for (const v of vars) if (!'zxyabct'.includes(v)) throw new Error(`未知变量 ${v}`);
  return {
    src,
    js: toJS(ast),
    glsl: toGLSL(ast),
    xglsl: toXGLSL(ast, 'Z'),
    xglslOf: (zv) => toXGLSL(ast, zv),
    params: ['a', 'b', 'c', 't'].filter((k) => vars.has(k)),
    holomorphic: !usesNonHolo(ast),
  };
}
