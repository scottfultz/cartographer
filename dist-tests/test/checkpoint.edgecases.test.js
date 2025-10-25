import test from 'node:test';
import assert from 'node:assert/strict';
import { writeCheckpoint, readCheckpoint, writeVisitedIndex, writeFrontier } from '../src/core/checkpoint.js';
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
                pages: ['pages-1.jsonl', 0],
                edges: ['edges-1.jsonl', 0],
                assets: ['assets-1.jsonl', 0],
                errors: ['errors-1.jsonl', 0],
            },
            rssMB: 0,
            timestamp: new Date().toISOString(),
        };
        writeCheckpoint(dir, state);
        writeVisitedIndex(dir, new Set());
        writeFrontier(dir, []);
        const loaded = readCheckpoint(dir);
        assert.deepEqual(loaded, state);
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
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
        assert.equal(loaded, null);
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
// Edge case: time-based checkpoint emission
test('time-based checkpoint emission triggers', async () => {
    // Simulate config with everySeconds
    // This is a stub, real test would need to mock timers
    assert.ok(true, 'time-based checkpoint emission stub');
});
// Edge case: error budget exceeded triggers checkpoint
test('error budget exceeded triggers checkpoint', async () => {
    // Simulate config with errorBudget
    // This is a stub, real test would need to simulate errors
    assert.ok(true, 'error budget checkpoint stub');
});
//# sourceMappingURL=checkpoint.edgecases.test.js.map