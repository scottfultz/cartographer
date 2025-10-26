# biaofolympia.com Full Mode Crawl Report

**Date:** October 26, 2025  
**Archive:** `biaofolympia-full-complete.atls`  
**Mode:** full (specLevel 3)  
**Duration:** 1 minute 14 seconds

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Pages Crawled** | 27 |
| **Edges Found** | 2,002 |
| **Assets** | 211 |
| **Errors** | 0 |
| **Error Budget** | 100 (0% used) |
| **Throughput** | 0.36 pages/sec |
| **Peak Memory** | 658 MB |
| **Archive Size** | 97,135 bytes (~95 KB) |

---

## Render Mode Verification

✅ **Manifest Correctly Tracks Render Mode:**

```json
{
  "renderModes": ["full"],
  "modesUsed": ["full"],
  "specLevel": 3
}
```

**Location:** `manifest.json` → `capabilities` object  
**Source Code:** `packages/cartographer/src/io/atlas/manifest.ts` lines 180-182

---

## Data Collection Results

### ✅ Successfully Collected

| Data Type | Status | Coverage |
|-----------|--------|----------|
| **Technologies** | ✅ Collected | 100% (9 per page) |
| **OpenGraph** | ✅ Collected | 100% (2-3 items per page) |
| **TwitterCard** | ✅ Collected | 100% |
| **Edges (Links)** | ✅ Collected | 2,002 total |
| **Assets** | ✅ Collected | 211 total |
| **Accessibility** | ✅ Collected | 27 records |
| **Page Metadata** | ✅ Collected | All fields present |

**Technologies Detected (all pages):**
- WordPress
- MySQL
- PHP
- Yoast SEO
- WP Engine
- reCAPTCHA
- Google Tag Manager
- Cloudflare
- HTTP/3

### ❌ Missing Data (Critical Issue)

| Data Type | Expected | Actual | Status |
|-----------|----------|--------|--------|
| **Screenshots (desktop)** | 27 images | 0 | ❌ MISSING |
| **Screenshots (mobile)** | 27 images | 0 | ❌ MISSING |
| **Favicons** | 1 image (origin-level) | 0 | ❌ MISSING |
| **`media` field in PageRecord** | Present | ABSENT | ❌ MISSING |

---

## Issue Analysis: Missing Media Field

### Problem Description

Despite running in `full` mode (which should capture screenshots and favicons), the `media` field is completely absent from all page records in the archive.

### Evidence

**1. Staging Folders Empty:**
```bash
$ ls archive/biaofolympia-full-complete.atls.staging/crawl_1761506813970_4945/media/
screenshots/  favicons/

$ ls screenshots/desktop/
(empty)

$ ls screenshots/mobile/
(empty)

$ ls favicons/
(empty)
```

**2. Page Records Missing `media` Field:**
```bash
$ unzip -p biaofolympia-full-complete.atls pages/part-001.jsonl.zst | \
  zstd -d | head -1 | jq '.media'
null

$ unzip -p biaofolympia-full-complete.atls pages/part-001.jsonl.zst | \
  zstd -d | head -1 | jq 'keys' | grep media
  "mediaAssetsCount",
  "mediaAssetsTruncated",
```

**Fields Present:** `mediaAssetsCount`, `mediaAssetsTruncated`  
**Fields Missing:** `media` (should contain `screenshots` and `favicon` objects)

### Expected Structure

According to the schema, page records in full mode should include:

```typescript
{
  // ... other fields ...
  media: {
    screenshots: {
      desktop: "screenshots/desktop/abc123.png",  // Base64 or file path
      mobile: "screenshots/mobile/abc123.png"
    },
    favicon: "favicons/def456.png"  // Base64 or file path
  }
}
```

### Root Cause (Hypothesis)

One or more of the following:

1. **Screenshot Capture Disabled:** The renderer may not be configured to capture screenshots in full mode
2. **Media Field Not Written:** The AtlasWriter may not be writing the `media` field to page records
3. **Schema Mismatch:** The page record structure may not match the expected schema
4. **Pipeline Issue:** Screenshots may be captured but not passed through the writer pipeline

### Related Code Locations

- **Renderer:** `packages/cartographer/src/core/render/renderer.ts` (screenshot capture logic)
- **AtlasWriter:** `packages/cartographer/src/io/atlas/atlasWriter.ts` (page record writing)
- **Page Record Type:** `packages/atlas-spec/src/types.ts` (PageRecord interface)
- **Schema:** `packages/cartographer/src/io/atlas/schemas/pages.schema.json` (media field definition)

---

## Cloudflare Challenge Handling

✅ **100% Success Rate**

All 27 pages were protected by Cloudflare challenges, and all were successfully resolved using the smart wait (15s) strategy.

**Performance:**
- First page (homepage): 30s timeout → challenge resolved → data captured
- Subsequent pages: Challenge detected → 15s wait → challenge resolved → 1.6-2.6s render time

---

## Recommendations

### Immediate Actions

1. **Investigate Media Field Absence:**
   - [ ] Review `renderer.ts` to confirm screenshot capture is enabled for `full` mode
   - [ ] Review `atlasWriter.ts` to confirm `media` field is included in page records
   - [ ] Add debug logging to track media capture and writing

2. **Test Media Capture:**
   - [ ] Run a small test crawl (1-2 pages) with verbose logging
   - [ ] Verify screenshots are captured and saved to staging
   - [ ] Verify `media` field appears in page records

3. **Schema Validation:**
   - [ ] Confirm `pages.schema.json` includes `media` field definition
   - [ ] Run validation against expected schema

### Long-term Improvements

1. **Add Media Field Validation:** Create test that verifies `media` field presence in full mode crawls
2. **Staging Folder Verification:** Add post-crawl check that media folders are not empty
3. **Mode-Specific Tests:** Ensure integration tests cover all three modes (raw, prerender, full)

---

## Conclusion

**Manifest Render Mode Tracking:** ✅ Working perfectly  
**Data Collection (non-media):** ✅ Excellent quality  
**Media Capture (screenshots/favicons):** ❌ Critical issue - completely missing

The crawl successfully collected all metadata, technologies, structured data, edges, and assets. However, the core feature of `full` mode (screenshots and favicons) is not working, making this mode currently equivalent to `prerender` mode.

**Next Steps:** Investigate and fix media capture pipeline, then re-test with a fresh crawl.

---

## Appendix: Sample Page URLs

1. https://biaofolympia.com/ (homepage)
2. https://biaofolympia.com/chiropractic-care/
3. https://biaofolympia.com/holistic-wellness-care/
4. https://biaofolympia.com/spinal-decompression/
5. https://biaofolympia.com/auto-accident-injury-care/
6. https://biaofolympia.com/conditions-chiropractic-care-treats/
7. https://biaofolympia.com/lower-back-pain-management/
8. https://biaofolympia.com/chiropractor-for-neck-pain/
9. https://biaofolympia.com/chiropractor-for-sciatica-in-olympia-wa/
10. https://biaofolympia.com/conditions-chiropractic-care-treats/osteoarthritis/
... (27 total pages)

---

**Report Generated:** October 26, 2025, 12:30 PM PDT  
**Author:** Cartographer Engine Analysis
