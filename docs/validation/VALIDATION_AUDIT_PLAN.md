# Cartographer Full Feature Validation & Audit Plan
**Created:** October 27, 2025  
**Purpose:** Comprehensive validation of all Cartographer features, commands, options, and capabilities  
**Status:** Planning Phase

---

## 🎯 Objectives

1. **Inventory** - Document every feature, command, option, and toggle
2. **Classify** - Identify what's production-ready, experimental, placeholder, or broken
3. **Validate** - Test each feature systematically with success/failure criteria
4. **Document** - Record findings with evidence (logs, archives, screenshots)
5. **Prioritize** - Create action plan for fixing critical issues

---

## 📋 Audit Scope

### 1. CLI Commands (7 total)
- `crawl` - Main crawling command
- `export` - CSV export from archives
- `validate` - Archive validation
- `diff` - Compare two archives
- `stress` - Stress testing
- `tail` - Log file monitoring
- `version` - Version information

### 2. Core Features
- **Rendering Modes** - raw, prerender, full
- **Crawl Profiles** - core, full
- **Replay Tiers** - html, html+css, full
- **Challenge Detection** - Cloudflare, Akamai
- **Resume/Checkpoint** - State recovery
- **Rate Limiting** - RPS controls
- **Robots.txt** - Respect/override

### 3. Data Collection
- **Pages Dataset** - SEO metadata, hashes, render stats
- **Edges Dataset** - Link relationships
- **Assets Dataset** - Media, scripts, stylesheets
- **Errors Dataset** - HTTP errors, timeouts
- **Accessibility Dataset** - WCAG data (new enhancements)
- **Console Dataset** - Browser console logs
- **Structured Data** - JSON-LD, OpenGraph, Twitter Cards
- **Screenshots** - Desktop + mobile
- **Favicons** - Icon collection
- **DOM Snapshots** - HTML preservation
- **Network Logs** - Request/response data

### 4. Configuration Options (~60 options)
See detailed inventory below

---

## 🗂️ Feature Inventory

### Command: `crawl`

#### Input/Output Options
- [ ] `--seeds` (required) - Seed URLs
- [ ] `--out` - Output path (auto-generated if omitted)
- [ ] `--profile` - Crawl profile (core/full)
- [ ] `--mode` - Render mode (raw/prerender/full) [DEPRECATED]
- [ ] `--replayTier` - Replay capture tier

**Validation Tests:**
- Multiple seeds handling
- Auto-generated filenames
- Custom output paths
- Path collision detection
- Profile vs mode precedence

#### Crawl Control
- [ ] `--maxPages` - Page limit (0 = unlimited)
- [ ] `--maxDepth` - Depth limit (0 = seeds only, 1 = default, -1 = unlimited)
- [ ] `--maxBytesPerPage` - Size limit per page
- [ ] `--timeout` - Page load timeout
- [ ] `--rps` - Requests per second
- [ ] `--concurrency` - Concurrent page processing

**Validation Tests:**
- maxPages enforcement
- Depth calculation accuracy
- Size limit triggering
- Timeout behavior (abort vs continue)
- RPS throttling accuracy
- Concurrency limits

#### Robots.txt & Compliance
- [ ] `--respectRobots` (default: true)
- [ ] `--overrideRobots` (default: false)
- [ ] `--userAgent` - Custom UA string

**Validation Tests:**
- robots.txt parsing
- Allow/disallow rules
- Crawl-delay honor
- Sitemap discovery
- User-agent matching
- Override logging/warnings

#### URL Filtering
- [ ] `--allowUrls` - Whitelist patterns
- [ ] `--denyUrls` - Blacklist patterns

**Validation Tests:**
- Glob pattern matching
- Regex pattern matching
- Pattern precedence (allow vs deny)
- Case sensitivity
- Special characters handling

#### Session & Stealth
- [ ] `--persistSession` - Browser session persistence
- [ ] `--stealth` - Hide automation signals

**Validation Tests:**
- Session persistence per origin
- Cookie/localStorage preservation
- Stealth mode effectiveness
- playwright-extra integration
- Bot detection bypass

#### Screenshots & Media
- [ ] `--noScreenshots` - Disable screenshots
- [ ] `--screenshotQuality` (1-100, default: 80)
- [ ] `--screenshotFormat` (jpeg/png)
- [ ] `--noFavicons` - Disable favicon collection

**Validation Tests:**
- Screenshot capture (desktop + mobile)
- Quality settings impact
- Format conversion
- Favicon discovery (link tags, /favicon.ico, etc.)
- Media size limits
- Storage efficiency

#### Privacy & Security
- [ ] `--stripCookies` (default: true)
- [ ] `--stripAuthHeaders` (default: true)
- [ ] `--redactInputs` (default: true)
- [ ] `--redactForms` (default: true)

**Validation Tests:**
- Cookie stripping verification
- Auth header removal
- Input field redaction in DOM snapshots
- Form data protection
- PII detection/removal

#### Resume & Checkpoints
- [ ] `--resume` - Resume from staging directory
- [ ] `--checkpointInterval` (default: 500)

**Validation Tests:**
- Checkpoint file creation
- State serialization accuracy
- Resume from checkpoint
- Queue state restoration
- Visited URL tracking
- Error recovery

#### Error Handling
- [ ] `--maxErrors` (default: -1 = unlimited)

**Validation Tests:**
- Error counting accuracy
- Error budget enforcement
- Exit code correctness
- Partial results preservation

#### Output Control
- [ ] `--quiet` - Suppress progress
- [ ] `--json` - JSON summary output
- [ ] `--verbose` - Detailed logging
- [ ] `--minimal` - Minimal output
- [ ] `--noColor` - Disable colors
- [ ] `--chime` - Sound on completion

**Validation Tests:**
- Output mode combinations
- JSON format validity
- Log level filtering
- Color stripping
- Sound notification

#### Logging
- [ ] `--logFile` (default: logs/crawl-<crawlId>.jsonl)
- [ ] `--logLevel` (info/warn/error/debug)

**Validation Tests:**
- Log file creation
- NDJSON format validation
- Log rotation behavior
- Event types coverage
- Structured logging schema

#### Archive Options
- [ ] `--validateArchive` (default: true)
- [ ] `--force` - Overwrite existing files

**Validation Tests:**
- Post-creation validation
- Schema validation
- Integrity checks
- Overwrite protection
- Atomic writes

---

### Command: `export`

#### Export Types
- [ ] `--report pages` - Pages dataset
- [ ] `--report edges` - Edges dataset
- [ ] `--report assets` - Assets dataset
- [ ] `--report errors` - Errors dataset
- [ ] `--report accessibility` - Accessibility dataset

**Validation Tests:**
- CSV format correctness
- Column headers accuracy
- Data completeness
- Unicode handling
- Large dataset performance

**Known Issues:**
- ⚠️ Accessibility export NOT implemented (exits with code 1)

---

### Command: `validate`

#### Options
- [ ] `--atls` - Archive path to validate

**Validation Tests:**
- Schema validation
- Integrity hash verification
- ZIP structure validation
- JSONL part parsing
- Zstandard decompression
- Manifest validation
- Summary validation

---

### Command: `diff`

#### Options
- [ ] `--baseline` - First archive
- [ ] `--comparison` - Second archive
- [ ] `--output` - Diff report path

**Validation Tests:**
- URL set comparison
- Status code changes
- Content hash changes
- Redirect chain changes
- Performance regression detection

**Status:** ⚠️ Feature status unknown - needs validation

---

### Command: `stress`

#### Options
- [ ] `--seeds` - Test URLs
- [ ] `--duration` - Test duration
- [ ] `--rps` - Target RPS

**Validation Tests:**
- Memory leak detection
- Performance metrics
- Sustained load handling
- Resource cleanup

**Status:** ⚠️ Feature status unknown - needs validation

---

### Command: `tail`

#### Options
- [ ] `--logFile` - Log file to monitor

**Validation Tests:**
- Real-time streaming
- File handle management
- Format parsing
- Filter support

**Status:** ⚠️ Feature status unknown - needs validation

---

## 🧪 Test Matrix

### Test Categories

#### 1. Functional Tests (Does it work?)
- Happy path scenarios
- Expected outputs
- Data accuracy

#### 2. Edge Case Tests (Does it break?)
- Malformed HTML
- Empty responses
- Infinite redirects
- Timeouts
- Rate limit violations
- Disk full scenarios
- Network errors

#### 3. Integration Tests (Do components work together?)
- End-to-end crawls
- Resume after crash
- Export after crawl
- Validate after export

#### 4. Performance Tests (Is it fast enough?)
- Large sites (1000+ pages)
- High concurrency
- Memory usage
- CPU usage
- Disk I/O

#### 5. Compatibility Tests (Does it work everywhere?)
- Different Node versions (20, 22)
- Different OS (macOS, Linux, Windows)
- Different browsers (Chromium, Firefox, WebKit)

---

## 📊 Validation Methodology

### For Each Feature:

#### 1. Status Classification
- ✅ **Production Ready** - Fully functional, tested, documented
- ⚠️ **Experimental** - Works but needs validation
- 🚧 **In Development** - Partially implemented
- 📝 **Placeholder** - Interface exists, no implementation
- ❌ **Broken** - Known to fail
- ❓ **Unknown** - Not yet tested

#### 2. Test Protocol
```
FEATURE: <name>
STATUS: <classification>
PRIORITY: Critical/High/Medium/Low

TEST CASE: <description>
SETUP:
  - <preconditions>
STEPS:
  1. <action>
  2. <action>
EXPECTED:
  - <expected outcome>
ACTUAL:
  - <actual outcome>
RESULT: PASS/FAIL
EVIDENCE:
  - <logs, screenshots, archive analysis>
NOTES:
  - <observations, issues, recommendations>
```

#### 3. Evidence Collection
- Command line input/output
- Log files (NDJSON)
- Archive contents (extracted)
- Memory/CPU metrics
- Error messages
- Exit codes

---

## 🔍 Phase 1: Command Inventory (Week 1)

### Day 1-2: Core Commands
- Test `crawl` with all combinations of:
  - Seeds (1, multiple, invalid)
  - Modes (raw, prerender, full)
  - Profiles (core, full, mode+profile conflicts)
  - Depths (0, 1, 2, -1)
  - Page limits (0, 1, 10, 1000)

### Day 3: Export & Validate
- Test `export` for each dataset type
- Test `validate` on various archives (valid, corrupted, old format)
- Document unsupported features (accessibility export)

### Day 4-5: Advanced Commands
- Test `diff` functionality
- Test `stress` command
- Test `tail` command
- Document feature completeness

---

## 🧩 Phase 2: Feature Deep Dive (Week 2)

### Day 1: Rendering & Capture
- Test all render modes with real sites
- Verify DOM snapshot accuracy
- Test screenshot quality/formats
- Validate favicon discovery
- Check replay tier capture

### Day 2: Robots.txt & Rate Limiting
- Test robots.txt parsing
- Verify crawl-delay honor
- Test RPS throttling
- Verify per-host limits
- Test override behavior

### Day 3: Session & Stealth
- Test session persistence
- Verify cookie/localStorage handling
- Test stealth mode effectiveness
- Measure bot detection bypass rate

### Day 4: Resume & Checkpoints
- Test checkpoint creation
- Test resume from various states
- Verify queue restoration
- Test error recovery

### Day 5: Privacy & Security
- Test data redaction
- Verify cookie stripping
- Check auth header removal
- Test PII handling

---

## 📈 Phase 3: Data Quality Audit (Week 3)

### Day 1-2: Dataset Validation
For each dataset type:
- Extract 100 random records
- Verify schema compliance
- Check data completeness
- Validate relationships (edges → pages, etc.)
- Test data integrity (hashes, references)

### Day 3: WCAG Enhancements (NEW)
- Test all 6 new WCAG features
- Measure false positive rates
- Verify data accuracy
- Test cross-page data collection
- Validate runtime checks

### Day 4: Structured Data
- Test JSON-LD extraction
- Test OpenGraph extraction
- Test Twitter Card extraction
- Verify schema.org support

### Day 5: Performance Metrics
- Verify render times
- Check fetch times
- Validate network metrics
- Test memory tracking

---

## 🚨 Phase 4: Edge Cases & Error Handling (Week 4)

### Day 1: Network Errors
- Test timeout handling
- Test 4xx/5xx responses
- Test DNS failures
- Test connection refused
- Test SSL/TLS errors

### Day 2: Content Edge Cases
- Test empty pages
- Test mega-pages (>100MB)
- Test binary content
- Test malformed HTML
- Test infinite redirects

### Day 3: Challenge Detection
- Test Cloudflare challenges
- Test Akamai challenges
- Test reCAPTCHA
- Measure success rates

### Day 4: Resource Limits
- Test disk full scenarios
- Test memory limits
- Test file descriptor limits
- Test concurrent connection limits

### Day 5: Graceful Degradation
- Test partial failures
- Test browser crashes
- Test signal handling (SIGTERM, SIGINT)
- Test cleanup on abort

---

## 🎯 Phase 5: Performance & Scale (Week 5)

### Day 1-2: Large Site Crawls
- Crawl 1,000 page site
- Crawl 10,000 page site (if feasible)
- Measure memory usage over time
- Check for memory leaks

### Day 3: Concurrency Testing
- Test concurrency 1, 2, 4, 8, 16, 32
- Measure throughput
- Identify optimal settings
- Check resource contention

### Day 4: RPS & Rate Limiting
- Test various RPS settings
- Verify throttling accuracy
- Measure deviation from target
- Test per-host vs global limits

### Day 5: Archive Performance
- Test write performance
- Test compression ratios
- Test validation speed
- Test export performance

---

## 📊 Success Criteria

### Must Pass (Blockers)
- [x] Core crawl functionality works
- [ ] All 3 render modes functional
- [ ] robots.txt respect functional
- [ ] Resume/checkpoint works
- [ ] Archive validation passes
- [ ] Pages export works
- [ ] No data loss
- [ ] No memory leaks

### Should Pass (High Priority)
- [ ] All export types work
- [ ] Challenge detection works
- [ ] Screenshot capture works
- [ ] Favicon collection works
- [ ] Privacy features work
- [ ] Error handling graceful
- [ ] Exit codes correct

### Nice to Have (Medium Priority)
- [ ] Diff command works
- [ ] Stress command works
- [ ] Tail command works
- [ ] Stealth mode effective
- [ ] WCAG enhancements validated
- [ ] Performance optimized

---

## 📝 Deliverables

### 1. Feature Status Matrix
Spreadsheet with:
- Feature name
- Status (✅⚠️🚧📝❌❓)
- Test coverage
- Known issues
- Priority level
- Owner

### 2. Test Results Database
For each test:
- Test ID
- Feature tested
- Pass/fail status
- Evidence links
- Reproduction steps
- Fix recommendations

### 3. Known Issues Registry
For each issue:
- Issue ID
- Severity (Critical/High/Medium/Low)
- Feature affected
- Reproduction steps
- Workaround (if any)
- Fix priority
- Estimated effort

### 4. Documentation Gaps
List of:
- Undocumented features
- Incorrect documentation
- Missing examples
- Unclear behavior

### 5. Recommendations Report
- Critical fixes required
- High-priority improvements
- Performance optimizations
- Feature deprecations
- Breaking changes needed

---

## 🛠️ Tools & Resources

### Testing Infrastructure
- **Test Sites:** 
  - example.com (simple)
  - biaofolympia.com (real WordPress)
  - Custom test harness (various edge cases)
  
- **Automation:**
  - Bash scripts for test execution
  - Python scripts for archive analysis
  - Vitest for unit tests
  
- **Monitoring:**
  - Memory profiling (Node --inspect)
  - CPU profiling (Node --prof)
  - Network monitoring (Chrome DevTools)

### Analysis Tools
- Archive inspector (extract & validate)
- CSV diff tool
- Log analyzer (NDJSON)
- Schema validator (JSON Schema)

---

## 📅 Timeline

**Total Duration:** 5-6 weeks

- **Week 1:** Command inventory & basic testing
- **Week 2:** Feature deep dive & validation
- **Week 3:** Data quality audit & WCAG validation
- **Week 4:** Edge cases & error handling
- **Week 5:** Performance & scale testing
- **Week 6:** Documentation & reporting

**Key Milestones:**
- End of Week 1: All commands tested
- End of Week 2: All features classified
- End of Week 3: Data quality validated
- End of Week 4: Edge cases documented
- End of Week 5: Performance benchmarks
- End of Week 6: Final report delivered

---

## 🚦 Risk Assessment

### High Risk Areas
1. **WCAG Enhancements** - New code, untested
2. **Resume/Checkpoint** - Complex state management
3. **Challenge Detection** - External dependencies
4. **Memory Management** - Large crawls may leak
5. **Stealth Mode** - May not work with playwright-extra

### Medium Risk Areas
1. **Robots.txt Parsing** - Edge cases may fail
2. **Screenshot Capture** - Resource intensive
3. **Diff Command** - Feature completeness unknown
4. **Export Command** - Accessibility export broken

### Low Risk Areas
1. **Basic Crawling** - Well-tested, stable
2. **Archive Writing** - Battle-tested
3. **Validation** - Schema-based, reliable
4. **URL Handling** - Mature library usage

---

## 🎬 Getting Started

### Immediate Actions
1. Set up test infrastructure
2. Create test site fixtures
3. Build automation scripts
4. Set up logging/monitoring
5. Create results tracking spreadsheet

### First Test Run
```bash
# Simple validation test
pnpm build
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --out validation-test.atls \
  --mode full \
  --maxPages 5 \
  --quiet --json > results.json

# Verify output
node packages/cartographer/dist/cli/index.js validate \
  --atls validation-test.atls

# Export and analyze
node packages/cartographer/dist/cli/index.js export \
  --atls validation-test.atls \
  --report pages \
  --out pages.csv
```

---

## 📞 Ownership & Accountability

**Audit Lead:** [To Be Assigned]  
**Test Engineers:** [To Be Assigned]  
**Code Owner:** Cai Frazier  
**Stakeholders:** Continuum team, external users

**Review Cadence:** 
- Daily standup (15 min)
- Weekly progress review (1 hour)
- Phase completion review (2 hours)

---

## 🏁 Exit Criteria

Audit is complete when:
- [ ] All features classified with status
- [ ] 100% command coverage tested
- [ ] Critical bugs documented
- [ ] Performance baselines established
- [ ] Test suite created (where missing)
- [ ] Documentation updated
- [ ] Final report published
- [ ] Recommendations prioritized
- [ ] Stakeholder sign-off obtained

**Success Metric:** 90%+ features with known status, 0 critical unknowns
