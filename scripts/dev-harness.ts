// Dev harness for Cartographer API
import { Cartographer } from '../src/engine/cartographer.js';
import { buildConfig } from '../src/core/config.js';

const seeds = [
  'https://httpbin.org/html',
  'http://neverssl.com/',
  'https://httpbingo.org/',
  'https://www.wikipedia.org/'
];

const config = buildConfig({
  seeds,
  outAtls: 'tmp/harness-test.atls',
  maxPages: 20,
  render: {
    mode: 'prerender',
    concurrency: 6,
    timeoutMs: 10000,
    maxRequestsPerPage: 10,
    maxBytesPerPage: 1048576,
  },
  http: {
    rps: 8,
    userAgent: 'CartographerDevHarness/1.0',
  },
  perHostRps: 2,
  checkpoint: { interval: 5, enabled: true },
  cli: { quiet: false },
  discovery: { followExternal: false, paramPolicy: 'keep', blockList: [] },
  robots: { respect: true, overrideUsed: false },
});
const cart = new Cartographer();
cart.on('crawl.backpressure', (ev) => {
  if (ev.type === 'crawl.backpressure') {
    console.log(`\nBACKPRESSURE: host=${ev.host} reason=${ev.reason} tokens=${ev.tokens ?? '?'} queued=${ev.queued ?? '?'} deferred=[${ev.hostsDeferred?.join(',')}]`);
  }
});
let crawlId: string = '';
let finished = false;

cart.on('crawl.started', (ev) => {
  crawlId = ev.crawlId;
  console.log(`Started ${ev.crawlId} seeds=${config.seeds.length} rps=${config.http.rps} perHostRps=${config.perHostRps} out=${config.outAtls}`);
});
cart.on('crawl.heartbeat', (ev) => {
  if (ev.type === 'crawl.heartbeat') {
    const t = Math.floor((Date.now() - new Date(ev.progress.startedAt).getTime()) / 1000);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    process.stdout.write(`\r[t=${mm}:${ss}] q=${ev.progress.queued} in=${ev.progress.inFlight} done=${ev.progress.completed} err=${ev.progress.errors} rps≈${ev.progress.pagesPerSecond}`);
  }
});
cart.on('page.fetched', (ev) => {
  if (ev.type === 'page.fetched') {
    const host = new URL(ev.url).hostname;
    console.log(`\n${ev.statusCode} ${host}`);
  }
});
cart.on('page.parsed', (ev) => {
  if (ev.type === 'page.parsed') {
    const host = new URL(ev.url).hostname;
    const links = ev.record.internalLinksCount + ev.record.externalLinksCount;
    const assets = ev.record.mediaAssetsCount;
    const a11y = ev.record.basicFlags?.hasTitle ? 1 : 0;
    console.log(`parsed ${host} links=${links} assets=${assets} a11y=${a11y}`);
  }
});
cart.on('error.occurred', (ev) => {
  if (ev.type === 'error.occurred') {
    console.log(`ERR ${ev.error.phase} ${ev.error.hostname} ${ev.error.message}`);
  }
});
cart.on('crawl.finished', (ev) => {
  if (ev.type === 'crawl.finished') {
    finished = true;
    console.log(`\nFinished ${ev.crawlId} manifest=${ev.manifestPath} incomplete=${ev.incomplete}`);
    process.exit(ev.incomplete ? 2 : 0);
  }
});

(async () => {
  await cart.start(config);
  setTimeout(() => cart.pause(crawlId), 3000);
  setTimeout(() => cart.resume(crawlId), 6000);
  setTimeout(() => { if (!finished) cart.cancel(crawlId); }, 12000);
})();
