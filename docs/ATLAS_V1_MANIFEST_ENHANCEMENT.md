# Atlas v1.0 Manifest Enhancement Specification

**Status:** Phase 1 Implementation  
**Created:** 2025-01-23  
**Author:** Cai Frazier

## Overview

This document defines the enhanced `atlas.json` manifest specification that addresses critical gaps in Atlas v1.0 archives. The enhanced manifest provides:

1. **Validation & Versioning** - Embedded schemas, feature gating
2. **Referential Integrity** - Stable page_id system
3. **Coverage Signaling** - Completeness matrix with reason codes
4. **Reproducibility** - Complete environment capture
5. **Data Integrity** - Per-part checksums and row counts
6. **Privacy Controls** - Field-level PII tags and redaction policy
7. **Provenance** - Producer metadata and structured warnings

## Current State Analysis

### Existing AtlasManifest (v1.0.0)

**Strengths:**
- Basic metadata (owner, timestamps, generator)
- File-level integrity hashes
- Capabilities tracking (renderModes, specLevel, robots)
- Dataset metadata structure (optional)

**Critical Gaps:**
- ❌ No producer version/build/git hash
- ❌ No crawl_id for tracking
- ❌ No comprehensive environment capture
- ❌ No coverage matrix with reason codes
- ❌ No per-part row counts (only in optional datasets)
- ❌ No embedded JSON Schema $id references
- ❌ No privacy manifest
- ❌ No structured warnings (only string array)
- ❌ URL-based joins break with redirects/canonicalization

## Phase 1A: Enhanced Manifest Specification

### Top-Level Structure

```typescript
/**
 * Enhanced Atlas v1.0 Manifest
 * File: atlas.json (root of .atls archive)
 */
export interface AtlasManifestV1Enhanced {
  // === SPEC VERSION & IDENTITY ===
  spec_version: string;           // "1.0.0" - Semantic versioning for feature gating
  format_version: string;         // "1.0.0" - Wire format version
  crawl_id: string;               // UUID v7 (time-ordered) for tracking
  
  // === PRODUCER ===
  producer: {
    name: string;                 // "cartographer-engine"
    version: string;              // "1.0.0-beta.1"
    build: string;                // "20250123.2145"
    git_hash?: string;            // "a1b2c3d4" (8-char short hash)
    command_line?: string;        // Full CLI invocation (PII-redacted)
  };
  
  // === OWNERSHIP ===
  owner: {
    name: string;                 // "Cai Frazier"
    organization?: string;        // Optional org name
  };
  
  // === TIMESTAMPS ===
  created_at: string;             // ISO 8601 with timezone
  started_at: string;             // Crawl start
  completed_at: string;           // Crawl end
  duration_sec: number;           // Total crawl duration
  
  // === ENVIRONMENT ===
  environment: {
    // Device & Platform
    device: "desktop" | "mobile"; // Emulation mode
    viewport: {
      width: number;              // 1920 or 375
      height: number;             // 1080 or 667
    };
    user_agent: string;           // Full UA string
    
    // Localization
    locale: string;               // "en-US"
    timezone: string;             // "America/Los_Angeles"
    accept_language: string;      // "en-US,en;q=0.9"
    
    // Performance Profiles
    cpu_throttling?: number;      // 4 = 4x slowdown
    network_profile?: {
      name: string;               // "Fast 3G"
      download_kbps: number;
      upload_kbps: number;
      latency_ms: number;
    };
    
    // Privacy & Compliance
    consent_state?: {
      cookies_enabled: boolean;
      do_not_track: boolean;
      gdpr_mode?: boolean;
    };
    
    // Browser Details
    browser: {
      name: string;               // "chromium"
      version: string;            // "120.0.6099.109"
      headless: boolean;
    };
  };
  
  // === CONFIGURATION ===
  configuration: {
    seeds: string[];              // Initial URLs
    max_pages?: number;           // Page budget
    max_depth?: number;           // Link depth limit
    render_mode: RenderMode;      // "raw" | "prerender" | "full"
    concurrency: number;          // Parallel page limit
    rate_limit_ms?: number;       // Per-origin delay
    respect_robots: boolean;      // robots.txt compliance
    override_robots?: boolean;    // If robots.txt was ignored
    include_external_links: boolean;
    screenshot_mode?: "none" | "errors" | "all";
    error_budget?: number;        // Max errors before abort
  };
  
  // === COVERAGE MATRIX ===
  coverage: {
    matrix: Array<{
      part: string;               // "pages" | "edges" | "assets" | "errors" | "console" | "styles"
      expected: boolean;          // Should this part exist?
      present: boolean;           // Is this part present?
      row_count: number;          // Actual record count
      coverage_pct?: number;      // Optional: estimated completeness
      reason_if_absent?: string;  // "not_in_render_mode" | "no_records" | "disabled"
    }>;
    
    // High-Level Stats
    total_pages: number;
    successful_pages: number;
    failed_pages: number;
    pages_with_errors: number;
    
    // Quality Indicators
    incomplete: boolean;          // Crawl terminated early?
    truncated_parts?: string[];   // Parts that hit limits
  };
  
  // === PARTS (Data Files) ===
  parts: {
    [partName: string]: {
      files: string[];            // ["data/pages/pages_part_00.jsonl.zst"]
      row_count: number;          // Total records across all files
      bytes_compressed: number;   // Total compressed size
      bytes_uncompressed?: number;// Total uncompressed size
      schema_ref: string;         // JSON Schema $id reference
      integrity: {
        algorithm: string;        // "sha256"
        checksums: {
          [fileName: string]: string; // filename -> sha256
        };
      };
    };
  };
  
  // === SCHEMAS ===
  schemas: {
    embedded: boolean;            // Are schemas embedded in archive?
    refs: {
      [partName: string]: {
        id: string;               // "$id" URI from JSON Schema
        version: string;          // "1.0.0"
        hash: string;             // SHA-256 of canonical schema JSON
      };
    };
  };
  
  // === CAPABILITIES ===
  capabilities: {
    render_modes: RenderMode[];   // ["raw", "prerender", "full"]
    modes_used: RenderMode[];     // Modes actually used in this crawl
    spec_level: 1 | 2 | 3;        // 1=Raw, 2=Prerender, 3=Full
    datasets: string[];           // Available parts
    features: string[];           // ["page_id", "content_hashing", "accessibility", "console"]
    
    // Robots Compliance
    robots: {
      respects_robots_txt: boolean;
      override_used: boolean;
      override_reason?: string;   // "owned_site" | "testing"
    };
    
    // Metrics Versions
    metrics: {
      performance?: string;       // "web-vitals@4.2.0"
      accessibility?: string;     // "axe-core@4.10.0"
      seo?: string;               // "lighthouse-seo@11.5.0"
    };
  };
  
  // === PRIVACY ===
  privacy: {
    redaction_applied: boolean;
    redaction_policy?: {
      fields_redacted: string[];  // ["command_line", "cookies"]
      pii_detected: boolean;
      pii_fields?: string[];      // Fields with PII tags
    };
    
    // Field-Level Tags (for future use)
    field_tags?: {
      [field: string]: string[];  // "PageRecord.title": ["pii:potential"]
    };
  };
  
  // === WARNINGS ===
  warnings: Array<{
    code: string;                 // "W001" - machine-readable
    message: string;              // Human-readable explanation
    count?: number;               // How many times occurred
    severity: "info" | "warning" | "error";
    first_occurrence?: string;    // URL or timestamp
  }>;
  
  // === INTEGRITY ===
  integrity: {
    algorithm: string;            // "sha256"
    manifest_hash?: string;       // Hash of this manifest (excluding this field)
    archive_hash?: string;        // Hash of entire archive
    files: {
      [fileName: string]: string; // All files in archive -> sha256
    };
  };
  
  // === NOTES ===
  notes: string[];                // Human-readable notes
  
  // === DEPRECATED (Backward Compatibility) ===
  atlasVersion?: string;          // Legacy: "1.0"
  formatVersion?: string;         // Legacy: "1.0.0"
  generator?: string;             // Legacy: "cartographer-engine/1.0.0"
  consumers?: string[];           // Legacy: intended consumers
  incomplete?: boolean;           // Legacy: use coverage.incomplete instead
  configIncluded?: boolean;       // Legacy: always true now
}
```

## Phase 1B: Stable Page Identifiers

### Problem Statement

**Current State:** All joins between PageRecord, EdgeRecord, and AssetRecord use URLs as foreign keys.

**Failure Cases:**
1. **Redirects** - `https://example.com/old` redirects to `/new`, breaks joins
2. **Canonicalization** - `https://example.com/page?utm=123` vs. `/page` vs. `/page/`
3. **Query Parameters** - Different normalization strategies
4. **Fragment Identifiers** - `#section` variations
5. **Protocol Variations** - `http://` vs. `https://`
6. **Re-crawl Diffing** - No stable ID to track page changes over time

### Solution: UUID-Based Page Identifiers

```typescript
/**
 * Enhanced PageRecord with stable identifier
 */
export interface PageRecordV1Enhanced extends PageRecord {
  // === STABLE IDENTIFIER ===
  page_id: string;                // UUID v7 (time-ordered, globally unique)
  
  // === CONTENT HASHING ===
  content_hash: string;           // SHA-256 of normalized text content
  dom_hash: string;               // SHA-256 of document.documentElement.outerHTML
  
  // === TEMPORAL TRACKING ===
  previous_page_id?: string;      // page_id from previous crawl (for diffing)
  content_changed?: boolean;      // Did content change since last crawl?
  dom_changed?: boolean;          // Did DOM change since last crawl?
  
  // === URL VARIANTS (for display/analysis) ===
  url: string;                    // Original requested URL
  final_url: string;              // After redirects
  normalized_url: string;         // Canonicalized form
  url_key: string;                // SHA-1 (backward compatibility)
  
  // ... (all existing PageRecord fields)
}

/**
 * Enhanced EdgeRecord with stable references
 */
export interface EdgeRecordV1Enhanced {
  // === STABLE REFERENCES ===
  source_page_id: string;         // UUID of source page
  target_page_id?: string;        // UUID of target page (if crawled)
  
  // === URL VARIANTS (for display) ===
  source_url: string;             // Display only
  target_url: string;             // Display only
  
  // === LINK CONTEXT ===
  anchor_text: string;
  rel?: string;
  nofollow: boolean;
  sponsored?: boolean;
  ugc?: boolean;
  is_external: boolean;
  
  // === DOM LOCATION ===
  location: EdgeLocation;         // nav, head, footer, aside, main, other
  selector_hint?: string;         // CSS selector path
  xpath?: string;                 // XPath to link element
  ordinal?: number;               // Nth link in DOM order
  
  // === DISCOVERY ===
  discovered_in_mode: RenderMode;
  http_status_at_target?: number;
  
  // === TEMPORAL ===
  extracted_at: string;           // ISO timestamp when link was extracted
}

/**
 * Enhanced AssetRecord with stable references
 */
export interface AssetRecordV1Enhanced {
  // === STABLE REFERENCES ===
  page_id: string;                // UUID of page containing asset
  asset_id: string;               // UUID v5(namespace, assetUrl) - deterministic
  
  // === URL VARIANTS ===
  page_url: string;               // Display only
  asset_url: string;              // Actual asset URL
  
  // === ASSET METADATA ===
  type: "image" | "video";
  alt?: string;
  has_alt: boolean;
  
  // === DIMENSIONS ===
  natural_width?: number;
  natural_height?: number;
  display_width?: number;
  display_height?: number;
  estimated_bytes?: number;
  
  // === VISIBILITY ===
  visible: boolean;
  in_viewport: boolean;
  loading?: string;               // "lazy" attribute
  was_lazy_loaded: boolean;
  
  // === DOM LOCATION ===
  selector_hint?: string;         // CSS selector path
  xpath?: string;                 // XPath to element
  ordinal?: number;               // Nth asset of this type
}
```

### UUID Generation Strategy

**page_id:**
- **Type:** UUID v7 (time-ordered, 48-bit timestamp + 74-bit random)
- **Generation:** At page discovery (before fetch)
- **Uniqueness:** Globally unique across all crawls
- **Sorting:** Time-ordered for efficient indexing
- **Re-crawl:** New UUID generated each time (use `previous_page_id` for linking)

**asset_id:**
- **Type:** UUID v5 (deterministic, namespace-based)
- **Namespace:** `6ba7b810-9dad-11d1-80b4-00c04fd430c8` (DNS namespace)
- **Input:** `asset_url` (normalized)
- **Determinism:** Same asset URL always gets same UUID
- **Use Case:** De-duplication across pages

### Migration Strategy

**Backward Compatibility:**
1. Keep all URL fields in records (for display)
2. Add new `*_page_id` fields alongside URL fields
3. SDK supports both join strategies:
   - `select({ joinBy: "page_id" })` - New stable joins
   - `select({ joinBy: "url" })` - Legacy URL-based joins
4. Validator warns if URL-based joins are ambiguous

**Writer Implementation:**
```typescript
// Phase 1: Generate page_id at discovery
const page_id = uuidv7(); // Time-ordered
queueEntry.page_id = page_id;

// Phase 2: Calculate content hashes after extraction
const content_hash = sha256(normalizeText(pageRecord.textSample));
const dom_hash = pageRecord.domHash; // Already computed

// Phase 3: Update EdgeRecord with page_ids
edgeRecord.source_page_id = sourcePage.page_id;
edgeRecord.target_page_id = targetPage?.page_id; // null if not crawled

// Phase 4: Update AssetRecord with page_id
assetRecord.page_id = currentPage.page_id;
assetRecord.asset_id = uuidv5(assetRecord.asset_url, DNS_NAMESPACE);
```

## Implementation Checklist

### Phase 1A: Manifest Enhancement

- [ ] Update `AtlasManifest` interface in `packages/atlas-spec/src/types.ts`
- [ ] Add `crawl_id` generation to `startJob.ts`
- [ ] Capture environment snapshot in `startJob.ts`
- [ ] Build coverage matrix in `writer.ts` finalization
- [ ] Calculate per-part row counts during write
- [ ] Generate structured warnings array
- [ ] Emit `atlas.json` at archive finalization
- [ ] Update Atlas SDK to read enhanced manifest
- [ ] Add manifest validator

### Phase 1B: Stable Identifiers

- [ ] Add UUID library (`uuid` package)
- [ ] Update `PageRecord` with `page_id`, `content_hash`, `dom_hash`
- [ ] Generate `page_id` (UUID v7) at page discovery
- [ ] Calculate `content_hash` after text extraction
- [ ] Update `EdgeRecord` with `source_page_id`, `target_page_id`
- [ ] Update `AssetRecord` with `page_id`, `asset_id`
- [ ] Update writer to emit new fields
- [ ] Update SDK join logic to support `page_id`
- [ ] Add migration guide for consumers

### Phase 1C: Testing & Validation

- [ ] Unit tests for UUID generation
- [ ] Unit tests for content hashing
- [ ] Integration test: manifest generation
- [ ] Integration test: page_id joins
- [ ] Validator test: detect ambiguous URL joins
- [ ] Backward compatibility test: legacy archives
- [ ] Re-crawl test: `previous_page_id` linking
- [ ] Performance test: UUID generation overhead
- [ ] Stress test: 100k+ pages with stable IDs

## Success Criteria

1. **Manifest Completeness**
   - ✅ Every field in enhanced spec is populated
   - ✅ Coverage matrix accurately reflects archive contents
   - ✅ Environment snapshot enables reproducibility
   - ✅ Warnings array captures all issues

2. **Referential Integrity**
   - ✅ All EdgeRecord references resolve via `page_id`
   - ✅ No broken joins due to redirects or canonicalization
   - ✅ Asset records link to parent pages via `page_id`
   - ✅ Re-crawl diffing works via `previous_page_id`

3. **Data Integrity**
   - ✅ Per-part checksums match actual files
   - ✅ Row counts match actual record counts
   - ✅ Manifest hash validates manifest integrity
   - ✅ Validator detects corrupted archives

4. **Backward Compatibility**
   - ✅ Legacy fields preserved for v1.0.0 consumers
   - ✅ SDK supports both join strategies
   - ✅ Existing archives still readable
   - ✅ Migration path documented

## Next Steps

After Phase 1 completion:
- **Phase 2:** Schema formalization (embed JSON Schemas in archive)
- **Phase 3:** Data integrity (validation rules, enum codification)
- **Phase 4:** Enhanced metadata (timing, provenance, privacy)
- **Phase 5:** Implementation (writer updates, SDK updates, tests)

## References

- `packages/atlas-spec/src/types.ts` - Current type definitions
- `packages/cartographer/src/io/atlas/writer.ts` - Atlas writer
- `packages/atlas-sdk/src/` - SDK implementation
- `docs/ATLAS_V1_SPECIFICATION.md` - Full v1.0 spec
- [RFC 9562 - UUID v7](https://www.rfc-editor.org/rfc/rfc9562.html)

---

**Copyright © 2025 Cai Frazier.**
