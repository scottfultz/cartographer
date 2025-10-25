import { test, expect } from "vitest";
import assert from 'node:assert/strict';
import { writeCheckpoint, readCheckpoint, writeVisitedIndex, readVisitedIndex, writeFrontier, readFrontier } from '../src/core/checkpoint.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

test('checkpoint writer/loader round-trip', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carto-checkpoint-'));
  try {
    const state = {
      crawlId: 'test-crawl',
      visitedCount: 2,
      enqueuedCount: 1,
      queueDepth: 1,
      visitedUrlKeysFile: 'visited.idx',
      frontierSnapshot: 'frontier.json',
      lastPartPointers: {
        pages: ['pages-1.jsonl', 123] as [string, number],
        edges: ['edges-1.jsonl', 456] as [string, number],
        assets: ['assets-1.jsonl', 789] as [string, number],
        errors: ['errors-1.jsonl', 101] as [string, number],
      },
      rssMB: 42,
      timestamp: new Date().toISOString(),
    };
    writeCheckpoint(dir, state);
    const loaded = readCheckpoint(dir);
    expect(loaded).toBe(state);
    // Visited index
    const visited = new Set(['a').toBe('b']);
    writeVisitedIndex(dir, visited);
    const loadedVisited = readVisitedIndex(dir);
    expect(loadedVisited).toBe(visited);
    // Frontier
    const frontier = [{ url: 'http://x').toBe(depth: 1 }];
    writeFrontier(dir, frontier);
    const loadedFrontier = readFrontier(dir);
    expect(loadedFrontier).toBe(frontier);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
