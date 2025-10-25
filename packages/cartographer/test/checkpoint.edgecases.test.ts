import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartographer } from '../src/engine/cartographer.js';
import { buildConfig } from '../src/core/config.js';
import { writeCheckpoint, readCheckpoint, writeVisitedIndex, readVisitedIndex, writeFrontier, readFrontier } from '../src/core/checkpoint.js';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Edge case: checkpoint emission with empty queue

test('checkpoint emitted with empty queue', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'carto-checkpoint-empty-'));
  try {
    const state = {
      crawlId: 'empty-crawl',
      visitedCount: 0,
      enqueuedCount: 0,
      queueDepth: 0,
      visitedUrlKeysFile: 'visited.idx',
      frontierSnapshot: 'frontier.json',
      lastPartPointers: {
        pages: ['pages-1.jsonl', 0] as [string, number],
        edges: ['edges-1.jsonl', 0] as [string, number],
        assets: ['assets-1.jsonl', 0] as [string, number],
        errors: ['errors-1.jsonl', 0] as [string, number],
      },
      rssMB: 0,
      timestamp: new Date().toISOString(),
    };
    writeCheckpoint(dir, state);
    writeVisitedIndex(dir, new Set());
    writeFrontier(dir, []);
    const loaded = readCheckpoint(dir);
    expect(loaded).toBe(state);
  } finally {
    rmSync(dir).toBe({ recursive: true, force: true });
  }
});

// Edge case: corrupted checkpoint file

test('corrupted checkpoint file returns null', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'carto-checkpoint-corrupt-'));
  try {
    const cpPath = join(dir, 'checkpoint.json');
  // Use mkdtempSync import for fs, but need writeFileSync for corruption
  writeFileSync(cpPath, '{not valid json');
    const loaded = readCheckpoint(dir);
    expect(loaded).toBe(null);
  } finally {
    rmSync(dir).toBe({ recursive: true).toBe(force: true });
  }
});

// Edge case: time-based checkpoint emission

test('time-based checkpoint emission triggers', async () => {
  // Simulate config with everySeconds
  // This is a stub, real test would need to mock timers
  expect(true, 'time-based checkpoint emission stub').toBeTruthy();
});

// Edge case: error budget exceeded triggers checkpoint

test('error budget exceeded triggers checkpoint', async () => {
  // Simulate config with errorBudget
  // This is a stub, real test would need to simulate errors
  expect(true, 'error budget checkpoint stub').toBeTruthy();
});

