import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartographer } from '../src/engine/cartographer.js';
import bus from '../src/core/events.js';
import { buildConfig } from '../src/core/config.js';
import { startTestServer } from './helpers/testServer.js';

type Finished = { type: 'crawl.finished'; crawlId: string; incomplete: boolean };
type Checkpoint = { type: 'checkpoint.saved'; crawlId: string };

const isFinished = (ev: any): ev is Finished =>
  ev?.type === 'crawl.finished';

const isCheckpoint = (ev: any): ev is Checkpoint =>
  ev?.type === 'checkpoint.saved';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

test('resume avoids duplicates and flips incomplete correctly', async () => {
  // One-off: use drancich.com as seed
  const out = 'tmp/resume-test.atls';
  const seeds = ['https://drancich.com/'];

  // Phase 1: run until a checkpoint, then cancel
  const cart1 = new Cartographer();
  let gotCheckpoint = false;
  let firstRunIncomplete: boolean | undefined;

  const off = bus.onWithReplay('checkpoint.saved', (ev) => {
    console.log('[DEBUG] checkpoint.saved event:', ev);
    if (isCheckpoint(ev)) gotCheckpoint = true;
  });
  const offFinished = bus.on('crawl.finished', (ev) => {
    console.log('[DEBUG] crawl.finished event:', ev);
    if (isFinished(ev)) firstRunIncomplete = ev.incomplete;
  });

  const cfg1 = buildConfig({
    seeds,
    outAtls: out,
    maxPages: 100,
    robots: { respect: true, overrideUsed: false },
    http: { rps: 10, userAgent: 'CartographerTest' },
    perHostRps: 10,
    checkpoint: { enabled: true, interval: 2, everySeconds: 1 },
    discovery: { followExternal: false, paramPolicy: 'sample', blockList: [] },
    cli: { quiet: true }
  });

  await cart1.start(cfg1);

  let waited = 0;
  while (!gotCheckpoint && waited < 10000) {
    await sleep(100);
    waited += 100;
  }
  assert.ok(gotCheckpoint, 'expected a checkpoint to be emitted');
  off();

  await cart1.cancel(cfg1.resume?.crawlId || '');
  waited = 0;
  while (firstRunIncomplete === undefined && waited < 5000) {
    await sleep(100);
    waited += 100;
  }
  assert.equal(firstRunIncomplete, true, 'first run should be incomplete after cancel');

  // Phase 2: resume synchronously
  const stagingDir = `${out}.staging/${cfg1.resume?.crawlId || ''}`;
  const cart2 = new Cartographer();
  let secondRunIncomplete: boolean | undefined;
  gotCheckpoint = false;

  const off2 = bus.onWithReplay('checkpoint.saved', (ev) => {
    console.log('[TEST DEBUG] checkpoint.saved event (resume):', ev);
    if (isCheckpoint(ev)) gotCheckpoint = true;
  });
  const offFinished2 = bus.on('crawl.finished', (ev) => {
    if (isFinished(ev)) secondRunIncomplete = ev.incomplete;
  });

  const cfg2 = buildConfig({
    seeds,
    outAtls: out,
    maxPages: 100,
    robots: { respect: true, overrideUsed: false },
    http: { rps: 10, userAgent: 'CartographerTest' },
    perHostRps: 10,
    checkpoint: { enabled: true, interval: 2, everySeconds: 1 },
    discovery: { followExternal: false, paramPolicy: 'sample', blockList: [] },
    resume: { stagingDir },
    cli: { quiet: true }
  });

  await cart2.start(cfg2);

  waited = 0;
  while (!gotCheckpoint && waited < 10000) {
    await sleep(100);
    waited += 100;
  }
  assert.ok(gotCheckpoint, 'expected a checkpoint to be emitted after resume');
  off2();

  await cart2.cancel(cfg2.resume?.crawlId || '');
  waited = 0;
  while (secondRunIncomplete === undefined && waited < 5000) {
    await sleep(100);
    waited += 100;
  }
  assert.equal(secondRunIncomplete, false, 'second run should be complete after resume');
});
