# Cartographer Engine - Mission

**The vision, purpose, and guiding principles of Cartographer Engine.**

---

## Vision

**To build the world's most comprehensive and reliable web crawling engine for technical SEO, accessibility auditing, and site analysis.**

Cartographer Engine aims to be the foundation for next-generation web analysis tools, providing unprecedented depth, accuracy, and reliability in web data collection.

---

## Mission Statement

**Empower developers and analysts with production-grade web crawling infrastructure that combines speed, accuracy, and comprehensive data extraction in a single, reliable engine.**

We believe that web analysis should be:
- **Comprehensive** - Capture every relevant data point
- **Reliable** - Never lose data, always resumable, always validated
- **Fast** - Optimized for modern web performance
- **Accessible** - Simple to use, well-documented, extensible
- **Open** - Transparent architecture, testable, debuggable

---

## Core Principles

### 1. Data Integrity First

**Never compromise on data quality.**

- All data is validated against JSON Schema before writing
- Automatic post-creation validation catches corruption
- Checkpoint/resume ensures no data loss on interruption
- Deduplication prevents duplicate records
- Compression preserves data while reducing storage

**Outcomes:**
- ✅ Zero data loss on interruption
- ✅ No duplicate records in archives
- ✅ Schema-validated data throughout
- ✅ Automatic corruption detection

### 2. Production-Ready Engineering

**Build for reliability, not just functionality.**

- Comprehensive error handling with graceful degradation
- Memory management and backpressure controls
- Browser context pooling and recycling
- Structured logging for observability
- Exit codes for automation
- CI/CD with matrix testing on Node 20 & 22

**Outcomes:**
- ✅ Runs for hours without crashes
- ✅ Handles memory pressure gracefully
- ✅ Integrates with CI/CD pipelines
- ✅ Debuggable with structured logs

### 3. Extensibility & Modularity

**Design for future growth, not just current needs.**

- Clean separation: CLI → Engine → Core → I/O
- Event-driven architecture with typed event bus
- Plugin-ready extractor patterns
- SDK for archive consumption
- Well-documented APIs

**Outcomes:**
- ✅ Easy to add new extractors
- ✅ Simple to extend with new CLI commands
- ✅ Clear integration points for downstream tools
- ✅ SDK for programmatic access

### 4. Performance at Scale

**Optimize for real-world production workloads.**

- Streaming I/O, no in-memory buffers
- Parallel browser tabs with concurrency controls
- Rate limiting for politeness
- Zstandard compression (~8x ratio)
- Incremental archive writing

**Outcomes:**
- ✅ 15+ pages/sec throughput
- ✅ <3 GB memory for 5000-page crawls
- ✅ 8x compression ratio
- ✅ Scalable to 100k+ page sites

### 5. Developer Experience

**Make it easy to use, understand, and debug.**

- Clear documentation (README, Getting Started, Developer Guide)
- Comprehensive test suite (346 tests)
- Type safety with TypeScript strict mode
- Structured logging with debug mode
- Helpful error messages with context

**Outcomes:**
- ✅ New contributors onboard quickly
- ✅ Bugs are easy to reproduce and fix
- ✅ Tests document expected behavior
- ✅ AI agents can navigate codebase

---

## Strategic Goals

### Short Term (Q1 2025)

**Goal:** Feature parity with commercial SEO crawlers

- ✅ Core crawling engine (BFS, rate limiting, error handling) - **COMPLETE**
- ✅ Three render modes (raw, prerender, full) - **COMPLETE**
- ✅ Atlas v1.0 archive format - **COMPLETE**
- ✅ Basic SEO data (metadata, Open Graph, Twitter Cards) - **COMPLETE**
- ✅ Basic accessibility data (alt text, headings, ARIA) - **COMPLETE**
- 🚧 Tech stack detection - **IN PROGRESS**
- 📝 Structured data extraction (JSON-LD) - **PLANNED**
- 📝 Performance metrics (Core Web Vitals) - **PLANNED**

**Milestone:** Match or exceed Screaming Frog feature set

### Mid Term (Q2-Q3 2025)

**Goal:** Best-in-class accessibility auditing

- 📝 Complete WCAG 2.1 AA coverage
- 📝 Runtime accessibility testing (keyboard traps, focus order)
- 📝 Contrast violation detection
- 📝 Media element analysis (captions, descriptions)
- 📝 Skip link detection
- 📝 Form accessibility (labels, autocomplete, validation)

**Milestone:** Replace commercial accessibility tools (aXe, Wave, etc.)

### Long Term (Q4 2025 - 2026)

**Goal:** Platform for next-generation web analysis

- 📝 Custom extractor API (user-defined data extraction)
- 📝 Plugin system (extend functionality without core changes)
- 📝 Multi-language crawling (hreflang chain analysis)
- 📝 Historical comparison (archive diffs, change detection)
- 📝 Competitive analysis (traffic, rankings, backlinks)
- 📝 Real-time monitoring (continuous crawling, alerts)

**Milestone:** Foundation for Continuum and other analysis platforms

---

## Success Metrics

### Technical Excellence

- **Test Coverage:** 90%+ of core functionality
- **Pass Rate:** 98%+ of tests passing
- **Performance:** 15+ pages/sec, <3 GB RAM for 5k pages
- **Reliability:** 99.9% successful crawls (no crashes, no data loss)
- **Compression:** 8x+ compression ratio

**Current Status:**
- ✅ Test Coverage: 346 tests across all major features
- ✅ Pass Rate: 98.3% (340/346 passing)
- ✅ Performance: 15 pages/sec, 2.1 GB RAM peak
- ✅ Reliability: Checkpoint/resume prevents data loss
- ✅ Compression: ~8x ratio (Zstandard)

### Feature Completeness

- **SEO Parity:** Match commercial SEO crawlers (Screaming Frog, etc.)
- **Accessibility Depth:** Comprehensive WCAG 2.1 AA coverage
- **Performance Monitoring:** Core Web Vitals + Navigation Timing
- **Extensibility:** Plugin system + custom extractors

**Current Status:**
- ✅ SEO Parity: 75% (core features complete, structured data pending)
- ✅ Accessibility: 60% (basic + enhanced, runtime tests pending)
- 📝 Performance: 0% (planned for Q2 2025)
- 📝 Extensibility: 0% (planned for Q4 2025)

### Developer Adoption

- **Documentation Quality:** Complete guides for users and developers
- **Onboarding Time:** <1 hour to first successful crawl
- **AI Agent Compatibility:** Clear patterns for AI-assisted development
- **Community Growth:** Contributors, forks, issues, PRs

**Current Status:**
- ✅ Documentation: README, Getting Started, Developer Guide, Features, Mission
- ✅ Onboarding: <10 minutes with guide
- ✅ AI Agent: Copilot instructions, clear architecture docs
- 📝 Community: Internal project, not yet open source

---

## Design Philosophy

### "Correct First, Fast Second"

We prioritize correctness over speed. Data integrity cannot be compromised.

**Examples:**
- Validate all records before writing (performance cost acceptable)
- Detect duplicates even if it slows crawl (data quality critical)
- Wait for JavaScript rendering even if slow (accuracy required)

### "Observable by Default"

Every operation should be loggable, measurable, and debuggable.

**Examples:**
- Structured NDJSON logging for all events
- Metrics tracking for all operations
- Exit codes for all failure modes
- Debug mode reveals internal state

### "Fail Safe, Not Silent"

Errors should be loud, clear, and actionable. Never hide failures.

**Examples:**
- Error records written to archive
- Error budget enforcement with exit code 2
- Challenge detection with clear log events
- Validation failures with specific schema violations

### "Developer Empathy"

Build for the developer you wish existed when you started.

**Examples:**
- Clear documentation with real-world examples
- Helpful error messages with context
- Test suite documents expected behavior
- Type safety catches bugs early

---

## Long-Term Impact

### For Web Professionals

- **SEO Analysts:** Complete technical audits in minutes, not hours
- **Accessibility Experts:** Comprehensive WCAG validation at scale
- **Performance Engineers:** Deep insights into Core Web Vitals
- **Developers:** Reliable foundation for custom analysis tools

### For the Web

- **Better Accessibility:** Easier to find and fix WCAG violations
- **Faster Sites:** Performance data drives optimization
- **Higher Quality:** Automated audits catch issues early
- **More Transparency:** Open data format enables innovation

### For the Industry

- **New Standards:** Atlas format becomes industry-standard archive format
- **Ecosystem Growth:** Third-party tools build on Cartographer
- **Innovation Acceleration:** Lower barrier to web analysis experimentation
- **Open Knowledge:** Documentation patterns adopted by other projects

---

## Guiding Questions

When making decisions, ask:

1. **Does this improve data quality?**
   - If yes, strongly consider it
   - If no, question its value

2. **Is this production-ready?**
   - Will it work at scale?
   - Can it handle errors gracefully?
   - Is it testable and debuggable?

3. **Does this enable future features?**
   - Is the architecture extensible?
   - Are interfaces well-defined?
   - Can users build on this?

4. **Will developers understand this?**
   - Is it well-documented?
   - Are examples provided?
   - Can AI agents navigate it?

5. **Does this respect our users?**
   - Is it respectful of robots.txt?
   - Does it rate-limit appropriately?
   - Is user data handled responsibly?

---

## Core Values

### 1. **Quality Over Speed**
Take time to do it right. Rushing leads to technical debt.

### 2. **Transparency Over Magic**
Make the system understandable, not just easy to use.

### 3. **Extensibility Over Completeness**
Build the foundation for others to build on.

### 4. **Reliability Over Features**
A stable core is better than an unstable feature set.

### 5. **Documentation as Code**
Invest in docs as heavily as implementation.

---

## Attribution & Ownership

**Owner:** Cai Frazier  
**Copyright:** © 2025 Cai Frazier. All rights reserved.  
**License:** Proprietary (internal use only)

All Atlas archives, manifests, and generated files attribute Cai Frazier as owner. This is not just legal attribution—it's a commitment to quality and accountability.

---

## Acknowledgments

Cartographer Engine builds on the shoulders of giants:

- **Playwright:** Reliable browser automation
- **Zstandard:** Exceptional compression performance
- **Node.js:** Robust platform for I/O-intensive work
- **TypeScript:** Type safety and developer productivity
- **Community:** Open source patterns and best practices

---

## Call to Action

**For Current Contributors:**
- Uphold these principles in every PR
- Document your decisions and trade-offs
- Write tests that specify behavior
- Improve docs when you find gaps

**For Future Contributors:**
- Start with GETTING_STARTED.md
- Read DEVELOPER_GUIDE.md
- Pick a feature from FEATURES.md
- Align your work with this mission

**For Users:**
- Provide feedback on what works and what doesn't
- Request features that align with our mission
- Share your use cases to guide prioritization
- Help us build the best web crawler in the world

---

## The Path Forward

Cartographer Engine is more than a web crawler. It's a commitment to:

- **Excellence in engineering**
- **Transparency in data**
- **Accessibility for all**
- **Performance at scale**
- **Reliability in production**

Every line of code, every test, every doc—they all serve this mission.

Let's build something that matters.

---

**Copyright © 2025 Cai Frazier. All rights reserved.**
