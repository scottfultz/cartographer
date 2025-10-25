# Audit Data Point Coverage Analysis

**Analysis Date:** 2025-01-23  
**Purpose:** Map industry-standard audit data points against Cartographer's current data collection

## Summary

| Category | Total Data Points | Collected | Partial | Missing |
|----------|------------------|-----------|---------|---------|
| Core Page & Resource Information | 18 | 15 | 2 | 1 |
| Crawlability & Indexability | 10 | 9 | 1 | 0 |
| On-Page Content & HTML Tags | 15 | 13 | 2 | 0 |
| Link Data | 13 | 11 | 1 | 1 |
| Performance & Resource Loading | 22 | 9 | 3 | 10 |
| Accessibility | 25 | 18 | 4 | 3 |
| Security & Best Practices | 10 | 7 | 1 | 2 |
| Mobile Friendliness | 2 | 0 | 1 | 1 |
| Internationalization & Structured Data | 4 | 4 | 0 | 0 |
| SEO Enrichment Data | 11 | 7 | 2 | 2 |
| **TOTAL** | **130** | **93 (72%)** | **17 (13%)** | **20 (15%)** |

---

## Category 1: Core Page & Resource Information (18 data points)

### ✅ Collected (15)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **url** | `PageRecord.url` | ✅ |
| **final_url** | `PageRecord.finalUrl` | ✅ |
| **status_code** | `PageRecord.statusCode` | ✅ |
| **content_type** | `PageRecord.contentType` | ✅ |
| **redirect_chain** | `PageRecord.redirectChain` | ✅ Array of URLs |
| **crawl_timestamp** | `PageRecord.fetchedAt` | ✅ ISO timestamp |
| **render_time** | `PageRecord.renderMs` | ✅ Milliseconds |
| **fetch_time** | `PageRecord.fetchMs` | ✅ Milliseconds |
| **render_mode** | `PageRecord.renderMode` | ✅ "raw" \| "prerender" \| "full" |
| **html_hash** | `PageRecord.rawHtmlHash` | ✅ SHA256 |
| **dom_hash** | `PageRecord.domHash` | ✅ SHA256 post-render |
| **text_sample** | `PageRecord.textSample` | ✅ First 500 chars |
| **origin** | `PageRecord.origin` | ✅ Protocol + domain |
| **pathname** | `PageRecord.pathname` | ✅ |
| **section** | `PageRecord.section` | ✅ First path segment |

### 🟡 Partial (2)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **response_headers** | 🟡 Partial | Only security headers (`securityHeaders` object). Missing: Content-Length, Last-Modified, ETag, Cache-Control |
| **page_size_bytes** | 🟡 Estimated | Can estimate from `AssetRecord.estimatedBytes` sum, but no explicit HTML size |

### ❌ Missing (1)

| Data Point | Priority | Why Needed |
|-----------|----------|------------|
| **encoding** (charset) | Medium | Identifies character encoding issues (UTF-8 vs others) |

---

## Category 2: Crawlability & Indexability (10 data points)

### ✅ Collected (9)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **robots_meta** | `PageRecord.robotsMeta` | ✅ Object with parsed directives |
| **robots_http_header** | `PageRecord.robotsHeader` | ✅ X-Robots-Tag |
| **noindex_surface** | `PageRecord.noindexSurface` | ✅ "meta" \| "header" \| "both" \| "none" |
| **canonical_url** | `PageRecord.canonicalHref` | ✅ |
| **canonical_resolved** | `PageRecord.canonicalResolved` | ✅ Absolute URL |
| **depth** | `PageRecord.depth` | ✅ From seed |
| **discovered_from** | `PageRecord.discoveredFrom` | ✅ Parent URL |
| **discovered_in_mode** | `PageRecord.discoveredInMode` | ✅ |
| **http_status_codes_for_links** | `EdgeRecord.httpStatusAtTo` | ✅ Status code of link target |

### 🟡 Partial (1)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **sitemap_presence** | 🟡 Not explicitly tracked | Could extract from `structuredData` or add detection |

---

## Category 3: On-Page Content & HTML Tags (15 data points)

### ✅ Collected (13)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **title** | `PageRecord.title` | ✅ |
| **meta_description** | `PageRecord.metaDescription` | ✅ |
| **h1** | `PageRecord.h1` | ✅ First H1 text |
| **headings** | `PageRecord.headings` | ✅ Object with H1-H6 counts |
| **word_count** | `ComputedTextNodeRecord` | ✅ Can compute from text nodes |
| **lang_attribute** | `AccessibilityRecord.lang` | ✅ From `<html lang>` |
| **open_graph** | `PageRecord.structuredData` | ✅ Type: "OpenGraph" |
| **twitter_card** | `PageRecord.structuredData` | ✅ Type: "TwitterCard" |
| **json_ld** | `PageRecord.structuredData` | ✅ Type: "JSON-LD" |
| **microdata** | `PageRecord.structuredData` | ✅ Type: "Microdata" |
| **has_title_flag** | `PageRecord.basicFlags.hasTitle` | ✅ |
| **has_meta_description_flag** | `PageRecord.basicFlags.hasMetaDescription` | ✅ |
| **has_h1_flag** | `PageRecord.basicFlags.hasH1` | ✅ |

### 🟡 Partial (2)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **title_length** | 🟡 Can compute | From `PageRecord.title.length` |
| **meta_description_length** | 🟡 Can compute | From `PageRecord.metaDescription.length` |

---

## Category 4: Link Data (13 data points)

### ✅ Collected (11)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **internal_links_count** | `PageRecord.internalLinksCount` | ✅ |
| **external_links_count** | `PageRecord.externalLinksCount` | ✅ |
| **all_links** | `EdgeRecord[]` | ✅ Full edge list |
| **anchor_text** | `EdgeRecord.anchorText` | ✅ |
| **link_rel** | `EdgeRecord.rel` | ✅ |
| **nofollow** | `EdgeRecord.nofollow` | ✅ Boolean |
| **is_external** | `EdgeRecord.isExternal` | ✅ |
| **link_location** | `EdgeRecord.location` | ✅ "navigation" \| "content" \| "footer" \| "aside" |
| **link_selector** | `EdgeRecord.selectorHint` | ✅ CSS selector |
| **link_target_status** | `EdgeRecord.httpStatusAtTo` | ✅ |
| **hreflang_links** | `PageRecord.hreflangLinks` | ✅ Array with href, lang, hreflang |

### 🟡 Partial (1)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **broken_links_count** | 🟡 Can compute | Count `EdgeRecord` where `httpStatusAtTo >= 400` |

### ❌ Missing (1)

| Data Point | Priority | Why Needed |
|-----------|----------|------------|
| **outbound_domains** | Low | Distinct external domains linked (privacy/partnerships) |

---

## Category 5: Performance & Resource Loading (22 data points)

### ✅ Collected (9)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **lcp** | `PageRecord.performance.lcp` | ✅ Largest Contentful Paint |
| **cls** | `PageRecord.performance.cls` | ✅ Cumulative Layout Shift |
| **tbt** | `PageRecord.performance.tbt` | ✅ Total Blocking Time |
| **fcp** | `PageRecord.performance.fcp` | ✅ First Contentful Paint |
| **ttfb** | `PageRecord.performance.ttfb` | ✅ Time to First Byte |
| **image_assets** | `AssetRecord[]` | ✅ Filtered by `type: "image"` |
| **video_assets** | `AssetRecord[]` | ✅ Filtered by `type: "video"` |
| **lazy_loaded_images** | `AssetRecord.wasLazyLoaded` | ✅ Boolean flag |
| **loading_attribute** | `AssetRecord.loading` | ✅ "lazy" \| "eager" \| null |

### 🟡 Partial (3)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **total_page_size** | 🟡 Estimated | Sum of `AssetRecord.estimatedBytes` + HTML |
| **image_formats** | 🟡 Can extract | From `AssetRecord.assetUrl` extensions |
| **compression** | 🟡 Partial | Response headers not fully captured |

### ❌ Missing (10)

| Data Point | Priority | Why Needed |
|-----------|----------|------------|
| **fid** (First Input Delay) | High | Core Web Vital for interactivity |
| **inp** (Interaction to Next Paint) | High | New Core Web Vital (WCAG 2.2) |
| **speed_index** | Medium | Lighthouse metric for visual completeness |
| **time_to_interactive** (TTI) | Medium | When page becomes fully interactive |
| **js_execution_time** | Medium | JavaScript parse/compile/execute time |
| **css_count** | Low | Number of stylesheets |
| **js_count** | Low | Number of scripts |
| **font_count** | Low | Number of font files |
| **third_party_requests** | Medium | External domain request count |
| **render_blocking_resources** | High | CSS/JS blocking initial render |

---

## Category 6: Accessibility (25 data points)

### ✅ Collected (18)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **missing_alt_count** | `AccessibilityRecord.missingAltCount` | ✅ |
| **missing_alt_sources** | `AccessibilityRecord.missingAltSources` | ✅ Image URLs |
| **heading_order** | `AccessibilityRecord.headingOrder` | ✅ Array of H1-H6 sequence |
| **landmarks** | `AccessibilityRecord.landmarks` | ✅ header, nav, main, aside, footer |
| **aria_roles** | `AccessibilityRecord.roles` | ✅ Role counts |
| **form_controls** | `AccessibilityRecord.formControls` | ✅ Total inputs, missing labels |
| **focus_order** | `AccessibilityRecord.focusOrder` | ✅ Selector + tabindex |
| **contrast_violations** | `AccessibilityRecord.contrastViolations` | ✅ Full mode only |
| **aria_issues** | `AccessibilityRecord.ariaIssues` | ✅ Full mode only |
| **wcag_2_1_level_a** | `AccessibilityRecord.wcagData` | ✅ 30 criteria |
| **wcag_2_1_level_aa** | `AccessibilityRecord.wcagData` | ✅ |
| **wcag_2_2_additions** | `AccessibilityRecord.wcagData` | ✅ Focus appearance, dragging |
| **target_sizes** | `AccessibilityRecord.wcagData.targetSizes` | ✅ Runtime measurements |
| **focus_appearance** | `AccessibilityRecord.wcagData.focusAppearance` | ✅ Runtime CSS |
| **multimedia_captions** | `AccessibilityRecord.wcagData.multimedia.videos` | ✅ Caption detection |
| **audio_transcripts** | `AccessibilityRecord.wcagData.multimedia.transcriptLinks` | ✅ |
| **alt_text_quality** | `AssetRecord.alt` | ✅ Per-image alt text |
| **lang_attribute** | `AccessibilityRecord.lang` | ✅ |

### 🟡 Partial (4)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **color_contrast_ratio** | 🟡 Full mode only | `contrastViolations` array |
| **keyboard_navigation** | 🟡 Focus order only | Have `focusOrder`, but not full trap/skip detection |
| **skip_links** | 🟡 Landmarks only | Can infer from landmarks, not explicit |
| **aria_live_regions** | 🟡 In roles | Included in `roles` count, not dedicated field |

### ❌ Missing (3)

| Data Point | Priority | Why Needed |
|-----------|----------|------------|
| **pdf_accessibility** | Low | PDF/UA compliance for document assets |
| **video_audio_description** | Medium | Audio descriptions for blind users |
| **flashing_content** | Medium | Seizure risk (WCAG 2.3.1) |

---

## Category 7: Security & Best Practices (10 data points)

### ✅ Collected (7)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **https** | `PageRecord.origin` | ✅ Check if starts with "https://" |
| **csp** | `PageRecord.securityHeaders.CSP` | ✅ Content-Security-Policy |
| **hsts** | `PageRecord.securityHeaders.HSTS` | ✅ Strict-Transport-Security |
| **x_frame_options** | `PageRecord.securityHeaders["X-Frame-Options"]` | ✅ |
| **x_content_type_options** | `PageRecord.securityHeaders["X-Content-Type-Options"]` | ✅ |
| **referrer_policy** | `PageRecord.securityHeaders["Referrer-Policy"]` | ✅ |
| **permissions_policy** | `PageRecord.securityHeaders["Permissions-Policy"]` | ✅ |

### 🟡 Partial (1)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **mixed_content** | 🟡 Not explicit | Can detect from `AssetRecord` HTTP vs HTTPS |

### ❌ Missing (2)

| Data Point | Priority | Why Needed |
|-----------|----------|------------|
| **subresource_integrity** | Medium | SRI hashes on scripts/styles |
| **certificate_validity** | Low | SSL cert expiration (requires separate check) |

---

## Category 8: Mobile Friendliness (2 data points)

### 🟡 Partial (1)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **viewport_meta** | 🟡 Not extracted | Can add to `PageRecord` |

### ❌ Missing (1)

| Data Point | Priority | Why Needed |
|-----------|----------|------------|
| **touch_target_sizes** | High | Same as `targetSizes` in WCAG, but mobile-specific |

**Note:** `targetSizes` in `AccessibilityRecord.wcagData` covers this for WCAG compliance, but not explicitly labeled as "mobile friendliness".

---

## Category 9: Internationalization & Structured Data (4 data points)

### ✅ Collected (4)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **hreflang** | `PageRecord.hreflangLinks` | ✅ Array of {href, lang, hreflang} |
| **structured_data_types** | `PageRecord.structuredData` | ✅ JSON-LD, Microdata, OG, Twitter |
| **schema_org_types** | `PageRecord.structuredData` | ✅ 60+ types detected |
| **lang_attribute** | `AccessibilityRecord.lang` | ✅ |

---

## Category 10: SEO Enrichment Data (11 data points)

### ✅ Collected (7)

| Data Point | Field Location | Notes |
|-----------|----------------|-------|
| **tech_stack** | `PageRecord.techStack` | ✅ 50+ technologies |
| **cms_detection** | `PageRecord.techStack` | ✅ WordPress, Drupal, Contentful, etc. |
| **analytics_detection** | `PageRecord.techStack` | ✅ GA, Matomo, Plausible, etc. |
| **ecommerce_platform** | `PageRecord.techStack` | ✅ Shopify, WooCommerce, Magento, etc. |
| **ad_tech** | `PageRecord.techStack` | ✅ Google Ads, Facebook Pixel, etc. |
| **screenshots** | `PageRecord.media.screenshots` | ✅ Full mode only |
| **favicon** | `PageRecord.faviconUrl` | ✅ |

### 🟡 Partial (2)

| Data Point | Status | Notes |
|-----------|--------|-------|
| **estimated_traffic** | 🟡 Not collected | Would require external API (Ahrefs, Semrush) |
| **keyword_rankings** | 🟡 Not collected | Requires external SEO API |

### ❌ Missing (2)

| Data Point | Priority | Why Needed |
|-----------|----------|------------|
| **social_share_counts** | Low | Facebook, Twitter, LinkedIn share counts |
| **backlink_count** | Low | Requires external API (Ahrefs, Majestic) |

---

## Priority Implementation Plan

### 🔴 High Priority (8 missing data points)

1. **FID (First Input Delay)** - Core Web Vital
2. **INP (Interaction to Next Paint)** - New Core Web Vital
3. **Render-blocking resources** - Performance optimization
4. **Viewport meta tag** - Mobile friendliness
5. **Mixed content detection** - Security
6. **Third-party request count** - Performance/privacy
7. **Subresource Integrity** - Security best practice
8. **Video audio descriptions** - Accessibility enhancement

### 🟡 Medium Priority (12 data points)

1. **Speed Index** - Lighthouse metric
2. **Time to Interactive (TTI)** - Performance
3. **JS execution time** - Performance debugging
4. **Encoding (charset)** - Content issues
5. **Total page size** - Make explicit field
6. **Image formats** - Optimization opportunities
7. **Compression headers** - Performance
8. **Flashing content detection** - Accessibility/seizure risk
9. **Skip link detection** - Accessibility enhancement
10. **Keyboard trap detection** - Accessibility
11. **Broken links count** - Make explicit field
12. **Sitemap presence** - Crawlability

### 🟢 Low Priority (10 data points)

1. CSS/JS/font counts
2. Outbound domains list
3. PDF accessibility
4. Certificate validity
5. Social share counts
6. Backlink count (external API)
7. Estimated traffic (external API)
8. Keyword rankings (external API)

---

## Implementation Notes

### Already Strong

- **Accessibility:** 18/25 collected (72%), excellent WCAG 2.1/2.2 coverage
- **Internationalization:** 4/4 collected (100%)
- **SEO Content:** 13/15 collected (87%)
- **Link Data:** 11/13 collected (85%)

### Needs Improvement

- **Performance:** 9/22 collected (41%) - Missing Core Web Vitals (FID, INP)
- **Mobile Friendliness:** 0/2 explicit (50% if counting overlap with accessibility)
- **Security:** 7/10 collected (70%) - Missing SRI, mixed content

### Quick Wins (Can compute from existing data)

- Title/description length (compute from existing strings)
- Broken links count (filter EdgeRecord by status >= 400)
- Image formats (parse AssetRecord URLs)
- Mixed content (compare HTTPS page with HTTP assets)
- Total page size (sum AssetRecord bytes + HTML size)

---

## Recommendations

1. **Add Performance Fields to PageRecord:**
   - `fid`, `inp`, `speedIndex`, `tti`, `jsExecutionTime`
   - `renderBlockingResources: Array<{url, type}>`
   - `thirdPartyRequestCount`

2. **Add Mobile/Viewport to PageRecord:**
   - `viewportMeta: {content: string, width: string, initialScale: number}`

3. **Add Security Fields:**
   - `mixedContentIssues: Array<{assetUrl, type}>`
   - `subresourceIntegrity: {scripts: number, styles: number, missing: string[]}`

4. **Enhance AssetRecord:**
   - `format: string` (extract from URL or Content-Type)
   - `compression: string` (gzip, brotli, none)

5. **Add Computed Fields (Post-Crawl):**
   - `brokenLinksCount` (from EdgeRecord analysis)
   - `totalPageSizeBytes` (HTML + sum of AssetRecord bytes)
   - `outboundDomains` (distinct external domains from EdgeRecord)

6. **Archive-Level Enrichment (Future):**
   - External API integration for traffic/rankings (optional premium feature)
   - Social share counts (if API keys provided)

---

## Conclusion

**Coverage: 93/130 fully collected (72%), 17/130 partial (13%), 20/130 missing (15%)**

Cartographer already collects the vast majority of industry-standard audit data points. The main gaps are:

1. **Core Web Vitals:** Missing FID and INP (high priority)
2. **Performance Details:** Render-blocking resources, third-party requests
3. **Mobile:** Viewport meta tag extraction
4. **Security:** Mixed content detection, SRI

The existing data model is comprehensive and well-structured. Implementing the high-priority missing data points (8 fields) would bring coverage to **~85%** and match/exceed most commercial audit tools.
