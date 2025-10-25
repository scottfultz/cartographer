import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAtlas } from '../src/io/atlas/validate.js';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
test('atlas validator detects duplicate urlKeys', async () => {
    const dir = mkdtempSync('/tmp/carto-dups-');
    try {
        mkdirSync(dir + '.staging');
        writeFileSync(join(dir + '.staging', 'manifest.json'), JSON.stringify({ incomplete: false, partCounts: { pages: 1 } }));
        const pagesDir = join(dir + '.staging', 'pages');
        mkdirSync(pagesDir);
        // Write two records with same urlKey
        writeFileSync(join(pagesDir, 'part-1.jsonl'), JSON.stringify({ urlKey: 'abc', url: 'http://x' }) + '\n' + JSON.stringify({ urlKey: 'abc', url: 'http://y' }) + '\n');
        const result = await validateAtlas(dir, { checkDuplicates: true });
        assert.equal(result.ok, false);
        assert(result.errors.some(e => e.includes('Duplicate urlKeys')));
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
        rmSync(dir + '.staging', { recursive: true, force: true });
    }
});
//# sourceMappingURL=atlas.duplicates.test.js.map