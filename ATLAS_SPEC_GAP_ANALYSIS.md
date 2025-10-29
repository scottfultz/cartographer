# Atlas v1.0 Specification - Gap Analysis & Completion Plan

**Date:** October 28, 2025  
**Owner:** Cai Frazier  
**Status:** Gap Analysis - Incomplete Implementation

---

## Executive Summary

A previous agent was working on implementing Atlas v1.0 spec enhancements based on a comprehensive plan to address weaknesses in validation, versioning, self-description, coverage signaling, referential integrity, timing/environment, metrics, integrity, privacy, and provenance. **The work was left incomplete.**

This document analyzes what was completed vs what remains, identifies the gaps, and provides a prioritized completion plan.

---

## Current State Assessment

### ✅ What Was Successfully Implemented

#### Phase 1-6 Completed (per docs/PHASE_6_COMPLETE.md):
1. **Stable Identifiers (page_id)**
   - ✅ UUID v7 generation for pages (time-ordered, globally unique)
   - ✅ `page_id` field added to `PageRecord` (optional for backward compat)
   - ✅ `source_page_id` and `target_page_id` in `EdgeRecord`
   - ✅ `page_id` in `AssetRecord`
   - ✅ Scheduler generates and propagates `page_id` through entire pipeline

2. **Content Hashing**
   - ✅ `rawHtmlHash` (SHA-256 of raw HTTP body)
   - ✅ `domHash` (SHA-256 of DOM outerHTML when rendered)
   - ✅ `contentHash` (SHA-256 of normalized text for change detection)
   - ✅ `previous_page_id` field for re-crawl diffing

3. **Producer & Environment Metadata**
   - ✅ `producer` block with name, version, build, git_hash
   - ✅ `environment` block with device, viewport, user_agent, locale, timezone
   - ✅ Browser, platform, CPU throttling, network profile capture
   - ✅ Consent state tracking

4. **Coverage Matrix**
   - ✅ Per-part expected/present/row_count tracking
   - ✅ Reason codes for absent parts
   - ✅ Mode-specific part expectations (raw/prerender/full)

5. **Integrity & Checksums**
   - ✅ SHA-256 checksums per part file
   - ✅ Dataset-level integrity blocks with per-file checksums
   - ✅ Schema hashing for versioning

6. **Profiles & Replay Tiers**
   - ✅ `--profile core|full` CLI flag
   - ✅ `--replayTier html|html+css|full` CLI flag
   - ✅ Capabilities declaration system

7. **Privacy & Security Defaults**
   - ✅ Privacy config (stripCookies, stripAuthHeaders, redactInputValues)
   - ✅ Robots.txt respect by default
   - ✅ Privacy metadata in manifest

8. **Validation Infrastructure**
   - ✅ `validate` command with 4 validation types
   - ✅ JSON Schema validation per dataset
   - ✅ Manifest, capabilities, provenance validation

9. **Datasets Written**
   - ✅ `pages/` - Core page data with page_id, hashes
   - ✅ `edges/` - Links with source_page_id/target_page_id
   - ✅ `assets/` - Media assets with page_id
   - ✅ `errors/` - Error records
   - ✅ `events/` - Event log
   - ✅ `accessibility/` - A11y data
   - ✅ `dom_snapshots/` - DOM snapshots for offline replay
   - ✅ `console/` - Console logs (full mode)
   - ✅ `styles/` - Computed styles (full mode)

10. **Archive Structure**
    - ✅ `manifest.json` - Current manifest format
    - ✅ `capabilities.json` - Capability declarations
    - ✅ `summary.json` - Crawl statistics
    - ✅ `schemas/*.schema.json` - JSON Schemas per dataset
    - ✅ Zstandard compression for all JSONL parts

---

## ❌ Critical Gaps Identified

### A. Manifest Structure Mismatch

**Problem:** The spec calls for `manifest.v1.json` as the top-level metadata file with a specific structure per `ATLAS_V1_SPECIFICATION.md` (lines 100-200), but the code writes `manifest.json` with a different structure.

**Current Implementation:**
- File: `manifest.json` (not versioned)
- Structure: `AtlasManifest` interface (types.ts:1119-1250)
- Missing from spec: No `atlas.json` top-level file

**Spec Requirements:**
- File: `manifest.v1.json` or `atlas.json`
- Structure per spec (lines 100-200 of ATLAS_V1_SPECIFICATION.md):
  - `atlas_semver` (not `atlasVersion`)
  - `app_semver` (not in current manifest)
  - `schema_version: "v1"` (not `schemaVersion`)
  - `crawl_config_hash` (missing)
  - `content_addressing: "on" | "off"` (missing)
  - `storage.blob_format` (missing)
  - `storage.replay_tier` (missing)
  - `storage.image_policy` (missing)
  - `privacy_policy` block (missing)
  - `robots_policy` block (partial)
  - `datasets[name].version: "v1"` (missing)
  - `datasets[name].schema_uri` (have `schema` instead)
  - `integrity.blobs_hash` (Merkle root - missing)
  - `integrity.manifest_signed` (optional - missing)

**Gap:** Significant structural differences between implementation and spec.

---

### B. Missing Provenance JSONL File

**Problem:** Spec requires `provenance.v1.jsonl.zst` with structured dataset lineage per `ATLAS_V1_SPECIFICATION.md` (lines 200-250).

**Current Implementation:**
- `ProvenanceTracker` class exists (`io/atlas/provenanceTracker.ts`)
- NO FILE WRITTEN during crawl finalization
- Writer has `this.provenanceTracker` field but never calls `writeToArchive()`

**Spec Requirements:**
```typescript
interface ProvenanceRecord {
  dataset_name: string;
  producer: { app, version, module, module_version };
  created_at: string; // ISO 8601
  inputs: Array<{ dataset, hash_sha256 }>;
  parameters: Record<string, any>;
  output: { record_count, hash_sha256 };
}
```

**Gap:** Provenance tracking infrastructure exists but is never written to archive.

---

### C. Dataset Naming Convention Mismatch

**Problem:** Spec requires `.v1` suffix on all dataset files and directory names.

**Current Implementation:**
- Directories: `pages/`, `edges/`, `assets/` (no version suffix)
- Files: `pages_part_00.jsonl.zst` (no version suffix)
- Schemas: `pages.schema.json` (no version suffix)

**Spec Requirements:**
- Directories: `data/pages.v1/`, `data/edges.v1/`
- Files: `pages.v1.jsonl.zst` or `pages_part_00.v1.jsonl.zst`
- Schemas: `schemas/pages.v1.schema.json`

**Gap:** No versioned naming convention for future spec evolution.

---

### D. Missing Content-Addressed Blob Storage

**Problem:** Spec requires `blobs/sha256/ab/cd/abcd1234...ef.zst` for HTML bodies and resources.

**Current Implementation:**
- Partial infrastructure exists: `io/atlas/blobStorage.ts` (1,095 lines)
- Writer has `blobStorage` field
- PageRecord has `body_blob_ref` field (optional)
- **NOT INTEGRATED into crawl pipeline**

**Spec Requirements:**
- HTML body stored as blob, referenced by `body_blob_ref` in PageRecord
- CSS/JS/fonts stored as blobs in `resources.v1` dataset
- Deduplicated by SHA-256 hash
- Sharded into `blobs/sha256/ab/cd/...` structure

**Gap:** Blob storage infrastructure exists but is not wired into writer.

---

### E. Missing Deterministic Row Ordering

**Problem:** Spec requires deterministic ordering for diffing and partial recovery.

**Current Implementation:**
- No sorting applied to JSONL output
- Pages written in crawl order (non-deterministic)
- Links/assets written in discovery order

**Spec Requirements:**
- Pages sorted by normalized URL (ascending)
- Links grouped by source_page_id, then by DOM order
- Assets grouped by page_id

**Gap:** No post-processing sort step before finalization.

---

### F. Missing Normalized URL Normalization Rules

**Problem:** Spec requires explicit normalization rules in manifest.

**Current Implementation:**
- URL normalization performed by `@cf/url-tools`
- Rules NOT DOCUMENTED in manifest
- No `normalization` block

**Spec Requirements:**
```typescript
normalization: {
  lowercase_host: boolean;
  strip_default_ports: boolean;
  collapse_slashes: boolean;
  strip_tracking_params: boolean;
  sort_query_params: boolean;
  params_kept: string[];
}
```

**Gap:** Normalization is opaque to consumers.

---

### G. Missing Timing Metadata per Page

**Problem:** Spec requires detailed render timing per page.

**Current Implementation:**
- PageRecord has `fetchedAt` (ISO timestamp)
- PageRecord has `renderMode` (raw/prerender/full)
- NO `wait_condition`, `timings` object, or `hydration_done_at`

**Spec Requirements:**
```typescript
interface PageRecord {
  wait_condition: "domcontentloaded" | "networkidle0" | "selector(.main)" | "post_hydration_ms";
  timings: {
    nav_start: number;          // epoch ms
    dom_content_loaded: number;
    load_event_end: number;
    network_idle_reached?: number;
    hydration_done_at?: number;
  };
}
```

**Gap:** Cannot reproduce render decisions or compare timing across crawls.

---

### H. Missing Field-Level Privacy Tags

**Problem:** Spec requires explicit PII field tagging.

**Current Implementation:**
- Privacy config at crawl level (stripCookies, redactInputValues)
- NO FIELD-LEVEL TAGS in schemas or manifest

**Spec Requirements:**
```typescript
privacy: {
  field_tags: {
    "anchor_text": "safe",
    "form_value": "redacted",
    "cookie_value": "hashed"
  };
  redaction_policy: string;
  detector_versions: Record<string, string>;
}
```

**Gap:** Cannot audit what data was captured vs redacted.

---

### I. Missing Robots Meta Enum Codification

**Problem:** Spec requires robots meta as structured enum set.

**Current Implementation:**
- `PageRecord.robotsMeta` is a string (free-form)
- `PageRecord.noindexSurface` is a string (not enum)

**Spec Requirements:**
```typescript
robots_meta: {
  noindex: boolean;
  nofollow: boolean;
  noarchive: boolean;
  nosnippet: boolean;
  notranslate: boolean;
  noimageindex: boolean;
};
```

**Gap:** Inconsistent parsing across consumers.

---

### J. Missing Audit Hash (Archive Fingerprint)

**Problem:** Spec requires single hash over all part hashes.

**Current Implementation:**
- Individual part hashes in `manifest.integrity.files`
- NO ROOT HASH for entire archive

**Spec Requirements:**
```typescript
integrity: {
  audit_hash: string; // SHA-256 of sorted concatenation of all part hashes
  blobs_hash?: string; // Merkle root of blob tree (if blobs present)
}
```

**Gap:** Cannot quickly verify archive integrity without rehashing all parts.

---

### K. Missing Events Dataset per Page

**Problem:** Spec requires per-page event log with warnings, retries, timeouts.

**Current Implementation:**
- `events/` dataset exists
- Writer has `writeEvent()` method
- Events written to global `events_part_XX.jsonl.zst`
- NO `page_id` in EventRecord (types.ts:783)

**Spec Requirements:**
```typescript
interface EventRecord {
  page_id?: string;  // UUID of page (if page-specific)
  level: "info" | "warn" | "error";
  code: string;      // "timeout", "retry", "challenge_detected"
  message: string;
  retry_count?: number;
  duration_ms?: number;
  budget_remaining?: number;
}
```

**Gap:** Cannot trace page-specific errors/warnings in event log.

---

### L. Missing Responses Dataset

**Problem:** Spec defines `responses.v1.jsonl.zst` for raw HTTP metadata separate from pages.

**Current Implementation:**
- `PageRecord` includes HTTP metadata directly
- NO SEPARATE `responses/` directory or dataset

**Spec Requirements (from ATLAS_V1_SPECIFICATION.md):
```typescript
interface ResponseRecord {
  page_id: string;
  url: string;
  http_status: number;
  content_type: string;
  size_bytes: number;
  response_time_ms: number;
  hash_body_sha256: string;
  body_blob_ref?: string;  // If blob storage enabled
}
```

**Gap:** Response data embedded in pages instead of normalized dataset.

---

### M. Missing Render Dataset

**Problem:** Spec defines `render.v1.jsonl.zst` for deterministic render metadata.

**Current Implementation:**
- Render data embedded in `PageRecord` (renderMode, domHash)
- NO SEPARATE `render/` dataset

**Spec Requirements:**
```typescript
interface RenderRecord {
  page_id: string;
  render_mode: RenderMode;
  wait_condition: string;
  timings: { ... };
  viewport_used: { width, height };
  js_errors: number;
  redirected: boolean;
}
```

**Gap:** Render metadata not isolated for offline analysis.

---

### N. Missing Sitemaps & Robots Datasets

**Problem:** Spec defines `sitemaps.v1.jsonl.zst` and `robots.v1.jsonl.zst` datasets.

**Current Implementation:**
- Sitemap parsing exists in extractors
- Robots.txt decisions logged to events
- NO STRUCTURED DATASETS for sitemaps/robots

**Spec Requirements:**
```typescript
interface SitemapRecord {
  sitemap_url: string;
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  discovered_from: "robots" | "page" | "seed";
}

interface RobotsRecord {
  origin: string;
  url: string;
  decision: "allow" | "disallow";
  matching_rule?: string;
  override_used: boolean;
}
```

**Gap:** Cannot audit sitemap/robots compliance after crawl.

---

### O. Missing SEO Signals Dataset

**Problem:** Spec defines consolidated `seo_signals.v1.jsonl.zst` dataset.

**Current Implementation:**
- SEO data embedded in `PageRecord` (title, metaDescription, canonicalHref, etc.)
- Extractors exist: `enhancedSEO.ts`, `openGraph.ts`, `twitterCard.ts`, `structuredData.ts`
- NO SEPARATE `seo_signals/` dataset

**Spec Requirements:**
```typescript
interface SEOSignalRecord {
  page_id: string;
  title: string;
  meta_description?: string;
  canonical_url?: string;
  open_graph: Record<string, string>;
  twitter_card: Record<string, string>;
  structured_data: any[];
  hreflang_links: Array<{ lang, url }>;
}
```

**Gap:** SEO data scattered across PageRecord, not queryable independently.

---

### P. Missing Wait Condition per Page

**Problem:** Spec requires explicit wait condition used per page.

**Current Implementation:**
- Renderer uses wait strategies internally
- NO `wait_condition` field in PageRecord

**Spec Requirements:**
```typescript
wait_condition: "domcontentloaded" | "networkidle0" | "networkidle2" | "selector(.main)" | "post_hydration_ms(2000)";
```

**Gap:** Cannot reproduce render timing or debug incomplete renders.

---

## Prioritized Completion Plan

### Priority 1: Critical Spec Compliance (Must-Have)

#### Task 1.1: Manifest Structure Alignment
**Effort:** 2-3 hours  
**Files:**
- `packages/atlas-spec/src/types.ts` - Add `AtlasManifestV1Spec` interface matching spec exactly
- `packages/cartographer/src/io/atlas/manifest.ts` - Update `buildManifest()` to emit spec-compliant structure
- `packages/cartographer/src/io/atlas/writer.ts` - Write `manifest.v1.json` instead of `manifest.json`

**Deliverables:**
- `manifest.v1.json` with all required fields per spec
- Backward compat: Keep writing `manifest.json` for legacy consumers (deprecated)

#### Task 1.2: Provenance File Generation
**Effort:** 1-2 hours  
**Files:**
- `packages/cartographer/src/io/atlas/writer.ts` - Call `provenanceTracker.writeToArchive()` in `finalize()`
- `packages/cartographer/src/io/atlas/provenanceTracker.ts` - Ensure JSONL compression

**Deliverables:**
- `provenance.v1.jsonl.zst` written to archive root
- One record per dataset generated

#### Task 1.3: Dataset Versioned Naming
**Effort:** 3-4 hours (breaking change)  
**Files:**
- `packages/cartographer/src/io/atlas/writer.ts` - Update all mkdir calls to use `.v1` suffix
- `packages/cartographer/src/io/atlas/datasetWriter.ts` - Update part naming
- `packages/atlas-sdk/src/readers/` - Update path resolution for `.v1` directories

**Deliverables:**
- All datasets named `pages.v1/`, `edges.v1/`, etc.
- Part files named `pages.v1_part_00.jsonl.zst`
- Schemas named `pages.v1.schema.json`

**⚠️ WARNING:** This is a breaking change. Consider implementing both formats with a `--legacy-paths` flag.

#### Task 1.4: Page-Level Timing Metadata
**Effort:** 2-3 hours  
**Files:**
- `packages/atlas-spec/src/types.ts` - Add `timings` and `wait_condition` to `PageRecord`
- `packages/cartographer/src/core/renderer.ts` - Capture navigation timings
- `packages/cartographer/src/core/scheduler.ts` - Pass timings to writer

**Deliverables:**
- `wait_condition` field per page
- `timings` object with nav_start, dom_content_loaded, load_event_end, network_idle_reached

---

### Priority 2: Data Integrity (Should-Have)

#### Task 2.1: Audit Hash Generation
**Effort:** 1 hour  
**Files:**
- `packages/cartographer/src/io/atlas/manifest.ts` - Compute audit_hash in `buildManifest()`

**Deliverables:**
- `integrity.audit_hash` = SHA-256 of sorted concatenated part hashes

#### Task 2.2: Deterministic Row Ordering
**Effort:** 2-3 hours  
**Files:**
- `packages/cartographer/src/io/atlas/writer.ts` - Add sort step before compression
- Create `packages/cartographer/src/io/atlas/sorter.ts` for in-memory or external sort

**Deliverables:**
- Pages sorted by normalized URL
- Links sorted by source_page_id
- Assets sorted by page_id

#### Task 2.3: Normalization Rules in Manifest
**Effort:** 1 hour  
**Files:**
- `packages/cartographer/src/io/atlas/manifest.ts` - Add `normalization` block
- Read rules from `@cf/url-tools` config

**Deliverables:**
- `normalization: { lowercase_host, strip_default_ports, ... }` in manifest

---

### Priority 3: Dataset Separation (Nice-to-Have)

#### Task 3.1: Responses Dataset
**Effort:** 3-4 hours  
**Files:**
- Create `packages/cartographer/src/io/atlas/writer.ts:writeResponse()`
- Extract HTTP fields from PageRecord to ResponseRecord
- Update manifest builder

**Deliverables:**
- `responses.v1/` dataset with HTTP metadata
- PageRecord references ResponseRecord by page_id

#### Task 3.2: Render Dataset
**Effort:** 2-3 hours  
**Files:**
- Create `packages/cartographer/src/io/atlas/writer.ts:writeRender()`
- Extract render fields from PageRecord

**Deliverables:**
- `render.v1/` dataset with deterministic render metadata

#### Task 3.3: SEO Signals Dataset
**Effort:** 3-4 hours  
**Files:**
- Create `packages/cartographer/src/io/atlas/writer.ts:writeSEOSignal()`
- Consolidate SEO fields from PageRecord

**Deliverables:**
- `seo_signals.v1/` dataset with all SEO metadata

#### Task 3.4: Sitemaps & Robots Datasets
**Effort:** 4-5 hours  
**Files:**
- Create `packages/cartographer/src/core/extractors/sitemapParser.ts` (may already exist)
- Create `packages/cartographer/src/core/extractors/robotsDecisions.ts`
- Add writer methods

**Deliverables:**
- `sitemaps.v1/` dataset
- `robots.v1/` dataset

---

### Priority 4: Content-Addressed Storage (Future)

#### Task 4.1: Blob Storage Integration
**Effort:** 8-12 hours (complex)  
**Files:**
- `packages/cartographer/src/io/atlas/writer.ts` - Wire up blobStorage
- `packages/cartographer/src/core/scheduler.ts` - Store HTML bodies as blobs
- `packages/cartographer/src/io/atlas/blobStorage.ts` - Complete integration

**Deliverables:**
- `blobs/sha256/ab/cd/...` directory structure
- PageRecord.body_blob_ref populated
- Deduplication working

**⚠️ NOTE:** This is a major feature. Consider making it opt-in with `--store-blobs` flag.

---

## Immediate Next Steps

### Recommended Approach:

1. **Start with Priority 1 Tasks** (10-12 hours total)
   - These fix critical spec compliance issues
   - Backward compatibility should be maintained where possible

2. **Create Feature Flags** for breaking changes:
   ```bash
   --manifest-version v1|legacy  # Default: v1
   --dataset-paths v1|legacy     # Default: legacy (for now)
   --store-blobs                 # Default: false
   ```

3. **Version Transition Strategy:**
   - v1.1.0: Implement Priority 1 (manifest, provenance, timings)
   - v1.2.0: Add Priority 2 (integrity, ordering)
   - v2.0.0: Breaking change - versioned dataset paths, Priority 3 datasets
   - v2.1.0: Content-addressed storage (opt-in)

4. **Update Tests:**
   - All tests currently expect `manifest.json`, not `manifest.v1.json`
   - Tests expect unversioned dataset paths
   - Create test fixtures for both legacy and v1 formats

5. **Documentation Updates:**
   - Update `ATLAS_V1_SPECIFICATION.md` with implementation status
   - Add migration guide for v1 → v2 transition
   - Update SDK examples to handle both formats

---

## Questions for Decision

1. **Breaking Changes:** Should we implement versioned paths immediately (breaking) or phase in gradually?
2. **Backward Compatibility:** How long should we support legacy `manifest.json` format?
3. **Feature Flags:** Should new datasets (responses, render, seo_signals) be opt-in or always-on?
4. **Blob Storage:** Is this a hard requirement for v1.0 or can it wait for v2.0?
5. **Testing Strategy:** Should we maintain dual test suites (legacy + v1) or hard-cut to v1?

---

## Conclusion

**Estimated Total Effort:** 35-50 hours for complete spec compliance

**Current Completion:** ~60% of Atlas v1.0 spec implemented

**Critical Blockers:**
1. Manifest structure mismatch (2-3 hrs to fix)
2. Missing provenance file (1-2 hrs to fix)
3. No page-level timing metadata (2-3 hrs to fix)

**Recommendation:** Focus on Priority 1 tasks first to achieve minimum viable spec compliance, then iterate on Priority 2-4 based on downstream consumer needs (Continuum, Horizon).
