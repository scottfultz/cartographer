# Cartographer Engine – RUNTIME_BEHAVIOR

## Crawl Lifecycle Walkthrough
1. CLI parses config, seeds, flags
2. Scheduler initializes queue, param policy, blocklist
3. Renderer launches Playwright browser, loads pages
4. Extractors run (facts, links, assets, accessibility)
5. Writer streams records, compresses, hashes
6. Checkpoint written every N pages (default 500)
7. Error budget checked; crawl aborts if exceeded
8. Finalizer writes manifest, summary, closes archive
9. Validator runs (optional)

## Error Taxonomy
- Phases: dns, fetch, robots, render, write, validate
- Codes: see `src/utils/exitCodes.ts`
- ErrorRecords emitted on error, written to errors part

## Checkpoint & Resume
- Files: checkpoint.json, visited.json, frontier.json
- Cadence: every N pages, on shutdown, on error
- Restoration: reads checkpoint, restores queue/state

## Shutdown Behavior
- Signals: SIGINT, SIGTERM trigger graceful shutdown
- Grace timeout: waits for in-flight pages, writes final checkpoint
- Final state: manifest/summary written, exit code set

## Rate Limiting & Concurrency
- RPS: configurable via CLI (`--rps`)
- Concurrency: (`--concurrency`, default 8)
- Param policy/blocklist: hygiene enforced in scheduler

---
See `src/core/scheduler.ts`, `src/core/checkpoint.ts`, `src/core/startJob.ts`, and `README.md` for details.
