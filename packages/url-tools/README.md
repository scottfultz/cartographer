# @cf/url-tools

Shared URL parsing, normalization, and validation utilities for Cartographer Engine.

**Part of the Cartographer monorepo** - See [main README](../../README.md) for full documentation.

## Purpose

This package provides:
- URL normalization and canonicalization
- Tracking parameter filtering
- Domain extraction and validation
- URL comparison and deduplication utilities

## Installation

### Within Monorepo

All workspace packages automatically have access to `@cf/url-tools` via the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@cf/url-tools": "workspace:*"
  }
}
```

## Usage

```typescript
import {
  normalizeUrl,
  extractDomain,
  isSameDomain,
  removeTrackingParams,
  isValidUrl
} from '@cf/url-tools';

// Normalize URLs for deduplication
const canonical = normalizeUrl('https://example.com/page?utm_source=twitter');
// → 'https://example.com/page'

// Extract domain
const domain = extractDomain('https://www.example.com/path');
// → 'example.com'

// Check if same domain
const same = isSameDomain('https://example.com/a', 'https://example.com/b');
// → true

// Validate URL
const valid = isValidUrl('https://example.com');
// → true
```

## API Reference

### `normalizeUrl(url: string, options?: NormalizeOptions): string`

Normalizes a URL for consistent comparison and deduplication.

**Normalization Steps:**
1. Parse with `URL` constructor
2. Remove tracking parameters (gclid, fbclid, utm_*)
3. Remove default ports (80 for http, 443 for https)
4. Normalize trailing slashes
5. Sort query parameters
6. Lowercase hostname

**Options:**
```typescript
interface NormalizeOptions {
  paramPolicy?: 'keep' | 'strip' | 'filter';  // Default: 'filter'
  blockList?: string[];                        // Additional params to remove
  stripHash?: boolean;                         // Remove # fragment (default: false)
  forceTrailingSlash?: boolean;                // Add trailing slash (default: false)
}
```

**Example:**
```typescript
normalizeUrl('https://example.com/page?utm_source=twitter&id=123');
// → 'https://example.com/page?id=123'

normalizeUrl('https://example.com/page?a=1&b=2', { paramPolicy: 'strip' });
// → 'https://example.com/page'

normalizeUrl('https://example.com/page#section', { stripHash: true });
// → 'https://example.com/page'
```

### `extractDomain(url: string): string | null`

Extracts the domain from a URL, removing www. prefix.

**Example:**
```typescript
extractDomain('https://www.example.com/path');  // → 'example.com'
extractDomain('https://sub.example.com/path');  // → 'sub.example.com'
extractDomain('invalid');                        // → null
```

### `isSameDomain(url1: string, url2: string): boolean`

Checks if two URLs are on the same domain (ignoring www).

**Example:**
```typescript
isSameDomain('https://example.com/a', 'https://example.com/b');      // → true
isSameDomain('https://www.example.com/a', 'https://example.com/b'); // → true
isSameDomain('https://example.com/a', 'https://other.com/b');       // → false
```

### `removeTrackingParams(url: string): string`

Removes common tracking parameters from a URL.

**Default Blocklist:**
- Google: `gclid`, `gclsrc`, `dclid`
- Facebook: `fbclid`
- Microsoft: `msclkid`
- Yandex: `yclid`
- Impact: `irclickid`
- UTM: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- Mailchimp: `mc_cid`, `mc_eid`
- Referrals: `ref`, `ref_*`

**Example:**
```typescript
removeTrackingParams('https://example.com?utm_source=twitter&id=123');
// → 'https://example.com?id=123'
```

### `isValidUrl(url: string): boolean`

Validates if a string is a valid HTTP/HTTPS URL.

**Example:**
```typescript
isValidUrl('https://example.com');     // → true
isValidUrl('http://example.com');      // → true
isValidUrl('ftp://example.com');       // → false
isValidUrl('not a url');               // → false
```

### `getUrlWithoutFragment(url: string): string`

Returns URL without the hash fragment.

**Example:**
```typescript
getUrlWithoutFragment('https://example.com/page#section');
// → 'https://example.com/page'
```

### `getUrlHost(url: string): string | null`

Extracts the host (hostname + port) from a URL.

**Example:**
```typescript
getUrlHost('https://example.com:8080/path');  // → 'example.com:8080'
getUrlHost('https://example.com/path');       // → 'example.com'
```

## Parameter Policies

The `paramPolicy` option controls how query parameters are handled:

### `keep` - Keep All Parameters
Preserves all query parameters as-is:
```typescript
normalizeUrl('https://example.com?a=1&b=2', { paramPolicy: 'keep' });
// → 'https://example.com?a=1&b=2'
```

### `strip` - Remove All Parameters
Removes all query parameters:
```typescript
normalizeUrl('https://example.com?a=1&b=2', { paramPolicy: 'strip' });
// → 'https://example.com'
```

### `filter` - Remove Blocklisted Parameters (Default)
Removes only tracking and blocklisted parameters:
```typescript
normalizeUrl('https://example.com?utm_source=twitter&id=123', { paramPolicy: 'filter' });
// → 'https://example.com?id=123'
```

## Use Cases

### In Cartographer Engine

The URL tools are used throughout the crawler for:
- **Link Extraction** - Normalize discovered URLs before queuing
- **Deduplication** - Detect already-visited URLs
- **Domain Filtering** - Apply allow/deny lists
- **Edge Records** - Store canonical URLs in link graph

### In External Tools

Use these utilities when:
- Building analytics dashboards (consistent URL grouping)
- Creating SEO reports (canonical URL comparison)
- Analyzing crawl data (domain-based filtering)
- Building custom crawlers (URL normalization)

## Development

### Building

```bash
# From monorepo root
pnpm build --filter @cf/url-tools

# Or from this package
cd packages/url-tools
pnpm build
```

### Testing

```bash
pnpm test --filter @cf/url-tools
```

### Linting

```bash
pnpm lint --filter @cf/url-tools
```

## File Structure

```
packages/url-tools/
├── src/
│   └── index.ts         # All URL utilities
├── dist/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Version History

- **1.0.0** - Initial monorepo release
  - Extracted from `@cf/cartographer`
  - Shared across engine and tooling
  - Support for flexible parameter policies

## Related Packages

- **@cf/cartographer** - Main crawler engine (uses these utilities)
- **@atlas/spec** - Shared types (some URL-related types)
- **@atlas/sdk** - Archive reader SDK

---

**Maintainer:** Cai Frazier  
**License:** Proprietary - All Rights Reserved
