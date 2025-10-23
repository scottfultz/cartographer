# Cartographer Engine – CLI_BEHAVIOR

## Command Reference
- crawl: `node dist/cli/index.js crawl --seeds <url> --out <file.atls> [options]`
- export: `node dist/cli/index.js export --atls <file.atls> --report pages --out pages.csv`
- validate: `node dist/cli/index.js validate --atls <file.atls>`
- stress: `node dist/cli/index.js stress --targetPages <N> [options]`

## Exit Code Policy
- 0: Success
- 2: Error budget exceeded
- 3: Browser/render fatal error
- 4: Write/IO fatal error
- 5: Validation failed
- 10: Unknown error

## stdout vs stderr Rules
- Normal: metrics/logs to stdout, errors to stderr
- --quiet: suppresses metrics, errors to stderr
- --json: summary to stdout, logs/errors to stderr

## Expected Artifacts
- crawl: .atls archive, manifest.json, summary.json, logs
- export: CSV file (pages, edges, assets, errors)
- validate: validation result (exit code)
- stress: .atls archive, stress-report.csv

---
See `src/cli/commands/`, `README.md`, and `test/cli/cli-polish.test.ts` for examples.
