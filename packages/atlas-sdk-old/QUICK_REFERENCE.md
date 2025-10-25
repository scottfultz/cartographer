# Atlas SDK Quick Reference

## Installation
```bash
npm install @caifrazier/atlas-sdk
```

## Basic Usage

### Open Archive
```typescript
import { openAtlas } from '@caifrazier/atlas-sdk';

const atlas = await openAtlas('./crawl.atls');
```

### Check Datasets
```typescript
console.log([...atlas.datasets]); // ['pages', 'edges', 'assets', 'errors', 'accessibility']

if (atlas.datasets.has('accessibility')) {
  // Accessibility data is present
}
```

### Iterate Pages
```typescript
for await (const page of atlas.readers.pages()) {
  console.log(page.url, page.statusCode);
}
```

### Iterate Accessibility
```typescript
for await (const record of atlas.readers.accessibility()) {
  console.log(record.pageUrl, record.missingAltCount);
}
```

## Advanced Queries

### Filter Pages
```typescript
import { select } from '@caifrazier/atlas-sdk';

// Get all 404 pages
for await (const page of select('./crawl.atls', {
  dataset: 'pages',
  where: (p) => p.statusCode === 404
})) {
  console.log(page.url);
}
```

### Project Fields
```typescript
// Only get specific fields
for await (const page of select('./crawl.atls', {
  dataset: 'pages',
  fields: ['url', 'statusCode', 'title']
})) {
  console.log(page); // { url, statusCode, title }
}
```

### Limit Results
```typescript
// Get first 100 records
for await (const page of select('./crawl.atls', {
  dataset: 'pages',
  limit: 100
})) {
  // Process page
}
```

### Combine Options
```typescript
// Complex query: 404s with projection and limit
for await (const page of select('./crawl.atls', {
  dataset: 'pages',
  where: (p) => p.statusCode === 404,
  fields: ['url', 'discoveredFrom'],
  limit: 50
})) {
  console.log(`Broken: ${page.url} (from ${page.discoveredFrom})`);
}
```

## Common Patterns

### Count by Status Code
```typescript
const codes = new Map();
for await (const page of atlas.readers.pages()) {
  codes.set(page.statusCode, (codes.get(page.statusCode) || 0) + 1);
}
```

### Find Missing Alt Text
```typescript
for await (const record of atlas.readers.accessibility()) {
  if (record.missingAltCount > 0) {
    console.log(`${record.pageUrl}: ${record.missingAltCount} missing`);
  }
}
```

### Analyze Sections
```typescript
const sections = new Map();
for await (const page of atlas.readers.pages()) {
  const section = page.section || '/';
  sections.set(section, (sections.get(section) || 0) + 1);
}
```

### External Links
```typescript
for await (const edge of atlas.readers.edges()) {
  if (edge.isExternal) {
    console.log(`${edge.fromUrl} -> ${edge.toUrl}`);
  }
}
```

## Metadata Access

```typescript
// Manifest
console.log(atlas.manifest.atlasVersion);
console.log(atlas.manifest.createdAt);
console.log(atlas.manifest.capabilities);

// Summary
console.log(atlas.summary.totalPages);
console.log(atlas.summary.statusCodes);
console.log(atlas.summary.crawlDurationMs);
```

## Performance Tips

✅ **DO**: Use streaming iterators for large archives
```typescript
// Memory efficient - processes one record at a time
for await (const page of atlas.readers.pages()) {
  // Process incrementally
}
```

❌ **DON'T**: Load everything into memory
```typescript
// Bad - loads entire dataset into RAM
const pages = [];
for await (const page of atlas.readers.pages()) {
  pages.push(page);
}
```

✅ **DO**: Use `select()` for filtering
```typescript
// Efficient - filters while streaming
for await (const page of select('./crawl.atls', {
  dataset: 'pages',
  where: (p) => p.statusCode === 404
})) {
  // Already filtered
}
```

## Examples

See `examples/` directory for complete working code:
- `top-sections.mjs` - Section analysis
- `missing-alt.mjs` - Accessibility audit
- `status-report.mjs` - Status code breakdown
- `test.mjs` - API test suite
