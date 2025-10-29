# Fix Plan: Atlas Archive Data Loss Issue

**Priority:** CRITICAL - Blocking beta release  
**Created:** October 25, 2025  
**Estimated Fix Time:** 2-4 hours  
**Status:** 🔴 IN PROGRESS

---

## Problem Statement

Archive data shows **critical field loss** despite crawler logs confirming extraction:
- ❌ `technologies[]` - Empty despite logs showing "Detected 11 technologies"
- ❌ `openGraph{}` - Empty despite logs showing "Captured OpenGraph"
- ❌ `twitterCard{}` - Empty despite logs showing "Captured TwitterCard"
- ❌ `screenshotPath` - Null (screenshots may not be enabled)
- ❌ `wordCount` - Null (may not be calculated)
- ❌ `viewportWidth/Height` - Null (may not be stored)

**Evidence:** Crawler logs show extraction, but `unzip -p archive.atls pages/*.zst | zstd -d` shows empty arrays/objects.

---

## Investigation Plan (Sequential)

### Phase 1: Type Definition Audit (15 minutes)

**Goal:** Verify PageRecord interface includes all expected fields

```bash
# Check PageRecord interface
cat packages/atlas-spec/src/types.ts | grep -A 100 "interface PageRecord"

# Expected fields to verify:
# - technologies: Technology[]
# - openGraph: Record<string, string>
# - twitterCard: Record<string, string>
# - screenshotPath?: string
# - wordCount?: number
# - viewportWidth?: number
# - viewportHeight?: number
```

**Action Items:**
1. ✅ If fields missing from interface → Add them
2. ✅ Check if fields are marked optional (`?`) vs required
3. ✅ Verify Technology type is properly defined
4. ✅ Compare against what scheduler.ts creates

**Expected Outcome:** PageRecord interface has all fields OR we discover type mismatch.

---

### Phase 2: Data Flow Tracing (30 minutes)

**Goal:** Follow data from extraction → serialization to find where it disappears

#### Step 2.1: Check Extractors

```bash
# Verify extractors exist and return data
grep -n "detectTechnologies" packages/cartographer/src/extractors/technologies.ts
grep -n "extractOpenGraph" packages/cartographer/src/extractors/metadata.ts
grep -n "extractTwitterCard" packages/cartographer/src/extractors/metadata.ts

# Check if they're called in scheduler
grep -n "detectTechnologies\|extractOpenGraph\|extractTwitterCard" \
  packages/cartographer/src/core/scheduler.ts
```

**Action Items:**
1. Confirm extractors are invoked in `processPage()`
2. Check return types match PageRecord fields
3. Look for any `try/catch` silently swallowing errors

#### Step 2.2: Check Scheduler Assembly

```bash
# Find where PageRecord is assembled
grep -B 10 -A 10 "writePages\|writePage" packages/cartographer/src/core/scheduler.ts
```

**Action Items:**
1. Find where page object is constructed
2. Verify `technologies`, `openGraph`, `twitterCard` are assigned
3. Check if conditionals skip assignment (e.g., `if (!data) return`)
4. Add temporary `console.log(JSON.stringify(pageData))` before `writePages()`

#### Step 2.3: Check AtlasWriter

```bash
# Examine writePages implementation
cat packages/cartographer/src/io/atlas/writer.ts | grep -A 50 "async writePages"
```

**Action Items:**
1. Check if writer filters fields (allowlist pattern)
2. Look for `JSON.stringify` with replacer function
3. Verify all PageRecord fields are written to stream
4. Check for any schema validation that drops fields

---

### Phase 3: Minimal Reproduction (20 minutes)

**Goal:** Isolate issue with single-page crawl

```bash
cd packages/cartographer

# Ensure built
pnpm build

# Run minimal crawl with debug logging
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --maxPages 1 \
  --out ../../test-single.atls \
  --logLevel debug \
  --force

# Extract and inspect
unzip -p ../../test-single.atls pages/part-001.jsonl.zst | zstd -d | jq . > /tmp/page-data.json

# Check fields
cat /tmp/page-data.json | jq '{
  url,
  technologies: (.technologies | length),
  openGraph: (.openGraph | keys | length),
  twitterCard: (.twitterCard | keys | length),
  screenshotPath,
  wordCount,
  viewportWidth
}'
```

**Action Items:**
1. Run single-page crawl
2. Inspect extracted page data
3. If fields missing → bug confirmed
4. If fields present → issue is specific to rpmsunstate crawl config

---

### Phase 4: Root Cause Analysis (30 minutes)

Based on Phases 1-3, determine the exact cause:

#### Hypothesis A: Type Definition Missing Fields

**Symptom:** PageRecord interface doesn't include technologies/openGraph/etc.

**Fix:**
```typescript
// packages/atlas-spec/src/types.ts
export interface PageRecord {
  // ... existing fields ...
  
  // Add missing fields:
  technologies: Technology[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  screenshotPath?: string;
  wordCount?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface Technology {
  name: string;
  version?: string;
  categories?: string[];
}
```

#### Hypothesis B: Writer Filtering Fields

**Symptom:** AtlasWriter only serializes allowed fields

**Fix:**
```typescript
// packages/cartographer/src/io/atlas/writer.ts
async writePages(page: PageRecord): Promise<void> {
  // If there's an allowlist, remove it or add missing fields
  // Change from:
  const allowedFields = { url, title, h1, ... };
  
  // To:
  // Write entire page object (no filtering)
  await this.pagesStream.write(JSON.stringify(page) + '\n');
}
```

#### Hypothesis C: Extractor Not Running

**Symptom:** Logs show extraction but functions return empty

**Fix:**
```typescript
// packages/cartographer/src/core/scheduler.ts
// Add defensive checks:
const technologies = await detectTechnologies(dom) || [];
const openGraph = extractOpenGraph(dom) || {};
const twitterCard = extractTwitterCard(dom) || {};

// Log for debugging:
log('debug', `Extracted: ${technologies.length} techs, ${Object.keys(openGraph).length} OG props`);
```

#### Hypothesis D: Schema Validation Dropping Fields

**Symptom:** JSON schema validation removes "additional properties"

**Fix:**
```json
// packages/cartographer/schemas/pages.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "additionalProperties": true,  // ← Change from false
  "required": ["url", "statusCode", ...],
  "properties": {
    // ... existing ...
    "technologies": {
      "type": "array",
      "items": { "$ref": "#/definitions/Technology" }
    },
    "openGraph": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    }
  }
}
```

---

### Phase 5: Implement Fix (30 minutes)

Based on root cause:

1. **Make Code Changes** (15 min)
   - Update PageRecord interface if needed
   - Fix AtlasWriter serialization if filtering
   - Add missing extractor calls if not running
   - Update schemas if validation dropping fields

2. **Add Temporary Logging** (5 min)
   ```typescript
   // In scheduler.ts processPage():
   console.log('[DEBUG] Technologies extracted:', technologies.length);
   console.log('[DEBUG] OpenGraph extracted:', Object.keys(openGraph).length);
   console.log('[DEBUG] Before writePages:', JSON.stringify(pageData).length, 'bytes');
   ```

3. **Rebuild** (5 min)
   ```bash
   cd packages/cartographer
   pnpm build
   ```

4. **Test Fix** (5 min)
   ```bash
   node dist/cli/index.js crawl \
     --seeds https://example.com \
     --maxPages 1 \
     --out ../../test-fixed.atls \
     --force
   
   unzip -p ../../test-fixed.atls pages/part-001.jsonl.zst | zstd -d | jq .technologies
   # Should show array with items!
   ```

---

### Phase 6: Validation (45 minutes)

1. **Single Page Test** (5 min)
   ```bash
   # Verify example.com has all fields
   unzip -p test-fixed.atls pages/part-001.jsonl.zst | zstd -d | jq '{
     technologies, openGraph, twitterCard, screenshotPath, wordCount
   }'
   ```

2. **Multi-Page Test** (10 min)
   ```bash
   # Crawl 5 pages
   node dist/cli/index.js crawl \
     --seeds https://example.com \
     --maxPages 5 \
     --out test-multi.atls \
     --force
   
   # Check all 5 pages have data
   unzip -p test-multi.atls pages/part-001.jsonl.zst | zstd -d | \
     jq -r 'select(.technologies | length > 0) | .url'
   # Should list URLs with technologies detected
   ```

3. **Create Integration Test** (15 min)
   ```typescript
   // packages/cartographer/test/integration/archive-completeness.test.ts
   import { test, expect } from 'vitest';
   import { openAtlas } from '@atlas/sdk';
   
   test('archive contains all expected fields', async () => {
     // Crawl test page
     await crawl({ seeds: ['https://example.com'], maxPages: 1 });
     
     // Open archive
     const atlas = await openAtlas('./test.atls');
     
     // Check first page
     for await (const page of atlas.readers.pages()) {
       expect(page.technologies).toBeDefined();
       expect(Array.isArray(page.technologies)).toBe(true);
       expect(page.openGraph).toBeDefined();
       expect(typeof page.openGraph).toBe('object');
       break;
     }
   });
   ```

4. **Run Full Test Suite** (10 min)
   ```bash
   cd /Users/scottfultz/Projects/Cartographer
   pnpm test
   ```

5. **Remove Debug Logging** (5 min)
   - Clean up temporary console.log statements
   - Rebuild

---

### Phase 7: Re-Run Stress Test (40+ minutes)

**Goal:** Verify fix works on full-scale crawl

```bash
# Re-crawl rpmsunstate.com with same config
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://rpmsunstate.com \
  --out ./archive/rpmsunstate-fixed.atls \
  --mode prerender \
  --maxPages 0 \
  --maxDepth -1 \
  --logLevel info \
  --concurrency 8 \
  --rps 2 \
  --respectRobots \
  --stealth \
  --validateArchive \
  --force

# Spot check 5 pages
unzip -p archive/rpmsunstate-fixed.atls pages/part-001.jsonl.zst | zstd -d | \
  head -5 | jq '{url, tech: (.technologies|length), og: (.openGraph|keys|length)}'

# All should show tech > 0, og > 0
```

**Expected Results:**
- 306 pages crawled (same as before)
- All pages have `technologies.length > 0`
- All pages have `openGraph` with keys
- Blog posts have `twitterCard` populated
- Zero schema validation warnings (if schemas updated)

**Update Documentation:**
```bash
# Update stress test results
vim STRESS_TEST_RESULTS.md
# Change status from "DATA LOSS" to "COMPLETE"
# Update field presence from ❌ to ✅

# Archive quality report
vim ARCHIVE_DATA_QUALITY_ISSUES.md
# Add "RESOLVED" section at top with fix details
```

---

### Phase 8: Schema Updates (20 minutes)

**Goal:** Eliminate 24,051 "additional properties" warnings

```bash
# Update all schemas
cd packages/cartographer/schemas

# pages.schema.json
# edges.schema.json
# assets.schema.json
# accessibility.schema.json
```

**Changes:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "additionalProperties": true,  // ← Change from false or add if missing
  "properties": {
    // Ensure all PageRecord fields are defined
    "technologies": { "type": "array" },
    "openGraph": { "type": "object" },
    "twitterCard": { "type": "object" },
    "screenshotPath": { "type": ["string", "null"] },
    "wordCount": { "type": ["number", "null"] },
    "viewportWidth": { "type": ["number", "null"] },
    "viewportHeight": { "type": ["number", "null"] }
  }
}
```

**Test:**
```bash
node dist/cli/index.js validate --atls archive/rpmsunstate-fixed.atls
# Should show 0 warnings or minimal warnings
```

---

## Success Criteria

- ✅ Single-page crawl shows all fields populated
- ✅ Multi-page crawl (5 pages) shows consistent data
- ✅ Integration test passes
- ✅ Full test suite passes (pnpm test)
- ✅ Stress test re-run shows complete data (306 pages)
- ✅ Schema validation shows 0 or minimal warnings
- ✅ Documentation updated (STRESS_TEST_RESULTS.md, ARCHIVE_DATA_QUALITY_ISSUES.md)

---

## Rollout Plan

1. ✅ Fix implemented and tested locally
2. ✅ Integration test added to prevent regression
3. ✅ Stress test re-run successful
4. ✅ Documentation updated
5. Commit changes:
   ```bash
   git add -A
   git commit -m "fix(atlas): restore missing fields in archive serialization
   
   - Add technologies, openGraph, twitterCard to PageRecord serialization
   - Fix AtlasWriter to include all extracted fields
   - Update schemas to allow additionalProperties
   - Add integration test for field presence
   - Re-validated with 306-page stress test
   
   Fixes critical data loss issue discovered in archive spot check.
   All extracted data now properly written to archive.
   "
   ```
6. Run CI to confirm
7. Tag v1.0.0-beta.1
8. Push to npm

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Type Definition Audit | 15 min | ⏸️ Not Started |
| 2. Data Flow Tracing | 30 min | ⏸️ Not Started |
| 3. Minimal Reproduction | 20 min | ⏸️ Not Started |
| 4. Root Cause Analysis | 30 min | ⏸️ Not Started |
| 5. Implement Fix | 30 min | ⏸️ Not Started |
| 6. Validation | 45 min | ⏸️ Not Started |
| 7. Re-Run Stress Test | 40 min | ⏸️ Not Started |
| 8. Schema Updates | 20 min | ⏸️ Not Started |
| **Total** | **~3.5 hours** | |

---

## Next Step

**START HERE:** Phase 1 - Type Definition Audit

```bash
cat packages/atlas-spec/src/types.ts | grep -A 80 "interface PageRecord"
```

Let me know what you find, and we'll proceed to Phase 2.
