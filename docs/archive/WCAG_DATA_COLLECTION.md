# WCAG 2.1 & 2.2 Data Collection

**Date:** October 24, 2025  
**Status:** ✅ Complete  
**Modes:** Full mode only (requires `--mode full`)

---

## Overview

Cartographer Engine collects **comprehensive raw data** for WCAG 2.1 and 2.2 auditing. The engine captures all measurable accessibility metrics but **does not perform the actual analysis or interpretation** – that is handled by consumer applications.

All WCAG data is collected in **full crawl mode** and stored in the `accessibility` part of `.atls` archives under the `wcagData` field.

---

## Data Collection by WCAG Principle

### 🔍 Principle 1: Perceivable

#### 1.1.1 Non-text Content
**Collects:**
- Total images count
- Images with alt text
- Images without alt text
- Images with empty alt (decorative)
- Sample sources of images missing alt

**Consumer Use:** Identify pages with missing alt text, generate reports on image accessibility compliance.

#### 1.3.1 Info and Relationships
**Collects:**
- Table structures (total, with headers, with captions, with scope attributes)
- Heading hierarchy (H1-H6 order)
- ARIA landmarks presence
- Form label associations

**Consumer Use:** Detect improper heading levels, missing table headers, unlabeled form fields.

#### 1.3.5 Identify Input Purpose (WCAG 2.1)
**Collects:**
- Inputs with autocomplete attributes
- Autocomplete value distribution (e.g., "email", "tel", "name")

**Consumer Use:** Identify forms that could improve UX with autocomplete hints.

#### 1.4.3 Contrast (Minimum) & 1.4.6 Contrast (Enhanced)
**Collects:**
- Foreground/background color pairs
- Computed contrast ratios
- Elements failing AA/AAA standards
- Font sizes for context

**Consumer Use:** Generate contrast violation reports, prioritize fixes by severity.

#### 1.4.4 Resize Text
**Collects:**
- Viewport meta tag restrictions
- `user-scalable=no` presence
- `maximum-scale` values

**Consumer Use:** Flag pages that prevent text scaling.

#### 1.4.10 Reflow (WCAG 2.1)
**Collects:**
- Viewport meta tag existence
- Media query presence
- Responsive design indicators

**Consumer Use:** Identify non-responsive pages requiring horizontal scroll.

#### 1.4.11 Non-text Contrast (WCAG 2.1)
**Collects:**
- UI component contrast (buttons, inputs, links)
- Interactive element color data

**Consumer Use:** Ensure interactive elements meet 3:1 contrast requirement.

#### 1.4.12 Text Spacing (WCAG 2.1)
**Collects:**
- Inline style usage
- `!important` declarations on spacing properties
- Line-height and letter-spacing overrides

**Consumer Use:** Detect if page breaks when text spacing is increased.

#### 1.4.13 Content on Hover or Focus (WCAG 2.1)
**Collects:**
- Elements with `title` attributes
- Elements with `aria-describedby`
- Tooltip role usage

**Consumer Use:** Identify hover/focus content that may need dismiss/hoverable/persistent behavior.

---

### ⌨️ Principle 2: Operable

#### 2.1.1 Keyboard
**Collects:**
- Focusable elements count
- Positive tabindex usage (anti-pattern)
- Negative tabindex usage (removes from tab order)
- Focus order sequence

**Consumer Use:** Detect keyboard traps, illogical tab order, inaccessible controls.

#### 2.1.4 Character Key Shortcuts (WCAG 2.1)
**Collects:**
- Elements with `accesskey` attributes
- Accesskey values used

**Consumer Use:** Identify potential keyboard shortcut conflicts.

#### 2.2.1 Timing Adjustable
**Collects:**
- Meta refresh presence
- Refresh delay values
- Redirect URLs

**Consumer Use:** Flag automatic redirects/refreshes that may be disruptive.

#### 2.2.2 Pause, Stop, Hide
**Collects:**
- Autoplay videos/audios
- `<marquee>` and `<blink>` elements (legacy)

**Consumer Use:** Identify moving/auto-updating content requiring pause controls.

#### 2.4.1 Bypass Blocks
**Collects:**
- Skip links (e.g., "Skip to main content")
- ARIA landmark presence (main, nav, header, footer)
- Heading count

**Consumer Use:** Ensure pages have bypass mechanisms for keyboard users.

#### 2.4.2 Page Titled
**Collects:**
- Title tag existence
- Title text content
- Empty title detection

**Consumer Use:** Flag pages with missing or empty titles.

#### 2.4.3 Focus Order
**Collects:**
- Tab order sequence
- Tabindex values
- Focusable element selectors

**Consumer Use:** Validate logical tab order matches visual flow.

#### 2.4.4 Link Purpose (In Context)
**Collects:**
- Total links
- Links with/without text
- Links with aria-label or title
- Ambiguous link text ("click here", "read more", etc.)

**Consumer Use:** Identify links with unclear purpose.

#### 2.4.6 Headings and Labels
**Collects:**
- Heading structure (H1-H6)
- Multiple H1 detection
- Skipped heading levels

**Consumer Use:** Validate proper heading hierarchy.

#### 2.4.11 Focus Not Obscured (Minimum) (WCAG 2.2)
**Collects:** *(Requires runtime analysis in Playwright mode)*
- Elements that obscure focused items
- Percentage of focus indicator hidden

**Consumer Use:** Ensure focus indicators remain visible.

#### 2.4.13 Focus Appearance (WCAG 2.2)
**Collects:** *(Requires runtime analysis in Playwright mode)*
- Focus indicator styles
- Focus contrast ratios

**Consumer Use:** Validate focus indicators meet visibility requirements.

#### 2.5.1 Pointer Gestures (WCAG 2.1)
**Collects:**
- Touch event listeners presence
- Multi-point gesture indicators

**Consumer Use:** Identify interactions requiring complex gestures.

#### 2.5.3 Label in Name (WCAG 2.1)
**Collects:**
- Visual label vs. accessible name mismatches
- Button/link text vs. aria-label discrepancies

**Consumer Use:** Ensure accessible names include visible labels.

#### 2.5.4 Motion Actuation (WCAG 2.1)
**Collects:**
- Device orientation listeners
- Device motion listeners

**Consumer Use:** Flag motion-based interactions needing alternatives.

#### 2.5.7 Dragging Movements (WCAG 2.2)
**Collects:**
- Draggable elements
- Drag-and-drop indicators

**Consumer Use:** Ensure draggable interfaces have non-dragging alternatives.

#### 2.5.8 Target Size (Minimum) (WCAG 2.2)
**Collects:** *(Requires runtime measurement)*
- Interactive element dimensions
- 24×24px minimum compliance

**Consumer Use:** Identify touch targets that are too small.

---

### 📖 Principle 3: Understandable

#### 3.1.1 Language of Page
**Collects:**
- `lang` attribute presence on `<html>`
- Language code value
- Language code validity

**Consumer Use:** Flag pages missing language declarations.

#### 3.1.2 Language of Parts
**Collects:**
- Elements with `lang` attributes (language changes)
- Language codes used

**Consumer Use:** Validate proper language markup for multilingual content.

#### 3.2.2 On Input
**Collects:**
- Forms with `onchange` handlers
- Inputs with `onchange` handlers

**Consumer Use:** Identify potential unexpected context changes on input.

#### 3.2.6 Consistent Help (WCAG 2.2)
**Collects:** *(Requires cross-page analysis)*
- Help mechanism locations (contact, chat, phone)

**Consumer Use:** Ensure help mechanisms appear in consistent locations.

#### 3.3.1 Error Identification
**Collects:**
- `aria-invalid` usage
- `aria-errormessage` usage
- Required field indicators

**Consumer Use:** Validate error identification mechanisms exist.

#### 3.3.2 Labels or Instructions
**Collects:**
- Total form inputs
- Inputs with labels
- Inputs without labels
- Input type distribution

**Consumer Use:** Identify unlabeled form fields.

#### 3.3.7 Redundant Entry (WCAG 2.2)
**Collects:**
- Duplicate `name` attributes
- Duplicate label texts
- Repeated input patterns

**Consumer Use:** Detect forms requiring users to re-enter information.

#### 3.3.8 Accessible Authentication (WCAG 2.2)
**Collects:**
- Password input presence
- CAPTCHA presence
- Autocomplete on password fields

**Consumer Use:** Identify cognitive function tests requiring alternatives.

---

### 🔧 Principle 4: Robust

#### 4.1.1 Parsing
**Collects:**
- Duplicate ID attributes
- Malformed HTML indicators

**Consumer Use:** Flag HTML parsing errors that may confuse assistive technologies.

#### 4.1.2 Name, Role, Value
**Collects:**
- Total ARIA elements
- `aria-labelledby` reference errors
- `aria-describedby` reference errors
- Missing required ARIA attributes (e.g., `aria-checked` on role="checkbox")
- Invalid ARIA references

**Consumer Use:** Validate ARIA implementation correctness.

#### 4.1.3 Status Messages (WCAG 2.1)
**Collects:**
- `aria-live` usage
- `role="status"` usage
- `role="alert"` usage

**Consumer Use:** Ensure status messages are announced to screen readers.

---

## Data Structure

### Archive Location
```
archive.atls
└── accessibility/
    └── part-001.jsonl.zst  (Zstandard compressed)
```

### JSON Structure
```json
{
  "pageUrl": "https://example.com",
  "missingAltCount": 3,
  "headingOrder": ["H1", "H2", "H2", "H3"],
  "lang": "en",
  "wcagData": {
    "images": {
      "total": 15,
      "withAlt": 12,
      "withoutAlt": 3,
      "withEmptyAlt": 0,
      "missingAltSources": ["logo.png", "hero.jpg", "icon.svg"]
    },
    "formLabels": {
      "totalInputs": 8,
      "inputsWithLabels": 6,
      "inputsWithoutLabels": 2,
      "inputsMissingLabel": ["#email-input", "input[type=text]:nth-of-type(3)"],
      "inputTypes": {
        "text": 4,
        "email": 2,
        "password": 1,
        "submit": 1
      }
    },
    "ariaCompliance": {
      "totalAriaElements": 12,
      "ariaLabelledbyIssues": 1,
      "invalidAriaReferences": [
        {
          "selector": "#submit-btn",
          "attribute": "aria-labelledby",
          "missingId": "submit-label"
        }
      ],
      "missingRequiredAriaAttributes": []
    },
    "pageTitle": {
      "exists": true,
      "title": "Contact Us - Example Corp",
      "isEmpty": false
    },
    "links": {
      "total": 45,
      "withoutText": 2,
      "ambiguousText": ["click here → /about", "read more → /blog/post-1"]
    },
    "headingsAndLabels": {
      "headings": ["H1", "H2", "H2", "H3", "H3"],
      "multipleH1": false,
      "skippedLevels": true
    }
  }
}
```

---

## Consumer Application Usage

### Example: Generate WCAG Report

```typescript
import { openAtlas } from '@caifrazier/atlas-sdk';

const atlas = await openAtlas('site-crawl.atls');

// Iterate accessibility records
for await (const record of atlas.accessibility()) {
  const wcag = record.wcagData;
  if (!wcag) continue; // Not full mode
  
  // Check WCAG 1.1.1 (Non-text Content)
  if (wcag.images.withoutAlt > 0) {
    console.log(`${record.pageUrl}: ${wcag.images.withoutAlt} images missing alt text`);
    console.log(`  Sources:`, wcag.images.missingAltSources);
  }
  
  // Check WCAG 3.3.2 (Labels or Instructions)
  if (wcag.formLabels.inputsWithoutLabels > 0) {
    console.log(`${record.pageUrl}: ${wcag.formLabels.inputsWithoutLabels} unlabeled inputs`);
    console.log(`  Selectors:`, wcag.formLabels.inputsMissingLabel);
  }
  
  // Check WCAG 2.4.6 (Headings and Labels)
  if (wcag.headingsAndLabels.multipleH1) {
    console.log(`${record.pageUrl}: Multiple H1 tags detected (ambiguous document structure)`);
  }
  if (wcag.headingsAndLabels.skippedLevels) {
    console.log(`${record.pageUrl}: Heading levels skipped (e.g., H1 → H3)`);
  }
  
  // Check WCAG 4.1.2 (Name, Role, Value)
  if (wcag.ariaCompliance.invalidAriaReferences.length > 0) {
    console.log(`${record.pageUrl}: ${wcag.ariaCompliance.invalidAriaReferences.length} invalid ARIA references`);
    for (const ref of wcag.ariaCompliance.invalidAriaReferences) {
      console.log(`  ${ref.selector}: ${ref.attribute} references missing ID "${ref.missingId}"`);
    }
  }
}
```

### Example: Site-Wide Statistics

```typescript
const atlas = await openAtlas('site-crawl.atls');

let totalPages = 0;
let pagesWithAltIssues = 0;
let pagesWithFormIssues = 0;
let pagesWithAriaIssues = 0;

for await (const record of atlas.accessibility()) {
  const wcag = record.wcagData;
  if (!wcag) continue;
  
  totalPages++;
  if (wcag.images.withoutAlt > 0) pagesWithAltIssues++;
  if (wcag.formLabels.inputsWithoutLabels > 0) pagesWithFormIssues++;
  if (wcag.ariaCompliance.invalidAriaReferences.length > 0) pagesWithAriaIssues++;
}

console.log(`WCAG Compliance Summary:`);
console.log(`  Total pages: ${totalPages}`);
console.log(`  Pages with alt text issues: ${pagesWithAltIssues} (${(pagesWithAltIssues/totalPages*100).toFixed(1)}%)`);
console.log(`  Pages with form label issues: ${pagesWithFormIssues} (${(pagesWithFormIssues/totalPages*100).toFixed(1)}%)`);
console.log(`  Pages with ARIA issues: ${pagesWithAriaIssues} (${(pagesWithAriaIssues/totalPages*100).toFixed(1)}%)`);
```

---

## Limitations & Notes

### What is NOT Collected

The following WCAG criteria require **runtime interaction** or **human judgment** and cannot be automatically collected:

- **2.1.2 No Keyboard Trap** - Requires interactive testing
- **2.5.2 Pointer Cancellation** - Requires interaction testing
- **3.2.1 On Focus** - Requires focus event analysis
- **3.3.3 Error Suggestion** - Requires understanding error context
- **3.2.3/3.2.4/3.2.6 Consistency** - Requires cross-page comparison (consumer apps can do this with collected data)

### Runtime Analysis Fields

Some fields are marked "Requires runtime analysis" – these are **only available in Playwright/full mode** and involve:
- Computed contrast ratios (requires rendering)
- Target size measurements (requires layout calculation)
- Focus obscured detection (requires focus simulation)

### Data Limits

To prevent archive bloat, the following limits apply:
- Maximum 100 missing alt sources per page
- Maximum 50 table details per page
- Maximum 100 missing label selectors per page
- Maximum 50 invalid ARIA references per page
- Maximum 50 duplicate IDs per page

---

## Testing

**Test Site:** W3C's "Before and After Demonstration" (intentionally poor accessibility)

```bash
npm run dev -- crawl --seeds https://www.w3.org/WAI/demos/bad/ \
  --out wcag-test.atls --maxPages 5 --mode full
```

**Verify Collection:**
```bash
unzip -p wcag-test.atls accessibility/part-001.jsonl.zst | zstd -d | jq '.wcagData | keys'
```

**Expected Output:** 29 data categories collected per page.

---

## Schema Reference

For full schema details, see:
- `src/core/extractors/wcagData.ts` - Data collection implementation
- `src/core/extractors/accessibility.ts` - Integration with AccessibilityRecord

---

**Next Steps for Consumer Apps:**

1. **Aggregate data** across all pages to generate site-wide reports
2. **Prioritize issues** by severity (Level A > AA > AAA) and frequency
3. **Generate actionable reports** with selectors and line numbers
4. **Track compliance over time** by comparing archives from different crawls
5. **Export to WCAG evaluation tools** (VPAT, ACR, etc.)

---

**Maintained by:** Cai Frazier  
**Last Updated:** October 24, 2025
