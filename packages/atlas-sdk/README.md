# @atlas/sdk

TypeScript SDK for reading Atlas v1.0 archives produced by Cartographer Engine.

**Part of the Cartographer monorepo** - See [main README](../../README.md) for full documentation.

## Installation

### Within Monorepo

If you're working within the Cartographer monorepo, the SDK is already linked:

```bash
# Build all packages
pnpm build

# The SDK is automatically available to other workspace packages
```

### External Installation

```bash
# Not yet published - install from source
npm install @atlas/sdk
```

## Quick Start

```typescript
import { openAtlas } from '@atlas/sdk';

const atlas = await openAtlas('./crawl.atls');

console.log(`Pages: ${atlas.summary.totalPages}`);
console.log(`Datasets: ${[...atlas.datasets].join(', ')}`);

// Iterate over pages
for await (const page of atlas.readers.pages()) {
  console.log(page.url, page.statusCode);
}
```

## API

### `openAtlas(atlsPath: string): Promise<AtlasReader>`

Opens an Atlas archive and returns a reader interface.

**Returns:**
```typescript
{
  manifest: AtlasManifest;     // Archive metadata
  summary: AtlasSummary;       // Crawl statistics
  datasets: Set<DatasetName>;  // Available datasets
  readers: {
    pages: () => AsyncIterable<PageRecord>;
    edges: () => AsyncIterable<EdgeRecord>;
    assets: () => AsyncIterable<AssetRecord>;
    errors: () => AsyncIterable<ErrorRecord>;
    accessibility: () => AsyncIterable<AccessibilityRecord>;
  };
}
```

**Example:**
```typescript
const atlas = await openAtlas('./crawl.atls');

// Check which datasets are present
if (atlas.datasets.has('accessibility')) {
  for await (const record of atlas.readers.accessibility()) {
    console.log(`${record.pageUrl}: ${record.missingAltCount} missing alt`);
  }
}
```

### `select(atlsPath: string, options: SelectOptions): AsyncIterable<T>`

Stream records with filtering and projection for efficient memory usage.

**Options:**
```typescript
{
  dataset: DatasetName;           // Required: which dataset to query
  where?: (record: T) => boolean; // Optional: filter function
  fields?: string[];              // Optional: field projection
  limit?: number;                 // Optional: max records to return
}
```

**Examples:**

```typescript
// Get all 404 pages
for await (const page of select('./crawl.atls', {
  dataset: 'pages',
  where: (p) => p.statusCode === 404,
  fields: ['url', 'statusCode', 'discoveredFrom']
})) {
  console.log(page);
}

// Get pages with missing alt text
for await (const record of select('./crawl.atls', {
  dataset: 'accessibility',
  where: (a) => a.missingAltCount > 0,
  limit: 50
})) {
  console.log(`${record.pageUrl}: ${record.missingAltCount} missing`);
}

// Get broken links (external edges to 404s)
for await (const edge of select('./crawl.atls', {
  dataset: 'edges',
  where: (e) => e.isExternal,
  fields: ['fromUrl', 'toUrl', 'anchorText']
})) {
  console.log(edge);
}
```

## Types

All Atlas v1.0 types are exported:

```typescript
import type {
  PageRecord,
  EdgeRecord,
  AssetRecord,
  ErrorRecord,
  AccessibilityRecord,
  AtlasManifest,
  AtlasSummary,
  RenderMode,
  DatasetName
} from '@caifrazier/atlas-sdk';
```

## Examples

See the `examples/` directory for complete working examples:

- **`top-sections.mjs`** - Find the 10 largest sections by page count
- **`missing-alt.mjs`** - List pages with missing alt text from accessibility stream

Run examples:
```bash
node examples/top-sections.mjs ./path/to/crawl.atls
node examples/missing-alt.mjs ./path/to/crawl.atls
```

## Memory Efficiency

The SDK uses streaming iterators and never loads the entire archive into memory. This allows you to process archives with millions of records on machines with limited RAM.

```typescript
// This works even for huge archives
let count = 0;
for await (const page of atlas.readers.pages()) {
  count++;
  if (count % 10000 === 0) {
    console.log(`Processed ${count} pages...`);
  }
}
```

## License

UNLICENSED - Proprietary and confidential.
Copyright © 2025 Cai Frazier. All rights reserved.
