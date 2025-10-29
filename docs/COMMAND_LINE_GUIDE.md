# Cartographer Command-Line Guide

**Complete reference for using Cartographer from the command line**

Copyright © 2025 Cai Frazier.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation & Setup](#installation--setup)
3. [Commands Overview](#commands-overview)
4. [Crawl Command](#crawl-command)
5. [Export Command](#export-command)
6. [Validate Command](#validate-command)
7. [Other Commands](#other-commands)
8. [Common Workflows](#common-workflows)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# Build the project first
pnpm build

# Basic crawl (raw HTML, 10 pages)
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out crawl.atls \
  --maxPages 10

# Full audit with accessibility (5 pages, includes screenshots)
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out audit.atls \
  --mode full \
  --maxPages 5

# Export to CSV
node packages/cartographer/dist/cli/index.js export \
  --atls audit.atls \
  --report pages \
  --out pages.csv
```

---

## Installation & Setup

### Prerequisites

- **Node.js:** 20.0.0 or higher
- **pnpm:** 9.0.0 (required, NOT npm/yarn)
- **Playwright:** Automatically installed with dependencies

### Building Cartographer

```bash
# Clone the repository
git clone <repository-url>
cd Cartographer

# Install dependencies
pnpm install

# Build all packages (required before running CLI)
pnpm build

# Verify installation
node packages/cartographer/dist/cli/index.js version
```

### Development Mode

```bash
# Run without building (auto-compiles)
cd packages/cartographer
pnpm dev -- crawl --seeds https://example.com --out test.atls --maxPages 5
```

---

## Commands Overview

Cartographer provides 6 CLI commands:

| Command | Purpose | Common Use Case |
|---------|---------|-----------------|
| `crawl` | Crawl websites and create archives | Main crawling operation |
| `export` | Export archives to CSV | Data analysis, reporting |
| `validate` | Validate archive integrity | QA, debugging |
| `version` | Show version information | Verify installation |
| `stress` | High-volume stress testing | Performance testing |
| `tail` | Stream log files | Real-time monitoring |

**Note:** The `diff` command does NOT exist (despite some documentation references).

---

## Crawl Command

The primary command for crawling websites and creating Atlas archives.

### Basic Syntax

```bash
node packages/cartographer/dist/cli/index.js crawl [OPTIONS]
```

### Essential Options

#### Seeds & Output

```bash
# Single seed URL
--seeds https://example.com

# Multiple seeds (comma-separated)
--seeds https://example.com,https://example.org

# Output file path (.atls extension)
--out crawl-output.atls

# Force overwrite existing file
--force
```

#### Render Modes

Three render modes with different capabilities:

```bash
# RAW mode - Static HTML only (fastest, no browser)
--mode raw

# PRERENDER mode - JavaScript execution, SEO-focused (default)
--mode prerender

# FULL mode - Complete audit with screenshots + accessibility
--mode full
```

**Mode Comparison:**

| Feature | Raw | Prerender | Full |
|---------|-----|-----------|------|
| Speed | Fastest | Medium | Slowest |
| Browser Required | No | Yes | Yes |
| JavaScript Execution | ❌ | ✅ | ✅ |
| Screenshots | ❌ | ❌ | ✅ Desktop + Mobile |
| Accessibility Data | ❌ | ❌ | ✅ Full WCAG |
| Favicons | ❌ | ❌ | ✅ |
| Network Logs | ❌ | ✅ | ✅ |
| Console Logs | ❌ | ✅ | ✅ |

#### Crawl Limits

```bash
# Maximum pages to crawl
--maxPages 100

# Maximum depth (links from seed)
--maxDepth 3

# Maximum duration in seconds
--maxDuration 300

# Error budget (stop if X errors occur)
--errorBudget 10
```

### Performance Options

#### Concurrency & Rate Limiting

```bash
# Number of concurrent browser tabs (default: 8)
--concurrency 5

# Requests per second limit (0 = unlimited)
--rps 2

# Example: Slow, polite crawl
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out polite-crawl.atls \
  --concurrency 1 \
  --rps 1 \
  --maxPages 50
```

**Performance Guidelines:**

- **Low traffic sites:** `--concurrency 1-2 --rps 1-2`
- **Medium sites:** `--concurrency 5-8 --rps 5` (default)
- **High-performance crawls:** `--concurrency 10-20 --rps 0` (use with caution)

### Robots.txt Compliance

```bash
# Respect robots.txt (default: true)
--respectRobots=true

# Override robots.txt (USE ONLY ON SITES YOU OWN)
--overrideRobots

# Robots.txt check mode
--robotsCheckMode=default  # Options: default, aggressive, permissive

# Example: Respectful crawl
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --respectRobots=true \
  --out respectful-crawl.atls
```

**⚠️ Legal Warning:** Always respect robots.txt unless you own the site. Override only for authorized testing.

### URL Filtering

```bash
# Include URLs matching pattern (regex)
--includePattern "^https://example\\.com/(blog|docs)"

# Exclude URLs matching pattern (regex)
--excludePattern "\\.(pdf|zip|exe)$"

# Stay on same domain
--sameDomain

# Example: Crawl only blog section
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com/blog \
  --includePattern "^https://example\\.com/blog" \
  --out blog-crawl.atls
```

### Privacy & Redaction

```bash
# Enable privacy mode
--privacy

# Redact content matching CSS selectors
--redactSelectors ".user-info, .email, .phone"

# Redact text matching patterns
--redactText "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b"

# Redact images
--redactImages

# Example: GDPR-compliant crawl
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --privacy \
  --redactSelectors ".user-info, .personal-data" \
  --redactText "\\b\\d{3}-\\d{2}-\\d{4}\\b" \
  --out private-crawl.atls
```

### Session Persistence

```bash
# Persist cookies and localStorage between pages
--persistSession

# Example: Crawl authenticated site
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com/dashboard \
  --persistSession \
  --out authenticated-crawl.atls
```

### Checkpoints & Resume

```bash
# Enable checkpoints (save progress every N pages)
--checkpoint 100

# Resume from previous crawl
--resume crawl-output.atls

# Example: Long crawl with checkpoints
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --checkpoint 50 \
  --maxPages 1000 \
  --out large-site.atls

# Resume after interruption
node packages/cartographer/dist/cli/index.js crawl \
  --resume large-site.atls
```

### Output Control

```bash
# Quiet mode (suppress progress, errors to stderr only)
--quiet

# JSON output to stdout (parsable summary)
--json

# Log file (NDJSON structured logging)
--logFile ./logs/crawl.jsonl

# Example: Automated crawl with JSON output
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out crawl.atls \
  --maxPages 10 \
  --quiet \
  --json > crawl-result.json
```

### Complete Crawl Examples

#### Example 1: Quick SEO Audit

```bash
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode prerender \
  --maxPages 50 \
  --maxDepth 2 \
  --out seo-audit.atls
```

#### Example 2: Accessibility Audit (WCAG 2.1 AA)

```bash
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 20 \
  --concurrency 3 \
  --rps 1 \
  --out accessibility-audit.atls \
  --logFile ./logs/accessibility-crawl.jsonl
```

#### Example 3: Large Site Crawl with Checkpoints

```bash
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode raw \
  --maxPages 5000 \
  --concurrency 10 \
  --checkpoint 500 \
  --respectRobots=true \
  --out large-site.atls \
  --logFile ./logs/large-crawl.jsonl
```

#### Example 4: WordPress Site with Cloudflare

```bash
# Handles challenge detection automatically
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://wordpress-site.com \
  --mode prerender \
  --maxPages 10 \
  --concurrency 2 \
  --rps 1 \
  --out wordpress-crawl.atls
```

---

## Export Command

Export Atlas archives to CSV format for analysis in spreadsheet tools.

### Basic Syntax

```bash
node packages/cartographer/dist/cli/index.js export [OPTIONS]
```

### Options

```bash
# Input archive file
--atls crawl.atls

# Report type (pages, edges, assets, errors, accessibility)
--report pages

# Output CSV file
--out pages.csv
```

### Available Report Types

#### 1. Pages Report

**Contains:** All page-level data (URL, status, title, meta, SEO, render stats)

```bash
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report pages \
  --out pages.csv
```

**Key Fields:**
- `url`, `statusCode`, `title`, `metaDescription`
- `h1Count`, `h2Count`, `canonicalUrl`
- `renderStrategy`, `renderDurationMs`
- `wordsOnPage`, `linksOnPage`

**Additional columns (response metadata):**
- `response_headers.server`
- `response_headers.cache_control`
- `response_headers.content_encoding`
- `cdn_indicators.detected`
- `cdn_indicators.provider`
- `cdn_indicators.confidence`
- `compression_details.algorithm`
- `compression_details.compressed_size`

#### 2. Edges Report

**Contains:** Link relationships between pages

```bash
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report edges \
  --out edges.csv
```

**Key Fields:**
- `sourceUrl`, `targetUrl`, `anchorText`
- `location` (body, nav, footer, etc.)
- `rel`, `targetBlank`

#### 3. Assets Report

**Contains:** Static assets (CSS, JS, images, fonts)

```bash
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report assets \
  --out assets.csv
```

**Key Fields:**
- `url`, `assetType` (css, javascript, image, font)
- `referrerUrl`, `statusCode`
- `size`, `contentType`

#### 4. Errors Report

**Contains:** HTTP errors, timeouts, render failures

```bash
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report errors \
  --out errors.csv
```

**Key Fields:**
- `url`, `statusCode`, `errorType`
- `message`, `referrerUrl`

#### 5. Accessibility Report

**Contains:** WCAG 2.1 AA audit data (only available in `full` mode)

```bash
node packages/cartographer/dist/cli/index.js export \
  --atls accessibility-audit.atls \
  --report accessibility \
  --out accessibility.csv
```

**Key Fields (47 total):**
- `pageUrl`, `missingAltCount`, `lang`, `headingOrder`
- `landmarksHeader`, `landmarksNav`, `landmarksMain`, `landmarksAside`, `landmarksFooter`
- `formControlsTotalInputs`, `formControlsMissingLabel`
- WCAG enhancements: `multipleWays`, `sensoryCharacteristics`, `imagesOfText`, `navigationElements`, `componentIdentification`, `pointerCancellation`, `onFocusContextChange`

### Complete Export Workflow

```bash
# 1. Crawl site in full mode
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 20 \
  --out audit.atls

# 2. Export all reports
node packages/cartographer/dist/cli/index.js export \
  --atls audit.atls \
  --report pages \
  --out reports/pages.csv

node packages/cartographer/dist/cli/index.js export \
  --atls audit.atls \
  --report edges \
  --out reports/edges.csv

node packages/cartographer/dist/cli/index.js export \
  --atls audit.atls \
  --report accessibility \
  --out reports/accessibility.csv

# 3. Analyze in spreadsheet tool (Excel, Google Sheets, etc.)
```

---

## Validate Command

Validate Atlas archive integrity, schema compliance, and data quality.

### Basic Syntax

```bash
node packages/cartographer/dist/cli/index.js validate [OPTIONS]
```

### Options

```bash
# Archive to validate
--atls crawl.atls

# Example: Validate archive
node packages/cartographer/dist/cli/index.js validate \
  --atls crawl.atls
```

### What Validation Checks

1. **Archive Structure:** Manifest, datasets, schemas
2. **Compression:** Zstandard decompression successful
3. **Schema Compliance:** All records match JSON schemas
4. **Data Integrity:** Required fields present, types correct
5. **Manifest Integrity:** SHA-256 hashes match

### Exit Codes

- `0` - Archive valid
- `5` - Validation failed (details in output)

---

## Other Commands

### Version Command

Display version information.

```bash
node packages/cartographer/dist/cli/index.js version

# Output: Cartographer v1.0.0-beta.1
```

### Stress Command

High-volume stress testing (for performance analysis).

```bash
node packages/cartographer/dist/cli/index.js stress --help
```

### Tail Command

Stream NDJSON log files in real-time.

```bash
# Tail crawl log
node packages/cartographer/dist/cli/index.js tail \
  --logFile ./logs/crawl.jsonl

# Monitor live crawl
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --logFile ./logs/live.jsonl \
  --out crawl.atls &

node packages/cartographer/dist/cli/index.js tail \
  --logFile ./logs/live.jsonl
```

---

## Common Workflows

### Workflow 1: SEO Audit

```bash
# 1. Crawl with JavaScript rendering
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode prerender \
  --maxPages 100 \
  --maxDepth 3 \
  --out seo-audit.atls \
  --logFile ./logs/seo-crawl.jsonl

# 2. Export pages report
node packages/cartographer/dist/cli/index.js export \
  --atls seo-audit.atls \
  --report pages \
  --out seo-pages.csv

# 3. Analyze in spreadsheet:
#    - Missing meta descriptions (metaDescription column)
#    - Duplicate titles (title column)
#    - Missing H1 tags (h1Count = 0)
#    - Broken canonical URLs (canonicalUrl vs url)
```

### Workflow 2: WCAG 2.1 AA Accessibility Audit

```bash
# 1. Crawl in full mode (required for accessibility data)
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 20 \
  --concurrency 3 \
  --rps 1 \
  --out wcag-audit.atls

# 2. Export accessibility report
node packages/cartographer/dist/cli/index.js export \
  --atls wcag-audit.atls \
  --report accessibility \
  --out wcag-report.csv

# 3. Analyze WCAG violations:
#    - Images missing alt text (missingAltCount > 0)
#    - Missing language attribute (lang = empty)
#    - Broken heading hierarchy (headingOrder != correct)
#    - Missing landmarks (landmarksMain = 0)
#    - Form inputs without labels (formControlsMissingLabel > 0)
#    - Text-in-images violations (imagesOfText)
#    - Navigation consistency (navigationElements)
```

### Workflow 3: Site Structure Analysis

```bash
# 1. Fast raw crawl (no browser overhead)
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode raw \
  --maxPages 500 \
  --maxDepth 5 \
  --concurrency 10 \
  --out structure.atls

# 2. Export edges report (link relationships)
node packages/cartographer/dist/cli/index.js export \
  --atls structure.atls \
  --report edges \
  --out edges.csv

# 3. Import to graph visualization tool (Gephi, Cytoscape)
#    - sourceUrl → targetUrl creates directed graph
#    - Identify orphan pages (no inbound links)
#    - Find link hubs (high degree centrality)
#    - Detect broken internal links (targetUrl in errors.csv)
```

### Workflow 4: Large Site Crawl with Resume

```bash
# 1. Start large crawl with checkpoints
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode raw \
  --maxPages 10000 \
  --checkpoint 1000 \
  --concurrency 15 \
  --respectRobots=true \
  --out large-site.atls \
  --logFile ./logs/large-crawl.jsonl

# 2. If interrupted (Ctrl+C, crash, etc.), resume:
node packages/cartographer/dist/cli/index.js crawl \
  --resume large-site.atls

# 3. Checkpoints saved every 1000 pages, minimal data loss
```

---

## Performance Tuning

### Optimizing Crawl Speed

#### 1. Choose the Right Mode

```bash
# Fastest: Raw mode (no browser)
--mode raw           # 5-10 pages/sec

# Medium: Prerender mode (JavaScript)
--mode prerender     # 1-3 pages/sec

# Slowest: Full mode (screenshots + accessibility)
--mode full          # 0.3-1 pages/sec
```

#### 2. Tune Concurrency

```bash
# Low concurrency (polite, low memory)
--concurrency 1-2    # ~500MB RAM

# Medium concurrency (balanced)
--concurrency 5-8    # ~800MB RAM (default)

# High concurrency (fast, high memory)
--concurrency 10-20  # ~1.5GB+ RAM
```

**Guidelines:**
- Start with default (`--concurrency 8`)
- Increase if CPU < 80% and memory available
- Decrease if memory pressure or target site struggles

#### 3. Adjust Rate Limiting

```bash
# Polite crawling
--rps 1-2            # Respectful, slow

# Balanced
--rps 5              # Default

# Aggressive (use with caution)
--rps 0              # Unlimited (respect robots.txt!)
```

#### 4. Optimize Depth vs Breadth

```bash
# Shallow but wide (good for site overviews)
--maxDepth 2 --maxPages 1000

# Deep but narrow (good for specific sections)
--maxDepth 10 --maxPages 100
```

### Memory Management

```bash
# For memory-constrained environments:
node --max-old-space-size=4096 packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --concurrency 3 \
  --checkpoint 100 \
  --out crawl.atls
```

### Monitoring Performance

```bash
# Use JSON output for metrics
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --maxPages 100 \
  --quiet \
  --json > metrics.json

# Parse metrics
cat metrics.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"Pages: {d['summary']['pages']}\")
print(f\"Duration: {d['summary']['durationMs']/1000:.1f}s\")
print(f\"Speed: {d['perf']['avgPagesPerSec']:.2f} pages/sec\")
print(f\"Memory: {d['perf']['peakRssMB']:.0f} MB\")
"
```

---

## Troubleshooting

### Common Issues

#### 1. "Output file already exists" Error

```bash
# Problem:
[ERROR] Output file already exists: crawl.atls

# Solution: Use --force or different filename
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out crawl.atls \
  --force
```

#### 2. Schema Validation Warnings

```bash
# Warning (common, usually safe to ignore):
[WARN] Validation completed with schema warnings
  Pages: 1 records, 1 errors
  Sample page errors: data must NOT have additional properties

# This is a known issue with viewportMeta union types
# Archives are still created successfully
# To check severity: use validate command
node packages/cartographer/dist/cli/index.js validate --atls crawl.atls
```

#### 3. Cloudflare Challenge Detection

```bash
# Behavior (normal):
[INFO] Challenge detected on https://example.com (type: cloudflare)
[INFO] Waiting 15 seconds for challenge to resolve...

# This is expected and handled automatically
# Cartographer waits for challenge, then re-captures DOM
# No action needed
```

#### 4. Robots.txt 301 Warnings

```bash
# Warning (usually safe):
[WARN] Unexpected robots.txt status 301 for https://www.example.com

# This happens when site redirects from www to non-www
# Cartographer handles this automatically
# robots.txt decision logged to NDJSON
```

#### 5. Memory Issues

```bash
# Symptom: JavaScript heap out of memory

# Solution 1: Reduce concurrency
--concurrency 3

# Solution 2: Increase Node.js memory
node --max-old-space-size=8192 packages/cartographer/dist/cli/index.js crawl ...

# Solution 3: Use checkpoints for large crawls
--checkpoint 500
```

#### 6. Accessibility Report Export Fails

```bash
# Problem: "Invalid values: Choices: pages, edges, assets, errors"

# Cause: Archive not crawled in full mode
# Solution: Re-crawl with --mode full
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --out audit.atls

# Then export accessibility
node packages/cartographer/dist/cli/index.js export \
  --atls audit.atls \
  --report accessibility \
  --out accessibility.csv
```

### Getting Help

```bash
# Show help for any command
node packages/cartographer/dist/cli/index.js crawl --help
node packages/cartographer/dist/cli/index.js export --help

# Check version
node packages/cartographer/dist/cli/index.js version

# Validate archive integrity
node packages/cartographer/dist/cli/index.js validate --atls crawl.atls
```

### Debug Logging

```bash
# Enable verbose logging
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --logFile ./logs/debug.jsonl \
  --out crawl.atls

# Tail logs in real-time
node packages/cartographer/dist/cli/index.js tail --logFile ./logs/debug.jsonl

# Log events include:
# - robots_decision (robots.txt compliance)
# - page_rendered (render success/failure)
# - challenge_detected (bot protection)
# - error_captured (HTTP errors, timeouts)
```

---

## Exit Codes

Cartographer uses standard exit codes for automation/CI:

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Success | Crawl/export/validation completed successfully |
| 2 | Error Budget Exceeded | Too many errors (--errorBudget) |
| 3 | Browser/Render Error | Fatal browser or rendering failure |
| 4 | Write/IO Error | File system or archive write error |
| 5 | Validation Failed | Archive validation found critical issues |
| 10 | Unknown Error | Unexpected error, check logs |

### Example: CI Integration

```bash
#!/bin/bash
# Automated crawl script for CI

node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://staging.example.com \
  --mode full \
  --maxPages 50 \
  --errorBudget 5 \
  --out ci-crawl.atls \
  --quiet \
  --json > crawl-result.json

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Crawl successful"
  # Run additional checks
elif [ $EXIT_CODE -eq 2 ]; then
  echo "❌ Too many errors, check error budget"
  exit 1
elif [ $EXIT_CODE -eq 4 ]; then
  echo "❌ File write error, check disk space"
  exit 1
else
  echo "❌ Unknown error: $EXIT_CODE"
  exit 1
fi
```

---

## Advanced Topics

### NDJSON Logging Format

Cartographer logs all events in NDJSON format (newline-delimited JSON):

```bash
# Enable logging
--logFile ./logs/crawl.jsonl

# Example events:
{"event":"robots_decision","url":"...","decision":"allowed","reason":"no_robots_txt"}
{"event":"page_rendered","url":"...","statusCode":200,"renderDurationMs":1234}
{"event":"challenge_detected","url":"...","type":"cloudflare","waitTimeMs":15000}
{"event":"error_captured","url":"...","statusCode":404,"message":"Not Found"}
```

### URL Parameter Handling

```bash
# Keep all parameters (default)
--paramPolicy keep

# Remove tracking parameters
--paramPolicy strip
# Removes: gclid, fbclid, msclkid, utm_*, etc.

# Remove all parameters
--paramPolicy strip-all
```

### Custom User Agent

```bash
# Default: CartographerBot/1.0 (+contact:continuum)
# Customize via environment or config (future feature)
```

---

## Quick Reference Card

```bash
# Essential Commands Cheat Sheet

# Basic crawl
cartographer crawl --seeds URL --out FILE.atls --maxPages N

# Full accessibility audit
cartographer crawl --seeds URL --mode full --out FILE.atls

# Export to CSV
cartographer export --atls FILE.atls --report TYPE --out FILE.csv

# Validate archive
cartographer validate --atls FILE.atls

# Polite crawl (respectful)
cartographer crawl --seeds URL --concurrency 1 --rps 1 --out FILE.atls

# Fast crawl (aggressive)
cartographer crawl --seeds URL --mode raw --concurrency 15 --rps 0 --out FILE.atls

# Resume interrupted crawl
cartographer crawl --resume FILE.atls

# JSON output (automation)
cartographer crawl --seeds URL --quiet --json > result.json
```

---

## Additional Resources

- **Codebase Documentation:** `CODEBASE_DOCUMENTATION.md`
- **Atlas SDK Guide:** `packages/atlas-sdk/QUICK_REFERENCE.md`
- **Atlas v1.0 Specification:** `docs/ATLAS_V1_SPECIFICATION.md`
- **WCAG Usage Guide:** `docs/WCAG_USAGE_GUIDE.md` (to be created)
- **Feature Status Matrix:** `FEATURE_STATUS_MATRIX.md`
- **Test Results:** `test-results/` directory

---

**Copyright © 2025 Cai Frazier. All rights reserved.**
