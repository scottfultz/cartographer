# Cartographer Engine – Module Map

## core/
- **scheduler.ts**: BFS scheduler, queue hygiene, param policy, blocklist, checkpoint/resume. Inputs: seeds, config. Outputs: page queue, checkpoint files. Depends on: checkpoint, renderer, extractors, writer.
- **checkpoint.ts**: Checkpoint state, write/read logic. Inputs: crawl state. Outputs: checkpoint files. Depends on: fs, logging.
- **startJob.ts**: Orchestrates crawl lifecycle. Inputs: config. Outputs: exit codes, summary. Depends on: scheduler, renderer, writer.
- **extractors/**: 
    - pageFacts.js: Extracts page-level facts (title, meta, etc.)
    - links.js: Extracts links (EdgeRecord)
    - assets.js: Extracts assets (AssetRecord)
    - textSample.js: Extracts text samples
    - accessibility.js: Accessibility audits (contrast, alt, roles)
- **renderer.ts**: Playwright browser lifecycle, render modes (raw/prerender/full), context recycling. Inputs: config. Outputs: DOM, page content.

## io/atlas/
- **writer.ts**: Streams JSONL parts, compresses, hashes, builds manifest/summary. Inputs: records. Outputs: .atls archive, manifest.json, summary.json, schemas/. Depends on: manifest, fs, zstd.
- **manifest.ts**: Builds manifest with owner, hashes, datasets. Inputs: part files, notes. Outputs: manifest.json.
- **schemas/**: JSON schemas for all record types.
- **validator.ts**: Validates .atls or staging dir with AJV. Inputs: archive path. Outputs: validation result.

## io/readers/
- **atlsReader.ts**: Reads .atls archive, streams parts, decompresses, yields records. Inputs: .atls path. Outputs: record streams. Depends on: yauzl, zstd.

## cli/
- **commands/crawl.ts**: CLI crawl command, config parsing, error budget, quiet/json/logFile flags.
- **commands/export.ts**: CLI export command, CSV output from .atls.
- **commands/validate.ts**: CLI validate command, schema/integrity checks.
- **commands/stress.ts**: CLI stress test, high-volume crawl, periodic CSV.
- **index.ts**: Entrypoint, yargs command registration.

## utils/
- **logging.ts**: NDJSON event logging, file/stdout/stderr routing.
- **hashing.ts**: SHA-256, SHA-1 for integrity and urlKey.
- **url.ts**: URL normalization, blocklist, param policy, section extraction.
- **robotsCache.ts**: Robots.txt fetch/cache, respect/override logic.
- **metrics.ts**: Performance metrics, p50/p95/p99, RSS tracking.
- **exitCodes.ts**: Exit code constants.

## packages/atlas-sdk/
- **src/index.ts**: `openAtlas`, `select`, streaming record access.
- **src/types.ts**: All record types, manifest, summary, select options.
- **examples/**: Usage demos (top-sections, missing-alt, status-report).

---
For each module, see referenced file for public API, types, and invariants. All outputs are streamed or buffered as described in ARCHITECTURE_OVERVIEW.md.
