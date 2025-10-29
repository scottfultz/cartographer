# Cartographer Feature Audit - Quick Checklist
**Purpose:** Quick reference for systematic feature validation  
**Use:** Check off items as you validate them

---

## 🎯 Commands (7 total)

- [ ] **crawl** - Main crawler ⭐ CRITICAL
  - [ ] Basic crawl (1 seed, mode=full, maxPages=5)
  - [ ] Multiple seeds
  - [ ] All render modes (raw, prerender, full)
  - [ ] Depth control (0, 1, 2, -1)
  - [ ] Resume from checkpoint
  
- [ ] **export** - CSV extraction ⭐ CRITICAL
  - [ ] Pages export
  - [ ] Edges export
  - [ ] Assets export
  - [ ] Errors export
  - [ ] Accessibility export (KNOWN BROKEN)
  
- [ ] **validate** - Archive validation ⭐ CRITICAL
  - [ ] Valid archive
  - [ ] Corrupted archive
  - [ ] Schema validation
  
- [ ] **diff** - Archive comparison ⚠️ UNKNOWN STATUS
  - [ ] URL set changes
  - [ ] Content changes
  - [ ] Performance regression
  
- [ ] **stress** - Load testing ⚠️ UNKNOWN STATUS
  - [ ] Memory leak detection
  - [ ] Performance metrics
  
- [ ] **tail** - Log monitoring ⚠️ UNKNOWN STATUS
  - [ ] Real-time streaming
  - [ ] Format parsing
  
- [ ] **version** - Version info ✅ TRIVIAL
  - [ ] Displays version correctly

---

## 🎨 Render Modes (3 modes)

- [ ] **raw** - Static HTML only
  - [ ] Fast crawling
  - [ ] No JavaScript execution
  - [ ] Basic data collection
  
- [ ] **prerender** - SEO-focused
  - [ ] JavaScript execution
  - [ ] SEO metadata
  - [ ] Link discovery
  
- [ ] **full** - Complete audit ⭐ DEFAULT
  - [ ] Full JavaScript
  - [ ] Screenshots (desktop + mobile)
  - [ ] Accessibility data
  - [ ] WCAG audit data
  - [ ] DOM snapshots
  - [ ] Favicons

---

## 📊 Data Collection (11 datasets)

- [ ] **Pages** - Core page data ⭐ CRITICAL
  - [ ] URL normalization
  - [ ] Status codes
  - [ ] Redirects
  - [ ] SEO metadata (title, description, h1)
  - [ ] Hashes (raw, DOM)
  - [ ] Render timing
  - [ ] Technology detection
  
- [ ] **Edges** - Link relationships
  - [ ] Source → target mapping
  - [ ] Edge location (nav, header, footer, etc.)
  - [ ] Anchor text
  - [ ] Depth tracking
  
- [ ] **Assets** - Media resources
  - [ ] Images, CSS, JS, fonts
  - [ ] Size tracking
  - [ ] Asset types
  - [ ] Truncation at 1000 assets/page
  
- [ ] **Errors** - Failures
  - [ ] HTTP errors (4xx, 5xx)
  - [ ] Timeouts
  - [ ] Network errors
  - [ ] Render failures
  
- [ ] **Accessibility** - WCAG data ⭐ NEW FEATURES
  - [ ] Basic accessibility (all modes)
  - [ ] WCAG 2.1 data (full mode)
  - [ ] Color contrast (full mode)
  - [ ] 6 new WCAG enhancements (UNTESTED)
  
- [ ] **Console** - Browser logs
  - [ ] console.log, warn, error
  - [ ] JavaScript errors
  - [ ] Network errors
  
- [ ] **Structured Data** - Schema markup
  - [ ] JSON-LD
  - [ ] OpenGraph
  - [ ] Twitter Cards
  
- [ ] **Screenshots** - Visual capture
  - [ ] Desktop viewport
  - [ ] Mobile viewport
  - [ ] Quality settings (1-100)
  - [ ] Format (jpeg, png)
  
- [ ] **Favicons** - Site icons
  - [ ] Link tag discovery
  - [ ] /favicon.ico fallback
  - [ ] Multiple formats
  
- [ ] **DOM Snapshots** - HTML preservation
  - [ ] Full HTML capture
  - [ ] Input redaction
  - [ ] Form redaction
  
- [ ] **Network Logs** - Request/response
  - [ ] Request headers
  - [ ] Response headers
  - [ ] Timing data
  - [ ] Replay tier capture

---

## ⚙️ Configuration Options (~60 options)

### Input/Output (5 options)
- [ ] --seeds (required)
- [ ] --out (auto-generated)
- [ ] --profile (core, full)
- [ ] --mode (DEPRECATED)
- [ ] --replayTier (html, html+css, full)

### Crawl Control (6 options) ⭐ CRITICAL
- [ ] --maxPages (0 = unlimited)
- [ ] --maxDepth (0/1/-1)
- [ ] --maxBytesPerPage
- [ ] --timeout (30000ms)
- [ ] --rps (3)
- [ ] --concurrency (8)

### Robots.txt (3 options)
- [ ] --respectRobots (true)
- [ ] --overrideRobots (false)
- [ ] --userAgent

### URL Filtering (2 options)
- [ ] --allowUrls (glob/regex)
- [ ] --denyUrls (glob/regex)

### Session & Stealth (2 options)
- [ ] --persistSession (false)
- [ ] --stealth (false) ⚠️ REQUIRES playwright-extra

### Screenshots (4 options)
- [ ] --noScreenshots (false)
- [ ] --screenshotQuality (80)
- [ ] --screenshotFormat (jpeg)
- [ ] --noFavicons (false)

### Privacy (4 options)
- [ ] --stripCookies (true)
- [ ] --stripAuthHeaders (true)
- [ ] --redactInputs (true)
- [ ] --redactForms (true)

### Resume (2 options)
- [ ] --resume (path)
- [ ] --checkpointInterval (500)

### Error Handling (1 option)
- [ ] --maxErrors (-1 = unlimited)

### Output Control (6 options)
- [ ] --quiet (false)
- [ ] --json (false)
- [ ] --verbose (false)
- [ ] --minimal (false)
- [ ] --noColor (false)
- [ ] --chime (false)

### Logging (2 options)
- [ ] --logFile (logs/crawl-<crawlId>.jsonl)
- [ ] --logLevel (info)

### Archive (2 options)
- [ ] --validateArchive (true)
- [ ] --force (false)

---

## 🧪 WCAG Enhancements (6 features) ⚠️ UNTESTED

- [ ] **Multiple Ways** (WCAG 2.4.5)
  - [ ] Site map detection
  - [ ] Search form detection
  - [ ] Breadcrumb detection
  
- [ ] **Sensory Characteristics** (WCAG 1.3.3)
  - [ ] Shape references ("round button")
  - [ ] Size references ("large link")
  - [ ] Location references ("at the top")
  - [ ] Color references ("red button")
  
- [ ] **Images of Text** (WCAG 1.4.5)
  - [ ] Filename pattern detection
  - [ ] Alt text length heuristic
  - [ ] Common patterns (logo, badge, etc.)
  
- [ ] **Navigation Elements** (WCAG 3.2.3)
  - [ ] Main nav extraction
  - [ ] Header nav extraction
  - [ ] Footer nav extraction
  - [ ] ❌ Cross-page analyzer NOT built
  
- [ ] **Component Identification** (WCAG 3.2.4)
  - [ ] Button extraction
  - [ ] Link extraction
  - [ ] Icon extraction
  - [ ] ❌ Cross-page analyzer NOT built
  
- [ ] **Pointer Cancellation** (WCAG 2.5.2)
  - [ ] Mousedown handler detection
  - [ ] Touchstart handler detection
  - [ ] Suspicious pattern flagging
  
- [ ] **On-Focus Context Change** (WCAG 3.2.1)
  - [ ] Focus handler detection
  - [ ] New window detection

---

## 🚨 Known Issues

### Critical
- [ ] ❌ Accessibility CSV export not implemented
- [ ] ❌ Cross-page WCAG analyzer not built (3.2.3, 3.2.4 blocked)

### High
- [ ] ⚠️ WCAG enhancements have NO test coverage
- [ ] ⚠️ Diff command status unknown
- [ ] ⚠️ Stress command status unknown
- [ ] ⚠️ Tail command status unknown

### Medium
- [ ] ⚠️ Stealth mode requires playwright-extra (not in deps?)
- [ ] ⚠️ False positive rates unknown for WCAG features
- [ ] ⚠️ --mode is deprecated but still accepted

### Low
- [ ] ⚠️ Profile vs mode precedence unclear
- [ ] ⚠️ Challenge detection success rate unknown

---

## 📋 Quick Test Protocol

### Smoke Test (5 minutes)
```bash
pnpm build
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out smoke-test.atls \
  --mode full \
  --maxPages 2 \
  --quiet --json
```

### Full Feature Test (30 minutes)
```bash
# Test all render modes
for mode in raw prerender full; do
  node dist/cli/index.js crawl \
    --seeds https://example.com \
    --out test-$mode.atls \
    --mode $mode \
    --maxPages 3 \
    --quiet --json
done

# Test all exports
for report in pages edges assets errors; do
  node dist/cli/index.js export \
    --atls test-full.atls \
    --report $report \
    --out test-$report.csv
done

# Validate
node dist/cli/index.js validate --atls test-full.atls
```

### WCAG Test (10 minutes)
```bash
# Crawl with WCAG enhancements
node dist/cli/index.js crawl \
  --seeds https://biaofolympia.com \
  --out wcag-test.atls \
  --mode full \
  --maxPages 3 \
  --quiet --json

# Extract and analyze WCAG data
unzip -p wcag-test.atls accessibility/part-001.jsonl.zst | \
  zstdcat | head -1 | \
  python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)['wcagData'], indent=2))"
```

---

## 🎯 Priority Order

### Phase 1 (Week 1): Critical Path
1. ✅ Core crawl functionality (crawl command)
2. ✅ Pages dataset validation
3. ✅ Export (pages, edges, assets, errors)
4. ✅ Archive validation

### Phase 2 (Week 2): High Priority
5. ⚠️ All render modes (raw, prerender, full)
6. ⚠️ Resume/checkpoint
7. ⚠️ Robots.txt respect
8. ⚠️ Screenshots & favicons

### Phase 3 (Week 3): WCAG & Data Quality
9. ⚠️ WCAG 6 new features
10. ⚠️ Accessibility dataset
11. ⚠️ Structured data extraction
12. ⚠️ DOM snapshots

### Phase 4 (Week 4): Advanced Features
13. ❓ Diff command
14. ❓ Stress command
15. ❓ Tail command
16. ⚠️ Stealth mode
17. ⚠️ Session persistence

### Phase 5 (Week 5): Edge Cases & Performance
18. Error handling & recovery
19. Large site crawls
20. Memory leak testing
21. Performance benchmarks

---

## 📊 Status Legend

- ✅ **TESTED & WORKING** - Validated, production-ready
- ⚠️ **UNTESTED** - Implemented but not validated
- ❓ **UNKNOWN** - Status unclear, needs investigation
- 🚧 **IN PROGRESS** - Partially implemented
- ❌ **BROKEN** - Known to fail
- 📝 **PLACEHOLDER** - Interface only, no implementation

---

## 📞 Quick Reference

**Main Plan:** `VALIDATION_AUDIT_PLAN.md`  
**Status Docs:** `tmp/WCAG_CURRENT_STATUS.md`  
**Test Results:** [To be created in `/test-results/`]  
**Issue Tracker:** [To be created]
