# Cartographer Engine

[![CI](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml/badge.svg)](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-527%20passing-brightgreen)](https://github.com/scottfultz/cartographer/actions)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

A production-grade headless web crawler that produces **Atlas v1.0 (.atls)** archive files. Cartographer Engine writes structured, compressed archives consumed by the Continuum application.

**Owner:** Cai Frazier  
**Status:** Beta (Systematic Validation In Progress)  
**Version:** 1.0.0-beta.1

### Current Stability

- **Unit Tests:** ✅ All passing (565/570 tests, 98.9% pass rate)
- **Integration Tests:** ⚠️ 5 environment-specific failures in CI ([details](REMAINING_TEST_FAILURES.md))
- **Core Functionality:** ✅ Validated and stable
- **Production Use:** ⚠️ Beta - Systematic validation 27% complete ([status](FEATURE_STATUS_MATRIX.md))

### Validation Status (27% Complete)

**Phase 1: CLI Commands** ✅ 100% Complete (6/6 commands validated)
- ✅ `crawl` - All 3 render modes tested on real sites
- ✅ `export` - All 11 report types working (pages, edges, assets, errors, accessibility, redirects, noindex, canonicals, sitemap, social, images)
  - ⚠️ **Note:** Enhanced analysis reports (redirects, noindex, canonicals, sitemap, social, images) are **temporary** and will be moved to Continuum before RC
- ✅ `validate` - Archive integrity validation working
- ✅ `version`, `stress`, `tail` - Basic functionality verified

**Phase 2: Core Features** 🔄 60% Complete
- ✅ Render modes validated (raw, prerender, full)
- ✅ Concurrency & RPS limiting tested
- ✅ Challenge detection confirmed (Cloudflare bypass working)
- ✅ Robots.txt compliance logging working
- ⏸️ Session persistence, checkpoints, URL filtering, privacy mode (not yet tested)

**Phase 3: WCAG Enhancements** 🔄 57% Complete
- ✅ All 7 WCAG enhancements validated on real site data:
  - ✅ Multiple Ways (2.4.5) - Site maps, search, breadcrumbs detection
  - ✅ Sensory Characteristics (1.3.3) - Shape/color/size/location references
  - ✅ Images of Text (1.4.5) - Text-in-image detection
  - ✅ Navigation Elements (3.2.3) - Link extraction for consistency analysis
  - ✅ Component Identification (4.1.2) - Button/link/icon ARIA labels
  - ✅ Pointer Cancellation (2.5.2) - Runtime mousedown/touchstart checks
  - ✅ On Focus Context Change - Runtime onfocus handler checks
- ⏸️ Unit tests for WCAG functions (0% coverage)
- ⏸️ Cross-page WCAG analyzer (not yet implemented)

**Phases 4-5: Not Started** ❌
- Edge case testing (network errors, content issues, resource limits)
- Performance benchmarking (large sites, concurrency scaling)

**Known Issues:**
- 🐛 **FIXED:** Accessibility CSV export was missing from CLI (now working)
- ⚠️ Schema validation warnings (cosmetic, doesn't affect functionality)
- ⚠️ 5 integration test failures (environment-specific, not blocking)

**Documentation:**
- ✅ [Command-Line Usage Guide](docs/COMMAND_LINE_GUIDE.md)
- ✅ [WCAG Accessibility Testing Guide](docs/WCAG_USAGE_GUIDE.md)
- ✅ [Feature Status Matrix](FEATURE_STATUS_MATRIX.md)
- ⏸️ API documentation (JSDoc comments needed)

**Recommendation:** Core crawling and export functionality is production-ready. WCAG data collection validated on real sites. Needs additional testing coverage (unit tests, edge cases) and documentation before full production release.

---

## 🎯 Features

### Core Functionality
- **🤖 Headless Crawling** - Playwright browser automation with Chromium
- **📦 Atlas v1.0 Format** - Structured JSONL parts compressed with Zstandard
  - Datasets written: pages, edges, assets, errors, responses, events, dom_snapshots, console, styles
  - Optional: accessibility dataset (only in full mode)
- **🎨 Three Render Modes** - Raw (static HTML), Prerender (SEO), Full (WCAG audit)
- **🌊 Configurable Depth** - Default depth=1 (safe), set to -1 for unlimited site mapping
- **🛡️ Challenge Detection** - Automatic Cloudflare/Akamai challenge handling
- **📝 Smart Filenames** - Auto-generated: `domain_YYYYMMDD_HHMMSS_mode.atls`
- **✅ Completion Tracking** - Flags: `finished`, `capped`, `error_budget`, `manual`

### Advanced Features
- **🔄 Resume/Checkpoint** - Fault-tolerant crawling with automatic state recovery
- **🚦 Rate Limiting** - Per-host and global RPS controls
- **💾 Memory Management** - Automatic backpressure and context recycling
- **📊 Enhanced CSV Export** - 11 report types including SEO analysis (redirects, canonicals, social tags)
  - Pages CSV now includes response metadata columns at the end: response_headers.server, response_headers.cache_control, response_headers.content_encoding, cdn_indicators.detected, cdn_indicators.provider, cdn_indicators.confidence, compression_details.algorithm, compression_details.compressed_size
- **🔍 Structured Logging** - NDJSON event stream for monitoring
- **✅ Archive Validation** - Automatic post-creation QA checks for data integrity
- **🧪 Comprehensive Testing** - 295+ test cases across 38 test suites ([see test artifacts](https://github.com/scottfultz/cartographer/actions))

---

## � 10-Minute Quickstart

Want to see Cartographer in action? Run the built-in demo that crawls a test site and validates the output:

```bash
pnpm demo:quickstart
```

**What it does:**
- Starts a local test server serving a small static site
- Crawls 3-4 pages with `prerender` mode
- Validates the generated `.atls` archive
- Reports page counts, edges, and assets

**Expected Output:**
```
📈 Archive Statistics:
   Pages:  4 (expected: 3-4)
   Edges:  9 (expected: 4-10)
   Assets: 4 (expected: 3-8)
   Errors: 0

✅ All validations passed!
🎉 Demo completed successfully!
```

**Next Steps:** Check out `demo-quickstart.atls` in `packages/cartographer/`. See the full CLI documentation below to crawl real sites.

---

## �📦 Monorepo Structure

Cartographer is organized as a pnpm + Turbo monorepo with shared workspace packages:

```
cartographer/
├── packages/
│   ├── cartographer/         # Main crawler engine
│   │   ├── src/              # TypeScript source code
│   │   ├── test/             # Vitest test suites (570 tests)
│   │   └── dist/             # Compiled JavaScript
│   ├── atlas-spec/           # @atlas/spec - Type definitions
│   │   └── src/types.ts      # Shared Atlas v1.0 types
│   ├── atlas-sdk/            # @atlas/sdk - Reading .atls files
│   │   ├── src/              # SDK implementation
│   │   └── examples/         # Usage examples
│   ├── url-tools/            # @cf/url-tools - URL utilities
│   │   └── src/              # Shared URL/domain logic
│   ├── design-system/        # UI components (future)
│   ├── devkit/              # Development utilities
│   └── waypoint/            # Additional tooling
├── scripts/                  # Build and utility scripts
├── turbo.json               # Turbo task pipeline configuration
└── pnpm-workspace.yaml      # Workspace configuration
```

### Workspace Packages

| Package | Description | Used By |
|---------|-------------|---------|
| **@cf/cartographer** | Main crawler engine with CLI | Production crawls |
| **@atlas/spec** | TypeScript types for Atlas v1.0 format | Engine, SDK, tests |
| **@atlas/sdk** | Read and query .atls archives | Tests, external tools |
| **@cf/url-tools** | URL parsing, normalization, validation | Engine |
| **@cf/devkit** | Development utilities and tooling | Build scripts |
| **@cf/design-system** | UI components (future integration) | Future UI |
| **@cf/waypoint** | Additional tooling and utilities | Various |

### Package Manager

This project uses **pnpm 9.0.0** for workspace management. All dependencies are shared across packages, with automatic linking for internal packages.

```bash
# Install all workspace dependencies
pnpm install

# Build all packages (uses Turbo)
pnpm build

# Run tests across all packages (uses Vitest)
pnpm test

# Run tests for specific package
pnpm test --filter=@cf/cartographer

# Lint all packages
pnpm lint

# Development mode with watch (specific package)
cd packages/cartographer
pnpm dev -- crawl --seeds https://example.com
```

**Build System:**
- **Turbo 2.0.0** - Caches builds and optimizes task scheduling
- **TypeScript 5.6.3** - Compiles all workspace packages
- **Vitest 2.1.9** - Fast unit testing with native ESM support

---

## � Responsible Crawling

Cartographer Engine is designed with ethical crawling practices at its core:

### Respect for robots.txt
- **Default Behavior:** `--respectRobots=true` (respects all robots.txt directives)
- **Logged Decisions:** All robots.txt checks are logged to NDJSON for compliance auditing
- **Override Option:** `--overrideRobots` available for authorized testing only

### Rate Limiting
- **Per-Host RPS Control:** `--perHostRps` limits requests per domain (default: 1 request/second)
- **Global RPS Cap:** `--globalRps` prevents overwhelming infrastructure
- **Adaptive Throttling:** Automatic backpressure when servers respond slowly

### Terms of Service & Legal Compliance
- **No Circumvention:** Built-in challenge detection is for legitimate access, not bypassing protections
- **Private Networks:** Blocks crawling of private IP ranges by default
- **User-Agent:** Always identifies as Cartographer Engine with contact information
- **Respect for Do-Not-Crawl:** Honor explicit do-not-crawl headers and meta tags

### Ethical Guidelines
1. Only crawl sites you have permission to access
2. Respect rate limits and backoff signals (429, 503 responses)
3. Do not use for competitive intelligence gathering without consent
4. Archive data responsibly and comply with data protection regulations
5. Provide a way for site owners to contact you (via User-Agent or robots.txt comment)

For detailed policies and compliance documentation, see [SECURITY.md](SECURITY.md) and [docs/ETHICS.md](docs/ETHICS.md).

---

## �🧪 Testing & Quality Assurance

### Test Coverage

- **570 Test Cases** across 41 test suites (using Vitest)
- **98.9% Pass Rate** - 564/570 tests passing
- **Node.js 20 & 22** - Full CI matrix on both LTS versions
- **Automated CI** - GitHub Actions with artifact preservation
- **Test Artifacts** - All test runs preserved for 7 days with downloadable results

**Test Status:** 5 remaining failures are integration/smoke tests (error budget timing, rate limit validation, NDJSON event count, accessibility full-mode requirements, atlas-sdk archive finalization). See [REMAINING_TEST_FAILURES.md](REMAINING_TEST_FAILURES.md) for details.

**View Live Results:** [GitHub Actions CI Runs](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml)

### Test Categories

| Category | Tests | Coverage |
|----------|-------|----------|
| **Extractors** | 68+ | Links, assets, SEO, accessibility, WCAG, runtime a11y |
| **Integration** | 25+ | End-to-end crawl workflows |
| **Atlas Format** | 30+ | Archive creation, validation, compression |
| **CLI Commands** | 20+ | Crawl, export, validate, stress testing |
| **Edge Cases** | 40+ | Checkpoints, rate limiting, error budgets |
| **Performance** | 15+ | Network metrics, Lighthouse, benchmarks |
| **Data Quality** | 30+ | Schema validation, integrity checks |
| **Wappalyzer** | 9 | Technology detection |
| **Enhanced SEO** | 15 | Metadata, indexability, hreflang |
| **Enhanced Links** | 5 | Sponsored/UGC attributes |
| **Logging** | 29 | NDJSON structured logging, state management |

### Running Tests

```bash
# Run all tests across all packages (from root)
pnpm test

# Run tests for specific package
pnpm test --filter=@cf/cartographer

# Run specific test file
pnpm test --filter=@cf/cartographer -- test/extractors/wcagData.test.ts

# Run tests in watch mode
pnpm test --filter=@cf/cartographer -- --watch

# Generate coverage report
pnpm test --filter=@cf/cartographer -- --coverage

# Run tests with UI (Vitest UI)
pnpm test --filter=@cf/cartographer -- --ui

# Run performance benchmark
node scripts/benchmark.js --pages=100
```

### CI/CD Pipeline

Our CI pipeline runs on every push and pull request:

1. **Build & Test Matrix** - Node.js 20 and 22
2. **Workspace Setup** - pnpm install with frozen lockfile
3. **Turbo Build** - All packages built with caching
4. **Unit Tests** - 570 tests with Vitest
5. **Integration Tests** - Real crawl validation
6. **Performance Benchmark** - Automated benchmarking with artifacts
7. **Archive Validation** - Schema and integrity checks
8. **Artifact Preservation** - Test results and benchmarks stored for 7 days

**Build System:**
- **Turbo** - Incremental builds with intelligent caching
- **pnpm workspaces** - Efficient dependency management
- **Parallel execution** - Tests run concurrently across packages

**CI Status:** [![CI](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml/badge.svg)](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml)

---

## ⚡ Performance Benchmarks

### Reproducible Benchmarking

```bash
# Run standard benchmark (100 pages, prerender mode)
node scripts/benchmark.js --pages=100 --mode=prerender

# Custom benchmark
node scripts/benchmark.js --pages=500 --seeds=https://example.com --mode=full
```

### Reference Performance (M1 Max, 10 cores, 64GB RAM)

| Pages | Mode | Duration | Pages/sec | System |
|-------|------|----------|-----------|--------|
| 100 | Raw | ~8s | 12.5 | M1 Max |
| 100 | Prerender | ~35s | 2.8 | M1 Max |
| 100 | Full | ~90s | 1.1 | M1 Max |
| 5,000 | Prerender | ~45min | 1.8 | M1 Max |

**Benchmark Artifacts:** All benchmark runs generate JSON reports with:
- System information (CPU, memory, Node.js version)
- Crawl configuration (seeds, mode, limits)
- Performance metrics (duration, pages/sec, throughput)
- Log event counts and file sizes
- Reproducible command for re-running

**View CI Benchmarks:** [Latest Benchmark Artifacts](https://github.com/scottfultz/cartographer/actions)

### Optimization Tips

- **Raw mode** is fastest (no browser rendering)
- **Prerender mode** balances speed and SEO data quality
- **Full mode** includes WCAG audits (slowest but most comprehensive)
- Increase `--concurrency` for more parallelism (default: 8)
- Adjust `--rps` based on target site's rate limits (default: 3)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 20.0.0 or higher
- **pnpm**: 9.0.0 or higher (for workspace management)

```bash
# Install pnpm globally if needed
npm install -g pnpm
```

### Installation

```bash
# Clone repository
git clone https://github.com/scottfultz/cartographer.git
cd cartographer

# Install all workspace dependencies
pnpm install

# Build all packages (uses Turbo)
pnpm build
```

### Upgrading from Pre-1.0 Versions

If you're upgrading from a version before 1.0.0-rc.1, see the **[Migration Guide](docs/MIGRATION.md)** for:
- Breaking changes: `--errorBudget` → `--maxErrors`, `maxDepth: 3` → `maxDepth: 1`
- Atlas format updates: New `formatVersion` field in manifests
- CLI script migration examples

### Basic Crawl

```bash
# From the repository root
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode prerender \
  --maxPages 100

# Output: ./export/example.com_20251224_153045_prerender.atls

# Or use the convenience alias (after build)
cd packages/cartographer
node dist/cli/index.js crawl --seeds https://example.com --maxPages 100
```

### Custom Configuration

```bash
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out my-crawl.atls \
  --mode full \
  --maxPages 1000 \
  --maxDepth 5 \
  --rps 3 \
  --concurrency 8 \
  --respectRobots
```

---

## 📖 CLI Reference

### Crawl Command

```bash
node packages/cartographer/dist/cli/index.js crawl [options]
```

**Required:**
- `--seeds <urls...>` - Starting URL(s) for crawl

**Optional:**
- `--out <path>` - Output .atls path (default: auto-generated in ./export/)
- `--mode <raw|prerender|full>` - Render mode (default: prerender)
- `--maxPages <N>` - Page limit, 0=unlimited (default: 0)
- `--maxDepth <N>` - Depth limit, -1=unlimited (default: 1)
- `--rps <N>` - Requests per second (default: 3)
- `--concurrency <N>` - Browser tabs (default: 8)
- `--respectRobots` - Honor robots.txt (default: true)
- `--maxErrors <N>` - Max errors before abort, -1=unlimited (default: -1)
- `--allowUrls <patterns...>` - URL patterns to allow (glob or regex, see below)
- `--denyUrls <patterns...>` - URL patterns to deny (glob or regex, see below)
- `--quiet` - Suppress periodic metrics
- `--verbose` - Enable detailed logging (overrides --quiet)
- `--minimal` - Ultra-compact output (no decorations or colors)
- `--noColor` - Disable ANSI colors (useful for CI/CD)
- `--chime` - Audio notification on completion
- `--json` - Emit JSON summary to stdout
- `--logFile <path>` - NDJSON log file (default: logs/crawl-<crawlId>.jsonl)
- `--logLevel <info|warn|error|debug>` - Minimum log level (default: info)
- `--validateArchive` - Run post-creation QA check (default: true)
- `--noScreenshots` - Disable screenshot capture in full mode (screenshots enabled by default)
- `--screenshotQuality <1-100>` - JPEG quality for screenshots (default: 80)
- `--screenshotFormat <jpeg|png>` - Screenshot format (default: jpeg)
- `--noFavicons` - Disable favicon collection in full mode (favicons enabled by default)

**URL Filtering:**
URL allow/deny lists support both glob patterns and regular expressions:

- **Glob patterns** (default): Standard glob syntax with wildcards
  - `https://example.com/**` - Match all URLs under example.com
  - `**/*.pdf` - Match all PDF files
  - `**/admin/**` - Match all URLs containing `/admin/`
  
- **Regex patterns**: Wrap in slashes `/pattern/flags`
  - `/\.pdf$/` - Match URLs ending in .pdf
  - `/admin/i` - Case-insensitive match for "admin"
  - `/\/(login|logout)$/` - Match specific endpoints

**Filtering Logic:**
1. Deny list checked first - if matched, URL is blocked
2. If allow list exists and URL doesn't match, it's blocked
3. Otherwise, URL is allowed

Examples:
```bash
# Only crawl blog section
--allowUrls 'https://example.com/blog/**'

# Exclude admin and auth pages
--denyUrls '**/admin/**' '**/login' '**/logout'

# Exclude all PDFs and ZIPs
--denyUrls '**/*.pdf' '**/*.zip'

# Allow only blog, deny PDFs
--allowUrls 'https://example.com/blog/**' --denyUrls '**/*.pdf'

# Regex: exclude image extensions (case-insensitive)
--denyUrls '/\.(jpg|png|gif)$/i'
```

**Render Modes:**
- `raw` - Static HTML only (no JavaScript execution)
- `prerender` - Execute JavaScript, wait for network idle (SEO-focused)
- `full` - Full WCAG accessibility audit + console logs + **screenshots + favicons** (captured by default)

### Export Command

```bash
node packages/cartographer/dist/cli/index.js export --atls <file.atls> --report <type> --out <file.csv>
```

**Standard Dataset Reports:**
- `pages` - All crawled pages with metadata
- `edges` - Internal links between pages
- `assets` - Media assets (images, videos, etc.)
- `errors` - All errors encountered
- `accessibility` - WCAG violations, missing alt text, form controls

**Enhanced Analysis Reports (⚠️ Temporary - Beta Only):**
> **Note:** These analysis reports are temporary for development validation and will be **removed before Release Candidate**. All SEO analysis will be integrated into **Continuum** (the GUI application) with better visualization and interactivity. See [ANALYSIS_MIGRATION_PLAN.md](docs/ANALYSIS_MIGRATION_PLAN.md) for details.

- `redirects` - Redirect chains, 301/302 analysis, chain length
- `noindex` - Pages with noindex directives (meta/header/both)
- `canonicals` - Canonical tag validation, missing/broken canonicals
- `sitemap` - Sitemap hygiene, indexable pages not in sitemap
- `social` - OpenGraph/Twitter Card validation, missing tags
- `images` - Missing alt text aggregated by page

**Examples:**

```bash
# Export all pages
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report pages \
  --out pages.csv

# Find all redirects
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report redirects \
  --out redirects.csv

# Validate social tags
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report social \
  --out social-issues.csv

# Canonical tag analysis
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report canonicals \
  --out canonical-issues.csv
```

---

## 🎨 Usage Examples

### Complete Site Mapping (Unlimited Depth)

```bash
# Crawl entire site with no depth limit
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --maxPages 5000 \
  --maxDepth -1
```

### Seeds Only (Depth=0)

```bash
# Crawl only seed URLs, no following links
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com https://example.com/about \
  --maxDepth 0
```

### Shallow Crawl (Depth=2)

```bash
# Crawl seeds + 2 levels of links
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --maxDepth 2 \
  --maxPages 100
```

### Challenge Page Handling

```bash
# Automatically detect and wait for Cloudflare challenges
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://protected-site.com \
  --mode prerender
  
# Challenge detection:
# - Waits up to 15s for automatic resolution
# - Logs CHALLENGE_DETECTED error if timeout
# - Does not create poisoned PageRecords
```

---

## �️ Safety & Ethics

Cartographer Engine is designed with **responsible crawling** as a core principle. All safety features are enabled by default to ensure respectful interaction with web servers.

### Default Safety Behavior

**✅ Robots.txt Respect (Default: Enabled)**

```bash
# Default behavior - respects robots.txt
node dist/cli/index.js crawl --seeds https://example.com --respectRobots

# Respect is ON by default, equivalent to:
node dist/cli/index.js crawl --seeds https://example.com --respectRobots=true
```

**What happens when `--respectRobots` is enabled (default):**
1. **Automatic robots.txt Fetching** - Downloads `/robots.txt` for each origin
2. **Rule Enforcement** - Blocks URLs disallowed by robots.txt rules
3. **User-Agent Matching** - Respects rules for your specific User-Agent
4. **Cache & Revalidation** - Caches robots.txt (24h TTL) with ETag/Last-Modified headers
5. **Crawl-Delay** - **Not yet implemented** (planned for future release)
6. **Logging** - Logs blocked URLs: `[Robots] Blocked by robots.txt: <url> (rule: <pattern>)`

**⚠️ Override (Use with Caution):**

```bash
# ONLY use on sites you own or administer
node dist/cli/index.js crawl --seeds https://your-own-site.com --overrideRobots
```

When `--overrideRobots` is used:
- ⚠️ **Warning logged**: "Robots override used. Only crawl sites you administer."
- ⚠️ **Manifest annotation**: Archive includes override notice
- ⚠️ **Owner attribution**: "Owner: Cai Frazier" added to manifest

**Robots.txt Implementation:**
- **File**: `src/core/robotsCache.ts`
- **Caching**: In-memory with 24h TTL
- **LRU Eviction**: Max 1000 origins
- **Revalidation**: Uses ETag/Last-Modified headers
- **Spec Compliance**: RFC 9309 (robots.txt)

---

### Rate Limiting & Backpressure

**Per-Host Rate Limiting:**

```bash
# Default: 3 requests per second
node dist/cli/index.js crawl --seeds https://example.com --rps 3

# Conservative (slow sites or high latency):
node dist/cli/index.js crawl --seeds https://example.com --rps 1

# Aggressive (local testing or with permission):
node dist/cli/index.js crawl --seeds https://example.com --rps 10
```

**Rate Limiting Strategy:**
- **Global RPS Limit** - Enforced across all hosts with `p-limit` concurrency control
- **Per-Host Budgeting** - Implicit via global limiter (future: explicit per-host queues)
- **Exponential Backoff** - Automatic retry with backoff for transient failures
- **Memory Backpressure** - Context recycling every 50 pages to prevent memory leaks

**Implementation:**
- **File**: `src/core/fetcher.ts`
- **Library**: `p-limit` for rate limiting
- **Retry Logic**: Exponential backoff (1s → 2s → 5s max)
- **Max Retries**: 2 attempts per request

---

### Retry Logic & Error Handling

**Automatic Retry with Exponential Backoff:**

Cartographer automatically retries transient failures:

| Condition | Retry? | Backoff | Max Attempts |
|-----------|--------|---------|--------------|
| `ECONNRESET` (connection reset) | ✅ Yes | 1s → 2s → 5s | 3 |
| `ETIMEDOUT` (timeout) | ✅ Yes | 1s → 2s → 5s | 3 |
| `5xx` server errors | ✅ Yes | 1s → 2s → 5s | 3 |
| `429 Too Many Requests` | ✅ Yes | 1s → 2s → 5s | 3 |
| `503 Service Unavailable` | ✅ Yes | 1s → 2s → 5s | 3 |
| `4xx` client errors (except 429) | ❌ No | - | 1 |
| `2xx` success | ❌ No | - | 1 |

**HTTP 429 Handling:**

```typescript
// Automatic 429 detection and retry in renderer.ts
if (statusCode === 429 || statusCode === 503) {
  log("warn", `Rate limited (${statusCode}) for ${url}, will retry`);
  // Exponential backoff applied automatically
}
```

**Max Errors:**

```bash
# Abort crawl after 100 errors
node dist/cli/index.js crawl --seeds https://example.com --maxErrors 100

# Unlimited errors (default)
node dist/cli/index.js crawl --seeds https://example.com --maxErrors -1

# Abort immediately on first error
node dist/cli/index.js crawl --seeds https://example.com --maxErrors 0
```

**Max Errors Behavior:**
- **Threshold Enforcement** - Crawl aborts when error count exceeds limit
- **Exit Code 2** - Indicates max errors exceeded
- **Error Types Counted** - `FETCH_FAILED`, `RENDER_FAILED`, `CHALLENGE_DETECTED`, `ROBOTS_BLOCKED`
- **Manifest Annotation** - `finishReason: "error_budget"` in summary.json
- **Semantics** - `-1` = unlimited, `0` = abort immediately, `N` = abort after N errors

---

### User-Agent & Attribution

**Default User-Agent:**

```
CartographerBot/1.0 (+contact:continuum)
```

**Custom User-Agent:**

```bash
# Recommended: Include contact information
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --userAgent "MyBot/1.0 (+https://mysite.com/bot-info)"

# Include email contact for abuse reports
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --userAgent "MyBot/1.0 (+mailto:bot@example.com)"
```

**User-Agent Best Practices:**
1. **Always include contact info** - Website operators need a way to reach you
2. **Use descriptive names** - Avoid generic names like "Bot" or "Crawler"
3. **Version your bot** - Include version numbers for tracking changes
4. **Document your bot** - Create a `/bot-info` page with crawl details
5. **Honor opt-outs** - Respect robots.txt and HTTP headers

---

### Concurrency & Resource Limits

**Concurrency Control:**

```bash
# Default: 8 parallel browser tabs
node dist/cli/index.js crawl --seeds https://example.com --concurrency 8

# Conservative (single-threaded):
node dist/cli/index.js crawl --seeds https://example.com --concurrency 1

# Aggressive (high-end hardware):
node dist/cli/index.js crawl --seeds https://example.com --concurrency 16
```

**Resource Limits:**

```bash
# Maximum bytes per page (default: 50MB)
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --maxBytesPerPage 50000000

# Page timeout (default: 30s)
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --timeout 30000
```

**Memory Management:**
- **Context Recycling** - Browser contexts recycled every 50 pages
- **Explicit Cleanup** - Page resources closed after each render
- **Backpressure** - Automatic throttling when memory usage is high
- **Checkpoint Recovery** - Resume from last checkpoint after OOM crashes

---

### Per-Host Crawl Budget

**Future Enhancement (Not Yet Implemented):**

Planned features for responsible per-host crawling:

```bash
# Future: Per-host page limits
--maxPagesPerHost 100

# Future: Per-host rate limits
--rpsPerHost 3

# Future: Crawl-delay enforcement from robots.txt
--enforceCrawlDelay
```

**Current Workaround:**

Use `--seeds` to target specific sections and `--maxDepth` to limit scope:

```bash
# Limit scope to /blog section
node dist/cli/index.js crawl \
  --seeds https://example.com/blog \
  --maxDepth 2 \
  --maxPages 100
```

---

### Responsible Crawling Checklist

Before running a large crawl, verify:

- ✅ **Robots.txt respect enabled** - `--respectRobots=true` (default)
- ✅ **Conservative RPS** - `--rps 3` or lower for external sites
- ✅ **Custom User-Agent with contact** - `--userAgent "MyBot/1.0 (+mailto:bot@example.com)"`
- ✅ **Reasonable concurrency** - `--concurrency 8` or lower
- ✅ **Max errors set** - `--maxErrors 100` to abort on repeated failures
- ✅ **Page limits defined** - `--maxPages` and `--maxDepth` to prevent runaway crawls
- ✅ **Timeout configured** - `--timeout 30000` to avoid hanging on slow pages
- ✅ **Log monitoring** - Review `--logFile` for blocked URLs and errors

**For Large-Scale Crawls (1000+ pages):**

```bash
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --maxPages 5000 \
  --maxDepth 5 \
  --rps 2 \
  --concurrency 4 \
  --respectRobots \
  --userAgent "CartographerBot/1.0 (+mailto:crawler@yourcompany.com)" \
  --maxErrors 200 \
  --timeout 30000 \
  --logFile ./logs/large-crawl.jsonl
```

**Monitoring Recommendations:**
1. **Monitor log events** - Watch for `ROBOTS_BLOCKED`, `FETCH_FAILED`, `RATE_LIMITED`
2. **Track error budget** - Abort if error rate exceeds 5%
3. **Respect 429 responses** - Reduce `--rps` if rate limited
4. **Check server load** - Monitor target site's response times
5. **Use checkpoints** - Enable `--checkpointInterval 500` for resumability

---

## �🔧 CI/CD Recipes

### Quiet Mode + JSON Output

Perfect for automation and CI pipelines. Outputs a single JSON object to stdout with all logs to stderr:

```bash
# Run crawl in quiet mode and capture JSON summary
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out ./out/site.atls \
  --mode prerender \
  --quiet \
  --json > summary.json

# Parse the summary in your script
PAGES=$(cat summary.json | jq '.summary.pages')
echo "Crawled $PAGES pages"
```

**Exit codes:**
- `0` - Success
- `2` - Error budget exceeded
- `3` - Browser/render fatal error
- `4` - Write/IO fatal error
- `5` - Validation failed
- `10` - Unknown error

### Max Errors Enforcement

Stop the crawl gracefully after a maximum number of errors:

```bash
# Abort if more than 25 errors occur
node dist/cli/index.js crawl \
  --seeds https://bad.example \
  --out ./out/site.atls \
  --maxErrors 25 \
  || echo "Crawl failed after hitting max errors"

# Check exit code
if [ $? -eq 2 ]; then
  echo "Max errors exceeded"
  exit 1
fi
```

The crawl will:
1. Count all ErrorRecords written
2. Stop when `errorCount > maxErrors`
3. Finalize partial .atls archive
4. Add note to summary: "Terminated: max errors exceeded"
5. Exit with code `2`
4. Add note to summary: "Terminated: error budget exceeded"
5. Exit with code `2`

### Structured Logging

Write NDJSON (newline-delimited JSON) logs for machine parsing:

```bash
# Write structured logs to custom path
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out ./out/site.atls \
  --logFile ./logs/run.jsonl \
  --logLevel info

# Parse logs with jq
cat ./logs/run.jsonl | jq 'select(.event == "crawl.error")'
```

**Log events:**
- `crawl.started` - Crawl initialization
- `crawl.heartbeat` - Progress update (every 1 second)
- `crawl.observability` - Detailed metrics for monitoring (every 5 seconds: queue depth, in-flight count, per-host queues, throttled hosts, RPS, memory RSS)
- `crawl.pageProcessed` - Each page completed
- `crawl.checkpoint` - Checkpoint saved
- `crawl.error` - Error occurred
- `crawl.backpressure` - Memory pressure pause/resume
- `robots_decision` - robots.txt compliance decisions
- `crawl.finished` - Crawl complete

**Observability metrics** (emitted every 5 seconds):
- `queueDepth` - Total URLs queued across all hosts
- `inFlightCount` - Pages currently being processed
- `completedCount` - Pages successfully crawled
- `errorCount` - Errors encountered
- `perHostQueues` - Queue size per host (for diagnosing bottlenecks)
- `throttledHosts` - Hosts with queued items (rate-limited)
- `currentRps` - Current pages per second
- `memoryRssMB` - Resident set size in MB

**Log path placeholder:**

Use `<crawlId>` in the log file path to automatically substitute the crawl UUID:

```bash
--logFile ./logs/crawl-<crawlId>.jsonl
# Creates: ./logs/crawl-a1b2c3d4e5f6g7h8.jsonl
```

### Example CI Workflow

```bash
#!/bin/bash
set -e

# Run crawl with all production flags
node dist/cli/index.js crawl \
  --seeds https://production.example.com \
  --out ./artifacts/site.atls \
  --mode prerender \
  --maxPages 10000 \
  --maxErrors 50 \
  --quiet \
  --json \
  --logFile ./logs/crawl-<crawlId>.jsonl \
  > ./artifacts/summary.json

EXIT_CODE=$?

# Upload artifacts
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ Crawl succeeded"
  aws s3 cp ./artifacts/site.atls s3://my-bucket/
elif [ $EXIT_CODE -eq 2 ]; then
  echo "⚠ Crawl stopped: error budget exceeded"
  aws s3 cp ./artifacts/site.atls s3://my-bucket/partial/
else
  echo "✗ Crawl failed with code $EXIT_CODE"
  exit $EXIT_CODE
fi

# Parse and report
PAGES=$(cat ./artifacts/summary.json | jq '.summary.pages')
ERRORS=$(cat ./artifacts/summary.json | jq '.summary.errors')
echo "Crawled $PAGES pages with $ERRORS errors"
```

---

## 🧪 Testing

### Comprehensive Test Suite

Cartographer includes **176 unit tests** and separate integration tests:

```bash
# Run fast unit tests only (default, ~0.6s)
npm test

# Run unit tests explicitly
npm run test:unit

# Run slow integration tests (~60s)
npm run test:integration

# Run everything (unit + integration)
npm run test:all
```

**Unit Tests (176 tests, ~600ms):**
- ✅ **maxDepth Configuration** (9 tests) - Default values, validation, boundary conditions
- ✅ **Challenge Detection** (19 tests) - Cloudflare/Akamai patterns, false positives
- ✅ **Filename Generation** (27 tests) - Auto-naming, special characters, modes
- ✅ **Completion Reasons** (18 tests) - All completion flags and priority rules
- ✅ **Depth Limiting** (25 tests) - BFS enforcement, unlimited/-1, boundaries
- ✅ **Config Validation** (32 tests) - Required fields, type coercion, defaults
- ✅ **URL Processing** (22 tests) - Normalization, tracking params, param policies
- ✅ **Extractors** (8 tests) - Link extraction, assets, metadata, text samples
- ✅ **Checkpoints** (5 tests) - Checkpoint round-trip, edge cases
- ✅ **Accessibility** (5 tests) - Alt text, headings, landmarks, ARIA roles
- ✅ **Atlas Validation** (2 tests) - Duplicate detection, corruption handling
- ✅ **Token Buckets** (4 tests) - Rate limiting primitives

**Integration Tests (separate suite):**
- 🔄 **Error Budget CLI** - End-to-end error budget enforcement
- 🔄 **CLI Polish** - JSON output, quiet mode, exit codes
- 🔄 **NDJSON Logging** - Structured log validation
- 🔄 **Rate Limiting** - Real crawl with per-host RPS enforcement
- 🔄 **CSV Exports** - Pages, edges, errors export validation
- 🔄 **Atlas SDK** - Reading .atls archives with SDK

See [`docs/TEST_SUITE_DOCUMENTATION.md`](docs/TEST_SUITE_DOCUMENTATION.md) for detailed test documentation.

### CI/CD Testing

The GitHub Actions workflow runs tests on **Node.js 20 & 22** with full matrix testing:

```yaml
# Runs on push/PR to main and develop branches
- Build + Compile TypeScript
- Run unit tests (fast, ~0.6s)
- Run integration tests (slow, ~60s)
- Archive validation (manifest integrity)
- Upload test results as artifacts
```

---

## 🏗️ Architecture

### Atlas v1.0 Archive Structure

```
example.atls (Zip Archive)
├── manifest.json          # Metadata, crawl config, attribution
├── summary.json           # Crawl statistics, completion reason
├── pages/                 # PageRecords (JSONL + Zstd)
│   └── 000.jsonl.zst
├── edges/                 # EdgeRecords (JSONL + Zstd)
│   └── 000.jsonl.zst
├── assets/                # AssetRecords (JSONL + Zstd)
│   └── 000.jsonl.zst
├── errors/                # ErrorRecords (JSONL + Zstd)
│   └── 000.jsonl.zst
└── accessibility/         # AccessibilityRecords (JSONL + Zstd, full mode only)
    └── 000.jsonl.zst
```

**Full specification:** See [`packages/atlas-spec/SPECIFICATION.md`](packages/atlas-spec/SPECIFICATION.md) for complete format documentation including schemas, compression details, integrity hashing, and examples.

### Core Components

- **`src/cli/`** - CLI entrypoints (`crawl`, `export`, `stress`, `validate`)
- **`src/core/`** - Crawling engine, rendering, extraction logic
  - `scheduler.ts` - BFS queue with depth tracking
  - `renderer.ts` - Playwright browser automation
  - `extractors.ts` - DOM parsing, link extraction
- **`src/io/atlas/`** - Atlas archive writer, manifest builder
- **`src/io/export/`** - CSV export from `.atls` archives
- **`src/io/readers/`** - Read/iterate `.atls` parts (`atlsReader.ts`)
- **`packages/atlas-sdk/`** - SDK for reading `.atls` files

### Crawl Flow

1. **Initialization** - Load config, create output directory, initialize browser pool
2. **Seed Enqueue** - Add seed URLs to BFS queue at depth=0
3. **BFS Crawl Loop**:
   - Dequeue URL from queue
   - Check depth limit (skip if maxDepth exceeded)
   - Render page with selected mode (raw/prerender/full)
   - Detect challenges (Cloudflare, etc.) and wait for resolution
   - Extract data: links, assets, metadata, accessibility
   - Enqueue discovered links at depth+1
   - Write records to archive parts
4. **Completion** - Check completion conditions:
   - `finished` - All pages crawled
   - `capped` - Hit maxPages limit
   - `error_budget` - Exceeded error budget
   - `manual` - User interrupt (Ctrl+C)
5. **Finalization** - Write manifest.json, summary.json, close archive

---

## 📚 Documentation

**Core Documentation:**
- **[README.md](README.md)** - This file (CLI reference, usage examples, troubleshooting)
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick start guide for new users
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Codebase architecture for contributors
- **[FEATURES.md](FEATURES.md)** - Complete feature list with implementation status
- **[MISSION.md](MISSION.md)** - Project vision, principles, and roadmap

**Technical References:**
- **[Atlas SDK Quick Reference](packages/atlas-sdk/QUICK_REFERENCE.md)** - Reading .atls files programmatically
- **[Copilot Instructions](.github/copilot-instructions.md)** - AI agent development guidelines
- **[KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)** - Current limitations and workarounds

**Historical Documentation:**
- See `docs/` for detailed implementation notes, audits, and feature summaries

---

## 🔍 Troubleshooting

### Common Issues

**Browser fails to launch:**
```bash
# Install Playwright browsers
npx playwright install chromium
```

**Out of memory errors:**
```bash
# Reduce concurrency and increase backpressure threshold
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --concurrency 4
```

**Challenge pages block crawl:**
- Ensure `--mode prerender` is set (enables JavaScript execution)
- Check logs for `CHALLENGE_DETECTED` errors
- Increase timeout in `src/core/renderer.ts` if needed

**Archive validation fails:**
```bash
# Run validation command
node packages/cartographer/dist/cli/index.js validate --atls example.atls

# Check manifest integrity
unzip -l example.atls | grep manifest.json
```

---

## 📊 Performance

### Benchmarks

**Hardware:** Apple M1 Max, 64GB RAM  
**Target:** https://example.com (5000 pages)  
**Mode:** prerender  
**Concurrency:** 8 tabs

| Metric | Value |
|--------|-------|
| Pages/sec | ~15 |
| Total time | 5m 33s |
| Memory peak | 2.1 GB |
| Archive size | 145 MB |
| Compression ratio | 8.3x |

### Optimization Tips

1. **Use `raw` mode** for static sites (no JavaScript execution needed)
2. **Increase `--concurrency`** if CPU is underutilized
3. **Reduce `--rps`** if hitting rate limits
4. **Set `--maxDepth`** to avoid deep rabbit holes
5. **Enable `--respectRobots`** to honor crawl-delay directives

---

## 🤝 Contributing

This is a proprietary project. Internal contributions only.

**Development Workflow:**
1. Create feature branch from `develop`
2. Implement changes with tests
3. Run `npm test` and `npm run lint`
4. Open PR to `develop` branch
5. CI/CD runs all test suites on Node 20 & 22
6. Merge after approval

**Code Standards:**
- TypeScript strict mode
- ES2022 modules
- Comprehensive JSDoc comments
- Test coverage for all new features

---

## 📝 Changelog

### v1.0.0 (2025-01-24)

**Features:**
- ✨ Unlimited depth crawling (default `maxDepth=-1`)
- 🛡️ Challenge detection and smart wait (Cloudflare, Akamai)
- 📝 Smart auto-generated filenames (`domain_YYYYMMDD_HHMMSS_mode.atls`)
- ✅ Completion reason tracking (`finished`, `capped`, `error_budget`, `manual`)
- 🧪 Comprehensive test suite (130+ tests across 6 files)
- 🔄 CI/CD matrix testing (Node 20 & 22)

**Improvements:**
- Enhanced BFS scheduler with depth tracking
- Improved error handling and logging
- Better memory management and backpressure
- Archive validation and integrity checks

**Documentation:**
- Complete README with examples and CLI reference
- Test suite documentation
- Architecture guide
- CI/CD recipes

---

## 📄 License

Copyright © 2025 Cai Frazier.  
All rights reserved. Unauthorized copying, modification, or distribution is prohibited.  
Proprietary and confidential.

---

## 🔗 Related Projects

- **Continuum** - SEO analysis platform consuming Atlas archives
- **Atlas SDK** - TypeScript SDK for reading `.atls` files (`packages/atlas-sdk/`)

---

**Built with ❤️ by Cai Frazier**
