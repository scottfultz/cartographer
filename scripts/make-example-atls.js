import http from 'node:http';
// No import for AddressInfo; use typeof for runtime type assertion
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function startServer() {
  const pages = {
    '/robots.txt': `User-agent: *\nAllow: /`,
    '/': `<!doctype html><title>Home</title><body><a href="/about">About</a><img src="/i.jpg" alt="x"></body>`,
    '/about': `<!doctype html><title>About</title><body><a href="/">Home</a><img src="/j.jpg"></body>`
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname.endsWith('.jpg')) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      return res.end(Buffer.alloc(64));
    }
    const html = pages[url.pathname] || '<!doctype html><title>404</title><body>404</body>';
    res.writeHead(pages[url.pathname] ? 200 : 404, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
    p.on('exit', code => code === 0 ? resolve(undefined) : reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`)));
  });
}

(async () => {
  if (!existsSync('tmp')) mkdirSync('tmp', { recursive: true });
  const server = await startServer();
  const { port } = /** @type {typeof import('node:net').AddressInfo} */(server.address());
  const base = `http://127.0.0.1:${port}`;

  // build must have already run; use compiled CLI
  await run('node', [
    'dist/src/cli/index.js', 'crawl',
    '--seeds', `${base}/`, `${base}/about`,
    '--out', 'tmp/example.atls',
    '--maxPages', '5',
    '--mode', 'raw',
    '--quiet'
  ]);

  server.close();
})().catch(err => {
  console.error('[make-example-atls] failed:', err);
  process.exit(1);
});
