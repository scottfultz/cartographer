# Atlas Contract Layer Strategy

**Document Version:** 1.0  
**Date:** October 26, 2025  
**Status:** Planning / Proposal (Pre-Launch)  
**Owner:** Cai Frazier

---

## Executive Summary

This document outlines the strategic transformation of Atlas into a **true contract layer** with semantic versioning, JSON Schema validation, and capability declaration. 

**Important Context:** Since Cartographer has not launched publicly yet, we have the unique opportunity to implement this contract layer architecture as part of Atlas v1.0 from the start, rather than as a post-launch migration. This gives us a clean slate for enterprise-grade architecture.

For the complete technical specification of Atlas v1.0 including all datasets and offline capability requirements, see `ATLAS_V1_SPECIFICATION.md`.

**This document focuses on:**
- Publishing strategy for `@caifrazier/atlas-spec` package
- Semantic versioning approach
- JSON Schema generation
- Compatibility guarantees

**Key Objectives:**
1. **Promote `@atlas/spec` to publishable semver package** (`@caifrazier/atlas-spec`)
2. **Enforce version headers** in all `.atls` archives
3. **Add capabilities metadata** to identify which extractors/modules produced which datasets
4. **Prevent schema drift** between producer (Cartographer) and consumers (Continuum/Horizon)

---

## Current State Analysis

### What Works Today

✅ **Monorepo Package Structure**
- `@atlas/spec` (workspace package) with TypeScript types in `types.ts`
- Used by `@cf/cartographer`, `@atlas/sdk`, tests
- Single source of truth for all types

✅ **Manifest Metadata**
```typescript
export interface AtlasManifest {
  atlasVersion: string;        // "1.0"
  formatVersion: string;       // "1.0.0"
  specVersion?: string;        // Optional (currently unused)
  schemaVersion?: string;      // Optional (currently unused)
  // ...
}
```

✅ **Capabilities Field (Partial)**
```typescript
capabilities?: {
  renderModes: RenderMode[];
  modesUsed: RenderMode[];
  specLevel: 1 | 2 | 3;
  dataSets: string[];
  robots: { /* ... */ };
}
```

### What's Missing

❌ **No Semver Enforcement**
- `@atlas/spec` is `private: true`, not published to registry
- Version is `1.0.0-beta.1` but not used for compatibility checks
- Consumers can't declare `@caifrazier/atlas-spec@^1.0.0` dependency

❌ **No JSON Schema Exports**
- Only TypeScript types exist
- Runtime validation not possible
- Can't validate archives from external tools (Python, Go, etc.)

❌ **Incomplete Capabilities Metadata**
- Doesn't declare which specific extractors/modules ran
- Can't distinguish between "accessibility disabled" vs "accessibility failed"
- Consumers must guess feature availability from presence/absence of datasets

❌ **No Migration Strategy**
- Breaking changes to `PageRecord` would break all consumers
- No deprecation policy or backward compatibility guarantees
- Schema evolution is ad-hoc

---

## Proposed Architecture

### 1. Promote Atlas Spec to Public Package

#### Package Structure
```
packages/atlas-spec/
├── package.json              # Publishable, @caifrazier/atlas-spec
├── src/
│   ├── index.ts             # Public API exports
│   ├── types.ts             # TypeScript types (unchanged)
│   ├── schemas/             # NEW: JSON Schema definitions
│   │   ├── manifest.schema.json
│   │   ├── page-record.schema.json
│   │   ├── edge-record.schema.json
│   │   ├── asset-record.schema.json
│   │   ├── error-record.schema.json
│   │   ├── console-record.schema.json
│   │   └── accessibility-record.schema.json
│   ├── validators.ts        # NEW: Zod/AJV validators
│   └── version.ts           # NEW: Semver compatibility helpers
├── dist/
│   ├── types.d.ts
│   ├── schemas/             # Compiled JSON schemas
│   └── validators.js
└── README.md
```

#### Package.json Changes
```json
{
  "name": "@caifrazier/atlas-spec",
  "version": "1.0.0",
  "description": "Atlas Archive Specification - TypeScript types, JSON schemas, and validators",
  "private": false,              // ✅ Make publishable
  "license": "UNLICENSED",       // Proprietary (or MIT if open-sourcing)
  "publishConfig": {
    "access": "restricted",      // Require authentication
    "registry": "https://npm.pkg.github.com/"  // GitHub Packages
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./schemas": {
      "types": "./dist/schemas/index.d.ts",
      "import": "./dist/schemas/index.js"
    },
    "./validators": {
      "types": "./dist/validators.d.ts",
      "import": "./dist/validators.js"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "dependencies": {
    "zod": "^3.23.8",            // Runtime validation
    "ajv": "^8.17.1",            // JSON Schema validation
    "ajv-formats": "^3.0.1"
  }
}
```

### 2. Enforce Version Headers

#### Enhanced AtlasManifest
```typescript
export interface AtlasManifest {
  // Core versioning (REQUIRED)
  atlasVersion: string;          // "1.0" - Major spec version
  formatVersion: string;         // "1.0.0" - Full semver (required)
  specVersion: string;           // "1.0.0" - Atlas spec package version (required)
  
  // Compatibility declarations
  compatibility: {
    minReaderVersion: string;    // "1.0.0" - Minimum @caifrazier/atlas-spec to read
    maxReaderVersion?: string;   // "2.0.0" - Maximum known compatible version
    breakingChanges: string[];   // ["deprecated-field-xyz"] - Known breaking changes
  };
  
  // Producer information
  producer: {
    name: string;                // "cartographer-engine"
    version: string;             // "1.0.0-beta.1"
    specVersion: string;         // Version of @caifrazier/atlas-spec used
  };
  
  // ... existing fields ...
}
```

#### Validation on Archive Open
```typescript
// In @atlas/sdk
import { validateCompatibility } from '@caifrazier/atlas-spec/validators';

export async function openAtlas(path: string): Promise<AtlasArchive> {
  const manifest = await readManifest(path);
  
  // Check compatibility
  const compat = validateCompatibility(manifest, {
    currentSpecVersion: '1.0.0',  // From package.json
    strictMode: true
  });
  
  if (!compat.compatible) {
    throw new Error(
      `Archive requires spec version ${manifest.specVersion}, ` +
      `but this SDK uses ${compat.currentVersion}. ` +
      `Upgrade @caifrazier/atlas-spec to ${manifest.compatibility.minReaderVersion}+`
    );
  }
  
  if (compat.warnings.length > 0) {
    console.warn('Compatibility warnings:', compat.warnings);
  }
  
  return new AtlasArchive(path, manifest);
}
```

### 3. Capabilities Metadata

#### Enhanced Capabilities Object
```typescript
export interface AtlasCapabilities {
  // Data collection capabilities
  extractors: {
    links: { enabled: true; version: "1.0.0" };
    seo: { enabled: true; version: "1.0.0" };
    accessibility: { enabled: true; version: "1.0.0"; wcagLevel: "AA" };
    performance: { enabled: boolean; metrics: string[] };  // ["LCP", "CLS", "TBT"]
    security: { enabled: boolean; checks: string[] };      // ["mixed-content", "sri"]
    media: { 
      screenshots: { enabled: boolean; viewports: ("desktop" | "mobile")[] };
      favicons: { enabled: boolean };
    };
  };
  
  // Render modes used
  rendering: {
    modesSupported: RenderMode[];  // ["raw", "prerender", "full"]
    modesUsed: RenderMode[];       // Actual modes used in crawl
    specLevel: 1 | 2 | 3;          // 1=Raw, 2=Prerender, 3=Full
    browserEngine: string;          // "chromium/130.0.0"
  };
  
  // Dataset availability
  datasets: {
    pages: { present: true; recordCount: 123; compressed: true };
    edges: { present: true; recordCount: 456; compressed: true };
    assets: { present: true; recordCount: 78; compressed: true };
    errors: { present: true; recordCount: 2; compressed: true };
    accessibility?: { present: boolean; recordCount?: number; compressed: true };
    console?: { present: boolean; recordCount?: number; compressed: true };
    styles?: { present: boolean; recordCount?: number; compressed: true };
  };
  
  // Configuration capabilities
  crawling: {
    robotsRespect: boolean;
    respectsRobotsTxt: boolean;   // Redundant with robots.txt
    maxDepth: number;              // -1 = unlimited
    followExternal: boolean;
    paramPolicy: ParamPolicy;
  };
  
  // Quality guarantees
  quality: {
    validated: boolean;            // Archive passed QA validation
    validationVersion: string;     // Version of validator used
    integrityChecked: boolean;     // SHA-256 hashes verified
  };
}
```

#### Usage in Continuum/Horizon
```typescript
// In Continuum SEO app
import { openAtlas } from '@atlas/sdk';

const atlas = await openAtlas('./crawl.atls');

// Check required capabilities
if (!atlas.manifest.capabilities?.extractors.seo?.enabled) {
  throw new Error('This archive does not contain SEO data. Re-crawl with --mode prerender');
}

if (atlas.manifest.capabilities.extractors.seo.version !== '1.0.0') {
  console.warn('SEO extractor version mismatch - some fields may be missing');
}

// Safe to iterate SEO data
for await (const page of atlas.readers.pages()) {
  if (page.enhancedSEO) {
    // Process SEO data
  }
}
```

---

## JSON Schema Generation

### Automated Schema Export

#### Zod to JSON Schema
```typescript
// packages/atlas-spec/src/schemas/generate.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const PageRecordSchema = z.object({
  url: z.string().url(),
  finalUrl: z.string().url(),
  normalizedUrl: z.string().url(),
  urlKey: z.string().regex(/^[a-f0-9]{40}$/), // SHA-1
  statusCode: z.number().int().min(100).max(599),
  // ... full schema definition
});

// Export as JSON Schema
export function generateSchemas() {
  const schemas = {
    'page-record': zodToJsonSchema(PageRecordSchema, 'PageRecord'),
    'edge-record': zodToJsonSchema(EdgeRecordSchema, 'EdgeRecord'),
    'asset-record': zodToJsonSchema(AssetRecordSchema, 'AssetRecord'),
    'error-record': zodToJsonSchema(ErrorRecordSchema, 'ErrorRecord'),
    'manifest': zodToJsonSchema(AtlasManifestSchema, 'AtlasManifest'),
  };
  
  // Write to dist/schemas/
  for (const [name, schema] of Object.entries(schemas)) {
    fs.writeFileSync(
      `./dist/schemas/${name}.schema.json`,
      JSON.stringify(schema, null, 2)
    );
  }
}
```

#### Build Script
```json
// packages/atlas-spec/package.json
{
  "scripts": {
    "build": "tsc -b && pnpm build:schemas",
    "build:schemas": "node dist/schemas/generate.js"
  }
}
```

### External Tool Integration

#### Python Validator Example
```python
# External Python tool can validate archives
import json
import jsonschema

# Download schema from registry or bundle with tool
with open('page-record.schema.json') as f:
    schema = json.load(f)

# Validate record
page_record = json.loads(line)
jsonschema.validate(page_record, schema)
```

---

## Semantic Versioning Strategy

### Version Ranges

| Spec Version | Breaking Changes | Compatible Engines | Compatible Consumers |
|--------------|------------------|-------------------|----------------------|
| **1.0.0** | Initial release | cartographer@1.x | continuum@1.x, horizon@1.x |
| **1.1.0** | Added optional fields | cartographer@1.x | continuum@1.x, horizon@1.x |
| **1.2.0** | New `performance.inp` field | cartographer@1.x | continuum@1.x, horizon@1.x |
| **2.0.0** | Removed deprecated fields | cartographer@2.x | continuum@2.x, horizon@2.x |

### Deprecation Policy

1. **Mark as deprecated** in TypeScript types with `@deprecated` JSDoc
2. **Log warnings** when reading deprecated fields
3. **Remove in next major version** (min 6 months after deprecation)

#### Example
```typescript
export interface PageRecord {
  url: string;
  
  /**
   * @deprecated Use `canonicalResolved` instead. Will be removed in v2.0.0
   */
  canonical?: string;
  
  canonicalResolved?: string;  // Replacement field
}
```

### Compatibility Helper
```typescript
// packages/atlas-spec/src/version.ts
import * as semver from 'semver';

export function isCompatible(
  archiveSpecVersion: string,
  readerSpecVersion: string
): { compatible: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Major version must match
  if (semver.major(archiveSpecVersion) !== semver.major(readerSpecVersion)) {
    return {
      compatible: false,
      warnings: [`Major version mismatch: archive=${archiveSpecVersion}, reader=${readerSpecVersion}`]
    };
  }
  
  // Minor version: reader must be >= archive
  if (semver.lt(readerSpecVersion, archiveSpecVersion)) {
    warnings.push(
      `Reader is older than archive. Some fields may be missing. ` +
      `Upgrade @caifrazier/atlas-spec to ${archiveSpecVersion}+`
    );
  }
  
  return { compatible: true, warnings };
}
```

---

## Implementation Roadmap

### Phase 1: Schema Infrastructure (Week 1-2)

- [ ] Add JSON Schema generation tooling to `@atlas/spec`
- [ ] Create Zod schemas for all record types
- [ ] Generate JSON Schema files in `dist/schemas/`
- [ ] Add runtime validators (Zod + AJV)
- [ ] Update package.json for publishing
- [ ] Add CHANGELOG.md and versioning docs

### Phase 2: Manifest Enhancement (Week 2-3)

- [ ] Add `compatibility` field to `AtlasManifest`
- [ ] Enhance `capabilities` with detailed extractor metadata
- [ ] Update `buildManifest()` in `packages/cartographer/src/io/atlas/manifest.ts`
- [ ] Write capabilities based on actual config (not guessed from datasets)
- [ ] Add version validation to Atlas Writer

### Phase 3: SDK Integration (Week 3-4)

- [ ] Update `@atlas/sdk` to validate manifest on open
- [ ] Add compatibility checks with helpful error messages
- [ ] Add deprecation warnings for old archives
- [ ] Update `openAtlas()` to fail fast on incompatible versions
- [ ] Add `--skip-validation` flag for legacy archives

### Phase 4: Consumer Updates (Week 4-5)

- [ ] Update Continuum to check `capabilities.extractors.seo`
- [ ] Update Horizon to check `capabilities.extractors.accessibility`
- [ ] Add feature detection instead of dataset presence checks
- [ ] Update error messages to guide users on required re-crawls

### Phase 5: Publishing & Documentation (Week 5-6)

- [ ] Publish `@caifrazier/atlas-spec@1.0.0` to GitHub Packages
- [ ] Update all internal packages to use `@caifrazier/atlas-spec@^1.0.0`
- [ ] Update Copilot instructions with new package name
- [ ] Write migration guide for existing archives
- [ ] Add semver policy to README

---

## Breaking Change Examples

### Scenario: Adding Required Field

❌ **Bad: Breaking Change**
```typescript
// v1.0.0
export interface PageRecord {
  url: string;
  statusCode: number;
}

// v2.0.0 - BREAKS OLD READERS
export interface PageRecord {
  url: string;
  statusCode: number;
  contentType: string;  // Now required!
}
```

✅ **Good: Backward Compatible**
```typescript
// v1.1.0 - Optional field
export interface PageRecord {
  url: string;
  statusCode: number;
  contentType?: string;  // Optional - readers can handle undefined
}
```

### Scenario: Removing Deprecated Field

✅ **Correct Process**
```typescript
// v1.0.0 - Original field
export interface PageRecord {
  canonical?: string;
}

// v1.5.0 - Deprecate and add replacement
export interface PageRecord {
  /** @deprecated Use canonicalResolved instead. Removed in v2.0.0 */
  canonical?: string;
  canonicalResolved?: string;
}

// v2.0.0 - Remove deprecated field (6+ months later)
export interface PageRecord {
  canonicalResolved?: string;
}
```

---

## Risk Mitigation

### Risk: Breaking Existing Archives

**Mitigation:**
- All archives created before `@caifrazier/atlas-spec@1.0.0` assumed to be `specVersion: "0.9.0"`
- SDK falls back to lenient mode for archives without `specVersion`
- Add `--legacy` flag to read pre-1.0 archives without validation

### Risk: Publishing Private Package

**Mitigation:**
- Use GitHub Packages with `access: restricted`
- Requires GitHub authentication to install
- Consider publishing to npm registry later if open-sourcing

### Risk: Schema Drift Between Producers/Consumers

**Mitigation:**
- **Single source of truth:** All packages depend on `@caifrazier/atlas-spec`
- **CI validation:** Test that engines produce valid archives against schemas
- **Pre-publish checks:** Validate test archives before releasing new engine versions

---

## Success Metrics

### Short-Term (1 month)
- [ ] `@caifrazier/atlas-spec@1.0.0` published to registry
- [ ] Cartographer writes `specVersion` and `capabilities` to all archives
- [ ] SDK validates manifest on `openAtlas()`
- [ ] Zero TypeScript errors in monorepo after migration

### Mid-Term (3 months)
- [ ] Continuum/Horizon check capabilities before opening archives
- [ ] 100% of new archives have `specVersion: "1.0.0"`
- [ ] External tools (Python/Go) can validate archives using JSON schemas
- [ ] Documentation complete with migration guides

### Long-Term (6 months)
- [ ] First minor version bump (1.1.0) with new optional fields
- [ ] Zero breaking changes to existing consumers
- [ ] Deprecation policy proven with at least one field deprecation
- [ ] Community contributions to schema improvements

---

## Conclusion

Transforming Atlas into a true contract layer with semantic versioning, JSON Schema validation, and capability declarations will:

1. **Enable independent evolution** - Cartographer, Continuum, and Horizon can release on different schedules
2. **Prevent runtime errors** - Compatibility checks fail fast with actionable error messages
3. **Support external tools** - JSON schemas enable validation from any language
4. **Enforce quality** - Schema validation catches bugs before archives reach consumers
5. **Future-proof architecture** - Clear deprecation policy and migration paths

This is a **foundational investment** that will pay dividends as the ecosystem grows. The initial effort (~6 weeks) is substantial, but the long-term benefits of controlled schema evolution are critical for a production system.

---

## Next Steps

1. **Review this proposal** with stakeholders (Cai Frazier, team leads)
2. **Prioritize in backlog** - Target Q1 2026 for Phase 1-3
3. **Create JIRA/GitHub issues** for each phase
4. **Assign engineering resources** - Need TypeScript + schema validation expertise
5. **Update project roadmap** to reflect Atlas contract layer work

**Decision needed:** Should `@caifrazier/atlas-spec` be open-sourced (MIT) or remain proprietary (UNLICENSED)?
