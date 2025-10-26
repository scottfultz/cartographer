# Atlas v1.0 Implementation Plan

**Document Version:** 1.0  
**Date:** October 26, 2025  
**Status:** Implementation Roadmap (Pre-Launch)  
**Owner:** Cai Frazier  
**Target Completion:** 8-10 weeks

---

## Executive Summary

This document provides a detailed, actionable implementation plan to upgrade the current Cartographer codebase to the complete **Atlas v1.0 specification** before public launch. The plan is organized into 7 phases spanning 8-10 weeks, with clear deliverables, dependencies, and acceptance criteria for each phase.

**Strategic Context:** Since Cartographer has not launched publicly, we can implement the full Atlas v1.0 spec without migration concerns, giving us enterprise-grade architecture from day one.

**Reference Documents:**
- `ATLAS_V1_SPECIFICATION.md` - Complete technical specification
- `ATLAS_CONTRACT_LAYER_STRATEGY.md` - Publishing and versioning strategy

---

## Current State Analysis

### ✅ What Already Works

**Core Infrastructure:**
- Playwright-based rendering engine
- JSONL dataset writers with Zstandard compression
- Basic manifest and summary generation
- Streaming writes with part rotation
- Checkpoint/resume functionality
- 570 tests (98.9% pass rate)

**Extractors Present:**
- `links.ts` - Link extraction
- `assets.ts` - Media asset extraction  
- `enhancedSEO.ts` - SEO signals
- `accessibility.ts` - Basic a11y data
- `runtimeAccessibility.ts` - Runtime a11y tree
- `wcagData.ts` - WCAG audit data
- `networkPerformance.ts` - Network metrics
- `lighthouse.ts` - Lighthouse scores
- `structuredData.ts` - Schema.org extraction
- `openGraph.ts` - OG metadata
- `twitterCard.ts` - Twitter Card metadata
- `wappalyzer.ts` - Tech detection

**Datasets Currently Written:**
- `pages/` - Page metadata (partial v1.0 schema)
- `edges/` - Link relationships
- `assets/` - Media assets
- `errors/` - Crawl errors
- `accessibility/` - A11y data (partial)

### ⚠️ Missing Atlas v1.0 Features

**Infrastructure Gaps:**
- ❌ Content-addressed blob storage for HTML bodies
- ❌ Versioned dataset schemas (`.v1.jsonl.zst` naming)
- ❌ Capabilities declaration system
- ❌ Provenance tracking for datasets
- ❌ JSON Schema generation and validation
- ❌ Blob deduplication and packing

**Missing Datasets:**
- ❌ `responses.v1` - Raw HTML bodies in blob storage
- ❌ `resources.v1` - Captured subresources (CSS, JS, fonts)
- ❌ `render.v1` - Deterministic render metadata
- ❌ `dom_snapshot.v1` - Post-render DOM snapshots
- ❌ `acc_tree.v1` - Accessibility tree snapshots
- ❌ `sitemaps.v1` - Parsed sitemap data
- ❌ `robots.v1` - Robots.txt decisions
- ❌ `seo_signals.v1` - Consolidated SEO metadata
- ❌ `audit_results.v1` - Placeholder for Horizon

**Missing Features:**
- ❌ `--profile` flag (core vs full)
- ❌ `--replay-tier` flag (html, html+css, full)
- ❌ Replay capture stage in crawl pipeline
- ❌ DOM snapshot serialization
- ❌ Accessibility tree capture
- ❌ Resource dependency analysis for CSS/fonts
- ❌ `atlas validate` CLI command
- ❌ `atlas migrate` CLI command

---

## Phase-by-Phase Implementation Plan

### Phase 1: Foundation & Schema Infrastructure (Week 1-2)

**Goal:** Establish versioned schema system with JSON Schema generation

#### Deliverables

**1.1 Update `@atlas/spec` Package Structure**

Create new directory structure:
```
packages/atlas-spec/
├── src/
│   ├── index.ts                    # Public API
│   ├── types.ts                    # TypeScript types (existing, update)
│   ├── schemas/                    # NEW
│   │   ├── index.ts
│   │   ├── generator.ts            # Zod → JSON Schema
│   │   ├── manifest.schema.ts      # Zod schemas
│   │   ├── capabilities.schema.ts
│   │   ├── provenance.schema.ts
│   │   ├── pages.schema.ts
│   │   ├── responses.schema.ts
│   │   ├── resources.schema.ts
│   │   ├── render.schema.ts
│   │   ├── dom_snapshot.schema.ts
│   │   ├── acc_tree.schema.ts
│   │   ├── links.schema.ts
│   │   ├── sitemaps.schema.ts
│   │   ├── robots.schema.ts
│   │   ├── seo_signals.schema.ts
│   │   └── audit_results.schema.ts
│   ├── validators.ts               # NEW - Runtime validators
│   └── version.ts                  # NEW - Version compatibility helpers
├── dist/
│   ├── schemas/                    # Generated JSON Schemas
│   │   ├── manifest.v1.schema.json
│   │   ├── pages.v1.schema.json
│   │   └── ...
│   └── ...
└── package.json                    # Update with new exports
```

**1.2 Define Zod Schemas**

File: `packages/atlas-spec/src/schemas/pages.schema.ts`
```typescript
import { z } from 'zod';

export const PageRecordV1Schema = z.object({
  // Identity
  page_id: z.string().uuid(),
  url: z.string().url(),
  normalized_url: z.string().url(),
  final_url: z.string().url(),
  
  // HTTP response
  http_status: z.number().int().min(100).max(599),
  response_time_ms: z.number().nonnegative(),
  size_bytes: z.number().int().nonnegative(),
  content_type: z.string(),
  
  // Content addressing
  hash_body_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  body_blob_ref: z.string().optional(),
  
  // Grouping
  group_key: z.string(),
  
  // Discovery
  discovery_source: z.enum(['seed', 'sitemap', 'page', 'js']),
  discovered_from: z.string().url().optional(),
  depth: z.number().int().nonnegative(),
  
  // Robots & indexability
  robots_decision: z.enum(['allow', 'disallow', 'override']),
  noindex_hint: z.boolean(),
  
  // Timestamp
  timestamp_captured: z.string().datetime(),
});

export type PageRecordV1 = z.infer<typeof PageRecordV1Schema>;
```

**1.3 JSON Schema Generator**

File: `packages/atlas-spec/src/schemas/generator.ts`
```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as schemas from './index.js';

export async function generateJSONSchemas() {
  const outputDir = join(__dirname, '../../dist/schemas');
  
  const schemaMap = {
    'manifest.v1': schemas.ManifestV1Schema,
    'capabilities.v1': schemas.CapabilitiesV1Schema,
    'provenance.v1': schemas.ProvenanceRecordV1Schema,
    'pages.v1': schemas.PageRecordV1Schema,
    'responses.v1': schemas.ResponseRecordV1Schema,
    'resources.v1': schemas.ResourceRecordV1Schema,
    'render.v1': schemas.RenderRecordV1Schema,
    'dom_snapshot.v1': schemas.DOMSnapshotRecordV1Schema,
    'acc_tree.v1': schemas.AccTreeRecordV1Schema,
    'links.v1': schemas.LinkRecordV1Schema,
    'sitemaps.v1': schemas.SitemapRecordV1Schema,
    'robots.v1': schemas.RobotsRecordV1Schema,
    'seo_signals.v1': schemas.SEOSignalRecordV1Schema,
    'audit_results.v1': schemas.AuditResultRecordV1Schema,
  };
  
  for (const [name, schema] of Object.entries(schemaMap)) {
    const jsonSchema = zodToJsonSchema(schema, name);
    const outputPath = join(outputDir, `${name}.schema.json`);
    writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));
    console.log(`Generated: ${outputPath}`);
  }
}
```

**1.4 Add Dependencies**

File: `packages/atlas-spec/package.json`
```json
{
  "dependencies": {
    "zod": "^3.23.8",
    "zod-to-json-schema": "^3.22.0"
  },
  "scripts": {
    "build": "tsc -b && node dist/schemas/generator.js",
    "build:schemas": "node dist/schemas/generator.js"
  }
}
```

#### Acceptance Criteria

- [ ] All 14 dataset schemas defined in Zod
- [ ] JSON Schemas generated in `dist/schemas/`
- [ ] Build script includes schema generation
- [ ] Runtime validators exported from `validators.ts`
- [ ] No TypeScript errors
- [ ] Schema generation tested with `pnpm test`

#### Estimated Time: 5-7 days

---

### Phase 2: Content-Addressed Blob Storage (Week 2-3)

**Goal:** Implement blob storage with SHA-256 content addressing and deduplication

#### Deliverables

**2.1 Blob Storage Module**

File: `packages/cartographer/src/io/atlas/blobStorage.ts`
```typescript
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { compress } from '@mongodb-js/zstd';

export interface BlobStorageConfig {
  blobsDir: string;              // e.g., "staging/blobs"
  format: 'individual' | 'packed'; // Individual files or packed tar
  deduplication: boolean;        // Enable deduplication (default: true)
}

export class BlobStorage {
  private config: BlobStorageConfig;
  private knownBlobs = new Set<string>(); // SHA-256 hashes
  
  constructor(config: BlobStorageConfig) {
    this.config = config;
  }
  
  async init(): Promise<void> {
    await mkdir(this.config.blobsDir, { recursive: true });
    
    // Create sha256 directory structure
    await mkdir(join(this.config.blobsDir, 'sha256'), { recursive: true });
  }
  
  /**
   * Store blob with content addressing
   * Returns blob reference path
   */
  async store(content: string | Buffer): Promise<{
    hash: string;
    blob_ref: string;
    deduplicated: boolean;
  }> {
    // Compute SHA-256
    const hash = createHash('sha256').update(content).digest('hex');
    
    // Check if already stored (deduplication)
    if (this.config.deduplication && this.knownBlobs.has(hash)) {
      return {
        hash,
        blob_ref: this.getBlobPath(hash),
        deduplicated: true
      };
    }
    
    // Compress with Zstandard
    const compressed = await compress(Buffer.from(content));
    
    // Determine storage path: sha256/ab/cd/abcd1234...ef.zst
    const first = hash.substring(0, 2);
    const second = hash.substring(2, 4);
    const dir = join(this.config.blobsDir, 'sha256', first, second);
    await mkdir(dir, { recursive: true });
    
    const filePath = join(dir, `${hash}.zst`);
    await writeFile(filePath, compressed);
    
    // Track for deduplication
    this.knownBlobs.add(hash);
    
    return {
      hash,
      blob_ref: this.getBlobPath(hash),
      deduplicated: false
    };
  }
  
  /**
   * Get blob reference path for manifest
   */
  private getBlobPath(hash: string): string {
    const first = hash.substring(0, 2);
    const second = hash.substring(2, 4);
    return `sha256/${first}/${second}/${hash}`;
  }
  
  /**
   * Load blob by reference
   */
  async load(blob_ref: string): Promise<Buffer> {
    const fullPath = join(this.config.blobsDir, `${blob_ref}.zst`);
    const compressed = await readFile(fullPath);
    const decompressed = await decompress(compressed);
    return Buffer.from(decompressed);
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalBlobs: number;
    deduplicationRate: number;
  } {
    // Implementation
  }
}
```

**2.2 Integrate Blob Storage into AtlasWriter**

File: `packages/cartographer/src/io/atlas/writer.ts` (update)
```typescript
import { BlobStorage } from './blobStorage.js';

export class AtlasWriter {
  private blobStorage: BlobStorage;
  
  async init() {
    // Initialize blob storage
    this.blobStorage = new BlobStorage({
      blobsDir: join(this.stagingDir, 'blobs'),
      format: 'individual',
      deduplication: true
    });
    await this.blobStorage.init();
    
    // ... existing init code
  }
  
  /**
   * Store HTML body in blob storage
   */
  async storeHTMLBody(html: string): Promise<{
    hash: string;
    blob_ref: string;
  }> {
    const result = await this.blobStorage.store(html);
    return {
      hash: result.hash,
      blob_ref: result.blob_ref
    };
  }
}
```

**2.3 Update Manifest for Blob Storage**

File: `packages/cartographer/src/io/atlas/manifest.ts` (update)
```typescript
export interface AtlasManifest {
  // ... existing fields
  
  storage: {
    blob_format: "individual" | "packed";
    blob_stats: {
      total_blobs: number;
      total_bytes_compressed: number;
      deduplication_rate: number;
    };
  };
  
  // ... existing fields
}
```

#### Acceptance Criteria

- [ ] BlobStorage class implemented with tests
- [ ] SHA-256 hashing and Zstandard compression working
- [ ] Deduplication tracks known blobs
- [ ] Directory structure: `blobs/sha256/ab/cd/abcd...ef.zst`
- [ ] AtlasWriter integrates blob storage
- [ ] Test: Store 100 identical HTML bodies → only 1 blob file
- [ ] Test: Store 100 unique HTML bodies → 100 blob files

#### Estimated Time: 5-7 days

---

### Phase 3: Versioned Dataset Writers (Week 3-4)

**Goal:** Refactor dataset writers to use versioned schemas and validation

#### Deliverables

**3.1 DatasetWriter Base Class**

File: `packages/cartographer/src/io/atlas/datasetWriter.ts`
```typescript
import { createWriteStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { compressFile } from './compressor.js';
import { sha256File } from '../../utils/hashing.js';
import { z } from 'zod';

export interface DatasetMetadata {
  name: string;                      // "pages"
  version: string;                   // "v1"
  record_count: number;
  bytes_compressed: number;
  hash_sha256: string;
  schema_uri: string;
}

export class DatasetWriter<T> {
  private name: string;
  private version: string;
  private schemaUri: string;
  private stagingDir: string;
  private schema: z.ZodSchema<T>;
  
  private currentPart = 1;
  private stream: ReturnType<typeof createWriteStream> | null = null;
  private recordCount = 0;
  private bytesUncompressed = 0;
  private parts: string[] = [];
  
  constructor(
    name: string,
    version: string,
    schemaUri: string,
    stagingDir: string,
    schema: z.ZodSchema<T>
  ) {
    this.name = name;
    this.version = version;
    this.schemaUri = schemaUri;
    this.stagingDir = stagingDir;
    this.schema = schema;
  }
  
  async init(): Promise<void> {
    const dataDir = join(this.stagingDir, 'data');
    await mkdir(dataDir, { recursive: true });
    await this.openPart(1);
  }
  
  async write(record: T): Promise<void> {
    // Validate against schema
    const validated = this.schema.parse(record);
    
    // Write JSONL
    const line = JSON.stringify(validated) + '\n';
    const bytes = Buffer.byteLength(line, 'utf8');
    
    this.stream!.write(line);
    this.recordCount++;
    this.bytesUncompressed += bytes;
    
    // Roll part at 150MB uncompressed
    if (this.bytesUncompressed > 150 * 1024 * 1024) {
      await this.closePart();
      await this.openPart(++this.currentPart);
    }
  }
  
  private async openPart(partNum: number): Promise<void> {
    const filename = `${this.name}.${this.version}_part_${String(partNum).padStart(3, '0')}.jsonl`;
    const filePath = join(this.stagingDir, 'data', filename);
    this.stream = createWriteStream(filePath);
    this.parts.push(filePath);
  }
  
  private async closePart(): Promise<void> {
    if (this.stream) {
      this.stream.end();
      await new Promise(resolve => this.stream!.on('finish', resolve));
      this.stream = null;
      this.bytesUncompressed = 0;
    }
  }
  
  async finalize(): Promise<DatasetMetadata> {
    await this.closePart();
    
    // Compress all parts
    const compressedParts: string[] = [];
    for (const partPath of this.parts) {
      const compressedPath = `${partPath}.zst`;
      await compressFile(partPath, compressedPath);
      compressedParts.push(compressedPath);
      
      // Delete uncompressed
      await unlink(partPath);
    }
    
    // Compute dataset hash (hash of all part hashes concatenated)
    const partHashes = await Promise.all(
      compressedParts.map(p => sha256File(p))
    );
    const datasetHash = createHash('sha256')
      .update(partHashes.join(''))
      .digest('hex');
    
    // Get total compressed size
    const stats = await Promise.all(
      compressedParts.map(p => stat(p))
    );
    const bytesCompressed = stats.reduce((sum, s) => sum + s.size, 0);
    
    return {
      name: this.name,
      version: this.version,
      record_count: this.recordCount,
      bytes_compressed: bytesCompressed,
      hash_sha256: datasetHash,
      schema_uri: this.schemaUri
    };
  }
}
```

**3.2 Update AtlasWriter to Use DatasetWriter**

File: `packages/cartographer/src/io/atlas/writer.ts` (refactor)
```typescript
import { DatasetWriter } from './datasetWriter.js';
import { 
  PageRecordV1Schema,
  ResponseRecordV1Schema,
  // ... other schemas
} from '@atlas/spec/schemas';

export class AtlasWriter {
  private writers: Map<string, DatasetWriter<any>> = new Map();
  
  async init() {
    // Initialize versioned dataset writers
    this.writers.set('pages', new DatasetWriter(
      'pages',
      'v1',
      'schemas/pages.v1.schema.json',
      this.stagingDir,
      PageRecordV1Schema
    ));
    
    this.writers.set('responses', new DatasetWriter(
      'responses',
      'v1',
      'schemas/responses.v1.schema.json',
      this.stagingDir,
      ResponseRecordV1Schema
    ));
    
    // ... initialize all 14 datasets
    
    // Initialize all writers
    for (const writer of this.writers.values()) {
      await writer.init();
    }
  }
  
  async writePageRecord(record: PageRecordV1): Promise<void> {
    await this.writers.get('pages')!.write(record);
  }
  
  async finalize(): Promise<void> {
    // Finalize all datasets
    const datasetMetadata: Record<string, DatasetMetadata> = {};
    
    for (const [name, writer] of this.writers.entries()) {
      const metadata = await writer.finalize();
      datasetMetadata[`${name}.${metadata.version}`] = metadata;
    }
    
    // Write manifest with dataset metadata
    await this.writeManifest(datasetMetadata);
    
    // ... rest of finalization
  }
}
```

#### Acceptance Criteria

- [ ] `DatasetWriter` class with schema validation
- [ ] All 14 datasets use `DatasetWriter`
- [ ] Files named: `pages.v1_part_001.jsonl.zst`
- [ ] Part rotation at 150MB
- [ ] Schema validation catches invalid records
- [ ] Test: Write invalid record → validation error
- [ ] Test: Write 1M records → multiple parts created

#### Estimated Time: 5-7 days

---

### Phase 4: New Datasets & Extractors (Week 4-6)

**Goal:** Implement missing datasets with their extraction logic

#### Deliverables

**4.1 Response Capture Module**

File: `packages/cartographer/src/core/extractors/responseCapture.ts`
```typescript
import type { Page } from 'playwright';
import type { ResponseRecordV1 } from '@atlas/spec/schemas';
import { BlobStorage } from '../../io/atlas/blobStorage.js';

export async function captureResponse(
  page: Page,
  pageId: string,
  blobStorage: BlobStorage
): Promise<ResponseRecordV1> {
  const html = await page.content();
  const encoding = await detectEncoding(page) || 'utf-8';
  
  // Store in blob storage
  const { hash, blob_ref } = await blobStorage.store(html);
  
  return {
    page_id: pageId,
    encoding,
    body_blob_ref: blob_ref
  };
}
```

**4.2 Resource Capture Module**

File: `packages/cartographer/src/core/extractors/resourceCapture.ts`
```typescript
export async function captureResources(
  page: Page,
  pageId: string,
  tier: 'html' | 'html+css' | 'full',
  blobStorage: BlobStorage
): Promise<ResourceRecordV1[]> {
  const resources: ResourceRecordV1[] = [];
  
  if (tier === 'html') {
    return resources; // No resources for HTML-only
  }
  
  // Capture CSS and fonts (for html+css tier)
  if (tier === 'html+css' || tier === 'full') {
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', links =>
      links.map(link => (link as HTMLLinkElement).href)
    );
    
    for (const url of stylesheets) {
      const response = await page.goto(url);
      if (response) {
        const body = await response.body();
        const { hash, blob_ref } = await blobStorage.store(body);
        
        resources.push({
          res_id: generateUUID(),
          owner_page_id: pageId,
          url,
          type: 'css',
          status: response.status(),
          content_type: response.headers()['content-type'] || '',
          hash_body_sha256: hash,
          body_blob_ref: blob_ref,
          size_bytes: body.length,
          critical: true
        });
      }
    }
    
    // Capture web fonts
    // ...
  }
  
  // Capture JavaScript (for full tier)
  if (tier === 'full') {
    // ...
  }
  
  return resources;
}
```

**4.3 DOM Snapshot Module**

File: `packages/cartographer/src/core/extractors/domSnapshot.ts`
```typescript
export async function captureDOMSnapshot(
  page: Page,
  pageId: string,
  config: EngineConfig
): Promise<DOMSnapshotRecordV1> {
  const baseUrl = page.url();
  
  // Get serialized DOM
  const domJson = await page.evaluate(() => {
    function serializeNode(node: Node): any {
      if (node.nodeType === Node.TEXT_NODE) {
        return {
          type: 'text',
          text: node.textContent
        };
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        return {
          type: 'element',
          tag: el.tagName.toLowerCase(),
          attributes: Array.from(el.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {} as Record<string, string>),
          children: Array.from(el.childNodes).map(serializeNode)
        };
      }
      
      return null;
    }
    
    return serializeNode(document.documentElement);
  });
  
  // Compress DOM JSON
  const domJsonStr = JSON.stringify(domJson);
  const compressed = await compress(Buffer.from(domJsonStr));
  const dom_json_zstd = compressed.toString('base64');
  
  // Count nodes
  function countNodes(node: any): { total: number; text: number; element: number } {
    if (!node) return { total: 0, text: 0, element: 0 };
    if (node.type === 'text') return { total: 1, text: 1, element: 0 };
    
    const childCounts = (node.children || []).reduce((acc: any, child: any) => {
      const c = countNodes(child);
      return {
        total: acc.total + c.total,
        text: acc.text + c.text,
        element: acc.element + c.element
      };
    }, { total: 1, text: 0, element: 1 });
    
    return childCounts;
  }
  
  const counts = countNodes(domJson);
  
  return {
    page_id: pageId,
    base_url: baseUrl,
    dom_json_zstd,
    styles_applied: true,
    scripts_executed: config.render.mode !== 'raw',
    node_count: counts.total,
    text_nodes: counts.text,
    element_nodes: counts.element
  };
}
```

**4.4 Accessibility Tree Module**

File: `packages/cartographer/src/core/extractors/accTreeCapture.ts`
```typescript
export async function captureAccessibilityTree(
  page: Page,
  pageId: string
): Promise<AccTreeRecordV1> {
  // Get accessibility snapshot from Playwright
  const snapshot = await page.accessibility.snapshot();
  
  // Convert to our format
  const nodes = flattenAccTree(snapshot);
  const compressed = await compress(Buffer.from(JSON.stringify(nodes)));
  const nodes_zstd = compressed.toString('base64');
  
  // Extract landmarks
  const landmarks = nodes.filter(n => 
    ['banner', 'navigation', 'main', 'contentinfo', 'search', 'complementary']
      .includes(n.role)
  ).map(n => ({
    role: n.role,
    name: n.name,
    node_id: n.node_id
  }));
  
  // Extract tab order
  const tab_order = nodes
    .filter(n => n.focusable)
    .sort((a, b) => a.tab_index - b.tab_index)
    .map((n, index) => ({
      index,
      node_id: n.node_id,
      focusable: true
    }));
  
  return {
    page_id: pageId,
    nodes_zstd,
    landmarks,
    tab_order
  };
}
```

**4.5 Additional Dataset Extractors**

Implement remaining extractors:
- `sitemapCapture.ts` - Parse sitemap.xml files
- `robotsCapture.ts` - Robots.txt parsing and decisions
- `seoSignalsCapture.ts` - Consolidate SEO data
- `renderCapture.ts` - Render metadata and console errors

#### Acceptance Criteria

- [ ] All 14 datasets have extraction logic
- [ ] Response capture stores HTML in blobs
- [ ] Resource capture handles CSS/JS/fonts based on tier
- [ ] DOM snapshot serializes to JSON structure
- [ ] Accessibility tree captures with landmarks and tab order
- [ ] All extractors integrated into crawl pipeline
- [ ] Tests for each extractor module

#### Estimated Time: 10-14 days

---

### Phase 5: Capabilities & Provenance (Week 6-7)

**Goal:** Implement capability declarations and provenance tracking

#### Deliverables

**5.1 Capabilities Builder**

File: `packages/cartographer/src/io/atlas/capabilitiesBuilder.ts`
```typescript
export interface CapabilitiesConfig {
  renderMode: RenderMode;
  replayTier: 'html' | 'html+css' | 'full';
  accessibility: boolean;
  performance: boolean;
}

export function buildCapabilities(config: CapabilitiesConfig): AtlasCapabilitiesV1 {
  const capabilities: string[] = [];
  
  // Always present
  capabilities.push('seo.core');
  
  // Render-based
  if (config.renderMode !== 'raw') {
    capabilities.push('render.dom');
  }
  
  // Accessibility
  if (config.accessibility) {
    capabilities.push('a11y.core');
  }
  
  // Performance
  if (config.performance) {
    capabilities.push('render.netlog');
  }
  
  // Replay capabilities
  if (config.replayTier === 'html') {
    capabilities.push('replay.html');
  } else if (config.replayTier === 'html+css') {
    capabilities.push('replay.html');
    capabilities.push('replay.css');
    capabilities.push('replay.fonts');
  } else if (config.replayTier === 'full') {
    capabilities.push('replay.html');
    capabilities.push('replay.css');
    capabilities.push('replay.js');
    capabilities.push('replay.fonts');
    capabilities.push('replay.images');
  }
  
  return {
    version: 'v1',
    capabilities,
    compatibility: {
      min_sdk_version: '1.0.0',
      breaking_changes: []
    }
  };
}
```

**5.2 Provenance Tracker**

File: `packages/cartographer/src/io/atlas/provenanceTracker.ts`
```typescript
export class ProvenanceTracker {
  private records: ProvenanceRecordV1[] = [];
  
  addDataset(
    datasetName: string,
    producer: { app: string; version: string; module?: string },
    inputs: { dataset: string; hash_sha256: string }[],
    parameters: Record<string, any>,
    output: { record_count: number; hash_sha256: string }
  ): void {
    this.records.push({
      dataset_name: datasetName,
      producer,
      created_at: new Date().toISOString(),
      inputs,
      parameters,
      output
    });
  }
  
  getRecords(): ProvenanceRecordV1[] {
    return this.records;
  }
}
```

**5.3 Update AtlasWriter**

```typescript
export class AtlasWriter {
  private capabilities: AtlasCapabilitiesV1;
  private provenance: ProvenanceTracker;
  
  async init() {
    // Build capabilities
    this.capabilities = buildCapabilities({
      renderMode: this.config.render.mode,
      replayTier: this.config.replayTier || 'html+css',
      accessibility: this.config.accessibility?.enabled !== false,
      performance: this.config.performance?.enabled || false
    });
    
    // Initialize provenance tracker
    this.provenance = new ProvenanceTracker();
    
    // ... existing init
  }
  
  async finalize() {
    // Finalize all datasets and record provenance
    for (const [name, writer] of this.writers.entries()) {
      const metadata = await writer.finalize();
      
      // Add provenance record
      this.provenance.addDataset(
        `${name}.${metadata.version}`,
        {
          app: 'cartographer',
          version: packageJson.version,
          module: `extractor-${name}`
        },
        [], // No inputs for initial datasets
        { mode: this.config.render.mode },
        {
          record_count: metadata.record_count,
          hash_sha256: metadata.hash_sha256
        }
      );
    }
    
    // Write capabilities.v1.json
    await this.writeCapabilities();
    
    // Write provenance.v1.jsonl.zst
    await this.writeProvenance();
    
    // ... rest of finalization
  }
  
  private async writeCapabilities(): Promise<void> {
    const path = join(this.stagingDir, 'capabilities.v1.json');
    await writeFile(path, JSON.stringify(this.capabilities, null, 2));
  }
  
  private async writeProvenance(): Promise<void> {
    const writer = new DatasetWriter(
      'provenance',
      'v1',
      'schemas/provenance.v1.schema.json',
      this.stagingDir,
      ProvenanceRecordV1Schema
    );
    
    await writer.init();
    
    for (const record of this.provenance.getRecords()) {
      await writer.write(record);
    }
    
    await writer.finalize();
  }
}
```

#### Acceptance Criteria

- [ ] Capabilities built from actual config (not inferred)
- [ ] Provenance records created for each dataset
- [ ] `capabilities.v1.json` written to archive
- [ ] `provenance.v1.jsonl.zst` written to archive
- [ ] Test: Full mode → `a11y.core` in capabilities
- [ ] Test: Raw mode → no `a11y.core` in capabilities

#### Estimated Time: 5-7 days

---

### Phase 6: CLI Enhancements & Validation (Week 7-8)

**Goal:** Add `--profile` flag, `atlas validate` command, and security defaults

#### Deliverables

**6.1 Profile Flag**

File: `packages/cartographer/src/cli/commands/crawl.ts` (update)
```typescript
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
  describe: 'Replay capture tier (html, html+css, full)'
})
.option('keep-images', {
  type: 'boolean',
  default: false,
  describe: 'Store all images in resources (increases archive size)'
})
.option('max-image-bytes', {
  type: 'number',
  default: 5_000_000,
  describe: 'Exclude images larger than N bytes'
})
```

**6.2 Atlas Validate Command**

File: `packages/cartographer/src/cli/commands/validate.ts`
```typescript
import { openAtlas } from '@atlas/sdk';
import { validateArchive } from '../../io/validate/validator.js';

export async function validateCommand(argv: any) {
  const atlasPath = argv.atls;
  
  console.log(`Validating: ${atlasPath}`);
  
  try {
    const atlas = await openAtlas(atlasPath);
    const result = await validateArchive(atlas);
    
    if (result.valid) {
      console.log('✓ Archive validation PASSED');
      
      // Show summary
      console.log('\nDatasets:');
      for (const [name, metadata] of Object.entries(result.datasets)) {
        console.log(`  ✓ ${name}: ${metadata.record_count} records`);
      }
      
      if (result.warnings.length > 0) {
        console.log('\n⚠ Warnings:');
        result.warnings.forEach(w => console.log(`  - ${w}`));
      }
      
      process.exit(0);
    } else {
      console.error('✗ Archive validation FAILED');
      console.error('\nErrors:');
      result.errors.forEach(e => console.error(`  - ${e}`));
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}
```

File: `packages/cartographer/src/io/validate/validator.ts`
```typescript
export async function validateArchive(atlas: AtlasArchive): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Check manifest integrity
  const manifest = await atlas.getManifest();
  if (!manifest.atlas_semver.startsWith('1.')) {
    errors.push(`Unsupported atlas version: ${manifest.atlas_semver}`);
  }
  
  // 2. Check capabilities consistency
  const caps = await atlas.getCapabilities();
  
  if (caps.has('a11y.core')) {
    if (!atlas.has('dom_snapshot.v1')) {
      errors.push('Capability a11y.core declared but dom_snapshot.v1 missing');
    }
    if (!atlas.has('acc_tree.v1')) {
      errors.push('Capability a11y.core declared but acc_tree.v1 missing');
    }
  }
  
  if (caps.has('seo.core')) {
    if (!atlas.has('seo_signals.v1')) {
      errors.push('Capability seo.core declared but seo_signals.v1 missing');
    }
  }
  
  // 3. Verify dataset hashes
  for (const [name, metadata] of Object.entries(manifest.datasets)) {
    const computed = await computeDatasetHash(atlas, name);
    if (computed !== metadata.hash_sha256) {
      errors.push(`Dataset ${name} hash mismatch`);
    }
  }
  
  // 4. Schema validation (sample records)
  // ...
  
  // 5. Cross-reference checks
  // - page_id in links.v1 exists in pages.v1
  // - page_id in responses.v1 exists in pages.v1
  // ...
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    datasets: manifest.datasets
  };
}
```

**6.3 Security & Privacy Defaults**

File: `packages/cartographer/src/core/config.ts` (update)
```typescript
export function buildConfig(partialConfig: Partial<EngineConfig>): EngineConfig {
  return {
    // ... existing config
    
    privacy_policy: {
      strip_cookies: true,           // Default: strip cookies
      strip_auth_headers: true,      // Default: strip auth
      redact_inputs: true,           // Default: redact passwords
      redact_pii: partialConfig.privacy_policy?.redact_pii || false
    },
    
    robots_policy: {
      respect: partialConfig.robots?.respect !== false,  // Default: true
      overrides_used: partialConfig.robots?.overrideUsed || false
    }
  };
}
```

#### Acceptance Criteria

- [ ] `--profile core` sets mode to prerender, minimal datasets
- [ ] `--profile full` sets mode to full, all datasets
- [ ] `--replay-tier` controls resource capture
- [ ] `atlas validate` command works
- [ ] Validation checks capabilities consistency
- [ ] Validation verifies dataset hashes
- [ ] Validation catches missing required datasets
- [ ] Security defaults: strip cookies, redact inputs
- [ ] Robots.txt respected by default

#### Estimated Time: 5-7 days

---

### Phase 7: SDK Updates & Testing (Week 8-10)

**Goal:** Update Atlas SDK for v1.0 and create comprehensive test suite

#### Deliverables

**7.1 Update Atlas SDK**

File: `packages/atlas-sdk/src/reader.ts` (update)
```typescript
export class AtlasArchive {
  async getCapabilities(): Promise<Set<string>> {
    const capsPath = this.resolvePath('capabilities.v1.json');
    const caps = JSON.parse(await this.readFile(capsPath));
    return new Set(caps.capabilities);
  }
  
  has(datasetName: string): boolean {
    const manifest = this.manifest;
    return datasetName in manifest.datasets;
  }
  
  async getBlob(blob_ref: string): Promise<Buffer> {
    const blobPath = this.resolvePath(`blobs/${blob_ref}.zst`);
    const compressed = await this.readFile(blobPath);
    const decompressed = await decompress(compressed);
    return Buffer.from(decompressed);
  }
  
  async *open(datasetName: string): AsyncIterable<any> {
    const metadata = this.manifest.datasets[datasetName];
    if (!metadata) {
      throw new Error(`Dataset ${datasetName} not found`);
    }
    
    // Iterate all parts
    const parts = metadata.parts || [];
    for (const partPath of parts) {
      const fullPath = this.resolvePath(partPath);
      const compressed = await this.readFile(fullPath);
      const decompressed = await decompress(compressed);
      const lines = decompressed.toString('utf-8').trim().split('\n');
      
      for (const line of lines) {
        yield JSON.parse(line);
      }
    }
  }
  
  async verify(): Promise<VerificationResult> {
    // Implementation from Phase 6
  }
}
```

**7.2 Golden Fixtures**

Create test fixtures:
```
packages/cartographer/test/fixtures/golden-atlas-v1/
├── site-a-full.atls           # 10-page site, full profile
├── site-b-core.atls           # 10-page site, core profile
└── README.md
```

Generate with:
```bash
# Site A: Full profile
node dist/cli/index.js crawl \
  --seeds https://test-site-a.local \
  --out test/fixtures/golden-atlas-v1/site-a-full.atls \
  --profile full \
  --replay-tier html+css \
  --maxPages 10

# Site B: Core profile  
node dist/cli/index.js crawl \
  --seeds https://test-site-b.local \
  --out test/fixtures/golden-atlas-v1/site-b-core.atls \
  --profile core \
  --replay-tier html \
  --maxPages 10
```

**7.3 Test Suite**

File: `packages/cartographer/test/atlas-v1/golden-fixtures.test.ts`
```typescript
import { describe, test, expect } from 'vitest';
import { openAtlas } from '@atlas/sdk';

describe('Golden Atlas v1.0 Fixtures', () => {
  test('site-a-full.atls has complete offline capability', async () => {
    const atlas = await openAtlas('./test/fixtures/golden-atlas-v1/site-a-full.atls');
    
    // Check capabilities
    const caps = await atlas.getCapabilities();
    expect(caps.has('seo.core')).toBe(true);
    expect(caps.has('a11y.core')).toBe(true);
    expect(caps.has('render.dom')).toBe(true);
    expect(caps.has('replay.html')).toBe(true);
    expect(caps.has('replay.css')).toBe(true);
    
    // Check datasets
    expect(atlas.has('pages.v1')).toBe(true);
    expect(atlas.has('responses.v1')).toBe(true);
    expect(atlas.has('dom_snapshot.v1')).toBe(true);
    expect(atlas.has('acc_tree.v1')).toBe(true);
    expect(atlas.has('seo_signals.v1')).toBe(true);
    
    // Verify offline capability - load HTML from blob
    let pageCount = 0;
    for await (const page of atlas.open('pages.v1')) {
      if (page.body_blob_ref) {
        const html = await atlas.getBlob(page.body_blob_ref);
        expect(html.length).toBeGreaterThan(0);
      }
      pageCount++;
    }
    expect(pageCount).toBe(10);
  });
  
  test('site-b-core.atls has minimal datasets', async () => {
    const atlas = await openAtlas('./test/fixtures/golden-atlas-v1/site-b-core.atls');
    
    // Check capabilities
    const caps = await atlas.getCapabilities();
    expect(caps.has('seo.core')).toBe(true);
    expect(caps.has('a11y.core')).toBe(false);
    
    // Core datasets only
    expect(atlas.has('pages.v1')).toBe(true);
    expect(atlas.has('links.v1')).toBe(true);
    expect(atlas.has('seo_signals.v1')).toBe(true);
    
    // No full-mode datasets
    expect(atlas.has('dom_snapshot.v1')).toBe(false);
    expect(atlas.has('acc_tree.v1')).toBe(false);
  });
  
  test('Validation passes for golden fixtures', async () => {
    const atlasA = await openAtlas('./test/fixtures/golden-atlas-v1/site-a-full.atls');
    const resultA = await atlasA.verify();
    expect(resultA.valid).toBe(true);
    expect(resultA.errors).toEqual([]);
    
    const atlasB = await openAtlas('./test/fixtures/golden-atlas-v1/site-b-core.atls');
    const resultB = await atlasB.verify();
    expect(resultB.valid).toBe(true);
    expect(resultB.errors).toEqual([]);
  });
});
```

File: `packages/cartographer/test/atlas-v1/blob-storage.test.ts`
```typescript
describe('Blob Storage Deduplication', () => {
  test('Identical HTML bodies stored once', async () => {
    const blobStorage = new BlobStorage({
      blobsDir: './tmp/test-blobs',
      format: 'individual',
      deduplication: true
    });
    await blobStorage.init();
    
    const html = '<html><body>Test</body></html>';
    
    // Store same content 100 times
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(await blobStorage.store(html));
    }
    
    // All should have same hash
    const hashes = new Set(results.map(r => r.hash));
    expect(hashes.size).toBe(1);
    
    // 99 should be deduplicated
    const dedupCount = results.filter(r => r.deduplicated).length;
    expect(dedupCount).toBe(99);
    
    // Only 1 file should exist
    const stats = blobStorage.getStats();
    expect(stats.totalBlobs).toBe(1);
  });
});
```

#### Acceptance Criteria

- [ ] SDK updated with all v1.0 methods
- [ ] Golden fixtures generated and committed
- [ ] Test suite covers all new features
- [ ] Blob storage deduplication tested
- [ ] Capabilities handshake tested
- [ ] Provenance tracking tested
- [ ] Validation tested with invalid archives
- [ ] All 570+ existing tests still pass

#### Estimated Time: 10-14 days

---

## Implementation Timeline

### Gantt Chart (8-10 Weeks)

```
Week 1-2:  [Phase 1: Schema Infrastructure        ]
Week 2-3:      [Phase 2: Blob Storage             ]
Week 3-4:          [Phase 3: Dataset Writers      ]
Week 4-6:              [Phase 4: New Extractors            ]
Week 6-7:                      [Phase 5: Capabilities/Prov ]
Week 7-8:                          [Phase 6: CLI & Validate]
Week 8-10:                             [Phase 7: SDK & Tests    ]
```

**Critical Path:**
1. Phase 1 (schemas) → Phase 3 (dataset writers) → Phase 4 (extractors)
2. Phase 2 (blob storage) → Phase 4 (extractors)
3. Phase 5 (capabilities) → Phase 6 (validation)
4. All phases → Phase 7 (testing)

**Parallel Work Opportunities:**
- Phase 2 (blob storage) can start immediately after Phase 1 schemas defined
- Phase 5 (capabilities) can overlap with Phase 4 (extractors)
- Documentation and test writing can happen throughout

---

## Resource Requirements

### Engineering Team

**Recommended Team Size:** 2-3 engineers

**Skill Requirements:**
- TypeScript/Node.js expertise (required)
- Playwright/browser automation experience (required)
- Schema design and validation (Zod, JSON Schema)
- Compression algorithms (Zstandard)
- File I/O and streaming operations
- Testing (Vitest)

**Role Distribution:**
- **Engineer 1:** Schema infrastructure, blob storage, dataset writers
- **Engineer 2:** New extractors, DOM/a11y capture
- **Engineer 3:** CLI enhancements, validation, SDK updates

### Dependencies

**External Libraries:**
```json
{
  "new-dependencies": {
    "zod": "^3.23.8",
    "zod-to-json-schema": "^3.22.0",
    "uuid": "^9.0.0"
  },
  "existing-dependencies": {
    "@mongodb-js/zstd": "^1.2.0",
    "playwright": "^1.48.0",
    "archiver": "^7.0.1"
  }
}
```

---

## Risk Assessment & Mitigation

### High-Risk Items

**Risk 1: DOM Snapshot Size**
- **Issue:** Serialized DOM could be 10-50MB per page
- **Mitigation:** 
  - Compress with Zstandard (60-80% reduction)
  - Store in blob storage with deduplication
  - Add `--skip-dom-snapshot` flag for size-constrained crawls
  - Test with large SPAs (10,000+ DOM nodes)

**Risk 2: Blob Storage Performance**
- **Issue:** SHA-256 hashing could slow crawls
- **Mitigation:**
  - Hash in parallel with page rendering
  - Use Node.js crypto (C++ native, fast)
  - Benchmark: Target <10ms per hash for 1MB HTML
  - Consider caching known hashes in memory

**Risk 3: Schema Evolution**
- **Issue:** V1 schema might need changes during implementation
- **Mitigation:**
  - Lock schema early (end of Phase 1)
  - Document breaking changes in `CHANGELOG.md`
  - Since pre-launch, can make changes freely
  - Add schema version to every record

**Risk 4: Test Data Generation**
- **Issue:** Golden fixtures require stable test sites
- **Mitigation:**
  - Use local static test server (already exists)
  - Version-control test HTML files
  - Regenerate fixtures on schema changes
  - Document fixture generation in README

### Medium-Risk Items

**Risk 5: Backward Compatibility**
- **Issue:** Existing `.atls` archives won't have v1.0 structure
- **Impact:** Low (pre-launch, can regenerate all archives)
- **Mitigation:** Clearly label as "pre-v1.0" in README

**Risk 6: Performance Regression**
- **Issue:** New extractors could slow crawls
- **Impact:** Medium (target: <10% slowdown)
- **Mitigation:**
  - Profile each extractor
  - Run in parallel where possible
  - Add `--skip-*` flags for optional extractors
  - Benchmark against current implementation

---

## Success Criteria

### Technical Metrics

- [ ] **Schema Compliance:** All records validate against JSON Schemas
- [ ] **Storage Efficiency:** 30-50% size reduction from blob deduplication
- [ ] **Offline Capability:** Horizon can audit without network
- [ ] **Performance:** Max 15% slowdown vs current implementation
- [ ] **Test Coverage:** >95% code coverage for new modules
- [ ] **Test Pass Rate:** 99%+ (565+/570 tests)

### Functional Metrics

- [ ] **Profile Modes:** `--profile core` and `--profile full` work correctly
- [ ] **Replay Tiers:** `--replay-tier html|html+css|full` capture correctly
- [ ] **Validation:** `atlas validate` catches schema violations
- [ ] **Capabilities:** Handshake prevents incompatible operations
- [ ] **Provenance:** All datasets traceable to producer
- [ ] **Security:** No cookies/auth headers in archives by default

### Documentation Metrics

- [ ] **README Updated:** New flags and features documented
- [ ] **Examples Added:** Golden fixtures with usage examples
- [ ] **Migration Guide:** Document v1.0 changes
- [ ] **Schema Docs:** JSON Schemas published with descriptions
- [ ] **Copilot Instructions:** Updated with v1.0 architecture

---

## Post-Implementation Checklist

### Before Launch

- [ ] All 7 phases completed
- [ ] Full test suite passes (565+/570 tests)
- [ ] Performance benchmarks meet targets
- [ ] Golden fixtures validated
- [ ] Documentation complete
- [ ] Security review completed (no PII in archives)
- [ ] Robots.txt compliance verified
- [ ] Archive validation tested on 10+ real sites

### Launch Preparation

- [ ] Version bump to `1.0.0` (remove `-beta.1`)
- [ ] Publish `@caifrazier/atlas-spec@1.0.0` to GitHub Packages
- [ ] Generate fresh golden fixtures with v1.0
- [ ] Update README with v1.0 examples
- [ ] Create release notes
- [ ] Tag release: `git tag v1.0.0`

### Post-Launch

- [ ] Monitor first 100 crawls for issues
- [ ] Collect storage efficiency metrics
- [ ] Validate Horizon offline audit capability
- [ ] Gather user feedback on new features
- [ ] Plan v1.1 enhancements based on usage

---

## Appendix: Quick Command Reference

### Implementation Commands

```bash
# Phase 1: Generate JSON Schemas
cd packages/atlas-spec
pnpm build:schemas

# Phase 2: Test blob storage
cd packages/cartographer
pnpm test blob-storage

# Phase 3: Test dataset writers
pnpm test dataset-writer

# Phase 4: Test extractors
pnpm test extractors

# Phase 5: Test capabilities/provenance
pnpm test capabilities provenance

# Phase 6: Test validation
pnpm test validate

# Phase 7: Generate golden fixtures
node dist/cli/index.js crawl --seeds https://test-site.local --out test/fixtures/golden-atlas-v1/site-a-full.atls --profile full --maxPages 10

# Validate archive
node dist/cli/index.js validate --atls archive.atls

# Run full test suite
pnpm test --filter=@cf/cartographer
```

### Debug Commands

```bash
# Check archive structure
unzip -l archive.atls

# Inspect blob storage
ls -R archive.atls.staging/blobs/sha256/ | wc -l

# Validate single dataset
node -e "
const fs = require('fs');
const { decompress } = require('@mongodb-js/zstd');
const data = fs.readFileSync('./archive.atls.staging/data/pages.v1_part_001.jsonl.zst');
const decompressed = decompress(data);
console.log(decompressed.toString('utf-8').split('\n').length, 'records');
"
```

---

## Conclusion

This implementation plan provides a clear path from the current Cartographer codebase to the complete Atlas v1.0 specification. By following the 7-phase approach over 8-10 weeks, we'll deliver enterprise-grade archive format with:

✅ Complete offline capability for Horizon  
✅ Content-addressed blob storage with deduplication  
✅ Versioned datasets with JSON Schema validation  
✅ Capabilities handshake for cross-app compatibility  
✅ Provenance tracking for auditability  
✅ Security and privacy defaults  

**Strategic Advantage:** Since Cartographer hasn't launched yet, we can implement this correctly from day one without migration headaches or backward compatibility concerns.

**Next Steps:**
1. Review this plan with stakeholders
2. Allocate engineering resources (2-3 engineers)
3. Set target completion date (8-10 weeks from start)
4. Begin Phase 1: Schema Infrastructure
