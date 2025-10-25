import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAtlas } from '../src/io/atlas/validate.js';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
test('atlas validator detects missing manifest and part corruption', async () => {
    const dir = mkdtempSync('/tmp/carto-atlas-');
    try {
        // Missing manifest
        let result = await validateAtlas(dir);
        assert.equal(result.ok, false);
        assert(result.errors.some(e => e.includes('Manifest')));
        // Create manifest
        mkdirSync(dir + '.staging');
        writeFileSync(join(dir + '.staging', 'manifest.json'), JSON.stringify({ incomplete: false, partCounts: { pages: 1, edges: 1, assets: 1, errors: 1, accessibility: 1 } }));
        // Create part directories and files
        for (const part of ['pages', 'edges', 'assets', 'errors', 'accessibility']) {
            const partDir = join(dir + '.staging', part);
            mkdirSync(partDir);
            writeFileSync(join(partDir, 'part-1.jsonl'), ''); // Empty file
        }
        result = await validateAtlas(dir);
        assert.equal(result.ok, false);
        assert(result.errors.some(e => e.includes('Empty part file')));
        // Fix file
        for (const part of ['pages', 'edges', 'assets', 'errors', 'accessibility']) {
            const partDir = join(dir + '.staging', part);
            writeFileSync(join(partDir, 'part-1.jsonl'), '{"ok":true}\n');
        }
        result = await validateAtlas(dir);
        assert.equal(result.ok, true);
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
        rmSync(dir + '.staging', { recursive: true, force: true });
    }
});
//# sourceMappingURL=atlas.validate.test.js.map