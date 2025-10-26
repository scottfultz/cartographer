
# Cartographer Engine – Copilot Instructions

## Essential Architecture & Patterns

- **Purpose:** Headless TypeScript crawler producing Atlas v1.0 (`.atls`) archives for downstream consumption (e.g., Continuum SEO, accessibility tools).
- **Monorepo Structure:** pnpm 9.0.0 + Turbo 2.0 monorepo with multiple packages
- **Major Components:**
	- `packages/cartographer/src/cli/`: CLI entrypoints (`crawl`, `export`, `stress`, `validate`)
	- `packages/cartographer/src/core/`: Crawling engine, rendering, extraction logic
	- `packages/cartographer/src/io/atlas/`: Atlas archive writer, manifest builder
	- `packages/cartographer/src/io/export/`: CSV export from `.atls` archives
	- `packages/cartographer/src/io/readers/`: Read/iterate `.atls` parts (see `atlsReader.ts`)
	- `packages/atlas-sdk/`: SDK for reading `.atls` files (see `QUICK_REFERENCE.md`)
	- `packages/atlas-spec/`: Shared TypeScript types for entire monorepo
	- `packages/url-tools/`: URL parsing, normalization, validation utilities
	- `packages/cartographer/test/`: 570 test cases (98.9% pass rate with Vitest)

## Developer Workflows

- **Build:** `pnpm build` (uses Turbo, builds all packages)
- **Build Specific:** `pnpm build --filter=@cf/cartographer`
- **Dev Mode:** `cd packages/cartographer && pnpm dev` (watch mode, no build required)
- **Test:** `pnpm test` (uses Vitest 2.1.9, runs all packages)
- **Test Specific:** `pnpm test --filter=@cf/cartographer`
- **Lint:** `pnpm lint`
- **Crawl:** `node packages/cartographer/dist/cli/index.js crawl --seeds <url> --out <file.atls> [options]`
- **Export CSV:** `node packages/cartographer/dist/cli/index.js export --atls <file.atls> --report pages --out pages.csv`

## CLI Conventions & Exit Codes

- **Quiet Mode:** `--quiet` suppresses metrics, logs errors to stderr
- **JSON Output:** `--json` emits crawl summary to stdout with summary/perf/notes fields
- **Error Budget:** `--errorBudget <N>` aborts crawl after N errors (exit code `2`)
- **Structured Logging:** NDJSON logs via `--logFile ./logs/crawl-<crawlId>.jsonl` (see README for event types)
- **Exit Codes:**
	- `0`: Success
	- `2`: Error budget exceeded
	- `3`: Browser/render fatal error
	- `4`: Write/IO fatal error
	- `5`: Validation failed
	- `10`: Unknown error

## Data & Integration Points

- **Atlas Archive Structure:**
	- Parts: `pages/`, `edges/`, `assets/`, `errors/`, `accessibility/` (JSONL, Zstandard-compressed)
	- Manifest: `manifest.json` (see `AtlasManifest` in `packages/atlas-spec/src/types.ts`)
	- Summary: `summary.json` (crawl stats)
- **SDK Usage:**
	- See `packages/atlas-sdk/QUICK_REFERENCE.md` and `examples/` for reading `.atls` files
	- Example: `import { openAtlas } from '@atlas/sdk'`
	- API: `const atlas = await openAtlas('./file.atls'); for await (const page of atlas.readers.pages()) { ... }`

## Project-Specific Patterns

- **TypeScript:** ES2022 modules, strict types, no UI/Electron
- **Monorepo:** pnpm workspaces with Turbo for incremental builds and caching
- **Package Dependencies:** All internal packages use `workspace:*` protocol
- **Compression:** Zstandard for all archive parts
- **Logging:** NDJSON, event-based (see README for event types)
- **Testing:** Vitest 2.1.9 (not Node test runner); 570 tests, 98.9% pass rate
- **Attribution:** All archives/manifest files attribute owner as "Cai Frazier"

## Key References

- `README.md`: Usage, CI/CD, logging, exit codes, workflow examples
- `CODEBASE_DOCUMENTATION.md`: Complete architecture, testing, recent enhancements
- `REMAINING_TEST_FAILURES.md`: 6 deferred test failures (1.1% failure rate)
- `packages/cartographer/src/cli/commands/`: CLI command definitions and options
- `packages/cartographer/src/io/readers/atlsReader.ts`: Archive reading patterns
- `packages/atlas-sdk/QUICK_REFERENCE.md`: SDK usage and examples
- `packages/atlas-spec/src/types.ts`: Shared TypeScript types
- `.github/workflows/ci.yml`: CI build/test steps

---
**For AI agents:**
- Always use `pnpm` commands, not `npm`
- Use `pnpm build` to build all packages with Turbo caching
- Use `pnpm test --filter=<package>` to test specific packages
- Always reference packages with correct paths: `packages/cartographer/`, `packages/atlas-sdk/`, etc.
- Follow the CLI and archive conventions above
- Reference the README and SDK quick reference for integration tasks
- Use strict types and ES2022 modules for all new code
- Preserve copyright and owner attribution in all generated files
- Remember: Tests use Vitest, not Node's test runner
