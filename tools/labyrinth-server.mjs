#!/usr/bin/env node
/*
 * Copyright © 2025 Cai Frazier.
 */

import http from 'node:http';
import { parse } from 'node:url';

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_PAGES = 50000;
const DEFAULT_SLOW_DELAY_MS = 10_000;

const port = Number(process.env.LABYRINTH_PORT ?? DEFAULT_PORT);
const maxPages = Number(process.env.LABYRINTH_MAX_PAGES ?? DEFAULT_MAX_PAGES);
const slowDelayMs = Number(process.env.LABYRINTH_SLOW_DELAY_MS ?? DEFAULT_SLOW_DELAY_MS);

if (!Number.isFinite(port) || port <= 0) {
  console.error('[Labyrinth] Invalid LABYRINTH_PORT value.');
  process.exit(1);
}

if (!Number.isFinite(maxPages) || maxPages < 1) {
  console.error('[Labyrinth] Invalid LABYRINTH_MAX_PAGES value.');
  process.exit(1);
}

function createPrng(seed) {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => (state = (state * 48271) % 2147483647);
}

function htmlResponse(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function textResponse(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function handleRoot(res) {
  htmlResponse(
    res,
    200,
    '<h1>Procedural Labyrinth</h1><p><a href="/page/1">Start crawl</a></p>'
  );
}

function handleJsLink(res) {
  htmlResponse(
    res,
    200,
    `
      <h1>JS-Rendered Page</h1>
      <div id="content">Loading...</div>
      <script>
        setTimeout(() => {
          document.getElementById('content').innerHTML = '<a href="/page/12345">JS-Loaded Link</a>';
        }, 500);
      </script>
    `
  );
}

function handleSlow(res) {
  setTimeout(() => {
    htmlResponse(res, 200, '<h1>Slow Page</h1><a href="/page/1">Back</a>');
  }, slowDelayMs);
}

function handleNoTitle(res) {
  htmlResponse(res, 200, '<html><head></head><body>No Title</body></html>');
}

function handleDisallowed(res) {
  htmlResponse(res, 200, '<h1>You should not be here.</h1>');
}

function handleRobots(res) {
  textResponse(res, 200, 'User-agent: *\nDisallow: /robots-disallowed');
}

function handleProceduralPage(res, id) {
  if (id > maxPages || id < 1) {
    htmlResponse(res, 404, '<h1>404 - Page Not Found</h1>');
    return;
  }

  const random = createPrng(id);
  const numLinks = (random() % 15) + 10;
  let links = '';

  for (let i = 0; i < numLinks; i += 1) {
    const linkToId = (random() % maxPages) + 1;
    links += `<li><a href="/page/${linkToId}">Link to Page ${linkToId}</a></li>`;
  }

  links += '<li><a href="/page/js-link">Test JS-Rendered Link</a></li>';
  links += '<li><a href="/page/slow">Test Slow Page</a></li>';
  links += '<li><a href="/robots-disallowed">Test Disallowed</a></li>';
  links += '<li><a href="/page/999999">Test 404 Link</a></li>';
  links += '<li><a href="/page/no-title">Test No-Title Page</a></li>';

  htmlResponse(
    res,
    200,
    `
      <html>
        <head><title>Page ${id}</title></head>
        <body>
          <h1>This is Page ${id}</h1>
          <p>This page has ${numLinks} procedural links.</p>
          <ul>${links}</ul>
        </body>
      </html>
    `
  );
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    htmlResponse(res, 400, '<h1>Bad Request</h1>');
    return;
  }

  const { pathname } = parse(req.url, false, true);

  if (!pathname) {
    htmlResponse(res, 400, '<h1>Bad Request</h1>');
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    handleRoot(res);
    return;
  }

  if (pathname === '/robots.txt') {
    handleRobots(res);
    return;
  }

  if (pathname === '/robots-disallowed') {
    handleDisallowed(res);
    return;
  }

  if (pathname === '/page/js-link') {
    handleJsLink(res);
    return;
  }

  if (pathname === '/page/slow') {
    handleSlow(res);
    return;
  }

  if (pathname === '/page/no-title') {
    handleNoTitle(res);
    return;
  }

  if (pathname.startsWith('/page/')) {
    const idSegment = pathname.slice('/page/'.length);
    const id = Number.parseInt(idSegment, 10);
    if (Number.isNaN(id)) {
      htmlResponse(res, 404, '<h1>404 - Page Not Found</h1>');
      return;
    }
    handleProceduralPage(res, id);
    return;
  }

  htmlResponse(res, 404, '<h1>404 - Page Not Found</h1>');
});

server.listen(port, () => {
  console.log(`[Labyrinth] Server running at http://localhost:${port}`);
  console.log(`[Labyrinth] Virtual site size: ${maxPages.toLocaleString()} pages`);
  console.log('[Labyrinth] Routes: /page/:id, /page/js-link, /page/slow, /page/no-title');
});

const shutdown = () => {
  console.log('\n[Labyrinth] Shutting down');
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
