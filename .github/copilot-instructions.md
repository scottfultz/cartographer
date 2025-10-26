
# Cartographer Engine – Copilot Instructions

## Essential Architecture & Patterns

**Purpose:** Production-grade headless TypeScript crawler producing Atlas v1.0 (`.atls`) archives for downstream consumption (Continuum SEO, accessibility tools, site mapping).

**Monorepo Structure:** pnpm 9.0.0 + Turbo 2.0 monorepo with workspace packages:
- `packages/cartographer/` - Main crawler engine with CLI (570 tests, 98.9% pass rate)
- `packages/atlas-sdk/` - SDK for reading `.atls` archives (see `QUICK_REFERENCE.md`)
- `packages/atlas-spec/` - Shared TypeScript types for entire monorepo
- `packages/url-tools/` - URL parsing, normalization, validation utilities
- `packages/{design-system,devkit,waypoint}/` - Supporting utilities
- `apps/{continuum,horizon,vector,dispatcher}/` - Future Electron apps (not yet active)

**Data Flow Architecture:**
1. **Crawl Orchestration** (`src/core/startJob.ts`) → Initializes browser, writer, scheduler
2. **Scheduler** (`src/core/scheduler.ts`) → Manages queue, concurrency, rate limiting
3. **Renderer** (`src/core/renderer.ts`) → Playwright automation, challenge detection
4. **Extractors** (`src/core/extractors/`) → Links, SEO, accessibility, WCAG audits
5. **Atlas Writer** (`src/io/atlas/writer.ts`) → Writes JSONL parts, compresses with Zstandard
6. **Finalization** → Packages into `.atls` ZIP with manifest + summary

**Core Components:**
- `packages/cartographer/src/cli/commands/` - CLI entrypoints (`crawl.ts`, `export.ts`, `stress.ts`, `validate.ts`)
- `packages/cartographer/src/core/` - Crawling engine, rendering, extraction logic
- `packages/cartographer/src/io/atlas/` - Atlas archive writer (`writer.ts`), manifest builder, Zstandard compression
- `packages/cartographer/src/io/export/` - CSV export from `.atls` archives
- `packages/cartographer/src/io/readers/` - Read/iterate `.atls` parts (`atlsReader.ts`)

---

## Developer Workflows

### Building & Development
```bash
# Build all packages (Turbo caches outputs for incremental builds)
pnpm build

# Build specific package only
pnpm build --filter=@cf/cartographer

# Development mode with watch (no build needed for execution)
cd packages/cartographer
pnpm dev -- crawl --seeds https://example.com --out test.atls --maxPages 5

# TypeScript compilation check
pnpm typecheck
```

### Testing
```bash
# Run all tests across workspace (Vitest 2.1.9)
pnpm test

# Test specific package
pnpm test --filter=@cf/cartographer

# Watch mode for TDD
cd packages/cartographer && pnpm test:watch

# Coverage report
pnpm test:cov
```

**Test Conventions:**
- Uses **Vitest 2.1.9** (NOT Node's test runner or Jest)
- Test files: `packages/cartographer/test/**/*.test.ts`
- Vitest config: `packages/cartographer/vitest.config.ts` with path aliases for workspace packages
- CI skips 3 tests via `test.skipIf(process.env.CI === 'true')` (see `REMAINING_TEST_FAILURES.md`)
- Test timeout: 30s, hook timeout: 30s
- 570 tests total, 98.9% pass rate (565 passing, 5 environment-specific failures)

### Running Crawls
```bash
# After build, crawl with CLI
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out output.atls \
  --mode prerender \
  --maxPages 100 \
  --quiet \
  --json > crawl-result.json

# Quick demo crawl (no build needed)
pnpm demo:quickstart

# Export CSV from archive
node packages/cartographer/dist/cli/index.js export \
  --atls output.atls \
  --report pages \
  --out pages.csv
```

---

## CLI Conventions & Exit Codes

**Output Modes:**
- `--quiet` - Suppresses progress metrics, logs errors to stderr only
- `--json` - Emits JSON summary to stdout (see JSON structure below)
- `--logFile ./logs/crawl-<crawlId>.jsonl` - NDJSON structured logging (see README for event types)

**JSON Output Structure** (from `src/core/startJob.ts`):
```json
{
  "summary": {
    "pages": 123,
    "edges": 456,
    "assets": 78,
    "errors": 2
  },
  "perf": {
    "avgPagesPerSec": 2.5,
    "peakRssMB": 512
  },
  "notes": ["Crawl completed successfully"]
}
```

**Exit Codes** (defined in `src/utils/exitCodes.ts`):
- `0` - Success
- `2` - Error budget exceeded (`--errorBudget <N>`)
- `3` - Browser/render fatal error
- `4` - Write/IO fatal error
- `5` - Validation failed
- `10` - Unknown error

**Robots.txt Compliance:**
- Default: `--respectRobots=true` (honors all directives)
- Override: `--overrideRobots` (logs warning, use only on owned sites)
- All decisions logged to NDJSON for compliance auditing

---

## Data & Integration Points

### Atlas Archive Structure (`.atls` ZIP)
```
archive.atls/
├── manifest.json          # AtlasManifest (owner, version, mode, etc.)
├── summary.json           # Crawl statistics
└── data/
    ├── pages/
    │   └── pages_part_00.jsonl.zst
    ├── edges/
    │   └── edges_part_00.jsonl.zst
    ├── assets/
    │   └── assets_part_00.jsonl.zst
    ├── errors/
    │   └── errors_part_00.jsonl.zst
    └── accessibility/      # Only in "full" mode
        └── accessibility_part_00.jsonl.zst
```

**Compression:** All parts use Zstandard (`.zst`) via `@mongodb-js/zstd`

**Key Types** (from `packages/atlas-spec/src/types.ts`):
- `PageRecord` - Complete page data (URL, title, meta, SEO, hashes, render stats)
- `EdgeRecord` - Link relationships (source → target, location, anchor text)
- `AssetRecord` - Static assets (CSS, JS, images, fonts)
- `ErrorRecord` - HTTP errors, timeouts, render failures
- `AccessibilityRecord` - WCAG violations, color contrast, alt text (full mode only)
- `AtlasManifest` - Archive metadata (owner: "Cai Frazier", version, mode, seeds, capabilities)

**Atlas Spec Package Status:**
- Currently workspace-internal (`@atlas/spec`)
- **Future evolution:** Will become published semver package (`@caifrazier/atlas-spec`) with JSON Schema exports
- See `docs/ATLAS_CONTRACT_LAYER_STRATEGY.md` for planned schema contract architecture
- See `docs/ATLAS_V1_SPECIFICATION.md` for **complete v1.0 specification** with offline capability, content-addressed blobs, versioned datasets, and provenance tracking
- **Pre-launch status:** Since Cartographer hasn't launched publicly, this v1.0 spec can be fully implemented without backward compatibility concerns

### SDK Usage
```typescript
import { openAtlas, select } from '@atlas/sdk';

// Open archive
const atlas = await openAtlas('./crawl.atls');

// Check available datasets
console.log([...atlas.datasets]); // ['pages', 'edges', 'assets', 'errors', 'accessibility']

// Iterate pages
for await (const page of atlas.readers.pages()) {
  console.log(page.url, page.statusCode);
}

// Filter with select()
for await (const page of select('./crawl.atls', {
  dataset: 'pages',
  where: (p) => p.statusCode === 404
})) {
  console.log('404:', page.url);
}
```

See `packages/atlas-sdk/QUICK_REFERENCE.md` and `examples/` for more patterns.

---

## Project-Specific Patterns

### TypeScript & Monorepo
- **TypeScript 5.6.3** - ES2022 modules, strict types, no `any` types
- **Package manager:** pnpm 9.0.0 (NEVER use npm/yarn commands)
- **Build system:** Turbo 2.0 (`turbo.json`) with task pipelines and caching
- **Internal dependencies:** Use `workspace:*` protocol in `package.json`
- **Path aliases in tests:** Vitest config maps `@atlas/spec`, `@atlas/sdk`, `@cf/url-tools` to source dirs

### Code Organization
- **No UI/Electron in core packages** - Headless only, future apps in `apps/` directory
- **Extractors pattern:** Each extractor exports a single function (e.g., `extractLinks()`, `extractSEO()`)
- **Logging:** NDJSON events via `logEvent()` from `src/utils/logging.ts`
- **Error handling:** Structured errors with exit codes, never `process.exit()` in library code

### Testing Patterns
- **Test structure:** `describe()` for grouping, `test()` for individual cases (NOT `it()`)
- **Fixtures:** Golden corpus in `test/fixtures/golden-corpus/`
- **Integration tests:** Use local static server from `test/server/`
- **CI skipping:** Use `test.skipIf(process.env.CI === 'true')` for environment-specific tests
- **Assertions:** Vitest's `expect()`, NOT Node's `assert` module

### Attribution & Copyright
- **File headers:** All source files include copyright notice: `"Copyright © 2025 Cai Frazier."`
- **Owner field:** All manifests/archives attribute owner as `"Cai Frazier"`
- **License:** UNLICENSED (proprietary), not open source

---

## Critical Knowledge for AI Agents

### Package Paths
- Core engine: `packages/cartographer/src/`
- Types: `packages/atlas-spec/src/types.ts`
- SDK: `packages/atlas-sdk/src/`
- Tests: `packages/cartographer/test/`

### Build Requirements
1. **Always build before running CLI:** `pnpm build` (Turbo caches outputs)
2. **Dev mode alternative:** `cd packages/cartographer && pnpm dev -- crawl ...` (no build needed)
3. **Test after changes:** `pnpm test --filter=@cf/cartographer`

### Common Pitfalls
- ❌ Using `npm` instead of `pnpm`
- ❌ Running `node src/cli/index.js` instead of `node dist/cli/index.js` (TypeScript must compile first)
- ❌ Using Node's test runner or Jest (project uses Vitest)
- ❌ Assuming tests use `it()` (they use `test()`)
- ❌ Missing `workspace:*` for internal package dependencies
- ❌ Forgetting copyright attribution in new files

### Key Documentation
- `README.md` - Usage, CI/CD, logging event types, exit codes
- `CODEBASE_DOCUMENTATION.md` - Complete architecture, package descriptions
- `REMAINING_TEST_FAILURES.md` - Known test issues (5 environment-specific failures)
- `docs/ATLAS_V1_SPECIFICATION.md` - **Complete Atlas v1.0 technical specification (80+ pages)**
- `docs/ATLAS_V1_IMPLEMENTATION_PLAN.md` - **7-phase implementation roadmap (8-10 weeks)**
- `docs/ATLAS_CONTRACT_LAYER_STRATEGY.md` - Publishing and semver strategy for @caifrazier/atlas-spec
- `packages/atlas-sdk/QUICK_REFERENCE.md` - SDK usage and query patterns
- `packages/atlas-spec/src/types.ts` - All TypeScript interfaces
- `.github/workflows/ci.yml` - CI pipeline (Node 20 & 22 matrix)

### When Editing Code
1. Read relevant types from `packages/atlas-spec/src/types.ts` first
2. Check existing patterns in similar files (e.g., other extractors)
3. Add copyright header if creating new files
4. Update tests in `packages/cartographer/test/`
5. Run `pnpm typecheck` to verify no compilation errors
6. Run `pnpm test --filter=@cf/cartographer` to validate changes
