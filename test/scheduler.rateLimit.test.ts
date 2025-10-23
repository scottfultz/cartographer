// scheduler.rateLimit.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartographer } from '../src/engine/cartographer.js';
import { buildConfig } from '../src/core/config.js';

type PageFetchedEvent = {
  type: 'page.fetched';
  url: string;
  timestamp: string; // ISO
  crawlId: string;
  seq: number;
};

function isPageFetched(ev: unknown): ev is PageFetchedEvent {
  return !!ev
    && typeof (ev as any).type === 'string'
    && (ev as any).type === 'page.fetched'
    && typeof (ev as any).url === 'string'
    && typeof (ev as any).timestamp === 'string';
}

test('Scheduler per-host rate limiting respects perHostRps', async (t) => {
  // Allow enough concurrency and global RPS so per-host is the binding limit
  const perHostRps = 2; // expect ~500 ms min gap per host
  const seeds = [
    'https://example.com/',
    'https://httpbin.org/html',
  ];

  const config = buildConfig({
    seeds,
    outAtls: 'tmp/test-rate-limit.atls',
    http: { rps: 12, userAgent: 'CartographerTest/1.0' },
    perHostRps,
    render: {
      mode: 'prerender',
      concurrency: 8,
      timeoutMs: 10000,
      maxRequestsPerPage: 10,
      maxBytesPerPage: 1048576
    },
    maxPages: 12,
    robots: { respect: true, overrideUsed: false },
    discovery: { followExternal: false, paramPolicy: 'keep', blockList: [] },
    checkpoint: { enabled: false, interval: 0 },
    cli: { quiet: true },
  });

  const cart = new Cartographer();

  const hostEvents: Record<string, number[]> = {};
  const offFetched = cart.on('page.fetched', (ev) => {
    if (isPageFetched(ev)) {
      const host = new URL(ev.url).hostname;
      (hostEvents[host] ??= []).push(Date.parse(ev.timestamp));
    }
  });

  // Track finish to bound test time
  const finishedP = new Promise<boolean>((resolve) => {
    const offFinished = cart.on('crawl.finished', () => {
      offFinished();
      resolve(true);
    });
    // Hard timeout as a backstop
    setTimeout(() => resolve(false), 20000);
  });

  await cart.start(config);
  const finished = await finishedP;
  offFetched();

  assert.ok(finished, 'crawl did not finish within 20s');

  // Verify per-host spacing: at 2 rps we expect ~500 ms between hits to the same host.
  // Allow 10% tolerance for timing noise.
  const minIntervalMs = Math.floor(1000 / perHostRps * 0.9); // 450 ms
  for (const host of Object.keys(hostEvents)) {
    const times = hostEvents[host].sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      const dt = times[i] - times[i - 1];
      assert.ok(
        dt >= minIntervalMs,
        `Host ${host} interval ${dt}ms < ${minIntervalMs}ms (perHostRps=${perHostRps})`
      );
    }
  }
});
