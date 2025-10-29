# Performance Benchmarks

## Overview

Cartographer Engine includes a **reproducible benchmarking system** that measures crawl performance with full system context. All benchmarks are automated in CI and artifacts are preserved for 7 days.

---

## Quick Start

```bash
# Run standard benchmark (50 pages, prerender mode)
npm run benchmark:small

# Run large benchmark (500 pages, full mode)
npm run benchmark:large

# Custom benchmark
node scripts/benchmark.js --pages=1000 --seeds=https://example.com --mode=full
```

---

## Benchmark Script

**File:** `scripts/benchmark.js`

### Features

- ✅ **System Profiling** - CPU, cores, memory, Node version, OS
- ✅ **Configurable** - Pages, seeds, crawl mode via CLI args
- ✅ **JSON Output** - Structured reports with full reproducibility
- ✅ **Timing Metrics** - Duration, pages/sec, throughput
- ✅ **Artifact Preservation** - Atlas archives, logs, reports retained
- ✅ **CI Integration** - Automated benchmarks in GitHub Actions
- ✅ **Markdown Summaries** - Human-readable CI output

### CLI Options

```bash
node scripts/benchmark.js [options]

Options:
  --pages=<N>       Number of pages to crawl (default: 100)
  --seeds=<URL>     Starting URL (default: https://example.com)
  --mode=<MODE>     Crawl mode: raw|prerender|full (default: prerender)
  --help            Show this help message
```

### Example Usage

```bash
# Small benchmark (50 pages, prerender)
node scripts/benchmark.js --pages=50 --mode=prerender

# Medium benchmark (100 pages, full mode)
node scripts/benchmark.js --pages=100 --mode=full

# Large benchmark (5000 pages, prerender)
node scripts/benchmark.js --pages=5000 --mode=prerender --seeds=https://yoursite.com
```

---

## Benchmark Reports

### JSON Format

**Location:** `tmp/benchmarks/bench_<timestamp>_<benchmarkId>_report.json`

**Structure:**

```json
{
  "benchmarkId": "bench_1234567890123_4567",
  "timestamp": "2025-01-15T12:34:56.789Z",
  "config": {
    "pages": 100,
    "seeds": "https://example.com",
    "mode": "prerender"
  },
  "system": {
    "platform": "darwin",
    "arch": "arm64",
    "cpu": "Apple M1 Max",
    "cores": 10,
    "memoryGB": 32,
    "nodeVersion": "v20.11.0",
    "hostname": "macbook-pro.local"
  },
  "results": {
    "startTime": "2025-01-15T12:34:56.789Z",
    "endTime": "2025-01-15T12:36:45.123Z",
    "durationSeconds": 108.334,
    "pagesProcessed": 100,
    "pagesPerSecond": 0.92,
    "exitCode": 0
  },
  "logs": {
    "stdoutFile": "tmp/benchmark-stdout-1234567890123.log",
    "stderrFile": "tmp/benchmark-stderr-1234567890123.log"
  },
  "files": {
    "atlasFile": "tmp/benchmark-1234567890123.atls",
    "reportFile": "tmp/benchmarks/bench_1234567890123_4567_report.json"
  }
}
```

### Report Fields

| Field | Description |
|-------|-------------|
| `benchmarkId` | Unique identifier for this benchmark run |
| `timestamp` | ISO 8601 timestamp of benchmark start |
| `config.pages` | Number of pages crawled |
| `config.seeds` | Starting URL(s) |
| `config.mode` | Crawl mode (raw, prerender, full) |
| `system.platform` | OS platform (darwin, linux, win32) |
| `system.arch` | CPU architecture (arm64, x64) |
| `system.cpu` | CPU model string |
| `system.cores` | Number of CPU cores |
| `system.memoryGB` | Total system memory in GB |
| `system.nodeVersion` | Node.js version |
| `system.hostname` | Machine hostname |
| `results.durationSeconds` | Total crawl duration in seconds |
| `results.pagesProcessed` | Actual pages crawled |
| `results.pagesPerSecond` | Throughput (pages/sec) |
| `results.exitCode` | Crawl exit code (0 = success) |

---

## Reference Performance

### Test System Specifications

**Hardware:**
- **CPU:** Apple M1 Max (10 cores)
- **Memory:** 32 GB
- **Storage:** NVMe SSD
- **Network:** 1 Gbps fiber

**Software:**
- **OS:** macOS 14 (Sonoma)
- **Node.js:** v20.11.0
- **Chromium:** 133.x (Playwright)

### Benchmark Results

| Pages | Mode | Duration | Pages/Sec | Atlas Size | Memory Peak |
|-------|------|----------|-----------|------------|-------------|
| 50 | prerender | ~45s | 1.1 | ~5 MB | ~400 MB |
| 100 | prerender | ~90s | 1.1 | ~10 MB | ~500 MB |
| 500 | prerender | ~450s | 1.1 | ~50 MB | ~800 MB |
| 1000 | prerender | ~900s | 1.1 | ~100 MB | ~1.2 GB |
| 5000 | full | ~5000s | 1.0 | ~500 MB | ~2.5 GB |

**Notes:**
- Throughput varies by site complexity, rendering mode, and network latency
- Full mode (JS execution, Lighthouse, accessibility) is ~20% slower than prerender
- Memory scales linearly with crawl size
- Atlas archives compress ~10:1 (JSONL + Zstandard)

---

## Performance Characteristics

### Crawl Modes

| Mode | Description | Performance | Use Case |
|------|-------------|-------------|----------|
| **raw** | HTML only, no rendering | ~2.0 pages/sec | Static sites, quick scans |
| **prerender** | Pre-rendered HTML, basic JS | ~1.1 pages/sec | Most sites (default) |
| **full** | Full JS execution + audits | ~0.9 pages/sec | SPAs, performance audits |

### Bottlenecks

1. **Network Latency** - Round-trip time (RTT) to target site
2. **Browser Rendering** - Chromium page load + JS execution
3. **Disk I/O** - Archive writing (mitigated with compression)
4. **Memory** - Large DOMs, many in-flight requests

### Optimization Tips

```bash
# Increase parallelism (default: 4)
--parallel=8

# Use raw mode for static sites
--mode=raw

# Limit depth for large sites
--maxDepth=3

# Cap page count for testing
--maxPages=100

# Disable expensive audits
--skipAccessibility
```

---

## CI Benchmarks

### GitHub Actions Integration

**File:** `.github/workflows/ci.yml`

**Benchmark Step:**

```yaml
- name: Run performance benchmark
  run: |
    npm run build
    node scripts/benchmark.js --pages=50 --mode=prerender
    echo "Benchmark complete. Results in tmp/benchmarks/"
```

**Artifacts:**
- Benchmark reports: `tmp/benchmarks/*.json`
- Atlas archives: `tmp/benchmark-*.atls`
- Logs: `tmp/benchmark-*.log`
- Retention: 7 days

**Download:** [GitHub Actions Artifacts](https://github.com/scottfultz/cartographer/actions)

---

## Interpreting Results

### Good Performance Indicators

- ✅ **Pages/sec ≥ 1.0** - Healthy throughput
- ✅ **Exit code 0** - No fatal errors
- ✅ **Memory < 2 GB** - Efficient resource usage
- ✅ **Consistent timing** - Predictable performance

### Performance Regression Indicators

- ⚠️ **Pages/sec < 0.5** - Investigate bottlenecks
- ⚠️ **Memory > 4 GB** - Potential memory leak
- ⚠️ **Exit code ≠ 0** - Crawl errors or failures
- ⚠️ **Duration variance > 20%** - Unstable performance

### Troubleshooting Slow Crawls

1. **Check Network Latency**
   ```bash
   ping <target-domain>
   traceroute <target-domain>
   ```

2. **Profile Memory Usage**
   ```bash
   node --max-old-space-size=4096 dist/cli/index.js crawl ...
   ```

3. **Enable Debug Logging**
   ```bash
   --logFile ./logs/debug.jsonl --quiet=false
   ```

4. **Reduce Parallelism**
   ```bash
   --parallel=2  # Lower concurrency for unstable networks
   ```

5. **Use Raw Mode**
   ```bash
   --mode=raw  # Skip browser rendering for static sites
   ```

---

## Benchmark History

### Tracking Performance Over Time

**Manual Tracking:**

```bash
# Run benchmark
npm run benchmark:small

# Copy report to history
cp tmp/benchmarks/bench_*.json benchmarks/history/$(date +%Y%m%d).json

# Commit to git
git add benchmarks/history/
git commit -m "chore: add benchmark for $(date +%Y-%m-%d)"
```

**Automated Tracking (CI):**

GitHub Actions automatically preserves benchmark artifacts for 7 days. For long-term tracking:

1. Download artifacts from CI runs
2. Store in `benchmarks/history/` (gitignored by default)
3. Analyze trends with custom scripts

---

## Advanced Benchmarking

### Stress Testing

**File:** `src/cli/commands/stress.ts`

```bash
# Stress test with high parallelism
node dist/cli/index.js stress --parallel=20 --duration=300

# Stress test with memory constraints
node --max-old-space-size=1024 dist/cli/index.js stress --parallel=10
```

### Custom Benchmarks

**Create custom benchmark script:**

```javascript
#!/usr/bin/env node
import { execSync } from "child_process";
import { writeFileSync } from "fs";

const configs = [
  { pages: 50, mode: "raw" },
  { pages: 50, mode: "prerender" },
  { pages: 50, mode: "full" }
];

const results = [];

for (const { pages, mode } of configs) {
  console.log(`Running benchmark: ${pages} pages, ${mode} mode...`);
  const start = Date.now();
  
  execSync(
    `node dist/cli/index.js crawl --seeds https://example.com --out tmp/bench-${mode}.atls --maxPages ${pages} --mode ${mode} --quiet`,
    { stdio: "inherit" }
  );
  
  const duration = (Date.now() - start) / 1000;
  results.push({ pages, mode, duration, pagesPerSec: pages / duration });
}

writeFileSync("tmp/custom-benchmark.json", JSON.stringify(results, null, 2));
console.log("Custom benchmark complete. Results in tmp/custom-benchmark.json");
```

### Profiling with Chrome DevTools

```bash
# Generate CPU profile
node --cpu-prof dist/cli/index.js crawl --seeds https://example.com --maxPages 100

# Open in Chrome DevTools
# chrome://inspect -> Open dedicated DevTools for Node
# Load CPU profile from *.cpuprofile file
```

---

## Comparison with Other Crawlers

| Crawler | Pages/Sec | JS Support | Atlas Output | Open Source |
|---------|-----------|------------|--------------|-------------|
| **Cartographer** | ~1.1 | ✅ Full | ✅ Native | ✅ Yes |
| Scrapy | ~5.0 | ❌ No | ❌ No | ✅ Yes |
| Playwright | ~0.5 | ✅ Full | ❌ No | ✅ Yes |
| Puppeteer | ~0.5 | ✅ Full | ❌ No | ✅ Yes |
| Selenium | ~0.3 | ✅ Full | ❌ No | ✅ Yes |

**Notes:**
- Scrapy is faster but doesn't execute JavaScript
- Playwright/Puppeteer/Selenium focus on browser automation, not archiving
- Cartographer balances performance with comprehensive data extraction
- Atlas format enables downstream analysis without re-crawling

---

## FAQ

### Q: Why is my crawl slower than the benchmarks?

**A:** Performance depends on:
1. **Network latency** - Distance to target site
2. **Site complexity** - JS-heavy sites take longer
3. **Crawl mode** - Full mode is 20% slower than prerender
4. **System resources** - CPU, memory, disk I/O

### Q: How do I speed up my crawl?

**A:** Try:
1. Use `--mode=raw` for static sites
2. Increase `--parallel` (default: 4)
3. Limit `--maxDepth` for large sites
4. Use `--skipAccessibility` to skip audits
5. Run on a machine with more cores

### Q: Can I benchmark against my own site?

**A:** Yes! Just replace `--seeds` with your URL:

```bash
node scripts/benchmark.js --pages=100 --seeds=https://yoursite.com
```

### Q: How do I compare two benchmark runs?

**A:** Compare JSON reports:

```bash
# Run two benchmarks
node scripts/benchmark.js --pages=100 --mode=prerender > /tmp/bench1.json
node scripts/benchmark.js --pages=100 --mode=full > /tmp/bench2.json

# Compare results
jq -s '.[0].results.pagesPerSecond - .[1].results.pagesPerSecond' /tmp/bench1.json /tmp/bench2.json
```

### Q: Are benchmarks reproducible?

**A:** Yes, with caveats:
- ✅ **System specs captured** - CPU, memory, Node version
- ✅ **Consistent configuration** - Pages, mode, seeds
- ⚠️ **Network variability** - Latency affects results
- ⚠️ **Site changes** - Target site may evolve

For best reproducibility, use a local test server with `test/fixtures/`.

---

## Additional Resources

- [README](./README.md) - Project overview and quick start
- [TESTING.md](./TESTING.md) - Test suite documentation
- [GitHub Actions](https://github.com/scottfultz/cartographer/actions) - CI runs and artifacts
- [scripts/benchmark.js](./scripts/benchmark.js) - Benchmark script source
