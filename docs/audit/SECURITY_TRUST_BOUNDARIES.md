# Cartographer Engine – External Trust Boundaries & Input Sanitization

| Trust Boundary                | Untrusted Input                | Sanitization Mechanism                | Log Evidence                        |
|-------------------------------|-------------------------------|---------------------------------------|-------------------------------------|
| HTTP Fetch (target site)      | HTML, headers, assets, robots | Playwright sandbox, DOM parse, robots.txt cache, blocklist, param policy | NDJSON: crawl.pageProcessed, robots fetch, blocklist applied, param policy logs |
| Robots.txt                    | robots.txt file               | Fetched, parsed, override logged      | NDJSON: robots fetch, manifest notes, CLI warning |
| User-provided seeds/CLI input | URLs, config flags            | URL normalization, validation, deduplication, config merge                | NDJSON: crawl.started, param policy, blocklist logs |
| Archive ingestion (.atls)     | ZIP/JSONL files               | Streaming decompression, AJV schema validation, never full load            | NDJSON: validation events, schema validation logs |
| SDK consumer                  | .atls file                    | Streaming, schema validation          | SDK: validation logs, error events  |
| Asset URLs                    | External asset links           | Blocklist, type filter, visibility/inViewport checks                      | NDJSON: asset extraction, blocklist logs |
| Accessibility audit           | Page DOM, ARIA roles          | DOM parse, role/landmark validation   | NDJSON: accessibility extraction, missingAltCount logs |

---
For each boundary, logs in NDJSON format (see `logs/crawl-<crawlId>.jsonl`) and manifest notes provide evidence of sanitization. See `src/utils/logging.ts`, `src/core/scheduler.ts`, and `src/io/atlas/manifest.ts` for details.
