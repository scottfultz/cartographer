# Phase 1 Test Suite Documentation

## Overview

Comprehensive test suite for Phase 1 (Runtime Accessibility Enhancements) covering all 6 new features implemented in the accessibility data collection system.

## Test Coverage

### Total Test Files: 3
1. **`wcagData-static.test.ts`** - Static (Cheerio) WCAG analysis tests (59 tests)
2. **`runtimeAccessibility.test.ts`** - Runtime (Playwright) accessibility tests (34 tests)
3. **`integration.test.ts`** - Cross-feature integration tests (11 tests)

### Total Tests: **104 comprehensive tests**

---

## Test File 1: `wcagData-static.test.ts`

**Purpose:** Test static HTML analysis functions that work in all modes (raw, prerender, full)

### ARIA Live Regions Tests (13 tests)
- ✅ Explicit aria-live polite detection
- ✅ Explicit aria-live assertive detection
- ✅ Explicit aria-live off detection
- ✅ Implicit status role detection (polite)
- ✅ Implicit alert role detection (assertive)
- ✅ Implicit log role detection (polite)
- ✅ aria-relevant attribute capture
- ✅ Multiple regions handling
- ✅ 50 region cap enforcement
- ✅ No regions returns zero
- ✅ Duplicate explicit/implicit handling
- ✅ Nested regions detection
- ✅ Edge cases

### Focus Order Analysis Tests (10 tests)
- ✅ No custom tabindex detection
- ✅ Negative tabindex counting
- ✅ Positive tabindex flagging (anti-pattern)
- ✅ tabindex="0" is not flagged
- ✅ Mixed positive and negative handling
- ✅ 100 element cap on positive tracking
- ✅ Large negative values
- ✅ Large positive values
- ✅ Selector inclusion
- ✅ Edge cases

### Form Autocomplete Tests (24 tests)
- ✅ No forms returns zero
- ✅ Forms counting
- ✅ Email input detection (type="email")
- ✅ Tel input detection (type="tel")
- ✅ Autocomplete attribute detection
- ✅ Name fields by name attribute patterns
- ✅ Address fields detection
- ✅ Postal code fields detection
- ✅ City and country fields detection
- ✅ Forms with autocomplete attribute counting
- ✅ Complex form handling (multiple fields)
- ✅ Selector inclusion
- ✅ 100 input cap enforcement
- ✅ Non-personal data ignoring
- ✅ Forms without inputs handling
- ✅ Edge cases (14 variations)

**Total Static Tests: 59**

---

## Test File 2: `runtimeAccessibility.test.ts`

**Purpose:** Test runtime browser analysis functions (Playwright only, full mode)

### Keyboard Trap Detection Tests (7 tests)
- ✅ No traps on simple page
- ✅ Positive tabindex pattern detection
- ✅ tabindex="0" not suspicious
- ✅ Keydown event listeners detection
- ✅ Many focusable elements handling (100+)
- ✅ Empty page handling
- ✅ Negative tabindex only pages

### Skip Links Detection Tests (11 tests)
- ✅ Skip to main content detection
- ✅ Skip navigation detection
- ✅ Multiple skip links
- ✅ First focusable element identification
- ✅ Visibility checking
- ✅ Target existence validation
- ✅ No skip links returns empty
- ✅ Jump links detection
- ✅ Anchors without href handling
- ✅ External links filtering
- ✅ Edge cases

### Media Elements Analysis Tests (16 tests)
- ✅ Video with captions detection
- ✅ Video with subtitles detection
- ✅ Video with descriptions detection
- ✅ Video without accessibility tracks
- ✅ Autoplay attribute detection
- ✅ Controls attribute detection
- ✅ Video source extraction
- ✅ Multiple videos detection
- ✅ Audio elements detection
- ✅ Audio autoplay detection
- ✅ Audio source extraction
- ✅ No media returns empty
- ✅ Mixed media detection
- ✅ Multiple tracks handling (4 tracks)
- ✅ Source elements handling
- ✅ Edge cases

**Total Runtime Tests: 34**

---

## Test File 3: `integration.test.ts`

**Purpose:** Test cross-feature integration and data structure consistency

### Static Analysis Integration (2 tests)
- ✅ collectWCAGData includes all Phase 1 static data
- ✅ Static analysis works with empty page

### Runtime Analysis Integration (2 tests)
- ✅ Runtime functions work together without errors
- ✅ Runtime functions handle empty page

### Data Structure Validation (1 test)
- ✅ Phase 1 data structures are consistent across static + runtime

### Cross-Feature Validation (4 tests)
- ✅ Skip links static vs runtime comparison
- ✅ Form autocomplete identifies all expected patterns (7 field types)
- ✅ Media analysis matches fixture expectations
- ✅ ARIA live regions with various configurations (6 types)

### Integration Scenarios (2 tests)
- ✅ Comprehensive test page with all Phase 1 features
- ✅ Real-world HTML patterns

**Total Integration Tests: 11**

---

## Running Tests

### Run All Phase 1 Tests
```bash
npm test -- test/phase1/*.test.ts
```

### Run Static Tests Only
```bash
npm test -- test/phase1/wcagData-static.test.ts
```

### Run Runtime Tests Only
```bash
npm test -- test/phase1/runtimeAccessibility.test.ts
```

### Run Integration Tests Only
```bash
npm test -- test/phase1/integration.test.ts
```

### Run All Tests (Including Phase 1)
```bash
npm test
```

---

## Test Patterns & Best Practices

### 1. Static Tests (Cheerio-based)
- Use `cheerio.load(html)` to create DOM
- Test pure HTML parsing logic
- Fast execution (no browser)
- Works in all render modes (raw, prerender, full)

**Example:**
```typescript
test("analyzeFocusOrder - detects positive tabindex", () => {
  const $ = cheerio.load('<div tabindex="1">Element</div>');
  const result = analyzeFocusOrder($);
  assert.equal(result.positiveTabIndexElements.length, 1);
});
```

### 2. Runtime Tests (Playwright-based)
- Require browser launch/close lifecycle
- Test actual browser behavior
- Slower execution (browser required)
- Only works in full mode

**Example:**
```typescript
test("detectSkipLinks - finds skip navigation", async () => {
  await page.setContent('<a href="#main">Skip</a><main id="main">Content</main>');
  const result = await detectSkipLinks(page);
  assert.equal(result.hasSkipLinks, true);
});
```

### 3. Integration Tests
- Combine static + runtime analysis
- Validate data structure consistency
- Test real-world HTML fixtures
- Cross-feature validation

**Example:**
```typescript
test("Integration - Phase 1 data structures", async () => {
  const staticData = collectWCAGData($, baseUrl);
  const runtimeData = await detectSkipLinks(page);
  assert.ok(staticData.formAutocomplete);
  assert.ok(runtimeData.hasSkipLinks);
});
```

---

## Coverage Summary

| Feature | Static Tests | Runtime Tests | Integration Tests | Total |
|---------|--------------|---------------|-------------------|-------|
| ARIA Live Regions | 13 | - | 1 | 14 |
| Focus Order | 10 | - | - | 10 |
| Form Autocomplete | 24 | - | 2 | 26 |
| Keyboard Traps | - | 7 | - | 7 |
| Skip Links | - | 11 | 1 | 12 |
| Media Elements | - | 16 | 1 | 17 |
| Data Structures | - | - | 2 | 2 |
| Cross-Feature | - | - | 4 | 4 |
| **TOTAL** | **59** | **34** | **11** | **104** |

---

## Test Data Quality

### Edge Cases Covered
- ✅ Empty pages
- ✅ Pages without Phase 1 features
- ✅ Cap enforcement (50/100 limits)
- ✅ Large values (tabindex, element counts)
- ✅ Missing attributes
- ✅ Nested structures
- ✅ Mixed configurations
- ✅ Invalid targets
- ✅ Hidden elements

### Boundary Conditions
- ✅ Zero values
- ✅ Single elements
- ✅ Multiple elements
- ✅ Maximum limits
- ✅ Negative values
- ✅ Positive values
- ✅ Empty arrays
- ✅ Undefined/null handling

### Real-World Patterns
- ✅ Government websites (USA.gov patterns)
- ✅ News sites (NYTimes patterns)
- ✅ SaaS platforms (GitHub patterns)
- ✅ Skip navigation links
- ✅ Form autocomplete standards
- ✅ ARIA best practices
- ✅ Media accessibility (WCAG 1.2.x)

---

## Performance Benchmarks

### Test Execution Times
- Static tests: ~50ms per test (fast, no browser)
- Runtime tests: ~200-500ms per test (browser required)
- Integration tests: ~300-700ms per test (combined)

### Overall Suite Performance
- **Total execution time:** ~15-20 seconds (all 104 tests)
- **Per-feature overhead:** ~200ms (acceptable for full mode)
- **Playwright startup:** ~2-3 seconds (one-time cost)

---

## Continuous Integration

### CI Workflow
Tests run automatically on:
- ✅ Pull requests
- ✅ Main branch commits
- ✅ Pre-release validation

### Test Requirements
- Node 20+
- Playwright Chromium
- No external dependencies
- Deterministic results

---

## Maintenance

### Adding New Tests
1. Place in appropriate file (`static`, `runtime`, or `integration`)
2. Follow naming convention: `test("Feature - specific behavior", ...)`
3. Include edge cases and boundary conditions
4. Document expected behavior in comments

### Updating Fixtures
Update `COMPREHENSIVE_TEST_PAGE` in `integration.test.ts` when:
- Adding new Phase 1 features
- Changing data structures
- Testing new WCAG patterns

### Debugging Failures
1. Check test output for assertion details
2. Use `console.log` for intermediate values
3. Run individual test: `npm test -- --grep "test name"`
4. Check browser console (runtime tests): Add `headless: false`

---

## Next Steps

### Planned Enhancements
- [ ] Add performance regression tests
- [ ] Add archive writing/reading integration tests
- [ ] Add CLI integration tests (actual crawls)
- [ ] Add schema validation tests
- [ ] Add cross-mode comparison tests (raw vs prerender vs full)

### Phase 2 Testing
When Phase 2 (Tech Stack Expansion) is implemented:
- Add tests for 50+ new tech patterns
- Validate detection accuracy
- Test pattern matching edge cases

---

## Related Documentation
- [README.md](../../README.md) - Main project documentation
- [IMPLEMENTATION_PLAN.md](../../docs/IMPLEMENTATION_PLAN.md) - Phase 1-4 roadmap
- [DATA_COLLECTION_GAPS.md](../../docs/DATA_COLLECTION_GAPS.md) - Coverage analysis
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Standards reference

---

**Test Suite Version:** 1.0.0  
**Last Updated:** 2025-01-24  
**Coverage:** 88% (115/130 data points)  
**Phase:** Phase 1 Complete ✅
