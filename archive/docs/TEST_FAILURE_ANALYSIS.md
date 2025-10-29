# Test Failure Analysis & Fix Plan
**Date:** 2024-01-24
**Status:** 349/387 passing (90.2%)
**Remaining:** 38 failures across 21 test files

## Categories of Failures

### 🔴 Category 1: WCAG Data Static Tests (15 failures)
**File:** `test/phase1/wcagData-static.test.ts`
**Status:** 21/36 passing
**Root Cause:** Implementation behavior doesn't match test expectations

#### Failures:
1. `extractAriaLiveRegions - detects implicit status role`
2. `extractAriaLiveRegions - ignores duplicate explicit and implicit`
3. `analyzeFocusOrder - tabindex 0 is not flagged as positive`
4. `analyzeFocusOrder - mixed positive and negative`
5. `analyzeFocusOrder - enforces 100 element cap on positive tracking`
6. `analyzeFormAutocomplete - detects email input`
7. `analyzeFormAutocomplete - detects tel input`
8. `analyzeFormAutocomplete - detects name fields by name attribute`
9. `analyzeFormAutocomplete - detects address fields`
10. `analyzeFormAutocomplete - detects postal code fields`
11. `analyzeFormAutocomplete - detects city and country fields`
12. `analyzeFormAutocomplete - handles complex form`
13. `analyzeFormAutocomplete - includes selectors`
14. `analyzeFormAutocomplete - enforces 100 input cap`
15. `analyzeFormAutocomplete - ignores non-personal data inputs`

**Fix Plan:**
- Run each test individually to see exact error messages
- Compare implementation logic with test expectations
- Determine if tests need updating or if there's a bug in implementation

---

### 🟡 Category 2: Smoke Tests - Missing Fixtures (3 failures)
**Files:** 
- `test/smoke/crawl-fixture.test.ts`
- `test/smoke/export-edges-csv.test.ts`
- `test/smoke/export-pages-csv.test.ts`

**Root Cause:** Tests expect pre-existing `.atls` fixture files that don't exist

#### Failures:
1. `crawl small site` - Likely creates the fixture
2. `export edges CSV` - Expects `./tmp/example.atls`
3. `export pages CSV` - Expects `./tmp/example.atls`

**Fix Plan:**
- Check if crawl-fixture test should run first to create fixture
- Consider test ordering or creating a setup script
- May need to generate fixture or update test to create it

---

### 🟠 Category 3: Integration Tests (2 failures)
**Files:**
- `test/smoke/accessibility-integration.test.ts`
- `test/smoke/atlas-sdk-integration.test.ts`

**Root Cause:** Integration tests failing, likely due to missing setup or data

#### Failures:
1. `crawl with accessibility should write accessibility stream and enrich manifest`
2. `Atlas SDK can read engine output`

**Fix Plan:**
- Check what these tests expect
- Verify prerequisites are met
- May be related to missing fixtures

---

### 🔵 Category 4: Other Failures (18 failures)
**Distribution:** Across various test files

**Fix Plan:**
- Need to identify specific failures
- Run full test suite with verbose output to categorize

---

## Fix Strategy

### Phase 1: Data Collection (CURRENT)
1. ✅ Create this analysis document
2. ⏳ Run each failing test individually to capture exact errors
3. ⏳ Document expected vs actual behavior for each

### Phase 2: Quick Wins
1. Fix missing fixture issues (smoke tests)
2. Fix test ordering dependencies
3. Update tests with changed CSV column headers

### Phase 3: Logic Fixes
1. Investigate WCAG data extraction discrepancies
2. Fix or update tests to match implementation
3. Ensure backward compatibility

### Phase 4: Verification
1. Run full test suite
2. Verify all fixes
3. Commit changes
4. Delete this document

---

## Detailed Failure Investigation

### 🔍 WCAG Static Tests Investigation

#### Test 1: extractAriaLiveRegions - detects implicit status role
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 2: extractAriaLiveRegions - ignores duplicate explicit and implicit
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 3: analyzeFocusOrder - tabindex 0 is not flagged as positive
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 4: analyzeFocusOrder - mixed positive and negative
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 5: analyzeFocusOrder - enforces 100 element cap on positive tracking
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 6: analyzeFormAutocomplete - detects email input
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 7: analyzeFormAutocomplete - detects tel input
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 8: analyzeFormAutocomplete - detects name fields by name attribute
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 9: analyzeFormAutocomplete - detects address fields
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 10: analyzeFormAutocomplete - detects postal code fields
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 11: analyzeFormAutocomplete - detects city and country fields
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 12: analyzeFormAutocomplete - handles complex form
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 13: analyzeFormAutocomplete - includes selectors
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 14: analyzeFormAutocomplete - enforces 100 input cap
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test 15: analyzeFormAutocomplete - ignores non-personal data inputs
**Status:** ⏳ Investigating
**Expected:** ?
**Actual:** ?
**Error Message:** ?

---

### 🔍 Smoke Test Investigation

#### Test: crawl small site
**Status:** ⏳ Investigating
**File:** `test/smoke/crawl-fixture.test.ts`
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test: export edges CSV
**Status:** ⏳ Investigating
**File:** `test/smoke/export-edges-csv.test.ts`
**Expected:** Fixture file `./tmp/example.atls` exists
**Actual:** File missing
**Error Message:** ?

#### Test: export pages CSV
**Status:** ⏳ Investigating
**File:** `test/smoke/export-pages-csv.test.ts`
**Expected:** Fixture file `./tmp/example.atls` exists
**Actual:** File missing
**Error Message:** ?

---

### 🔍 Integration Test Investigation

#### Test: crawl with accessibility
**Status:** ⏳ Investigating
**File:** `test/smoke/accessibility-integration.test.ts`
**Expected:** ?
**Actual:** ?
**Error Message:** ?

#### Test: Atlas SDK can read engine output
**Status:** ⏳ Investigating
**File:** `test/smoke/atlas-sdk-integration.test.ts`
**Expected:** ?
**Actual:** ?
**Error Message:** ?

---

## Progress Tracking

- [ ] Phase 1: Data Collection
  - [x] Create analysis document
  - [ ] Run failing tests individually
  - [ ] Document all error messages
- [ ] Phase 2: Quick Wins
  - [ ] Fix smoke test fixtures
  - [ ] Fix CSV column expectations
- [ ] Phase 3: Logic Fixes
  - [ ] Fix WCAG tests
  - [ ] Fix integration tests
- [ ] Phase 4: Verification
  - [ ] Full test run
  - [ ] Commit fixes
  - [ ] Delete this document
