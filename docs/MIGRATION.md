# Migration Guide

This document helps you upgrade Cartographer and Atlas archives to version 1.0.0 from earlier preview versions.

---

## Overview

Version 1.0.0 introduces several breaking changes to stabilize the CLI interface and Atlas archive format before the stable 1.0 release. This guide covers:

- **CLI Breaking Changes**: Renamed flags and changed defaults
- **Archive Format Changes**: New required fields in manifests
- **Upgrade Steps**: How to migrate existing crawls and scripts

---

## Breaking Changes

### 1. CLI Flag Renamed: `--errorBudget` → `--maxErrors`

**Change:** The `--errorBudget` flag has been renamed to `--maxErrors` for clarity.

**Before (< 1.0.0):**
```bash
cartographer crawl --seeds https://example.com --out site.atls --errorBudget 10
```

**After (≥ 1.0.0):**
```bash
cartographer crawl --seeds https://example.com --out site.atls --maxErrors 10
```

**Migration:**
- Update all scripts and documentation using `--errorBudget` to `--maxErrors`
- The semantics remain identical: crawl aborts after N errors
- Exit code remains `2` when the limit is exceeded

---

### 2. Default `maxDepth` Changed: `3` → `1`

**Change:** The default crawl depth has been reduced from 3 to 1 to prevent accidental deep crawls.

**Impact:**
- By default, Cartographer now only crawls the seed page and its direct links (depth 1)
- Previous default (depth 3) could crawl thousands of pages unintentionally

**Before (< 1.0.0):**
```bash
# Implicitly crawls to depth 3
cartographer crawl --seeds https://example.com --out site.atls
```

**After (≥ 1.0.0):**
```bash
# Now crawls to depth 1 by default
cartographer crawl --seeds https://example.com --out site.atls

# To restore previous behavior, explicitly set maxDepth
cartographer crawl --seeds https://example.com --out site.atls --maxDepth 3
```

**Migration:**
- If your crawls relied on depth 3, add `--maxDepth 3` explicitly
- For site-wide crawls, use `--maxDepth 99` or `--maxPages <limit>`
- Review crawl volumes to ensure they match expectations

---

### 3. Atlas Format: Explicit `formatVersion` Field

**Change:** Manifests now require an explicit `formatVersion` field (e.g., `"1.0.0"`).

**Impact:**
- New archives (≥ 1.0.0-rc.1) include `formatVersion: "1.0.0"` in manifest.json
- Old archives (< 1.0.0-rc.1) lack this field
- The Atlas SDK validates `formatVersion` and warns for older archives

**Archive Compatibility:**

| Archive Version | formatVersion Field | SDK Behavior |
|-----------------|---------------------|--------------|
| < 1.0.0-rc.1    | Missing             | ⚠️ Warning: "pre-1.0.0-rc.1 archive" |
| 1.0.0-rc.1+     | `"1.0.0"`          | ✅ Fully supported |
| 2.0.0+ (future) | `"2.0.0"`          | ❌ Error: Unsupported major version |

**Migration:**
- Old archives (.atls files from < 1.0.0-rc.1) will continue to work with warnings
- To regenerate with `formatVersion`, re-crawl using Cartographer 1.0.0+
- The SDK's `validate()` function will flag missing `formatVersion` as a warning

**Example Manifest Difference:**

**Before (< 1.0.0-rc.1):**
```json
{
  "atlasVersion": "1.0",
  "specVersion": "https://github.com/caifrazier/cartographer/blob/main/packages/atlas-spec/SPECIFICATION.md",
  "owner": { "name": "Cai Frazier" },
  ...
}
```

**After (≥ 1.0.0-rc.1):**
```json
{
  "atlasVersion": "1.0",
  "formatVersion": "1.0.0",  ← NEW FIELD
  "specVersion": "https://github.com/caifrazier/cartographer/blob/main/packages/atlas-spec/SPECIFICATION.md",
  "owner": { "name": "Cai Frazier" },
  ...
}
```

---

## Upgrade Steps

### Step 1: Update Cartographer

```bash
# Install the latest version
pnpm install @cf/cartographer@latest

# Or clone from GitHub and build
git clone https://github.com/caifrazier/cartographer.git
cd cartographer
pnpm install
pnpm build
```

### Step 2: Update CLI Scripts

**Search and Replace:**
- `--errorBudget` → `--maxErrors`
- Add explicit `--maxDepth 3` if you need the old default behavior

**Example Migration:**

**Before:**
```bash
#!/bin/bash
cartographer crawl \
  --seeds https://example.com \
  --out crawl.atls \
  --errorBudget 10 \
  --logFile ./logs/crawl.jsonl
```

**After:**
```bash
#!/bin/bash
cartographer crawl \
  --seeds https://example.com \
  --out crawl.atls \
  --maxErrors 10 \
  --maxDepth 3 \  # ← Add if you relied on depth 3
  --logFile ./logs/crawl.jsonl
```

### Step 3: Validate Existing Archives

Use the SDK's `validate()` function to check compatibility:

```typescript
import { openAtlas } from '@atlas/sdk';

const atlas = await openAtlas('./old-archive.atls');
const result = await atlas.validate();

if (result.summary.hasErrors) {
  console.error('Validation errors:', result.issues);
} else if (result.summary.hasWarnings) {
  console.warn('Warnings:', result.issues);
  // Expected: "Manifest missing formatVersion field (pre-1.0.0-rc.1 archive)"
}
```

**Expected Output for Old Archives:**
```
⚠️ Warning: Manifest missing formatVersion field (pre-1.0.0-rc.1 archive)
```

### Step 4: Re-Crawl Critical Sites

For production use, regenerate archives with Cartographer 1.0.0+ to include `formatVersion`:

```bash
# Re-crawl to get formatVersion field
cartographer crawl \
  --seeds https://production-site.com \
  --out production-2025.atls \
  --maxDepth 3 \
  --maxErrors 50
```

---

## Common Migration Scenarios

### Scenario 1: Automated Crawl Scripts

**Problem:** Scripts using `--errorBudget` break with "Unknown option: --errorBudget"

**Solution:**
1. Replace `--errorBudget` with `--maxErrors` in all scripts
2. Add `--maxDepth 3` if you relied on the old default
3. Test scripts with `--maxPages 5` before full crawls

### Scenario 2: CI/CD Pipelines

**Problem:** CI builds fail due to flag changes

**Solution:**
1. Update Dockerfile/CI config to use Cartographer 1.0.0+
2. Update `.github/workflows/` or CI scripts with new flags
3. Pin Cartographer version: `@cf/cartographer@1.0.0` to avoid future breakage

**Example GitHub Actions Update:**

**Before:**
```yaml
- name: Crawl staging site
  run: |
    cartographer crawl --seeds $STAGING_URL --out staging.atls --errorBudget 20
```

**After:**
```yaml
- name: Crawl staging site
  run: |
    cartographer crawl --seeds $STAGING_URL --out staging.atls --maxErrors 20 --maxDepth 3
```

### Scenario 3: Reading Old Archives with SDK

**Problem:** SDK warns about missing `formatVersion`

**Solution:**
1. Warnings are safe to ignore for < 1.0.0-rc.1 archives
2. Suppress warnings by filtering validation issues:
   ```typescript
   const result = await atlas.validate();
   const errors = result.issues.filter(i => i.severity === 'error');
   if (errors.length > 0) {
     throw new Error('Validation failed');
   }
   ```
3. Or regenerate archives with Cartographer 1.0.0+

---

## Version Compatibility Matrix

| Component              | Version | Compatibility Notes |
|------------------------|---------|---------------------|
| Cartographer CLI       | 1.0.0+  | Requires Node.js 18+, Playwright 1.48+ |
| Atlas SDK              | 1.0.0+  | Reads archives from < 1.0.0-rc.1 with warnings |
| Atlas Format           | 1.0     | `formatVersion: "1.0.0"` required for new archives |
| Old Archives (< RC1)   | N/A     | Readable but trigger warnings (missing `formatVersion`) |

---

## Deprecation Timeline

| Item                  | Deprecated | Removed | Replacement |
|-----------------------|------------|---------|-------------|
| `--errorBudget` flag  | 1.0.0-rc.1 | 1.0.0   | `--maxErrors` |
| Default `maxDepth: 3` | 1.0.0-rc.1 | 1.0.0   | `maxDepth: 1` (or explicit flag) |

---

## Getting Help

If you encounter issues upgrading:

1. **Check CHANGELOG.md**: Detailed release notes for each version
2. **Review README.md**: Updated CLI examples and usage
3. **File an Issue**: https://github.com/caifrazier/cartographer/issues
4. **Contact Support**: cai@caifrazier.com

---

## Related Documentation

- **[CHANGELOG.md](../CHANGELOG.md)**: Full release notes for 1.0.0-rc.1
- **[README.md](../README.md)**: Updated CLI usage and examples
- **[SPECIFICATION.md](../packages/atlas-spec/SPECIFICATION.md)**: Atlas v1.0 format documentation
- **[CONTRIBUTING.md](../CONTRIBUTING.md)**: Development and release process

---

**Last Updated:** 2025-10-25  
**Version:** 1.0.0-rc.1
