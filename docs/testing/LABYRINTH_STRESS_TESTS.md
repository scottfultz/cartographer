# Labyrinth Stress Tests

## Overview
The Labyrinth harness provides a deterministic, procedural crawl target that scales to tens of thousands of pages without external dependencies. Use it to exercise Cartographer under load, validate graceful failure modes, and rehearse recovery procedures before long production crawls.

## Quick Start
1. Build Cartographer so the CLI artifacts exist: `pnpm build --filter=@cf/cartographer`
2. Launch a short stress run: `pnpm test:stress-local`
3. Watch CPU, memory, and disk IO during the run (Activity Monitor, `top`, `htop`, `iotop`).

The helper script spins up the procedural server, runs a 5k-page prerender crawl at concurrency 16, and writes `tmp/labyrinth-stress-smoke.atls`. All processes shut down automatically on completion or on `SIGINT`/`SIGTERM`.

## Procedural Server
The server lives at `tools/labyrinth-server.mjs` and exposes a deterministic graph with seeded pseudo-random branching. Behaviour highlights:
- `/page/:id` generates 10-24 links with consistent targets for stable reproducibility.
- `/page/js-link` surfaces links through delayed DOM mutation to exercise the renderer.
- `/page/slow` waits `LABYRINTH_SLOW_DELAY_MS` (default 10s) before responding.
- `/page/no-title` verifies metadata extractors cope with missing titles.
- `/robots.txt` disallows `/robots-disallowed` so we can validate robots compliance toggles.

Tune these via environment variables before launching either the server or the harness:
- `LABYRINTH_PORT` (default `31337` in the harness script, `3000` for standalone server)
- `LABYRINTH_MAX_PAGES` (default `50000`)
- `LABYRINTH_SLOW_DELAY_MS` (default `10000`)
- `LABYRINTH_CRAWL_MAX_PAGES` and `LABYRINTH_CRAWL_CONCURRENCY` (harness only)

Run the server alone with `pnpm labyrinth:server` if you need to point dev instances or manual crawls at it.

## Stress Playbooks
The following scenarios build on the harness. All expect a clean build and the server running on the local machine.

### 1. Smoke Concurrency Check
- Command: `pnpm test:stress-local`
- Expectations: crawl finishes without fatal errors; `summary.pages` >= requested `--maxPages`; resource usage stays within workstation tolerance.
- Regression guard: compare crawl duration and peak RSS against previous baselines captured in `docs/STRESS_TEST_RESULTS.md`.

### 2. Error Budget Exhaustion
- Set `LABYRINTH_CRAWL_MAX_PAGES=20000 LABYRINTH_CRAWL_CONCURRENCY=64`
- Optional: lower `LABYRINTH_MAX_PAGES` to keep graph dense.
- Goal: intentionally overload renderer to trigger exit code `2` (error budget) or `3` (renderer failure).
- Validation: confirm Atlas writer still produces partial archive and structured errors capture root causes.

### 3. Disk Pressure Drill
- Launch `pnpm labyrinth:server` manually.
- Run the crawl CLI with `--out /path/to/fill/disk.atls` on a nearly full partition or inside a quota-limited container.
- Expectation: writer surfaces exit code `4` with actionable message, temporary files under `tmp/` are cleaned on abort.

### 4. Abrupt Termination Handling
- Start `pnpm test:stress-local`.
- Send `SIGINT` midway (Ctrl+C) or `kill -9` the crawl PID in another terminal.
- Verify: Playwright browser closes, server stops, `tmp/labyrinth-stress-smoke.atls` is either complete or removed. Restart the script to ensure there are no lingering locks.

Document results from long-form drills, including resource graphs or anomalies, in `docs/STRESS_TEST_RESULTS.md` for historical tracking.

## Troubleshooting
- **Missing CLI build:** Run `pnpm build --filter=@cf/cartographer`.
- **Port already in use:** Override `LABYRINTH_PORT` before running the harness.
- **Slow machines:** Lower `LABYRINTH_CRAWL_CONCURRENCY` to 8 or 4; raise `LABYRINTH_SLOW_DELAY_MS` to reduce render strain.
- **Playwright launch errors:** Ensure `pnpm exec playwright install chromium` has been run locally (CI handles this automatically).

## Next Steps
- Extend the harness to emit performance telemetry snapshots.
- Add Vitest automation that validates writer cleanup after simulated `ENOSPC` events.
- Explore multi-worker orchestration against multiple Labyrinth instances to mimic distributed crawls.
