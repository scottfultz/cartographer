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
  // One-off: use caifrazier.com as seed
  const out = 'tmp/resume-test.atls';
  const seeds = ['https://caifrazier.com/'];

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
// ...existing code...
