# Cartographer Engine

A headless web crawler that produces Atlas v1.0 (.atls) archive files. Cartographer Engine writes .atls archives that are consumed by the Continuum application. IP owner: Cai Frazier.

## Features

- **Headless crawling** with Playwright browser automation
- **Atlas v1.0 format** - structured JSONL parts compressed with Zstandard
- **CLI interface** - crawl and export commands
- **CSV export** - extract data from .atls archives
- **TypeScript** - full type safety

## Installation

```bash
npm install
npm run build
```

## Usage

### Crawl a website

```bash
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out example.atls \
  --mode prerender \
  --rps 3 \
  --concurrency 8
```

### Export to CSV

```bash
node dist/cli/index.js export \
  --atls example.atls \
  --report pages \
  --out pages.csv
```

## CI/CD Recipes

### Quiet Mode + JSON Output

Perfect for automation and CI pipelines. Outputs a single JSON object to stdout with all logs to stderr:

```bash
# Run crawl in quiet mode and capture JSON summary
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out ./out/site.atls \
  --mode prerender \
  --quiet \
  --json > summary.json

# Parse the summary in your script
PAGES=$(cat summary.json | jq '.summary.pages')
echo "Crawled $PAGES pages"
```

**Exit codes:**
- `0` - Success
- `2` - Error budget exceeded
- `3` - Browser/render fatal error
- `4` - Write/IO fatal error
- `5` - Validation failed
- `10` - Unknown error

### Error Budget Enforcement

Stop the crawl gracefully after a maximum number of errors:

```bash
# Abort if more than 25 errors occur
node dist/cli/index.js crawl \
  --seeds https://bad.example \
  --out ./out/site.atls \
  --errorBudget 25 \
  || echo "Crawl failed after hitting error budget"

# Check exit code
if [ $? -eq 2 ]; then
  echo "Error budget exceeded"
  exit 1
fi
```

The crawl will:
1. Count all ErrorRecords written
2. Stop when `errorCount > errorBudget`
3. Finalize partial .atls archive
4. Add note to summary: "Terminated: error budget exceeded"
5. Exit with code `2`

### Structured Logging

Write NDJSON (newline-delimited JSON) logs for machine parsing:

```bash
# Write structured logs to custom path
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out ./out/site.atls \
  --logFile ./logs/run.jsonl \
  --logLevel info

# Parse logs with jq
cat ./logs/run.jsonl | jq 'select(.event == "crawl.error")'
```

**Log events:**
- `crawl.started` - Crawl initialization
- `crawl.pageProcessed` - Each page completed
- `crawl.checkpoint` - Checkpoint saved
- `crawl.error` - Error occurred
- `crawl.backpressure` - Memory pressure pause/resume
- `crawl.finished` - Crawl complete

**Log path placeholder:**

Use `<crawlId>` in the log file path to automatically substitute the crawl UUID:

```bash
--logFile ./logs/crawl-<crawlId>.jsonl
# Creates: ./logs/crawl-a1b2c3d4e5f6g7h8.jsonl
```

### Example CI Workflow

```bash
#!/bin/bash
set -e

# Run crawl with all production flags
node dist/cli/index.js crawl \
  --seeds https://production.example.com \
  --out ./artifacts/site.atls \
  --mode prerender \
  --maxPages 10000 \
  --errorBudget 50 \
  --quiet \
  --json \
  --logFile ./logs/crawl-<crawlId>.jsonl \
  > ./artifacts/summary.json

EXIT_CODE=$?

# Upload artifacts
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ Crawl succeeded"
  aws s3 cp ./artifacts/site.atls s3://my-bucket/
elif [ $EXIT_CODE -eq 2 ]; then
  echo "⚠ Crawl stopped: error budget exceeded"
  aws s3 cp ./artifacts/site.atls s3://my-bucket/partial/
else
  echo "✗ Crawl failed with code $EXIT_CODE"
  exit $EXIT_CODE
fi

# Parse and report
PAGES=$(cat ./artifacts/summary.json | jq '.summary.pages')
ERRORS=$(cat ./artifacts/summary.json | jq '.summary.errors')
echo "Crawled $PAGES pages with $ERRORS errors"
```

## Development

```bash
# Run in dev mode (no build)
npm run dev -- crawl --seeds https://example.com --out test.atls

# Run tests
npm test

# Lint code
npm run lint
```

## License

Copyright © 2025 Cai Frazier.  
All rights reserved. Unauthorized copying, modification, or distribution is prohibited.  
Proprietary and confidential.
