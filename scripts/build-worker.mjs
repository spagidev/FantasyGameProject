import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8',
  '.gz': 'application/gzip',
};
const assets = {};
async function scan(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'server' || e.name === '.openai') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await scan(p);
    else {
      const url = '/' + path.relative('dist', p).split(path.sep).join('/');
      assets[url] = [
        types[path.extname(p)] ?? 'application/octet-stream',
        (await readFile(p)).toString('base64'),
      ];
    }
  }
}
await scan('dist');
const staticSource = `const STATIC_FILES=${JSON.stringify(assets)};
function serveGame(request){const pathname=new URL(request.url).pathname;if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const item=STATIC_FILES[pathname==='/'?'/index.html':pathname];if(!item)return new Response('Not found',{status:404});const bytes=request.method==='HEAD'?null:Uint8Array.from(atob(item[1]),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':item[0],'Cache-Control':pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache','X-Content-Type-Options':'nosniff'}});}`;
const source = await readFile('worker/index.ts', 'utf8');
await mkdir('dist/server', { recursive: true });
await build({
  stdin: {
    contents: staticSource + '\n' + source,
    resolveDir: path.resolve('worker'),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/server/index.js',
  minify: true,
});
console.log(
  `Worker built with ${Object.keys(assets).length} static assets and the regional atlas API.`,
);

const worker = (await import(pathToFileURL(path.resolve('dist/server/index.js')).href)).default;
const page = await worker.fetch(new Request('https://emberwake.example/'), {});
assert.equal(page.status, 200, 'Worker must serve the game page');
const html = await page.text();
assert.match(html, /<div id="root"/);
const asset = html.match(/src="([^\"]+\.js)"/)[1];
const script = await worker.fetch(new Request('https://emberwake.example' + asset), {});
assert.equal(script.status, 200, 'Worker must serve the built JavaScript');
assert.match(script.headers.get('Content-Type'), /javascript/);
assert.equal(
  (await worker.fetch(new Request('https://emberwake.example/api/atlas'), {})).status,
  405,
);
console.log('Verified Worker HTML, JavaScript assets, and API routing.');
