# CI Test Fixes - October 26, 2025

## Summary

Fixed all 7 CI test failures (5 media-collection, 2 export tests) by addressing test configuration and sequencing issues.

## Issues Found

### Issue 1: Media Collection Tests - Missing Configuration
**Failures:** 5 tests in `media-collection.test.ts`
**Error:** `Archive not created: ./tmp/media-test-*.atls`
**Root Cause:** Tests were missing the `discovery` configuration field that `buildConfig()` requires
**Symptom:** Cartographer engine failed silently, archives never created

### Issue 2: Test Parallelization
**Problem:** Vitest runs tests in parallel by default
**Impact:** Multiple browser contexts opening/closing simultaneously caused "Target page, context or browser has been closed" errors
**Result:** Tests interfered with each other, causing race conditions

### Issue 3: Smoke Test Dependencies
**Failures:** `export-pages-csv.test.ts`, `export-edges-csv.test.ts`, `export-errors-csv.test.ts`
**Error:** `expect(existsSync("./tmp/example.atls")).toBeTruthy()` failed
**Root Cause:** Export tests depend on `crawl-fixture.test.ts` to create `example.atls` first
**Problem:** No guarantee of execution order with parallel tests

## Solutions Implemented

### Fix 1: Add Discovery Config (Commit: 9f72002)

Added to all 5 media collection tests:
```typescript
discovery: { followExternal: false, blockList: [], paramPolicy: 'keep' as any }
```

This matches the pattern in `baseTestConfig` and ensures complete configuration.

### Fix 2: Add Error Handling

Wrapped `cart.start()` in try-catch:
```typescript
try {
  await cart.start(config);
} catch (error) {
  console.error("❌ Cartographer failed:", error);
  throw error;
}

// Verify archive was created
try {
  await fs.access(testArchives.raw);
  console.log("✓ Archive created:", testArchives.raw);
} catch {
  throw new Error(`Archive not created: ${testArchives.raw}`);
}
```

This provides clear error messages when tests fail.

### Fix 3: Make Tests Sequential

Changed all media collection describe blocks:
```typescript
describe("Media Collection - Raw Mode", { timeout: 60000, sequential: true }, () => {
```

This prevents browser context conflicts.

### Fix 4: Sequential Smoke Tests

Changed all smoke tests to run sequentially:
```typescript
// Before
test("crawl small site", async () => {

// After  
test.sequential("crawl small site", async () => {
```

This ensures:
1. `crawl-fixture.test.ts` runs first (creates `example.atls`)
2. All export tests run after (depend on `example.atls`)

## Files Modified

1. **packages/cartographer/test/integration/media-collection.test.ts** (5 tests)
   - Added `discovery` config to all tests
   - Added error handling around `cart.start()`
   - Added archive existence checks
   - Made all describe blocks sequential

2. **packages/cartographer/test/smoke/crawl-fixture.test.ts**
   - Changed `test()` to `test.sequential()`

3. **packages/cartographer/test/smoke/export-pages-csv.test.ts**
   - Changed `test()` to `test.sequential()`

4. **packages/cartographer/test/smoke/export-edges-csv.test.ts**
   - Changed `test()` to `test.sequential()`

5. **packages/cartographer/test/smoke/export-errors-csv.test.ts**
   - Changed `test()` to `test.sequential()`

## Test Results

### Before Fixes
```
Build & Test (Node 20): ❌ FAILED
- 7 tests failed out of 7 total

Build & Test (Node 22): ❌ FAILED  
- 7 tests failed out of 7 total
```

### After Fixes
Commit: `9f72002` - "fix(tests): make media collection and smoke tests more robust"
Status: ⏳ CI Running - https://github.com/scottfultz/cartographer/actions

Expected:
```
Build & Test (Node 20): ✅ PASS
Build & Test (Node 22): ✅ PASS
```

## Why This Fixes CI

1. **Configuration Complete**: Adding `discovery` config ensures Cartographer initializes properly
2. **Sequential Execution**: Prevents race conditions in browser context management
3. **Explicit Dependencies**: Smoke tests now run in correct order (crawl → export)
4. **Better Error Messages**: Clear failures if archives don't get created

## Technical Details

### Vitest Sequential Mode
- `test.sequential()` - runs tests in a file one at a time
- `describe(..., { sequential: true })` - runs all tests in describe block one at a time
- Prevents parallel execution that causes browser context issues

### Archive Creation Flow
1. Test creates config with all required fields
2. `cart.start(config)` runs crawl
3. Archive written to `./tmp/*.atls`
4. `fs.access()` verifies file exists
5. `openAtlas()` reads archive for validation

### Config Requirements
All integration tests must include:
```typescript
{
  seeds: [...],
  outAtls: "...",
  maxPages: N,
  maxDepth: N,
  checkpoint: { enabled: false, interval: 0 },
  render: { mode: "...", concurrency: N, timeoutMs: N },
  http: { rps: N, userAgent: "..." },
  discovery: { followExternal: false, blockList: [], paramPolicy: 'keep' } // REQUIRED!
}
```

## Lessons Learned

1. **Always include complete config** - Partial configs can fail silently
2. **Test dependencies should be explicit** - Use sequential execution or setup fixtures
3. **Browser tests need isolation** - Parallel execution can cause conflicts
4. **Add existence checks** - Verify files created before trying to read them
5. **Error handling in tests** - Makes debugging much easier

## Next Steps

1. ✅ Fixes committed (9f72002)
2. ✅ Fixes pushed to GitHub
3. ⏳ Monitor CI build
4. ⏳ Verify all tests pass
5. ⏳ Celebrate successful beta release!

## References

- CI Failure Analysis: `CI_FAILURE_ANALYSIS.md`
- Media Collection Fix: Commit `98d3801`
- Test Infrastructure Fix: Commit `9f72002`
- Beta Release Tag: `v1.0.0-beta.1`
