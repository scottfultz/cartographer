# Media Collection - Implementation Roadmap

## Quick Reference

**Goal:** Capture screenshots, favicons, and other media assets during crawls for downstream use in SEO tools, accessibility testing, and visual regression testing.

## Current State

✅ **Exists but Not Implemented:**
- Screenshot infrastructure (writer methods, directory structure)
- Favicon URL detection (not downloaded)
- Media asset metadata tracking

❌ **Missing:**
- Actual screenshot capture in renderer
- Multi-viewport support (mobile, tablet)
- Favicon downloading
- Social media image capture (OG, Twitter cards)
- Asset downloading

## Implementation Phases

### Phase 1: Desktop Screenshots (2 weeks) 🎯 **START HERE**

```typescript
// Add to renderer.ts after page load
const screenshotBuffer = await page.screenshot({
  type: 'jpeg',
  quality: 80,
  fullPage: false
});

// Pass to writer
await writer.writeScreenshot(urlKey, screenshotBuffer);

// Update PageRecord
pageRecord.media = {
  screenshots: {
    desktop: `media/screenshots/desktop/${urlKey}.jpg`
  }
};
```

**CLI:**
```bash
--captureScreenshots           # Enable (default: false in prerender, true in full)
--screenshotQuality <1-100>    # JPEG quality (default: 80)
```

**Impact:**
- Archive size: +50-150KB per page
- Crawl time: +200-500ms per page
- Memory: +5-10MB per concurrent page

---

### Phase 2: Mobile & Tablet (2 weeks)

Add viewport switching:

```typescript
const viewports = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 }
};

for (const [name, size] of Object.entries(viewports)) {
  if (config.screenshots?.[name]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(500);
    const buffer = await page.screenshot({ type: 'jpeg', quality: 80 });
    screenshots.set(name, buffer);
  }
}
```

**CLI:**
```bash
--screenshotViewports desktop,mobile,tablet
--fullPageScreenshots   # Capture entire scrollable page
```

---

### Phase 3: Favicon Collection (2 weeks)

Download and deduplicate favicons per origin:

```typescript
const originsSeen = new Set<string>();

if (!originsSeen.has(origin)) {
  originsSeen.add(origin);
  
  // Download favicon formats
  for (const format of ['ico', 'png', 'svg']) {
    const url = faviconUrl.replace(/\.\w+$/, `.${format}`);
    const response = await fetch(url);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      await writer.writeFavicon(origin, format, buffer);
    }
  }
}
```

**CLI:**
```bash
--downloadFavicons              # Enable favicon download (default: false)
--faviconFormats ico,png,svg    # Formats to collect
```

---

### Phase 4: Social Images (2 weeks)

Extract and download OG/Twitter images:

```typescript
// In pageFacts extractor
const ogImage = $('meta[property="og:image"]').attr('content');
const twitterImage = $('meta[name="twitter:image"]').attr('content');

// In scheduler, download and deduplicate
if (ogImage && config.captureSocialImages) {
  const buffer = await downloadImage(ogImage);
  const hash = sha256Hex(buffer);
  await writer.writeSocialImage('og', hash, buffer);
  pageRecord.media.social = { ogImage: `media/social/og/${hash}.jpg` };
}
```

**CLI:**
```bash
--captureSocialImages           # Enable OG/Twitter image download
```

---

### Phase 5: Asset Download (4 weeks) - OPTIONAL

Download actual images/videos from pages:

```typescript
// Filter assets by criteria
const assetsToDownload = assets.filter(asset => 
  asset.aboveTheFold &&           // Only visible
  asset.size < maxAssetSize &&    // Size limit
  allowedFormats.includes(asset.ext)
);

// Download and deduplicate
for (const asset of assetsToDownload) {
  const buffer = await downloadAsset(asset.src);
  const hash = sha256Hex(buffer);
  const path = await writer.writeAsset('image', hash, buffer);
  asset.downloaded = true;
  asset.localPath = path;
  asset.contentHash = hash;
}
```

**CLI:**
```bash
--downloadAssets                # Enable asset download (WARNING: large archives)
--maxAssetSize 5242880          # 5MB limit per asset
--assetFormats jpg,png,svg,webp
--aboveTheFoldOnly              # Only download visible assets
```

---

## Archive Structure

```
archive.atls
├── media/
│   ├── screenshots/
│   │   ├── desktop/{urlHash}.jpg
│   │   ├── mobile/{urlHash}.jpg
│   │   └── tablet/{urlHash}.jpg
│   ├── favicons/{originHash}.{ico|png|svg}
│   ├── social/
│   │   ├── og/{contentHash}.jpg
│   │   └── twitter/{contentHash}.jpg
│   └── assets/
│       ├── images/{contentHash}.{ext}
│       └── videos/{contentHash}.{ext}
```

---

## Key Design Decisions

### 1. Deduplication Strategy

- ✅ **Favicons:** By origin (one per site)
- ✅ **Social images:** By content hash (same image = one file)
- ❌ **Screenshots:** No dedup (each page unique)
- ✅ **Assets:** By content hash (same image across pages = one file)

### 2. Default Behavior

- **Prerender mode:** No media collection (fast, small archives)
- **Full mode:** Desktop screenshots only (balanced)
- **Opt-in:** All other features require explicit flags

### 3. Compression

- **Format:** JPEG (smaller than PNG)
- **Quality:** 80% (good balance)
- **Full-page:** Optional (can be very large)

### 4. Performance Budget

- Max +10% crawl time increase for desktop screenshots
- Max +20% archive size increase for typical sites
- Warn at 1GB total archive size

---

## Testing Checklist

- [ ] Screenshot capture works in all modes
- [ ] Multi-viewport screenshots don't affect data extraction
- [ ] Favicon deduplication works correctly
- [ ] Archive structure matches spec
- [ ] Media files are valid and viewable
- [ ] Atlas SDK can read media from archives
- [ ] Performance benchmarks meet targets
- [ ] Archive size warnings trigger correctly

---

## CLI Reference

```bash
# Minimal (no media)
cartographer crawl --seeds https://example.com --mode prerender

# Desktop screenshots only
cartographer crawl --seeds https://example.com --mode full --captureScreenshots

# Full responsive
cartographer crawl --seeds https://example.com --mode full \
  --captureScreenshots \
  --screenshotViewports desktop,mobile,tablet

# Everything
cartographer crawl --seeds https://example.com --mode full \
  --captureScreenshots \
  --screenshotViewports desktop,mobile \
  --downloadFavicons \
  --captureSocialImages
```

---

## Next Steps

1. **Review this plan** with team
2. **Prototype Phase 1** (desktop screenshots)
3. **Benchmark** archive size and performance impact
4. **Iterate** on compression settings
5. **Implement** remaining phases based on user feedback

---

**Status:** Planning Complete - Ready for Implementation  
**Priority:** Phase 1 (Desktop Screenshots)  
**Owner:** Cai Frazier
