# Cartographer Engine – QUICK_START_FOR_NEW_DEVS

## Local Run
1. Build: `npm run build`
2. Crawl fixture: `npm run dev -- crawl --seeds https://example.com --out tmp/example.atls`
3. Export CSV: `node dist/cli/index.js export --atls tmp/example.atls --report pages --out tmp/pages.csv`
4. Validate: `node dist/cli/index.js validate --atls tmp/example.atls`
5. Open with SDK:
    ```typescript
    import { openAtlas } from '@caifrazier/atlas-sdk';
    const atlas = await openAtlas('./tmp/example.atls');
    for await (const page of atlas.readers.pages()) {
      console.log(page.url, page.statusCode);
    }
    ```

## Reading Logs & Perf
- NDJSON logs: `logs/crawl-<crawlId>.jsonl`
- Perf summary: `tmp/example.perf.json`

## Where to Look First
- CLI: `src/cli/commands/`
- Engine: `src/core/`
- Archive: `src/io/atlas/`, `src/io/readers/`
- SDK: `packages/atlas-sdk/`
- Tests: `test/`

---
A new dev can produce a valid .atls and read it via the SDK in under 10 minutes.
