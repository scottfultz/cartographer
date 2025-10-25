import test from 'node:test';
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
                pages: ['pages-1.jsonl', 123],
                edges: ['edges-1.jsonl', 456],
                assets: ['assets-1.jsonl', 789],
                errors: ['errors-1.jsonl', 101],
            },
            rssMB: 42,
            timestamp: new Date().toISOString(),
        };
        writeCheckpoint(dir, state);
        const loaded = readCheckpoint(dir);
        assert.deepEqual(loaded, state);
        // Visited index
        const visited = new Set(['a', 'b']);
        writeVisitedIndex(dir, visited);
        const loadedVisited = readVisitedIndex(dir);
        assert.deepEqual(loadedVisited, visited);
        // Frontier
        const frontier = [{ url: 'http://x', depth: 1 }];
        writeFrontier(dir, frontier);
        const loadedFrontier = readFrontier(dir);
        assert.deepEqual(loadedFrontier, frontier);
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=checkpoint.roundtrip.test.js.map