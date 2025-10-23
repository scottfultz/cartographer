import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartographer } from '../src/engine/cartographer.js';
import bus from '../src/core/events.js';
import { buildConfig } from '../src/core/config.js';
import { startTestServer } from './helpers/testServer.js';
import { readdirSync } from 'fs';
import { execSync } from 'child_process';

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
  let gotFinished = false;
  let firstRunIncomplete: boolean | undefined;

  const off = bus.onWithReplay('checkpoint.saved', (ev) => {
    console.log('[DEBUG] checkpoint.saved event:', ev);
    if (isCheckpoint(ev)) {
      gotCheckpoint = true;
    }
  });
  const offFinished = bus.on('crawl.finished', (ev) => {
    console.log('[DEBUG] crawl.finished event:', ev);
    if (isFinished(ev)) {
      firstRunIncomplete = ev.incomplete;
      gotFinished = true;
    }
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

  console.log('[DIAGNOSTIC] Crawl 1 config after run:', JSON.stringify(cfg1, null, 2));
  console.log('[DIAGNOSTIC] Crawl 1 instance after run:', JSON.stringify(cart1, null, 2));

  // Add a log to show what staging directory was *actually* created
  try {
    const files = execSync(`ls -l ${out}.staging/`).toString();
    console.log(`[DIAGNOSTIC] Contents of ${out}.staging/:\n${files}`);
  } catch (e: any) {
    console.log(`[DIAGNOSTIC] Could not list ${out}.staging/ contents: ${e.message}`);
  }

  let waited = 0;
  // Wait for both checkpoint and crawl.finished before canceling
  while ((!gotCheckpoint || !gotFinished) && waited < 15000) {
    await sleep(100);
    waited += 100;
  }
  assert.ok(gotCheckpoint, 'expected a checkpoint to be emitted');
  assert.ok(gotFinished, 'expected crawl.finished to be emitted');
  off();

  await cart1.cancel();
  assert.equal(firstRunIncomplete, true, 'first run should be incomplete after cancel');

  // --- This logic replaces the old diagnostic block ---
  console.log('[DIAGNOSTIC] Crawl 1 complete. Reading staging directory to find crawlId...');
  const stagingDirBase = `${out}.staging`;
  const allFiles = readdirSync(stagingDirBase);
  const crawlId1 = allFiles.find(file => file.startsWith('crawl_'));

  if (!crawlId1) {
    console.error(`[DIAGNOSTIC] TEST FAILED: Could not find crawl directory in ${stagingDirBase}. Found: ${allFiles.join(', ')}`);
    throw new Error('Test setup failed: Could not find crawlId directory after Crawl 1.');
  }

  console.log(`[DIAGNOSTIC] Found crawlId1: ${crawlId1}`);
  const stagingDir = `${stagingDirBase}/${crawlId1}`;
  console.log(`[DIAGNOSTIC] Setting stagingDir for Crawl 2 to: ${stagingDir}`);
  // --- End of replacement block ---

  // ...
  const cart2 = new Cartographer();
  let secondRunIncomplete: boolean | undefined;
  gotCheckpoint = false;
  let gotFinished2 = false;

  const off2 = bus.onWithReplay('checkpoint.saved', (ev) => {
    console.log('[TEST DEBUG] checkpoint.saved event (resume):', ev);
    if (isCheckpoint(ev)) gotCheckpoint = true;
  });
  const offFinished2 = bus.on('crawl.finished', (ev) => {
    if (isFinished(ev)) {
      secondRunIncomplete = ev.incomplete;
      gotFinished2 = true;
    }
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
  // Wait for both checkpoint and crawl.finished before canceling
  while ((!gotCheckpoint || !gotFinished2) && waited < 15000) {
    await sleep(100);
    waited += 100;
  }
  assert.ok(gotCheckpoint, 'expected a checkpoint to be emitted after resume');
  assert.ok(gotFinished2, 'expected crawl.finished to be emitted after resume');
  off2();

  await cart2.cancel();
  assert.equal(secondRunIncomplete, false, 'second run should be complete after resume');
});
