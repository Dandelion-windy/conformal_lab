// 构建脚本：把 src/ 下的模块、样式与 KaTeX（含 woff2 字体）打包为一个可离线打开的 HTML 文件
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(root, '..', '共形映射可视化.html');
const dev = process.argv.includes('--dev');

// KaTeX 的 CSS 同时引用 woff2/woff/ttf，只保留 woff2 以控制体积
const katexCss = {
  name: 'katex-woff2-only',
  setup(build) {
    build.onLoad({ filter: /katex(\.min)?\.css$/ }, async (args) => {
      let css = await fs.promises.readFile(args.path, 'utf8');
      css = css.replace(/,\s*url\([^)]*\.(?:woff|ttf)\)\s*format\("(?:woff|truetype)"\)/g, '');
      return { contents: css, loader: 'css', resolveDir: path.dirname(args.path) };
    });
  },
};

const result = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  minify: !dev,
  format: 'iife',
  target: 'es2020',
  outdir: path.join(root, 'dist'),
  write: false,
  charset: 'utf8',
  legalComments: 'none',
  loader: { '.html': 'text', '.glsl': 'text', '.woff2': 'dataurl' },
  plugins: [katexCss],
});

let js = '', css = '';
for (const f of result.outputFiles) {
  if (f.path.endsWith('.js')) js = f.text;
  else if (f.path.endsWith('.css')) css = f.text;
}
js = js.replace(/<\/script/gi, '<\\/script');

const tpl = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
const html = tpl
  .replace('<!--INLINE_CSS-->', () => `<style>\n${css}\n</style>`)
  .replace('<!--INLINE_JS-->', () => `<script>\n${js}\n</script>`);
fs.writeFileSync(outFile, html);
console.log(`✓ ${path.relative(process.cwd(), outFile)}  ${(html.length / 1024).toFixed(0)} KB`);
