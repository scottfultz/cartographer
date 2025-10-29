# Atlas v1.0 Immediate Action Plan

**Date:** October 28, 2025  
**Priority:** Critical for Horizon Integration  
**Timeline:** 1-2 Days

---

## Overview

This document outlines the **immediate critical actions** needed to complete the Atlas v1.0 beta based on the implementation status review.

**Reference:** See `ATLAS_V1_IMPLEMENTATION_STATUS.md` for full analysis.

---

## Critical Missing Feature: DOM Snapshot Capture

### Why This Cannot Wait

**Horizon's Dependency:** The accessibility application (Horizon) requires full DOM snapshots to:
- Run offline accessibility audits with axe-core
- Validate ARIA attributes in context
- Recompute violations as WCAG rules evolve
- Support "what-if" scenario testing

**Current Problem:** Cartographer captures accessibility *findings* during crawl but doesn't preserve the *DOM itself*. This means Horizon cannot re-analyze pages offline.

### Implementation Tasks

#### Task 1: Create DOM Snapshot Extractor

**File:** `packages/cartographer/src/core/extractors/domSnapshot.ts`

```typescript
/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { Page } from "playwright";
import { createHash } from "crypto";

export interface DOMSnapshotRecord {
  page_id: string;                    // UUID v7 of parent page
  url: string;                        // Page URL
  snapshot_type: "full" | "shadowdom" | "accessible_tree";
  dom_html: string;                   // document.documentElement.outerHTML
  dom_hash: string;                   // SHA-256 of dom_html
  captured_at: string;                // ISO timestamp
  viewport: {
    width: number;
    height: number;
  };
  render_mode: "raw" | "prerender" | "full";
  scripts_disabled?: boolean;         // Were scripts disabled during capture?
}

/**
 * Extract DOM snapshot for offline accessibility audits
 * Only runs in "full" mode to avoid bloating archives
 */
export async function extractDOMSnapshot(
  page: Page,
  pageId: string,
  url: string,
  renderMode: "raw" | "prerender" | "full"
): Promise<DOMSnapshotRecord | null> {
  // Only capture in full mode
  if (renderMode !== "full") {
    return null;
  }

  try {
    // Capture full DOM
    const domHtml = await page.evaluate(() => document.documentElement.outerHTML);
    
    // Hash for integrity verification
    const domHash = createHash("sha256")
      .update(domHtml, "utf-8")
      .digest("hex");
    
    // Get viewport size
    const viewport = page.viewportSize() || { width: 1920, height: 1080 };
    
    return {
      page_id: pageId,
      url,
      snapshot_type: "full",
      dom_html: domHtml,
      dom_hash: domHash,
      captured_at: new Date().toISOString(),
      viewport,
      render_mode: renderMode
    };
  } catch (error) {
    // Log error but don't fail page processing
    console.error(`[DOM Snapshot] Failed to capture DOM for ${url}:`, error);
    return null;
  }
}
```

**Testing:** `packages/cartographer/test/extractors/domSnapshot.test.ts`

```typescript
import { test, expect } from "vitest";
import { chromium } from "playwright";
import { extractDOMSnapshot } from "../../src/core/extractors/domSnapshot.js";

test("extractDOMSnapshot captures full DOM in full mode", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
      <head><title>Test Page</title></head>
      <body>
        <h1>Hello World</h1>
        <p>Test content</p>
      </body>
    </html>
  `);
  
  const snapshot = await extractDOMSnapshot(page, "test-page-id", "https://example.com", "full");
  
  expect(snapshot).toBeDefined();
  expect(snapshot?.page_id).toBe("test-page-id");
  expect(snapshot?.url).toBe("https://example.com");
  expect(snapshot?.snapshot_type).toBe("full");
  expect(snapshot?.dom_html).toContain("<h1>Hello World</h1>");
  expect(snapshot?.dom_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(snapshot?.viewport).toEqual({ width: 1920, height: 1080 });
  
  await browser.close();
});

test("extractDOMSnapshot returns null in prerender mode", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent("<html><body>Test</body></html>");
  
  const snapshot = await extractDOMSnapshot(page, "test-id", "https://example.com", "prerender");
  
  expect(snapshot).toBeNull();
  
  await browser.close();
});
```

---

#### Task 2: Integrate into Scheduler

**File:** `packages/cartographer/src/core/scheduler.ts`

**Location:** After successful accessibility extraction, before writing PageRecord

```typescript
// Around line 1400 (after accessibility extraction)

// === DOM SNAPSHOT EXTRACTION (Full Mode Only) ===
if (this.config.render.mode === "full") {
  try {
    const domSnapshot = await extractDOMSnapshot(
      item.page,
      item.page_id,
      item.url,
      this.config.render.mode
    );
    
    if (domSnapshot) {
      await this.writer.writeDOMSnapshot(domSnapshot);
      log("debug", `[DOM Snapshot] Captured for ${item.url}`);
    }
  } catch (error) {
    log("warn", `[DOM Snapshot] Failed for ${item.url}: ${error}`);
  }
}
```

**Import statement to add:**
```typescript
import { extractDOMSnapshot } from "./extractors/domSnapshot.js";
```

---

#### Task 3: Add DOM Snapshot Writer

**File:** `packages/cartographer/src/io/atlas/writer.ts`

**Add to class properties:**
```typescript
private domSnapshotsPart = 1;
private domSnapshotsStream: ReturnType<typeof createWriteStream> | null = null;
private domSnapshotsBytes = 0;
```

**Add to init():**
```typescript
await mkdir(join(this.stagingDir, "dom_snapshots"), { recursive: true });
```

**Add writer method:**
```typescript
/**
 * Write DOM snapshot record
 */
async writeDOMSnapshot(record: DOMSnapshotRecord): Promise<void> {
  if (!this.domSnapshotsStream) {
    const filename = `part-${String(this.domSnapshotsPart).padStart(3, "0")}.jsonl`;
    this.domSnapshotsStream = createWriteStream(
      join(this.stagingDir, "dom_snapshots", filename)
    );
  }

  const line = JSON.stringify(record) + "\n";
  this.domSnapshotsStream.write(line);
  this.domSnapshotsBytes += Buffer.byteLength(line);
  
  this.stats.stats.totalDOMSnapshots = (this.stats.stats.totalDOMSnapshots || 0) + 1;
  this.recordsSinceFlush++;
  
  // Rotate at 150MB
  if (this.domSnapshotsBytes > 150 * 1024 * 1024) {
    await this.rotateDOMSnapshotsPart();
  }
  
  // Periodic flush
  if (this.recordsSinceFlush >= this.FLUSH_INTERVAL) {
    await this.flushAndSync();
  }
}

private async rotateDOMSnapshotsPart(): Promise<void> {
  if (this.domSnapshotsStream) {
    this.domSnapshotsStream.end();
  }
  const filename = `part-${String(this.domSnapshotsPart).padStart(3, "0")}.jsonl`;
  this.domSnapshotsStream = createWriteStream(
    join(this.stagingDir, "dom_snapshots", filename)
  );
  this.domSnapshotsPart++;
  this.domSnapshotsBytes = 0;
}
```

**Add to finalize():**
```typescript
// In the stream closing section (around line 700)
if (this.domSnapshotsStream) {
  this.domSnapshotsStream.end();
  await finished(this.domSnapshotsStream);
}

// In the compression section (around line 750)
const domSnapshotParts: string[] = [];
const domSnapshotsDir = join(this.stagingDir, "dom_snapshots");
if (await exists(domSnapshotsDir)) {
  const files = await readdir(domSnapshotsDir);
  for (const file of files.filter(f => f.endsWith(".jsonl"))) {
    const sourcePath = join(domSnapshotsDir, file);
    const destPath = join(dataDir, "dom_snapshots", file + ".zst");
    await mkdir(dirname(destPath), { recursive: true });
    await compressFile(sourcePath, destPath);
    domSnapshotParts.push(destPath);
  }
}

// In the manifest building (around line 850)
const manifest = await buildManifest({
  parts: {
    // ... existing parts ...
    domSnapshots: domSnapshotParts.length > 0 ? domSnapshotParts : undefined
  },
  // ... rest of options ...
});
```

---

#### Task 4: Add to Types

**File:** `packages/atlas-spec/src/types.ts`

Add to `AtlasSummary`:
```typescript
export interface AtlasSummary {
  // ... existing fields ...
  stats: {
    // ... existing stats ...
    totalDOMSnapshots?: number;
  };
}
```

**File:** `packages/cartographer/src/core/types.ts`

Import and re-export:
```typescript
export type { DOMSnapshotRecord } from "./extractors/domSnapshot.js";
```

---

#### Task 5: Create JSON Schema

**File:** `packages/cartographer/src/io/atlas/schemas/dom_snapshots.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://spec.continuum.local/atlas/dom_snapshots.schema.json#1",
  "title": "DOMSnapshotRecord",
  "description": "DOM snapshot for offline accessibility audits - Owner: Cai Frazier",
  "type": "object",
  "required": [
    "page_id",
    "url",
    "snapshot_type",
    "dom_html",
    "dom_hash",
    "captured_at",
    "viewport",
    "render_mode"
  ],
  "additionalProperties": false,
  "properties": {
    "page_id": {
      "type": "string",
      "description": "UUID v7 of parent page"
    },
    "url": {
      "type": "string",
      "format": "uri",
      "description": "Page URL"
    },
    "snapshot_type": {
      "type": "string",
      "enum": ["full", "shadowdom", "accessible_tree"],
      "description": "Type of DOM snapshot"
    },
    "dom_html": {
      "type": "string",
      "description": "Complete HTML of document.documentElement.outerHTML"
    },
    "dom_hash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "SHA-256 hash of dom_html"
    },
    "captured_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of capture"
    },
    "viewport": {
      "type": "object",
      "required": ["width", "height"],
      "properties": {
        "width": { "type": "integer", "minimum": 1 },
        "height": { "type": "integer", "minimum": 1 }
      }
    },
    "render_mode": {
      "type": "string",
      "enum": ["raw", "prerender", "full"],
      "description": "Render mode used during capture"
    },
    "scripts_disabled": {
      "type": "boolean",
      "description": "Whether JavaScript was disabled during capture"
    }
  }
}
```

---

#### Task 6: Update Atlas SDK

**File:** `packages/atlas-sdk/src/readers/index.ts`

Add DOM snapshot reader:
```typescript
export async function* readDOMSnapshots(atlasPath: string): AsyncIterableIterator<DOMSnapshotRecord> {
  const reader = await AtlasReader.open(atlasPath);
  
  if (!reader.datasets.has('dom_snapshots')) {
    return;
  }
  
  for await (const record of reader.readDataset('dom_snapshots')) {
    yield record as DOMSnapshotRecord;
  }
}
```

**File:** `packages/atlas-sdk/src/index.ts`

Export the type:
```typescript
export type { DOMSnapshotRecord } from '@atlas/spec';
export { readDOMSnapshots } from './readers/index.js';
```

---

#### Task 7: Update Documentation

**File:** `README.md`

Add to dataset list:
```markdown
- **dom_snapshots/** - Full DOM snapshots for offline accessibility audits (full mode only)
  - Post-render HTML with all JavaScript execution complete
  - Enables Horizon to re-run audits without network access
  - Zstandard compressed (typical 10:1 ratio)
  - Only captured in `--mode full` to minimize archive size
```

**File:** `packages/atlas-sdk/QUICK_REFERENCE.md`

Add example:
```typescript
// Read DOM snapshots for offline accessibility testing
for await (const snapshot of readDOMSnapshots('./crawl.atls')) {
  console.log(`DOM for ${snapshot.url}: ${snapshot.dom_html.length} bytes`);
  console.log(`Hash: ${snapshot.dom_hash}`);
  console.log(`Viewport: ${snapshot.viewport.width}x${snapshot.viewport.height}`);
}
```

---

## Testing Plan

### Unit Tests (4-6 hours)

1. `domSnapshot.test.ts` - Extractor logic (3 tests)
2. `writer.test.ts` - Add DOM snapshot write tests (2 tests)
3. `manifest.test.ts` - Verify dom_snapshots in coverage matrix (1 test)

### Integration Tests (2-4 hours)

1. E2E crawl with `--mode full` - verify dom_snapshots part exists
2. Validate DOM snapshot compression ratio
3. Verify Atlas SDK can read dom_snapshots dataset

### Manual Validation (1 hour)

```bash
# Run small full-mode crawl
pnpm build
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 5 \
  --out test-dom.atls

# Verify DOM snapshots exist
unzip -l test-dom.atls | grep dom_snapshots

# Extract and inspect
unzip test-dom.atls
ls -lh data/dom_snapshots/
zstd -d data/dom_snapshots/part-000.jsonl.zst
head -n 1 data/dom_snapshots/part-000.jsonl | jq .
```

---

## Rollout Checklist

- [ ] Create `domSnapshot.ts` extractor with tests
- [ ] Integrate extractor into scheduler.ts
- [ ] Add DOM snapshot writer methods to writer.ts
- [ ] Create `dom_snapshots.schema.json`
- [ ] Update manifest.ts to include dom_snapshots in coverage matrix
- [ ] Add DOM snapshot reader to Atlas SDK
- [ ] Update README and SDK documentation
- [ ] Run unit tests (all passing)
- [ ] Run integration tests (E2E with full mode)
- [ ] Manual validation with real crawl
- [ ] Update PHASE_6_COMPLETE.md to include DOM snapshots
- [ ] Commit with message: "feat: Add DOM snapshot capture for offline accessibility audits"

---

## Success Criteria

✅ **Complete when:**
1. Full-mode crawls generate `data/dom_snapshots/*.jsonl.zst` files
2. DOM HTML is captured with SHA-256 integrity hashes
3. Atlas SDK can iterate DOM snapshots with `readDOMSnapshots()`
4. All tests pass (570 → 576+ tests)
5. Archive size increase is acceptable (~50KB per page compressed)
6. Horizon team confirms DOM snapshots are sufficient for offline audits

---

## Timeline Estimate

| Task | Duration | Dependencies |
|------|----------|--------------|
| Create extractor + tests | 2 hours | None |
| Integrate into scheduler | 1 hour | Extractor |
| Add writer methods | 2 hours | Extractor |
| Update types + schemas | 1 hour | Writer |
| Update SDK | 1 hour | Types |
| Documentation | 1 hour | All |
| Testing + validation | 2 hours | All |
| **Total** | **10 hours** | |

**Realistic delivery:** 1-2 days with testing and validation.

---

## Post-Implementation

After DOM snapshots are working:

1. **Validate with Horizon team** - Confirm DOM format meets their needs
2. **Benchmark compression** - Measure actual compression ratios on real sites
3. **Consider blob storage** - If DOM snapshots are very large, move to blob storage like HTML bodies
4. **Add to Phase 7 docs** - Update implementation status reports

---

**Prepared by:** GitHub Copilot  
**Date:** October 28, 2025  
**Next action:** Implement DOM snapshot extractor
