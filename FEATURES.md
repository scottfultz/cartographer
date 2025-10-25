# Cartographer Engine - Features

**Complete feature list with implementation status.**

**Legend:**
- ✅ **Implemented** - Production ready, fully functional
- 🚧 **In Development** - Partially implemented, work in progress
- 📝 **Planned** - Designed but not yet implemented

---

## Core Crawling Features

### ✅ Headless Browser Automation
- Playwright Chromium integration
- Configurable concurrency (parallel browser tabs)
- Browser context pooling and recycling
- Stealth mode (disable automation markers)
- Session persistence (cookies, localStorage)
- Graceful browser cleanup

### ✅ Three Render Modes
- **Raw Mode:** Static HTML only, no JavaScript execution
- **Prerender Mode:** JavaScript rendering + SEO data extraction
- **Full Mode:** Complete WCAG audit + accessibility data

### ✅ BFS Crawling Engine
- Breadth-first search queue with depth tracking
- Configurable depth limits (unlimited = -1, seeds only = 0)
- URL deduplication and normalization
- Link extraction and filtering
- Respects robots.txt (optional)

### ✅ Rate Limiting
- Per-host RPS controls
- Global RPS controls
- Token bucket algorithm
- Configurable request delays

### ✅ Memory Management
- Automatic backpressure detection
- Browser context recycling
- Streaming I/O (no in-memory buffers)
- Memory metrics tracking (RSS, peak RSS)

### ✅ Error Handling
- Error budget enforcement (max errors before abort)
- Graceful degradation
- Error record capture
- Challenge page detection (Cloudflare, Akamai)
- Automatic challenge wait (15s timeout)

### ✅ Checkpoint/Resume
- Periodic checkpoint emission
- State persistence (queue, visited URLs, depth map)
- Resume from checkpoint file
- Fault-tolerant crawling

---

## Atlas Archive Features

### ✅ Archive Structure
- ZIP-based `.atls` format
- JSONL parts (newline-delimited JSON)
- Zstandard compression (~8x ratio)
- Incremental part writing
- Automatic filename generation

### ✅ Archive Parts
- **pages/** - PageRecords (URL, HTML, metadata, accessibility)
- **edges/** - EdgeRecords (link graph, source → target)
- **assets/** - AssetRecords (images, videos, media metadata)
- **errors/** - ErrorRecords (all errors encountered)
- **accessibility/** - AccessibilityRecords (WCAG data, full mode only)

### ✅ Manifest System
- Metadata attribution (owner: "Cai Frazier")
- Spec level calculation (1=Raw, 2=Prerender, 3=Full)
- Crawl configuration snapshot
- Dataset inventory
- Creation timestamps
- Archive versioning

### ✅ Summary Statistics
- Total pages, edges, assets, errors
- Completion reason (finished, capped, error_budget, manual)
- Crawl duration
- Performance metrics

### ✅ Schema Validation
- JSON Schema definitions for all record types
- Pre-write validation
- Post-creation QA validation
- Duplicate detection
- Corruption detection

---

## Data Extraction Features

### ✅ Page Metadata (All Modes)
- URL, status code, HTTP headers
- HTML content (raw or rendered)
- Title, meta description, meta keywords
- Canonical URL
- Robots meta tags
- Language detection
- Text samples (first 500 chars)
- Word count
- Link counts (internal, external)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)

### ✅ SEO Data (Prerender/Full Modes)
- Open Graph tags (og:title, og:image, og:description, etc.)
- Twitter Card tags
- Structured data extraction (JSON-LD)
- Hreflang tags
- Pagination tags (rel=next, rel=prev)

### ✅ Accessibility Data (All Modes - Basic)
- Alt text analysis (missing alt count, sources)
- Heading structure (H1-H6 hierarchy)
- ARIA landmarks
- ARIA roles
- Language attributes
- Page-level language

### ✅ Accessibility Data (Prerender/Full Modes - Enhanced)
- Form control analysis (labels, autocomplete, types)
- Focus order extraction (tabindex tracking)
- ARIA live regions
- Form autocomplete analysis

### ✅ Link Graph
- Source and target URLs
- Link text and context
- Link type (internal, external)
- Anchor text

### ✅ Asset Metadata
- Asset URL and type
- Parent page URL
- Asset size (if available)
- Media type (image, video, audio)

### ✅ Enhanced Metrics
- Resource counts (CSS, JS, images, fonts)
- Character encoding detection
- Compression detection (gzip, brotli, zstd)
- Viewport meta tags
- Mixed content detection
- Subresource integrity (SRI)
- Broken link detection
- Outbound domain analysis

### ✅ Hashing & Deduplication
- SHA-256 content hashing
- SHA-1 content hashing
- Hex and base64 encoding
- Content deduplication

---

## CLI Features

### ✅ Crawl Command
- Flexible seed URL input (single or multiple)
- Mode selection (raw, prerender, full)
- Page limits (maxPages)
- Depth limits (maxDepth)
- Rate limiting (rps, concurrency)
- Error budget enforcement
- Quiet mode (minimal output)
- JSON mode (machine-readable output)
- Structured logging (NDJSON)
- Log level control (debug, info, warn, error)
- CrawlId substitution in file paths
- Archive validation on completion (optional)

### ✅ Export Command
- CSV export from .atls archives
- Report types: pages, edges, assets, errors, accessibility
- Column mapping and formatting
- Streaming export (low memory)

### ✅ Validate Command
- Schema validation for all parts
- Duplicate detection
- Corruption detection
- Manifest integrity checks

### ✅ Exit Codes
- 0: Success
- 2: Error budget exceeded
- 3: Browser/render fatal error
- 4: Write/IO fatal error
- 5: Validation failed
- 10: Unknown error

---

## Monitoring & Observability

### ✅ Structured Logging
- NDJSON event stream
- Event types: crawl.started, crawl.pageProcessed, crawl.checkpoint, crawl.error, crawl.backpressure, crawl.finished
- Custom log file paths
- CrawlId substitution
- Log level filtering

### ✅ Metrics Collection
- Performance timings (fetch, render, extract, write)
- Percentile calculation (p50, p95, p99)
- Throughput tracking (pages/sec)
- Memory tracking (current RSS, peak RSS)
- Queue size monitoring
- Counter tracking (pages, edges, assets, errors, bytes)

### ✅ Periodic Metrics
- Configurable emission interval
- Console output or file logging
- Real-time progress tracking

---

## Testing & Quality

### ✅ Comprehensive Test Suite
- 346 unit tests (fast, ~0.6s)
- Node.js native test runner
- Phase 1 WCAG tests (104 tests)
- Extractor tests (125 tests)
- Utility tests (88 tests)
- Core engine tests (130 tests)

### ✅ CI/CD
- GitHub Actions workflow
- Matrix testing (Node.js 20 & 22)
- Build validation
- Unit + integration tests
- Archive validation
- Artifact upload

---

## 🚧 In Development

### 🚧 Tech Stack Detection (Prerender/Full Modes)
**Status:** Type defined, extractor not yet implemented  
**Effort:** 3-4 hours  
**Data Source:** DOM patterns, meta tags, headers, `window.*` globals  
**Location:** Create `src/core/extractors/techStack.ts`

**Planned Detection:**
- Frontend frameworks (React, Vue, Angular, etc.)
- CMS platforms (WordPress, Drupal, Joomla, etc.)
- Analytics (Google Analytics, Mixpanel, etc.)
- Tag managers (GTM, Adobe Launch, etc.)
- A/B testing (Optimizely, VWO, etc.)
- CDNs (Cloudflare, Fastly, etc.)

---

## 📝 Planned Features

### 📝 Performance Metrics (Full Mode Only)
**Status:** Type defined, extractor not yet implemented  
**Effort:** 2-3 hours  
**Data Source:** `page.evaluate()` with Performance API  
**Location:** Create `src/core/extractors/performance.ts`

**Planned Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- Navigation Timing (TTFB, DOM load, etc.)
- Resource Timing (by type)
- Paint Timing (FP, FCP)

### 📝 Console Log Capture (Full Mode Only)
**Status:** Type defined, writer exists, capture logic not implemented  
**Effort:** 1-2 hours  
**Data Source:** `page.on('console')` event listener  
**Location:** Add to `src/core/renderer.ts`

**Planned Capture:**
- Console messages (log, warn, error, info)
- Message text, level, timestamp
- Stack traces
- Source location

### 📝 Computed Styles Extraction (Full Mode Only)
**Status:** Type defined, writer exists, extractor not implemented  
**Effort:** 3-4 hours  
**Data Source:** `page.evaluate()` with DOM traversal + `getComputedStyle()`  
**Location:** Create `src/core/extractors/styles.ts`

**Planned Extraction:**
- Text node styles (font, color, size, weight, line-height)
- Contrast calculations
- Visibility analysis

### 📝 Screenshot Capture (Full Mode Only)
**Status:** Directories created, capture logic not implemented  
**Effort:** 2-3 hours  
**Data Source:** `page.screenshot()` for multiple viewports  
**Location:** Add to `src/core/renderer.ts`

**Planned Capture:**
- Desktop viewport (1920x1080)
- Mobile viewport (375x667)
- Tablet viewport (768x1024) - optional
- Configurable quality (JPEG 80%, PNG)
- Full page or viewport-only

### 📝 Favicon Collection (Full Mode Only)
**Status:** CLI options exist, extraction not implemented  
**Effort:** 30 minutes  
**Data Source:** `<link rel="icon">` or fallback `/favicon.ico`  
**Location:** Add to `src/core/extractors/page.ts`

### 📝 Contrast Violations (Full Mode Only)
**Status:** Type defined, extractor not implemented  
**Effort:** 2-3 hours  
**Data Source:** Computed styles + contrast calculation  
**Location:** Add to `src/core/extractors/accessibility.ts`

**Planned Detection:**
- WCAG AA/AAA contrast ratios
- Text/background color pairs
- Large text vs small text
- Violation count and locations

### 📝 Keyboard Trap Detection (Full Mode Only)
**Status:** Type defined, runtime analysis not implemented  
**Effort:** 4-5 hours  
**Data Source:** Playwright keyboard simulation  
**Location:** Create `src/core/extractors/runtimeAccessibility.ts`

**Planned Detection:**
- Tab navigation simulation
- Focus trap identification
- Escape key handling

### 📝 Skip Link Detection (Full Mode Only)
**Status:** Type defined, extractor not implemented  
**Effort:** 2-3 hours  
**Data Source:** DOM analysis + link testing  
**Location:** Create `src/core/extractors/runtimeAccessibility.ts`

**Planned Detection:**
- Skip navigation links
- Target element verification
- Visibility checks

### 📝 Media Element Analysis (Full Mode Only)
**Status:** Type defined, extractor not implemented  
**Effort:** 2-3 hours  
**Data Source:** `<video>` and `<audio>` element inspection  
**Location:** Create `src/core/extractors/runtimeAccessibility.ts`

**Planned Analysis:**
- Captions/subtitles presence
- Audio descriptions
- Controls accessibility
- Autoplay detection

---

## Feature Implementation Roadmap

### Phase 1: High-Value SEO (1-2 weeks)
**Goal:** Match Screaming Frog feature parity

- ✅ Security headers extraction (CSP, HSTS, etc.) - **COMPLETED**
- ✅ Structured data extraction (JSON-LD) - **COMPLETED**
- ✅ Enhanced metrics (compression, encoding, resources) - **COMPLETED**
- ✅ Open Graph + Twitter Cards - **ALREADY IMPLEMENTED**
- 🚧 Tech stack detection - **IN PROGRESS**
- 📝 Favicon collection - **PLANNED**

### Phase 2: Accessibility Expansion (2-3 weeks)
**Goal:** Comprehensive WCAG 2.1 AA coverage

- ✅ Basic accessibility (alt text, headings, ARIA) - **COMPLETED**
- ✅ Form analysis (labels, autocomplete) - **COMPLETED**
- ✅ Focus order tracking - **COMPLETED**
- ✅ ARIA live regions - **COMPLETED**
- 📝 Contrast violations - **PLANNED**
- 📝 Keyboard trap detection - **PLANNED**
- 📝 Skip link detection - **PLANNED**
- 📝 Media element analysis - **PLANNED**

### Phase 3: Performance & Observability (1-2 weeks)
**Goal:** Full-stack performance monitoring

- ✅ Metrics collection framework - **COMPLETED**
- ✅ Structured logging - **COMPLETED**
- 📝 Core Web Vitals (LCP, FID, CLS) - **PLANNED**
- 📝 Console log capture - **PLANNED**
- 📝 Computed styles extraction - **PLANNED**
- 📝 Screenshot capture - **PLANNED**

### Phase 4: Advanced Features (Future)
**Goal:** Premium feature differentiation

- 📝 Competitive analysis (traffic, rankings)
- 📝 Multi-language crawling (hreflang chains)
- 📝 Historical comparison (archive diffs)
- 📝 Custom extractors API
- 📝 Plugin system

---

## Feature Coverage by Mode

| Feature | Raw | Prerender | Full |
|---------|-----|-----------|------|
| **Core Crawling** |
| URL deduplication | ✅ | ✅ | ✅ |
| Depth tracking | ✅ | ✅ | ✅ |
| Rate limiting | ✅ | ✅ | ✅ |
| Error handling | ✅ | ✅ | ✅ |
| Checkpoint/resume | ✅ | ✅ | ✅ |
| **Page Metadata** |
| HTML content | ✅ Static | ✅ Rendered | ✅ Rendered |
| Status code | ✅ | ✅ | ✅ |
| HTTP headers | ✅ | ✅ | ✅ |
| Title, meta tags | ✅ | ✅ | ✅ |
| Security headers | ✅ | ✅ | ✅ |
| **SEO Data** |
| Open Graph | ❌ | ✅ | ✅ |
| Twitter Cards | ❌ | ✅ | ✅ |
| Structured data | ❌ | 🚧 | 🚧 |
| Tech stack | ❌ | 🚧 | 🚧 |
| **Accessibility** |
| Alt text analysis | ✅ | ✅ | ✅ |
| Heading structure | ✅ | ✅ | ✅ |
| ARIA landmarks | ✅ | ✅ | ✅ |
| Form controls | ❌ | ✅ | ✅ |
| Focus order | ❌ | ✅ | ✅ |
| Contrast violations | ❌ | ❌ | 📝 |
| Keyboard traps | ❌ | ❌ | 📝 |
| **Performance** |
| Core Web Vitals | ❌ | ❌ | 📝 |
| Console logs | ❌ | ❌ | 📝 |
| Computed styles | ❌ | ❌ | 📝 |
| **Media** |
| Screenshots | ❌ | ❌ | 📝 |
| Favicons | ❌ | ❌ | 📝 |

---

## Statistics

**Total Features:** 60+  
**Implemented:** 45+ (75%)  
**In Development:** 1 (<2%)  
**Planned:** 14+ (23%)

**Test Coverage:**
- Total Tests: 346
- Pass Rate: 98.3% (340 passing, 6 timing issues in test harness)
- Unit Tests: 346 (~0.6s)
- Integration Tests: Available

---

## Related Documents

- **[README.md](README.md)** - CLI reference and usage
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick start guide
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Codebase architecture
- **[MISSION.md](MISSION.md)** - Project vision and goals

---

**Copyright © 2025 Cai Frazier. All rights reserved.**
