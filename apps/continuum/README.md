# Continuum

**SEO Analysis Tool for Atlas Archives**

Copyright © 2025 Cai Frazier.

**Status:** ✅ **v1.0.0-beta.1 - Production Ready for Viewing**

---

## Overview

Continuum is a desktop application built with Electron for viewing and analyzing Atlas v1.0 archives (`.atls` files) produced by the Cartographer crawler engine.

**Latest Update:** Successfully resolved native module dependencies. App now runs without errors on macOS Apple Silicon.

## Features

- **Import Atlas Archives** - Load `.atls` files via file dialog
- **Archive Overview** - View manifest metadata and crawl statistics
- **Page Browser** - Browse all crawled pages with pagination
- **Search** - Filter pages by URL, title, or H1
- **Page Details** - View comprehensive SEO data for individual pages
- **Statistics Dashboard** - See counts for pages, links, assets, errors, and accessibility records

## Usage

### Development

```bash
# Install dependencies
pnpm install

# Build the app
pnpm build

# Run in development mode
pnpm dev
```

### Production

```bash
# Build the app
pnpm build

# Run the production version
pnpm start

# Package for distribution (macOS, Windows, Linux)
pnpm package
```

## Architecture

### Main Process (`src/main.ts`)
- Electron main process
- Window management
- IPC handlers for Atlas operations
- File system access via dialog

### Preload Script (`src/preload.ts`)
- Secure context bridge
- Exposes `window.atlasAPI` to renderer
- Type-safe IPC communication

### Renderer Process (`src/renderer/`)
- UI layer (HTML + CSS + TypeScript)
- Data display and interaction
- No direct Node.js/Electron access (security)

## Atlas SDK Integration

Continuum uses `@atlas/sdk` to read Atlas archives:

```typescript
import { openAtlas } from '@atlas/sdk';

const atlas = await openAtlas('./crawl.atls');

// Iterate pages
for await (const page of atlas.readers.pages()) {
  console.log(page.url, page.title);
}
```

## Current Features (v1.0.0-beta.1)

✅ Import Atlas archives  
✅ View manifest and metadata  
✅ Browse pages with pagination  
✅ Search pages by URL/title/H1  
✅ View detailed page information  
✅ Display crawl statistics  
✅ Clean, professional UI with dark theme

## Future Enhancements

- [ ] SEO audit reports
- [ ] Link graph visualization
- [ ] WCAG accessibility analysis
- [ ] Bulk export to CSV/Excel
- [ ] Compare multiple crawls
- [ ] Custom filters and saved views
- [ ] Scheduled crawls from UI
- [ ] Real-time crawl monitoring

## Tech Stack

- **Electron 28** - Desktop app framework
- **TypeScript 5.6** - Type-safe development
- **Atlas SDK** - Archive reading and parsing
- **Zstandard** - Data decompression
- **Pure CSS** - No UI framework dependencies

## License

UNLICENSED - Proprietary software. Not open source.
