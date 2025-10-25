# Data Collection Gaps Analysis

**Date:** October 24, 2025  
**Analysis of:** Structured Data, Tech Stack, and Accessibility Collection

---

## 📊 Overview

This document identifies **gaps, limitations, and enhancement opportunities** in Cartographer's data collection capabilities across three major areas.

**Status Summary:**
- ✅ **Structured Data:** Strong foundation, some gaps
- ⚠️ **Tech Stack:** Good coverage, missing some modern tools
- ✅ **Accessibility (WCAG):** Very comprehensive, runtime gaps only

---

## 1. Structured Data Extraction

### ✅ What's Collected

- **JSON-LD** - Full extraction with 50KB size limit per item
- **Microdata** - Basic detection via itemtype attributes
- **Schema.org Types** - 20+ relevant types filtered (Product, Article, Recipe, etc.)

### ❌ Gaps & Limitations

#### **1.1 Microdata Property Extraction**
**Status:** 🔴 **MISSING**

**Current:** Only detects `itemtype` attribute, creates stub objects  
**Missing:** Actual property values (itemprop, itemscope)

**Example:**
```html
<div itemscope itemtype="http://schema.org/Product">
  <span itemprop="name">Widget</span>
  <span itemprop="price">$19.99</span>
</div>
```
**Currently captured:**
```json
{
  "type": "microdata",
  "schemaType": "Product",
  "data": {
    "@type": "Product",
    "_source": "microdata"
  }
}
```
**Should capture:**
```json
{
  "type": "microdata",
  "schemaType": "Product",
  "data": {
    "@type": "Product",
    "name": "Widget",
    "price": "$19.99"
  }
}
```

**Impact:** Medium - Microdata is less common than JSON-LD, but when present, we're missing the actual data

**Solution Complexity:** High - Requires proper DOM parsing with cheerio to walk itemscope hierarchies

---

#### **1.2 Microformats (hCard, hCalendar, etc.)**
**Status:** 🔴 **MISSING**

**Current:** Not detected at all  
**Missing:** Microformats 1 & 2 (hCard, hCalendar, h-entry, etc.)

**Example:**
```html
<div class="h-card">
  <span class="p-name">John Doe</span>
  <span class="p-tel">555-1234</span>
</div>
```

**Impact:** Low - Microformats are legacy, rarely used in modern sites  
**Priority:** 🟢 **Low** - Not worth the implementation effort

---

#### **1.3 RDFa (Resource Description Framework in Attributes)**
**Status:** 🔴 **MISSING**

**Current:** Not detected  
**Missing:** RDFa properties (vocab, typeof, property)

**Example:**
```html
<div vocab="http://schema.org/" typeof="Product">
  <span property="name">Widget</span>
  <span property="price">$19.99</span>
</div>
```

**Impact:** Low - RDFa is rare in modern web  
**Priority:** 🟢 **Low** - Historical format, not widely adopted

---

#### **1.4 Open Graph (OG) Tags**
**Status:** 🔴 **MISSING**

**Current:** Not extracted as structured data  
**Missing:** og:title, og:image, og:description, etc.

**Example:**
```html
<meta property="og:title" content="My Page">
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:type" content="article">
```

**Impact:** High - OG tags are ubiquitous (Facebook, LinkedIn, Slack previews)  
**Priority:** 🔴 **HIGH** - Should be collected as structured data

**Solution:** Simple meta tag extraction, group by prefix (og:, twitter:, article:)

---

#### **1.5 Twitter Cards**
**Status:** 🔴 **MISSING**

**Current:** Not extracted  
**Missing:** twitter:card, twitter:title, twitter:image, etc.

**Impact:** High - Twitter cards are common for social sharing  
**Priority:** 🔴 **HIGH** - Should be collected with OG tags

---

#### **1.6 Schema.org Extensions**
**Status:** ⚠️ **LIMITED**

**Current:** Filters to 20 "relevant" types  
**Missing:** Less common but valid Schema.org types (MedicalCondition, GovernmentOrganization, etc.)

**Impact:** Medium - Some domains (health, gov, education) may have important schemas filtered out  
**Priority:** 🟡 **MEDIUM** - Add more domain-specific types

**Solution:** Expand `relevantTypes` set or make filtering configurable

---

#### **1.7 Nested/Graph Structures**
**Status:** ⚠️ **PARTIAL**

**Current:** Stores entire JSON-LD objects (up to 50KB)  
**Limitation:** No relationship mapping between entities

**Example:**
```json
{
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  }
}
```

**Impact:** Low - Data is preserved, just not indexed  
**Priority:** 🟢 **LOW** - Consumer apps can parse relationships

---

#### **1.8 Multiple Schema.org Contexts**
**Status:** ⚠️ **PARTIAL**

**Current:** Handles @context properly  
**Limitation:** Doesn't validate context URLs or handle extensions

**Impact:** Low - Most sites use standard schema.org context  
**Priority:** 🟢 **LOW**

---

### 💡 Recommended Enhancements

1. **Extract Open Graph tags** (High priority, simple implementation)
2. **Extract Twitter Card tags** (High priority, simple implementation)
3. **Full Microdata property extraction** (Medium priority, complex implementation)
4. **Expand relevant Schema.org types** (Medium priority, easy implementation)

---

## 2. Tech Stack Detection

### ✅ What's Collected

- **100+ technologies** across 20+ categories
- JavaScript frameworks (React, Vue, Angular, Next.js, etc.)
- CMS platforms (WordPress, Drupal, Shopify)
- Analytics tools (Google Analytics, Mixpanel, Hotjar)
- Web servers (nginx, Apache, IIS)
- CDNs (Cloudflare, Fastly, Akamai)
- UI frameworks (Bootstrap, Tailwind)
- And more...

### ❌ Gaps & Limitations

#### **2.1 Backend Frameworks (Server-Side)**
**Status:** ⚠️ **LIMITED**

**Current:** Only detects PHP, ASP.NET, Express.js, Django (limited), Rails (limited), Laravel (limited)  
**Missing:**
- Spring Boot (Java)
- .NET Core / .NET 6+
- Flask (Python)
- FastAPI (Python)
- Ruby on Rails (better detection)
- Go frameworks (Gin, Echo, Fiber)
- Rust frameworks (Actix, Rocket)
- Elixir Phoenix

**Detection Challenge:** Backend frameworks leave minimal client-side fingerprints

**Impact:** Medium - Useful for tech stack analysis but hard to detect  
**Priority:** 🟡 **MEDIUM** - Limited detection methods available

**Possible Signals:**
- HTTP headers (X-Powered-By often disabled for security)
- Error pages (framework-specific error formats)
- Default routes (/api/health, /actuator, /__debug__)
- Session cookie names (JSESSIONID, .AspNetCore.Session, etc.)

---

#### **2.2 Modern Build Tools**
**Status:** 🔴 **MISSING**

**Missing:**
- Webpack (bundle analysis)
- Vite
- Rollup
- Parcel
- esbuild
- Turbopack

**Detection:** Look for bundle signatures, source map comments, module patterns

**Impact:** Low - Primarily interesting for developers, not critical  
**Priority:** 🟢 **LOW**

---

#### **2.3 State Management Libraries**
**Status:** 🔴 **MISSING**

**Missing:**
- Redux (React)
- Vuex (Vue)
- MobX
- Zustand
- Recoil
- Pinia (Vue)
- NgRx (Angular)

**Detection:** Global variables, script sources

**Impact:** Low - Developer-focused, not user-facing  
**Priority:** 🟢 **LOW**

---

#### **2.4 Testing Frameworks**
**Status:** 🔴 **MISSING**

**Missing:**
- Jest
- Cypress
- Playwright
- Selenium
- Testing Library

**Detection:** Look for test file artifacts, CI badges

**Impact:** Very Low - Should never be in production  
**Priority:** 🟢 **VERY LOW** - Not relevant for production sites

---

#### **2.5 Headless CMS**
**Status:** ⚠️ **LIMITED**

**Current:** Ghost (detected)  
**Missing:**
- Contentful
- Strapi
- Sanity
- Prismic
- Netlify CMS
- Directus

**Detection:** API endpoints, meta tags, script sources

**Impact:** Medium - Growing trend in modern web development  
**Priority:** 🟡 **MEDIUM**

---

#### **2.6 E-commerce Platforms**
**Status:** ⚠️ **LIMITED**

**Current:** Shopify, Magento, WooCommerce, BigCommerce, PrestaShop  
**Missing:**
- Wix Stores (separate from Wix site builder)
- Square Online
- Ecwid
- 3dcart
- Volusion
- OpenCart

**Impact:** Medium - E-commerce is high-value vertical  
**Priority:** 🟡 **MEDIUM**

---

#### **2.7 Authentication Providers**
**Status:** 🔴 **MISSING**

**Missing:**
- Auth0
- Okta
- Firebase Auth
- AWS Cognito
- Clerk
- Magic Link
- OneLogin

**Detection:** Script sources, login button patterns

**Impact:** Medium - Security/auth is important category  
**Priority:** 🟡 **MEDIUM**

---

#### **2.8 Hosting/PaaS Platforms**
**Status:** ⚠️ **LIMITED**

**Current:** Netlify, Vercel  
**Missing:**
- AWS Amplify
- GitHub Pages
- GitLab Pages
- Render
- Railway
- Fly.io
- Heroku

**Detection:** HTTP headers, DNS patterns, domain names

**Impact:** Low - Interesting but not critical  
**Priority:** 🟢 **LOW**

---

#### **2.9 Observability/Monitoring**
**Status:** ⚠️ **LIMITED**

**Current:** Google Analytics, Hotjar, Mixpanel  
**Missing:**
- Sentry (error tracking)
- LogRocket
- Datadog RUM
- New Relic Browser
- Rollbar
- Bugsnag

**Impact:** Low - Developer tools, not user-facing  
**Priority:** 🟢 **LOW**

---

#### **2.10 A/B Testing & Experimentation**
**Status:** 🔴 **MISSING**

**Missing:**
- Optimizely
- VWO (Visual Website Optimizer)
- Google Optimize
- AB Tasty
- Kameleoon
- Split.io

**Detection:** Script sources, data attributes

**Impact:** Medium - Common in conversion-focused sites  
**Priority:** 🟡 **MEDIUM**

---

#### **2.11 Chat/Support Widgets**
**Status:** ⚠️ **LIMITED**

**Current:** Intercom, Zendesk, Drift  
**Missing:**
- LiveChat
- Crisp
- Tidio
- Tawk.to
- Freshchat
- Help Scout Beacon

**Impact:** Low - Category is covered, just not all vendors  
**Priority:** 🟢 **LOW**

---

#### **2.12 Cryptocurrency/Blockchain**
**Status:** 🔴 **MISSING**

**Missing:**
- MetaMask detection
- WalletConnect
- Web3.js
- Ethers.js
- Coinbase Wallet
- Rainbow Kit

**Detection:** Global variables (ethereum, web3), script sources

**Impact:** Low - Niche category  
**Priority:** 🟢 **LOW** (unless targeting crypto/NFT sites)

---

#### **2.13 Video Streaming**
**Status:** ⚠️ **LIMITED**

**Current:** YouTube Embed, Vimeo, Video.js  
**Missing:**
- Wistia
- Brightcove
- JW Player
- Kaltura
- Vidyard
- Twitch embeds

**Impact:** Low - Core video covered  
**Priority:** 🟢 **LOW**

---

#### **2.14 Form Builders**
**Status:** 🔴 **MISSING**

**Missing:**
- Typeform
- Jotform
- Google Forms
- Wufoo
- Formstack
- Cognito Forms

**Detection:** iframe sources, script tags

**Impact:** Medium - Forms are important for conversion  
**Priority:** 🟡 **MEDIUM**

---

#### **2.15 Schema Markup Generators**
**Status:** 🔴 **MISSING**

**Missing:**
- Rank Math (WordPress plugin)
- All in One SEO (WordPress plugin)
- Schema Pro

**Detection:** Meta tags, script comments

**Impact:** Low - Detected indirectly via structured data presence  
**Priority:** 🟢 **LOW**

---

### 💡 Recommended Enhancements

1. **Add authentication providers** (Auth0, Okta, Firebase Auth)
2. **Expand e-commerce detection** (Square, Ecwid, OpenCart)
3. **Add A/B testing tools** (Optimizely, VWO, Google Optimize)
4. **Add form builders** (Typeform, Jotform, Google Forms)
5. **Add headless CMS** (Contentful, Strapi, Sanity)
6. **Improve backend framework detection** (Spring Boot, Flask, FastAPI)

---

## 3. Accessibility (WCAG) Data Collection

### ✅ What's Collected

**Extremely comprehensive** - 30+ WCAG 2.1/2.2 success criteria covered:
- Image alt text analysis
- Form labels and validation
- ARIA compliance
- Keyboard accessibility
- Color contrast (Playwright mode)
- Page structure (headings, landmarks)
- Link purpose
- Language declarations
- And much more...

### ❌ Gaps & Limitations

#### **3.1 Runtime-Only Criteria**
**Status:** ⚠️ **REQUIRES PLAYWRIGHT**

**Cannot be collected from static HTML:**
- **2.4.11 Focus Not Obscured** - Requires focus simulation
- **2.4.13 Focus Appearance** - Requires computed styles on focus
- **2.5.8 Target Size** - Requires getBoundingClientRect()
- **2.1.2 No Keyboard Trap** - Requires interactive testing
- **2.5.2 Pointer Cancellation** - Requires event simulation
- **3.2.1 On Focus** - Requires focus event testing

**Current Status:** Most of these are marked "Requires runtime analysis" in the schema but not implemented

**Impact:** High - These are important WCAG criteria  
**Priority:** 🔴 **HIGH** - Should implement in Playwright/full mode

**Solution:** Extend `extractAccessibilityWithContrast()` to include:
```typescript
// Focus visibility check
const focusStyles = await page.evaluate(() => {
  const elements = document.querySelectorAll('a, button, input');
  return Array.from(elements).map(el => {
    el.focus();
    const styles = getComputedStyle(el);
    return {
      selector: el.id || el.tagName,
      outline: styles.outline,
      boxShadow: styles.boxShadow
    };
  });
});

// Target size check
const targetSizes = await page.evaluate(() => {
  const interactive = document.querySelectorAll('a, button, input, [role="button"]');
  return Array.from(interactive).map(el => {
    const rect = el.getBoundingClientRect();
    return {
      selector: el.id || el.tagName,
      width: rect.width,
      height: rect.height,
      meetsMinimum: rect.width >= 24 && rect.height >= 24
    };
  });
});
```

---

#### **3.2 Video/Audio Content Analysis**
**Status:** 🔴 **MISSING**

**Missing:**
- **1.2.1 Audio-only and Video-only (Prerecorded)** - Transcript/alternative detection
- **1.2.2 Captions (Prerecorded)** - Caption track detection
- **1.2.3 Audio Description** - Audio description track detection
- **1.2.5 Audio Description (Prerecorded)** - Extended description detection

**Current:** Only detects autoplay presence  
**Should collect:**
```typescript
{
  multimedia: {
    videos: [{
      selector: "#main-video",
      hasCaptions: true,
      captionLanguages: ["en", "es"],
      hasAudioDescription: false,
      hasTranscript: false,
      transcriptLocation?: string
    }],
    audios: [{
      selector: "#podcast-player",
      hasTranscript: true,
      transcriptLocation: "/transcripts/episode1.txt"
    }]
  }
}
```

**Impact:** High - Multimedia accessibility is critical  
**Priority:** 🔴 **HIGH** - Important WCAG Level A criteria

---

#### **3.3 PDF Accessibility**
**Status:** 🔴 **MISSING**

**Missing:**
- PDF links detection
- PDF metadata extraction
- Tagged PDF detection

**Should collect:**
```typescript
{
  pdfs: {
    total: 5,
    pdfsWithoutTitles: 2,
    pdfLinks: [
      { url: "/docs/report.pdf", hasTitle: false, size: "2.3MB" }
    ]
  }
}
```

**Impact:** Medium - PDFs are common, especially in government/enterprise  
**Priority:** 🟡 **MEDIUM** - Requires PDF download and analysis

---

#### **3.4 Form Error Prevention (3.3.4, 3.3.6)**
**Status:** ⚠️ **PARTIAL**

**Current:** Detects error identification mechanisms  
**Missing:**
- Confirmation pages detection
- Reversible submissions
- Data review before submit

**Impact:** Medium - Requires form flow analysis  
**Priority:** 🟡 **MEDIUM** - Hard to detect statically

---

#### **3.5 Sensory Characteristics (1.3.3)**
**Status:** 🔴 **MISSING**

**Missing:** Detection of instructions relying solely on sensory characteristics

**Examples to detect:**
- "Click the round button" (shape)
- "Select the red option" (color)
- "See the box on the right" (location)
- "Listen for the beep" (sound)

**Impact:** Low - Requires NLP/semantic analysis  
**Priority:** 🟢 **LOW** - Very difficult to automate

---

#### **3.6 Consistent Navigation (3.2.3) & Identification (3.2.4)**
**Status:** ⚠️ **SITE-LEVEL ANALYSIS NEEDED**

**Current:** Data collected per-page  
**Missing:** Cross-page comparison logic

**Should collect:**
```typescript
// Per-page data already collected
{ 
  navigation: {
    mainNavStructure: string, // HTML structure hash
    mainNavLocation: "header" | "sidebar" | "footer",
    mainNavItems: ["Home", "About", "Contact"]
  }
}

// Consumer app would then compare across pages to find inconsistencies
```

**Impact:** Medium - Important for Level AA compliance  
**Priority:** 🟡 **MEDIUM** - Consumer apps can implement comparison

**Note:** This is a **site-level criterion**, not page-level. The engine collects the right data; consumer apps need to aggregate and compare.

---

#### **3.7 Animation & Motion (2.3.1, 2.3.2, 2.3.3)**
**Status:** ⚠️ **LIMITED**

**Current:** Detects `<marquee>`, `<blink>`, autoplay  
**Missing:**
- CSS animations analysis
- Three flashes per second detection
- Parallax scrolling detection
- Infinite loops

**Should collect:**
```typescript
{
  animations: {
    cssAnimations: 15,
    infiniteAnimations: 3, // animation-iteration-count: infinite
    transitionDurations: { fast: 8, medium: 12, slow: 3 },
    parallaxElements: 2,
    prefers-reduced-motion: "respect" | "ignore"
  }
}
```

**Impact:** Medium - Motion/animation accessibility is important  
**Priority:** 🟡 **MEDIUM** - Requires CSS parsing

---

### 💡 Recommended Enhancements

1. **Implement runtime accessibility checks** (focus appearance, target size)
2. **Add multimedia accessibility analysis** (captions, audio descriptions, transcripts)
3. **Add animation/motion detection** (CSS animations, infinite loops)
4. **Add PDF accessibility detection** (PDF links, titles, tagged PDFs)

---

## 📈 Priority Matrix

### 🔴 High Priority (Implement First)

1. **Open Graph & Twitter Card extraction** (Structured Data)
   - High impact, simple implementation
   - Ubiquitous in modern web

2. **Runtime accessibility checks** (Accessibility)
   - Focus appearance, target size, focus obscured
   - Core WCAG 2.2 criteria

3. **Multimedia accessibility** (Accessibility)
   - Caption/transcript detection
   - WCAG Level A criteria

### 🟡 Medium Priority (Consider Next)

4. **Full Microdata property extraction** (Structured Data)
   - Medium impact, complex implementation
   - Microdata usage is declining

5. **Expand Schema.org type filtering** (Structured Data)
   - Easy win, domain-specific schemas

6. **Authentication providers** (Tech Stack)
   - Auth0, Okta, Firebase Auth, Clerk

7. **E-commerce platform expansion** (Tech Stack)
   - Square, Ecwid, OpenCart

8. **A/B testing tools** (Tech Stack)
   - Optimizely, VWO, Google Optimize

9. **Form builders** (Tech Stack)
   - Typeform, Jotform, Google Forms

10. **Animation/motion detection** (Accessibility)
    - CSS animations, infinite loops, prefers-reduced-motion

### 🟢 Low Priority (Nice to Have)

11. **Microformats support** (Structured Data)
    - Legacy format, rarely used

12. **RDFa support** (Structured Data)
    - Legacy format, rarely used

13. **Backend framework detection** (Tech Stack)
    - Limited detection methods available

14. **State management libraries** (Tech Stack)
    - Developer-focused, not user-facing

15. **Build tools** (Tech Stack)
    - Developer-focused, not critical

---

## 🎯 Recommended Implementation Order

### Sprint 1: Quick Wins (2-3 days)
1. Open Graph & Twitter Card extraction
2. Expand Schema.org relevant types
3. Add authentication providers to tech stack
4. Add A/B testing tools to tech stack

### Sprint 2: High-Value Features (1 week)
5. Runtime accessibility checks (focus, target size)
6. Multimedia accessibility (captions, transcripts)
7. Add form builders to tech stack
8. Add e-commerce platforms to tech stack

### Sprint 3: Medium-Value Features (1 week)
9. Animation/motion detection
10. Full Microdata property extraction
11. Headless CMS detection
12. PDF accessibility basics

### Sprint 4: Polish (Optional)
13. Backend framework improvements
14. Observability tool detection
15. Video player expansion

---

## 📝 Notes

- **Tech Stack:** Detection is limited by what leaves client-side fingerprints. Backend frameworks, build tools, and dev tools are inherently hard to detect in production.

- **Accessibility:** The runtime-only criteria (focus appearance, target size) require Playwright mode and should be high priority since they're core WCAG 2.2 requirements.

- **Structured Data:** Open Graph/Twitter Cards are the biggest gap - they're ubiquitous and simple to extract.

- **Future-Proofing:** All three systems are designed to be extensible. New tech signatures, schema types, and accessibility checks can be added incrementally without breaking changes.

---

**Maintained by:** Cai Frazier  
**Last Updated:** October 24, 2025
