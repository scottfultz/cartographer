# Atlas v1.0 - Quick Action Plan

**Created:** October 28, 2025  
**Status:** Ready for Implementation

---

## TL;DR

Previous agent left Atlas v1.0 spec implementation ~60% complete. Three critical gaps prevent full spec compliance:

1. ❌ Manifest structure doesn't match spec (have `manifest.json`, need `manifest.v1.json` with different schema)
2. ❌ Provenance tracking infrastructure exists but never writes `provenance.v1.jsonl.zst` file
3. ❌ Missing page-level timing metadata (`wait_condition`, `timings` object)

**Quick Fix (6-8 hours):** Implement Priority 1 tasks below.

---

## What's Already Working ✅

- UUID v7 `page_id` generation and propagation
- Content hashing (rawHtmlHash, domHash, contentHash)
- Producer & environment metadata capture
- Coverage matrix with expected/present/row_count
- SHA-256 integrity checksums per part
- Privacy defaults (stripCookies, redactInputValues, etc.)
- JSON Schema validation per dataset
- All core datasets written (pages, edges, assets, errors, events, accessibility, dom_snapshots, console, styles)

---

## Priority 1: Critical Fixes (6-8 hours)

### Task 1: Fix Manifest Structure (2-3 hours)

**Problem:** Current `manifest.json` uses wrong schema vs spec.

**Fix:**
1. Open `packages/atlas-spec/src/types.ts`
2. Find `AtlasManifestV1Enhanced` interface (line 1364)
3. This is closer to spec requirements than current `AtlasManifest`
4. Update `packages/cartographer/src/io/atlas/manifest.ts` → `buildManifest()`:
   - Rename output file to `manifest.v1.json`
   - Add missing fields:
     - `crawl_config_hash` (SHA-256 of normalized config)
     - `content_addressing: "off"` (set to "on" when blob storage implemented)
     - `storage.replay_tier` (from config)
     - `storage.blob_format: "zst"`
     - `privacy_policy` block (from config.privacy)
     - `robots_policy.override_reason` (if override used)
     - `datasets[name].version: "v1"`
     - `integrity.audit_hash` (SHA-256 of sorted part hashes)

**Test:**
```bash
pnpm build
node packages/cartographer/dist/cli/index.js crawl --seeds https://example.com --out test.atls --maxPages 5
unzip -l test.atls | grep manifest
# Should show: manifest.v1.json
```

---

### Task 2: Write Provenance File (1-2 hours)

**Problem:** `ProvenanceTracker` class exists but is never written to archive.

**Fix:**
1. Open `packages/cartographer/src/io/atlas/writer.ts`
2. In `finalize()` method (around line 670), after compressing parts:
   ```typescript
   // Write provenance JSONL
   log('info', '[AtlasWriter] Writing provenance...');
   await this.provenanceTracker.writeToArchive(this.stagingDir);
   ```
3. Open `packages/cartographer/src/io/atlas/provenanceTracker.ts`
4. Verify `writeToArchive()` method:
   - Writes to `${stagingDir}/provenance.v1.jsonl`
   - Compresses to `provenance.v1.jsonl.zst`
   - Deletes uncompressed file
5. Update `createZipArchive()` to include provenance file

**Test:**
```bash
pnpm build
node packages/cartographer/dist/cli/index.js crawl --seeds https://example.com --out test.atls --maxPages 5
unzip -l test.atls | grep provenance
# Should show: provenance.v1.jsonl.zst
```

---

### Task 3: Add Page Timing Metadata (2-3 hours)

**Problem:** No `wait_condition` or `timings` object in PageRecord.

**Fix:**
1. Open `packages/atlas-spec/src/types.ts`
2. Add to `PageRecord` interface (around line 236):
   ```typescript
   // Render timing (Atlas v1.0 Enhancement)
   wait_condition?: "domcontentloaded" | "networkidle0" | "networkidle2" | "load";
   timings?: {
     nav_start: number;              // Performance.timeOrigin
     dom_content_loaded?: number;    // DOMContentLoaded timestamp
     load_event_end?: number;        // Load event timestamp
     network_idle_reached?: number;  // Network idle timestamp (if applicable)
     first_paint?: number;           // First Paint (if available)
     first_contentful_paint?: number; // FCP (if available)
   };
   ```
3. Open `packages/cartographer/src/core/renderer.ts`
4. In `render()` method, after page load, capture timings:
   ```typescript
   const perfTiming = await page.evaluate(() => {
     const perf = window.performance;
     const timing = perf.timing;
     return {
       nav_start: perf.timeOrigin,
       dom_content_loaded: timing.domContentLoadedEventEnd,
       load_event_end: timing.loadEventEnd,
       first_paint: perf.getEntriesByType('paint').find(e => e.name === 'first-paint')?.startTime,
       first_contentful_paint: perf.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime
     };
   });
   ```
5. Add `wait_condition` based on render mode:
   - `raw` → `null` (no JS)
   - `prerender` → `"load"`
   - `full` → `"networkidle0"`
6. Pass timings to scheduler → writer

**Test:**
```bash
pnpm build
node packages/cartographer/dist/cli/index.js crawl --seeds https://example.com --out test.atls --maxPages 1
# Validate PageRecord has timings
node packages/cartographer/dist/cli/index.js validate --atls test.atls --dataset pages
```

---

## Priority 2: Data Integrity (3-4 hours)

### Task 4: Add Audit Hash (1 hour)

**Fix:**
1. Open `packages/cartographer/src/io/atlas/manifest.ts`
2. In `buildManifest()`, after computing all part hashes:
   ```typescript
   // Compute audit hash (Merkle root)
   const sortedHashes = Object.entries(files)
     .sort(([a], [b]) => a.localeCompare(b))
     .map(([_, hash]) => hash)
     .join('');
   const auditHash = sha256(Buffer.from(sortedHashes));
   
   // Add to manifest
   manifest.integrity.audit_hash = auditHash;
   ```

---

### Task 5: Deterministic Ordering (2-3 hours)

**Fix:**
1. Create `packages/cartographer/src/io/atlas/sorter.ts`:
   ```typescript
   export async function sortDataset(inputPath: string, outputPath: string, sortKey: (record: any) => string) {
     // Read all records into memory
     // Sort by key
     // Write sorted JSONL
   }
   ```
2. In `writer.ts`, before compression:
   ```typescript
   await sortDataset('pages/pages_part_00.jsonl', 'pages/pages_part_00.sorted.jsonl', 
     (page) => page.normalizedUrl);
   await sortDataset('edges/edges_part_00.jsonl', 'edges/edges_part_00.sorted.jsonl',
     (edge) => `${edge.source_page_id}:${edge.targetUrl}`);
   ```

**⚠️ WARNING:** This requires holding datasets in memory. For large crawls (>1M pages), implement external sort or skip this optimization.

---

## Non-Critical Enhancements (Future)

### Versioned Dataset Paths
- Change `pages/` → `data/pages.v1/`
- **Breaking change** - defer to v2.0.0

### Separate Datasets
- `responses.v1/` - HTTP metadata
- `render.v1/` - Render metadata
- `seo_signals.v1/` - SEO metadata
- `sitemaps.v1/` - Sitemap data
- `robots.v1/` - Robots decisions

### Blob Storage
- Implement `blobs/sha256/ab/cd/...` for HTML bodies
- Make opt-in with `--store-blobs` flag

---

## Testing Checklist

After each task:
1. ✅ `pnpm build` succeeds
2. ✅ `pnpm test --filter=@cf/cartographer` passes
3. ✅ Test crawl completes: `node dist/cli/index.js crawl --seeds https://example.com --out test.atls --maxPages 5`
4. ✅ Archive structure valid: `unzip -l test.atls`
5. ✅ Validation passes: `node dist/cli/index.js validate --atls test.atls`

---

## Files to Edit (Quick Reference)

**Priority 1:**
- `packages/atlas-spec/src/types.ts` (add timings to PageRecord)
- `packages/cartographer/src/io/atlas/manifest.ts` (fix manifest structure)
- `packages/cartographer/src/io/atlas/writer.ts` (call provenance write)
- `packages/cartographer/src/core/renderer.ts` (capture timings)

**Priority 2:**
- `packages/cartographer/src/io/atlas/manifest.ts` (add audit hash)
- `packages/cartographer/src/io/atlas/sorter.ts` (new file - deterministic ordering)

---

## Next Agent Instructions

If you're picking this up:

1. Read `ATLAS_SPEC_GAP_ANALYSIS.md` for full context
2. Start with Priority 1, Task 1 (manifest structure)
3. Test after each task - don't batch changes
4. Update tests as you go (expect path changes)
5. Run `pnpm test` frequently to catch regressions

**Estimated time:** 6-8 hours for Priority 1 (critical fixes)

Good luck! 🚀
