# CI Failure Analysis - October 26, 2025

## Summary
7 tests failing in CI (both Node 20 and Node 22):
- 5 failures in `media-collection.test.ts` 
- 2 failures in `export-pages-csv.test.ts`

All failures are due to **missing test archive files** (`*.atls` not being created).

## Root Cause Analysis

### Issue 1: Media Collection Tests Running in Isolation
**Problem:** `media-collection.test.ts` creates its own archives but tests are failing because the Cartographer engine is not creating the archive files.

**Files Affected:**
- `./tmp/media-test-raw.atls` - ENOENT
- `./tmp/media-test-prerender.atls` - ENOENT  
- `./tmp/media-test-full.atls` - ENOENT
- `./tmp/media-test-multipage.atls` - ENOENT

**Root Cause:** Tests call `cart.start(config)` but the crawl may be failing silently or timing out before creating archives. The tests don't verify the crawl completed successfully before trying to open the archive.

### Issue 2: Export Tests Depend on Fixture Test
**Problem:** `export-pages-csv.test.ts` expects `./tmp/example.atls` to exist (line 15), which should be created by `crawl-fixture.test.ts`.

**Root Cause:** Vitest runs tests in parallel by default, so there's no guarantee `crawl-fixture.test.ts` runs before the export tests. The dependency is implicit, not explicit.

## Fix Strategy

### Fix 1: Make Media Collection Tests More Robust
1. **Add error handling** around `cart.start()` to catch failures
2. **Add assertions** that archive was created before trying to open it
3. **Add debug logging** to understand what's happening during crawl
4. **Increase timeout** if needed (currently 60s should be enough)
5. **Check if Cartographer is throwing errors** that are being swallowed

### Fix 2: Fix Test Ordering for Smoke Tests
**Options:**
1. **Sequential execution** for smoke tests (use `test.sequential()`)
2. **Create fixture in beforeAll** hook that all export tests depend on
3. **Skip export tests if fixture doesn't exist** (with clear message)
4. **Make crawl-fixture a setup file** that runs first

**Chosen Approach:** Use `test.sequential()` for smoke tests to ensure proper ordering.

### Fix 3: Add Better Test Infrastructure
1. **Create test helper** that verifies archive exists before opening
2. **Add retry logic** for flaky network-dependent tests
3. **Better error messages** when files are missing

## Implementation Plan

### Step 1: Fix Media Collection Tests (High Priority)
- [ ] Add try-catch around `cart.start()` with detailed error logging
- [ ] Add `existsSync()` check before `openAtlas()` calls
- [ ] Add debug output to show what's happening during crawl
- [ ] Verify config is correct (especially media config)

### Step 2: Fix Smoke Test Ordering (High Priority)
- [ ] Convert smoke tests to sequential execution
- [ ] Make crawl-fixture test run first explicitly
- [ ] Add skip logic if example.atls doesn't exist

### Step 3: Test Locally (Critical)
- [ ] Run full test suite: `pnpm test`
- [ ] Run media tests only: `pnpm test media-collection`
- [ ] Run smoke tests only: `pnpm test smoke`
- [ ] Verify all tests pass before committing

### Step 4: Potential Future Issues
- [ ] Check if CI has network issues accessing example.com
- [ ] Verify CI has write permissions to ./tmp directory
- [ ] Check if CI timeout (35s test duration seems OK)
- [ ] Verify Playwright is installed in CI (GitHub Actions should handle this)

## Expected Outcomes

After fixes:
- ✅ All media collection tests create archives successfully
- ✅ Export tests run after crawl-fixture test completes
- ✅ Better error messages when tests fail
- ✅ CI passes on both Node 20 and Node 22

## Test Execution Order (After Fix)

```
1. test/smoke/crawl-fixture.test.ts (sequential, creates example.atls)
2. test/smoke/export-*.test.ts (sequential, depends on example.atls)
3. test/integration/media-collection.test.ts (creates own archives with error handling)
4. All other tests (can run in parallel)
```
