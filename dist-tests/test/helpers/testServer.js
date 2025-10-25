import http from 'node:http';
export async function startTestServer() {
    const pages = {
        '/': `<!doctype html><html><head><title>Home</title></head>
<body>
  <nav><a href="/about">About</a> <a href="/contact">Contact</a></nav>
  <img src="/img1.jpg" alt="logo">
  <a href="/assets">Assets</a>
</body></html>`,
        '/about': `<!doctype html><html><head><title>About</title></head>
<body>
  <main><h1>About</h1><a href="/">Home</a></main>
  <img src="/img2.jpg">
</body></html>`,
        '/contact': `<!doctype html><html><head><title>Contact</title></head>
<body>
  <footer><a href="/">Home</a></footer>
</body></html>`,
        '/assets': `<!doctype html><html><head><title>Assets</title></head>
<body>
  <img src="/img3.jpg" alt="hero"><img src="/img4.jpg" alt="product">
</body></html>`,
        '/robots.txt': `User-agent: *\nAllow: /`,
    };
    const server = http.createServer((req, res) => {
        const u = new URL(req.url ?? '/', 'http://localhost');
        if (u.pathname.startsWith('/img')) {
            // tiny jpg bytes
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            return res.end(Buffer.alloc(64));
        }
        const html = pages[u.pathname] ?? `<!doctype html><title>404</title><body>404</body>`;
        res.writeHead(pages[u.pathname] ? 200 : 404, { 'Content-Type': 'text/html' });
        res.end(html);
    });
    await new Promise((ok) => server.listen(0, ok));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    return {
        baseUrl,
        close: () => new Promise((ok, err) => server.close(e => e ? err(e) : ok())),
    };
}
//# sourceMappingURL=testServer.js.map