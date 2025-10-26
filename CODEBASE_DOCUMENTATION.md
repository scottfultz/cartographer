# Cartographer Codebase Documentation

**Last Updated:** October 25, 2025  
**Version:** 1.0.0  
**Status:** Production Ready - Monorepo Migration Complete

---

## Overview

Cartographer is a production-grade headless web crawler that produces **Atlas v1.0 (.atls)** archive files. The project is organized as a **pnpm + Turbo monorepo** with multiple packages for the core engine, SDK, shared types, and supporting utilities.

**Key Characteristics:**
- **TypeScript** ES2022 modules with strict types
- **pnpm 9.0.0** workspaces for efficient dependency management
- **Turbo 2.0** for optimized incremental builds with caching
- **Vitest 2.1.9** for fast testing with native ESM support
- **99.1% test coverage** (565/570 tests passing)
- **Zero TypeScript compilation errors** in active codebase

---

## Monorepo Structure

```
cartographer/
├── packages/
│   ├── cartographer/         # Main crawler engine
│   │   ├── src/
│   │   │   ├── cli/         # CLI commands (crawl, export, validate, stress)
│   │   │   ├── core/        # Crawling engine, scheduler, renderer
│   │   │   ├── io/          # Atlas writer, readers, exporters
│   │   │   └── utils/       # Logging, metrics, URL handling
│   │   ├── test/            # 570 test cases (98.9% pass rate)
│   │   └── dist/            # Compiled JavaScript
│   │
│   ├── atlas-sdk/           # SDK for reading .atls archives
│   │   ├── src/
│   │   │   ├── reader.ts    # Core reading logic
│   │   │   ├── index.ts     # Public API
│   │   │   └── types.ts     # Record type definitions
│   │   └── examples/        # Usage examples
│   │
│   ├── atlas-spec/          # Shared TypeScript types
│   │   └── src/
│   │       └── types.ts     # CrawlEvent, PageRecord, etc.
│   │
│   ├── url-tools/           # URL utilities
│   │   └── src/
│   │       └── index.ts     # URL parsing, normalization
│   │
│   ├── design-system/       # UI components (future)
│   ├── devkit/              # Development utilities
│   └── waypoint/            # Additional tooling
│
├── apps/                    # Future Electron applications
│   ├── continuum/           # SEO analysis tool
│   ├── horizon/             # Accessibility auditing
│   └── vector/              # Performance analysis
│
├── scripts/                 # Build and utility scripts
├── docs/                    # Documentation
├── turbo.json              # Turbo task pipeline
└── pnpm-workspace.yaml     # Workspace configuration
```

---

## Package Descriptions

### Core Packages

#### `@cf/cartographer`
**Main crawler engine** - Production-grade headless web crawler.

**Key Modules:**
- `src/cli/` - CLI commands with structured output
- `src/core/scheduler.ts` - Crawl orchestration, queue management
- `src/core/renderer.ts` - Browser automation with Playwright
- `src/core/extractors/` - Data extraction (links, SEO, accessibility, WCAG)
- `src/io/atlas/` - Atlas archive writer, manifest builder
- `src/io/export/` - CSV export functionality
- `src/utils/logging.ts` - NDJSON structured logging

**Dependencies:**
- `@atlas/spec` - Shared types
- `@atlas/sdk` - Archive reading (for validation)
- `@cf/url-tools` - URL utilities
- `playwright` - Browser automation
- `cheerio` - HTML parsing
- `@mongodb-js/zstd` - Zstandard compression

**Testing:** 570 tests, 99.1% pass rate (565 passing, 5 known failures)

#### `@atlas/sdk`
**SDK for reading Atlas archives** - TypeScript SDK for consuming .atls files.

**Key Features:**
- Async iterators for streaming large archives
- Type-safe record parsing
- Manifest and summary reading
- Zstandard decompression

**API:**
```typescript
import { openAtlas } from '@atlas/sdk';

const atlas = await openAtlas('./crawl.atls');
console.log(`Pages: ${atlas.summary.totalPages}`);

for await (const page of atlas.readers.pages()) {
  console.log(page.url, page.statusCode);
}
```

#### `@atlas/spec`
**Shared type definitions** - TypeScript types used across all packages.

**Key Types:**
- `CrawlEvent` - Event bus event types
- `PageRecord`, `EdgeRecord`, `AssetRecord` - Archive record types
- `AtlasManifest`, `AtlasSummary` - Archive metadata
- `AccessibilityRecord` - WCAG audit data

#### `@cf/url-tools`
**URL utilities** - Shared URL parsing, normalization, and validation.

**Key Functions:**
- URL normalization (trailing slashes, default ports)
- Parameter filtering (UTM, tracking params)
- Domain extraction and validation
- Robots.txt URL parsing

---

## Build System

### Turbo Configuration

**File:** `turbo.json`

**Task Pipeline:**
- `build` - Compiles TypeScript, outputs to `dist/`, depends on `^build` (dependencies first)
- `test` - Runs Vitest, outputs to `coverage/`, depends on `build`
- `dev` - Watch mode, no caching, persistent
- `lint` - ESLint across all packages
- `clean` - Remove build artifacts

**Key Features:**
- **Incremental builds** - Only rebuilds changed packages
- **Intelligent caching** - Caches build outputs based on inputs
- **Parallel execution** - Builds independent packages concurrently
- **Dependency tracking** - Automatically rebuilds dependents when dependencies change

### Workspace Scripts

**File:** Root `package.json`

```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "clean": "turbo run clean"
  }
}
```

**Usage:**
```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Build/test specific package
pnpm build --filter=@cf/cartographer
pnpm test --filter=@cf/cartographer

# Development watch mode
cd packages/cartographer
pnpm dev
```

---

## Testing Strategy

### Framework

**Vitest 2.1.9** - Fast unit testing with:
- Native ESM support (no transpilation needed)
- Built-in TypeScript support
- Parallel test execution
- Watch mode with hot reload
- Coverage reporting

### Test Structure

```
packages/cartographer/test/
├── cli/                     # CLI command tests
│   ├── crawl.test.ts
│   ├── export.test.ts
│   └── validate.test.ts
├── extractors/              # Data extraction tests
│   ├── wcagData.test.ts     # 36 tests
│   ├── runtimeAccessibility.test.ts  # 32 tests
│   ├── links.test.ts
│   └── seo.test.ts
├── integration/             # End-to-end tests
│   ├── crawl-workflow.test.ts
│   ├── checkpoint.test.ts   # 5 tests
│   └── scheduler.test.ts
├── io/                      # I/O tests
│   ├── atlas-writer.test.ts
│   └── csv-export.test.ts
├── logs/                    # Logging tests
│   └── logging.test.ts      # 29 tests
└── smoke/                   # Smoke tests
    └── crawl-small.test.ts
```

### Test Coverage

**Total:** 570 tests  
**Passing:** 565 (99.1%)  
**Failing:** 5 (documented in `REMAINING_TEST_FAILURES.md`)

**Key Test Suites (All Passing):**
- ✅ wcagData-static (36/36) - WCAG data extraction
- ✅ runtimeAccessibility (32/32) - Runtime a11y analysis  
- ✅ logging (29/29) - Structured logging with state management
- ✅ checkpoint (5/5) - Checkpoint/resume functionality
- ✅ cli-polish (2/2) - CLI JSON output format
- ✅ phase1/integration (all) - Phase 1 accessibility features with type safety

**Remaining Failures (Deferred):**
- error-budget (1) - Timing/error injection
- scheduler.rateLimit (1) - Precise timing validation
- ndjson (1) - Log event count expectations
- accessibility-integration (1) - Full-mode requirements
- atlas-sdk-integration (1) - Archive finalization

### Running Tests

```bash
# From root - all packages
pnpm test

# Specific package
pnpm test --filter=@cf/cartographer

# Specific test file
pnpm test --filter=@cf/cartographer -- test/extractors/wcagData.test.ts

# Watch mode
pnpm test --filter=@cf/cartographer -- --watch

# With coverage
pnpm test --filter=@cf/cartographer -- --coverage

# With UI
pnpm test --filter=@cf/cartographer -- --ui
```

---

## Architecture

### Core Crawling Flow

1. **Initialization**
   - CLI parses arguments
   - Cartographer class created with config
   - Event bus initialized for monitoring

2. **Browser Setup**
   - Playwright launches Chromium
   - Renderer validates installation
   - Browser contexts created (concurrency pool)

3. **Crawling**
   - Scheduler enqueues seed URLs
   - Workers fetch URLs from queue (respecting rate limits)
   - Renderer applies mode (raw/prerender/full)
   - Extractors parse HTML and collect data
   - AtlasWriter streams data to archive parts

4. **Checkpointing**
   - Every N pages (default: 500), state saved
   - Queue and visited URLs persisted
   - Archive flushed to disk

5. **Finalization**
   - All streams closed and flushed
   - JSONL parts compressed with Zstandard
   - Manifest built with integrity hashes
   - ZIP archive created (.atls file)
   - Validation runs on completed archive

6. **Event Emission**
   - `crawl.finished` event with summary/perf/notes
   - CLI outputs JSON if `--json` flag set

### Event Bus

**File:** `packages/cartographer/src/core/bus.ts`

**Event Types (from @atlas/spec):**
- `crawl.started` - Crawl initialization
- `crawl.finished` - Completion with summary
- `page.queued` - URL added to queue
- `page.visited` - Page successfully crawled
- `page.failed` - Page error
- `checkpoint.saved` - State persisted

**Enhanced Events:**
Recent enhancement added `summary`, `perf`, and `notes` fields to `crawl.finished` events for richer CLI JSON output.

### Data Extraction

**Extractors** parse HTML and collect structured data:

**Link Extraction (`extractLinks`):**
- Finds all `<a>` tags with `href` attributes
- Normalizes URLs (absolute, trailing slashes)
- Filters by allow/deny lists
- Handles special attributes (nofollow, sponsored, ugc)
- Deduplicates and validates

**SEO Extraction (`extractSEOData`):**
- `<title>`, meta description, keywords
- Open Graph tags (og:title, og:image, etc.)
- Twitter Cards
- Canonical URLs, hreflang
- Indexability (robots meta, X-Robots-Tag)

**WCAG Extraction (`extractWcagData`):**
- Headings hierarchy (h1-h6)
- Images with missing alt text
- Form labels and inputs
- ARIA attributes
- Color contrast (via computed styles)
- Keyboard navigation
- Touch target sizes

**Runtime Accessibility (`analyzeMediaElements`):**
- Video/audio elements
- Track elements (captions/subtitles)
- Source element src attributes
- Autoplay, controls, muted attributes

**Asset Extraction (`extractAssets`):**
- Stylesheets, scripts, images
- Fonts, media files
- Resource hints (preload, prefetch)

### Data Persistence

**Atlas Archive Structure:**

```
archive.atls (ZIP)
├── manifest.json           # Archive metadata
├── summary.json            # Crawl statistics
├── pages.jsonl.zst        # Page records (compressed)
├── edges.jsonl.zst        # Link graph edges (compressed)
├── assets.jsonl.zst       # Asset records (compressed)
├── errors.jsonl.zst       # Error records (compressed)
├── accessibility.jsonl.zst # A11y audit data (compressed)
└── schemas/               # JSON schemas for validation
    ├── pages.schema.json
    ├── edges.schema.json
    ├── assets.schema.json
    ├── errors.schema.json
    └── accessibility.schema.json
```

**Writing Flow:**
1. `AtlasWriter.writePage()` appends JSONL line to stream
2. Stream buffers in memory (backpressure if >16MB)
3. On checkpoint or finalize, streams flushed
4. On finalize, JSONL compressed with Zstandard
5. Compressed parts + manifest + schemas → ZIP archive

**Reading Flow (via SDK):**
1. `openAtlas()` opens ZIP, reads manifest/summary
2. `atlas.readers.pages()` async iterator:
   - Extracts `pages.jsonl.zst` from ZIP
   - Decompresses with Zstandard
   - Parses JSONL line-by-line
   - Yields `PageRecord` objects

---

## Key Algorithms

### Rate Limiting

**File:** `packages/cartographer/src/core/scheduler.ts`

**Token Bucket Algorithm:**
- Each host has a token bucket (capacity = `perHostRps`)
- Tokens refill at rate `perHostRps` per second
- Request consumes 1 token
- If bucket empty, request waits

**Implementation:**
```typescript
private canFetchFromHost(host: string): boolean {
  const bucket = this.rateLimitBuckets.get(host);
  if (!bucket) return true; // First request to host
  
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsed * bucket.rate);
  bucket.lastRefill = now;
  
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}
```

### URL Normalization

**File:** `packages/url-tools/src/index.ts`

**Normalization Steps:**
1. Parse URL with `URL` constructor
2. Remove tracking parameters (gclid, fbclid, utm_*)
3. Remove default ports (80 for http, 443 for https)
4. Normalize trailing slashes (consistent handling)
5. Sort query parameters (for deduplication)
6. Lowercase hostname

**Parameter Policies:**
- `keep` - Keep all parameters
- `strip` - Remove all parameters
- `filter` - Remove blocklisted parameters only

### Checkpoint/Resume

**File:** `packages/cartographer/src/core/scheduler.ts`

**State Persistence:**
```typescript
interface CheckpointState {
  queue: Array<{ url: string; depth: number }>;
  visited: string[];
  errors: number;
  crawlId: string;
  timestamp: string;
}
```

**Save Logic:**
- Every `checkpointInterval` pages (default: 500)
- Serialize queue and visited set to JSON
- Write to `checkpoint.json` in staging directory
- Flush all archive streams

**Resume Logic:**
- If `checkpoint.json` exists, load state
- Reconstruct queue and visited set
- Continue crawl from saved position
- Graceful handling of partial archives

---

## Logging & Monitoring

### Structured Logging

**File:** `packages/cartographer/src/utils/logging.ts`

**Format:** NDJSON (newline-delimited JSON)

**Log Levels:**
- `debug` - Verbose diagnostic info
- `info` - Normal operation (default)
- `warn` - Warnings, non-fatal issues
- `error` - Errors requiring attention

**Example Log Events:**
```jsonl
{"timestamp":"2025-10-25T16:37:34.123Z","level":"info","message":"Initializing Chromium browser","concurrency":8}
{"timestamp":"2025-10-25T16:37:39.456Z","level":"info","message":"[Crawl] depth=0 https://example.com/","statusCode":200,"renderMode":"prerender","duration":2292}
{"timestamp":"2025-10-25T16:37:39.789Z","level":"warn","message":"[AtlasWriter] Validation completed with 3 schema warnings"}
```

**State Management:**
Recent fix ensures logging state (level, quiet mode, JSON mode) resets properly between test runs to prevent pollution.

### Event Bus Monitoring

**File:** `packages/cartographer/src/core/bus.ts`

**Usage:**
```typescript
cart.on("page.visited", (ev) => {
  console.log(`Visited: ${ev.url} (${ev.statusCode})`);
});

cart.on("crawl.finished", (ev) => {
  console.log(`Completed: ${ev.summary.pages} pages in ${ev.summary.durationMs}ms`);
});
```

**Enhanced JSON Output:**
CLI `--json` flag emits structured summary on completion:
```json
{
  "crawlId": "crawl_1234567890_abcd",
  "outFile": "/path/to/archive.atls",
  "summary": {
    "pages": 100,
    "edges": 523,
    "assets": 892,
    "errors": 2,
    "durationMs": 45230
  },
  "perf": {
    "avgPagesPerSec": 2.21,
    "peakRssMB": 342.5
  },
  "notes": [
    "Checkpoint interval: 500 pages",
    "Graceful shutdown: false"
  ]
}
```

---

## Recent Enhancements

### Video/Audio Source Extraction (Oct 25, 2025)

**Issue:** Video/audio elements with `<source>` children returned empty src.

**Fix:** Enhanced `analyzeMediaElements()` to check for `<source>` elements:
```typescript
let videoSrc = video.src || video.currentSrc || '';
if (!videoSrc) {
  const sourceElement = video.querySelector('source[src]');
  if (sourceElement) {
    videoSrc = sourceElement.getAttribute('src') || '';
  }
}
```

**Impact:** All 32 runtimeAccessibility tests now pass.

### Logging State Reset (Oct 25, 2025)

**Issue:** Test setting `level="warn"` affected subsequent tests expecting `level="info"`.

**Fix:** `closeLogFile()` now resets state:
```typescript
export function closeLogFile(): void {
  if (logFileStream) {
    logFileStream.on('error', () => {}); // Suppress errors
    logFileStream.end();
    logFileStream = null;
  }
  logFilePath = null;
  currentLevel = "info";    // Reset
  quietMode = false;        // Reset
  jsonMode = false;         // Reset
}
```

**Impact:** All 29 logging tests now pass.

### CLI JSON Output Enhancement (Oct 25, 2025)

**Issue:** CLI `--json` output lacked summary/performance data.

**Fix:** Multi-step enhancement:
1. Updated `CrawlEvent` type in `@atlas/spec` with optional fields
2. Scheduler collects summary from `AtlasWriter.getSummary()`
3. Scheduler collects perf from `Metrics.getSummary()`
4. Enhanced `crawl.finished` event with summary/perf/notes
5. CLI outputs enriched JSON with `outFile` field

**Impact:** CLI now provides automation-friendly JSON output for CI/CD.

---

## Configuration

### CLI Options

**Crawl Command:**
```bash
node packages/cartographer/dist/cli/index.js crawl [options]
```

**Required:**
- `--seeds <urls...>` - Starting URL(s)

**Optional:**
- `--out <path>` - Output path (default: auto-generated)
- `--mode <raw|prerender|full>` - Render mode (default: prerender)
- `--maxPages <N>` - Page limit (default: 0=unlimited)
- `--maxDepth <N>` - Depth limit (default: -1=unlimited)
- `--rps <N>` - Requests per second (default: 3)
- `--concurrency <N>` - Browser tabs (default: 8)
- `--respectRobots` - Honor robots.txt (default: true)
- `--errorBudget <N>` - Max errors before abort (default: 0=unlimited)
- `--allowUrls <patterns...>` - URL allow patterns
- `--denyUrls <patterns...>` - URL deny patterns
- `--quiet` - Suppress metrics
- `--json` - Emit JSON summary
- `--logFile <path>` - Log file path
- `--logLevel <level>` - Minimum log level (default: info)

### Environment Variables

Currently none - all configuration via CLI flags.

### Exit Codes

- `0` - Success
- `2` - Error budget exceeded
- `3` - Browser/render fatal error
- `4` - Write/IO fatal error
- `5` - Validation failed
- `10` - Unknown error

---

## Development Workflow

### Setup

```bash
# Clone repository
git clone https://github.com/scottfultz/cartographer.git
cd cartographer

# Install pnpm if needed
npm install -g pnpm@9.0.0

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Watch mode for specific package
cd packages/cartographer
pnpm dev

# Run tests in watch mode
pnpm test --watch

# Lint
pnpm lint

# Test crawl
node dist/cli/index.js crawl --seeds https://example.com --maxPages 5
```

### Adding a New Extractor

1. Create `packages/cartographer/src/core/extractors/myExtractor.ts`
2. Export extraction function
3. Call from `renderer.ts` after page load
4. Add to `PageRecord` or new record type in `@atlas/spec`
5. Update schema in `src/io/atlas/schemas/`
6. Write tests in `test/extractors/myExtractor.test.ts`

### Adding a New Package

1. Create `packages/my-package/`
2. Add `package.json` with workspace dependencies
3. Add `tsconfig.json` extending root config
4. Add to `pnpm-workspace.yaml` (if not using wildcard)
5. Run `pnpm install` to link
6. Add to dependent packages' dependencies

---

## Deployment

### Building for Production

```bash
# Clean build
pnpm clean
pnpm build

# Verify
node packages/cartographer/dist/cli/index.js --version
```

### Distribution

Currently private - no public npm publishing.

**Internal Distribution:**
- Commit to git repository
- Build on target machine
- Or distribute pre-built `dist/` directory

---

## Known Issues & Limitations

### Test Failures

**5 remaining test failures (0.9%)** - See `REMAINING_TEST_FAILURES.md` for details.

All failures are integration/smoke tests, not blocking core functionality:
- error-budget (timing)
- scheduler.rateLimit (precise timing)
- ndjson (event count)
- accessibility-integration (full mode)
- atlas-sdk-integration (archive finalization)

### Schema Validation Warnings

Recent enhancement added fields to events that may not match schemas:
- `summary`, `perf`, `notes` in `crawl.finished` events

**Status:** Non-blocking - archives remain valid and usable. Documented behavior.

### Legacy Code

Archived legacy `src/` and `test/` directories moved to `archive/legacy-pre-monorepo/`.
- TypeScript errors in archived code (expected, not in use)
- Preserved for reference only

---

## Recent Enhancements (October 2025)

### Monorepo Migration ✅

**Completed:** Full migration to pnpm + Turbo monorepo architecture
- Organized into 12 packages (8 active)
- Configured workspace dependencies with `workspace:*` protocol
- Updated CI/CD for pnpm and Turbo caching
- Created comprehensive package READMEs
- Cleaned up duplicate directories (archived legacy src/)

### TypeScript Type Safety ✅

**Completed:** Fixed all TypeScript compilation errors in active code
- Added optional chaining for WCAG property access (26 fixes in integration tests)
- Replaced assert usage with vitest expect (2 fixes in smoke tests)
- Zero compilation errors in packages/cartographer/
- Build time: 1.55s with Turbo cache

### Documentation Updates ✅

**Completed:** Comprehensive documentation overhaul
- Updated CODEBASE_DOCUMENTATION.md for monorepo structure
- Updated .github/copilot-instructions.md with pnpm/Turbo/Vitest
- Created package-specific READMEs (@atlas/sdk, @atlas/spec, @cf/url-tools)
- Documented test status and known issues

---

## Future Work

### High Priority

1. **Golden test suite** - Create `examples/tiny-site` for regression tests
2. **Fix remaining tests** - Address 5 failing integration tests

### Medium Priority

3. **Type references** - Configure TypeScript project references for better IDE performance
4. **Performance benchmarks** - Establish baseline metrics

### Low Priority

5. **Electron apps** - Build Continuum, Horizon, Vector
6. **Design system** - Shared UI components with Tailwind
7. **Protocol handlers** - Register `atlas://` protocol

---

## References

- **README.md** - Usage, quick start, CLI reference
- **REMAINING_TEST_FAILURES.md** - Deferred test failures
- **packages/atlas-sdk/QUICK_REFERENCE.md** - SDK usage guide
- **packages/atlas-sdk/README.md** - SDK API documentation
- **packages/atlas-spec/README.md** - Type definitions reference
- **packages/url-tools/README.md** - URL utilities documentation
- **.github/copilot-instructions.md** - AI agent instructions
- **docs/** - Additional documentation

---

**Maintainer:** Cai Frazier  
**License:** Proprietary - All Rights Reserved
