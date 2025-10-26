# Archive Collection Modes - What Gets Collected

## Overview

Cartographer has three render modes that collect different levels of data. Understanding what each mode collects is critical for data integrity verification.

## Render Modes Comparison

| Feature | Raw Mode | Prerender Mode | Full Mode |
|---------|----------|----------------|-----------|
| **HTML** | ✅ Server-rendered only | ✅ After JavaScript | ✅ After JavaScript |
| **Links/Edges** | ✅ | ✅ | ✅ |
| **Asset Metadata** | ✅ (limited) | ✅ (full) | ✅ (full) |
| **Technologies** | ❌ | ✅ | ✅ |
| **OpenGraph/Twitter Card** | ❌ | ✅ | ✅ |
| **Accessibility Audits** | ❌ | ✅ | ✅ |
| **Screenshots** | ❌ | ❌ | ✅ (default) |
| **Favicons** | ❌ | ❌ | ✅ (default) |
| **Console Logs** | ❌ | ❌ | ✅ |
| **CSS Records** | ❌ | ❌ | ✅ |
| **Core Web Vitals** | ❌ | ❌ | ✅ |

## Understanding summary.json Stats

### totalErrors Field

**IMPORTANT:** `totalErrors` counts **crawl failures**, NOT data quality issues.

```typescript
// ErrorRecord represents crawl-time failures
export interface ErrorRecord {
  url: string;
  phase: "fetch" | "render" | "extract" | "write";
  code?: string;
  message: string;
}
```

**Types of Errors Counted:**
- **fetch**: HTTP errors (404, 500), DNS failures, SSL errors, timeouts
- **render**: Browser crashes, JavaScript preventing page render
- **extract**: Data extraction failures (DOM parsing errors)
- **write**: Disk I/O failures writing to archive

**What It Means:**
- `totalErrors: 0` = All pages crawled successfully ✅
- `totalErrors: 5` = 5 pages failed to crawl (check errors/ part)

**What It Does NOT Mean:**
- ❌ Missing OpenGraph metadata
- ❌ No technologies detected
- ❌ Schema validation warnings
- ❌ Empty screenshot fields

### totalConsoleRecords & totalStyleRecords

These fields will be **0** unless running in **full mode**:

```json
{
  "stats": {
    "totalConsoleRecords": 0,  // ← 0 in prerender mode (expected)
    "totalStyleRecords": 0      // ← 0 in prerender mode (expected)
  }
}
```

Check `stats.renderModes` to confirm which mode was used:

```json
{
  "stats": {
    "renderModes": {
      "raw": 0,
      "prerender": 306,  // ← All pages used prerender
      "full": 0
    }
  }
}
```

## Screenshot & Favicon Collection

### Default Behavior

Screenshots and favicons are **only collected in full mode by default**:

```bash
# NO screenshots/favicons (prerender mode)
cartographer crawl --seeds https://example.com --mode prerender

# YES screenshots/favicons (full mode default)
cartographer crawl --seeds https://example.com --mode full

# Opt-out of screenshots in full mode
cartographer crawl --seeds https://example.com --mode full --noScreenshots

# Force screenshots in prerender mode (not recommended)
cartographer crawl --seeds https://example.com --mode prerender --captureScreenshots
```

### Verification

Check PageRecord for screenshot data:

```bash
# Extract first page and check screenshot fields
unzip -p archive.atls pages/part-001.jsonl.zst | zstd -d | head -1 | \
  jq '{url, hasScreenshots: (.screenshots != null), hasFavicon: (.favicon != null)}'
```

**Expected Results:**
- Prerender mode: `hasScreenshots: false, hasFavicon: false` ✅
- Full mode: `hasScreenshots: true, hasFavicon: true` ✅

## rpmsunstate-fixed.atls Analysis

### Archive Stats

```json
{
  "stats": {
    "totalPages": 306,
    "totalEdges": 23439,
    "totalAssets": 6826,        // ← Asset metadata, not downloaded files
    "totalErrors": 0,            // ← All pages crawled successfully
    "totalAccessibilityRecords": 306,
    "totalConsoleRecords": 0,   // ← Expected (prerender mode)
    "totalStyleRecords": 0,     // ← Expected (prerender mode)
    "renderModes": {
      "prerender": 306          // ← All pages in prerender mode
    }
  }
}
```

### What Was Collected

✅ **Successfully Collected:**
- 306 pages (HTML + metadata)
- 23,439 edges (links between pages)
- 6,826 asset records (image/video metadata - **not downloaded**)
- 306 accessibility audits
- Technologies: 100% of pages (avg 11.3 per page)
- OpenGraph: 97.7% of pages (avg 5.2 keys)

❌ **Not Collected (Expected - Prerender Mode):**
- Screenshots (requires full mode or --captureScreenshots)
- Downloaded favicons (requires full mode or --downloadFavicons)
- Console logs (requires full mode)
- CSS records (requires full mode)
- Core Web Vitals (requires full mode)

### Verdict

**Data integrity: ✅ EXCELLENT**

The crawl collected all expected data for prerender mode. The missing screenshots/favicons/console/CSS are **expected behavior** for prerender mode, not data loss bugs.

## Asset Collection Clarification

**IMPORTANT:** `totalAssets: 6826` means **metadata records**, not downloaded files.

**What Gets Stored:**
```json
{
  "pageUrl": "https://example.com/",
  "assetUrl": "https://example.com/image.jpg",
  "type": "image",
  "alt": "Example image",
  "visible": true,
  "inViewport": true
}
```

**What Does NOT Get Stored:**
- ❌ The actual image/video file bytes
- ❌ Pixel data or dimensions (unless rendered in full mode)
- ❌ File size or MIME type

Asset **downloading** is a future feature (Phase 4 of Media Collection Roadmap).

## Recommendations

### For Beta Release Crawls

Use **full mode** for comprehensive data collection:

```bash
cartographer crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 1000
```

This will capture:
- Screenshots (desktop + mobile)
- Favicons (deduplicated by origin)
- Console logs
- CSS records (if implemented)
- Core Web Vitals
- All metadata (technologies, OpenGraph, etc.)

### For High-Volume Crawls

Use **prerender mode** for faster, smaller archives:

```bash
cartographer crawl \
  --seeds https://example.com \
  --mode prerender \
  --maxPages 10000
```

This will capture:
- All metadata (technologies, OpenGraph, accessibility)
- HTML + links
- Asset metadata
- **Skip:** Screenshots, favicons, console logs, performance metrics

### Archive Size Impact

| Mode | Size per Page | Size per 1000 Pages |
|------|---------------|---------------------|
| Prerender | 5-15 KB | 5-15 MB |
| Full (with screenshots) | 100-300 KB | 100-300 MB |

## Related Documentation

- [Media Collection Plan](./archive/MEDIA_COLLECTION_PLAN.md) - Full feature roadmap
- [Media Collection Roadmap](./archive/MEDIA_COLLECTION_ROADMAP.md) - Implementation phases
- [Unimplemented Features](./archive/UNIMPLEMENTED_FEATURES.md) - Feature status

---

**Last Updated:** October 26, 2025  
**Author:** Cai Frazier
