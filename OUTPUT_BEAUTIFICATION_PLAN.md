# Debug Output Beautification Plan

**Goal:** Transform wall-of-text debug output into scannable, visually organized, color-coded output  
**Date:** October 25, 2025  
**Priority:** Enhancement (post-beta release)  
**Estimated Effort:** 4-6 hours

---

## Current State Analysis

### Problems Identified

```
[22:16:29] [INFO] {"event":"robots_decision","url":"https://www.rpmsunstate.com/houses-rent","origin":"https://www.rpmsunstate.com","decision":"allowed","reason":"robots_allowed","userAgent":"CartographerBot/1.0 (+contact:continuum)","path":"/houses-rent"}
[22:16:29] [INFO] [Metrics] 0.40 p/s | RSS: 535 MB | Queue: 0 | Pages: 2 | Edges: 156 | Assets: 46 | Errors: 0
[t=00:36] q=0 in=1 done=2 err=0 rps≈0.05  [22:16:31] [WARN] [Renderer] Challenge page detected for https://www.rpmsunstate.com/houses-rent. Attempting smart wait (15s)...
[22:16:31] [INFO] [Renderer] prerender https://www.rpmsunstate.com/houses-rent → 1671ms networkidle
[22:16:31] [INFO] [Scheduler] Captured 4 structured data items on https://www.rpmsunstate.com/houses-rent (types: Organization, OpenGraph, OpenGraph:article, TwitterCard)
[22:16:31] [INFO] [Scheduler] Detected 11 technologies on https://www.rpmsunstate.com/houses-rent: WordPress, MySQL, PHP, Yoast SEO, WP Engine, Typekit, Google Tag Manager, Cloudflare, Ahrefs, Adobe Fonts, HTTP/3
[22:16:31] [INFO] [Crawl] depth=1 https://www.rpmsunstate.com/houses-rent → 200 (networkidle) render=1671ms edges=73 assets=21 total=2621ms
```

**Issues:**
1. ❌ Dense JSON logs mixed with human-readable logs
2. ❌ Inline progress ticker `[t=00:36] q=0 in=1...` interrupts flow
3. ❌ Long URLs make lines wrap awkwardly
4. ❌ No visual separation between log entries
5. ❌ Important data buried in middle of lines
6. ❌ No color differentiation beyond log level
7. ❌ Multiple timestamps/formats (HH:MM:SS and elapsed time)
8. ❌ List items (technologies, schemas) as comma-separated text

---

## Design Goals

### Visual Hierarchy
1. **Clear sections** for different log types
2. **Grouped related information** (page crawl + extraction + links)
3. **Highlighted critical data** (status codes, timings, counts)
4. **Scannable summaries** at top of sections

### Whitespace & Separators
1. **Blank lines** between unrelated log entries
2. **Box characters** for important sections
3. **Indentation** for nested/related data
4. **Alignment** for tabular data

### Color Coding
1. **URLs**: Cyan (easily identifiable)
2. **Status codes**: Green (2xx), Yellow (3xx/4xx), Red (5xx)
3. **Timings**: Magenta (performance-related)
4. **Counts**: Blue (metrics)
5. **Warnings**: Yellow background for alerts
6. **Success indicators**: Green checkmarks ✓
7. **Data values**: Bright white for emphasis

### Compact vs Verbose Modes
1. **Compact** (default): One-line summaries with key metrics
2. **Verbose** (`--verbose` flag): Expanded details, lists, extraction data
3. **Debug** (existing `--logLevel debug`): Everything including internal state

---

## Proposed Output Examples

### Example 1: Page Crawl (Compact Mode)

**Current:**
```
[22:16:31] [INFO] [Crawl] depth=1 https://www.rpmsunstate.com/houses-rent → 200 (networkidle) render=1671ms edges=73 assets=21 total=2621ms
```

**Proposed:**
```
[22:16:31] ✓ https://rpmsunstate.com/houses-rent
           200 OK • 1.7s render • 73 edges • 21 assets • depth:1
```

### Example 2: Page Crawl (Verbose Mode)

**Proposed:**
```
╭─────────────────────────────────────────────────────────────────────────
│ [22:16:31] ✓ Page Crawled
│ 
│ URL:        https://rpmsunstate.com/houses-rent
│ Status:     200 OK
│ Depth:      1 (from /houses-rent)
│ Mode:       prerender → networkidle
│ 
│ Timings:
│   Render:   1,671 ms
│   Extract:  284 ms
│   Write:    112 ms
│   Total:    2,621 ms
│ 
│ Discoveries:
│   Links:    73 internal, 5 external
│   Assets:   21 resources
│ 
│ Extracted:
│   ✓ 11 technologies  (WordPress, MySQL, PHP, Yoast SEO, WP Engine...)
│   ✓ 4 schemas        (Organization, OpenGraph, OpenGraph:article, TwitterCard)
│   ✓ OpenGraph        (5 properties)
│   ✓ Twitter Card     (3 properties)
│   ✓ 180 words        (h1: "Houses for Rent")
╰─────────────────────────────────────────────────────────────────────────
```

### Example 3: Metrics Update (Compact)

**Current:**
```
[22:16:29] [INFO] [Metrics] 0.40 p/s | RSS: 535 MB | Queue: 0 | Pages: 2 | Edges: 156 | Assets: 46 | Errors: 0
```

**Proposed:**
```
┌─ [00:36] ──────────────────────────────────────┐
│  2 pages  •  156 edges  •  46 assets  •  0 err  │
│  0.40 p/s  •  535 MB RSS  •  Queue: 0           │
└───────────────────────────────────────────────────┘
```

### Example 4: Cloudflare Challenge (Warning)

**Current:**
```
[22:16:31] [WARN] [Renderer] Challenge page detected for https://www.rpmsunstate.com/houses-rent. Attempting smart wait (15s)...
[22:16:31] [INFO] [Renderer] Challenge resolved for https://www.rpmsunstate.com/houses-rent. Re-capturing DOM...
```

**Proposed:**
```
[22:16:31] ⚠️  Cloudflare Challenge
           https://rpmsunstate.com/houses-rent
           Waiting 15s... ✓ Resolved

```

### Example 5: Error (Critical)

**Current:**
```
[22:16:45] [ERROR] [Scheduler] Failed to fetch https://example.com/broken: ECONNREFUSED
```

**Proposed:**
```
╭─ ❌ ERROR ─────────────────────────────────────────╮
│ [22:16:45] Failed to fetch page                    │
│                                                     │
│ URL:    https://example.com/broken                 │
│ Error:  ECONNREFUSED (Connection refused)          │
│ Retry:  3/3 attempts exhausted                     │
│                                                     │
│ This error counts toward your budget (5/100)       │
╰─────────────────────────────────────────────────────╯
```

### Example 6: Startup Banner

**Proposed:**
```
╔═════════════════════════════════════════════════════════════════════╗
║                      Cartographer v1.0.0-beta.1                     ║
║                   Atlas Archive Crawler by Cai Frazier              ║
╚═════════════════════════════════════════════════════════════════════╝

Configuration:
  Seeds:        https://rpmsunstate.com
  Mode:         prerender (Cloudflare stealth enabled)
  Concurrency:  8 browsers
  Rate Limit:   2 req/s per host
  Max Pages:    unlimited
  Max Depth:    unlimited
  Output:       ./archive/rpmsunstate-fixed.atls

Starting crawl...

```

### Example 7: Progress Ticker (Inline, Non-Intrusive)

**Current:**
```
[t=00:36] q=0 in=1 done=2 err=0 rps≈0.05
```

**Proposed (stays on same line, updates in place):**
```
[00:36] ⏱  2 pages • 0.40 p/s • Queue: 0 • RSS: 535 MB      
```

### Example 8: Final Summary

**Proposed:**
```
╔═══════════════════════════════════════════════════════════════════╗
║                        CRAWL COMPLETE ✓                           ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Duration:        40m 5s                                          ║
║  Pages Crawled:   306                                             ║
║  Edges Found:     23,439                                          ║
║  Assets:          6,826                                           ║
║  Errors:          0 (budget: 100)                                 ║
║                                                                   ║
║  Performance:                                                     ║
║    Throughput:    0.13 pages/sec                                  ║
║    Memory:        Peak 828 MB, Avg 627 MB                         ║
║    Depth:         Max depth-6 reached                             ║
║                                                                   ║
║  Archive:                                                         ║
║    File:          ./archive/rpmsunstate-fixed.atls                ║
║    Size:          549 KB (compressed)                             ║
║    Validated:     ✓ Schema compliant (0 errors)                   ║
║                                                                   ║
║  Technologies:    306/306 pages (100%)                            ║
║  OpenGraph:       306/306 pages (100%)                            ║
║  Structured Data: 918 schemas across 306 pages                    ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Next steps:
  • Validate:  cartographer validate --atls rpmsunstate-fixed.atls
  • Export:    cartographer export --atls rpmsunstate-fixed.atls --report pages
  • Analyze:   Open with Atlas SDK (see packages/atlas-sdk/QUICK_REFERENCE.md)
```

---

## Implementation Plan

### Phase 1: New Logging Infrastructure (2 hours)

**File:** `packages/cartographer/src/utils/prettyLog.ts` (NEW)

```typescript
/**
 * Pretty logging utilities with colors, boxes, and formatting
 */
import pc from "picocolors";

export type OutputMode = "compact" | "verbose" | "minimal";

interface PrettyLogConfig {
  mode: OutputMode;
  colors: boolean; // Auto-detect TTY
  maxUrlLength: number; // Truncate long URLs
}

export class PrettyLogger {
  private config: PrettyLogConfig;
  
  // Box drawing characters
  private static BOX = {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
    doubleTop: "╔",
    doubleBottom: "╚",
    doubleHorizontal: "═",
    doubleVertical: "║",
  };
  
  // Icons
  private static ICONS = {
    success: "✓",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    timer: "⏱",
    link: "→",
    bullet: "•",
  };
  
  constructor(config: Partial<PrettyLogConfig> = {}) {
    this.config = {
      mode: config.mode || "compact",
      colors: config.colors ?? process.stdout.isTTY,
      maxUrlLength: config.maxUrlLength || 60,
    };
  }
  
  /**
   * Format a URL with truncation and color
   */
  formatUrl(url: string, maxLength?: number): string {
    const max = maxLength || this.config.maxUrlLength;
    const truncated = url.length > max 
      ? url.substring(0, max - 3) + "..." 
      : url;
    return this.config.colors ? pc.cyan(truncated) : truncated;
  }
  
  /**
   * Format a status code with color
   */
  formatStatus(code: number): string {
    const text = `${code}`;
    if (!this.config.colors) return text;
    
    if (code >= 200 && code < 300) return pc.green(text);
    if (code >= 300 && code < 400) return pc.yellow(text);
    if (code >= 400 && code < 500) return pc.yellow(text);
    if (code >= 500) return pc.red(text);
    return text;
  }
  
  /**
   * Format a timing value
   */
  formatTiming(ms: number): string {
    const text = ms >= 1000 
      ? `${(ms / 1000).toFixed(1)}s`
      : `${ms}ms`;
    return this.config.colors ? pc.magenta(text) : text;
  }
  
  /**
   * Format a count/metric
   */
  formatCount(n: number): string {
    const text = n.toLocaleString();
    return this.config.colors ? pc.blue(text) : text;
  }
  
  /**
   * Draw a box around content
   */
  box(content: string[], title?: string): string {
    const width = Math.max(...content.map(l => l.length), title?.length || 0) + 4;
    const B = PrettyLogger.BOX;
    
    const lines = [
      B.topLeft + B.horizontal.repeat(width - 2) + B.topRight,
    ];
    
    if (title) {
      const padding = Math.floor((width - title.length - 4) / 2);
      lines.push(B.vertical + " ".repeat(padding) + title + " ".repeat(width - padding - title.length - 2) + B.vertical);
      lines.push(B.vertical + B.horizontal.repeat(width - 2) + B.vertical);
    }
    
    for (const line of content) {
      lines.push(B.vertical + " " + line + " ".repeat(width - line.length - 3) + B.vertical);
    }
    
    lines.push(B.bottomLeft + B.horizontal.repeat(width - 2) + B.bottomRight);
    
    return lines.join("\n");
  }
  
  /**
   * Log a page crawl in compact format
   */
  logPageCompact(data: PageCrawlData): void {
    const { url, status, renderMs, edges, assets, depth } = data;
    const icon = status >= 200 && status < 400 ? PrettyLogger.ICONS.success : PrettyLogger.ICONS.error;
    
    console.error(
      `           ${icon} ${this.formatUrl(url)}\n` +
      `           ${this.formatStatus(status)} ${status >= 200 && status < 300 ? 'OK' : ''} ` +
      `${PrettyLogger.ICONS.bullet} ${this.formatTiming(renderMs)} render ` +
      `${PrettyLogger.ICONS.bullet} ${this.formatCount(edges)} edges ` +
      `${PrettyLogger.ICONS.bullet} ${this.formatCount(assets)} assets ` +
      `${PrettyLogger.ICONS.bullet} depth:${depth}`
    );
  }
  
  /**
   * Log a page crawl in verbose format
   */
  logPageVerbose(data: PageCrawlData): void {
    const content = [
      `URL:        ${data.url}`,
      `Status:     ${this.formatStatus(data.status)} ${data.statusText || 'OK'}`,
      `Depth:      ${data.depth}${data.discoveredFrom ? ` (from ${data.discoveredFrom})` : ''}`,
      `Mode:       ${data.mode} → ${data.navEndReason}`,
      ``,
      `Timings:`,
      `  Render:   ${this.formatTiming(data.renderMs)}`,
      `  Extract:  ${this.formatTiming(data.extractMs || 0)}`,
      `  Write:    ${this.formatTiming(data.writeMs || 0)}`,
      `  Total:    ${this.formatTiming(data.totalMs || 0)}`,
      ``,
      `Discoveries:`,
      `  Links:    ${this.formatCount(data.edges)} internal, ${this.formatCount(data.externalLinks || 0)} external`,
      `  Assets:   ${this.formatCount(data.assets)} resources`,
    ];
    
    if (data.technologies && data.technologies.length > 0) {
      content.push(``);
      content.push(`Extracted:`);
      content.push(`  ${PrettyLogger.ICONS.success} ${data.technologies.length} technologies  (${data.technologies.slice(0, 5).join(", ")}${data.technologies.length > 5 ? "..." : ""})`);
    }
    
    if (data.schemas && data.schemas.length > 0) {
      content.push(`  ${PrettyLogger.ICONS.success} ${data.schemas.length} schemas        (${data.schemas.join(", ")})`);
    }
    
    console.error("\n" + this.box(content, "Page Crawled"));
  }
  
  /**
   * Log metrics update
   */
  logMetrics(data: MetricsData): void {
    const { elapsed, pages, edges, assets, errors, pagesPerSec, rssMB, queue } = data;
    
    const [mm, ss] = [
      Math.floor(elapsed / 60).toString().padStart(2, '0'),
      (elapsed % 60).toString().padStart(2, '0')
    ];
    
    console.error(
      `┌─ [${mm}:${ss}] ` + "─".repeat(38) + "┐\n" +
      `│  ${this.formatCount(pages)} pages  ${PrettyLogger.ICONS.bullet}  ` +
      `${this.formatCount(edges)} edges  ${PrettyLogger.ICONS.bullet}  ` +
      `${this.formatCount(assets)} assets  ${PrettyLogger.ICONS.bullet}  ` +
      `${errors > 0 ? pc.red(errors.toString()) : '0'} err  │\n` +
      `│  ${pagesPerSec.toFixed(2)} p/s  ${PrettyLogger.ICONS.bullet}  ` +
      `${rssMB} MB RSS  ${PrettyLogger.ICONS.bullet}  Queue: ${queue}           │\n` +
      `└${"─".repeat(43)}┘`
    );
  }
  
  /**
   * Log startup banner
   */
  logBanner(config: CrawlConfig): void {
    const B = PrettyLogger.BOX;
    const width = 71;
    
    console.error(
      `${B.doubleTop}${"═".repeat(width - 2)}${B.doubleTop}\n` +
      `${B.doubleVertical}${" ".repeat(20)}Cartographer v1.0.0-beta.1${" ".repeat(20)}${B.doubleVertical}\n` +
      `${B.doubleVertical}${" ".repeat(17)}Atlas Archive Crawler by Cai Frazier${" ".repeat(16)}${B.doubleVertical}\n` +
      `${B.doubleBottom}${"═".repeat(width - 2)}${B.doubleBottom}\n\n` +
      `Configuration:\n` +
      `  Seeds:        ${config.seeds.join(", ")}\n` +
      `  Mode:         ${config.mode}${config.stealth ? ' (Cloudflare stealth enabled)' : ''}\n` +
      `  Concurrency:  ${config.concurrency} browsers\n` +
      `  Rate Limit:   ${config.rps} req/s per host\n` +
      `  Max Pages:    ${config.maxPages > 0 ? config.maxPages.toLocaleString() : 'unlimited'}\n` +
      `  Max Depth:    ${config.maxDepth >= 0 ? config.maxDepth : 'unlimited'}\n` +
      `  Output:       ${config.outAtls}\n\n` +
      `Starting crawl...\n`
    );
  }
}

// Type definitions
interface PageCrawlData {
  url: string;
  status: number;
  statusText?: string;
  renderMs: number;
  extractMs?: number;
  writeMs?: number;
  totalMs?: number;
  edges: number;
  externalLinks?: number;
  assets: number;
  depth: number;
  discoveredFrom?: string;
  mode: string;
  navEndReason: string;
  technologies?: string[];
  schemas?: string[];
}

interface MetricsData {
  elapsed: number;
  pages: number;
  edges: number;
  assets: number;
  errors: number;
  pagesPerSec: number;
  rssMB: number;
  queue: number;
}

interface CrawlConfig {
  seeds: string[];
  mode: string;
  stealth: boolean;
  concurrency: number;
  rps: number;
  maxPages: number;
  maxDepth: number;
  outAtls: string;
}
```

### Phase 2: Integrate into Scheduler (1 hour)

**File:** `packages/cartographer/src/core/scheduler.ts`

**Changes:**
1. Import PrettyLogger
2. Add `--verbose` flag to CLI options
3. Replace wall-of-text logs with pretty logs
4. Keep structured JSONL events unchanged (for automation)

**Example integration:**
```typescript
import { PrettyLogger } from "../utils/prettyLog.js";

// In scheduler constructor:
this.prettyLogger = new PrettyLogger({
  mode: config.cli?.verbose ? "verbose" : "compact",
  colors: !config.cli?.noColor,
});

// Replace this:
log('info', `[Crawl] depth=${item.depth} ${item.url} → ${fetchResult.statusCode} (${renderResult.navEndReason}) render=${renderResult.renderMs}ms edges=${internalEdges.length} assets=${assetsResult.assets.length} total=${totalMs}ms`);

// With this:
if (!config.cli?.json) { // Don't pretty-print in JSON mode
  this.prettyLogger.logPageCompact({
    url: item.url,
    status: fetchResult.statusCode,
    renderMs: renderResult.renderMs,
    edges: internalEdges.length,
    assets: assetsResult.assets.length,
    depth: item.depth,
  });
}

// Still emit structured event for automation:
logEvent({ ... });
```

### Phase 3: Metrics Display (1 hour)

**File:** `packages/cartographer/src/utils/metrics.ts`

**Changes:**
1. Replace single-line metrics with boxed metrics
2. Add inline progress ticker (updates in place)
3. Color-code important thresholds (errors, memory warnings)

### Phase 4: CLI Integration (30 min)

**File:** `packages/cartographer/src/cli/commands/crawl.ts`

**Changes:**
1. Add `--verbose` flag
2. Add `--no-color` flag
3. Add startup banner (unless `--quiet` or `--json`)
4. Add final summary (unless `--quiet` or `--json`)

### Phase 5: Error Formatting (30 min)

**File:** `packages/cartographer/src/core/scheduler.ts` (error handling)

**Changes:**
1. Format errors in boxes with context
2. Show retry attempts
3. Display error budget status
4. Provide actionable suggestions

### Phase 6: Special Events (1 hour)

**Special formatting for:**
1. Cloudflare challenges (warning box, resolved indicator)
2. Robots.txt decisions (compact, collapsed by default)
3. Checkpoint saves (minimal, non-intrusive)
4. Shutdown/resume (clear status updates)

---

## CLI Flags

### New Flags

```bash
--verbose          Enable verbose output with detailed extraction data
--no-color         Disable colored output (for logs/automation)
--minimal          Minimal output: only errors and final summary
--chime            Play a sound when crawl completes (default: off)
```

### Interaction with Existing Flags

```bash
--quiet            Suppress all output except errors (overrides --verbose)
--json             Machine-readable JSON output (overrides pretty formatting)
--logLevel debug   Full debug logs (no pretty formatting, raw output)
--chime            Independent of other flags, plays sound on completion
```

### Priority Order

```
--json > --quiet > --logLevel debug > --verbose > --minimal > (default compact)
```

---

## Testing Strategy

### Visual Tests

```bash
# Test compact mode (default)
cartographer crawl --seeds https://example.com --maxPages 5

# Test verbose mode
cartographer crawl --seeds https://example.com --maxPages 5 --verbose

# Test minimal mode
cartographer crawl --seeds https://example.com --maxPages 5 --minimal

# Test no-color mode
cartographer crawl --seeds https://example.com --maxPages 5 --no-color

# Test JSON mode (should bypass pretty logging)
cartographer crawl --seeds https://example.com --maxPages 5 --json

# Test quiet mode (should show only errors)
cartographer crawl --seeds https://example.com --maxPages 5 --quiet
```

### Automated Tests

```typescript
// Test that pretty logger doesn't break JSON mode
test("JSON mode bypasses pretty logging", () => {
  const output = runCrawl({ json: true });
  expect(output).not.toContain("╭");
  expect(output).not.toContain("✓");
  expect(() => JSON.parse(output)).not.toThrow();
});

// Test that --no-color strips ANSI codes
test("no-color flag removes ANSI codes", () => {
  const output = runCrawl({ noColor: true });
  expect(output).not.toMatch(/\x1b\[[0-9;]*m/);
});
```

---

## Performance Considerations

### Concerns

1. **Box drawing overhead**: Drawing boxes for every log entry could slow output
2. **Color codes**: ANSI escape codes add bytes to output
3. **String formatting**: Complex formatting operations per log entry

### Mitigations

1. **Lazy formatting**: Only format when not in JSON/quiet mode
2. **Buffering**: Batch log entries when possible
3. **Compact by default**: Verbose mode is opt-in
4. **Cache common strings**: Pre-format box characters, icons
5. **Profile before/after**: Measure actual impact on crawl speed

### Benchmarks to Run

```bash
# Before (current):
time cartographer crawl --seeds https://example.com --maxPages 100 --quiet

# After (compact):
time cartographer crawl --seeds https://example.com --maxPages 100

# After (verbose):
time cartographer crawl --seeds https://example.com --maxPages 100 --verbose
```

**Expected Impact**: <2% overhead in compact mode, <5% in verbose mode

---

## Backwards Compatibility

### Preserved

1. ✅ JSON output (`--json`) unchanged
2. ✅ NDJSON log files unchanged
3. ✅ Structured events unchanged
4. ✅ Exit codes unchanged
5. ✅ Programmatic API unchanged

### Changed (Output Only)

1. ⚠️ Human-readable console output format
2. ⚠️ Metrics display format
3. ⚠️ Error message format

**Migration Path:** Users parsing console output should use `--json` flag

---

## Documentation Updates

### Files to Update

1. **README.md**: Add `--verbose`, `--no-color`, `--minimal` flags
2. **CODEBASE_DOCUMENTATION.md**: Document PrettyLogger class
3. **CLI help text**: Update `--help` output

### Example Section

```markdown
## Output Modes

Cartographer offers multiple output modes to suit different use cases:

### Compact (Default)
One-line summaries with key metrics. Ideal for watching crawl progress.
```bash
cartographer crawl --seeds https://example.com
```

### Verbose
Detailed extraction data with boxes and formatting. Ideal for debugging.
```bash
cartographer crawl --seeds https://example.com --verbose
```

### Minimal
Only errors and final summary. Ideal for automation.
```bash
cartographer crawl --seeds https://example.com --minimal
```

### JSON
Machine-readable output for automation.
```bash
cartographer crawl --seeds https://example.com --json
```

### Quiet
Suppress all output except errors.
```bash
cartographer crawl --seeds https://example.com --quiet
```
```

---

## Rollout Plan

### Stage 1: Post-Beta Release (v1.0.1)
- Implement PrettyLogger class
- Add `--verbose` flag
- Keep compact mode close to current format
- Document new flags

### Stage 2: Minor Release (v1.1.0)
- Enhance verbose mode with boxes
- Add startup banner
- Add final summary
- Improve error formatting

### Stage 3: Polish (v1.1.1)
- Add `--minimal` mode
- Add `--no-color` flag
- Optimize performance
- Collect user feedback

### Stage 4: Full Feature (v1.2.0)
- Inline progress ticker
- Enhanced metrics display
- Special event formatting
- Complete documentation

---

## Open Questions

1. **Unicode support**: Should we detect terminal capabilities and fall back to ASCII?
2. **Width detection**: Should we respect terminal width for wrapping?
3. **Paging**: Should very long outputs (like technology lists) be paginated?
4. **Themes**: Should users be able to customize colors?
5. **Export formats**: Should we support exporting pretty logs to HTML?

---

## Success Metrics

### Before

- User feedback: "Wall of text, hard to read"
- Time to find key info: ~10-15 seconds
- Error visibility: Poor (buried in logs)

### After

- User feedback: "Clean, scannable, professional"
- Time to find key info: ~2-3 seconds
- Error visibility: Excellent (highlighted, boxed)

### Measurements

1. **User Survey**: Rate readability 1-10
2. **Task Completion**: "Find the error that caused crawl to stop" (time)
3. **Adoption**: % of users using `--verbose` flag
4. **Bug Reports**: Reduction in "hard to debug" issues

---

## References

### Similar Tools

- **httrack**: Simple progress bar, minimal output
- **wget**: Traditional text output, good error messages
- **scrapy**: Colored logs, tree-style output
- **lighthouse**: Detailed reports with colors and symbols

### UI Libraries (for future)

- **cli-table3**: ASCII tables for tabular data
- **ora**: Spinners and progress indicators
- **boxen**: Box drawing utilities
- **chalk**: Terminal colors (alternative to picocolors)

---

## Notes

- Keep JSON mode pristine for automation
- Default (compact) should be close to current to avoid breaking scripts
- Verbose mode is where we can be creative
- Performance must not regress >2% for compact mode
- All pretty formatting must respect `--no-color` flag
- TTY detection should auto-disable pretty logging when piped

---

**Status:** DRAFT - Ready for implementation after v1.0.0-beta.1 release  
**Owner:** Cai Frazier  
**Reviewers:** (TBD after beta release user feedback)
