# Cartographer Developer Guide

**Introduction to the Cartographer Engine codebase for new developers and AI agents.**

---

## Overview

Cartographer is a headless TypeScript web crawler that produces Atlas v1.0 (`.atls`) archives. It's designed for reliability, extensibility, and strict data validation.

**Tech Stack:**
- TypeScript 5.x (ES2022 modules, strict mode)
- Playwright (Chromium browser automation)
- Node.js 20+ (native test runner)
- Zstandard compression
- Yargs (CLI framework)

---

## Project Structure

```
cartographer/
├── src/
│   ├── cli/          # CLI entrypoints (crawl, export, validate, stress)
│   ├── core/         # Crawling engine, scheduler, extractors
│   ├── engine/       # Cartographer class, orchestration
│   ├── io/           # Atlas writer, readers, CSV export
│   │   ├── atlas/    # Archive creation, manifest, validation
│   │   ├── export/   # CSV export from .atls archives
│   │   └── readers/  # Read/iterate .atls parts
│   └── utils/        # Logging, hashing, URL normalization, metrics
├── packages/
│   └── atlas-sdk/    # SDK for reading .atls files
├── test/             # Test suite (346 tests)
├── docs/             # Documentation (you are here)
└── dist/             # Compiled TypeScript output
```

---

## Key Components

### 1. CLI Layer (`src/cli/`)

**Purpose:** User-facing commands and argument parsing

**Entry Points:**
- `crawl` - Main crawl command
- `export` - CSV export from archives
- `validate` - Archive validation
- `stress` - Load testing
- `diff` - Compare archives
- `tail` - Stream NDJSON logs

**Implementation:**
- Built with Yargs for argument parsing
- Config validation and default values
- Exit code handling (0=success, 2=error budget, 3=browser error, 4=IO error, 5=validation failed, 10=unknown)
- Structured logging integration

**Key Files:**
- `src/cli/index.ts` - Main CLI router
- `src/cli/commands/` - Individual command handlers

---

### 2. Core Engine (`src/core/`)

**Purpose:** Crawl orchestration, page processing, data extraction

**Key Modules:**

#### Scheduler (`scheduler.ts`)
- BFS queue with depth tracking
- Rate limiting (per-host and global)
- Page deduplication
- Checkpoint/resume logic
- Event emission for metrics

#### Renderer (`renderer.ts`)
- Playwright browser pool management
- Three render modes: raw (static HTML), prerender (JS + SEO), full (WCAG audit)
- Challenge detection (Cloudflare, Akamai)
- Screenshot capture (full mode)
- Console log capture

#### Extractors (`extractors.ts`)
- Link extraction and normalization
- Metadata extraction (title, meta tags, Open Graph, Twitter Cards)
- Structured data (JSON-LD)
- Accessibility data (ARIA, alt text, headings, landmarks)
- Form analysis
- Tech stack detection

**Event Bus:**
- Singleton pattern via `globalThis` (`src/core/events.ts`)
- TypedBus with ring-buffer replay
- Events: `crawl.started`, `crawl.pageProcessed`, `crawl.checkpoint`, `crawl.error`, `crawl.finished`

---

### 3. Engine Orchestration (`src/engine/`)

**Purpose:** High-level Cartographer API

**Cartographer Class:**
- Public API: `start()`, `pause()`, `resume()`, `cancel()`, `status()`, `on()`
- Manages browser lifecycle
- Coordinates scheduler, writer, metrics
- Checkpoint/resume state management
- Graceful shutdown handling

---

### 4. Atlas I/O (`src/io/`)

**Purpose:** Archive creation, validation, reading, CSV export

#### Writer (`atlas/writer.ts`)
- Streaming JSONL parts (pages, edges, assets, errors, accessibility)
- Zstandard compression per part
- Manifest generation with spec level calculation
- Summary generation with crawl statistics
- ZIP archive finalization

#### Validation (`atlas/validate.ts`)
- JSON Schema validation for all parts
- Duplicate detection
- Corruption detection
- Manifest integrity checks

#### Readers (`readers/`)
- `atlsReader.ts` - Low-level part iterator
- Decompress Zstandard parts
- Stream JSONL records

#### Export (`export/`)
- CSV generation from .atls archives
- Reports: pages, edges, assets, errors, accessibility
- Column mapping and formatting

**Archive Structure:**
```
example.atls (ZIP)
├── manifest.json          # Metadata, attribution, config
├── summary.json           # Crawl statistics
├── pages/000.jsonl.zst    # PageRecords (compressed)
├── edges/000.jsonl.zst    # EdgeRecords
├── assets/000.jsonl.zst   # AssetRecords
├── errors/000.jsonl.zst   # ErrorRecords
└── accessibility/000.jsonl.zst  # AccessibilityRecords (full mode)
```

---

### 5. Utilities (`src/utils/`)

**Logging (`logging.ts`):**
- NDJSON structured logging
- Log levels: debug, info, warn, error
- CrawlId substitution in file paths
- Quiet mode and JSON mode support

**Metrics (`metrics.ts`):**
- Performance tracking (fetch, render, extract, write timings)
- Percentile calculation (p50, p95, p99)
- Memory tracking (RSS, peak RSS)
- Throughput calculation (pages/sec)
- Periodic metric emission

**Hashing (`hashing.ts`):**
- SHA-256 (base64 and hex)
- SHA-1 (hex)
- Content hash calculation for deduplication

**URL Normalization (`urlProcessing.ts`):**
- Query parameter handling
- Fragment removal
- Trailing slash normalization
- Tracking parameter removal

---

## Data Flow

### Crawl Lifecycle

```
1. CLI Entrypoint
   ↓
2. Config Validation & Defaults
   ↓
3. Cartographer Engine Initialization
   ↓
4. Browser Pool Creation
   ↓
5. Scheduler: Enqueue Seed URLs (depth=0)
   ↓
6. BFS Loop:
   a. Dequeue URL
   b. Check depth limit
   c. Render page (raw/prerender/full)
   d. Detect challenges, wait if needed
   e. Extract data (links, assets, metadata, accessibility)
   f. Emit events (metrics, diagnostics)
   g. Write records to Atlas parts
   h. Enqueue discovered links (depth+1)
   ↓
7. Completion Check:
   - finished (queue empty)
   - capped (hit maxPages)
   - error_budget (too many errors)
   - manual (Ctrl+C)
   ↓
8. Finalization:
   - Write manifest.json
   - Write summary.json
   - Close ZIP archive
   - Optional validation
   ↓
9. Exit with appropriate code
```

### Render Modes

**Raw Mode:**
- Fetch HTML without JavaScript execution
- Fast, minimal resource usage
- Extracts: HTML, links, basic metadata
- Use case: Static sites, documentation

**Prerender Mode:**
- Execute JavaScript, wait for network idle
- Extracts: + Structured data (JSON-LD), Open Graph, Twitter Cards, tech stack, forms
- Use case: SEO audits, modern web apps

**Full Mode:**
- Execute JavaScript, wait for network idle
- Extracts: + WCAG accessibility data, console logs, computed styles, screenshots, favicons
- Use case: Accessibility audits, compliance testing

---

## Development Workflows

### Build & Run

```bash
# Full build (TypeScript → dist/)
npm run build

# Dev mode (no build required, uses ts-node)
npm run dev -- crawl --seeds https://example.com

# Run built CLI
node dist/src/cli/index.js crawl --seeds https://example.com
```

### Testing

```bash
# Fast unit tests (~0.6s, 346 tests)
npm test

# Run specific test file
npm test -- dist-tests/test/metrics.test.js

# Build tests (if source changed)
npm run build:test

# Integration tests (slower)
npm run test:integration

# All tests
npm run test:all
```

**Test Organization:**
- `test/*.test.ts` - Unit tests for utilities, extractors, core functions
- `test/phase1/` - Phase 1 WCAG accessibility tests (104 tests)
- `test/integration/` - End-to-end crawl tests

### Linting

```bash
npm run lint
```

### Debugging

**Enable debug logs:**
```bash
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --logLevel debug \
  --logFile ./logs/debug.jsonl
```

**Inspect archive:**
```bash
# List contents
unzip -l example.atls

# Extract manifest
unzip -p example.atls manifest.json | jq

# Decompress and view pages
unzip -p example.atls pages/000.jsonl.zst | zstd -d | jq
```

---

## Architecture Patterns

### Event-Driven Design

- Events emitted via singleton bus (`src/core/events.ts`)
- Loose coupling between components
- Replay buffer for late subscribers
- Used for metrics, diagnostics, checkpointing

### Streaming I/O

- JSONL parts written incrementally during crawl
- Zstandard compression on-the-fly
- Low memory footprint for large crawls

### Checkpoint/Resume

- Scheduler emits periodic checkpoints
- State includes: queue, visited URLs, depth map
- Resume from checkpoint file if crawl interrupted
- Implemented in `src/core/checkpoint.ts`

### Schema Validation

- JSON Schema definitions in `src/io/atlas/schemas/`
- Validate all records before writing
- Post-creation validation for QA

### Browser Pool

- Context pool pattern for reuse
- Stealth mode (disable automation markers)
- Session persistence (cookies, localStorage)
- Graceful cleanup on shutdown

---

## Coding Conventions

### TypeScript Patterns

```typescript
// Strict types, no 'any'
interface PageRecord {
  url: string;
  html: string;
  statusCode: number;
  // ...
}

// ES2022 modules
export function extractLinks(html: string, baseUrl: string): string[] {
  // ...
}

// Async/await for I/O
async function renderPage(url: string): Promise<PageRecord> {
  const page = await browser.newPage();
  // ...
}
```

### Error Handling

```typescript
// Use specific error types
class CrawlError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// Log and emit errors
try {
  await renderPage(url);
} catch (err) {
  logEvent({ level: 'error', event: 'render_failed', url, error: err.message });
  writeErrorRecord({ url, errorType: 'RENDER_ERROR', ... });
}
```

### Testing Patterns

```typescript
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

describe('extractLinks', () => {
  test('extracts absolute URLs', () => {
    const html = '<a href="https://example.com/page">Link</a>';
    const links = extractLinks(html, 'https://example.com');
    assert.deepEqual(links, ['https://example.com/page']);
  });

  test('resolves relative URLs', () => {
    const html = '<a href="/page">Link</a>';
    const links = extractLinks(html, 'https://example.com');
    assert.deepEqual(links, ['https://example.com/page']);
  });
});
```

---

## Key Invariants

**Always Maintain:**

1. **Owner Attribution:** All manifests/archives attribute "Cai Frazier"
2. **Compression:** All archive parts use Zstandard compression
3. **JSONL Format:** One JSON object per line, newline-delimited
4. **Exit Codes:** Follow documented exit code contract (0, 2, 3, 4, 5, 10)
5. **Spec Levels:** Raw=1, Prerender=2, Full=3 (manifest.specLevel)
6. **URL Normalization:** Consistent URL canonicalization (trailing slash, query params)
7. **Depth Tracking:** Accurate BFS depth calculation
8. **Event Types:** Use documented event types for consistency

---

## Common Tasks

### Add a New Extractor

1. Define type in `src/core/types.ts` (e.g., `PageRecord.newField`)
2. Implement extractor in `src/core/extractors.ts`
3. Call extractor in mode-specific rendering (`renderer.ts`)
4. Update JSON Schema in `src/io/atlas/schemas/`
5. Add tests in `test/newFeature.test.ts`
6. Update documentation in `FEATURES.md`

### Add a CLI Option

1. Define option in `src/cli/commands/crawl.ts` (Yargs)
2. Add to config type in `src/core/types.ts`
3. Implement feature in core engine
4. Add tests in `test/`
5. Update README.md CLI reference

### Add a CSV Report

1. Implement report logic in `src/io/export/`
2. Add to report type union in types
3. Register in export command handler
4. Test with real archive
5. Document in README.md

---

## Testing Strategy

**Unit Tests (346 tests):**
- Pure functions (extractors, hashing, URL processing)
- Edge cases (empty input, malformed data, boundary conditions)
- Fast execution (~0.6s total)

**Integration Tests:**
- End-to-end crawls with real browser
- Archive validation workflows
- CLI command execution
- Slower (~60s total)

**Test Coverage:**
- Phase 1 WCAG features: 104 tests
- Extractors (structured data, OG, Twitter Cards, metrics, hashing): 125 tests
- Utilities (logging, metrics): 88 tests
- Core engine (config, depth, challenges, completion): 130 tests

---

## CI/CD

**GitHub Actions:**
- Runs on: push to `main` or `develop`, pull requests
- Matrix: Node.js 20 & 22
- Steps:
  1. Build TypeScript
  2. Run unit tests
  3. Run integration tests
  4. Validate archive output
  5. Upload artifacts

**Local Pre-commit:**
```bash
npm run build && npm test && npm run lint
```

---

## Performance Considerations

**Memory:**
- Use streaming I/O, not in-memory buffers
- Recycle browser contexts
- Limit queue size (backpressure)
- Monitor RSS via metrics

**Speed:**
- Parallelize browser tabs (`--concurrency`)
- Rate limiting for politeness (`--rps`)
- Adjust render mode (raw > prerender > full)

**Archive Size:**
- Zstandard compression (~8x ratio)
- Incremental part writing
- Optional media collection (screenshots, favicons)

---

## Debugging Tips

### Crawl hangs or stalls

- Check browser console for errors
- Increase log level to `debug`
- Look for challenge detection events
- Verify network connectivity

### Data not extracted

- Confirm render mode (raw/prerender/full)
- Check if field requires specific mode
- Look for extraction errors in logs
- Validate schema compliance

### Archive validation fails

- Run `validate` command for details
- Check for schema violations
- Look for duplicate records
- Verify manifest structure

### Tests failing

- Rebuild tests: `npm run build:test`
- Check for timing issues (file streams, async operations)
- Verify fixtures exist
- Run in isolation to identify flakes

---

## Resources

- **[README.md](README.md)** - CLI reference, usage examples
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick start guide
- **[FEATURES.md](FEATURES.md)** - Feature list and implementation status
- **[MISSION.md](MISSION.md)** - Project vision and goals
- **[Atlas SDK](packages/atlas-sdk/QUICK_REFERENCE.md)** - Reading archives programmatically
- **[Copilot Instructions](.github/copilot-instructions.md)** - AI agent guidelines

---

## Next Steps for New Contributors

1. **Clone and build:** `git clone ... && npm install && npm run build`
2. **Run a test crawl:** `npm run dev -- crawl --seeds https://example.com --maxPages 10`
3. **Explore archive:** `unzip -l export/*.atls`
4. **Run tests:** `npm test`
5. **Read a feature:** Pick one in `FEATURES.md`, trace through codebase
6. **Make a change:** Add a test, implement, verify
7. **Submit PR:** To `develop` branch with tests and docs

---

**Copyright © 2025 Cai Frazier. All rights reserved.**
