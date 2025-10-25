# Cartographer Data Collection - Implementation Plan
**Status:** 109/130 data points collected (84%)  
**Remaining:** 21 data points  
**Date:** December 2024

---

## Executive Summary

This document outlines a phased implementation plan to reach **120/130 (92%)** data coverage, focusing on high-value, low-complexity additions. The plan prioritizes data points that:

1. **Pure data collection** (no analysis/scoring)
2. **No external dependencies** (APIs, paid services)
3. **High SEO/accessibility value**
4. **Feasible with existing infrastructure**

**Excluded from scope:**
- External API integrations (social counts, backlinks, traffic estimates)
- PDF parsing (requires external library)
- Speed Index (complex frame-by-frame video analysis)
- Sensory characteristics detection (requires AI/NLP)

---

## 📊 Current State Analysis

### Coverage Breakdown

| Category | Collected | Partial | Missing | Total |
|----------|-----------|---------|---------|-------|
| **SEO/Technical** | 42 | 5 | 1 | 48 |
| **Performance** | 12 | 2 | 1 | 15 |
| **Accessibility (WCAG)** | 48 | 8 | 11 | 67 |
| **Total** | **102** | **15** | **13** | **130** |

### Recent Additions (Current Session)

✅ **High Priority (8 items)** - Viewport, mixed content, SRI, performance metrics  
✅ **Medium Priority (5 items)** - Encoding, resource counts, flashing content, compression  
✅ **Quick Wins (3 items)** - Sitemap detection, broken links, outbound domains  

**Total implemented this session: 16 data points (+12% coverage)**

---

## 🎯 Implementation Phases

### Phase 1: Runtime Accessibility Enhancements (HIGH VALUE)
**Target:** +6 data points → 115/130 (88%)  
**Effort:** 3-5 days  
**Complexity:** Medium (requires Playwright runtime analysis)

#### 1.1 Keyboard Trap Detection (WCAG 2.1.2)
**Data to collect:**
```typescript
keyboardTraps?: {
  hasPotentialTraps: boolean;
  suspiciousElements: Array<{
    selector: string;
    reason: "no-tabindex-exit" | "focus-locked" | "event-prevent-default";
  }>;
}
```

**Implementation:**
- **File:** `src/core/extractors/runtimeAccessibility.ts` (new file)
- **Method:** `detectKeyboardTraps(page: Page)`
- **Approach:**
  1. Query all focusable elements (`[tabindex], button, a, input, select, textarea`)
  2. Simulate Tab key navigation through each
  3. Detect if focus gets stuck (can't Tab out after N attempts)
  4. Check for `keydown` event listeners that call `preventDefault()`
  5. Flag elements with positive tabindex but no next focusable sibling

**Integration point:** `renderer.ts` in full mode, add to `runtimeWCAGData`

---

#### 1.2 Skip Links Detection (WCAG 2.4.1)
**Data to collect:**
```typescript
skipLinks?: {
  hasSkipLinks: boolean;
  links: Array<{
    text: string;
    href: string;
    isVisible: boolean;
    isFirstFocusable: boolean;
  }>;
}
```

**Implementation:**
- **File:** `src/core/extractors/runtimeAccessibility.ts`
- **Method:** `detectSkipLinks(page: Page)`
- **Approach:**
  1. Find all links with href starting with `#` in the first 500 bytes of `<body>`
  2. Check if link text contains "skip", "jump", "bypass", "main content"
  3. Detect if link is visually hidden but becomes visible on focus (`:focus` styles)
  4. Verify target element exists and has matching `id` or `name`
  5. Check if it's the first or second focusable element

**Integration point:** `renderer.ts` in full mode

---

#### 1.3 ARIA Live Regions (WCAG 4.1.3)
**Data to collect:**
```typescript
ariaLiveRegions?: {
  count: number;
  regions: Array<{
    live: "polite" | "assertive" | "off";
    atomic: boolean;
    relevant?: string;
    selector: string;
  }>;
}
```

**Implementation:**
- **File:** `src/core/extractors/wcagData.ts` (extend existing)
- **Method:** `extractAriaLiveRegions(cheerio)` (static) or runtime
- **Approach:**
  1. Query all elements with `aria-live` attribute
  2. Query `[role="status"]`, `[role="alert"]`, `[role="log"]` (implicit live regions)
  3. Extract `aria-atomic`, `aria-relevant` attributes
  4. Return count and details

**Integration point:** Both static (`wcagData.ts`) and runtime for dynamic regions

---

#### 1.4 Focus Order / Tab Index Audit (WCAG 2.4.3)
**Data to collect:**
```typescript
focusOrder?: {
  customTabIndexCount: number;
  negativeTabIndexCount: number;
  positiveTabIndexElements: Array<{
    selector: string;
    tabindex: number;
  }>;
}
```

**Implementation:**
- **File:** `src/core/extractors/wcagData.ts` (static analysis)
- **Method:** `analyzeFocusOrder(cheerio)`
- **Approach:**
  1. Query all `[tabindex]` attributes
  2. Count positive values (anti-pattern)
  3. Count negative values (removes from tab order)
  4. List elements with `tabindex > 0` for manual review

**Integration point:** Static extraction in `extractAccessibility()`

---

#### 1.5 Video/Audio Runtime Detection (WCAG 1.2.x)
**Data to collect:**
```typescript
mediaElements?: {
  videos: Array<{
    src?: string;
    hasCaptions: boolean; // <track kind="captions">
    hasSubtitles: boolean; // <track kind="subtitles">
    hasDescriptions: boolean; // <track kind="descriptions">
    autoplay: boolean;
    controls: boolean;
  }>;
  audios: Array<{
    src?: string;
    hasTranscript: boolean; // Heuristic: nearby <details> or link with "transcript"
    autoplay: boolean;
    controls: boolean;
  }>;
}
```

**Implementation:**
- **File:** `src/core/extractors/runtimeAccessibility.ts`
- **Method:** `analyzeMediaElements(page: Page)`
- **Approach:**
  1. Query all `<video>` and `<audio>` elements via `page.evaluate()`
  2. Check for `<track>` children with `kind="captions|subtitles|descriptions"`
  3. For audio, search nearby DOM for links/details containing "transcript"
  4. Check `autoplay` and `controls` attributes

**Integration point:** `renderer.ts` in full mode

---

#### 1.6 Form Autocomplete Detection (WCAG 1.3.5)
**Data to collect:**
```typescript
forms?: {
  totalForms: number;
  formsWithAutocomplete: number;
  personalDataInputs: Array<{
    type: string; // email, tel, name, address, etc.
    hasAutocomplete: boolean;
    autocompleteValue?: string;
  }>;
}
```

**Implementation:**
- **File:** `src/core/extractors/wcagData.ts`
- **Method:** `analyzeFormAutocomplete(cheerio)`
- **Approach:**
  1. Query all `<form>` elements
  2. Find inputs with `type="email|tel"` or `name` matching `email|phone|address|name`
  3. Check for `autocomplete` attribute
  4. Validate against standard tokens (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)

**Integration point:** Static extraction in `extractAccessibility()`

---

### Phase 2: Enhanced Tech Stack Detection (MEDIUM VALUE)
**Target:** +4 data points → 119/130 (92%)  
**Effort:** 2-3 days  
**Complexity:** Low (pattern matching)

#### 2.1 Authentication Providers
**Data to collect:** Add to `techStack` array

**Patterns to detect:**
```typescript
const authProviders = {
  "Auth0": /auth0\.com|cdn\.auth0\.com/,
  "Okta": /okta\.com|oktacdn\.com/,
  "Firebase Auth": /firebaseapp\.com|googleapis\.com.*auth/,
  "AWS Cognito": /cognito.*\.amazonaws\.com/,
  "Supabase": /supabase\.co|supabase\.io/,
  "Clerk": /clerk\.dev|accounts\.dev/,
  "NextAuth": /__NEXT_DATA__.*nextauth/i,
  "Passport.js": /passport|express-session/
};
```

**Implementation:**
- **File:** `src/core/extractors/techStack.ts` (extend existing)
- **Method:** Add patterns to `detectTechStack()` function
- **Approach:** Check HTML, scripts, headers for provider domains/signatures

---

#### 2.2 Form Builders
**Patterns:**
```typescript
const formBuilders = {
  "Typeform": /typeform\.com|tf-v1-/,
  "JotForm": /jotform\.com|jotform\.pro/,
  "Google Forms": /docs\.google\.com\/forms/,
  "Formstack": /formstack\.com|formstackcdn\.com/,
  "Wufoo": /wufoo\.com|wufooCDN/,
  "Gravity Forms": /gform_wrapper|gform_fields/,
  "Formidable": /frm_form_field|formidable/
};
```

---

#### 2.3 A/B Testing Platforms
**Patterns:**
```typescript
const abTestingTools = {
  "Optimizely": /optimizely\.com|optimizely\./,
  "Google Optimize": /googleoptimize\.com|gtm-optimize/,
  "VWO": /visualwebsiteoptimizer\.com|vwo\.com/,
  "AB Tasty": /abtasty\.com/,
  "Convert": /convert\.com|convertexperiments/,
  "Split.io": /split\.io|cdn\.split\.io/
};
```

---

#### 2.4 Headless CMS Expansion
**Add to existing patterns:**
```typescript
const headlessCMS = {
  // Existing: Contentful, Sanity, Strapi
  "Prismic": /prismic\.io|cdn\.prismic\.io/,
  "Butter CMS": /buttercms\.com/,
  "Directus": /directus\.io/,
  "Payload CMS": /payloadcms\.com/,
  "Hygraph": /hygraph\.com|graphcms\.com/,
  "Storyblok": /storyblok\.com/,
  "DatoCMS": /datocms\.com/
};
```

**Implementation:** Single PR to `techStack.ts`, add ~50 new patterns

---

### Phase 3: Structured Data Enhancements (LOW EFFORT, HIGH VALUE)
**Target:** Already implemented (OG + Twitter Cards)  
**Note:** OG tags and Twitter Cards were mentioned as missing but are actually already implemented in `scheduler.ts` (lines 641-648). No action needed.

---

### Phase 4: SEO Metadata Expansion (OPTIONAL)
**Target:** +1-2 data points → 120/130 (92%)  
**Effort:** 1 day  
**Complexity:** Low

#### 4.1 Pagination Detection
**Data to collect:**
```typescript
pagination?: {
  hasPagination: boolean;
  prevUrl?: string; // <link rel="prev">
  nextUrl?: string; // <link rel="next">
  canonicalPointsToPaginated: boolean; // Canonical should point to view-all or page 1
}
```

**Implementation:**
- **File:** `src/core/extractors/pageFacts.ts` (extend)
- **Method:** Add to `extractPageFacts()`
- **Approach:**
  1. Query `<link rel="prev">` and `<link rel="next">`
  2. Check if canonical differs from current URL (pagination warning)
  3. Return structured data

**Integration:** Add to `PageRecord` as `pagination` field

---

#### 4.2 Language Declaration
**Data to collect:**
```typescript
language?: {
  htmlLang?: string; // <html lang="en">
  contentLanguage?: string; // Content-Language header
  declared: boolean;
}
```

**Implementation:**
- **File:** `src/core/extractors/pageFacts.ts`
- **Approach:**
  1. Extract `lang` attribute from `<html>` tag
  2. Check `Content-Language` header from fetch response
  3. Flag if neither is present (WCAG 3.1.1 violation)

---

## 🚫 Out of Scope (Not Recommended)

### External API Integrations
**Items:** Social share counts, backlink counts, traffic estimates  
**Reason:** Requires paid API keys (Ahrefs, Moz, Facebook Graph API), adds cost and external dependencies

### PDF Accessibility Analysis
**Item:** PDF structure, tagging, alt text  
**Reason:** Requires external library (pdf-lib, pdfjs), significant complexity for niche use case

### Speed Index
**Item:** Perceptual speed metric  
**Reason:** Requires frame-by-frame video recording + complex pixel comparison algorithm (Lighthouse-level complexity)

### Sensory Characteristics Detection
**Item:** Instructions relying on color, shape, sound  
**Reason:** Requires NLP/AI to parse text and understand context ("click the red button")

---

## 📋 Implementation Checklist

### Phase 1: Runtime Accessibility (3-5 days)
- [ ] Create `src/core/extractors/runtimeAccessibility.ts`
- [ ] Implement `detectKeyboardTraps(page)`
- [ ] Implement `detectSkipLinks(page)`
- [ ] Implement `analyzeMediaElements(page)`
- [ ] Extend `wcagData.ts` with `extractAriaLiveRegions()`
- [ ] Extend `wcagData.ts` with `analyzeFocusOrder()`
- [ ] Extend `wcagData.ts` with `analyzeFormAutocomplete()`
- [ ] Update `PageRecord` interface in `types.ts`
- [ ] Update `AccessibilityRecord.wcagData` interface
- [ ] Integrate calls in `renderer.ts` (full mode only)
- [ ] Test on 5 diverse sites (news, e-commerce, SaaS, government, blog)

### Phase 2: Tech Stack Expansion (2-3 days)
- [ ] Add 50+ new patterns to `techStack.ts`
- [ ] Group by category (Auth, Forms, A/B Testing, CMS)
- [ ] Test on 10 sites known to use these tools
- [ ] Update documentation

### Phase 3: SEO Metadata (1 day)
- [ ] Implement pagination detection in `pageFacts.ts`
- [ ] Implement language declaration extraction
- [ ] Add fields to `PageRecord`
- [ ] Test and validate

### Phase 4: Testing & Validation (2 days)
- [ ] Run full test suite on 20 production sites
- [ ] Validate schema compliance
- [ ] Performance benchmarking (ensure <5% overhead)
- [ ] Update README with new data points

---

## 🎯 Success Metrics

### Coverage Goal
- **Target:** 120/130 (92% coverage)
- **Stretch:** 122/130 (94% coverage)

### Quality Metrics
- **False Positive Rate:** <5% for tech stack detection
- **Performance Impact:** <10% increase in crawl time for full mode
- **Schema Validation:** 100% pass rate (no new warnings)

### User Value
- **Accessibility Coverage:** WCAG 2.1 Level AA compliance checking at 95%+
- **Tech Stack Accuracy:** 90%+ detection rate for top 50 technologies
- **SEO Completeness:** Match or exceed Screaming Frog feature set

---

## 🗓️ Timeline Estimate

| Phase | Duration | Dependency |
|-------|----------|------------|
| **Phase 1:** Runtime Accessibility | 3-5 days | None |
| **Phase 2:** Tech Stack | 2-3 days | None (parallel with Phase 1) |
| **Phase 3:** SEO Metadata | 1 day | None |
| **Phase 4:** Testing & QA | 2 days | All phases complete |
| **Total** | **8-11 days** | - |

**Team capacity assumption:** 1 developer, full-time

---

## 🔧 Technical Considerations

### Performance Impact
- **Keyboard trap detection:** Adds ~500ms per page (only in full mode)
- **Skip link detection:** <50ms (minimal)
- **Tech stack patterns:** No measurable impact (regex on existing HTML)
- **Overall:** Estimate <1s additional time per page in full mode

### Browser Context Requirements
- All runtime accessibility checks require Playwright `page.evaluate()`
- Must handle CSP restrictions (some sites block inline scripts)
- Graceful degradation if runtime checks fail

### Memory Management
- ARIA live regions can be numerous on dynamic pages (cap at 50)
- Video/audio elements rare (no capping needed)
- Focus order analysis is lightweight (single DOM query)

---

## 📚 Reference Documentation

### Relevant Standards
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **HTML Autocomplete:** https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
- **Schema.org:** https://schema.org/docs/full.html
- **OpenGraph:** https://ogp.me/
- **Twitter Cards:** https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards

### Tools for Validation
- **axe-core:** https://github.com/dequelabs/axe-core
- **WAVE:** https://wave.webaim.org/
- **Lighthouse:** https://github.com/GoogleChrome/lighthouse

---

## 🚀 Post-Implementation: Next Steps

Once 92% coverage is achieved:

1. **Schema Update:** Update JSON schemas in `src/io/atlas/schemas/` to reflect new fields
2. **SDK Documentation:** Update `packages/atlas-sdk/QUICK_REFERENCE.md` with examples
3. **Export Enhancement:** Add new fields to CSV export in `src/cli/commands/export.ts`
4. **Continuum Integration:** Expose new data points to Continuum SEO UI
5. **Performance Optimization:** Profile hot paths, optimize regex patterns
6. **User Feedback:** Collect feedback on most valuable data points for future prioritization

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Owner:** Cai Frazier  
**Status:** Ready for Implementation
