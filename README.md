# Cartographer Engine

[![CI](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml/badge.svg)](https://github.com/scottfultz/cartographer/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

A production-grade headless web crawler that produces **Atlas v1.0 (.atls)** archive files. Cartographer Engine writes structured, compressed archives consumed by the Continuum application.

**Owner:** Cai Frazier  
**Status:** Production Ready  
**Version:** 1.0.0

---

## 🎯 Features

### Core Functionality
- **🤖 Headless Crawling** - Playwright browser automation with Chromium
- **📦 Atlas v1.0 Format** - Structured JSONL parts compressed with Zstandard
- **🎨 Three Render Modes** - Raw (static HTML), Prerender (SEO), Full (WCAG audit)
- **🌊 Unlimited Depth** - Default depth=-1 for complete site mapping
- **🛡️ Challenge Detection** - Automatic Cloudflare/Akamai challenge handling
- **📝 Smart Filenames** - Auto-generated: `domain_YYYYMMDD_HHMMSS_mode.atls`
- **✅ Completion Tracking** - Flags: `finished`, `capped`, `error_budget`, `manual`

### Advanced Features
- **🔄 Resume/Checkpoint** - Fault-tolerant crawling with automatic state recovery
- **🚦 Rate Limiting** - Per-host and global RPS controls
- **💾 Memory Management** - Automatic backpressure and context recycling
- **📊 CSV Export** - Extract pages, edges, assets, errors, accessibility data
- **🔍 Structured Logging** - NDJSON event stream for monitoring
- **✅ Archive Validation** - Automatic post-creation QA checks for data integrity
- **🧪 Comprehensive Testing** - 130+ edge case tests

---

## 🚀 Quick Start

### Installation

```bash
npm install
npm run build
```

### Basic Crawl

```bash
# Crawl with auto-generated filename in ./export/
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --mode prerender \
  --maxPages 100

# Output: ./export/example.com_20251024_153045_prerender.atls
```

### Custom Configuration

```bash
node dist/src/cli/index.js crawl \
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
node dist/src/cli/index.js crawl [options]
```

**Required:**
- `--seeds <urls...>` - Starting URL(s) for crawl

**Optional:**
- `--out <path>` - Output .atls path (default: auto-generated in ./export/)
- `--mode <raw|prerender|full>` - Render mode (default: prerender)
- `--maxPages <N>` - Page limit, 0=unlimited (default: 0)
- `--maxDepth <N>` - Depth limit, -1=unlimited (default: -1)
- `--rps <N>` - Requests per second (default: 3)
- `--concurrency <N>` - Browser tabs (default: 8)
- `--respectRobots` - Honor robots.txt (default: true)
- `--errorBudget <N>` - Max errors before abort (default: 0=unlimited)
- `--quiet` - Suppress periodic metrics
- `--json` - Emit JSON summary to stdout
- `--logFile <path>` - NDJSON log file (default: logs/crawl-<crawlId>.jsonl)
- `--logLevel <info|warn|error|debug>` - Minimum log level (default: info)
- `--validateArchive` - Run post-creation QA check (default: true)
- `--noScreenshots` - Disable screenshot capture in full mode (screenshots enabled by default)
- `--screenshotQuality <1-100>` - JPEG quality for screenshots (default: 80)
- `--screenshotFormat <jpeg|png>` - Screenshot format (default: jpeg)
- `--noFavicons` - Disable favicon collection in full mode (favicons enabled by default)

**Render Modes:**
- `raw` - Static HTML only (no JavaScript execution)
- `prerender` - Execute JavaScript, wait for network idle (SEO-focused)
- `full` - Full WCAG accessibility audit + console logs + **screenshots + favicons** (captured by default)

### Export Command

```bash
node dist/src/cli/index.js export --atls <file.atls> --report <type> --out <file.csv>
```

**Reports:**
- `pages` - All crawled pages with metadata
- `edges` - Internal links between pages
- `assets` - Media assets (images, videos, etc.)
- `errors` - All errors encountered

---

## 🎨 Usage Examples

### Complete Site Mapping (Unlimited Depth)

```bash
# Crawl entire site with no depth limit
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --maxPages 5000 \
  --maxDepth -1
```

### Seeds Only (Depth=0)

```bash
# Crawl only seed URLs, no following links
node dist/src/cli/index.js crawl \
  --seeds https://example.com https://example.com/about \
  --maxDepth 0
```

### Shallow Crawl (Depth=2)

```bash
# Crawl seeds + 2 levels of links
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --maxDepth 2 \
  --maxPages 100
```

### Challenge Page Handling

```bash
# Automatically detect and wait for Cloudflare challenges
node dist/src/cli/index.js crawl \
  --seeds https://protected-site.com \
  --mode prerender
  
# Challenge detection:
# - Waits up to 15s for automatic resolution
# - Logs CHALLENGE_DETECTED error if timeout
# - Does not create poisoned PageRecords
```

---

## 🔧 CI/CD Recipes

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

### Error Budget Enforcement

Stop the crawl gracefully after a maximum number of errors:

```bash
# Abort if more than 25 errors occur
node dist/cli/index.js crawl \
  --seeds https://bad.example \
  --out ./out/site.atls \
  --errorBudget 25 \
  || echo "Crawl failed after hitting error budget"

# Check exit code
if [ $? -eq 2 ]; then
  echo "Error budget exceeded"
  exit 1
fi
```

The crawl will:
1. Count all ErrorRecords written
2. Stop when `errorCount > errorBudget`
3. Finalize partial .atls archive
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
- `crawl.pageProcessed` - Each page completed
- `crawl.checkpoint` - Checkpoint saved
- `crawl.error` - Error occurred
- `crawl.backpressure` - Memory pressure pause/resume
- `crawl.finished` - Crawl complete

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
  --errorBudget 50 \
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
node dist/src/cli/index.js crawl \
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
node dist/src/cli/index.js validate --atls example.atls

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
