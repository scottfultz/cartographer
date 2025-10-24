# Atlas Data Collection Audit

**Document Version:** 1.1  
**Date:** October 24, 2025  
**Atlas Version:** 1.0  
**Owner:** Cai Frazier  
**Verification Status:** ✅ Infrastructure Verified | ⚠️ Extractors Partially Implemented

## Executive Summary

This document provides a comprehensive audit of what information is collected and stored in Cartographer Atlas (`.atls`) archives, and how that data collection differs across the three crawl modes: `raw`, `prerender`, and `full`.

### Implementation Status

**Legend:**
- ✅ **Implemented** - Actively extracted and written to archives
- 📝 **Type Defined** - TypeScript types exist, but extractor not yet implemented (returns undefined/null/empty)
- 🚧 **Partial** - Some functionality present, incomplete

**Last Verification:** October 24, 2025 (See [ATLAS_V1_VERIFICATION_REPORT.md](./ATLAS_V1_VERIFICATION_REPORT.md) for test results)

### Quick Reference: Feature Implementation Status

| Feature | Raw | Prerender | Full | Status |
|---------|-----|-----------|------|--------|
| **Infrastructure** |
| Spec level calculation | N/A | N/A | N/A | ✅ |
| Dataset organization | N/A | N/A | N/A | ✅ |
| Archive structure | N/A | N/A | N/A | ✅ |
| **PageRecord Fields** |
| Basic metadata (35 fields) | ✅ | ✅ | ✅ | ✅ |
| Security headers | 📝 | 📝 | 📝 | 📝 |
| Favicon URL | 📝 | 📝 | 📝 | 📝 |
| Structured data | N/A | 📝 | 📝 | 📝 |
| Tech stack detection | N/A | 📝 | 📝 | 📝 |
| Performance metrics | N/A | N/A | 📝 | 📝 |
| Screenshots | N/A | N/A | 📝 | 📝 |
| **AccessibilityRecord** |
| Basic fields (7 fields) | ✅ | ✅ | ✅ | ✅ |
| Form controls | N/A | ✅ | ✅ | ✅ |
| Focus order | N/A | ✅ | ✅ | ✅ |
| Contrast violations | N/A | N/A | 📝 | 📝 |
| **New Datasets** |
| Console logs | N/A | N/A | 📝 | 📝 |
| Computed styles | N/A | N/A | 📝 | 📝 |

**Summary:** ~60% of infrastructure complete, ~40% of extractors implemented. Core crawling and basic data collection working correctly.

---

## Atlas Archive Structure

Atlas archives are ZIP files (`.atls`) containing:

1. **Zstandard-compressed JSONL parts** (150MB rolling files):
   - `pages/part-*.jsonl.zst` - Page records
   - `edges/part-*.jsonl.zst` - Link relationships
   - `assets/part-*.jsonl.zst` - Media assets
   - `errors/part-*.jsonl.zst` - Crawl errors
   - `accessibility/part-*.jsonl.zst` - Accessibility audit data (optional)

2. **Metadata files**:
   - `manifest.json` - Archive metadata, integrity hashes, provenance
   - `summary.json` - Crawl statistics
   - `schemas/*.schema.json` - JSON schemas for each dataset

---

## Data Collection by Record Type

### 1. PageRecord (Pages Dataset)

**Purpose:** Complete crawl data for each page visited.

#### Fields Collected:

##### URL & Identity (Always Collected) ✅
- `url` - Original requested URL
- `finalUrl` - URL after redirects
- `normalizedUrl` - Normalized URL (lowercase, sorted params)
- `urlKey` - SHA-1 hash of normalizedUrl (for deduplication)
- `origin` - Protocol + hostname + port
- `pathname` - URL path component
- `section` - Leading "/" + first path segment (e.g., "/products/")

##### HTTP Response (Always Collected) ✅
- `statusCode` - HTTP status code (200, 404, etc.)
- `contentType` - MIME type from Content-Type header
- `fetchedAt` - ISO 8601 timestamp of fetch
- `redirectChain` - Array of URLs if redirected
- `robotsHeader` - X-Robots-Tag HTTP header value

##### Content Hashing (Always Collected) ✅
- `rawHtmlHash` - SHA-256 hash of raw HTTP response body
- `domHash` - SHA-256 hash of rendered DOM (`document.documentElement.outerHTML`)
  - **Mode Difference:** Only available in `prerender` and `full` modes
  - In `raw` mode: hash of the raw HTML (same as `rawHtmlHash`)

##### Title & Meta (Always Collected) ✅
- `title` - Page title from `<title>` tag
- `metaDescription` - Content from `<meta name="description">`
- `h1` - First H1 text content
- `headings` - Array of `{level: number, text: string}` for all H1-H6

##### Canonical & Robots (Always Collected) ✅
- `canonicalHref` - Verbatim `href` attribute from `<link rel="canonical">`
- `canonicalResolved` - Absolute URL resolved from base URL
- `canonical` - Alias of `canonicalResolved` (backward compatibility)
- `robotsMeta` - Content of `<meta name="robots">`
- `noindexSurface` - Enum: "meta" | "header" | "both" | undefined (if noindex detected)

##### Text Sample (Always Collected) ✅
- `textSample` - First 1500 bytes of body text with whitespace collapsed

##### Render Metadata (Always Collected) ✅
- `renderMode` - Enum: "raw" | "prerender" | "full"
- `renderMs` - Milliseconds spent rendering (or 0 for raw mode)
- `fetchMs` - Milliseconds spent fetching HTTP response
- `navEndReason` - How navigation ended: "fetch" | "load" | "networkidle" | "timeout" | "error"

##### Link Counts (Always Collected) ✅
- `internalLinksCount` - Number of internal links found
- `externalLinksCount` - Number of external links found
- `mediaAssetsCount` - Number of media assets (images/videos)
- `mediaAssetsTruncated` - Boolean (true if >1000 assets found)

##### Hreflang (Always Collected) ✅
- `hreflangLinks` - Array of `{lang: string, url: string}` from `<link rel="alternate" hreflang="...">`

##### Discovery (Always Collected) ✅
- `depth` - BFS depth from seed URLs
- `discoveredFrom` - URL that linked to this page (or "seed")
- `discoveredInMode` - Render mode used when link was discovered

##### Basic Flags (Always Collected) ✅
- `basicFlags.hasTitle` - Boolean
- `basicFlags.hasMetaDescription` - Boolean
- `basicFlags.hasH1` - Boolean
- `basicFlags.hasCanonical` - Boolean

##### Technical Headers (All Modes) 📝
- `securityHeaders` - Object of key security headers:
  - `content-security-policy` - CSP header
  - `strict-transport-security` - HSTS header
  - `x-frame-options` - Frame options
  - `x-content-type-options` - Content type options
  - `referrer-policy` - Referrer policy
  - `permissions-policy` - Permissions policy
- `faviconUrl` - Resolved absolute URL to site's favicon

**Status:** Type defined in PageRecord interface, extractor not yet implemented.

##### SEO & Tech Stack (Prerender/Full Modes Only) 📝
- `structuredData` - Array of structured data objects:
  - `type` - Enum: "json-ld" | "microdata" | "microformat"
  - `schemaType` - Schema.org type (e.g., "Article", "Product")
  - `data` - Parsed structured data object
- `techStack` - Array of detected technologies (e.g., `["React", "WordPress", "Google Analytics"]`)

**Status:** Type defined in PageRecord interface, extractor not yet implemented.

##### Performance Metrics (Full Mode Only) 📝
- `performance.lcp` - Largest Contentful Paint (ms)
- `performance.cls` - Cumulative Layout Shift
- `performance.tbt` - Total Blocking Time (ms)
- `performance.fcp` - First Contentful Paint (ms)
- `performance.ttfb` - Time to First Byte (ms)

**Status:** Type defined in PageRecord interface, extractor not yet implemented.

##### Media Capture (Full Mode Only) 📝
- `screenshotFile` - Path to full-page screenshot: `"media/screenshots/{urlKey}.png"`
- `viewportFile` - Path to above-the-fold screenshot: `"media/viewports/{urlKey}.png"`

**Status:** Writer methods exist, but capture logic not yet implemented. Directories created but empty.

##### Error Information (Only on Error) ✅
- `error` - Error message if page failed to process

---

### 2. EdgeRecord (Edges Dataset)

**Purpose:** Link relationships between pages.

#### Fields Collected:

- `sourceUrl` - Page containing the link
- `targetUrl` - Destination URL
- `anchorText` - Link text content (trimmed)
- `rel` - Value of `rel` attribute (e.g., "nofollow")
- `nofollow` - Boolean (true if rel contains "nofollow")
- `isExternal` - Boolean (true if different origin)
- `location` - Semantic location: "nav" | "header" | "footer" | "aside" | "main" | "other" | "unknown"
  - **Mode Difference:** In `raw` mode, always "unknown" (cannot determine semantic location)
  - In `prerender`/`full` modes: determined by walking up DOM ancestors
- `selectorHint` - CSS selector hint for debugging (e.g., "a:nth-of-type(5)")
- `discoveredInMode` - Render mode when link was found
- `httpStatusAtTo` - HTTP status of target page (if visited during crawl)

**Deduplication:** Edges are deduplicated by `(sourceUrl, targetUrl, selectorHint)`.

---

### 3. AssetRecord (Assets Dataset)

**Purpose:** Media assets on each page (capped at 1000 per page).

#### Fields Collected:

- `pageUrl` - Page containing the asset
- `assetUrl` - Absolute URL of the asset
- `type` - Enum: "image" | "video"
- `alt` - Alt text attribute value
- `hasAlt` - Boolean (true if alt text exists and non-empty)
- `naturalWidth` - Natural pixel width (if available)
- `naturalHeight` - Natural pixel height (if available)
- `displayWidth` - Rendered display width (if available)
- `displayHeight` - Rendered display height (if available)
- `estimatedBytes` - Estimated file size (if available)
- `visible` - Boolean visibility
  - **Mode Difference:** In `raw` mode: always `true` (cannot determine visibility)
  - In `prerender`/`full` modes: actual visibility from browser
- `inViewport` - Boolean (true if in viewport)
  - **Mode Difference:** In `raw` mode: always `false` (cannot determine)
  - In `prerender`/`full` modes: actual viewport calculation
- `loading` - Value of `loading` attribute (e.g., "lazy")
- `wasLazyLoaded` - Boolean (true if loading="lazy")

**Truncation:** If a page has >1000 assets, only first 1000 are recorded and `mediaAssetsTruncated` flag is set.

---

### 4. ErrorRecord (Errors Dataset)

**Purpose:** Crawl and processing errors.

#### Fields Collected:

- `url` - URL where error occurred
- `origin` - Origin (for DNS/SSL triage)
- `hostname` - Hostname (for host-level error grouping)
- `occurredAt` - ISO 8601 timestamp
- `phase` - Error phase: "fetch" | "render" | "extract" | "write"
- `code` - Error code (e.g., "ENOTFOUND", "ROBOTS_BLOCKED")
- `message` - Human-readable error message
- `stack` - JavaScript stack trace (if available)

---

### 5. AccessibilityRecord (Accessibility Dataset)

**Purpose:** Accessibility audit data for each page (optional, enabled by default).

#### Fields Collected:

- `pageUrl` - URL of audited page ✅
- `lang` - `lang` attribute from `<html>` tag (all modes) ✅
- `missingAltCount` - Number of images without alt text ✅
- `missingAltSources` - Array of image src URLs with missing alt (first 50) ✅
- `headingOrder` - Array of heading levels in DOM order (e.g., `["H1", "H2", "H2", "H3"]`) ✅
- `landmarks` - Presence of HTML5 landmarks: ✅
  - `landmarks.header` - Boolean
  - `landmarks.nav` - Boolean
  - `landmarks.main` - Boolean
  - `landmarks.aside` - Boolean
  - `landmarks.footer` - Boolean
- `roles` - Count of elements by ARIA role attribute (e.g., `{"button": 5, "navigation": 2}`) ✅

##### Prerender/Full Mode Additions: ✅
- `formControls` - Form accessibility summary:
  - `formControls.totalInputs` - Total number of form inputs
  - `formControls.missingLabel` - Count of inputs without labels
  - `formControls.inputsMissingLabel` - Array of selectors for unlabeled inputs
- `focusOrder` - Array of focusable elements (keyboard navigation order):
  - `selector` - CSS selector
  - `tabindex` - Tab index value

**Status:** ✅ Implemented and verified. Mode-specific extraction working correctly.

##### Full Mode Only: 📝
- `contrastViolations` - Array of color contrast violations:
  - `selector` - CSS selector
  - `fg` - Foreground color
  - `bg` - Background color
  - `ratio` - Contrast ratio
  - `level` - WCAG level: "AA" | "AAA"
- `ariaIssues` - Array of ARIA-related issues (future)

**Status:** Type defined, extractor not yet implemented.

**Enabling/Disabling:** Set `accessibility.enabled: false` in config to disable.

---

### 6. ConsoleRecord (Console Dataset) 🆕 **Full Mode Only** 📝

**Purpose:** Browser console messages for debugging and error tracking.

#### Fields Collected:

- `pageUrl` - The page that logged the message
- `type` - Enum: "log" | "warn" | "error" | "info"
- `message` - The log message or formatted string
- `stackTrace` - Stack trace (if error)
- `source` - Enum: "page" | "browser"
  - **Important:** Only `source: "page"` messages are stored
  - Browser messages (e.g., "AdBlocker blocked a resource", "React DevTools") are filtered out
- `timestamp` - ISO 8601 timestamp when message was logged

**Status:** Type defined, writer methods exist, directories created in archives. Browser console interception not yet implemented.

**Use Case:** Identify JavaScript errors, warnings, and debug messages that affect user experience.

---

### 7. ComputedTextNodeRecord (Styles Dataset) 🆕 **Full Mode Only** 📝

**Purpose:** Computed styles for text nodes to enable offline WCAG contrast audits.

#### Fields Collected:

- `pageUrl` - The page containing the text node
- `selector` - CSS selector for the element
- `textSample` - First 50 characters of the text node
- `fontSize` - Computed font size (e.g., "16px")
- `fontWeight` - Computed font weight (e.g., "400", "700")
- `color` - Computed text color (e.g., "rgb(51, 51, 51)")
- `backgroundColor` - Computed background color (e.g., "rgb(255, 255, 255)")
- `lineHeight` - Computed line height (optional)
- `nodeType` - Always "TEXT_NODE"

**Status:** Type defined, writer methods exist, directories created in archives. DOM traversal and style extraction not yet implemented.

**Why Critical:** This dataset allows consumer applications to:
- Run 100% accurate color contrast audits **offline** without re-crawling
- Flag hard-coded pixel sizes vs. responsive units
- Detect readability issues (font size, weight, line height)

**Implementation:** Uses `getComputedStyle()` in browser to capture actual rendered styles after CSS cascading.

---

### 8. Media Files (Full Mode Only) 🆕

**Purpose:** Visual verification and WCAG review.

#### Files Stored:

**Screenshots:**
- `media/screenshots/{urlKey}.png` - Full-page, "below the fold" screenshot
- `media/viewports/{urlKey}.png` - Above-the-fold viewport screenshot (e.g., 1280x800)

**PageRecord Reference:**
- `screenshotFile: "media/screenshots/{urlKey}.png"`
- `viewportFile: "media/viewports/{urlKey}.png"`

**Use Cases:**
- Visual regression testing
- Manual WCAG color contrast verification
- Layout and responsive design review
- Client reporting and demos

---

## Render Mode Differences

### Raw Mode (`--mode raw`)

**Behavior:**
- No browser/JavaScript execution
- Uses raw HTTP response body only
- Parses HTML with Cheerio (static HTML parser)

**Data Differences:**
- ✅ All page metadata extracted from static HTML
- ✅ Security headers and favicon URL
- ✅ Links extracted (but `location` always "unknown")
- ✅ Assets extracted (but `visible` always true, `inViewport` always false)
- ✅ Basic accessibility checks (missing alt, lang attribute)
- ❌ No JavaScript-rendered content
- ❌ No dynamic lazy-loaded images
- ❌ No accurate visibility/viewport data
- ❌ No structured data or tech stack detection
- ❌ No form controls or focus order
- ❌ No performance metrics
- ❌ No console logs
- ❌ No computed styles
- ❌ No screenshots
- ✅ `domHash` = hash of raw HTML (same as `rawHtmlHash`)
- ✅ `navEndReason` always "fetch"
- ✅ `renderMs` minimal (just HTML parsing time)

**Spec Level:** 1 (Basic crawl data only)

**Use Cases:**
- Fast crawling of static sites
- Budget-conscious crawls (no browser overhead)
- Sites that don't require JavaScript
- Content inventory and sitemap generation

---

### Prerender Mode (`--mode prerender`, **default**)

**Behavior:**
- Uses Playwright (Chromium headless)
- Waits for `networkidle` event
- Executes JavaScript and renders DOM
- No additional post-render operations

**Data Differences:**
- ✅ All page metadata from rendered DOM
- ✅ Security headers and favicon URL
- ✅ Links with semantic location ("nav", "header", "footer", etc.)
- ✅ Assets with accurate visibility/viewport data
- ✅ JavaScript-rendered content included
- ✅ Lazy-loaded images that load on page load
- ✅ Structured data extraction (JSON-LD, Microdata)
- ✅ Tech stack detection (React, WordPress, etc.)
- ✅ Form controls and focus order analysis
- ✅ Enhanced accessibility auditing
- ❌ No performance metrics (LCP, CLS, TBT)
- ❌ No console logs
- ❌ No computed styles
- ❌ No screenshots
- ✅ `domHash` = hash of `document.documentElement.outerHTML` (rendered DOM)
- ✅ `navEndReason` can be "networkidle", "timeout", or "error"
- ✅ `renderMs` includes browser navigation and rendering time

**Spec Level:** 2 (SEO-ready with rendered content)

**Use Cases:**
- Most production sites (JavaScript-heavy)
- SEO audits (see what search engines see)
- Balanced performance/accuracy
- Technical SEO and content analysis

---

### Full Mode (`--mode full`) 🆕 **"Gold Standard" Audit**

**Behavior:**
- Uses Playwright (Chromium headless)
- Waits for `networkidle` event
- Executes JavaScript and renders DOM
- **Post-render deep analysis:**
  - Captures Core Web Vitals
  - Records console messages (page-only)
  - Extracts computed styles for text nodes
  - Takes full-page and viewport screenshots

**Data Differences:**
- ✅ **Everything from Prerender mode, plus:**
- ✅ Core Web Vitals (LCP, CLS, TBT, FCP, TTFB)
- ✅ Console messages (errors, warnings, logs) - filtered to page-only
- ✅ Computed styles for all text nodes (fontSize, fontWeight, color, backgroundColor)
- ✅ Full-page screenshots (`media/screenshots/{urlKey}.png`)
- ✅ Viewport screenshots (`media/viewports/{urlKey}.png`)
- ✅ Enhanced contrast violation detection
- ✅ Complete WCAG audit-ready dataset

**Spec Level:** 3 (Complete audit with performance, console, styles, and media)

**Use Cases:**
- Comprehensive WCAG accessibility audits
- Performance monitoring and optimization
- Visual regression testing
- Client reporting with screenshots
- Offline contrast ratio analysis
- Debugging JavaScript errors at scale

**Consumer Application Behavior:**
- A tool like "Horizon Accessibility" would check `manifest.json`
- If `specLevel < 3`, disable "Run WCAG Audit" button
- Show message: _"This Atlas was not created in 'full' mode. A complete WCAG audit requires computed styles and screenshots. Please re-crawl in 'full' mode."_

---

## Additional Processing

### URL Normalization & Parameter Policies

**Normalization Applied:**
- Lowercase hostname
- Remove default ports (80 for HTTP, 443 for HTTPS)
- Sort query parameters alphabetically
- Remove trailing slashes (configurable)

**Parameter Policies** (`--paramPolicy`):
1. **`keep`** - Keep all query parameters
2. **`strip`** - Remove all query parameters
3. **`sample`** (default) - Sample unique parameter combinations per pathname
   - First 5 unique parameter sets per path are kept
   - Subsequent variations are deduplicated to prevent crawl explosion

**Blocklist** (`--blockList`):
- Strip tracking parameters (e.g., `utm_*`, `fbclid`, `gclid`)
- Custom patterns supported (wildcards with `*`)

---

### Robots.txt Handling

**Behavior:**
- Respects `robots.txt` by default (`--robots-respect`)
- Can override with `--robots-override` (for sites you administer)
- Caches robots.txt per origin
- Blocked URLs generate `ErrorRecord` with `code: "ROBOTS_BLOCKED"`

**Manifest Notes:**
- If override used, manifest includes warning: `"WARNING: Robots.txt override was used. Only use on sites you administer."`

---

### Rate Limiting & Concurrency

**HTTP Rate Limiting:**
- Global RPS limit: `--rps` (default 2 requests/sec)
- Per-host RPS limit: `--perHostRps` (default 2 requests/sec)

**Rendering Concurrency:**
- Browser concurrency: `--concurrency` (default 2 concurrent Playwright pages)

**Memory Management:**
- Browser context recycling after 50 pages or 70% of max RSS
- Queue pausing if memory exceeds threshold

---

## Privacy & Security Considerations

### Data NOT Collected

- ❌ Cookies or session data
- ❌ POST request bodies
- ❌ Form submissions
- ❌ User input or PII (unless in page HTML)
- ❌ Third-party API responses (unless embedded in page)
- ❌ Browser storage (localStorage, sessionStorage, IndexedDB)
- ❌ WebSocket communications

### Data Collection Scope

- ✅ Public HTML content only
- ✅ Links and assets referenced in HTML
- ✅ HTTP headers (security, robots, caching)
- ✅ Publicly accessible page text and metadata
- ✅ Browser console messages (page-only, full mode)
- ✅ Computed CSS styles (full mode)
- ✅ Screenshots of public pages (full mode)
- ✅ Performance metrics (full mode)

### Ethical Use

- Use `--robots-respect` (default) to honor site preferences
- Only use `--robots-override` on sites you own/administer
- Respect `--rps` and `--perHostRps` limits to avoid overloading servers
- Use `--errorBudget` to halt crawls that encounter systematic issues

---

## Manifest & Provenance

### Manifest Fields

**Attribution:**
- `owner.name`: "Cai Frazier"
- `consumers`: ["Continuum SEO", "Horizon Accessibility"]
- `generator`: "cartographer-engine/1.0.0"

**Integrity:**
- `integrity.files`: SHA-256 hashes of all compressed JSONL parts
- `hashing.algorithm`: "sha256"
- `hashing.urlKeyAlgo`: "sha1"

**Capabilities:** 🆕 **Enhanced for Consumer Applications**
- `capabilities.renderModes`: Array of modes used (deprecated, use `modesUsed`)
- `capabilities.modesUsed`: Array of all modes used in crawl (e.g., `["prerender"]`)
- `capabilities.specLevel`: **Integer spec level based on least-capable mode:**
  - **1** = Raw. Contains static HTML data only (sitemap/content-only).
  - **2** = Prerender. Contains rendered DOM and JS-dependent data (SEO-ready).
  - **3** = Full. Contains rendered DOM, performance metrics, console, styles, and media (full WCAG/audit-ready).
- `capabilities.dataSets`: Array of datasets present (e.g., `["pages", "edges", "assets", "errors", "accessibility", "console", "styles"]`)
- `capabilities.robots.respectsRobotsTxt`: Boolean
- `capabilities.robots.overrideUsed`: Boolean

**Consumer Application Usage:**
```javascript
// Example: Horizon Accessibility checking spec level
const manifest = JSON.parse(atlasFile.read('manifest.json'));
if (manifest.capabilities.specLevel < 3) {
  ui.disableButton('runWCAGAudit');
  ui.showMessage(
    'This Atlas was not created in "full" mode. A complete WCAG audit requires ' +
    'computed styles and screenshots. Please re-crawl in "full" mode.'
  );
}

// Check if specific datasets are present
const hasConsole = manifest.capabilities.dataSets.includes('console');
const hasStyles = manifest.capabilities.dataSets.includes('styles');
```

**Provenance Notes:**
- `incomplete`: Boolean (true during crawl, false after finalization)
- `notes`: Array of human-readable notes
  - Includes warnings (e.g., robots.txt override)
  - Resume provenance (if resumed from checkpoint)
  - Checkpoint interval
  - Graceful vs. forced shutdown

**Schemas:**
- `schemas.pages`: "schemas/pages.schema.json#1"
- `schemas.edges`: "schemas/edges.schema.json#1"
- `schemas.assets`: "schemas/assets.schema.json#1"
- `schemas.errors`: "schemas/errors.schema.json#1"
- `schemas.accessibility`: "schemas/accessibility.schema.json#1" (if enabled)
- `schemas.console`: "schemas/console.schema.json#1" (full mode only)
- `schemas.styles`: "schemas/styles.schema.json#1" (full mode only)

---

## Summary Statistics

### AtlasSummary (summary.json)

- `totalPages` - Total page records written
- `totalEdges` - Total edge records written
- `totalAssets` - Total asset records written
- `totalErrors` - Total error records written
- `totalAccessibilityRecords` - Total accessibility records (if enabled)
- `totalConsoleRecords` - Total console records (full mode only)
- `totalStyleRecords` - Total computed style records (full mode only)
- `statusCodes` - Count by HTTP status code (e.g., `{200: 95, 404: 5}`)
- `renderModes` - Count by render mode (e.g., `{prerender: 100}`)
- `avgRenderMs` - Average render time in milliseconds
- `maxDepth` - Maximum BFS depth reached
- `crawlStartedAt` - ISO 8601 timestamp of crawl start
- `crawlCompletedAt` - ISO 8601 timestamp of crawl completion
- `crawlDurationMs` - Total crawl duration in milliseconds

---

## Mode Comparison Table

| Feature | Raw Mode | Prerender Mode | Full Mode |
|---------|----------|----------------|-----------|
| **Browser** | ❌ None | ✅ Chromium | ✅ Chromium |
| **JavaScript Execution** | ❌ No | ✅ Yes | ✅ Yes |
| **DOM Hashing** | Raw HTML hash | Rendered DOM hash | Rendered DOM hash |
| **Link Location** | "unknown" | Semantic (nav/header/etc.) | Semantic |
| **Asset Visibility** | Always true | Actual visibility | Actual visibility |
| **Asset Viewport** | Always false | Actual viewport | Actual viewport |
| **Lazy-Loaded Content** | ❌ Not captured | ✅ Captured | ✅ Captured |
| **Security Headers** | ✅ Captured | ✅ Captured | ✅ Captured |
| **Favicon URL** | ✅ Captured | ✅ Captured | ✅ Captured |
| **Structured Data** | ❌ No | ✅ JSON-LD, Microdata | ✅ JSON-LD, Microdata |
| **Tech Stack Detection** | ❌ No | ✅ Yes | ✅ Yes |
| **Form Accessibility** | ❌ No | ✅ Yes | ✅ Yes |
| **Focus Order** | ❌ No | ✅ Yes | ✅ Yes |
| **Performance Metrics** | ❌ No | ❌ No | ✅ LCP, CLS, TBT, FCP, TTFB |
| **Console Logs** | ❌ No | ❌ No | ✅ Page-only messages |
| **Computed Styles** | ❌ No | ❌ No | ✅ All text nodes |
| **Screenshots** | ❌ No | ❌ No | ✅ Full-page + viewport |
| **Contrast Violations** | ❌ No | ❌ No | ✅ Detected |
| **Spec Level** | 1 | 2 | 3 |
| **Speed** | ⚡ Fastest | 🐢 Moderate | 🐌 Slowest |
| **Memory** | 💾 Low | 💾 High | 💾 Very High |
| **Use Case** | Static sites, fast crawls | Production sites (default) | Complete WCAG/Performance audits |

---

## Configuration Options Affecting Data Collection

### Discovery Options
- `--followExternal` - Crawl external links (default: false)
- `--paramPolicy` - How to handle URL parameters: keep|strip|sample
- `--blockList` - Comma-separated tracking params to strip (e.g., `utm_*,fbclid`)

### Rendering Options
- `--mode` - Render mode: raw|prerender|full (default: prerender)
- `--concurrency` - Browser concurrency (default: 2)
- `--timeout` - Page navigation timeout in ms (default: 30000)
- `--maxRequestsPerPage` - Abort page after N requests (default: 150)
- `--maxBytesPerPage` - Abort page after N bytes (default: 10MB)

### Robots Options
- `--robots-respect` - Respect robots.txt (default: true)
- `--robots-override` - Override robots.txt (USE ONLY ON YOUR SITES)

### Limits
- `--maxPages` - Max pages to crawl (0 = unlimited)
- `--errorBudget` - Max errors before aborting (0 = unlimited)
- `--rps` - Requests per second (default: 2)
- `--perHostRps` - Requests per second per host (default: 2)

### Accessibility
- `--accessibility-enabled` - Enable accessibility auditing (default: true)

---

## Checkpoint & Resume

**Checkpoint Files** (in staging directory):
- `state.json` - Crawl state snapshot
- `visited.idx` - Newline-separated list of visited URL keys
- `frontier.json` - Queue snapshot (unvisited URLs)

**Resume Behavior:**
- Restores visited set, queue, and page count
- Continues appending to existing JSONL parts
- Provenance note added to manifest: `"Resumed from crawl: <crawlId>"`

---

## Structured Event Logging

**Event Types** (NDJSON to `--logFile`):
- `crawl.started` - Crawl initiation with config
- `page.fetched` - HTTP fetch completed
- `page.parsed` - Page extraction completed
- `error.occurred` - Error encountered
- `checkpoint.saved` - Checkpoint written
- `crawl.heartbeat` - Progress update (1Hz)
- `crawl.backpressure` - Rate limit backpressure
- `crawl.shutdown` - Graceful shutdown initiated
- `crawl.finished` - Crawl completed

---

## Conclusion

Cartographer's Atlas format provides a comprehensive, reproducible snapshot of website structure and content with three distinct spec levels:

### Spec Level 1: Raw Mode
- **Purpose:** Fast, lightweight crawling of static content
- **Datasets:** Pages, Edges, Assets, Errors
- **Use Cases:** Content inventory, sitemap generation, static site analysis
- **Performance:** Fastest, lowest resource usage

### Spec Level 2: Prerender Mode (Default)
- **Purpose:** SEO-ready crawls with JavaScript rendering
- **Datasets:** Pages, Edges, Assets, Errors, Accessibility
- **Enhanced Data:** Structured data, tech stack, form controls, focus order
- **Use Cases:** SEO audits, technical site analysis, accessibility baseline
- **Performance:** Moderate speed, balanced resource usage

### Spec Level 3: Full Mode (Gold Standard)
- **Purpose:** Complete WCAG and performance audits
- **Datasets:** All from Prerender + Console, Styles, Media (screenshots)
- **Enhanced Data:** Core Web Vitals, console logs, computed styles, visual capture
- **Use Cases:** Complete accessibility audits, performance monitoring, visual regression, client reporting
- **Performance:** Slowest, highest resource usage, most comprehensive

### Key Standards & Guarantees

1. **Integrity:** All archives include SHA-256 hashes of all parts for verification
2. **Provenance:** Full tracking of resume history, checkpoint intervals, and shutdown state
3. **Attribution:** All archives attribute owner as "Cai Frazier"
4. **Extensibility:** Versioned schemas allow for future enhancements
5. **Consumer-Friendly:** `specLevel` in manifest enables consumer applications to validate capabilities before attempting analysis

### Consumer Application Guidelines

Consumer applications (e.g., "Horizon Accessibility", "Continuum SEO") should:

1. **Always check `manifest.json` first:**
   ```javascript
   const manifest = JSON.parse(atlasFile.read('manifest.json'));
   const specLevel = manifest.capabilities.specLevel;
   const dataSets = manifest.capabilities.dataSets;
   ```

2. **Validate required capabilities:**
   - Accessibility tools: Require `specLevel >= 3` for complete audits
   - SEO tools: Require `specLevel >= 2` for rendered content
   - Content tools: `specLevel >= 1` sufficient

3. **Check for specific datasets:**
   ```javascript
   const hasConsole = dataSets.includes('console');
   const hasStyles = dataSets.includes('styles');
   ```

4. **Provide clear feedback:**
   - If `specLevel` insufficient, disable features and show clear message
   - Suggest re-crawling in appropriate mode
   - Link to documentation on mode differences

### Data Ethics & Respect

All data collection:
- Respects `robots.txt` by default
- Honors rate limits (configurable per-host RPS)
- Focuses on public HTML content only
- Includes no cookies, sessions, or private data
- Filters console logs to page-only (no browser internal messages)

---

**Document Maintainer:** Cai Frazier  
**Last Updated:** October 24, 2025  
**Atlas Spec Version:** 1.0  
**Schema Version:** 2025-10-22  
**Spec Levels:** 1 (Raw), 2 (Prerender), 3 (Full)
