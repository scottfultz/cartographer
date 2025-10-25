# Media Collection - Architecture Diagram

## System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CARTOGRAPHER ENGINE                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            SCHEDULER                                 │
│  • Manages crawl queue                                              │
│  • Coordinates extraction and media collection                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
         ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
         │   RENDERER   │  │  FETCHER    │  │  EXTRACTORS  │
         │              │  │             │  │              │
         │ • Load page  │  │ • Raw HTTP  │  │ • Links      │
         │ • Execute JS │  │ • Headers   │  │ • Assets     │
         │ • Screenshots│  │ • Redirect  │  │ • Page facts │
         └──────────────┘  └─────────────┘  └──────────────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        MEDIA COLLECTOR                               │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  SCREENSHOTS    │  │   FAVICONS   │  │   SOCIAL IMAGES      │  │
│  │                 │  │              │  │                      │  │
│  │ • Desktop       │  │ • ico/png/svg│  │ • OG image           │  │
│  │ • Mobile        │  │ • Deduplicate│  │ • Twitter card       │  │
│  │ • Tablet        │  │ • Per origin │  │ • Deduplicate by hash│  │
│  │ • Full page     │  │              │  │                      │  │
│  └─────────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              ASSET DOWNLOADER (Optional)                     │  │
│  │  • Filter by size, format, visibility                       │  │
│  │  • Download images/videos                                   │  │
│  │  • Deduplicate by content hash                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ATLAS WRITER                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Staging Directory                                           │  │
│  │                                                              │  │
│  │  pages/part-001.jsonl                                        │  │
│  │  edges/part-001.jsonl                                        │  │
│  │  assets/part-001.jsonl                                       │  │
│  │  media/                                                      │  │
│  │    ├── screenshots/                                          │  │
│  │    │   ├── desktop/{urlHash}.jpg                            │  │
│  │    │   ├── mobile/{urlHash}.jpg                             │  │
│  │    │   └── tablet/{urlHash}.jpg                             │  │
│  │    ├── favicons/{originHash}.{ico|png|svg}                  │  │
│  │    ├── social/                                               │  │
│  │    │   ├── og/{contentHash}.jpg                             │  │
│  │    │   └── twitter/{contentHash}.jpg                        │  │
│  │    └── assets/                                               │  │
│  │        ├── images/{contentHash}.{ext}                       │  │
│  │        └── videos/{contentHash}.{ext}                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Compress & Package
┌─────────────────────────────────────────────────────────────────────┐
│                       ATLAS ARCHIVE (.atls)                          │
│  • ZIP container with Zstandard compression                         │
│  • JSONL parts for structured data                                  │
│  • Raw media files (JPEG screenshots, ICO/PNG favicons)             │
│  • Manifest with integrity hashes                                   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DOWNSTREAM CONSUMERS                          │
│  • Continuum SEO tool                                               │
│  • Accessibility auditors                                           │
│  • Visual regression testing                                        │
│  • Archive viewers/explorers                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Media Collection Flow (Per Page)

```
Page URL
   │
   ▼
┌──────────────────┐
│  Render Page     │ ◄── Config: viewports, quality, formats
│  (Playwright)    │
└──────────────────┘
   │
   ├─► Screenshot (Desktop)  ──┐
   ├─► Screenshot (Mobile)   ──┤
   ├─► Screenshot (Tablet)   ──┤ ──► Buffer + Metadata
   └─► Full Page             ──┘
   │
   ▼
┌──────────────────┐
│  Extract Metadata│
│  (Cheerio)       │
└──────────────────┘
   │
   ├─► Favicon URL           ──┐
   ├─► OG Image URL          ──┤
   ├─► Twitter Card URL      ──┤ ──► URLs to Download
   └─► Asset URLs            ──┘
   │
   ▼
┌──────────────────┐
│  Download Assets │ ◄── Filters: size, format, visibility
│  (HTTP Fetch)    │
└──────────────────┘
   │
   ├─► Favicon (ico/png/svg) ──┐
   ├─► Social Images         ──┤
   └─► Page Assets           ──┘ ──► Buffers
   │
   ▼
┌──────────────────┐
│  Deduplication   │ ◄── SHA-256 content hash
│  & Compression   │
└──────────────────┘
   │
   ├─► Hash Cache Check      ──► Skip if exists
   ├─► JPEG Compression      ──► Quality 80%
   └─► File Write            ──► Staging directory
   │
   ▼
┌──────────────────┐
│  Update Records  │
│  (PageRecord)    │
└──────────────────┘
   │
   └─► media: {
         screenshots: { desktop: "path/to/file.jpg" },
         favicon: { ico: "path/to/file.ico" },
         social: { ogImage: "path/to/file.jpg" }
       }
```

---

## Deduplication Strategy

### Favicons (Per Origin)

```
Page 1: https://example.com/       ──┐
Page 2: https://example.com/about  ──┼──► Origin: example.com
Page 3: https://example.com/blog   ──┘
                                       │
                                       ▼
                          Check: originsSeen.has('example.com')?
                                       │
                          ┌────────────┼────────────┐
                          │ NO                      │ YES
                          ▼                         ▼
                   Download favicon          Skip download
                   Store as {originHash}     Reuse existing path
                   Add to originsSeen
```

### Social Images & Assets (Content Hash)

```
Image URL 1: https://cdn.example.com/hero.jpg  ──┐
Image URL 2: https://cdn.example.com/banner.jpg ──┤
Image URL 3: https://static.example.com/hero.jpg ──┘ (same content as #1)
                                                   │
                                                   ▼
                                    Download each image
                                    Compute SHA-256 hash
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                           Hash: abc123         Hash: def456         Hash: abc123
                              │                    │                    │
                              ▼                    ▼                    ▼
                       Store as abc123.jpg   Store as def456.jpg   Already exists!
                       in media/social/      in media/social/      Reuse abc123.jpg
```

---

## Configuration Flow

```
User CLI Input
   │
   ├─► --captureScreenshots
   ├─► --screenshotViewports desktop,mobile
   ├─► --downloadFavicons
   ├─► --captureSocialImages
   └─► --downloadAssets
   │
   ▼
┌──────────────────┐
│  Parse & Validate│
│  (crawl.ts)      │
└──────────────────┘
   │
   ▼
┌──────────────────┐
│  Build Config    │
│  (EngineConfig)  │
└──────────────────┘
   │
   └─► media: {
         screenshots: {
           enabled: true,
           viewports: ['desktop', 'mobile'],
           quality: 80,
           format: 'jpeg'
         },
         favicons: { enabled: true },
         socialImages: { enabled: true },
         assets: { enabled: false }
       }
   │
   ▼
┌──────────────────┐
│  Pass to Engine  │
│  (Cartographer)  │
└──────────────────┘
```

---

## Archive Size Growth Model

```
Base Archive (100 pages, no media):
    ├─ pages.jsonl.zst:         ~100 KB
    ├─ edges.jsonl.zst:         ~50 KB
    ├─ assets.jsonl.zst:        ~30 KB
    ├─ errors.jsonl.zst:        ~5 KB
    ├─ manifest.json:           ~10 KB
    └─ Total:                   ~200 KB

+ Desktop Screenshots (100 pages × 100 KB):
    └─ media/screenshots/:      +10 MB

+ Mobile Screenshots (100 pages × 80 KB):
    └─ media/screenshots/:      +8 MB

+ Favicons (1 origin × 15 KB):
    └─ media/favicons/:         +15 KB

+ Social Images (50 unique × 150 KB):
    └─ media/social/:           +7.5 MB

+ Downloaded Assets (1000 images × 200 KB):
    └─ media/assets/:           +200 MB (!)

Total with all features:        ~225 MB
Total with screenshots only:    ~18 MB
```

---

## Performance Budget

```
Baseline (no media):
    ├─ Crawl time: 100 pages in 5 minutes  (3s/page)
    └─ Archive size: 200 KB

With Desktop Screenshots:
    ├─ Crawl time: 100 pages in 6 minutes  (+20%, 3.6s/page)
    ├─ Archive size: 18 MB                 (+9000%)
    └─ Acceptable? ✅ YES

With All Screenshots:
    ├─ Crawl time: 100 pages in 8 minutes  (+60%, 4.8s/page)
    ├─ Archive size: 26 MB                 (+13000%)
    └─ Acceptable? ⚠️  BORDERLINE

With Asset Downloads:
    ├─ Crawl time: 100 pages in 30 minutes (+500%, 18s/page)
    ├─ Archive size: 225 MB                (+112500%)
    └─ Acceptable? ❌ NO (opt-in only)
```

---

**Diagram Version:** 1.0  
**Last Updated:** October 24, 2025  
**Owner:** Cai Frazier
