# Media Collection - Actual Root Cause Found

**Date:** October 26, 2025, 1:00 PM PDT  
**Investigation time:** 2 hours  
**Status:** ✅ **ROOT CAUSE IDENTIFIED**

---

## True Root Cause

Screenshots are NOT captured for pages that **timeout** because the renderer has **early return paths** that skip the screenshot capture logic.

### Code Flow Analysis

**Location:** `packages/cartographer/src/core/renderer.ts`

**Normal flow (networkidle/load):**
1. Page navigation completes (lines 300-450)
2. DOM captured (line 520)
3. ✅ **Screenshots captured** (lines 523-560)
4. Favicon collected (lines 633-700)
5. Return RenderResult

**Timeout flow (current bug):**
1. Page navigation times out (30s default)
2. Challenge detection check (lines 450-480)
3. ❌ **EARLY RETURN** (lines 497-516) - skips screenshot code!
4. Screenshots NEVER captured
5. Return RenderResult without screenshots

### Why Test Sites Worked vs. Failed

| Site | Nav End Reason | Screenshots | Why |
|------|----------------|-------------|-----|
| example.com | `networkidle` | ✅ YES | Fast load, reaches screenshot code |
| github.com | `networkidle` | ✅ YES | Fast load, reaches screenshot code |
| biaofolympia.com | `timeout` | ❌ NO | Slow Cloudflare + timeout, early return |

**Biaofolympia.com characteristics:**
- WordPress site behind Cloudflare
- WP Engine + reCAPTCHA + Google Tag Manager
- Heavy page with many resources
- Takes 25-30 seconds to load
- Always hits 30s timeout
- Returns via early return path
- **0/27 pages have screenshots**

---

## The Fix

### Option 1: Move Screenshot Capture Before Early Returns (RECOMMENDED)

Move the screenshot capture logic to occur BEFORE any early returns, right after DOM capture completes.

**Pros:**
- Captures screenshots regardless of nav end reason
- Clean separation of concerns
- No code duplication

**Cons:**
- None

### Option 2: Duplicate Screenshot Code in Early Returns

Add screenshot capture to each early return path.

**Pros:**
- Minimal refactoring

**Cons:**
- Code duplication
- Maintenance burden
- Easy to miss future paths

---

## Implementation Plan

1. **Refactor renderer.ts** (~30 minutes)
   - Move screenshot capture to line 515 (before early returns)
   - Move favicon collection to line 640 (before early returns)
   - Ensure both capture regardless of `navEndReason`

2. **Test with timeout pages** (~15 minutes)
   - Re-crawl biaofolympia.com (known to timeout)
   - Verify screenshots captured even with `navEndReason=timeout`
   - Verify 27/27 pages have media field

3. **Test with fast pages** (~10 minutes)
   - Verify example.com still works
   - Verify github.com still works
   - No regressions

4. **Update tests** (~10 minutes)
   - Fix Vitest SIGTERM issue (optional)
   - Verify media-collection.test.ts passes

---

## Verification Checklist

- [ ] Biaofolympia.com (timeout pages): Screenshots captured
- [ ] Example.com (networkidle): Screenshots captured (no regression)
- [ ] GitHub.com (networkidle): Screenshots captured (no regression)
- [ ] Favicon collection works on all pages
- [ ] Media field present in 100% of full mode pages

---

## Why This Wasn't Caught Earlier

1. **Test sites load fast** - example.com and github.com don't timeout
2. **No timeout test case** - Integration tests use fast-loading sites
3. **Silent failure** - No warning logged when screenshots skipped
4. **Early returns scattered** - Multiple return paths, easy to miss

---

## Recommended Improvements

1. **Add debug logging** - Log when screenshots skipped
2. **Add timeout test case** - Test with artificially slow site
3. **Refactor early returns** - Single return point at end of function
4. **Add screenshot capture metric** - Track % of pages with screenshots

---

**Next Action:** Implement Option 1 (move screenshot capture before early returns)

