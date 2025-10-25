# Getting Started with Cartographer

**Quick guide to using Cartographer Engine for web crawling and Atlas archive creation.**

---

## Prerequisites

- **Node.js** 20.0.0 or higher
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

---

## Installation

### 1. Clone and Build

```bash
git clone <repository-url>
cd cartographer
npm install
npm run build
```

### 2. Install Browser Dependencies

```bash
# Cartographer uses Playwright's Chromium
npx playwright install chromium
```

---

## Your First Crawl

### Basic Example

Crawl a website with default settings:

```bash
node dist/src/cli/index.js crawl \
  --seeds https://example.com
```

This creates an Atlas archive in `./export/example.com_20251024_153045_prerender.atls`

### Understanding the Output

The crawl produces:
- **Atlas Archive** (.atls) - Compressed ZIP containing all crawled data
- **JSON Summary** - Crawl statistics (pages, errors, completion reason)
- **NDJSON Logs** - Structured event logs in `./logs/`

---

## Common Use Cases

### 1. SEO Audit (Recommended)

Crawl with JavaScript rendering for complete SEO data:

```bash
node dist/src/cli/index.js crawl \
  --seeds https://mysite.com \
  --mode prerender \
  --maxPages 1000 \
  --respectRobots
```

**When to use:** SEO audits, link analysis, metadata extraction

### 2. Accessibility Audit

Full WCAG analysis with accessibility data:

```bash
node dist/src/cli/index.js crawl \
  --seeds https://mysite.com \
  --mode full \
  --maxPages 500
```

**When to use:** WCAG compliance, accessibility testing, detailed audits

### 3. Static Site Crawl

Fast crawling of static HTML without JavaScript:

```bash
node dist/src/cli/index.js crawl \
  --seeds https://mysite.com \
  --mode raw \
  --maxPages 5000
```

**When to use:** Static sites, documentation sites, fast scraping

### 4. Controlled Depth Crawl

Limit how deep the crawler follows links:

```bash
# Crawl only seed pages + 2 levels of links
node dist/src/cli/index.js crawl \
  --seeds https://mysite.com \
  --maxDepth 2 \
  --maxPages 100
```

**When to use:** Testing, sampling, avoiding deep link chains

---

## Understanding Render Modes

| Mode | JavaScript | Speed | Data Collected | Use Case |
|------|-----------|-------|----------------|----------|
| **raw** | ❌ No | Fast | HTML, links, basic metadata | Static sites, fast scraping |
| **prerender** | ✅ Yes | Medium | + Structured data, tech stack, forms | SEO audits, metadata extraction |
| **full** | ✅ Yes | Slow | + WCAG data, accessibility, screenshots | Accessibility audits, compliance |

**Default:** `prerender` (best balance of speed and data)

---

## Exporting Data

### Extract to CSV

Once you have an Atlas archive, export specific data types:

```bash
# Export page data
node dist/src/cli/index.js export \
  --atls mysite.atls \
  --report pages \
  --out pages.csv

# Export link graph
node dist/src/cli/index.js export \
  --atls mysite.atls \
  --report edges \
  --out links.csv

# Export errors
node dist/src/cli/index.js export \
  --atls mysite.atls \
  --report errors \
  --out errors.csv

# Export accessibility data (full mode only)
node dist/src/cli/index.js export \
  --atls mysite.atls \
  --report accessibility \
  --out accessibility.csv
```

### Available Reports

- **pages** - All crawled pages with metadata, SEO data, performance
- **edges** - Internal links between pages (source → target)
- **assets** - Media assets (images, videos, etc.)
- **errors** - All errors encountered during crawl
- **accessibility** - WCAG data (full mode only)

---

## Configuration Tips

### Control Crawl Speed

```bash
# Slower, more polite (3 pages/sec max)
--rps 3

# Faster (10 pages/sec max)
--rps 10

# Control browser tabs
--concurrency 8  # 8 parallel browser tabs
```

### Limit Crawl Scope

```bash
# Limit total pages
--maxPages 1000

# Limit depth
--maxDepth 3  # Seeds + 3 levels of links

# Seeds only (no following links)
--maxDepth 0
```

### Error Handling

```bash
# Stop after 50 errors
--errorBudget 50

# Custom output location
--out ./archives/my-crawl.atls

# Quiet mode (minimal output)
--quiet

# JSON output (for automation)
--json > summary.json
```

---

## Troubleshooting

### "Browser failed to launch"

```bash
# Install Playwright browsers
npx playwright install chromium
```

### "Out of memory" errors

```bash
# Reduce concurrent browser tabs
--concurrency 4

# Crawl smaller batches
--maxPages 100
```

### "Challenge detected" errors

This is normal for sites with Cloudflare or similar protection. Cartographer waits up to 15 seconds for automatic challenge resolution.

If challenges persist:
- Ensure `--mode prerender` is set (enables JavaScript)
- Check if the site blocks automated browsers

### Archive validation failed

```bash
# Manually validate archive
node dist/src/cli/index.js validate --atls mysite.atls

# Check archive contents
unzip -l mysite.atls
```

---

## Next Steps

- **[README.md](README.md)** - Complete CLI reference and advanced features
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Learn the codebase architecture
- **[FEATURES.md](FEATURES.md)** - Full feature list and implementation status
- **[Atlas SDK](packages/atlas-sdk/QUICK_REFERENCE.md)** - Read archives programmatically

---

## Quick Reference Card

```bash
# Basic crawl
node dist/src/cli/index.js crawl --seeds <url>

# SEO audit
node dist/src/cli/index.js crawl --seeds <url> --mode prerender --maxPages 1000

# Accessibility audit
node dist/src/cli/index.js crawl --seeds <url> --mode full --maxPages 500

# Export pages to CSV
node dist/src/cli/index.js export --atls <file.atls> --report pages --out pages.csv

# Validate archive
node dist/src/cli/index.js validate --atls <file.atls>

# Run tests
npm test
```

---

**Copyright © 2025 Cai Frazier. All rights reserved.**
