# Cartographer Codebase Documentation

## Overview
Cartographer is a headless TypeScript crawling engine that produces Atlas v1.0 (`.atls`) archives for downstream analysis (SEO, accessibility, etc.). It is designed for reliability, extensibility, and strict data validation. The codebase is organized into CLI entrypoints, core engine logic, IO/archive management, SDK integration, and a comprehensive test suite.

## Architecture

### Major Components
- **src/cli/**: CLI entrypoints for crawl, export, stress, and validate commands. Built with yargs, supports robust config propagation and structured logging.
- **src/core/**: Crawling engine, event bus (singleton), scheduler, checkpoint/resume logic, rendering, extraction, and metrics.
- **src/engine/**: Cartographer class, orchestrates crawl lifecycle, browser management, and public API (start/pause/resume/cancel/status/on).
- **src/io/atlas/**: AtlasWriter for streaming, staging, and ZIP archive creation; manifest and summary builders; JSON Schema validation.
- **src/io/export/**: CSV export logic for pages, edges, assets, and accessibility data from `.atls` archives.
- **src/io/readers/**: Iterators and readers for `.atls` archive parts.
- **src/utils/**: Utility modules for logging, hashing, URL normalization, metrics, etc.
- **packages/atlas-sdk/**: SDK for reading `.atls` files, with examples and quick reference.
- **test/**: Smoke, integration, and edge-case tests for CLI, engine, checkpoint/resume, and archive validation.

### Data Flow
1. **CLI Entrypoint**: Parses arguments, builds config, and launches Cartographer.
2. **Cartographer Engine**: Manages crawl lifecycle, browser, scheduler, and event bus.
3. **Scheduler**: Handles queue, rate limits, checkpoint/resume, and page processing.
4. **Extraction**: Renders pages, extracts links/assets/facts/accessibility, emits events.
5. **AtlasWriter**: Streams NDJSON parts, builds manifest/summary, finalizes ZIP archive.
6. **Validation/Export**: Validates archive against JSON Schema, exports CSV for analysis.

### Event Bus Pattern
- Implemented as a singleton via `globalThis` in `src/core/events.ts`.
- TypedBus with ring-buffer replay for reliable event delivery.
- Used for metrics, diagnostics, and integration with CLI and Cartographer.

### Checkpoint/Resume
- Scheduler emits checkpoints and supports resume from saved state.
- Checkpoint logic in `src/core/checkpoint.js` and integrated with CLI.

### NDJSON Logging
- Structured event logging via NDJSON, supports metrics, errors, and diagnostics.
- Log files written to `logs/` with crawl ID in filename.

### Atlas Archive Structure
- Parts: `pages/`, `edges/`, `assets/`, `errors/`, `accessibility/` (JSONL, Zstandard-compressed).
- Manifest: `manifest.json` (see `AtlasManifest` in `src/core/types.ts`).
- Summary: `summary.json` (crawl stats).
- All archives attribute owner as "Cai Frazier".

### Validation
- JSON Schema validation for all archive parts.
- Validation logic in `src/io/atlas/validate.js` and schemas in `src/io/atlas/schemas/`.

### SDK Integration
- `packages/atlas-sdk/` provides `openAtlas`, `select`, and iterators for reading `.atls` files.
- See `QUICK_REFERENCE.md` and `examples/` for usage.

## Module Explanations

### src/cli/
- **index.ts**: Main CLI entrypoint, registers commands.
- **commands/crawl.ts**: Crawl command, config propagation, event handling.
- **commands/export.ts**: Export command, CSV output for pages/assets/edges.
- **commands/validate.ts**: Validate command, schema validation for archives.
- **commands/stress.ts**: Stress test command for engine reliability.
- **commands/tail.ts**: Log tailing utility.

### src/core/
- **events.ts**: Event bus singleton, TypedBus, ring-buffer replay.
- **scheduler.ts**: Queue, rate limits, checkpoint/resume, page processing.
- **config.ts**: Config builder, CLI argument parsing, default values.
- **types.ts**: Type definitions for config, records, manifest, etc.
- **checkpoint.js**: Checkpoint read/write logic.
- **extractors/**: Extraction logic for links, assets, page facts, accessibility, text samples.
- **renderer.js**: Page rendering via Playwright.
- **fetcher.js**: URL fetching logic.
- **metrics.js**: Crawl metrics and reporting.
- **logging.js**: Structured logging utilities.

### src/engine/
- **cartographer.ts**: Main engine class, manages crawl lifecycle, browser, API.

### src/io/atlas/
- **writer.ts**: AtlasWriter, NDJSON part streaming, ZIP creation, manifest/summary.
- **validate.js**: Archive validation against JSON Schema.
- **schemas/**: JSON Schema files for pages, edges, assets, errors, accessibility.

### src/io/export/
- **exportCsv.ts**: CSV export logic for archive parts.

### src/io/readers/
- **atlsReader.ts**: Iterators/readers for `.atls` archive parts.

### src/utils/
- **logging.ts**: Logging utilities (picocolors, fs, path).
- **url.js**: URL normalization and policy.
- **hashing.js**: SHA1 hashing utilities.
- **metrics.js**: Metrics collection and reporting.

### packages/atlas-sdk/
- **src/index.ts**: SDK entrypoint, manifest/summary reading, dataset iteration.
- **src/reader.ts**: ZIP and Zstandard decompression, NDJSON part reading.
- **QUICK_REFERENCE.md**: SDK usage examples.

### test/
- **smoke/**: CLI and SDK integration tests.
- **helpers/**: Test server and fixture utilities.
- **atlas.validate.test.ts**: Archive validation tests.
- **resume.integration.test.ts**: Resume and checkpoint integration tests.
- **scheduler.rateLimit.test.ts**: Rate limit and queue tests.
- **checkpoint.roundtrip.test.ts**: Checkpoint read/write edge cases.
- **extractors.test.ts**: Extraction logic tests.
- **perHostTokens.test.ts**: Host token bucket logic tests.

## Unused/Obsolete Files
- No unused files detected in main engine, CLI, IO, SDK, or test suite based on import/require analysis.
- All `.ts` and `.js` files in `src/`, `scripts/`, `test/`, and `packages/` are referenced by imports or test runners.
- If any file is not referenced by an import or test, it is likely a placeholder or legacy stub (e.g., some `.d.ts` or smoke test files).

## Known Issues
- See `docs/KNOWN_ISSUES.md` for current limitations (request limits, navigation timeouts, ESM/require boundaries, dist path mismatches).

## Developer Workflows
- **Build**: `npm run build` (TypeScript → dist)
- **Dev Mode**: `npm run dev -- crawl ...` (no build required)
- **Test**: `npm test` (Node 20+ test runner)
- **Lint**: `npm run lint`
- **Crawl**: `node dist/cli/index.js crawl --seeds <url> --out <file.atls> [options]`
- **Export CSV**: `node dist/cli/index.js export --atls <file.atls> --report pages --out pages.csv`

## References

This documentation is auto-generated and covers architecture, module explanations, and unused file analysis for Cartographer as of the latest codebase review.
---

# Deep Dive: Execution, Architecture, Error Handling, State, Atlas Internals, Testing, Interfaces, Diagnostics

## 1. Execution Lifecycle Deep Dive
### CLI Invocation → Archive Finalization
- **CLI** parses arguments, builds config, and instantiates `Cartographer`.
- **Cartographer.start()**:
	- Emits `crawl.start` event.
	- Instantiates `Scheduler` (queue, rate limits, checkpoint/resume logic).
	- Launches browser session (via Playwright, managed in Cartographer).
	- Subscribes to event bus for metrics, diagnostics, and progress.
		- Scheduler begins processing queue:
		- For each URL: fetches, renders, extracts (links, assets, facts, accessibility).
		- Emits events: `page.fetched`, `extraction.complete`, `checkpoint.saved`, etc.
		- Extraction results are packaged as PageRecord, EdgeRecord, AssetRecord, AccessibilityRecord objects.
		- AtlasWriter streams NDJSON records to staging, then compresses and finalizes ZIP archive.
	- On completion, emits `crawl.finished` and finalizes Atlas archive.

### Extraction Results Packaging
- Extraction methods (e.g., `extractLinks`, `extractAssets`, `extractAccessibility`) return structured objects.
- Scheduler calls AtlasWriter to write each record type to the appropriate NDJSON part.
- AtlasWriter buffers, compresses (Zstandard), and writes to ZIP archive.

### Checkpoint Serialization Format
- Checkpoint files (see `src/core/checkpoint.js`) contain:
	- `frontier`: queued URLs and metadata.
	- `visited`: set of visited URLs.
	- `state`: crawl progress, error budget, metrics.
- Format: JSON, keys include `frontier`, `visited`, `state`, `timestamp`.
- Resume conditions: checkpoint must be valid, matching crawl ID, and not corrupted.

### Typical Event Bus Emissions (per crawl phase)
| Phase            | Event                | Source         | File/Method                  |
|------------------|----------------------|----------------|------------------------------|
| Startup          | crawl.start          | Cartographer   | cartographer.ts:start()      |
| Page Fetch       | page.fetched         | Scheduler      | scheduler.ts:processPage()   |
| Extraction       | extraction.complete  | Scheduler      | scheduler.ts:processPage()   |
| Checkpoint       | checkpoint.saved     | CheckpointMgr  | checkpoint.js:writeCheckpoint()|
| Completion       | crawl.finished       | Cartographer   | cartographer.ts:close()      |

## 2. Class and Function Mapping
```
Cartographer
 ├─ uses Scheduler
 │   ├─ uses CheckpointManager (checkpoint.js)
 │   ├─ uses Renderer (renderer.js)
 │   ├─ uses Extractors (extractors/)
 │   └─ emits checkpoint.saved, page.fetched, extraction.complete
 ├─ uses AtlasWriter
 │   ├─ writes manifest, summary
 │   └─ finalizes archive
 └─ uses EventBus (events.ts)

Scheduler
 ├─ imports: config, checkpoint, renderer, extractors, logging, metrics
 ├─ methods: run(), cancel(), processPage(), emitCheckpoint()
 └─ subscribes/emits: page.fetched, extraction.complete, checkpoint.saved

AtlasWriter
 ├─ imports: manifest builder, summary builder, Zstandard, archiver
 ├─ methods: writeRecord(), finalize(), createZipArchive()
 └─ subscribes/emits: archive.finalized
```

## 3. Error Handling and Recovery
- **Retry Logic**: Defined in Scheduler (processPage, fetcher.js). Retries on network errors, timeouts, and transient failures.
- **Network Error Handling**: fetcher.js and scheduler.ts catch and log errors, may requeue or skip based on error type.
- **Browser Crash Recovery**: Cartographer monitors browser session; on fatal error, emits crawl.fatal and aborts crawl.
- **Fatal Error Conditions**:
	- Error budget exceeded (configurable).
	- Browser/render fatal error (unrecoverable Playwright crash).
	- Write/IO fatal error (AtlasWriter cannot finalize archive).
	- Validation failed (schema mismatch).

## 4. State Management
- **Checkpoint Files**: JSON with keys: `frontier` (queue), `visited` (set), `state` (progress, error budget, metrics), `timestamp`.
- **Integrity Validation**: On resume, checkpoint is validated for schema, crawl ID, and corruption. If invalid, crawl starts fresh.
- **Scheduler ↔ AtlasWriter**: On resume, Scheduler restores queue/visited state, AtlasWriter resumes NDJSON part writers and manifest.

## 5. Atlas File Internals
| Part           | Extractor Source (file/method)         | Data Shape/Schema Key         | Compression/Encoding Pipeline |
|----------------|----------------------------------------|-------------------------------|------------------------------|
| pages          | extractors/pageFacts.js:extractPageFacts| PageRecord (pages.schema.json)| NDJSON → Zstandard → ZIP     |
| edges          | extractors/links.js:extractLinks        | EdgeRecord (edges.schema.json)| NDJSON → Zstandard → ZIP     |
| assets         | extractors/assets.js:extractAssets      | AssetRecord (assets.schema.json)| NDJSON → Zstandard → ZIP  |
| accessibility  | extractors/accessibility.js:extractAccessibility| AccessibilityRecord (accessibility.schema.json)| NDJSON → Zstandard → ZIP |

## 6. Testing Matrix
| Test File                        | Validates                                      | Mock Structure/Fixtures         | Coverage Gaps                |
|----------------------------------|------------------------------------------------|-------------------------------|------------------------------|
| smoke/atlas-sdk-integration.test | SDK/CLI integration, archive reading           | Uses test .atls files          | Browser crash recovery       |
| atlas.validate.test.ts           | Archive schema validation                      | Synthetic/real .atls files     | Concurrent writes            |
| resume.integration.test.ts       | Checkpoint/resume, event bus, graceful shutdown| Test server, diagnostic logs   | Edge-case resume failures    |
| scheduler.rateLimit.test.ts      | Rate limit, queue, token bucket                | Synthetic config, test server  | Extreme rate limit           |
| checkpoint.roundtrip.test.ts     | Checkpoint read/write, corruption              | mkdtempSync, fs, path          | Large checkpoint files       |
| extractors.test.ts               | Extraction logic (links, assets, facts, text)  | Synthetic HTML, test server    | Accessibility edge cases     |
| perHostTokens.test.ts            | Host token bucket logic                        | Synthetic config, test server  | Host-level concurrency       |

### Testing Scope, Chaos, and Coverage
- Chaos tests (recommended): kill browser mid-crawl, flip disk to read-only during write, force 429 storms with a proxy
- Fault injection: simulate network flake, browser crash, disk IO errors
- Code coverage: current coverage 82%, target 90% (see CI badge)
- Known gaps: browser crash recovery, concurrent writes, large checkpoint files, accessibility edge cases
- Add a test that checks CLI --help output to ensure reference does not drift

## Security Posture
- Threat model: Untrusted HTML runs in a headless Playwright browser. Browser is sandboxed, downloads are blocked, CSP is respected, JS execution is capped, and local file reads are prevented.
- SBOM and license list are published in the repo. Dependency pinning is enforced via `npm audit` in CI.
- PII is redacted in logs and archives using regex rules (e.g., emails, SSNs). Example redaction: `s/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/[REDACTED_EMAIL]/g`.
- Retention: logs 30d, archives 180d (configurable).

## Next Steps: Actionable Documentation and Reference

## Configuration Schema and Examples
### Config JSON Schema (v1.0, excerpt)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CartographerConfig",
  "type": "object",
  "properties": {
    "seeds": { "type": "array", "items": { "type": "string", "format": "uri" }, "minItems": 1 },
    "out": { "type": "string" },
    "owner": { "type": "string", "default": "Cai Frazier" },
    "maxPages": { "type": "integer", "default": 1000, "minimum": 1 },
    "maxDepth": { "type": "integer", "default": 10, "minimum": 1 },
    "maxRequestsPerPage": { "type": "integer", "default": 250 },
    "errorBudget": { "type": "integer", "default": 10 },
    "concurrency": { "type": "integer", "default": 8 },
    "tokenBucketPerHost": { "type": "integer", "default": 4 },
    "renderTimeoutMs": { "type": "integer", "default": 30000 },
    "zstdLevel": { "type": "integer", "default": 3, "minimum": 1, "maximum": 22 },
    "robotsRespect": { "type": "boolean", "default": true },
    "nofollowRespect": { "type": "boolean", "default": true },
    "obeyMetaRobots": { "type": "boolean", "default": true },
    "stripQueryParams": { "type": "boolean", "default": true },
    "sameSiteMode": { "type": "string", "enum": ["host", "etld+1", "regex"], "default": "host" },
    "allowlist": { "type": "array", "items": { "type": "string" }, "default": [] },
    "blocklist": { "type": "array", "items": { "type": "string" }, "default": [] },
    "userAgent": { "type": "string", "default": "CartographerBot/1.0" },
    "viewport": { "type": "string", "default": "1280x800" },
    "headless": { "type": "boolean", "default": true },
    "resourceBlockPatterns": { "type": "array", "items": { "type": "string" }, "default": ["*.png", "*.jpg", "*.gif", "*.css"] },
    "requestTimeoutMs": { "type": "integer", "default": 15000 },
    "navigationWaitUntil": { "type": "string", "enum": ["load", "domcontentloaded", "networkidle"], "default": "networkidle" },
    "workDir": { "type": "string", "default": "./" },
    "tmpDir": { "type": "string", "default": "tmp/" },
    "logsDir": { "type": "string", "default": "logs/" },
    "checkpointsDir": { "type": "string", "default": "checkpoints/" },
    "validateOnWrite": { "type": "boolean", "default": true },
    "validateOnClose": { "type": "boolean", "default": true },
    "featureFlags": { "type": "object", "additionalProperties": { "type": "boolean" } },
    "experimental": { "type": "object", "additionalProperties": { "type": "boolean" } }
  },
  "required": ["seeds", "out"]
}
```
#### Precedence Order
1. CLI flags override all
2. Environment variables override config file (e.g., CARTOGRAPHER_SEEDS, CARTOGRAPHER_OUT, etc.)
3. Config file (JSON/YAML)
#### Example: Small Crawl Dev
```json
{
  "seeds": ["https://example.com"],
  "out": "tmp/dev.atls",
  "maxPages": 5,
  "concurrency": 2
}
```
#### Example: Large Crawl Prod
```json
{
  "seeds": ["https://bigsite.com"],
  "out": "prod/bigsite.atls",
  "maxPages": 100000,
  "maxDepth": 20,
  "concurrency": 32,
  "errorBudget": 100,
  "featureFlags": { "accessibility": true }
}
```
#### Feature Flags & Experimental Toggles
- `featureFlags.accessibility`: Enable accessibility extraction
- `experimental.fastRender`: Use experimental fast rendering
#### Exit Codes
| Code | Meaning                      | Config Impact                |
|------|------------------------------|------------------------------|
| 0    | Success                      | Any config                   |
| 2    | Error budget exceeded        | errorBudget                  |
| 3    | Browser/render fatal error   | renderTimeoutMs, concurrency |
| 4    | Write/IO fatal error         | out path, disk, permissions  |
| 5    | Validation failed            | schema, featureFlags         |
| 10   | Unknown error                | Any config                   |

### Error Taxonomy and User Action Playbook
| Error Code         | Exit Code | Category      | Log Field  | User Action                       |
|--------------------|-----------|--------------|------------|-----------------------------------|
| EATLS_SCHEMA_001   | 5         | Validation   | errorCode  | Run validate, inspect bad record  |
| EATLS_IO_002       | 4         | IO           | errorCode  | Check disk, permissions           |
| EATLS_BROWSER_003  | 3         | Browser      | errorCode  | Check Playwright logs, retry      |
| EATLS_CONFIG_004   | 10        | Config       | errorCode  | Fix config, rerun                 |
| EATLS_NETWORK_005  | 2         | Network      | errorCode  | Check connectivity, retry         ## Event Catalog: Payload Types and Examples
| Event Name         | TypeScript Payload Type         | Emitted By     | When Fired                | Backpressure | Retention Policy | Stability |
|--------------------|-------------------------------|----------------|---------------------------|--------------|------------------|-----------|
| crawl.start        | `CrawlStartEvent`             | Cartographer   | At crawl start            | None         | Ring buffer      | Stable    |
| page.fetched       | `PageFetchedEvent`            | Scheduler      | After page fetch          | None         | Ring buffer      | Stable    |
| extraction.complete| `ExtractionCompleteEvent`     | Scheduler      | After extraction          | None         | Ring buffer      | Stable    |
| checkpoint.saved   | `CheckpointSavedEvent`        | CheckpointMgr  | After checkpoint write    | None         | Ring buffer      | Stable    |
| crawl.finished     | `CrawlFinishedEvent`          | Cartographer   | At crawl end              | None         | Ring buffer      | Stable    |
| archive.finalized  | `ArchiveFinalizedEvent`       | AtlasWriter    | After ZIP finalization    | None         | Ring buffer      | Stable    |
| error             | `ErrorEvent`                  | Any            | On error                  | None         | Ring buffer      | Stable    |
| progress          | `ProgressEvent`               | Scheduler      | Periodically              | None         | Ring buffer      | Stable    |

#### TypeScript Payloads
```ts
interface CrawlStartEvent {
  schemaVersion: string;
  crawlId: string;
  config: CrawlConfig;
  timestamp: string; // ISO 8601
}
interface PageFetchedEvent {
  schemaVersion: string;
  url: string;
  status: number;
  contentType: string;
  crawlId: string;
  timestamp: string; // ISO 8601
}
interface ExtractionCompleteEvent {
  schemaVersion: string;
  url: string;
  facts: PageFacts;
  assets: AssetRecord[];
  edges: EdgeRecord[];
  accessibility?: AccessibilityRecord;
  crawlId: string;
  timestamp: string; // ISO 8601
}
interface CheckpointSavedEvent {
  schemaVersion: string;
  crawlId: string;
  checkpointPath: string;
  timestamp: string; // ISO 8601
}
interface CrawlFinishedEvent {
  schemaVersion: string;
  crawlId: string;
  summary: CrawlSummary;
  timestamp: string; // ISO 8601
}
interface ArchiveFinalizedEvent {
  schemaVersion: string;
  crawlId: string;
  archivePath: string;
  timestamp: string; // ISO 8601
}
interface ErrorEvent {
  schemaVersion: string;
  crawlId: string;
  errorCode: string;
  message: string;
  timestamp: string; // ISO 8601
}
interface ProgressEvent {
  schemaVersion: string;
  crawlId: string;
  pagesCrawled: number;
  queueDepth: number;
  timestamp: string; // ISO 8601
}
```

#### Example JSON Payloads
```json
{
  "schemaVersion": "1.0.0",
  "crawlId": "c123",
  "config": { "seeds": ["https://example.com"] },
  "timestamp": "2025-10-23T12:34:56.789Z"
}
{
  "schemaVersion": "1.0.0",
  "url": "https://example.com/about",
  "status": 200,
  "contentType": "text/html",
  "crawlId": "c123",
  "timestamp": "2025-10-23T12:35:00.000Z"
}
{
  "schemaVersion": "1.0.0",
  "crawlId": "c123",
  "errorCode": "EATLS_IO_002",
  "message": "Failed to write archive",
  "timestamp": "2025-10-23T12:35:10.000Z"
}
```

### Manifest Example and Required Fields
```json
{
  "schemaVersion": "1.0.0",
  "createdAt": "2025-10-23T12:34:56.789Z",
  "crawlId": "c123",
  "owner": "Acme Corp",
  "configHash": "sha256:abcd...",
  "engineVersion": "1.0.0",
  "sdkMinVersion": "1.0.0",
  "parts": {
    "pages": { "size": 123456, "crc32": "deadbeef" },
    "edges": { "size": 23456, "crc32": "beefdead" },
    "assets": { "size": 3456, "crc32": "cafebabe" },
    "accessibility": { "size": 456, "crc32": "badc0de" }
  }
}
```
Required fields: `schemaVersion`, `createdAt`, `crawlId`, `owner`, `configHash`, `engineVersion`, `sdkMinVersion`, `parts` (with sizes and CRC32).
