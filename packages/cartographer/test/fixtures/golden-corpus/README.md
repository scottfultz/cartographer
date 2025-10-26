# Golden Corpus Test Fixtures

This directory contains curated `.atls` archives for comprehensive test coverage across edge cases and common scenarios.

## Fixtures

### 1. `empty-site.atls`
**Description:** Archive with zero pages successfully crawled (all seeds failed or blocked)
**Expected Counts:**
- Pages: 0
- Edges: 0
- Assets: 0
- Errors: 1+ (seed fetch failures)

**Use Cases:**
- Test archive finalization with no successful crawls
- Verify manifest writes correctly with zero counts
- Ensure SDK handles empty datasets gracefully

**Completion Reason:** `finished` (or `error_budget` if errors exceed threshold)

---

### 2. `single-page.atls`
**Description:** Minimal valid archive with exactly one page, no links
**Expected Counts:**
- Pages: 1
- Edges: 0
- Assets: 0-2 (minimal assets like favicon)
- Errors: 0

**Use Cases:**
- Test minimal valid archive structure
- Verify single-record JSONL handling
- Baseline for SDK iteration tests

**Completion Reason:** `finished`

---

### 3. `errors-only.atls`
**Description:** Archive where all pages encountered errors (timeouts, DNS failures, 5xx)
**Expected Counts:**
- Pages: 0-1 (seed page may partially load)
- Edges: 0
- Assets: 0
- Errors: 3+ (multiple error types)

**Use Cases:**
- Test error handling and logging
- Verify error dataset writes correctly
- Test SDK error iteration

**Completion Reason:** `error_budget` or `finished`

---

### 4. `deep-nesting.atls`
**Description:** Archive with pages at multiple depth levels (0-5)
**Expected Counts:**
- Pages: 6+ (at least one per depth level)
- Edges: 5+ (depth progression links)
- Assets: Variable
- Errors: 0

**Use Cases:**
- Test depth tracking accuracy
- Verify BFS traversal order
- Test depth-based filtering in SDK

**Completion Reason:** `finished`

---

### 5. `accessibility-full.atls` _(Future)_
**Description:** Full-mode crawl with accessibility data
**Expected Counts:**
- Pages: 3
- Edges: Variable
- Assets: Variable
- Accessibility Records: 3

**Use Cases:**
- Test full-mode rendering
- Verify accessibility dataset presence
- Test SDK accessibility iteration

---

## Generating Fixtures

Fixtures are generated using controlled test servers or specific public URLs:

```bash
# Empty site (invalid domain)
node dist/cli/index.js crawl \
  --seeds https://invalid-domain-12345.example \
  --out test/fixtures/golden-corpus/empty-site.atls \
  --max-pages 1 \
  --max-errors 0

# Single page
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out test/fixtures/golden-corpus/single-page.atls \
  --max-pages 1 \
  --max-depth 0

# Errors only (timeout/unreachable)
node dist/cli/index.js crawl \
  --seeds https://httpstat.us/500 https://httpstat.us/503 \
  --out test/fixtures/golden-corpus/errors-only.atls \
  --max-pages 3

# Deep nesting
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out test/fixtures/golden-corpus/deep-nesting.atls \
  --max-depth 3 \
  --max-pages 10
```

## Validation

All fixtures should pass SDK validation:

```bash
npx tsx packages/atlas-sdk/examples/validate-archive.ts \
  packages/cartographer/test/fixtures/golden-corpus/single-page.atls
```

## Usage in Tests

```typescript
import { openAtlas } from '@atlas/sdk';

const atlas = await openAtlas('./test/fixtures/golden-corpus/single-page.atls');
expect(atlas.summary.stats.totalPages).toBe(1);
```

---

**Last Updated:** October 25, 2025  
**Maintainer:** Cai Frazier
