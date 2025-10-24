# Comprehensive Test Suite Documentation

**Date:** October 24, 2025  
**Author:** Cai Frazier (via GitHub Copilot)  
**Engine Version:** Atlas v1.0 / Cartographer Engine 1.0.0

---

## Overview

This document describes the comprehensive test suite designed to catch edge cases across all major features of the Cartographer engine. The suite includes **130 tests** covering configuration validation, depth limiting, filename generation, challenge detection, and completion reason logic.

---

## Test Summary

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `maxDepth.test.ts` | 9 | Validates maxDepth configuration and edge cases |
| `challenge-detection.test.ts` | 19 | Tests challenge page detection heuristics |
| `filename-generator.test.ts` | 27 | Tests intelligent filename generation |
| `completionReason.test.ts` | 18 | Tests crawl completion reason logic |
| `depth-limiting.test.ts` | 25 | Tests depth enforcement during crawling |
| `config-validation.test.ts` | 32 | Tests configuration validation and defaults |
| **Total** | **130** | **All passed ✅** |

---

## Test Categories

### 1. Configuration Validation (`config-validation.test.ts`)

**Purpose:** Ensures robust config validation prevents invalid crawl configurations

**Edge Cases Covered:**
- Missing required fields (seeds, outAtls)
- Empty arrays and strings
- Zero/negative values for numeric constraints
- Boundary values (min/max)
- Type coercion and undefined handling
- Default value application
- Partial config merging

**Key Tests:**
```typescript
✔ config - requires seeds array
✔ config - rejects empty seeds array
✔ config - rejects zero concurrency
✔ config - rejects negative RPS
✔ config - accepts RPS 0.5
✔ config - accepts very large maxPages
✔ config - merges partial render config with defaults
```

**Critical Validations:**
- Seeds: Must be non-empty array
- outAtls: Must be string with length >= 5
- Concurrency: Must be > 0
- RPS: Must be > 0 (supports decimals)
- maxPages: Must be >= 0 (0 = unlimited)
- maxDepth: Must be >= -1 (-1 = unlimited)
- Timeout: Must be > 0

---

### 2. MaxDepth Configuration (`maxDepth.test.ts`)

**Purpose:** Validates maxDepth config parsing and default behavior

**Edge Cases Covered:**
- Default value (-1 = unlimited)
- Boundary values (0, -1, large integers)
- Invalid values (-2, -100)
- Type handling (undefined, floats)

**Key Tests:**
```typescript
✔ maxDepth - default is -1 (unlimited)
✔ maxDepth - accepts 0 (seeds only)
✔ maxDepth - accepts positive integers
✔ maxDepth - rejects -2
✔ maxDepth - accepts very large values
✔ maxDepth - handles undefined gracefully
```

**Valid Range:** `-1` (unlimited) or `>= 0`

---

### 3. Depth Limiting (`depth-limiting.test.ts`)

**Purpose:** Tests depth enforcement logic during URL enqueuing

**Edge Cases Covered:**
- Unlimited depth (-1) allows all depths
- Seeds-only (0) blocks depth > 0
- Boundary conditions (depth == maxDepth)
- Off-by-one errors
- Large depth values
- Negative depth values (robustness)

**Key Tests:**
```typescript
✔ depth limiting - unlimited depth (-1) allows depth 1000000
✔ depth limiting - maxDepth 0 blocks depth 1
✔ depth limiting - maxDepth 5 allows depth 5 (boundary)
✔ depth limiting - maxDepth 5 blocks depth 6
✔ depth limiting - maxDepth 10 series (iterative validation)
```

**Logic:**
```typescript
if (maxDepth >= 0 && currentDepth > maxDepth) {
  return false; // Block
}
return true; // Allow
```

---

### 4. Challenge Detection (`challenge-detection.test.ts`)

**Purpose:** Validates challenge page detection heuristics

**Edge Cases Covered:**
- Status codes (503, 429)
- Page titles (case-insensitive matching)
- DOM selectors (ID, class, attribute)
- Partial matches (should fail)
- Empty/malformed HTML
- Normal pages (false positives)

**Key Tests:**
```typescript
✔ challenge detection - Cloudflare 503 status code
✔ challenge detection - 'Just a moment' title
✔ challenge detection - case insensitive title matching
✔ challenge detection - Cloudflare challenge form
✔ challenge detection - reCAPTCHA
✔ challenge detection - normal page returns false
✔ challenge detection - partial title match should fail
```

**Detection Signals:**
- **Status Codes:** 503, 429
- **Titles:** "just a moment", "attention required", "checking your browser", "verifying you are", "security check", "please wait", "access denied", "ddos protection"
- **DOM Patterns:** `#cf-challenge-form`, `.cf-browser-verification`, `#challenge-form`, `[data-ray-id]`, `.ray-id`, `#captcha`, `.g-recaptcha`

---

### 5. Completion Reason (`completionReason.test.ts`)

**Purpose:** Tests crawl completion reason determination logic

**Edge Cases Covered:**
- Natural finish vs capped vs manual vs error_budget
- Priority/precedence rules
- Boundary conditions (pageCount == maxPages)
- Zero pages crawled
- Unlimited maxPages (0)
- Large values

**Key Tests:**
```typescript
✔ completionReason - finished when queue empty naturally
✔ completionReason - capped when pageCount equals maxPages
✔ completionReason - manual when gracefulShutdown
✔ completionReason - error_budget takes priority
✔ completionReason - error_budget over capped
✔ completionReason - capped over manual
```

**Precedence (highest to lowest):**
1. `error_budget` - Error budget exhausted
2. `capped` - Page limit reached
3. `manual` - User interrupted (SIGINT)
4. `finished` - Natural completion

**Logic:**
```typescript
if (errorBudgetExceeded) return "error_budget";
if (maxPages > 0 && pageCount >= maxPages) return "capped";
if (gracefulShutdown) return "manual";
return "finished";
```

---

### 6. Filename Generation (`filename-generator.test.ts`)

**Purpose:** Tests intelligent .atls filename generation

**Edge Cases Covered:**
- Domain extraction (subdomains, ports, paths, query strings, fragments)
- Special characters and internationalized domains
- Localhost and IP addresses
- Invalid URLs
- Timestamp formatting
- All three modes (raw, prerender, full)
- Output path resolution

**Key Tests:**
```typescript
✔ generateAtlsFilename - subdomain included
✔ generateAtlsFilename - handles port numbers
✔ generateAtlsFilename - handles query strings
✔ generateAtlsFilename - timestamp format YYYYMMDD_HHMMSS
✔ generateAtlsFilename - IPv4 address
✔ generateAtlsFilename - invalid URL falls back gracefully
✔ generateAtlsFilename - URL with authentication
✔ resolveOutputPath - generates when undefined
```

**Format:** `[domain]_[YYYYMMDD_HHMMSS]_[mode].atls`

**Examples:**
- `example.com_20251024_153045_prerender.atls`
- `blog.example.com_20251224_000000_raw.atls`
- `192.168.1.1_20251024_120000_full.atls`

---

## Running the Tests

### Run All New Tests
```bash
npm run build
npx tsc test/maxDepth.test.ts test/challenge-detection.test.ts \
  test/filename-generator.test.ts test/completionReason.test.ts \
  test/depth-limiting.test.ts test/config-validation.test.ts \
  --outDir dist-tests --module nodenext --moduleResolution nodenext \
  --target es2022 --skipLibCheck
node --test 'dist-tests/test/*.test.js' --test-timeout=10000
```

### Run Specific Test Suite
```bash
node --test 'dist-tests/test/maxDepth.test.js'
node --test 'dist-tests/test/config-validation.test.js'
```

---

## Test Results

**Run Date:** October 24, 2025  
**Duration:** 245.713ms  
**Tests:** 130  
**Passed:** ✅ 130  
**Failed:** ❌ 0  
**Skipped:** 0  

---

## Edge Cases Caught

### 1. **Boundary Conditions**
- ✅ `maxDepth=5, depth=5` → Allowed (inclusive)
- ✅ `maxDepth=5, depth=6` → Blocked (exclusive)
- ✅ `maxPages=10, pageCount=10` → "capped"
- ✅ `maxPages=10, pageCount=9` → "finished"

### 2. **Invalid Inputs**
- ✅ `maxDepth=-2` → Config validation error
- ✅ `concurrency=0` → Config validation error
- ✅ `seeds=[]` → Config validation error
- ✅ `rps=-1` → Config validation error

### 3. **Type Coercion**
- ✅ `maxDepth=undefined` → Defaults to -1
- ✅ `maxDepth=3.5` → Coerced to integer
- ✅ `rps=0.5` → Accepted (decimal RPS)

### 4. **Special Cases**
- ✅ International domains (münchen.de) → Handled gracefully
- ✅ Invalid URLs → Sanitized fallback
- ✅ Empty HTML → No false positive challenge detection
- ✅ Partial title match ("momentary") → Not detected as challenge

### 5. **Priority Logic**
- ✅ `error_budget` > `capped` > `manual` > `finished`
- ✅ Zero pages crawled → "finished" (not error)
- ✅ Unlimited maxPages (0) with large pageCount → "finished"

---

## Future Test Enhancements

1. **Integration Tests**
   - End-to-end crawls with depth limits
   - Challenge page handling with real browser
   - Resume/checkpoint with depth state

2. **Performance Tests**
   - Large depth values (depth=1000)
   - Massive page counts (1M+ pages)
   - Memory usage under stress

3. **Concurrency Tests**
   - Race conditions in depth tracking
   - Thread safety in completion reason logic
   - Parallel URL enqueuing

4. **Error Handling Tests**
   - Malformed archive files
   - Corrupt summary.json
   - Invalid checkpoint state

---

## Maintenance

**Update Frequency:** After each feature addition or bug fix  
**Test Coverage Goal:** >90% for critical paths  
**Review Process:** All PRs must pass full test suite

**Test Ownership:**
- Config validation: @caifrazier
- Depth limiting: @caifrazier
- Challenge detection: @caifrazier
- Filename generation: @caifrazier

---

## Conclusion

This comprehensive test suite provides **robust validation** of edge cases across all major features. With **130 passing tests** covering configuration, depth limiting, filename generation, challenge detection, and completion reason logic, the Cartographer engine is well-protected against common bugs and edge case failures.

**Key Benefits:**
- ✅ Catches boundary condition errors
- ✅ Validates invalid input handling
- ✅ Ensures priority/precedence logic
- ✅ Tests type coercion robustness
- ✅ Verifies special case handling

---

**Signed:** Cai Frazier  
**Copyright © 2025 Cai Frazier. All rights reserved.**
