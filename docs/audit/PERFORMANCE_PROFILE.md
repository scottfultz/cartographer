# Cartographer Engine – PERFORMANCE_PROFILE

## Metrics Collection
- Metrics tracked in `src/utils/metrics.ts`
- p50/p95/p99 calculated for page throughput, RSS, queue size
- Periodic logging every 5s (see NDJSON logs)

## Memory Envelope
- RSS plateau triggers browser context recycling
- Thresholds set in config, logged in metrics
- Writer flushes and fsyncs streams to avoid memory spikes

## Throughput Determinants
- Render mode: raw/prerender/full (affects browser load)
- maxBytesPerPage, maxRequestsPerPage: limits per page
- Concurrency: CLI flag, default 8

## Heavy Paths & Safeguards
- Accessibility contrast sampling capped for performance
- Large assets/DOMs truncated or skipped
- Blocklist/param policy reduces crawl bloat

---
See `src/utils/metrics.ts`, `src/core/renderer.ts`, and `README.md` for details.
