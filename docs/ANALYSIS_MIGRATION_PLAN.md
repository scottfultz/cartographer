# Analysis Layer Migration Plan - Cartographer → Continuum

**Created:** October 28, 2025  
**Target:** Before Release Candidate (RC)  
**Status:** 📋 **PLANNED**

---

## Overview

This document tracks the migration of analysis functionality from Cartographer (data collection layer) to Continuum (presentation layer) to maintain proper architectural separation.

---

## Architectural Principle

**Cartographer:**
- ✅ Crawl websites
- ✅ Extract raw data
- ✅ Write `.atls` archives
- ✅ Validate archive integrity
- ✅ Basic CSV export (raw JSONL → CSV, no interpretation)
- ❌ **NO** data analysis or interpretation

**Continuum:**
- ✅ Read `.atls` archives via Atlas SDK
- ✅ Analyze and interpret data
- ✅ Present findings in GUI
- ✅ Generate reports/exports
- ✅ All SEO analysis and issue detection

---

## Current State (Beta Development)

### Temporary Implementation in Cartographer

**Location:** `packages/cartographer/src/io/analysis/`

**Files to Migrate:**
1. `redirectAnalyzer.ts` (56 lines)
2. `noindexAnalyzer.ts` (44 lines)
3. `canonicalValidator.ts` (78 lines)
4. `sitemapValidator.ts` (118 lines)
5. `socialValidator.ts` (98 lines)
6. `index.ts` (11 lines)

**Export Handler:**
- `packages/cartographer/src/io/export/exportEnhanced.ts` (260 lines)

**CLI Integration:**
- `packages/cartographer/src/cli/commands/export.ts` (enhanced report types)

**Total:** ~665 lines of code to migrate/remove

---

## Migration Plan

### Phase 1: Continuum Integration Prep

**Create Analysis Module in Continuum:**

```
apps/continuum/src/analysis/
├── index.ts                    # Module exports
├── redirectAnalyzer.ts         # Migrate from Cartographer
├── noindexAnalyzer.ts          # Migrate from Cartographer
├── canonicalValidator.ts       # Migrate from Cartographer
├── sitemapValidator.ts         # Migrate from Cartographer
└── socialValidator.ts          # Migrate from Cartographer
```

**Changes Required:**
- Import Atlas SDK for reading archives
- Update TypeScript imports (no more internal Cartographer deps)
- Add UI integration hooks (for tabs/tables)

---

### Phase 2: UI Integration

**Map Analysis to Existing Tabs:**

| Analysis Module | Continuum Tab | Display Method |
|----------------|---------------|----------------|
| `redirectAnalyzer` | Issues tab | Redirect issues table |
| `noindexAnalyzer` | Issues tab | Noindex pages table |
| `canonicalValidator` | Issues tab | Canonical issues table |
| `sitemapValidator` | Issues tab | Sitemap hygiene table |
| `socialValidator` | Social Tags tab | Missing/incomplete tags |
| Images (from a11y) | Accessibility tab | Already implemented |

**New UI Components:**

```typescript
// apps/continuum/src/renderer/analyzers.ts

import { openAtlas } from '@atlas/sdk';
import { 
  analyzeRedirects, 
  analyzeNoindex,
  validateCanonicals,
  validateSitemap,
  validateSocialTags 
} from './analysis/index.js';

async function loadIssues(atlasPath: string) {
  const atlas = await openAtlas(atlasPath);
  const pages = [];
  
  for await (const page of atlas.readers.pages()) {
    pages.push(page);
  }
  
  return {
    redirects: analyzeRedirects(pages),
    noindex: analyzeNoindex(pages),
    canonicals: validateCanonicals(pages),
    sitemap: validateSitemap(pages, []), // TODO: extract sitemap URLs
    social: validateSocialTags(pages)
  };
}
```

**Update Issues Tab:**

```typescript
// apps/continuum/src/renderer/renderer.ts

async function loadIssuesTab() {
  const issues = await loadIssues(currentAtlasPath);
  
  // Render redirects section
  renderRedirects(issues.redirects);
  
  // Render noindex section
  renderNoindex(issues.noindex);
  
  // Render canonicals section
  renderCanonicals(issues.canonicals);
  
  // Render sitemap section
  renderSitemap(issues.sitemap);
}
```

---

### Phase 3: Export Functionality

**Add Export to Continuum:**

```
apps/continuum/src/export/
├── index.ts
├── csvExporter.ts              # CSV generation
├── excelExporter.ts            # Excel generation (future)
└── pdfReporter.ts              # PDF reports (future)
```

**Export Menu in Continuum:**
- File > Export > Redirects CSV
- File > Export > All Issues CSV
- File > Export > Social Tags CSV
- File > Export > Full SEO Report (PDF)

**Implementation:**

```typescript
// apps/continuum/src/export/csvExporter.ts

export async function exportRedirects(
  atlasPath: string,
  outputPath: string
) {
  const atlas = await openAtlas(atlasPath);
  const pages = [];
  
  for await (const page of atlas.readers.pages()) {
    pages.push(page);
  }
  
  const redirects = analyzeRedirects(pages);
  
  // Write CSV
  await writeCsv(outputPath, redirects, [
    'url', 'finalUrl', 'statusCode', 'redirectCount', 'redirectChain'
  ]);
}
```

---

### Phase 4: Cartographer Cleanup

**Remove from Cartographer:**

1. Delete `packages/cartographer/src/io/analysis/` directory
2. Delete `packages/cartographer/src/io/export/exportEnhanced.ts`
3. Revert `packages/cartographer/src/cli/commands/export.ts` to original:
   ```typescript
   choices: ["pages", "edges", "assets", "errors", "accessibility"]
   // Remove: redirects, noindex, canonicals, sitemap, social, images
   ```

4. Update README.md:
   - Remove enhanced export documentation
   - Update from "11 report types" → "5 report types"
   - Add note: "For SEO analysis, use Continuum"

5. Update documentation:
   - Archive `docs/SEO_ANALYSIS_REMEDIATION_COMPLETE.md` 
   - Update `docs/DATA_COLLECTION_GAP_ANALYSIS.md` with migration note
   - Delete `docs/ENHANCED_EXPORT_QUICK_REFERENCE.md` (or move to Continuum docs)

**Keep in Cartographer:**
- Basic CSV export (pages, edges, assets, errors, accessibility)
- Archive validation
- Data collection functionality

---

### Phase 5: Testing

**Verify Continuum Functionality:**
- [ ] Issues tab displays all 5 analysis types
- [ ] Social Tags tab shows validation issues
- [ ] Accessibility tab shows missing alt text (already done)
- [ ] Export menu generates CSV files correctly
- [ ] All analysis matches previous Cartographer output

**Verify Cartographer Cleanup:**
- [ ] Build succeeds with analysis modules removed
- [ ] All tests pass
- [ ] CLI export command shows only 5 report types
- [ ] Documentation updated

---

## Rollout Timeline

### Development (Current)
- ✅ Analysis modules in Cartographer (temporary)
- ✅ Used for validation against Ahrefs
- ✅ CLI export commands work

### Beta Period
- 🔄 Implement analysis in Continuum
- 🔄 Test UI integration
- 🔄 Keep Cartographer analysis for validation

### Release Candidate
- ⏸️ Remove analysis from Cartographer
- ⏸️ All analysis in Continuum only
- ⏸️ Update all documentation

### Production Release
- ⏸️ Clean separation maintained
- ⏸️ Cartographer = data collection only
- ⏸️ Continuum = analysis + presentation

---

## Decision Points

### May Keep in Cartographer (Future)
If user feedback indicates CLI users need basic analysis:
- Consider minimal "summary" command
- Show counts only (e.g., "Found 5 redirects, 3 canonical issues")
- No detailed reports (use Continuum for that)

### Definitely Remove from Cartographer
- Detailed CSV reports with analysis
- Issue categorization and prioritization
- Any SEO scoring or recommendations
- Comparative analysis

---

## Benefits of Migration

### Architectural Clarity
- ✅ Clean separation of concerns
- ✅ Cartographer stays lightweight
- ✅ Easier to maintain both projects

### User Experience
- ✅ Better visualization in Continuum GUI
- ✅ Interactive filtering and sorting
- ✅ Export options integrated with UI
- ✅ One place for all analysis

### Business Value
- ✅ Continuum becomes primary analysis tool
- ✅ Cartographer CLI remains focused on crawling
- ✅ Clear value proposition for each tool
- ✅ Prevents feature cannibalization

---

## Migration Checklist

### Pre-Migration
- [x] Document current implementation
- [x] Create migration plan
- [ ] Review with stakeholders
- [ ] Set target date for RC

### Implementation
- [ ] Create Continuum analysis module
- [ ] Implement UI integration
- [ ] Add export functionality to Continuum
- [ ] Test all features

### Cleanup
- [ ] Remove analysis from Cartographer
- [ ] Update CLI export command
- [ ] Update all documentation
- [ ] Run full test suite

### Validation
- [ ] Compare Continuum analysis to Cartographer baseline
- [ ] Verify UI displays all data correctly
- [ ] Test export functionality
- [ ] User acceptance testing

---

## Notes

**Why Keep During Development:**
- Validates data collection completeness
- Provides quick CLI access for testing
- Allows comparison with Ahrefs reports
- Useful for automated testing

**Why Remove Before RC:**
- Maintains architectural purity
- Prevents CLI from replacing GUI for analysis
- Forces dogfooding of Continuum
- Keeps Cartographer focused and lightweight

**Future Considerations:**
- May add minimal summary stats to Cartographer CLI post-RC
- Would show counts only, no detailed analysis
- Continuum remains primary analysis tool
- Decision based on user feedback

---

**Created by:** GitHub Copilot  
**Target Completion:** Before Release Candidate  
**Status:** Awaiting implementation
