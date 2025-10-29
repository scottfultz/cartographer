# WCAG Accessibility Testing Guide

**How to use Cartographer for WCAG 2.1 AA accessibility auditing**

Copyright © 2025 Cai Frazier.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [WCAG Coverage](#wcag-coverage)
4. [Running Accessibility Audits](#running-accessibility-audits)
5. [Understanding Results](#understanding-results)
6. [WCAG Enhancement Features](#wcag-enhancement-features)
7. [Limitations & Warnings](#limitations--warnings)
8. [Manual Testing Requirements](#manual-testing-requirements)
9. [Common Issues](#common-issues)

---

## Overview

Cartographer provides **automated WCAG 2.1 Level AA accessibility testing** when crawling in `full` mode. It captures:

- ✅ **Automated checks:** Missing alt text, heading hierarchy, language attributes, landmarks, form labels
- ✅ **Enhanced WCAG features:** Multiple navigation methods, sensory characteristics, text-in-images, navigation consistency
- ✅ **Visual analysis:** Screenshots (desktop + mobile) for manual review
- ⚠️ **Limitations:** Cannot test color contrast, keyboard navigation, screen reader compatibility (requires manual testing)

**Best Practice:** Use Cartographer for initial automated scans, then perform manual testing for comprehensive WCAG compliance.

---

## Quick Start

```bash
# 1. Crawl site in full mode (required for accessibility data)
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 20 \
  --concurrency 3 \
  --rps 1 \
  --out wcag-audit.atls

# 2. Export accessibility report to CSV
node packages/cartographer/dist/cli/index.js export \
  --atls wcag-audit.atls \
  --report accessibility \
  --out accessibility.csv

# 3. Open in spreadsheet tool (Excel, Google Sheets) and analyze
```

---

## WCAG Coverage

Cartographer automatically tests these WCAG 2.1 AA success criteria:

### Level A (Fully Automated)

| WCAG SC | Name | What Cartographer Checks |
|---------|------|--------------------------|
| 1.1.1 | Non-text Content | Missing `alt` attributes on `<img>` tags |
| 1.3.1 | Info and Relationships | Heading hierarchy (H1→H2→H3 order), landmark usage |
| 2.4.1 | Bypass Blocks | Skip links, ARIA landmarks (header, nav, main, aside, footer) |
| 3.1.1 | Language of Page | `<html lang="...">` attribute presence |
| 4.1.2 | Name, Role, Value | ARIA labels on buttons/links/icons |

### Level AA (Partially Automated)

| WCAG SC | Name | What Cartographer Checks |
|---------|------|--------------------------|
| 1.3.3 | Sensory Characteristics | Text using shape/color/size/location references |
| 1.4.5 | Images of Text | Images with filenames suggesting text content |
| 2.4.5 | Multiple Ways | Site maps, search functions, breadcrumbs |
| 2.5.2 | Pointer Cancellation | Elements with `mousedown`/`touchstart` handlers |
| 3.2.3 | Consistent Navigation | Navigation link extraction (cross-page analysis pending) |
| 3.2.4 | Consistent Identification | Component identification across pages |

### Not Automated (Requires Manual Testing)

- **1.4.3 Contrast (Minimum)** - Color contrast ratios (requires visual analysis)
- **2.1.1 Keyboard** - Keyboard navigation (requires interaction testing)
- **2.4.7 Focus Visible** - Focus indicators (requires visual inspection)
- **3.2.1 On Focus** - Context changes on focus (runtime check only, needs user testing)
- **4.1.3 Status Messages** - ARIA live regions (requires functional testing)

---

## Running Accessibility Audits

### Basic Audit (20 pages)

```bash
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 20 \
  --out audit.atls
```

**Performance:** ~0.3-1 pages/sec (slow due to screenshots + accessibility extraction)

### Large Site Audit (100+ pages)

```bash
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 100 \
  --concurrency 5 \
  --rps 2 \
  --checkpoint 25 \
  --out large-audit.atls \
  --logFile ./logs/audit.jsonl
```

**Tips:**
- Use `--checkpoint` for resumable audits
- Lower `--concurrency` (3-5) for stability
- Use `--rps 1-2` to avoid overwhelming target site
- Enable `--logFile` for detailed event logging

### Section-Specific Audit

```bash
# Audit only blog section
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com/blog \
  --includePattern "^https://example\\.com/blog" \
  --mode full \
  --maxPages 50 \
  --out blog-audit.atls
```

### Authenticated Pages

```bash
# Audit authenticated area (requires manual login first)
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com/dashboard \
  --persistSession \
  --mode full \
  --maxPages 20 \
  --out authenticated-audit.atls
```

**Note:** Session persistence is experimental. Manual login may be required before crawl.

---

## Understanding Results

### Accessibility CSV Report Structure

The accessibility report contains **47 fields** per page:

#### Basic Information
- `pageUrl` - URL of the page audited
- `crawledAt` - Timestamp of audit
- `statusCode` - HTTP status code

#### Text Alternatives (WCAG 1.1.1)
- `missingAltCount` - Number of images without alt text
- `decorativeImagesCount` - Images with `alt=""` (decorative)
- `imagesTotalCount` - Total images on page

#### Language (WCAG 3.1.1)
- `lang` - Language attribute from `<html lang="...">`
- `langValid` - Whether language code is valid

#### Document Structure (WCAG 1.3.1)
- `headingOrder` - Heading hierarchy (e.g., "H1,H2,H2,H3,H2")
- `h1Count`, `h2Count`, `h3Count`, `h4Count`, `h5Count`, `h6Count` - Heading counts

#### Landmarks (WCAG 2.4.1)
- `landmarksHeader` - Number of `<header>` or `role="banner"`
- `landmarksNav` - Number of `<nav>` or `role="navigation"`
- `landmarksMain` - Number of `<main>` or `role="main"`
- `landmarksAside` - Number of `<aside>` or `role="complementary"`
- `landmarksFooter` - Number of `<footer>` or `role="contentinfo"`

#### Forms (WCAG 3.3.2, 4.1.2)
- `formControlsTotalInputs` - Total form inputs
- `formControlsMissingLabel` - Inputs without labels
- `formControlsTextInputs` - Text inputs
- `formControlsCheckboxes` - Checkboxes
- `formControlsRadios` - Radio buttons
- `formControlsSelects` - Select dropdowns
- `formControlsTextareas` - Textareas

#### WCAG Enhancements (see section below)
- `multipleWays` - JSON object with site map/search/breadcrumb detection
- `sensoryCharacteristics` - JSON array of sensory language references
- `imagesOfText` - JSON array of suspicious images
- `navigationElements` - JSON object with navigation links
- `componentIdentification` - JSON object with buttons/links/icons
- `pointerCancellation` - JSON object with mousedown/touchstart counts
- `onFocusContextChange` - JSON object with onfocus handler counts

### Interpreting Results

#### ❌ Critical Issues (Fix Immediately)

```csv
missingAltCount > 0        → WCAG 1.1.1 violation (missing alt text)
lang = ""                  → WCAG 3.1.1 violation (missing language)
landmarksMain = 0          → WCAG 2.4.1 violation (missing main landmark)
formControlsMissingLabel > 0 → WCAG 3.3.2 violation (unlabeled form fields)
```

#### ⚠️ Warnings (Review)

```csv
h1Count = 0                → Likely heading structure issue
h1Count > 1                → Multiple H1s (bad practice, not violation)
landmarksHeader = 0        → Missing header landmark (bad practice)
landmarksNav = 0           → Missing navigation landmark (may be valid for some pages)
headingOrder = "H1,H3"     → Skipped heading level (WCAG 1.3.1 violation)
```

#### ✅ Good Practices

```csv
missingAltCount = 0        → All images have alt text
lang = "en"                → Language declared
landmarksMain = 1          → Main landmark present
formControlsMissingLabel = 0 → All inputs labeled
```

---

## WCAG Enhancement Features

Cartographer includes **6 new WCAG enhancement features** (validated on real sites):

### 1. Multiple Ways (WCAG 2.4.5)

**Detects:** Site maps, search functions, breadcrumbs

```json
{
  "hasSiteMap": false,
  "hasSearchFunction": true,
  "hasBreadcrumbs": false,
  "searchForms": [
    "form[role='search'] with input[type='search']"
  ]
}
```

**How to Use:**
- ✅ Pages should have **at least 2** navigation methods (e.g., search + site map)
- Check `hasSiteMap` and `hasSearchFunction` - at least one should be `true`
- Review `searchForms` to verify search functionality

### 2. Sensory Characteristics (WCAG 1.3.3)

**Detects:** Instructions using shape/color/size/location (e.g., "Click the red button on the right")

```json
{
  "sensoryReferences": [
    {
      "text": "Click the green button at the bottom of the page",
      "type": "color-location",
      "selector": "p.instructions"
    }
  ]
}
```

**How to Use:**
- ❌ If `sensoryReferences.length > 0`, review each instance
- Ensure instructions don't rely **solely** on visual characteristics
- Add text labels or ARIA descriptions

### 3. Images of Text (WCAG 1.4.5)

**Detects:** Images likely containing text (via filename patterns)

```json
{
  "suspiciousImages": [
    {
      "src": "logo.png",
      "reason": "filename-suggests-text",
      "alt": "Company Logo"
    },
    {
      "src": "heading-banner.jpg",
      "reason": "filename-suggests-text",
      "alt": ""
    }
  ]
}
```

**How to Use:**
- ⚠️ Review `suspiciousImages` - NOT all are violations
- **Exceptions allowed:** Logos, brand names, decorative text
- ❌ **Violations:** Body text, headings, captions rendered as images
- Replace with real text + CSS styling when possible

### 4. Navigation Elements (WCAG 3.2.3)

**Extracts:** All navigation links for cross-page consistency analysis

```json
{
  "mainNav": [
    {"text": "Home", "href": "https://example.com/", "position": 0},
    {"text": "About", "href": "https://example.com/about", "position": 1},
    {"text": "Contact", "href": "https://example.com/contact", "position": 2}
  ],
  "headerNav": [...],
  "footerNav": [...]
}
```

**How to Use:**
- ✅ Navigation should be **consistent across pages**
- Export `navigationElements` from multiple pages
- Compare link text, order, and presence across pages
- **Future:** Cross-page analyzer will automate this (Task 20)

### 5. Component Identification (WCAG 4.1.2)

**Identifies:** Interactive components with labels

```json
{
  "buttons": [
    {"text": "Submit", "ariaLabel": null, "type": "submit", "selector": "button#submit"},
    {"text": "", "ariaLabel": "Close", "type": "button", "selector": "button.close-btn"}
  ],
  "links": [
    {"text": "Home", "href": "https://example.com/", "ariaLabel": null}
  ],
  "icons": [
    {"class": "fa-home", "ariaLabel": "Home", "role": "img"}
  ]
}
```

**How to Use:**
- ✅ All buttons should have text OR `ariaLabel`
- ❌ Empty buttons without ARIA labels are violations
- ✅ Icons with `ariaLabel` or `role="img"` are accessible

### 6. Pointer Cancellation (WCAG 2.5.2)

**Runtime check:** Detects `mousedown` and `touchstart` handlers

```json
{
  "elementsWithMousedown": 2,
  "elementsWithTouchstart": 0
}
```

**How to Use:**
- ⚠️ If counts > 0, review each element
- Ensure actions can be **cancelled** before completion
- Prefer `click` handlers over `mousedown`/`touchstart`

### 7. On Focus Context Change

**Runtime check:** Detects focus handlers that may cause unexpected navigation

```json
{
  "elementsWithOnfocus": 1,
  "suspiciousElements": [
    {"selector": "select#auto-submit", "handler": "onfocus"}
  ]
}
```

**How to Use:**
- ⚠️ If `suspiciousElements.length > 0`, test manually
- Focus should NOT trigger navigation or form submission
- Use `onclick` or explicit submit buttons instead

---

## Limitations & Warnings

### What Cartographer CANNOT Test

❌ **Color Contrast (WCAG 1.4.3, 1.4.11)**
- Requires pixel-level color analysis
- **Manual testing required:** Use browser DevTools or Axe extension

❌ **Keyboard Navigation (WCAG 2.1.1, 2.1.2, 2.4.7)**
- Requires interaction testing (Tab, Enter, Esc keys)
- **Manual testing required:** Navigate site using keyboard only

❌ **Screen Reader Compatibility (WCAG 4.1.2)**
- Requires assistive technology testing
- **Manual testing required:** Use NVDA, JAWS, or VoiceOver

❌ **Video/Audio Accessibility (WCAG 1.2.x)**
- Captions, audio descriptions, transcripts
- **Manual testing required:** Review media content manually

❌ **Motion/Animation (WCAG 2.3.1, 2.2.2)**
- Seizure risks, motion preferences
- **Manual testing required:** Check animations and transitions

### False Positives

Cartographer may flag these as issues incorrectly:

**1. Decorative Images**
- Cartographer counts `alt=""` as decorative
- ✅ Decorative images SHOULD have `alt=""` (correct)
- ❌ If image is informational but has `alt=""`, this is a miss

**2. Images of Text**
- Logos and brand names are **exceptions** to WCAG 1.4.5
- Review `imagesOfText` manually - NOT all are violations

**3. Multiple H1 Tags**
- Modern HTML5 allows multiple H1s in sections
- NOT a WCAG violation, but still bad practice for SEO

**4. Missing Landmarks**
- Some page types don't need all landmarks (e.g., error pages)
- Use judgment based on page purpose

### Known Issues

⚠️ **Schema Validation Warnings**
- All crawls show "data must NOT have additional properties" warnings
- This is a known schema strictness issue (viewportMeta union types)
- Archives are still created successfully - safe to ignore

⚠️ **Challenge Detection**
- Cloudflare/bot protection may slow crawls
- Cartographer waits 15 seconds for challenges to resolve
- This is expected behavior, not a bug

---

## Manual Testing Requirements

After automated testing with Cartographer, perform these manual checks:

### 1. Keyboard Navigation (2 hours per site)

```
✓ Tab through all interactive elements
✓ Verify focus indicators visible
✓ Test keyboard shortcuts (if any)
✓ Verify no keyboard traps
✓ Test with Enter, Space, Esc keys
```

### 2. Screen Reader Testing (3-4 hours per site)

```
✓ Test with NVDA (Windows) or VoiceOver (Mac)
✓ Verify all content announced correctly
✓ Test form labels and error messages
✓ Verify ARIA labels on buttons/links
✓ Test dynamic content updates
```

### 3. Color Contrast Analysis (1 hour per site)

```
✓ Use browser DevTools color picker
✓ Test text on backgrounds (4.5:1 for normal, 3:1 for large)
✓ Test UI components and icons (3:1 minimum)
✓ Check focus indicators (3:1 against background)
```

### 4. Zoom Testing (30 minutes per site)

```
✓ Zoom to 200% (WCAG 1.4.4)
✓ Verify content reflows (no horizontal scrolling)
✓ Test at 400% zoom (WCAG 1.4.10)
✓ Verify responsive breakpoints work
```

### 5. Media Testing (varies by content)

```
✓ Verify captions on videos
✓ Check audio descriptions (if applicable)
✓ Test transcripts for audio content
✓ Verify media controls accessible
```

---

## Common Issues

### Issue 1: No Accessibility Data in Export

**Symptom:**
```bash
node packages/cartographer/dist/cli/index.js export \
  --atls crawl.atls \
  --report accessibility \
  --out accessibility.csv

# Error: Invalid values: Choices: pages, edges, assets, errors
```

**Cause:** Archive not crawled in `full` mode

**Solution:**
```bash
# Re-crawl with --mode full
node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com \
  --mode full \
  --out audit.atls

# Then export
node packages/cartographer/dist/cli/index.js export \
  --atls audit.atls \
  --report accessibility \
  --out accessibility.csv
```

### Issue 2: Empty Accessibility Report

**Symptom:** CSV has headers but no data rows

**Causes:**
1. Crawl failed to capture any pages (check errors dataset)
2. Pages had render failures (check `statusCode` in pages.csv)
3. JavaScript errors prevented accessibility extraction

**Solution:**
```bash
# Check errors
node packages/cartographer/dist/cli/index.js export \
  --atls audit.atls \
  --report errors \
  --out errors.csv

# Review logs
cat logs/audit.jsonl | grep -i error
```

### Issue 3: High Missing Alt Count

**Symptom:** `missingAltCount` very high (e.g., 50+)

**Possible Causes:**
1. Site genuinely has accessibility issues (legitimate finding)
2. Decorative images without `alt=""` (false positive)
3. Lazy-loaded images not detected (limitation)

**Solution:**
```bash
# Export pages report to get full context
node packages/cartographer/dist/cli/index.js export \
  --atls audit.atls \
  --report pages \
  --out pages.csv

# Review screenshots (in archive) to verify
# Use Atlas SDK to extract screenshots
```

### Issue 4: Heading Order Violations

**Symptom:** `headingOrder` shows skipped levels (e.g., "H1,H3,H4")

**This is a WCAG 1.3.1 violation**

**Solution:**
- Review page manually
- Ensure heading hierarchy is sequential (H1 → H2 → H3, no skipping)
- Use semantic HTML (`<h1>`, `<h2>`, etc.) not styled divs

---

## Best Practices

### 1. Test Early and Often

```bash
# Test during development (5 pages, fast)
node packages/cartographer/dist/cli/index.js crawl \
  --seeds http://localhost:3000 \
  --mode full \
  --maxPages 5 \
  --out dev-test.atls

# Quick accessibility check
node packages/cartographer/dist/cli/index.js export \
  --atls dev-test.atls \
  --report accessibility \
  --out dev-accessibility.csv
```

### 2. Test Representative Pages

```bash
# Test one page of each template type:
# - Homepage
# - Article/blog post
# - Product/service page
# - Contact form
# - About page

node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://example.com,https://example.com/blog/post-1,https://example.com/products/item-1,https://example.com/contact,https://example.com/about \
  --mode full \
  --out representative-test.atls
```

### 3. Integrate into CI/CD

```bash
#!/bin/bash
# .github/workflows/accessibility-test.yml

node packages/cartographer/dist/cli/index.js crawl \
  --seeds https://staging.example.com \
  --mode full \
  --maxPages 10 \
  --errorBudget 0 \
  --out ci-accessibility.atls \
  --quiet \
  --json > test-result.json

# Parse results
MISSING_ALT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('accessibility.csv')).filter(p => p.missingAltCount > 0).length)")

if [ $MISSING_ALT -gt 0 ]; then
  echo "❌ Accessibility issues found: $MISSING_ALT pages with missing alt text"
  exit 1
fi

echo "✅ Accessibility tests passed"
```

### 4. Document Findings

Create an accessibility report:

```markdown
# Accessibility Audit Report

**Site:** https://example.com
**Date:** 2025-10-27
**Tool:** Cartographer v1.0.0-beta.1
**Standard:** WCAG 2.1 Level AA

## Summary
- Pages audited: 20
- Critical issues: 5
- Warnings: 12
- Passed: 3

## Critical Issues
1. **Missing Alt Text (WCAG 1.1.1)** - 5 pages, 23 images total
2. **Missing Language Attribute (WCAG 3.1.1)** - 2 pages
3. **Unlabeled Form Fields (WCAG 3.3.2)** - 1 page, 3 inputs

## Recommendations
[...]
```

---

## Additional Resources

- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM Checklist:** https://webaim.org/standards/wcag/checklist
- **Atlas SDK Guide:** `packages/atlas-sdk/QUICK_REFERENCE.md`
- **Command-Line Guide:** `docs/COMMAND_LINE_GUIDE.md`
- **Feature Status Matrix:** `FEATURE_STATUS_MATRIX.md`

---

**Copyright © 2025 Cai Frazier. All rights reserved.**
