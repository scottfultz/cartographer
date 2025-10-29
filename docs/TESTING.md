# Testing & Quality Assurance

## Overview

Cartographer Engine has **295+ test cases** across **38 test suites** covering all major functionality. Tests run automatically in CI on Node.js 20 and 22.

**CI Status:** [![CI](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml/badge.svg)](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml)

---

## Test Suite Statistics

```
📊 Test Coverage
├── 295+ individual test cases
├── 38 test suites
├── 40+ test categories
└── ~380 total assertions
```

### Test Breakdown by Category

| Category | Test Files | Test Cases | Description |
|----------|-----------|------------|-------------|
| **Extractors** | 7 | 50+ | Link extraction, assets, page facts, text samples |
| **Enhanced Features** | 3 | 29 | Wappalyzer (9), Enhanced SEO (15), Enhanced Links (5) |
| **Integration** | 5 | 25+ | End-to-end crawl workflows, real browser tests |
| **Atlas Format** | 8 | 30+ | Archive creation, validation, compression, integrity |
| **CLI** | 6 | 20+ | Command parsing, error handling, output formats |
| **Edge Cases** | 4 | 40+ | Checkpoints, rate limiting, error budgets, memory |
| **Performance** | 2 | 15+ | Network metrics, Lighthouse, Core Web Vitals |
| **Data Quality** | 3 | 30+ | Schema validation, duplicate detection, hashing |

---

## Running Tests

### Quick Start

```bash
# Install dependencies and build
npm install
npm run build

# Run all unit tests (recommended for local development)
npm test

# Run specific test suites
npm run test:unit          # Fast unit tests only
npm run test:integration   # Integration tests with real browser
npm run test:all           # Everything (unit + integration + fixtures)
```

### Test Scripts

| Command | Duration | Description |
|---------|----------|-------------|
| `npm test` | ~4s | Standard test suite (295+ tests) |
| `npm run test:unit` | ~3s | Unit tests only (fastest) |
| `npm run test:integration` | ~60s | Integration tests with browser |
| `npm run test:all` | ~90s | Complete test suite + fixtures |
| `npm run test:count` | ~5s | Count tests and generate report |

### Stress Testing (Labyrinth)

- The procedural stress harness is documented in `docs/testing/LABYRINTH_STRESS_TESTS.md`.
- Run the bundled smoke scenario after building with `pnpm test:stress-local`.
- Start the server standalone for ad-hoc crawls with `pnpm labyrinth:server`.
- Capture results from longer drills in `docs/STRESS_TEST_RESULTS.md` for history.

### Individual Test Files

```bash
# Run specific test file
node --test dist-tests/test/wappalyzer.test.js

# Run multiple files
node --test dist-tests/test/wappalyzer.test.js \
            dist-tests/test/enhancedSEO.test.js \
            dist-tests/test/links-enhanced.test.js

# Run with verbose output
node --test --test-reporter=spec dist-tests/test/wappalyzer.test.js
```

---

## Test Organization

### Directory Structure

```
test/
├── *.test.ts               # Unit tests (295+ tests)
├── integration/            # Integration tests (~25 tests)
│   └── scheduler.rateLimit.test.ts
├── smoke/                  # Smoke tests (~30 tests)
│   ├── crawl-small.test.ts
│   ├── export-pages-csv.test.ts
│   └── atlas-sdk-integration.test.ts
├── phase1/                 # Phase 1 feature tests
├── cli/                    # CLI command tests
├── logs/                   # NDJSON logging tests
├── helpers/                # Test utilities
│   ├── testConfig.ts
│   ├── testServer.ts
│   └── fixtureServer.ts
└── fixtures/               # Test HTML fixtures

dist-tests/                 # Compiled test files (gitignored)
└── test/                   # Mirror of test/ structure
```

### Test File Naming

- `*.test.ts` - Test files (compiled to `dist-tests/test/*.test.js`)
- `*.test.d.ts` - TypeScript declarations (auto-generated)
- `*.test.js.map` - Source maps for debugging

---

## Test Categories

### 1. Extractor Tests (50+ tests)

**Purpose:** Validate data extraction from HTML/DOM

**Files:**
- `extractors.test.ts` - Core extractors (links, assets, page facts)
- `wappalyzer.test.ts` - Technology detection (9 tests)
- `enhancedSEO.test.ts` - SEO metadata extraction (15 tests)
- `links-enhanced.test.ts` - Sponsored/UGC attributes (5 tests)
- `accessibility-extractor.test.ts` - WCAG audit data
- `structuredData.test.ts` - JSON-LD and microdata
- `openGraph.test.ts` - Open Graph metadata
- `twitterCard.test.ts` - Twitter Card metadata

**Coverage:**
- ✅ Link extraction (internal, external, location detection)
- ✅ Asset extraction (images, videos, scripts, 1000-item cap)
- ✅ Page facts (title, meta description, canonical, robots)
- ✅ Technology detection (Wappalyzer integration)
- ✅ SEO metadata (indexability, hreflang, pixel widths)
- ✅ Link attributes (nofollow, sponsored, ugc)
- ✅ Accessibility (WCAG violations, color contrast)
- ✅ Structured data (Schema.org types)

### 2. Integration Tests (25+ tests)

**Purpose:** End-to-end crawl workflows with real browser

**Files:**
- `integration/scheduler.rateLimit.test.ts` - Rate limiting
- `smoke/crawl-small.test.ts` - Small crawl validation
- `smoke/crawl-fixture.test.ts` - Fixture server crawl
- `smoke/atlas-sdk-integration.test.ts` - SDK roundtrip
- `smoke/accessibility-integration.test.ts` - WCAG integration

**Coverage:**
- ✅ Multi-page crawls with depth limits
- ✅ Rate limiting per-host and global
- ✅ Browser rendering (raw, prerender, full modes)
- ✅ Challenge detection (Cloudflare, Akamai)
- ✅ Archive creation and validation
- ✅ CSV export workflows

### 3. Atlas Format Tests (30+ tests)

**Purpose:** Archive creation, validation, and integrity

**Files:**
- `atlas.validate.test.ts` - Schema validation
- `atlas.duplicates.test.ts` - Duplicate detection
- `hashing.test.ts` - Content hashing
- `smoke/export-pages-csv.test.ts` - CSV export
- `smoke/export-edges-csv.test.ts` - Edge export
- `smoke/export-errors-csv.test.ts` - Error export

**Coverage:**
- ✅ JSONL part creation (pages, edges, assets, errors)
- ✅ Zstandard compression
- ✅ Manifest generation with integrity hashes
- ✅ Schema validation (AJV)
- ✅ Duplicate URL detection
- ✅ CSV export (pages, edges, assets, errors, accessibility)

### 4. CLI Tests (20+ tests)

**Purpose:** Command parsing, error handling, output formats

**Files:**
- `cli/cli-polish.test.ts` - CLI polish and UX
- `cli/error-budget.test.ts` - Error budget handling
- `config-validation.test.ts` - Configuration validation

**Coverage:**
- ✅ Command parsing (crawl, export, validate, diff)
- ✅ Exit codes (0, 2, 3, 4, 5, 10)
- ✅ JSON output format
- ✅ Quiet mode
- ✅ Error budget enforcement
- ✅ Configuration validation

### 5. Edge Cases (40+ tests)

**Purpose:** Checkpoint recovery, rate limiting, memory management

**Files:**
- `checkpoint.roundtrip.test.ts` - Checkpoint save/restore
- `checkpoint.edgecases.test.ts` - Edge case handling
- `depth-limiting.test.ts` - Depth limit enforcement
- `maxDepth.test.ts` - Max depth validation
- `challenge-detection.test.ts` - Challenge page detection

**Coverage:**
- ✅ Checkpoint save/restore roundtrip
- ✅ Resume after interruption
- ✅ Depth limiting (maxDepth)
- ✅ Page capping (maxPages)
- ✅ Error budget (errorBudget)
- ✅ Challenge detection (Cloudflare, Akamai)
- ✅ Memory backpressure

### 6. Performance Tests (15+ tests)

**Purpose:** Network metrics, Lighthouse, Core Web Vitals

**Files:**
- `enhancedMetrics.test.ts` - Enhanced performance metrics
- `metrics.test.ts` - Crawl metrics

**Coverage:**
- ✅ Network performance (requests, bytes, compression)
- ✅ Lighthouse metrics (LCP, CLS, INP, TTFB, FCP)
- ✅ Core Web Vitals
- ✅ Performance scores
- ✅ Resource breakdown by type

### 7. Data Quality Tests (30+ tests)

**Purpose:** Schema validation, integrity checks

**Files:**
- `logging.test.ts` - NDJSON logging
- `filename-generator.test.ts` - Filename generation
- `url.test.ts` - URL normalization

**Coverage:**
- ✅ Schema validation (pages, edges, assets, errors)
- ✅ Hash integrity (SHA-1, SHA-256)
- ✅ NDJSON event logging
- ✅ Filename generation (auto-generated names)
- ✅ URL normalization

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/ci.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**

1. **Build & Test Matrix**
   - Node.js 20 and 22
   - Ubuntu Latest
   - Parallel execution

2. **Steps:**
   - ✅ Checkout repository
   - ✅ Setup Node.js (with npm cache)
   - ✅ Install dependencies (`npm ci`)
   - ✅ Install Playwright browsers
   - ✅ Build TypeScript (`npm run build`)
   - ✅ Build tests (`npm run build:test`)
   - ✅ Run unit tests (295+ tests)
   - ✅ Create test fixtures
   - ✅ Run integration tests
   - ✅ Run performance benchmark
   - ✅ Upload test artifacts
   - ✅ Generate test summary

3. **Validate Archives**
   - Separate job after tests pass
   - Validates example archives
   - Checks schema compliance

### CI Artifacts

**Preserved for 7 days:**
- Test results (`dist-tests/`)
- Benchmark reports (`tmp/benchmarks/`)
- Test output logs (`tmp/test-output.txt`)
- Test count reports (`tmp/test-reports/`)

**Download artifacts:** [GitHub Actions](https://github.com/scottfultz/cartographer/actions)

### Test Summary Format

```markdown
## Test Results 🧪

**Node.js:** 20

| Metric | Value |
|--------|-------|
| Total Tests | 381 |
| ✅ Passed | 379 |
| ❌ Failed | 2 |
| Build Status | ✅ Success |
```

---

## Writing Tests

### Test Structure

```typescript
import { test } from "node:test";
import assert from "node:assert";
import { extractLinks } from "../src/core/extractors/links.js";
import { baseTestConfig } from './helpers/testConfig.js';

test("extractLinks - detects sponsored links", () => {
  const html = `
    <html>
      <body>
        <a href="https://affiliate.com" rel="sponsored">Affiliate Link</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    ...baseTestConfig,
    domSource: "playwright",
    html,
    baseUrl: "https://example.com",
    discoveredInMode: "prerender"
  });

  const affiliateLink = edges.find(e => e.targetUrl.includes("affiliate.com"));
  assert.strictEqual(affiliateLink?.sponsored, true);
});
```

### Best Practices

1. **Use descriptive test names** - Include expected behavior
2. **Test edge cases** - Empty strings, null values, malformed input
3. **Use test helpers** - `baseTestConfig` for consistent configuration
4. **Assert specific values** - Don't just check for existence
5. **Clean up resources** - Close servers, browsers, files
6. **Use async/await** - For asynchronous operations
7. **Keep tests isolated** - No shared state between tests

### Test Helpers

```typescript
// baseTestConfig - Default configuration for tests
import { baseTestConfig } from './helpers/testConfig.js';

// testServer - Local HTTP server for fixtures
import { startTestServer, stopTestServer } from './helpers/testServer.js';

// fixtureServer - Serve HTML fixtures
import { startFixtureServer } from './helpers/fixtureServer.js';
```

---

## Debugging Tests

### Run with Verbose Output

```bash
# Spec reporter (detailed output)
node --test --test-reporter=spec dist-tests/test/wappalyzer.test.js

# TAP reporter (machine-readable)
node --test --test-reporter=tap dist-tests/test/wappalyzer.test.js

# JSON reporter
node --test --test-reporter=json dist-tests/test/wappalyzer.test.js
```

### Node.js Debugger

```bash
# Run with inspector
node --test --inspect-brk dist-tests/test/wappalyzer.test.js

# Then open chrome://inspect in Chrome
```

### Filter Tests by Name

```bash
# Run only tests matching pattern
node --test --test-name-pattern="sponsored" dist-tests/test/links-enhanced.test.js
```

### Increase Timeout

```bash
# Default timeout: 10s (unit), 60s (integration)
node --test --test-timeout=120000 dist-tests/test/integration/scheduler.rateLimit.test.js
```

---

## Test Maintenance

### Adding New Tests

1. Create `test/my-feature.test.ts`
2. Follow existing test structure
3. Run `npm run build:test`
4. Run `node --test dist-tests/test/my-feature.test.js`
5. Verify tests pass
6. Commit test file

### Updating Tests

1. Modify `test/*.test.ts`
2. Rebuild: `npm run build:test`
3. Run affected tests
4. Verify CI passes

### Test Coverage Goals

- ✅ All extractors have unit tests
- ✅ All CLI commands have integration tests
- ✅ All edge cases have regression tests
- ✅ All data formats have validation tests
- ✅ All performance features have benchmark tests

---

## Performance Benchmarking

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed benchmarking documentation.

**Quick Start:**

```bash
# Run standard benchmark (100 pages)
npm run benchmark:small

# Run large benchmark (500 pages)
npm run benchmark:large

# Custom benchmark
node scripts/benchmark.js --pages=1000 --seeds=https://example.com --mode=full
```

---

## Additional Resources

- [CI Workflow](.github/workflows/ci.yml) - GitHub Actions configuration
- [Test Scripts](./scripts/) - Test counting and benchmarking scripts
- [README](./README.md) - Project overview and quick start
- [GitHub Actions](https://github.com/scottfultz/cartographer/actions) - CI runs and artifacts
