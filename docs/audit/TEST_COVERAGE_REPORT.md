# Cartographer Engine – TEST_COVERAGE_REPORT

## Test Inventory
- test/extractors.test.ts: unit tests for extractors (links, assets, facts, text)
- test/accessibility-extractor.test.ts: accessibility extractor unit tests
- test/url.test.ts: URL utils, param policy, blocklist
- test/cli/cli-polish.test.ts: CLI quiet/json modes, artifact checks
- test/cli/error-budget.test.ts: error budget enforcement
- test/smoke/crawl-fixture.test.ts: end-to-end crawl, archive output
- test/smoke/export-pages-csv.test.ts: CSV export smoke test
- test/smoke/export-edges-csv.test.ts: CSV export smoke test
- test/validate-stress.ts: stress test, validation
- test/fixtures/: static HTML fixtures
- test/helpers/: fixture server, test utilities

## Coverage
- Core extractors, renderer, scheduler, CLI, error handling, export, accessibility
- Gaps: browser edge cases, rare error codes, large-scale stress, schema drift
- Flaky/TODOs: see comments in test/smoke/crawl-small.test.ts

## CI Matrix
- Node 20+
- Build, unit, smoke, export, stress, validate
- See `.github/workflows/ci.yml` for steps

---
See `test/`, `.github/workflows/ci.yml`, and README.md for details.
