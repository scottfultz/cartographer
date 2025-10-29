# Documentation

**Cartographer Engine Documentation Hub**

**Last Updated:** October 25, 2025  
**Monorepo Status:** Migration Complete ✅

---

> Full index: See [TOC.md](TOC.md) for a categorized table of contents across all docs.

## Getting Started

New to Cartographer? Start here:

1. **[../README.md](../README.md)** - Overview, CLI reference, and monorepo structure
2. **[../CODEBASE_DOCUMENTATION.md](../CODEBASE_DOCUMENTATION.md)** - Comprehensive technical documentation
3. **[../REMAINING_TEST_FAILURES.md](../REMAINING_TEST_FAILURES.md)** - Known test issues (5 failures, 99.1% pass rate)

---

## For Developers

Contributing to Cartographer? Read these:

- **[../CODEBASE_DOCUMENTATION.md](../CODEBASE_DOCUMENTATION.md)** - Architecture, testing, development workflow
- **[../.github/copilot-instructions.md](../.github/copilot-instructions.md)** - AI agent development guidelines
- **[../packages/atlas-sdk/README.md](../packages/atlas-sdk/README.md)** - Atlas SDK API documentation
- **[../packages/atlas-spec/README.md](../packages/atlas-spec/README.md)** - Type definitions reference

---

## Technical References

### Core Documentation

- **[CODEBASE_DOCUMENTATION.md](../CODEBASE_DOCUMENTATION.md)** - Complete technical reference
- **[REMAINING_TEST_FAILURES.md](../REMAINING_TEST_FAILURES.md)** - Test status and known issues
- **[packages/atlas-sdk/QUICK_REFERENCE.md](../packages/atlas-sdk/QUICK_REFERENCE.md)** - SDK quick reference

### Testing

- **[TEST_SUITE_DOCUMENTATION.md](TEST_SUITE_DOCUMENTATION.md)** - Comprehensive test guide (130+ tests)
- **[PHASE1_TEST_SUITE_SUMMARY.md](PHASE1_TEST_SUITE_SUMMARY.md)** - Phase 1 WCAG accessibility tests (104 tests)
- **[NEW_TEST_COVERAGE_SUMMARY.md](NEW_TEST_COVERAGE_SUMMARY.md)** - Extractor feature tests (125 tests)

### SDK

- **[packages/atlas-sdk/QUICK_REFERENCE.md](../packages/atlas-sdk/QUICK_REFERENCE.md)** - Reading .atls files programmatically

### Known Issues

- **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)** - Current limitations and workarounds

---

## Atlas v1 Specification and Plans

Authoritative spec and implementation planning for the Atlas archive format:

- [ATLAS_V1_SPECIFICATION.md](ATLAS_V1_SPECIFICATION.md) – Complete Atlas v1.0 specification
- [ATLAS_V1_IMPLEMENTATION_PLAN.md](ATLAS_V1_IMPLEMENTATION_PLAN.md) – 7-phase implementation roadmap
- [ATLAS_V1_IMPLEMENTATION_STATUS.md](ATLAS_V1_IMPLEMENTATION_STATUS.md) – Current status by capability
- [ATLAS_CONTRACT_LAYER_STRATEGY.md](ATLAS_CONTRACT_LAYER_STRATEGY.md) – Publishing and semver strategy for spec contracts

### Enhancements and Contract Notes

- [ATLAS_V1_MANIFEST_ENHANCEMENT.md](ATLAS_V1_MANIFEST_ENHANCEMENT.md) – Manifest fields, integrity, and audit hash
- [ATLAS_V1_RESPONSE_METADATA_ENHANCEMENT.md](ATLAS_V1_RESPONSE_METADATA_ENHANCEMENT.md) – HTTP, headers, and timing
- [ATLAS_V1_MEDIA_COLLECTION_ENHANCEMENT.md](ATLAS_V1_MEDIA_COLLECTION_ENHANCEMENT.md) – Screenshots, favicons, assets
- [ATLAS_V1_TIMING_ENHANCEMENTS.md](ATLAS_V1_TIMING_ENHANCEMENTS.md) – Page timing metadata and wait conditions
- [ATLAS_V1_ENUM_CODIFICATION.md](ATLAS_V1_ENUM_CODIFICATION.md) – Enumerations and codecs
- [ATLAS_V1_LINK_CONTEXT_ENHANCEMENT.md](ATLAS_V1_LINK_CONTEXT_ENHANCEMENT.md) – Link edges and anchors
- [ATLAS_V1_ACCESSIBILITY_VERSIONING.md](ATLAS_V1_ACCESSIBILITY_VERSIONING.md) – WCAG dataset versioning

### Validation, Testing, and Reports

- [E2E_TEST_REPORT.md](E2E_TEST_REPORT.md) – End-to-end validation results
- [PHASE_6_E2E_VALIDATION_REPORT.md](PHASE_6_E2E_VALIDATION_REPORT.md) – Phase 6 E2E validation
- [PHASE_6_TEST_EXECUTION_SUMMARY.md](PHASE_6_TEST_EXECUTION_SUMMARY.md) – Test execution summary
- [STRESS_TEST_RESULTS.md](STRESS_TEST_RESULTS.md) – Stress test outcomes
- [FEATURE_STATUS_MATRIX.md](FEATURE_STATUS_MATRIX.md) – Feature coverage by dataset
- [PROJECT_CLEANUP_SUMMARY.md](PROJECT_CLEANUP_SUMMARY.md) – Documentation and structure cleanup

### Performance and SEO

- [PERFORMANCE_SEO_IMPLEMENTATION.md](PERFORMANCE_SEO_IMPLEMENTATION.md) – Performance and SEO extraction plan


---

## Historical Documentation

Detailed implementation notes, audits, and design documents:

- **[archive/](archive/)** - Historical documentation archive (25+ documents)

---

## Documentation Structure

```
cartographer/
├── README.md              # Main CLI reference and examples
├── GETTING_STARTED.md     # Quick start guide
├── DEVELOPER_GUIDE.md     # Codebase architecture
├── FEATURES.md            # Feature list and status
├── MISSION.md             # Project vision and roadmap
├── docs/
│   ├── README.md          # This file
│   ├── TEST_SUITE_DOCUMENTATION.md
│   ├── PHASE1_TEST_SUITE_SUMMARY.md
│   ├── NEW_TEST_COVERAGE_SUMMARY.md
│   ├── KNOWN_ISSUES.md
│   └── archive/           # Historical docs
└── packages/
    └── atlas-sdk/
        └── QUICK_REFERENCE.md  # SDK documentation
```

---

## Quick Links

| Document | Audience | Purpose |
|----------|----------|---------|
| [README.md](../README.md) | All users | CLI reference, examples, troubleshooting |
| [GETTING_STARTED.md](../GETTING_STARTED.md) | New users | First crawl, common use cases |
| [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) | Developers | Codebase architecture, patterns |
| [FEATURES.md](../FEATURES.md) | All users | Feature status, roadmap |
| [MISSION.md](../MISSION.md) | Contributors | Vision, principles, goals |
| [TEST_SUITE_DOCUMENTATION.md](TEST_SUITE_DOCUMENTATION.md) | Developers | Testing guide |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | All users | Current limitations |

---

**Copyright © 2025 Cai Frazier. All rights reserved.**
