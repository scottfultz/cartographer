# Changelog

All notable changes to Cartographer Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta.1] - 2025-10-25

### 🎉 Beta Release 1

**Status:** Beta release for testing and feedback

**⚠️ Breaking Changes:** See the **[Migration Guide](docs/MIGRATION.md)** for upgrade instructions.

### ✨ Added

#### Core Infrastructure
- **Atlas v1.0 Archive Format** - Structured ZIP archives with JSONL + Zstandard compression
- **Atlas Format Specification** - Complete I-D style specification document (569 lines)
- **SDK Validation Function** - `validate()` for schema compliance and referential integrity
- **Golden Corpus Fixtures** - Test archives for edge cases (single-page, errors-only, deep-nesting)

#### Observability & Monitoring
- **Enhanced Observability Events** (`crawl.observability`) - Emitted every 5 seconds with:
  - Queue depth and in-flight count
  - Per-host queue sizes (diagnose bottlenecks)
  - Throttled hosts list
  - Current RPS and memory usage (RSS MB)
- **Robots.txt Decision Logging** - All robots.txt checks logged to NDJSON for compliance auditing

#### Safety & Quality
- **Overwrite Protection** - `--force` flag required to overwrite existing `.atls` files (exit code 4)
- **Max Errors Enforcement** - Fixed critical bug where `--maxErrors` was never checked
  - Now correctly aborts after N errors with exit code 2
  - Emits note to manifest on error budget exceeded

#### Documentation & Community
- **Atlas Format Specification** - Complete format documentation with schemas, examples, security considerations
- **Code of Conduct** - Contributor Covenant v2.1 for community standards
- **Enhanced CONTRIBUTING.md** - Release process, changelog maintenance, versioning policy
- **SDK Validation Examples** - `validate-archive.ts` with detailed issue reporting
- **Quickstart Demo** - `demo-quickstart.js` for rapid onboarding

### 🔄 Changed

#### Breaking Changes
- **Renamed `--errorBudget` to `--maxErrors`** with clearer semantics:
  - Old: `--errorBudget 0` meant unlimited (confusing)
  - New: `--maxErrors -1` means unlimited (explicit)
  - New: `--maxErrors 0` aborts immediately
  - New: `--maxErrors N` aborts after N errors
- **Default `--max-depth` changed from `-1` to `1`** for safer defaults
  - Old: Unlimited depth (risky for new users)
  - New: Homepage + direct links only
  - Use `--max-depth -1` to restore unlimited behavior

#### Status Updates
- **README Status** - Changed from "Production Ready" to "Release Candidate 1.0.0-rc.1" for honest status declaration

### 🐛 Fixed

#### Critical Bugs
- **Error Budget Enforcement** - Error budget was configured everywhere but never actually checked
  - Added check after each page: `if (maxErrors >= 0 && this.errorCount > maxErrors)`
  - Now correctly emits note to manifest and exits with code 2
  - Added integration tests to verify enforcement

### 📚 Documentation
- Added Responsible Crawling section with ethics, rate limiting, legal compliance
- Enhanced README with observability metrics documentation
- Updated all examples to use `--maxErrors` instead of `--errorBudget`
- Linked Atlas specification from README Architecture section

### 🧪 Testing
- SDK validation: 9 passing tests
- Golden corpus fixtures: 3 curated test archives
- All fixtures validated with SDK `validate()` function

---

## [Unreleased]

### 🐛 Fixed
- **CI/CD Node 20 Failures** - Fixed GitHub Actions workflow failures
  - Removed ESLint lint step (no configuration file exists)
  - Fixed test glob pattern by removing quotes for Node's `--test` runner
  - Simplified integration test glob pattern
  - All 176 unit tests now pass on Node 20 and Node 22
- **Manifest Statistics** - Fixed manifest.json to show actual record counts and file sizes
  - Reads `summary.json` to populate `recordCount` for each dataset
  - Calculates actual part file sizes using `fs.stat()`
  - Resolves critical issue where manifest showed zeros for all statistics
- **In-Flight Tracking** - Scheduler now properly tracks concurrent page processing
  - Added `inFlightCount` property to Scheduler class
  - Increments on page processing start, decrements on completion
  - Progress metrics now show accurate concurrency usage
- **Debug Logging** - Improved debug logging with proper structured logging
  - Replaced 45+ `console.log()` debug statements with `log('debug', ...)` calls
  - Debug logs now respect log level configuration (hidden by default)
  - Cleaner output in production mode while preserving debug capability
  - Files cleaned: `src/core/scheduler.ts` (21 instances), `src/io/atlas/writer.ts` (1 instance)
- **Test Suite Hang** - Separated fast unit tests (176 tests, ~0.6s) from slow integration tests (~60s)
  - Moved `scheduler.rateLimit.test.ts` to `test/integration/`
  - Added `test:unit`, `test:integration`, and `test:all` npm scripts
  - Updated CI/CD to run fast tests by default
  - `npm test` now completes in under 1 second (was hanging indefinitely)
- **CI/CD Test Build** - Fixed GitHub Actions workflow to build tests before running
  - Added `npm run build:test` step before test execution
  - Added `npm run pretest` step before integration tests (creates test fixtures)
  - Tests now pass on both Node 20 and Node 22

### 📚 Changed
- **Test Organization** - Clear separation between unit and integration tests
- **CI/CD Workflow** - Simplified to use `npm run test:unit` for fast feedback
- **Documentation** - Updated README and package.json to reflect test separation

---

## [1.0.0] - 2025-01-24

### 🎉 Initial Release

Production-ready headless web crawler producing Atlas v1.0 (.atls) archives.

### ✨ Features

#### Core Crawling
- **Unlimited Depth Crawling** - Default `maxDepth=-1` for complete site mapping
  - `-1`: Unlimited depth (default)
  - `0`: Seeds only
  - `N`: Crawl up to depth N
- **Three Render Modes**
  - `raw`: Static HTML only (no JavaScript)
  - `prerender`: JavaScript execution + network idle wait (SEO-focused)
  - `full`: Complete WCAG accessibility audit + console logs
- **BFS Scheduler** - Breadth-first search with depth tracking per URL
- **Smart Filename Generation** - Auto-generated: `domain_YYYYMMDD_HHMMSS_mode.atls`
- **Completion Reason Tracking** - Flags: `finished`, `capped`, `error_budget`, `manual`

#### Challenge Detection
- **Automatic Challenge Detection** - Cloudflare, Akamai, and other bot protection
  - HTTP 403/503 status codes
  - Challenge-related page titles
  - DOM selectors for common challenge patterns
- **Smart Wait Logic** - Up to 15s wait for automatic challenge resolution
- **Clean Error Handling** - No poisoned PageRecords, logs `CHALLENGE_DETECTED` errors

#### Atlas v1.0 Format
- **Structured Archives** - Zip container with JSONL parts
- **Zstandard Compression** - All parts compressed with Zstd
- **Archive Parts**
  - `pages/` - PageRecords (URL, HTML, metadata, depth)
  - `edges/` - EdgeRecords (internal links)
  - `assets/` - AssetRecords (images, videos, media)
  - `errors/` - ErrorRecords (crawl errors with context)
  - `accessibility/` - AccessibilityRecords (WCAG violations, full mode only)
- **Manifest & Summary** - `manifest.json` (metadata, config) + `summary.json` (stats)

#### CLI Interface
- **Crawl Command** - Full-featured crawling with all options
  - Seeds, output path, mode, maxPages, maxDepth, RPS, concurrency
  - Error budget enforcement (abort after N errors)
  - Quiet mode + JSON output for CI/CD
  - Structured NDJSON logging
- **Export Command** - CSV export from .atls archives
  - Reports: pages, edges, assets, errors, accessibility
- **Validate Command** - Archive integrity checking
- **Stress Command** - Performance testing

### 🧪 Testing

- **Comprehensive Test Suite** - 130+ tests across 6 test files
  - `test/maxDepth.test.ts` (9 tests) - maxDepth configuration validation
  - `test/challenge-detection.test.ts` (19 tests) - Challenge detection heuristics
  - `test/filename-generator.test.ts` (27 tests) - Auto-filename generation
  - `test/completionReason.test.ts` (18 tests) - Completion reason logic
  - `test/depth-limiting.test.ts` (25 tests) - BFS depth enforcement
  - `test/config-validation.test.ts` (32 tests) - Config validation edge cases
- **CI/CD Matrix Testing** - Node.js 20 & 22
  - Build + TypeScript compilation
  - All edge case test suites
  - Archive validation
  - Artifact uploads

### 📚 Documentation

- **README.md** - Comprehensive usage guide with examples
  - Feature overview with badges
  - CLI reference with all options
  - Usage examples (unlimited depth, seeds-only, shallow crawl)
  - CI/CD recipes (quiet mode, error budget, structured logging)
  - Architecture overview
  - Performance benchmarks
- **TEST_SUITE_DOCUMENTATION.md** - Complete test documentation
  - All 130 tests described with expected behavior
  - Running instructions and troubleshooting
  - Maintenance guidelines
- **CODEBASE_DOCUMENTATION.md** - Architecture deep dive
- **KNOWN_ISSUES.md** - Current limitations and workarounds
- **Atlas SDK Quick Reference** - Reading .atls files with SDK

### 🔧 Infrastructure

- **GitHub Actions CI/CD**
  - Matrix testing on Node 20 & 22
  - Parallel test execution
  - Artifact uploads (test results, archives)
  - Archive validation job
- **TypeScript Configuration**
  - ES2022 modules
  - Strict mode enabled
  - Full type safety
- **Development Tools**
  - ESLint for code quality
  - Rimraf for clean builds
  - Node test runner (built-in)

### 📦 Dependencies

- **Playwright** - Headless browser automation
- **Archiver** - Zip archive creation
- **@mongodb-js/zstd** - Zstandard compression
- **@fast-csv/format** - CSV export
- **Commander** - CLI framework
- **TypeScript 5.x** - Type safety and ES2022 modules

### 🎯 Performance

- **Benchmarks** (Apple M1 Max, 5000 pages, prerender mode)
  - ~15 pages/second
  - 2.1 GB memory peak
  - 8.3x compression ratio
  - 145 MB archive size

### 🔒 Security & Attribution

- **Copyright** - © 2025 Cai Frazier
- **License** - Proprietary and confidential (UNLICENSED)
- **Attribution** - All archives/manifests attribute owner as "Cai Frazier"

---

## [Unreleased]

### 🚀 Planned Features

- [ ] Resume/checkpoint improvements
- [ ] Incremental crawling (delta updates)
- [ ] Custom extraction rules (CSS selectors)
- [ ] Screenshot capture option
- [ ] PDF export support
- [ ] Multi-language i18n support

### 🐛 Known Issues

See [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) for current limitations.

---

**Note:** This project uses [Semantic Versioning](https://semver.org/). Given a version number MAJOR.MINOR.PATCH:
- MAJOR version for incompatible API changes
- MINOR version for added functionality (backwards-compatible)
- PATCH version for backwards-compatible bug fixes
