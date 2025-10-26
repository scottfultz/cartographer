# Atlas v1.0 Archive Format Specification

**Version:** 1.0  
**Status:** Release Candidate  
**Date:** October 2025  
**Owner:** Cai Frazier  
**Copyright:** © 2025 Cai Frazier. All rights reserved.

---

## 1. Introduction

The **Atlas v1.0** format is a structured, compressed archive format for web crawl data. It packages page content, navigation graphs, assets, errors, and accessibility audits into a single `.atls` file optimized for downstream analysis.

### 1.1 Design Goals

- **Structured:** JSONL (newline-delimited JSON) for streaming and parallel processing
- **Compressed:** Zstandard compression for efficient storage (typical 10:1 ratio)
- **Self-contained:** Single-file distribution with embedded schemas and manifest
- **Verifiable:** SHA-256 integrity hashes for all parts
- **Extensible:** Versioned format with clear upgrade paths

### 1.2 Consumers

- **Continuum SEO** - Technical SEO analysis platform
- **Horizon Accessibility** - WCAG compliance auditing
- **Data pipelines** - CSV export, database import, analytics

---

## 2. Archive Structure

An Atlas archive is a **ZIP file** with the `.atls` extension containing the following structure:

```
example.atls/
├── manifest.json              # Archive metadata and inventory
├── summary.json               # Crawl statistics
├── schemas/                   # JSON schemas for validation
│   ├── page.schema.json
│   ├── edge.schema.json
│   ├── asset.schema.json
│   ├── error.schema.json
│   └── accessibility.schema.json
└── parts/                     # Compressed JSONL data
    ├── pages.jsonl.zst        # PageRecord[]
    ├── edges.jsonl.zst        # EdgeRecord[]
    ├── assets.jsonl.zst       # AssetRecord[]
    ├── errors.jsonl.zst       # ErrorRecord[]
    └── accessibility.jsonl.zst # AccessibilityRecord[] (full mode only)
```

### 2.1 File Naming Convention

Archives use the pattern: `{domain}_{YYYYMMDD}_{HHMMSS}_{mode}.atls`

**Example:** `example_com_20251025_143022_prerender.atls`

---

## 3. Manifest Format

The `manifest.json` file describes the archive contents and provenance.

### 3.1 Schema

```json
{
  "atlasVersion": "1.0",
  "specVersion": "1.0.0",
  "schemaVersion": "1.0.0",
  "incomplete": false,
  
  "owner": {
    "name": "Cai Frazier"
  },
  
  "consumers": [
    "Continuum SEO",
    "Horizon Accessibility"
  ],
  
  "hashing": {
    "algorithm": "sha256",
    "urlKeyAlgo": "sha1",
    "rawHtmlHash": "sha256 of raw HTTP body",
    "domHash": "sha256 of document.documentElement.outerHTML"
  },
  
  "crawl": {
    "crawlId": "crawl_1698765432000_1234",
    "startedAt": "2025-10-25T14:30:22Z",
    "finishedAt": "2025-10-25T14:35:48Z",
    "durationSeconds": 326,
    "renderMode": "prerender",
    "seeds": ["https://example.com"],
    "finishReason": "finished",
    "respectsRobotsTxt": true
  },
  
  "stats": {
    "totalPages": 142,
    "totalEdges": 1247,
    "totalAssets": 318,
    "totalErrors": 3,
    "totalAccessibilityIssues": 0
  },
  
  "parts": {
    "pages": {
      "path": "parts/pages.jsonl.zst",
      "count": 142,
      "bytes": 1847293,
      "sha256": "a3f5e8d9c2b1f4e6d7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0"
    },
    "edges": {
      "path": "parts/edges.jsonl.zst",
      "count": 1247,
      "bytes": 98432,
      "sha256": "b4e6d8c0a2f1e3d5c7b9a1f0e2d4c6b8a0f1e3d5c7b9a1f0e2d4c6b8a0f1e3d5"
    },
    "assets": {
      "path": "parts/assets.jsonl.zst",
      "count": 318,
      "bytes": 45821,
      "sha256": "c5d7e9a1f3e5d7c9b1a3f5e7d9c1b3a5f7e9d1c3b5a7f9e1d3c5b7a9f1e3d5c7"
    },
    "errors": {
      "path": "parts/errors.jsonl.zst",
      "count": 3,
      "bytes": 1247,
      "sha256": "d6e8f0a2f4e6d8c0b2a4f6e8d0c2b4a6f8e0d2c4b6a8f0e2d4c6b8a0f2e4d6c8"
    }
  },
  
  "provenance": {
    "cartographerVersion": "1.0.0-rc.1",
    "nodeVersion": "v20.11.0",
    "playwrightVersion": "1.40.0",
    "hostname": "crawler-prod-01",
    "resumeOf": null,
    "checkpointInterval": 500,
    "gracefulShutdown": false
  }
}
```

### 3.2 Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `atlasVersion` | string | ✅ | Format version (e.g., "1.0") |
| `specVersion` | string | ✅ | Specification version |
| `incomplete` | boolean | ❌ | True if crawl was interrupted |
| `owner.name` | string | ✅ | Archive owner attribution |
| `consumers` | string[] | ✅ | Intended consumer applications |
| `hashing.algorithm` | string | ✅ | Hash algorithm for integrity |
| `crawl.crawlId` | string | ✅ | Unique crawl identifier |
| `crawl.renderMode` | string | ✅ | One of: `raw`, `prerender`, `full` |
| `crawl.finishReason` | string | ✅ | One of: `finished`, `capped`, `error_budget`, `manual` |
| `stats.*` | number | ✅ | Record counts per part |
| `parts.*.path` | string | ✅ | Relative path to compressed file |
| `parts.*.count` | number | ✅ | Number of records |
| `parts.*.bytes` | number | ✅ | Compressed file size |
| `parts.*.sha256` | string | ✅ | Integrity hash (hex) |

---

## 4. Data Parts

### 4.1 Pages (`pages.jsonl.zst`)

Each line is a **PageRecord** representing a crawled URL.

#### Schema

```typescript
interface PageRecord {
  url: string;                    // Canonical URL
  finalUrl: string;               // After redirects
  statusCode: number;             // HTTP status
  depth: number;                  // Crawl depth from seeds
  discoveredFrom: string | null;  // Parent URL
  fetchedAt: string;              // ISO 8601 timestamp
  renderMode: "raw" | "prerender" | "full";
  
  // Content
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonicalUrl: string | null;
  lang: string | null;
  textSample: string;             // First 500 chars
  
  // Hashes
  rawHtmlHash: string;            // SHA-256 of HTTP body
  domHash: string;                // SHA-256 of rendered DOM
  
  // Metrics
  loadTimeMs: number;
  renderTimeMs: number;
  contentBytes: number;
  
  // Structured data
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  jsonLd: any[];
  
  // Screenshots (full mode only)
  screenshotDesktop?: string;     // Path in archive
  screenshotMobile?: string;      // Path in archive
}
```

#### Example

```json
{
  "url": "https://example.com/about",
  "finalUrl": "https://example.com/about",
  "statusCode": 200,
  "depth": 1,
  "discoveredFrom": "https://example.com/",
  "fetchedAt": "2025-10-25T14:31:05Z",
  "renderMode": "prerender",
  "title": "About Us - Example Company",
  "metaDescription": "Learn more about our mission and team.",
  "h1": "About Our Company",
  "canonicalUrl": "https://example.com/about",
  "lang": "en",
  "textSample": "Welcome to our about page. We are a team of...",
  "rawHtmlHash": "a3f5e8d9c2b1f4e6d7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0",
  "domHash": "b4e6d8c0a2f1e3d5c7b9a1f0e2d4c6b8a0f1e3d5c7b9a1f0e2d4c6b8a0f1e3d5",
  "loadTimeMs": 342,
  "renderTimeMs": 1205,
  "contentBytes": 47821,
  "openGraph": {
    "og:title": "About Us",
    "og:type": "website"
  },
  "twitterCard": {},
  "jsonLd": []
}
```

### 4.2 Edges (`edges.jsonl.zst`)

Each line is an **EdgeRecord** representing a link between pages.

#### Schema

```typescript
interface EdgeRecord {
  from: string;           // Source URL
  to: string;             // Target URL
  toResolved: string;     // After normalization
  anchor: string | null;  // Link text
  location: "nav" | "header" | "footer" | "main" | "aside" | "unknown";
  rel: string[];          // rel attributes
  discoveredInMode: "raw" | "prerender" | "full";
  isExternal: boolean;
  isCanonical: boolean;
}
```

#### Example

```json
{
  "from": "https://example.com/",
  "to": "https://example.com/about",
  "toResolved": "https://example.com/about",
  "anchor": "About Us",
  "location": "nav",
  "rel": [],
  "discoveredInMode": "prerender",
  "isExternal": false,
  "isCanonical": false
}
```

### 4.3 Assets (`assets.jsonl.zst`)

Each line is an **AssetRecord** representing a referenced resource.

#### Schema

```typescript
interface AssetRecord {
  url: string;              // Asset URL
  type: "image" | "script" | "stylesheet" | "font" | "other";
  referrer: string;         // Page that referenced it
  statusCode: number | null;
  contentType: string | null;
  sizeBytes: number | null;
  loadTimeMs: number | null;
}
```

#### Example

```json
{
  "url": "https://example.com/assets/logo.png",
  "type": "image",
  "referrer": "https://example.com/",
  "statusCode": 200,
  "contentType": "image/png",
  "sizeBytes": 14728,
  "loadTimeMs": 142
}
```

### 4.4 Errors (`errors.jsonl.zst`)

Each line is an **ErrorRecord** representing a crawl error.

#### Schema

```typescript
interface ErrorRecord {
  url: string;
  origin: string;
  hostname: string;
  occurredAt: string;       // ISO 8601
  phase: "fetch" | "render" | "extract" | "write";
  code: string;             // Error code
  message: string;
  stack?: string;
}
```

#### Example

```json
{
  "url": "https://example.com/broken",
  "origin": "https://example.com",
  "hostname": "example.com",
  "occurredAt": "2025-10-25T14:32:15Z",
  "phase": "fetch",
  "code": "HTTP_404",
  "message": "Not Found",
  "stack": null
}
```

### 4.5 Accessibility (`accessibility.jsonl.zst`)

Only present in **full mode** crawls. Each line is an accessibility audit result.

#### Schema

```typescript
interface AccessibilityRecord {
  url: string;
  auditedAt: string;
  violations: {
    id: string;
    impact: "critical" | "serious" | "moderate" | "minor";
    description: string;
    helpUrl: string;
    nodes: Array<{
      html: string;
      target: string[];
    }>;
  }[];
  passes: number;
  incomplete: number;
}
```

---

## 5. Compression

All `.jsonl.zst` files use **Zstandard** compression with default compression level (3).

### 5.1 Compression Ratio

Typical compression ratios:

- **Pages:** 8-12:1 (HTML and metadata compress well)
- **Edges:** 5-8:1 (shorter records, less repetition)
- **Assets:** 6-10:1
- **Errors:** 4-6:1 (typically few records)

### 5.2 Decompression

```bash
# Command-line
zstd -d parts/pages.jsonl.zst

# Node.js
import { createReadStream } from 'fs';
import { createDecompressor } from 'zstd-codec';

const stream = createReadStream('parts/pages.jsonl.zst')
  .pipe(createDecompressor());
```

---

## 6. Integrity Verification

Each part includes a SHA-256 hash in the manifest for verification.

### 6.1 Verification Process

```typescript
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

function verifyPart(partPath: string, expectedHash: string): boolean {
  const data = readFileSync(partPath);
  const actualHash = createHash('sha256').update(data).digest('hex');
  return actualHash === expectedHash;
}
```

### 6.2 Manifest Integrity

The manifest itself should be verified by consumers using the archive's external checksum (if provided) or digital signature.

---

## 7. Versioning

### 7.1 Format Version (`atlasVersion`)

Major version changes indicate breaking format changes:
- `1.0` → `2.0`: Non-backward-compatible changes

Minor version changes are backward-compatible:
- `1.0` → `1.1`: New optional fields

### 7.2 Schema Version (`schemaVersion`)

JSON schema version for validation tools. Follows semver.

### 7.3 Specification Version (`specVersion`)

This document's version. Follows semver.

---

## 8. Reference Implementation

See `@atlas/sdk` for reading Atlas archives:

```typescript
import { openAtlas } from '@atlas/sdk';

const atlas = await openAtlas('./example.atls');

console.log('Manifest:', atlas.manifest);
console.log('Summary:', atlas.summary);

// Stream pages
for await (const page of atlas.readers.pages()) {
  console.log(`Page: ${page.url} (${page.statusCode})`);
}

// Stream edges
for await (const edge of atlas.readers.edges()) {
  console.log(`Edge: ${edge.from} → ${edge.to}`);
}
```

---

## 9. Example Archive

A minimal valid `.atls` archive contains:

```
minimal.atls (ZIP)
├── manifest.json         # Required
├── summary.json          # Required
├── schemas/              # Optional but recommended
│   └── page.schema.json
└── parts/
    ├── pages.jsonl.zst   # At least 1 record
    └── edges.jsonl.zst   # Can be empty
```

**Manifest checksum (SHA-256):**
```
a3f5e8d9c2b1f4e6d7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0
```

---

## 10. Appendices

### Appendix A: MIME Type

Recommended MIME type: `application/vnd.atlas+zip`

### Appendix B: File Extension

Standard extension: `.atls`

### Appendix C: Magic Bytes

Atlas archives are ZIP files and begin with:
```
50 4B 03 04  (PK..)
```

### Appendix D: Compatibility

- **Node.js:** ≥20.0.0
- **Zstandard:** ≥1.5.0
- **JSON Schema:** Draft-07

---

## 11. Security Considerations

### 11.1 Archive Validation

Always validate:
1. ZIP structure integrity
2. Manifest schema compliance
3. Part file SHA-256 hashes
4. JSONL record count vs manifest

### 11.2 Content Safety

Archives may contain:
- User-generated content
- Malicious HTML/scripts
- Large files (DoS risk)

**Mitigations:**
- Sandbox archive processing
- Limit decompressed size
- Validate before rendering HTML

### 11.3 Privacy

Archives contain crawled web content and may include:
- Personal data
- Authentication tokens in URLs
- Private information

**Handling:**
- Apply data retention policies
- Anonymize if needed
- Respect robots.txt and terms of service

---

## 12. Change Log

### Version 1.0.0 (October 2025)
- Initial specification
- Core parts: pages, edges, assets, errors, accessibility
- Zstandard compression
- SHA-256 integrity
- Manifest v1.0

---

**Document Version:** 1.0.0  
**Last Updated:** October 25, 2025  
**Author:** Cai Frazier  
**License:** MIT
