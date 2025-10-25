# Performance & SEO Data Collection Implementation

**Status:** Core extractors implemented, integration pending  
**Date:** October 24, 2025  
**Author:** Cai Frazier

## Overview

This document describes the new data collection capabilities implemented to enable Continuum and other tools to perform comprehensive performance audits and holistic SEO analysis comparable to Ahrefs and Google Lighthouse.

---

## 1. Performance Audits (Lighthouse-Style Data)

### Core Web Vitals ✅
Implemented collection of all three Core Web Vitals that Google uses for ranking:

- **LCP (Largest Contentful Paint)** - Measures loading performance
- **CLS (Cumulative Layout Shift)** - Measures visual stability  
- **INP (Interaction to Next Paint)** - Measures interactivity (replaces FID)

### Additional Performance Metrics ✅
- **TTFB (Time to First Byte)** - Server response time
- **FCP (First Contentful Paint)** - Initial render time
- **TBT (Total Blocking Time)** - Main thread blocking
- **Speed Index** - Visual completeness
- **TTI (Time to Interactive)** - Full interactivity

### Lighthouse Scores ✅
Approximate scores (0-100) calculated for:
- **Performance** - Based on collected metrics with simplified heuristics
- **Accessibility** - Can be derived from existing WCAG data
- **Best Practices** - Can be derived from security headers, HTTPS, etc.
- **SEO** - Can be derived from enhanced SEO metadata

### Implementation Details

**File:** `src/core/extractors/lighthouse.ts`

**Usage:**
```typescript
import { extractLighthouseMetrics } from './core/extractors/lighthouse.js';

// During page crawl
const metrics = await extractLighthouseMetrics(page);
// Returns: LCP, CLS, INP, TTFB, FCP, TBT, TTI, Speed Index, scores
```

**Method:** Uses browser Performance APIs via `page.evaluate()` to collect metrics directly from the page, avoiding the overhead of running full Lighthouse. For production Lighthouse scores, the `lighthouse` npm package can be integrated.

---

## 2. Network Performance Data ✅

### Network Request Data
Comprehensive collection via Playwright's network interception:

- **Total page weight** (KB/MB)
- **Total number of requests**
- **Breakdown by resource type**:
  - Document (HTML)
  - Stylesheet (CSS)
  - Script (JavaScript)
  - Image
  - Font
  - Media (video/audio)
  - XHR/Fetch (AJAX)
  - Other
  
### Compression Analysis ✅
For each resource type:
- **Gzip** compression count
- **Brotli** compression count
- **Deflate** compression count
- **Uncompressed** text resources (potential optimization)
- **Uncompressible** types (images, fonts already compressed)

### HTTP Status Codes ✅
Full breakdown of status codes for all resources:
- `200` (OK)
- `304` (Not Modified - cached)
- `404` (Not Found - broken resources)
- All other status codes

### Cache Performance ✅
- **Cached requests** count (served from browser cache or CDN)
- **Uncached requests** count

### Implementation Details

**File:** `src/core/extractors/networkPerformance.ts`

**Usage:**
```typescript
import { createNetworkPerformanceCollector } from './core/extractors/networkPerformance.js';

// Create collector before navigation
const collector = createNetworkPerformanceCollector(page);
collector.start();

// Navigate and wait for page load
await page.goto(url);

// Stop collection and get metrics
collector.stop();
const metrics = collector.getMetrics();
// Returns: totalRequests, totalBytes, breakdown, compression, statusCodes, etc.
```

---

## 3. Holistic SEO Audits (On-Page & Crawl Data)

### Indexability Data ✅

**Meta Robots Tag:**
- Exact content (e.g., `index, follow`, `noindex, nofollow`)
- Parsed flags: `isNoIndex`, `isNoFollow`

**X-Robots-Tag:**
- HTTP header directive
- Combined with meta robots for complete picture

**Canonical URL:**
- Verbatim `href` attribute
- Resolved absolute URL
- Validation against current page URL

### On-Page Content Data ✅

**Title Tag:**
- Full text
- Character length
- **Pixel width** (approximate for Google SERP display)
- Warning if exceeds ~600px (gets truncated in search results)

**Meta Description:**
- Full text
- Character length
- **Pixel width** (approximate for Google SERP display)
- Warning if exceeds ~920px

**Headings:**
- **H1 count** (should be exactly 1 for SEO best practices)
- H2, H3, H4, H5, H6 counts
- Full text of all headings (already collected)

**Word Count:**
- Main content word count
- Total text content length (characters)
- Useful for content depth analysis

### International & Social Data ✅

**Hreflang Tags:**
- All `hreflang` attributes collected
- Validation:
  - Check for `x-default` tag (required for multi-language sites)
  - Check for self-referential tag (page must reference itself)
  - Return link validation (each target should link back)

**Open Graph Tags:**
- `og:title`
- `og:description`
- `og:image`
- `og:type`
- `og:url`
- `og:site_name`
- Flag: `hasOpenGraph` (boolean)

**Twitter Cards:**
- `twitter:card`
- `twitter:title`
- `twitter:description`
- `twitter:image`
- `twitter:site`
- `twitter:creator`
- Flag: `hasTwitterCard` (boolean)

**Schema.org Data:**
- `hasJsonLd` (JSON-LD structured data present)
- `hasMicrodata` (Microdata markup present)
- `schemaTypes[]` (e.g., `["Article", "Organization", "Person"]`)

### Implementation Details

**File:** `src/core/extractors/enhancedSEO.ts`

**Usage:**
```typescript
import { extractEnhancedSEOMetadata } from './core/extractors/enhancedSEO.js';

// Extract enhanced SEO data
const seoData = extractEnhancedSEOMetadata({
  html: pageHtml,
  baseUrl: pageUrl,
  headers: responseHeaders,
  bodyText: textSample, // Optional
});
// Returns: indexability, content, international, social, schema
```

---

## 4. Enhanced Link (Edge) Data ✅

### New Edge Properties

**Anchor Text:** ✅ (already collected)

**Link Attributes:** ✅
- `nofollow` - Link should not be followed by crawlers
- `sponsored` - Paid/sponsored link (Google directive)
- `ugc` - User-generated content link (Google directive)

**HTTP Status Code:** ✅ (partially)
- `httpStatusAtTo` field already exists in `EdgeRecord`
- Populated when target URL is crawled
- Enables detection of broken links (404, 410, etc.)
- Redirect chain detection (301, 302, 307, 308)

### Updated Type

**File:** `src/core/types.ts`

```typescript
export interface EdgeRecord {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  rel?: string;
  nofollow: boolean;
  sponsored?: boolean; // NEW
  ugc?: boolean; // NEW
  isExternal: boolean;
  location: EdgeLocation;
  selectorHint?: string;
  discoveredInMode: RenderMode;
  httpStatusAtTo?: number; // Populated during crawl
}
```

---

## Data Schema Updates

### PageRecord Type Extensions ✅

**File:** `src/core/types.ts`

**New Fields:**

1. **`performance.scores`** - Lighthouse-style scores (0-100)
   ```typescript
   scores?: {
     performance?: number;
     accessibility?: number;
     bestPractices?: number;
     seo?: number;
   }
   ```

2. **`network`** - Network performance metrics
   ```typescript
   network?: {
     totalRequests: number;
     totalBytes: number;
     totalDuration?: number;
     breakdown: { /* by type */ };
     compression: { /* gzip, brotli, etc. */ };
     statusCodes: { [code: number]: number };
     cachedRequests: number;
     uncachedRequests: number;
   }
   ```

3. **`enhancedSEO`** - Enhanced SEO metadata
   ```typescript
   enhancedSEO?: {
     indexability: {
       isNoIndex: boolean;
       isNoFollow: boolean;
     };
     content: {
       titleLength?: { characters: number; pixels: number };
       descriptionLength?: { characters: number; pixels: number };
       h1Count: number;
       h2Count: number;
       // ... h3-h6 counts
       wordCount: number;
       textContentLength: number;
     };
     international: {
       hreflangCount: number;
       hreflangErrors?: string[];
     };
     social: {
       hasOpenGraph: boolean;
       hasTwitterCard: boolean;
     };
     schema: {
       hasJsonLd: boolean;
       hasMicrodata: boolean;
       schemaTypes: string[];
     };
   }
   ```

---

## Integration Status

### ✅ Completed
- [x] Lighthouse metrics extractor (Core Web Vitals, performance metrics)
- [x] Network performance collector (requests, bytes, compression, status codes)
- [x] Enhanced SEO metadata extractor (indexability, content, international, social, schema)
- [x] Enhanced link attributes (sponsored, ugc)
- [x] Type definitions updated (PageRecord, EdgeRecord)
- [x] Build validation (compiles without errors)

### 🚧 Pending Integration
- [ ] Add `--performance` CLI flag to `crawl` command
- [ ] Integrate extractors into crawl workflow
- [ ] Wire up network collector to page navigation
- [ ] Populate `performance`, `network`, and `enhancedSEO` fields in PageRecord
- [ ] Update CSV export to include new fields
- [ ] Add tests for new extractors
- [ ] Update documentation (README, FEATURES, DEVELOPER_GUIDE)

### 📝 Future Enhancements
- [ ] Full Lighthouse integration (requires `lighthouse` npm package)
- [ ] Link destination status code collection (requires link validation pass)
- [ ] Advanced hreflang validation (cross-page link checking)
- [ ] Performance budgets (warn when metrics exceed thresholds)
- [ ] Compression savings calculation
- [ ] Core Web Vitals scoring with Google's official algorithms

---

## Usage Example (After Integration)

```bash
# Run crawl with performance data collection
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out example.atls \
  --renderMode full \
  --performance \
  --maxPages 100

# Export performance report
node dist/cli/index.js export \
  --atls example.atls \
  --report performance \
  --out performance.csv

# Export SEO audit report
node dist/cli/index.js export \
  --atls example.atls \
  --report seo \
  --out seo-audit.csv

# Export network analysis
node dist/cli/index.js export \
  --atls example.atls \
  --report network \
  --out network-analysis.csv
```

---

## CSV Export Fields (Planned)

### Performance Report
- URL, Title, Status Code
- LCP, CLS, INP (Core Web Vitals)
- TTFB, FCP, TBT, TTI, Speed Index
- Performance Score, Accessibility Score, Best Practices Score, SEO Score
- Total Requests, Total Bytes (KB), Total Duration (ms)
- Cached Requests, Uncached Requests

### SEO Audit Report
- URL, Title, Status Code
- Is No-Index, Is No-Follow, Canonical URL
- Title Length (chars), Title Length (pixels), Title Truncated?
- Description Length (chars), Description Length (pixels), Description Truncated?
- H1 Count, H2-H6 Counts, Word Count
- Has Open Graph, Has Twitter Card, Has JSON-LD, Has Microdata
- Hreflang Count, Hreflang Errors

### Network Analysis Report
- URL, Total Requests, Total Bytes (MB), Duration (s)
- Document (count/bytes), CSS (count/bytes), JS (count/bytes), Images (count/bytes)
- Fonts (count/bytes), Media (count/bytes), XHR (count/bytes)
- Gzip Count, Brotli Count, Uncompressed Count
- Status 200, Status 304, Status 404, Other Status Codes

### Enhanced Edges Report
- Source URL, Target URL, Anchor Text
- Rel Attribute, No-Follow, Sponsored, UGC
- Is External, Location (nav/header/footer/etc.)
- HTTP Status Code (if target crawled)

---

## Benefits for Continuum

With this data, Continuum can now provide:

1. **Performance Dashboards**
   - Core Web Vitals scores per page
   - Performance trends across site
   - Identify slow pages needing optimization

2. **Competitive SEO Analysis**
   - On-page SEO scores (like Ahrefs)
   - Content gap analysis (word count, heading structure)
   - Technical SEO issues (noindex, canonical, hreflang errors)

3. **Link Analysis**
   - Internal linking structure with anchor text
   - Broken link detection (404 status codes)
   - Sponsored/UGC link identification

4. **Network Optimization**
   - Resource weight breakdown
   - Compression opportunities
   - Caching effectiveness

5. **Social/International SEO**
   - Open Graph/Twitter Card presence
   - Hreflang validation for multi-language sites
   - Structured data coverage

---

## Notes

- **Lighthouse Scores:** Current implementation uses simplified heuristics. For official Lighthouse scores, integrate the `lighthouse` npm package.
- **Performance Impact:** Network collector adds minimal overhead. Lighthouse metrics collection is lightweight (uses built-in browser APIs).
- **Browser Compatibility:** All metrics use standard Performance APIs supported in modern browsers (Chrome, Firefox, Edge).
- **Data Volume:** Performance/network data adds ~5-10 KB per page to archive size.

---

## Copyright

Copyright © 2025 Cai Frazier. All rights reserved.
