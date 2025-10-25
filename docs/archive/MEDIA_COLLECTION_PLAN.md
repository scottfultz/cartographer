# Media Collection Plan for Cartographer

## Executive Summary

This document outlines the design and implementation plan for comprehensive media collection during crawls. The goal is to capture visual snapshots and media assets that provide rich context for downstream consumers (SEO tools, accessibility auditors, visual regression testing, etc.).

**Current Date:** October 24, 2025  
**Status:** Planning & Design Phase  
**Owner:** Cai Frazier

---

## Current State Analysis

### ✅ What Exists Today

1. **Favicon Detection** (All modes)
   - Extracts `faviconUrl` from `<link rel="icon">`, `<link rel="apple-touch-icon">`, or defaults to `/favicon.ico`
   - Stored as URL string in PageRecord
   - NOT downloaded or stored in archive

2. **Screenshot Infrastructure** (Full mode only)
   - `writeScreenshot()` and `writeViewport()` methods in AtlasWriter
   - Staging directory structure: `media/screenshots/{urlKey}.png` and `media/viewports/{urlKey}.png`
   - Fields defined in PageRecord: `screenshotFile` and `viewportFile`
   - **BUT: Not currently implemented in renderer/scheduler**

3. **Media Asset Tracking**
   - `mediaAssetsCount` and `mediaAssetsTruncated` tracked per page
   - AssetRecord type exists with `type: "image" | "video"`
   - Assets extracted in `extractAssets()` but only metadata (src, alt, dimensions)

### ❌ What's Missing

1. **No actual screenshot capture** - Infrastructure exists but not wired up
2. **No favicon downloading** - Only URL is recorded
3. **No above-the-fold capture** - No viewport-specific screenshots
4. **No mobile viewport screenshots** - Only desktop (1280×720) considered
5. **No media asset downloading** - Images/videos not saved to archive
6. **No social media images** - OG images, Twitter cards not captured
7. **No compression/optimization** - Raw PNG files would bloat archives
8. **No deduplication** - Same favicon/image across pages stored multiple times

---

## Proposed Architecture

### 1. Media Collection Modes

Introduce granular control over what gets collected:

```typescript
interface MediaConfig {
  screenshots?: {
    enabled: boolean;           // Default: false (only in full mode)
    desktop: boolean;           // Default: true (1280×720)
    mobile: boolean;            // Default: false (375×667 iPhone SE)
    tablet?: boolean;           // Default: false (768×1024 iPad)
    fullPage: boolean;          // Default: false (entire page vs viewport only)
    quality: number;            // 1-100, default: 80
    format: 'png' | 'jpeg';     // Default: jpeg (smaller size)
  };
  
  favicons?: {
    enabled: boolean;           // Default: true (all modes)
    deduplicate: boolean;       // Default: true (one per origin)
    formats: string[];          // ['ico', 'png', 'svg'] - collect all available
  };
  
  socialImages?: {
    enabled: boolean;           // Default: false
    ogImage: boolean;           // Open Graph image
    twitterCard: boolean;       // Twitter card image
  };
  
  assets?: {
    downloadImages: boolean;    // Default: false (bandwidth intensive)
    downloadVideos: boolean;    // Default: false (very bandwidth intensive)
    maxFileSize: number;        // Default: 5MB per asset
    formats: string[];          // ['jpg', 'png', 'svg', 'webp'] - filter by extension
    aboveTheFoldOnly: boolean;  // Default: true (only visible assets)
  };
  
  compression?: {
    enabled: boolean;           // Default: true
    quality: number;            // 1-100, default: 80
    maxDimensions?: {
      width: number;            // Default: 1920px
      height: number;           // Default: 1080px
    };
  };
}
```

### 2. Archive Structure

```
archive.atls (ZIP)
├── pages/
│   └── part-001.jsonl.zst
├── edges/
│   └── part-001.jsonl.zst
├── assets/
│   └── part-001.jsonl.zst
├── media/                          [NEW]
│   ├── screenshots/                
│   │   ├── desktop/                [NEW]
│   │   │   ├── {urlHash}.jpg
│   │   │   └── {urlHash}-full.jpg  (full page)
│   │   ├── mobile/                 [NEW]
│   │   │   └── {urlHash}.jpg
│   │   └── tablet/                 [NEW]
│   │       └── {urlHash}.jpg
│   ├── favicons/                   [NEW]
│   │   ├── {originHash}.ico
│   │   ├── {originHash}.png
│   │   └── {originHash}.svg
│   ├── social/                     [NEW]
│   │   ├── og/                     (Open Graph images)
│   │   │   └── {contentHash}.jpg
│   │   └── twitter/                (Twitter card images)
│   │       └── {contentHash}.jpg
│   └── assets/                     [NEW - Downloaded page assets]
│       ├── images/
│       │   └── {contentHash}.{ext}
│       └── videos/
│           └── {contentHash}.{ext}
├── manifest.json
└── summary.json
```

### 3. PageRecord Extensions

```typescript
interface PageRecord {
  // ... existing fields ...
  
  // Media references (paths relative to archive root)
  media?: {
    screenshots?: {
      desktop?: string;          // "media/screenshots/desktop/{hash}.jpg"
      desktopFull?: string;      // "media/screenshots/desktop/{hash}-full.jpg"
      mobile?: string;           // "media/screenshots/mobile/{hash}.jpg"
      tablet?: string;           // "media/screenshots/tablet/{hash}.jpg"
    };
    favicon?: {
      ico?: string;              // "media/favicons/{originHash}.ico"
      png?: string;              // "media/favicons/{originHash}.png"
      svg?: string;              // "media/favicons/{originHash}.svg"
      url: string;               // Original URL for reference
    };
    social?: {
      ogImage?: string;          // "media/social/og/{hash}.jpg"
      twitterCard?: string;      // "media/social/twitter/{hash}.jpg"
    };
  };
}
```

### 4. AssetRecord Extensions

```typescript
interface AssetRecord {
  // ... existing fields ...
  
  downloaded?: boolean;          // True if asset was downloaded to archive
  localPath?: string;            // Path in archive if downloaded
  contentHash?: string;          // SHA-256 of content (for deduplication)
  aboveTheFold?: boolean;        // True if visible in initial viewport
}
```

---

## Implementation Phases

### Phase 1: Screenshot Capture (Weeks 1-2)

**Goal:** Implement basic screenshot capture for desktop viewport

**Tasks:**
1. ✅ Wire up `page.screenshot()` in renderer after page load
2. ✅ Pass screenshot buffer to AtlasWriter
3. ✅ Store in `media/screenshots/desktop/{urlHash}.jpg`
4. ✅ Update PageRecord with `media.screenshots.desktop` path
5. ✅ Add CLI option: `--captureScreenshots` (boolean, default: false in prerender, true in full)
6. ✅ Implement JPEG compression with configurable quality
7. ✅ Add archive size metrics to summary.json

**Acceptance Criteria:**
- Desktop screenshots captured for all pages in full mode
- JPEG quality reduces file size by ~70% vs PNG
- Archive size increase is reasonable (<10MB per 100 pages)
- Screenshots viewable by unzipping archive

**Estimated Impact:**
- Archive size: +50-150KB per page (desktop JPEG at 80% quality)
- Crawl time: +200-500ms per page (screenshot capture + compression)
- Memory: +5-10MB per concurrent page

---

### Phase 2: Mobile & Responsive Screenshots (Weeks 3-4)

**Goal:** Multi-viewport screenshot capture for responsive testing

**Tasks:**
1. ✅ Add mobile viewport (375×667) screenshot capture
2. ✅ Add tablet viewport (768×1024) screenshot capture
3. ✅ Implement viewport switching in renderer
4. ✅ Update CLI options: `--screenshotViewports` (comma-separated: desktop,mobile,tablet)
5. ✅ Store in separate directories: `media/screenshots/{viewport}/`
6. ✅ Add full-page screenshot option (`--fullPageScreenshots`)
7. ✅ Parallelize viewport captures (if concurrency allows)

**Acceptance Criteria:**
- Can capture desktop, mobile, tablet screenshots in single crawl
- Full-page screenshots capture entire scrollable area
- Viewport switching doesn't affect data extraction
- Clear separation in archive structure

**Estimated Impact:**
- Archive size: +50-150KB per viewport per page
- Crawl time: +200-500ms per additional viewport (sequential)
- Memory: +5-10MB per viewport

---

### Phase 3: Favicon Collection (Weeks 5-6)

**Goal:** Download and deduplicate favicons per origin

**Tasks:**
1. ✅ Detect favicon URLs in pageFacts extractor (already done)
2. ✅ Download favicon after first page of each origin
3. ✅ Store in `media/favicons/{originHash}.{ext}`
4. ✅ Deduplicate: Only download once per origin
5. ✅ Support multiple formats: .ico, .png, .svg, .webp
6. ✅ Handle fallback to `/favicon.ico` if link tags fail
7. ✅ Add retry logic for 404/timeout
8. ✅ Update PageRecord with `media.favicon` object

**Acceptance Criteria:**
- One favicon per origin (deduplicated)
- Multiple formats collected if available
- 404s don't fail the crawl
- Favicon available for all pages of same origin

**Estimated Impact:**
- Archive size: +5-50KB per origin (typically 10-20KB)
- Crawl time: +100-300ms per origin (one-time cost)
- Network: +1 HTTP request per origin per format

---

### Phase 4: Social Media Images (Weeks 7-8)

**Goal:** Capture Open Graph and Twitter card images

**Tasks:**
1. ✅ Extract OG image from `<meta property="og:image">`
2. ✅ Extract Twitter card from `<meta name="twitter:image">`
3. ✅ Download images if enabled (`--captureSocialImages`)
4. ✅ Store in `media/social/og/` and `media/social/twitter/`
5. ✅ Deduplicate by content hash (same image used across pages)
6. ✅ Compress/resize large images (max 1920×1080)
7. ✅ Update PageRecord with `media.social` object

**Acceptance Criteria:**
- Social images captured when present
- Deduplication prevents redundant storage
- Large images automatically resized
- Metadata preserved in PageRecord

**Estimated Impact:**
- Archive size: +50-200KB per unique social image
- Crawl time: +200-500ms per page with social images
- Network: +1-2 HTTP requests per page

---

### Phase 5: Page Asset Download (Weeks 9-12) - OPTIONAL

**Goal:** Download images and videos from crawled pages

**Tasks:**
1. ✅ Extend AssetRecord with download metadata
2. ✅ Implement selective download based on:
   - Above-the-fold detection (viewport intersection)
   - File size limits (max 5MB default)
   - Format allowlist (jpg, png, svg, webp)
3. ✅ Download assets during page processing
4. ✅ Store in `media/assets/images/` and `media/assets/videos/`
5. ✅ Deduplicate by content hash
6. ✅ Update AssetRecord with `downloaded`, `localPath`, `contentHash`
7. ✅ Add CLI options: `--downloadAssets`, `--maxAssetSize`, `--assetFormats`

**Acceptance Criteria:**
- Only above-the-fold assets downloaded by default
- File size limits enforced
- Deduplication prevents redundant downloads
- Asset records link to downloaded files

**Estimated Impact:**
- Archive size: +500KB-5MB per page (highly variable)
- Crawl time: +1-5 seconds per page (network dependent)
- Network: +10-50 HTTP requests per page
- **WARNING:** This phase can dramatically increase archive size and crawl time

---

## Technical Implementation Details

### Screenshot Capture Flow

```typescript
// In renderer.ts
async function renderWithScreenshots(page: Page, config: MediaConfig): Promise<RenderResult & { screenshots: Map<string, Buffer> }> {
  const screenshots = new Map<string, Buffer>();
  
  // 1. Capture desktop viewport (current viewport)
  if (config.screenshots?.desktop) {
    const desktopBuffer = await page.screenshot({
      type: config.screenshots.format || 'jpeg',
      quality: config.screenshots.quality || 80,
      fullPage: false
    });
    screenshots.set('desktop', desktopBuffer);
    
    if (config.screenshots.fullPage) {
      const fullBuffer = await page.screenshot({
        type: config.screenshots.format || 'jpeg',
        quality: config.screenshots.quality || 80,
        fullPage: true
      });
      screenshots.set('desktop-full', fullBuffer);
    }
  }
  
  // 2. Switch to mobile viewport
  if (config.screenshots?.mobile) {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Allow reflow
    
    const mobileBuffer = await page.screenshot({
      type: config.screenshots.format || 'jpeg',
      quality: config.screenshots.quality || 80,
      fullPage: false
    });
    screenshots.set('mobile', mobileBuffer);
  }
  
  // 3. Switch to tablet viewport
  if (config.screenshots?.tablet) {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    const tabletBuffer = await page.screenshot({
      type: config.screenshots.format || 'jpeg',
      quality: config.screenshots.quality || 80,
      fullPage: false
    });
    screenshots.set('tablet', tabletBuffer);
  }
  
  return { ...renderResult, screenshots };
}
```

### Favicon Download Flow

```typescript
// In scheduler.ts (after first page of each origin)
const originsSeen = new Set<string>();

async function processFavicon(pageRecord: PageRecord, faviconUrl: string): Promise<void> {
  const origin = new URL(pageRecord.url).origin;
  
  // Skip if already processed this origin
  if (originsSeen.has(origin)) {
    return;
  }
  originsSeen.add(origin);
  
  // Download favicon
  const formats = ['.ico', '.png', '.svg'];
  for (const format of formats) {
    const url = faviconUrl.replace(/\.(ico|png|svg)$/, format);
    
    try {
      const response = await fetch(url, { timeout: 5000 });
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const hash = sha256Hex(buffer);
        
        await writer.writeFavicon(origin, format, buffer);
        
        pageRecord.media.favicon = pageRecord.media.favicon || {};
        pageRecord.media.favicon[format.replace('.', '')] = `media/favicons/${hash}${format}`;
      }
    } catch (error) {
      log('debug', `Failed to download favicon ${url}: ${error.message}`);
    }
  }
}
```

### Content-Based Deduplication

```typescript
// Deduplicate by SHA-256 hash
const mediaCache = new Map<string, string>(); // hash -> path in archive

async function writeWithDeduplication(
  type: 'favicon' | 'social' | 'asset',
  buffer: Buffer,
  extension: string
): Promise<string> {
  const hash = sha256Hex(buffer);
  
  // Check if already stored
  if (mediaCache.has(hash)) {
    return mediaCache.get(hash)!;
  }
  
  // Store new file
  const path = `media/${type}/${hash}${extension}`;
  await writeFile(join(stagingDir, path), buffer);
  
  mediaCache.set(hash, path);
  return path;
}
```

---

## Configuration Examples

### Minimal (Current Default)

```bash
# No media collection except favicon URLs
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --mode prerender
```

### Desktop Screenshots Only

```bash
# Capture desktop viewport screenshots
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --captureScreenshots \
  --screenshotViewports desktop
```

### Full Responsive Testing

```bash
# Desktop + mobile + tablet screenshots
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --captureScreenshots \
  --screenshotViewports desktop,mobile,tablet \
  --fullPageScreenshots
```

### Complete Media Collection

```bash
# Everything: screenshots, favicons, social images
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --captureScreenshots \
  --screenshotViewports desktop,mobile \
  --downloadFavicons \
  --captureSocialImages
```

### Asset Download (Power User)

```bash
# WARNING: Large archives, slow crawls
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --downloadAssets \
  --maxAssetSize 5242880 \  # 5MB
  --assetFormats jpg,png,svg,webp
```

---

## Performance Considerations

### Archive Size Impact

| Feature | Size per Page | Size per 100 Pages |
|---------|---------------|-------------------|
| Desktop screenshot | 50-150KB | 5-15MB |
| Mobile screenshot | 40-120KB | 4-12MB |
| Tablet screenshot | 60-180KB | 6-18MB |
| Full-page screenshot | 200-600KB | 20-60MB |
| Favicon (per origin) | 5-20KB | 5-20KB (deduplicated) |
| Social image (per unique) | 50-200KB | Variable |
| Downloaded assets | 500KB-5MB | 50-500MB |

### Crawl Time Impact

| Feature | Time per Page |
|---------|---------------|
| Desktop screenshot | +200-500ms |
| Additional viewport | +200-500ms each |
| Favicon download | +100-300ms per origin |
| Social image download | +200-500ms per page |
| Asset downloads | +1-5 seconds |

### Memory Impact

| Feature | Memory per Page |
|---------|-----------------|
| Screenshot buffer | 5-10MB per viewport |
| Image downloads | 1-5MB per asset |

---

## CLI Options Summary

```bash
# Screenshot options
--captureScreenshots                    # Enable screenshot capture (default: true in full mode)
--screenshotViewports <list>            # Comma-separated: desktop,mobile,tablet (default: desktop)
--fullPageScreenshots                   # Capture entire scrollable page (default: false)
--screenshotFormat <jpeg|png>           # Image format (default: jpeg)
--screenshotQuality <1-100>             # JPEG quality (default: 80)

# Favicon options
--downloadFavicons                      # Download favicons (default: false)
--faviconFormats <list>                 # Comma-separated: ico,png,svg (default: all)

# Social media options
--captureSocialImages                   # Download OG/Twitter images (default: false)
--socialImageMaxDimensions <WxH>        # Max dimensions for resize (default: 1920x1080)

# Asset download options (advanced)
--downloadAssets                        # Download page assets (default: false)
--maxAssetSize <bytes>                  # Max file size per asset (default: 5242880 = 5MB)
--assetFormats <list>                   # Comma-separated: jpg,png,svg,webp (default: all)
--aboveTheFoldOnly                      # Only download visible assets (default: true)
```

---

## Testing Strategy

### Unit Tests

- Screenshot capture with different viewports
- Favicon download and deduplication
- Content hash collision handling
- Buffer compression and optimization

### Integration Tests

- End-to-end crawl with screenshots enabled
- Multi-viewport screenshot comparison
- Archive structure validation
- Media file integrity checks

### Performance Tests

- Archive size benchmarks (100, 1000, 10000 pages)
- Crawl time impact analysis
- Memory usage profiling
- Deduplication effectiveness metrics

---

## Rollout Strategy

### Alpha (Internal Testing)

- Enable Phase 1 (desktop screenshots) behind feature flag
- Test on 5-10 real-world sites
- Gather archive size and performance metrics
- Iterate on compression settings

### Beta (Limited Release)

- Enable Phases 1-3 (screenshots, mobile, favicons)
- Document CLI options
- Gather user feedback
- Monitor archive sizes in production

### General Availability

- All phases optional via CLI flags
- Default to conservative settings (desktop screenshots only in full mode)
- Comprehensive documentation
- SDK support for reading media from archives

---

## Future Enhancements

### Advanced Screenshot Features

- **Hover states**: Capture hover effects on interactive elements
- **Lazy-loaded content**: Scroll and wait for images to load
- **Animations paused**: Disable animations for consistent screenshots
- **Dark mode**: Capture both light and dark mode versions
- **Print styles**: Capture print-specific layouts

### Video Capture

- **Screen recordings**: Record 5-10 second clips of page interactions
- **Interaction replay**: Record user flows for testing
- **Animation capture**: GIF generation for animated elements

### Advanced Asset Management

- **Smart cropping**: Auto-crop screenshots to content area
- **Format conversion**: Convert all images to WebP for smaller size
- **Thumbnail generation**: Create smaller preview images
- **Metadata extraction**: EXIF data, dimensions, color profiles

### Machine Learning Integration

- **Visual similarity**: Group similar screenshots
- **Object detection**: Identify UI components in screenshots
- **Text extraction**: OCR on screenshots for search
- **Anomaly detection**: Flag visual regressions automatically

---

## Questions & Decisions Needed

### 1. Default Behavior

**Q:** Should screenshots be enabled by default in `full` mode?  
**Proposed:** Yes, but only desktop viewport to keep archive sizes reasonable.

### 2. Storage Format

**Q:** JPEG vs PNG vs WebP for screenshots?  
**Proposed:** JPEG at 80% quality by default (good balance of quality and size). WebP as future enhancement.

### 3. Deduplication Strategy

**Q:** How aggressively should we deduplicate media?  
**Proposed:** Always deduplicate by content hash for favicons and social images. Optional for screenshots (probably not useful since each page is unique).

### 4. Archive Size Limits

**Q:** Should we enforce max archive size or max media per page?  
**Proposed:** Warn at 1GB total archive size, fail at 5GB. Allow override with `--noArchiveSizeLimit`.

### 5. Backward Compatibility

**Q:** How do we handle archives without media directories?  
**Proposed:** Atlas SDK should gracefully handle missing `media/` directory. Treat as optional feature.

---

## Success Metrics

### Technical Metrics

- Archive size increase < 20% for typical sites (100 pages)
- Crawl time increase < 10% for desktop screenshots only
- Screenshot capture success rate > 95%
- Deduplication effectiveness > 80% for favicons

### User Metrics

- Feature adoption rate (% of crawls with media collection enabled)
- User feedback score (NPS or satisfaction survey)
- Support tickets related to media collection
- Archive size complaints

---

## References

- Playwright Screenshot API: https://playwright.dev/docs/screenshots
- Image Compression Best Practices: https://web.dev/compress-images/
- WebP Format Specification: https://developers.google.com/speed/webp
- Open Graph Protocol: https://ogp.me/
- Twitter Card Documentation: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards

---

**Document Version:** 1.0  
**Last Updated:** October 24, 2025  
**Owner:** Cai Frazier  
**Status:** Planning - Ready for Implementation
