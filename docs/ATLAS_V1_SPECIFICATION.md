# Atlas v1.0 Specification - Full Offline Capability

**Document Version:** 1.0.0-draft  
**Date:** October 26, 2025  
**Status:** Draft Proposal (Pre-Launch)  
**Owner:** Cai Frazier  
**Note:** This is the production specification for Atlas v1.0 before public launch

---

## Executive Summary

This document defines **Atlas v1.0**, a production-grade archive format designed for **complete offline operation** of Continuum (SEO) and Horizon (accessibility) applications. Atlas v1.0 introduces:

- **Content-addressed blob storage** for HTML bodies and resources
- **Versioned dataset schemas** with explicit capabilities
- **Provenance tracking** for multi-app workflows
- **Deterministic DOM snapshots** for offline a11y audits
- **Replay tiering** to balance completeness vs. file size

**Key Principle:** An Atlas archive must contain everything needed to recompute SEO signals, link graphs, diffs, and run complete accessibility audits **without network access**.

**Status Note:** Since Cartographer has not yet launched publicly, this specification represents the target v1.0 format. The current implementation can evolve to match this spec before launch without breaking changes.

---

## Design Goals

### 1. Cross-Application Compatibility
- **Continuum** can analyze SEO, links, and diffs from any Atlas archive
- **Horizon** can run full accessibility audits offline
- **Future apps** can extend archives without breaking existing consumers

### 2. Offline-First Architecture
- All HTML bodies and critical resources captured
- DOM snapshots stored for deterministic replay
- Accessibility trees preserved from crawl time
- No network calls required for analysis

### 3. Storage Efficiency
- Content-addressed blobs deduplicated across pages
- Zstandard compression for all text data
- Tiered replay modes (HTML-only, HTML+CSS, full)
- Optional image exclusion for a11y-only workflows

### 4. Provenance & Auditability
- Every dataset records its producer, version, and input hashes
- Immutable append-only design
- Hash verification for integrity checks
- Capability declarations for feature detection

---

## Archive Structure

### Physical Layout

```
archive.atls/
├── manifest.v1.json                    # Archive metadata
├── capabilities.v1.json                # Feature declarations
├── provenance.v1.jsonl.zst            # Dataset lineage
├── data/
│   ├── pages.v1.jsonl.zst             # Page metadata
│   ├── responses.v1.jsonl.zst         # HTML bodies (compressed)
│   ├── resources.v1.jsonl.zst         # Subresources (CSS, JS, fonts)
│   ├── render.v1.jsonl.zst            # Render metadata
│   ├── dom_snapshot.v1.jsonl.zst      # Post-render DOM
│   ├── acc_tree.v1.jsonl.zst          # Accessibility trees
│   ├── links.v1.jsonl.zst             # Internal/external links
│   ├── sitemaps.v1.jsonl.zst          # Sitemap data
│   ├── robots.v1.jsonl.zst            # Robots.txt decisions
│   ├── seo_signals.v1.jsonl.zst       # SEO metadata
│   └── audit_results.v1.jsonl.zst     # A11y audit findings (empty initially)
├── blobs/                              # Content-addressed storage
│   └── sha256/
│       ├── ab/cd/abcd1234...ef.zst    # HTML body blob
│       ├── 12/34/1234abcd...56.zst    # CSS blob
│       └── ...
└── schemas/                            # JSON Schema definitions
    ├── pages.v1.schema.json
    ├── responses.v1.schema.json
    └── ...
```

---

## Core Datasets

### 1. `manifest.v1.json`

**Purpose:** Archive metadata, versioning, and configuration

```typescript
export interface AtlasManifest {
  // Versioning
  atlas_semver: string;                  // "2.0.0" - Atlas spec version
  app_semver: string;                    // "1.0.0" - Producer app version
  schema_version: string;                // "v1" - Dataset schema version
  
  // Producer
  producer: {
    name: string;                        // "cartographer-engine"
    version: string;                     // "1.0.0-beta.1"
    created_at: string;                  // ISO 8601 timestamp
    locale: string;                      // "en-US"
    timezone: string;                    // "America/Los_Angeles"
  };
  
  // Crawl configuration
  crawl_config_hash: string;             // SHA-256 of normalized config
  content_addressing: "on" | "off";      // Blob storage enabled
  
  // Storage configuration
  storage: {
    blob_format: "zst" | "tar.zst";     // Individual files or packed
    replay_tier: "html" | "html+css" | "full";
    image_policy: "none" | "dimensions" | "full";
    max_image_bytes?: number;            // Exclude images larger than N bytes
  };
  
  // Render configuration
  render: {
    mode: "raw" | "prerender" | "full";
    viewport: { width: number; height: number };
    user_agent: string;
  };
  
  // Security & Privacy
  privacy_policy: {
    strip_cookies: boolean;              // Default: true
    strip_auth_headers: boolean;         // Default: true
    redact_inputs: boolean;              // Default: true
    redact_pii: boolean;                 // Redact obvious PII fields
  };
  
  // Robots.txt compliance
  robots_policy: {
    respect: boolean;
    overrides_used: boolean;             // If true, record in notes
    override_reason?: string;
  };
  
  // Datasets present
  datasets: {
    [name: string]: {
      version: string;                   // "v1"
      record_count: number;
      bytes_compressed: number;
      hash_sha256: string;               // Dataset integrity hash
      schema_uri: string;                // "schemas/pages.v1.schema.json"
    };
  };
  
  // Integrity
  integrity: {
    blobs_hash: string;                  // SHA-256 of all blob hashes (Merkle root)
    manifest_signed?: string;            // Optional: GPG signature
  };
  
  // Notes
  notes: string[];
}
```

### 2. `capabilities.v1.json`

**Purpose:** Feature declarations for cross-app handshake

```typescript
export interface AtlasCapabilities {
  version: string;                       // "v1"
  
  // Required capabilities array
  capabilities: string[];
  
  // Capability definitions
  // Required for Full Atlas:
  // - "seo.core"          → SEO signals dataset present
  // - "a11y.core"         → Accessibility tree dataset present
  // - "render.dom"        → DOM snapshots available
  // - "render.netlog"     → Network log captured
  
  // Optional capabilities:
  // - "replay.html"       → HTML bodies for offline replay
  // - "replay.css"        → CSS resources captured
  // - "replay.js"         → JavaScript resources captured
  // - "replay.images"     → Images captured
  // - "replay.fonts"      → Web fonts captured
  // - "audit.wcag-aa"     → WCAG AA audit results
  // - "audit.wcag-aaa"    → WCAG AAA audit results
  
  // Compatibility declarations
  compatibility: {
    min_sdk_version: string;             // "2.0.0" - Minimum SDK to read
    max_sdk_version?: string;            // "3.0.0" - Known max compatible
    breaking_changes: string[];          // ["removed-field-xyz"]
  };
}
```

**Example:**
```json
{
  "version": "v1",
  "capabilities": [
    "seo.core",
    "a11y.core",
    "render.dom",
    "render.netlog",
    "replay.html",
    "replay.css",
    "replay.fonts"
  ],
  "compatibility": {
    "min_sdk_version": "2.0.0",
    "breaking_changes": []
  }
}
```

### 3. `provenance.v1.jsonl.zst`

**Purpose:** Dataset lineage and audit trail

```typescript
export interface ProvenanceRecord {
  dataset_name: string;                  // "audit_results.v1"
  producer: {
    app: string;                         // "horizon"
    version: string;                     // "1.2.0"
    module: string;                      // "wcag-auditor"
    module_version: string;              // "2.1.0"
  };
  created_at: string;                    // ISO 8601 timestamp
  
  // Input dependencies
  inputs: {
    dataset: string;                     // "dom_snapshot.v1"
    hash_sha256: string;                 // Hash of input dataset
  }[];
  
  // Parameters used
  parameters: {
    wcag_level?: "A" | "AA" | "AAA";
    locale?: string;
    [key: string]: any;
  };
  
  // Output
  output: {
    record_count: number;
    hash_sha256: string;                 // Hash of output dataset
  };
}
```

**Example:**
```jsonl
{"dataset_name":"pages.v1","producer":{"app":"cartographer","version":"1.0.0"},"created_at":"2025-10-26T10:00:00Z","inputs":[],"parameters":{"mode":"full"},"output":{"record_count":123,"hash_sha256":"abc123..."}}
{"dataset_name":"audit_results.v1","producer":{"app":"horizon","version":"1.2.0","module":"wcag-auditor","module_version":"2.1.0"},"created_at":"2025-10-26T11:00:00Z","inputs":[{"dataset":"dom_snapshot.v1","hash_sha256":"def456..."},{"dataset":"acc_tree.v1","hash_sha256":"789abc..."}],"parameters":{"wcag_level":"AA"},"output":{"record_count":45,"hash_sha256":"012def..."}}
```

### 4. `pages.v1.jsonl.zst`

**Purpose:** One record per unique page

```typescript
export interface PageRecord {
  // Identity
  page_id: string;                       // UUID or SHA-1 of normalized URL
  url: string;                           // Original URL
  normalized_url: string;                // Normalized for deduplication
  final_url: string;                     // After redirects
  
  // HTTP response
  http_status: number;                   // 200, 404, etc.
  response_time_ms: number;
  size_bytes: number;                    // Raw HTTP body size
  content_type: string;                  // "text/html; charset=utf-8"
  
  // Content addressing
  hash_body_sha256: string;              // SHA-256 of raw HTTP body
  body_blob_ref?: string;                // "sha256/ab/cd/abcd1234...ef" if stored
  
  // Grouping
  group_key: string;                     // Canonical cluster ID (for canonicalization)
  
  // Discovery
  discovery_source: "seed" | "sitemap" | "page" | "js";
  discovered_from?: string;              // URL that linked here
  depth: number;                         // Crawl depth
  
  // Robots & indexability
  robots_decision: "allow" | "disallow" | "override";
  noindex_hint: boolean;                 // True if noindex detected
  
  // Timestamp
  timestamp_captured: string;            // ISO 8601
}
```

### 5. `responses.v1.jsonl.zst`

**Purpose:** Raw HTML bodies for offline replay

```typescript
export interface ResponseRecord {
  page_id: string;                       // References pages.v1
  encoding: string;                      // "utf-8", "iso-8859-1", etc.
  
  // Body storage (one of):
  body_zstd?: string;                    // Base64-encoded zstd-compressed HTML
  body_blob_ref?: string;                // Content-addressed blob path
}
```

### 6. `resources.v1.jsonl.zst`

**Purpose:** Subresources (CSS, JS, images, fonts) for offline replay

```typescript
export interface ResourceRecord {
  res_id: string;                        // UUID or hash
  owner_page_id: string;                 // Page that referenced this resource
  url: string;                           // Resource URL
  type: "css" | "js" | "image" | "font" | "other";
  
  // HTTP
  status: number;
  content_type: string;
  
  // Content addressing
  hash_body_sha256: string;
  body_blob_ref?: string;                // Blob reference
  
  // Metadata
  size_bytes: number;
  critical: boolean;                     // Required for minimal render
}
```

### 7. `render.v1.jsonl.zst`

**Purpose:** Deterministic render metadata

```typescript
export interface RenderRecord {
  page_id: string;
  viewport: { width: number; height: number };
  ua_family: string;                     // "chrome", "firefox"
  lang: string;                          // "en-US"
  render_mode: "raw" | "prerender" | "full";
  
  // Performance
  render_time_ms: number;
  dom_content_loaded_ms: number;
  network_idle_ms?: number;
  
  // Screenshot (optional)
  screenshot_png_zstd?: string;          // Base64-encoded zstd PNG
  screenshot_blob_ref?: string;          // Blob reference
  
  // Errors
  console_errors: string[];              // Console error messages
  network_error_counts: {
    [status: number]: number;            // { "404": 3, "500": 1 }
  };
}
```

### 8. `dom_snapshot.v1.jsonl.zst`

**Purpose:** Serialized post-render DOM for offline replay

```typescript
export interface DOMSnapshotRecord {
  page_id: string;
  base_url: string;                      // Base URL for resolving relative paths
  
  // DOM storage (one of):
  html_zstd?: string;                    // Base64-encoded zstd HTML string
  dom_json_zstd?: string;                // Structured JSON snapshot (preferred)
  
  // Metadata
  styles_applied: boolean;               // CSS was applied
  scripts_executed: boolean;             // JavaScript ran
  
  // Statistics
  node_count: number;
  text_nodes: number;
  element_nodes: number;
}
```

**DOM JSON Structure (when using `dom_json_zstd`):**
```typescript
export interface DOMNode {
  type: "element" | "text" | "comment";
  tag?: string;                          // For elements
  attributes?: Record<string, string>;
  computed_role?: string;                // ARIA role
  text?: string;                         // For text nodes
  children?: DOMNode[];
}
```

### 9. `acc_tree.v1.jsonl.zst`

**Purpose:** Accessibility tree snapshot for offline audits

```typescript
export interface AccTreeRecord {
  page_id: string;
  
  // Accessibility tree (zstd-compressed JSON)
  nodes_zstd: string;                    // Base64-encoded zstd JSON array
  
  // Landmarks
  landmarks: {
    role: string;                        // "banner", "navigation", "main", etc.
    name?: string;                       // Accessible name
    node_id: string;                     // Reference to DOM node
  }[];
  
  // Tab order
  tab_order: {
    index: number;
    node_id: string;
    focusable: boolean;
  }[];
}
```

**AccNode Structure (in `nodes_zstd`):**
```typescript
export interface AccNode {
  node_id: string;                       // Matches DOM node ID
  role: string;                          // "button", "link", "heading", etc.
  name?: string;                         // Accessible name
  description?: string;                  // Accessible description
  
  // States
  states: {
    focused?: boolean;
    disabled?: boolean;
    checked?: boolean | "mixed";
    expanded?: boolean;
    selected?: boolean;
  };
  
  // Geometry
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // ARIA attributes
  aria?: Record<string, string>;
  
  // Relationships
  children?: string[];                   // Child node IDs
  parent?: string;                       // Parent node ID
}
```

### 10. `links.v1.jsonl.zst`

**Purpose:** Extracted links with anchor data

```typescript
export interface LinkRecord {
  from_page_id: string;
  to_url: string;                        // Target URL (may be external)
  to_page_id?: string;                   // If internal, resolved page_id
  
  // Link attributes
  rel?: string;                          // "nofollow", "sponsored", etc.
  anchor_text: string;
  position_hint: string;                 // CSS selector hint
  
  // Link type flags
  nofollow: boolean;
  ugc: boolean;                          // User-generated content
  sponsored: boolean;
  
  // Discovery
  location: "nav" | "header" | "footer" | "aside" | "main" | "other";
  is_external: boolean;
}
```

### 11. `sitemaps.v1.jsonl.zst`

**Purpose:** Parsed sitemap data

```typescript
export interface SitemapRecord {
  sitemap_url: string;                   // URL of the sitemap
  url: string;                           // URL listed in sitemap
  priority?: number;                     // 0.0 - 1.0
  changefreq?: string;                   // "daily", "weekly", etc.
  lastmod?: string;                      // ISO 8601
}
```

### 12. `robots.v1.jsonl.zst`

**Purpose:** Robots.txt parsing and decisions

```typescript
export interface RobotsRecord {
  origin: string;                        // "https://example.com"
  robots_txt_url: string;                // "https://example.com/robots.txt"
  fetched_at: string;                    // ISO 8601
  
  // Content
  content_hash: string;                  // SHA-256 of robots.txt
  
  // Parsed rules
  rules: {
    user_agent: string;                  // "Googlebot", "*"
    allow: string[];                     // Allowed paths
    disallow: string[];                  // Disallowed paths
  }[];
  
  // Sitemaps declared
  sitemaps: string[];
  
  // Decisions for this crawl
  decisions: {
    url: string;
    decision: "allow" | "disallow";
    rule_matched?: string;
  }[];
}
```

### 13. `seo_signals.v1.jsonl.zst`

**Purpose:** SEO metadata and signals

```typescript
export interface SEOSignalRecord {
  page_id: string;
  
  // Basic SEO
  title?: string;
  title_length: { characters: number; pixels: number };
  meta_description?: string;
  description_length: { characters: number; pixels: number };
  
  // Canonicalization
  canonical_href?: string;               // Verbatim from href
  canonical_resolved?: string;           // Absolute URL
  canonical_cluster_id?: string;         // Group key for canonical cluster
  
  // Hreflang
  hreflang_links: {
    lang: string;                        // "en-US", "fr-FR", etc.
    url: string;
  }[];
  
  // Headings
  h1?: string;
  h1_count: number;
  h2_count: number;
  h3_count: number;
  h4_count: number;
  h5_count: number;
  h6_count: number;
  
  // Schema.org
  schema_items: {
    type: string;                        // "Product", "Article", etc.
    properties: Record<string, any>;
  }[];
  
  // Indexability
  is_indexable: boolean;
  noindex_source?: "meta" | "header" | "both";
  nofollow: boolean;
  
  // Pagination
  pagination_hints: {
    rel_prev?: string;
    rel_next?: string;
  };
  
  // Content
  word_count: number;
  text_content_length: number;
  
  // Social
  open_graph: Record<string, string>;
  twitter_card: Record<string, string>;
}
```

### 14. `audit_results.v1.jsonl.zst`

**Purpose:** Accessibility audit findings (appended by Horizon)

```typescript
export interface AuditResultRecord {
  page_id: string;
  audit_id: string;                      // UUID for this audit run
  auditor_version: string;               // "horizon/1.2.0"
  audited_at: string;                    // ISO 8601
  
  // WCAG findings
  findings: {
    rule_id: string;                     // "1.1.1", "1.4.3", etc.
    severity: "critical" | "serious" | "moderate" | "minor";
    impact: "critical" | "serious" | "moderate" | "minor";
    description: string;
    help_url: string;
    
    // Affected nodes
    nodes: {
      node_id: string;                   // References DOM node
      selector: string;                  // CSS selector
      html_snippet: string;              // For debugging
      fix_suggestion?: string;
    }[];
  }[];
  
  // Summary
  summary: {
    violations: number;
    warnings: number;
    passes: number;
    inapplicable: number;
  };
}
```

---

## Content-Addressed Blob Storage

### Design

**Goal:** Deduplicate HTML bodies and resources across pages and crawls.

**Structure:**
```
blobs/sha256/ab/cd/abcd1234567890...ef.zst
              ^^  ^^  ^^^^^^^^^^^^^^^^^^
              |   |   Full SHA-256 hash
              |   Second byte (dir)
              First byte (dir)
```

**Benefits:**
- Identical HTML bodies stored once (e.g., 404 pages)
- CSS/JS files shared across pages deduplicated
- Archives can reference external blob stores
- Optional packing into single `.tar.zst` for portability

### Blob Reference Format

**In dataset records:**
```typescript
{
  "hash_body_sha256": "abcd1234567890...ef",
  "body_blob_ref": "sha256/ab/cd/abcd1234567890...ef"
}
```

**SDK resolves:**
```typescript
const blob = await atlas.getBlob("sha256/ab/cd/abcd1234567890...ef");
// Reads from: archive.atls/blobs/sha256/ab/cd/abcd1234567890...ef.zst
// Auto-decompresses Zstandard
```

### Packed Blob Format (Optional)

For portability, blobs can be packed into a single archive:

```
archive.atls/
├── manifest.v1.json
├── data/...
└── blobs.tar.zst              # All blobs in single file
```

**Index stored in manifest:**
```json
{
  "blob_storage": {
    "format": "tar.zst",
    "index": {
      "sha256/ab/cd/abcd...ef": {
        "offset": 1024,
        "size": 4096
      }
    }
  }
}
```

---

## Replay Tiering

### Storage Tiers

| Tier | Captures | Use Case | Size Multiplier |
|------|----------|----------|-----------------|
| **html** | HTML bodies only | Text analysis, SEO | 1x |
| **html+css** | HTML + CSS + fonts | A11y audits, layout | 2-3x |
| **full** | All resources + JS + images | Complete replay | 5-10x |

### CLI Usage

```bash
# Minimal capture (SEO only)
cartographer crawl --seeds https://example.com --replay-tier html

# A11y capture (default for --mode full)
cartographer crawl --seeds https://example.com --replay-tier html+css --mode full

# Complete capture (debugging, full replay)
cartographer crawl --seeds https://example.com --replay-tier full --mode full --keep-images
```

### Heuristics

**Image Handling:**
```bash
# Drop images over 5MB (default)
--max-image-bytes 5000000

# Store only dimensions and alt text
--image-policy dimensions

# Store all images
--image-policy full --keep-images
```

---

## Cross-Application Workflows

### Scenario 1: Horizon Audits a Continuum Archive

**Steps:**

1. **Continuum creates archive:**
   ```bash
   cartographer crawl --seeds https://example.com \
     --out site.atls \
     --mode full \
     --replay-tier html+css
   ```

2. **Horizon opens and validates:**
   ```typescript
   const atlas = await openAtlas('./site.atls');
   
   // Check capabilities
   const caps = await atlas.getCapabilities();
   if (!caps.has('a11y.core')) {
     throw new Error('Archive missing a11y.core - cannot audit offline');
   }
   if (!caps.has('render.dom')) {
     console.warn('No DOM snapshots - will use raw HTML');
   }
   ```

3. **Horizon runs audit:**
   ```typescript
   for await (const page of atlas.open('pages.v1')) {
     // Load DOM snapshot
     const dom = await atlas.open('dom_snapshot.v1')
       .find(r => r.page_id === page.page_id);
     
     // Load accessibility tree
     const accTree = await atlas.open('acc_tree.v1')
       .find(r => r.page_id === page.page_id);
     
     // Run WCAG rules (no network!)
     const findings = await runWCAGAudit(dom, accTree, { level: 'AA' });
     
     // Append results
     await atlas.append('audit_results.v1', [findings], {
       producer: { app: 'horizon', version: '1.2.0' }
     });
   }
   ```

4. **Horizon updates provenance:**
   ```typescript
   await atlas.append('provenance.v1', [{
     dataset_name: 'audit_results.v1',
     producer: { app: 'horizon', version: '1.2.0', module: 'wcag-auditor' },
     inputs: [
       { dataset: 'dom_snapshot.v1', hash_sha256: '...' },
       { dataset: 'acc_tree.v1', hash_sha256: '...' }
     ],
     parameters: { wcag_level: 'AA' },
     output: { record_count: 45, hash_sha256: '...' }
   }]);
   ```

### Scenario 2: Continuum Analyzes a Horizon Archive

**Steps:**

1. **Horizon creates archive with audit results**

2. **Continuum opens and reads:**
   ```typescript
   const atlas = await openAtlas('./horizon-audit.atls');
   
   // Check for required datasets
   if (!atlas.has('seo_signals.v1')) {
     throw new Error('Archive missing SEO signals');
   }
   
   // Read SEO data (ignores audit_results.v1 - unknown dataset)
   for await (const seo of atlas.open('seo_signals.v1')) {
     // Compute SEO scores
   }
   
   // Read link graph
   for await (const link of atlas.open('links.v1')) {
     // Build graph
   }
   ```

3. **Continuum ignores unknown datasets:**
   ```typescript
   // If Horizon added custom datasets, Continuum safely ignores them
   // Thanks to dataset-level versioning
   ```

---

## SDK Surface

### Core API

```typescript
// @atlas/sdk v2.0.0

export interface AtlasArchive {
  // Metadata
  getManifest(): Promise<AtlasManifest>;
  getCapabilities(): Promise<Set<string>>;
  
  // Dataset access
  has(datasetName: string): boolean;
  open(datasetName: string): AsyncIterable<Record>;
  
  // Blob storage
  getBlob(hash: string): Promise<Buffer | Readable>;
  hasBlob(hash: string): boolean;
  
  // Append (immutable)
  append(
    datasetName: string,
    iterator: AsyncIterable<Record>,
    provenance: ProvenanceRecord
  ): Promise<void>;
  
  // Verification
  verify(): Promise<VerificationResult>;
  
  // Close
  close(): Promise<void>;
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  
  // Hash checks
  manifest_integrity: boolean;
  dataset_hashes: Record<string, boolean>;
  blob_hashes: Record<string, boolean>;
  
  // Capability checks
  capability_violations: string[];
}
```

### Usage Examples

#### Opening an Archive
```typescript
import { openAtlas } from '@atlas/sdk';

const atlas = await openAtlas('./crawl.atls');

// Check capabilities
const caps = await atlas.getCapabilities();
console.log([...caps]); // ["seo.core", "a11y.core", "render.dom"]

// Check dataset availability
if (atlas.has('audit_results.v1')) {
  console.log('Audit results present');
}
```

#### Reading a Dataset
```typescript
// Iterate pages
for await (const page of atlas.open('pages.v1')) {
  console.log(page.url, page.http_status);
  
  // Load HTML body from blob storage
  if (page.body_blob_ref) {
    const html = await atlas.getBlob(page.body_blob_ref);
    console.log('HTML size:', html.length);
  }
}
```

#### Appending Audit Results
```typescript
// Run audit
const findings = await runAudit(pages);

// Append to archive (creates new dataset file)
await atlas.append('audit_results.v1', findings, {
  dataset_name: 'audit_results.v1',
  producer: {
    app: 'horizon',
    version: '1.2.0',
    module: 'wcag-auditor',
    module_version: '2.1.0'
  },
  created_at: new Date().toISOString(),
  inputs: [
    { dataset: 'dom_snapshot.v1', hash_sha256: await getDatasetHash('dom_snapshot.v1') }
  ],
  parameters: { wcag_level: 'AA' },
  output: { record_count: findings.length, hash_sha256: '...' }
});
```

#### Verification
```typescript
const result = await atlas.verify();

if (!result.valid) {
  console.error('Archive verification failed:');
  result.errors.forEach(err => console.error('  -', err));
}

if (result.warnings.length > 0) {
  console.warn('Warnings:');
  result.warnings.forEach(warn => console.warn('  -', warn));
}
```

---

## Validation & Migration

### CLI: `atlas validate`

**Purpose:** Validate archive integrity and capability-specific checks

```bash
# Full validation
atlas validate crawl.atls

# Output
✓ Manifest integrity OK
✓ Dataset hashes verified: pages.v1, links.v1, seo_signals.v1
✓ Blob hashes verified: 123 blobs
✓ Capability check: a11y.core → dom_snapshot.v1 present ✓
✓ Capability check: a11y.core → acc_tree.v1 present ✓
✓ Schema validation: All records valid
⚠ Warning: audit_results.v1 is empty (expected for initial crawl)

Result: VALID (1 warning)
```

**Checks Performed:**
1. Manifest JSON valid
2. All dataset hashes match file contents
3. All blob hashes match stored files
4. Capability-specific requirements met:
   - If `a11y.core` → `dom_snapshot.v1` and `acc_tree.v1` must exist
   - If `seo.core` → `seo_signals.v1` must exist
   - If `render.dom` → `dom_snapshot.v1` must exist
5. Schema validation for all records
6. Cross-references valid (e.g., `page_id` in links exists in pages)

### CLI: `atlas migrate`

**Purpose:** Migrate older archives to current version

```bash
# Migrate v1.0 archive to v2.0
atlas migrate --from 1.0 --to 2.0 old-archive.atls new-archive.atls

# Output
→ Reading v1.0 archive...
→ Converting pages format...
→ Adding missing fields (body_blob_ref, group_key)...
→ Extracting HTML bodies to blob storage...
→ Writing v2.0 archive...
→ Adding provenance record...
✓ Migration complete

Provenance:
  Migrated from: Atlas v1.0 (cartographer/1.0.0-beta.1)
  Migration tool: atlas-migrate v2.0.0
  Transform: v1-to-v2-standard
  Input hash: abc123...
  Output hash: def456...
```

**Migration Process:**
1. Load old archive (read-only)
2. Transform records to new schema
3. Extract HTML bodies to blob storage if `content_addressing: on`
4. Write new archive with updated manifest
5. Add provenance record documenting migration
6. Verify new archive

---

## Minimal Cartographer Changes

### 1. Add Replay Capture Stage

**New Module:** `packages/cartographer/src/core/extractors/replayCapture.ts`

```typescript
export async function captureForReplay(
  page: Page,
  pageRecord: PageRecord,
  config: EngineConfig
): Promise<ReplayCaptureResult> {
  const tier = config.replayTier || 'html';
  
  const result: ReplayCaptureResult = {
    response: null,
    domSnapshot: null,
    accTree: null,
    resources: []
  };
  
  // 1. Capture HTML body
  const html = await page.content();
  result.response = {
    page_id: pageRecord.page_id,
    encoding: 'utf-8',
    body_blob_ref: await storeBlob(html, config)
  };
  
  // 2. Capture post-render DOM (if full mode)
  if (config.render.mode === 'full') {
    result.domSnapshot = await captureDOMSnapshot(page, pageRecord.page_id);
    result.accTree = await captureAccessibilityTree(page, pageRecord.page_id);
  }
  
  // 3. Capture resources based on tier
  if (tier === 'html+css' || tier === 'full') {
    result.resources = await captureResources(page, pageRecord, tier, config);
  }
  
  return result;
}
```

### 2. Versioned Dataset Writers

**New Module:** `packages/cartographer/src/io/atlas/datasetWriter.ts`

```typescript
export class DatasetWriter<T> {
  constructor(
    private name: string,           // "pages"
    private version: string,        // "v1"
    private schemaUri: string,      // "schemas/pages.v1.schema.json"
    private stagingDir: string
  ) {}
  
  async write(record: T): Promise<void> {
    // Validate against schema
    await this.validateRecord(record);
    
    // Write to JSONL part
    const line = JSON.stringify(record) + '\n';
    await this.appendToPart(line);
    
    this.recordCount++;
  }
  
  async finalize(): Promise<DatasetMetadata> {
    // Compress JSONL parts
    await this.compressParts();
    
    // Compute dataset hash
    const hash = await this.computeHash();
    
    return {
      name: this.name,
      version: this.version,
      record_count: this.recordCount,
      bytes_compressed: this.bytesCompressed,
      hash_sha256: hash,
      schema_uri: this.schemaUri
    };
  }
}
```

### 3. Add Capabilities & Provenance Tracking

**Update:** `packages/cartographer/src/io/atlas/writer.ts`

```typescript
export class AtlasWriter {
  private capabilities: Set<string> = new Set();
  private provenance: ProvenanceRecord[] = [];
  
  async init() {
    // Build capabilities based on config
    this.buildCapabilities();
    
    // Initialize dataset writers
    this.writers = {
      pages: new DatasetWriter('pages', 'v1', 'schemas/pages.v1.schema.json', this.stagingDir),
      responses: new DatasetWriter('responses', 'v1', 'schemas/responses.v1.schema.json', this.stagingDir),
      // ... etc
    };
  }
  
  private buildCapabilities() {
    // Always present
    this.capabilities.add('seo.core');
    this.capabilities.add('render.dom');
    
    // Conditional
    if (this.config.render.mode === 'full') {
      this.capabilities.add('a11y.core');
      this.capabilities.add('render.netlog');
    }
    
    if (this.config.replayTier === 'html') {
      this.capabilities.add('replay.html');
    } else if (this.config.replayTier === 'html+css') {
      this.capabilities.add('replay.html');
      this.capabilities.add('replay.css');
      this.capabilities.add('replay.fonts');
    } else if (this.config.replayTier === 'full') {
      this.capabilities.add('replay.html');
      this.capabilities.add('replay.css');
      this.capabilities.add('replay.js');
      this.capabilities.add('replay.fonts');
      this.capabilities.add('replay.images');
    }
  }
  
  async finalize() {
    // Finalize all datasets
    const datasets: Record<string, DatasetMetadata> = {};
    for (const [name, writer] of Object.entries(this.writers)) {
      datasets[name] = await writer.finalize();
      
      // Add provenance record
      this.provenance.push({
        dataset_name: `${name}.v1`,
        producer: {
          app: 'cartographer',
          version: packageJson.version,
          module: `extractor-${name}`,
          module_version: '1.0.0'
        },
        created_at: new Date().toISOString(),
        inputs: [],
        parameters: { mode: this.config.render.mode },
        output: {
          record_count: datasets[name].record_count,
          hash_sha256: datasets[name].hash_sha256
        }
      });
    }
    
    // Write manifest
    await this.writeManifest(datasets);
    
    // Write capabilities
    await this.writeCapabilities();
    
    // Write provenance
    await this.writeProvenance();
    
    // Package into .atls
    await this.packageArchive();
  }
}
```

### 4. Add Profile Flag

**Update:** `packages/cartographer/src/cli/commands/crawl.ts`

```typescript
yargs.command({
  command: 'crawl',
  builder: (yargs) => {
    return yargs
      .option('profile', {
        type: 'string',
        choices: ['core', 'full'],
        default: 'core',
        describe: 'Crawl profile: core (SEO only) or full (SEO + a11y + replay)'
      })
      .option('replay-tier', {
        type: 'string',
        choices: ['html', 'html+css', 'full'],
        default: 'html+css',
        describe: 'Replay capture tier'
      })
      .option('keep-images', {
        type: 'boolean',
        default: false,
        describe: 'Store all images (increases archive size)'
      })
      .option('max-image-bytes', {
        type: 'number',
        default: 5_000_000,
        describe: 'Exclude images larger than N bytes'
      });
  },
  handler: async (argv) => {
    const config = buildConfig({
      ...argv,
      render: {
        mode: argv.profile === 'full' ? 'full' : 'prerender'
      },
      replayTier: argv.replayTier,
      imagePolicy: argv.keepImages ? 'full' : 'dimensions',
      maxImageBytes: argv.maxImageBytes
    });
    
    await startJob(config);
  }
});
```

---

## Test Strategy

### 1. Golden Fixtures

**Purpose:** Lock in schema stability with deterministic test archives

**Setup:**
```
packages/cartographer/test/fixtures/golden-atlas/
├── site-a-v2.atls               # 10-page site, Full profile
├── site-b-v2.atls               # 10-page site, Core profile
└── README.md
```

**Test:**
```typescript
describe('Golden Atlas Fixtures', () => {
  test('Horizon can audit site-a-v2.atls offline', async () => {
    const atlas = await openAtlas('./test/fixtures/golden-atlas/site-a-v2.atls');
    
    // Verify capabilities
    const caps = await atlas.getCapabilities();
    expect(caps.has('a11y.core')).toBe(true);
    
    // Disable networking
    disableNetwork();
    
    // Run audit (no network calls!)
    const results = await runWCAGAudit(atlas, { level: 'AA' });
    
    // Verify findings
    expect(results.violations.length).toBeGreaterThan(0);
    expect(results.summary.violations).toBe(results.violations.length);
  });
  
  test('Continuum can analyze site-b-v2.atls', async () => {
    const atlas = await openAtlas('./test/fixtures/golden-atlas/site-b-v2.atls');
    
    // Build link graph
    const graph = await buildLinkGraph(atlas);
    expect(graph.nodes.length).toBe(10);
    
    // Compute SEO scores
    const scores = await computeSEOScores(atlas);
    expect(scores.avgTitleLength).toBeGreaterThan(0);
  });
});
```

### 2. Round-Trip Tests

**Purpose:** Verify append-only design

```typescript
describe('Atlas Round-Trip', () => {
  test('Can append audit results and reopen', async () => {
    // Open archive
    const atlas = await openAtlas('./test.atls');
    
    // Append audit results
    const findings = [
      { page_id: 'page1', audit_id: 'audit1', findings: [...] }
    ];
    await atlas.append('audit_results.v1', findings, {
      dataset_name: 'audit_results.v1',
      producer: { app: 'horizon', version: '1.0.0' },
      created_at: new Date().toISOString(),
      inputs: [{ dataset: 'dom_snapshot.v1', hash_sha256: '...' }],
      parameters: {},
      output: { record_count: 1, hash_sha256: '...' }
    });
    
    await atlas.close();
    
    // Reopen and verify
    const atlas2 = await openAtlas('./test.atls');
    expect(atlas2.has('audit_results.v1')).toBe(true);
    
    const results = [];
    for await (const r of atlas2.open('audit_results.v1')) {
      results.push(r);
    }
    expect(results.length).toBe(1);
    
    // Verify manifest updated
    const manifest = await atlas2.getManifest();
    expect(manifest.datasets['audit_results.v1']).toBeDefined();
    
    // Verify provenance
    const prov = [];
    for await (const p of atlas2.open('provenance.v1')) {
      prov.push(p);
    }
    expect(prov.some(p => p.dataset_name === 'audit_results.v1')).toBe(true);
  });
});
```

### 3. Back-Compat Matrix

**Purpose:** Test cross-version compatibility

```typescript
describe('Backward Compatibility', () => {
  const fixtures = [
    { version: '1.0', path: './fixtures/atlas-v1.0.atls' },
    { version: '1.1', path: './fixtures/atlas-v1.1.atls' },
    { version: '2.0', path: './fixtures/atlas-v2.0.atls' }
  ];
  
  fixtures.forEach(({ version, path }) => {
    test(`SDK v2.0 can read Atlas v${version}`, async () => {
      const atlas = await openAtlas(path);
      const manifest = await atlas.getManifest();
      
      if (version === '1.0') {
        // Legacy mode: no capabilities or provenance
        expect(await atlas.getCapabilities()).toEqual(new Set());
      } else {
        expect(await atlas.getCapabilities()).toBeTruthy();
      }
      
      // Can still read pages
      let count = 0;
      for await (const page of atlas.open('pages')) {
        count++;
      }
      expect(count).toBeGreaterThan(0);
    });
  });
});
```

---

## Security & Privacy

### Default Security Posture

**1. Strip Authentication:**
```typescript
// In packages/cartographer/src/core/renderer.ts
export async function fetchPage(url: string, config: EngineConfig): Promise<Response> {
  const headers = new Headers();
  
  // Default: strip cookies and auth headers
  if (config.privacy_policy.strip_cookies) {
    // Do not send cookies
  }
  if (config.privacy_policy.strip_auth_headers) {
    // Do not send Authorization, Bearer, etc.
  }
  
  return fetch(url, { headers });
}
```

**2. Redact Input Values:**
```typescript
// In packages/cartographer/src/core/extractors/domSnapshot.ts
export function sanitizeDOMSnapshot(dom: DOMNode, config: EngineConfig): DOMNode {
  if (config.privacy_policy.redact_inputs) {
    // Redact <input type="password"> values
    // Redact <input name="credit_card|ssn|..."> values
    // Redact obvious PII fields
  }
  return dom;
}
```

**3. Robots.txt Enforcement:**
```typescript
// In packages/cartographer/src/core/scheduler.ts
export class Scheduler {
  async shouldCrawlUrl(url: string): Promise<{ allow: boolean; reason: string }> {
    if (this.config.robots_policy.respect) {
      const decision = await this.robotsChecker.isAllowed(url);
      if (!decision.allowed) {
        await this.logRobotsDecision(url, 'disallow', decision.rule);
        return { allow: false, reason: `Blocked by robots.txt: ${decision.rule}` };
      }
    }
    
    if (this.config.robots_policy.overrides_used) {
      await this.logRobotsOverride(url);
      this.manifest.notes.push(`⚠️ robots.txt override used for ${url}`);
    }
    
    return { allow: true, reason: 'allowed' };
  }
}
```

### Manifest Disclosure

**Required fields:**
```json
{
  "privacy_policy": {
    "strip_cookies": true,
    "strip_auth_headers": true,
    "redact_inputs": true,
    "redact_pii": false
  },
  "robots_policy": {
    "respect": true,
    "overrides_used": false
  },
  "notes": [
    "Crawled with robots.txt respect enabled",
    "No authentication headers sent",
    "Input values redacted"
  ]
}
```

---

## Migration Path from Atlas v1.0

### Phase 1: Dual-Write (Weeks 1-2)

- Cartographer writes both v1.0 and v2.0 datasets
- Manifest includes `legacy_compat: true` flag
- SDK reads v2.0, falls back to v1.0 if missing

### Phase 2: V2-Only (Weeks 3-4)

- Cartographer writes v2.0 only
- SDK emits deprecation warnings for v1.0 archives
- Migration tool available: `atlas migrate --to 2.0`

### Phase 3: Drop V1 Support (Month 3+)

- SDK requires v2.0+
- Legacy archives must be migrated
- Clear error message with migration instructions

---

## Implementation Checklist

### Atlas Spec Package

- [ ] Create `packages/atlas-spec-v2/` with new types
- [ ] Generate JSON Schemas for all datasets
- [ ] Add Zod validators
- [ ] Publish as `@caifrazier/atlas-spec@2.0.0`

### Cartographer Engine

- [ ] Add `replayCapture.ts` extractor module
- [ ] Implement blob storage with content addressing
- [ ] Create versioned `DatasetWriter` class
- [ ] Add capabilities and provenance tracking
- [ ] Implement `--profile` and `--replay-tier` flags
- [ ] Update manifest builder for v2.0 structure
- [ ] Add privacy defaults (strip cookies, redact inputs)

### Atlas SDK

- [ ] Implement `getCapabilities()` and `has(dataset)`
- [ ] Add `getBlob()` for content-addressed storage
- [ ] Implement `append()` with provenance
- [ ] Add `verify()` for integrity checks
- [ ] Support packed blob format (`.tar.zst`)
- [ ] Backward compat for v1.0 archives

### CLI Tools

- [ ] Implement `atlas validate` command
- [ ] Implement `atlas migrate` command
- [ ] Add `--skip-validation` flag for legacy

### Testing

- [ ] Create 2 golden fixtures (site-a-v2, site-b-v2)
- [ ] Add round-trip tests (append + reopen)
- [ ] Add back-compat matrix tests (v1.0, v1.1, v2.0)
- [ ] Network-disabled Horizon audit tests

### Documentation

- [ ] Update README with v2.0 examples
- [ ] Write migration guide from v1.0
- [ ] Document security & privacy defaults
- [ ] Add operational runbooks

---

## Success Metrics

### Technical Metrics

- [ ] **100% offline capability** - Horizon can audit without network
- [ ] **50%+ storage savings** - Content-addressed blobs deduplicate
- [ ] **Zero breaking changes** - V1.0 archives still readable
- [ ] **Schema validation** - All records pass JSON Schema checks

### Product Metrics

- [ ] **Continuum + Horizon interop** - Can exchange archives
- [ ] **Migration success** - 100% of v1.0 archives migrated
- [ ] **Developer adoption** - External tools use JSON Schemas
- [ ] **Security compliance** - No PII/credentials in archives

---

## Conclusion

Atlas v2.0 transforms the archive format from a simple data container into a **true contract layer** that enables:

1. **Complete offline operation** for Continuum and Horizon
2. **Cross-application interoperability** with capability handshakes
3. **Storage efficiency** through content-addressed blobs
4. **Provenance tracking** for multi-app workflows
5. **Security and privacy** by default

This specification provides a **production-ready foundation** for the Cartographer ecosystem to scale while maintaining strict compatibility guarantees and operational excellence.

**Pre-Launch Advantage:** Since Cartographer hasn't launched publicly yet, we can implement this complete specification as Atlas v1.0 without worrying about backward compatibility or migration paths. This gives us a clean start with enterprise-grade architecture from day one.

**Next Step:** Review this specification with stakeholders and implement as Atlas v1.0 before public launch.
