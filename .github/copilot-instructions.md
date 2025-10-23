
# Cartographer Engine – Copilot Instructions

## Essential Architecture & Patterns

- **Purpose:** Headless TypeScript crawler producing Atlas v1.0 (`.atls`) archives for downstream consumption (e.g., Continuum SEO, accessibility tools).
- **Major Components:**
	- `src/cli/`: CLI entrypoints (`crawl`, `export`, `stress`, `validate`).
	- `src/core/`: Crawling engine, rendering, extraction logic.
	- `src/io/atlas/`: Atlas archive writer, manifest builder.
	- `src/io/export/`: CSV export from `.atls` archives.
	- `src/io/readers/`: Read/iterate `.atls` parts (see `atlsReader.ts`).
	- `packages/atlas-sdk/`: SDK for reading `.atls` files (see `QUICK_REFERENCE.md`).
	- `test/`: Smoke tests, fixtures, and CI validation.

## Developer Workflows

- **Build:** `npm run build` (TypeScript → dist)
- **Dev Mode:** `npm run dev -- crawl ...` (no build required)
- **Test:** `npm test` (uses Node 20+ test runner, see `.github/workflows/ci.yml` for test targets)
- **Lint:** `npm run lint`
- **Crawl:** `node dist/cli/index.js crawl --seeds <url> --out <file.atls> [options]`
- **Export CSV:** `node dist/cli/index.js export --atls <file.atls> --report pages --out pages.csv`

## CLI Conventions & Exit Codes

- **Quiet Mode:** `--quiet` suppresses metrics, logs errors to stderr.
- **JSON Output:** `--json` emits crawl summary to stdout.
- **Error Budget:** `--errorBudget <N>` aborts crawl after N errors (exit code `2`).
- **Structured Logging:** NDJSON logs via `--logFile ./logs/crawl-<crawlId>.jsonl` (see README for event types).
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
	- Manifest: `manifest.json` (see `AtlasManifest` in `src/core/types.ts`)
	- Summary: `summary.json` (crawl stats)
- **SDK Usage:**
	- See `packages/atlas-sdk/QUICK_REFERENCE.md` and `examples/` for reading `.atls` files.
	- Example: `import { openAtlas } from '@caifrazier/atlas-sdk'`

## Project-Specific Patterns

- **TypeScript:** ES2022 modules, strict types, no UI/Electron.
- **Compression:** Zstandard for all archive parts.
- **Logging:** NDJSON, event-based (see README for event types).
- **Testing:** Use Node's built-in test runner; smoke tests in `test/smoke/` validate CLI and archive output.
- **Attribution:** All archives/manifest files attribute owner as "Cai Frazier".

## Key References

- `README.md`: Usage, CI/CD, logging, exit codes, workflow examples.
- `src/cli/commands/`: CLI command definitions and options.
- `src/io/readers/atlsReader.ts`: Archive reading patterns.
- `packages/atlas-sdk/QUICK_REFERENCE.md`: SDK usage and examples.
- `.github/workflows/ci.yml`: CI build/test steps.

---
**For AI agents:**
- Always follow the CLI and archive conventions above.
- Reference the README and SDK quick reference for integration tasks.
- Use strict types and ES2022 modules for all new code.
- Preserve copyright and owner attribution in all generated files.
