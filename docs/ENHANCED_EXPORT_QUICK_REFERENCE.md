# Enhanced Export Reports - Quick Reference

Quick reference for the 6 new SEO analysis export reports added to Cartographer.

---

## Command Format

```bash
cartographer export --atls <file.atls> --report <type> --out <output.csv>
```

---

## Report Types

### 1. Redirects (`redirects`)

**Finds:** Pages that redirect (301/302/307/308) before reaching final destination

**Use Cases:**
- Identify redirects in sitemap (should contain final URLs)
- Find long redirect chains (bad for performance)
- Audit URL migration cleanup

**CSV Columns:**
- `url` - Original URL that redirects
- `finalUrl` - Final destination after all redirects
- `statusCode` - HTTP status of final page
- `redirectCount` - Number of hops (chain length - 1)
- `redirectChain` - JSON array of full redirect path

**Example:**
```bash
cartographer export --atls crawl.atls --report redirects --out redirects.csv
```

---

### 2. Noindex (`noindex`)

**Finds:** Pages with noindex directives (won't appear in search engines)

**Use Cases:**
- Verify intentional noindex pages (tags, categories)
- Find accidentally noindexed important pages
- Audit Yoast SEO settings (WordPress)

**CSV Columns:**
- `url` - Page URL
- `noindexSource` - Where noindex was found: `meta`, `header`, or `both`
- `robotsMeta` - Content of meta robots tag
- `robotsHeader` - Content of X-Robots-Tag HTTP header
- `statusCode` - HTTP status code

**Example:**
```bash
cartographer export --atls crawl.atls --report noindex --out noindex.csv
```

---

### 3. Canonicals (`canonicals`)

**Finds:** Canonical tag issues (missing, incorrect, or conflicting)

**Use Cases:**
- Find pages without canonical tags
- Identify canonicals pointing to redirects
- Detect og:url vs canonical mismatches

**CSV Columns:**
- `url` - Page URL
- `finalUrl` - Final URL after redirects
- `hasCanonical` - Boolean: does page have canonical tag?
- `canonicalUrl` - Resolved canonical URL
- `issues` - JSON array of problems: `missing`, `non-self`, `og-url-mismatch`, `points-to-redirect`

**Example:**
```bash
cartographer export --atls crawl.atls --report canonicals --out canonicals.csv
```

---

### 4. Sitemap Hygiene (`sitemap`)

**Finds:** Sitemap issues and indexable pages not in sitemap

**Use Cases:**
- Validate sitemap contains correct URLs
- Find indexable pages missing from sitemap
- Identify errors/redirects in sitemap

**CSV Columns:**
- `url` - Page URL
- `issueType` - Type: `3xx-in-sitemap`, `4xx-in-sitemap`, `5xx-in-sitemap`, `indexable-not-in-sitemap`
- `details` - Description of issue

**Example:**
```bash
cartographer export --atls crawl.atls --report sitemap --out sitemap.csv
```

**Note:** Currently reports "indexable not in sitemap" only. Full sitemap cross-reference requires sitemap URLs to be stored during crawl (future enhancement).

---

### 5. Social Tags (`social`)

**Finds:** OpenGraph and Twitter Card validation issues

**Use Cases:**
- Ensure all pages have social sharing tags
- Validate og:image, og:title, og:description presence
- Check Twitter Card completeness

**CSV Columns:**
- `url` - Page URL
- `hasOpenGraph` - Boolean: has OpenGraph tags?
- `hasTwitterCard` - Boolean: has Twitter Card?
- `issues` - JSON array of problems:
  - `no-opengraph`
  - `og-title-missing`
  - `og-description-missing`
  - `og-image-missing`
  - `og-url-missing`
  - `og-url-canonical-mismatch`
  - `twitter-card-missing`
  - `twitter-title-missing`
  - `twitter-description-missing`
  - `twitter-image-missing`

**Example:**
```bash
cartographer export --atls crawl.atls --report social --out social.csv
```

---

### 6. Images (`images`)

**Finds:** Pages with images missing alt text (accessibility issue)

**Use Cases:**
- Accessibility audit (WCAG 2.1 Level A requirement)
- Find images that need alt text
- Generate remediation task list

**CSV Columns:**
- `pageUrl` - Page URL containing images
- `missingAltCount` - Number of images without alt text
- `missingAltSources` - JSON array of image URLs (first 50)

**Example:**
```bash
cartographer export --atls crawl.atls --report images --out images.csv
```

**Note:** Requires `full` mode crawl with accessibility data collection.

---

## Workflow Examples

### Complete SEO Audit

```bash
# 1. Crawl site in full mode
cartographer crawl \
  --seeds https://example.com \
  --mode full \
  --maxPages 1000 \
  --out audit.atls

# 2. Generate all SEO reports
cartographer export --atls audit.atls --report redirects --out redirects.csv
cartographer export --atls audit.atls --report noindex --out noindex.csv
cartographer export --atls audit.atls --report canonicals --out canonicals.csv
cartographer export --atls audit.atls --report sitemap --out sitemap.csv
cartographer export --atls audit.atls --report social --out social.csv
cartographer export --atls audit.atls --report images --out images.csv

# 3. Review in spreadsheet or BI tool
```

---

### Pre-Launch Checklist

```bash
# Check for accidental noindex on important pages
cartographer export --atls staging.atls --report noindex --out noindex.csv
# → Review: Should only be category/tag archives

# Validate all pages have canonical tags
cartographer export --atls staging.atls --report canonicals --out canonicals.csv
# → Fix: Any pages with "missing" issue

# Ensure social sharing works
cartographer export --atls staging.atls --report social --out social.csv
# → Fix: Any pages missing og:image or twitter:card

# Accessibility check
cartographer export --atls staging.atls --report images --out images.csv
# → Fix: Add alt text to all images
```

---

### Migration Cleanup

```bash
# Find all redirects after site migration
cartographer export --atls post-migration.atls --report redirects --out redirects.csv
# → Fix: Update internal links to point to final URLs
# → Fix: Update sitemap to contain final URLs only

# Check sitemap hygiene
cartographer export --atls post-migration.atls --report sitemap --out sitemap.csv
# → Fix: Remove any 3XX/4XX/5XX from sitemap
# → Fix: Add indexable pages to sitemap
```

---

## Output to Stdout

Omit `--out` to print CSV to stdout (for piping):

```bash
# Count noindex pages
cartographer export --atls crawl.atls --report noindex | wc -l

# Find pages with most missing alts
cartographer export --atls crawl.atls --report images | sort -t',' -k2 -rn | head -10

# Filter social issues for blog posts only
cartographer export --atls crawl.atls --report social | grep '/blog/'
```

---

## Combining with Standard Reports

Standard dataset exports still work:

```bash
# All pages
cartographer export --atls crawl.atls --report pages --out pages.csv

# All links
cartographer export --atls crawl.atls --report edges --out edges.csv

# All assets
cartographer export --atls crawl.atls --report assets --out assets.csv

# All errors
cartographer export --atls crawl.atls --report errors --out errors.csv

# Full accessibility data
cartographer export --atls crawl.atls --report accessibility --out accessibility.csv
```

---

## Comparison to Other Tools

| Feature | Cartographer | Ahrefs | Screaming Frog |
|---------|--------------|--------|----------------|
| Redirects | ✅ | ✅ | ✅ |
| Noindex Detection | ✅ | ✅ | ✅ |
| Canonical Validation | ✅ | ✅ | ✅ |
| Sitemap Hygiene | ⚠️ Partial | ✅ | ✅ |
| Social Tags | ✅ | ✅ | ✅ |
| Alt Text | ✅ | ✅ | ✅ |
| **Offline Archive** | ✅ | ❌ | ⚠️ |
| **Version Control** | ✅ | ❌ | ❌ |
| **Scriptable** | ✅ | ⚠️ API | ⚠️ |

**Advantage:** Cartographer archives are versioned, diffable, and can be analyzed offline without re-crawling.

---

## Performance Tips

### Large Sites (10K+ pages)

```bash
# Export incrementally to avoid memory issues
cartographer export --atls large.atls --report redirects --out redirects.csv
# Memory: ~50MB per 10K pages
# Time: ~2-3 seconds per 1K pages
```

### Automated Reporting

```bash
#!/bin/bash
# Generate all reports in one script
ATLS="$1"
OUT_DIR="./reports"

mkdir -p "$OUT_DIR"

for REPORT in redirects noindex canonicals sitemap social images; do
  echo "Generating $REPORT report..."
  cartographer export --atls "$ATLS" --report "$REPORT" --out "$OUT_DIR/$REPORT.csv"
done

echo "All reports generated in $OUT_DIR/"
```

---

## Troubleshooting

### "Export complete: 0 records"

**Possible reasons:**
1. No issues found (good!)
2. Wrong render mode (e.g., `images` requires `full` mode)
3. Data not collected during crawl

**Check:**
```bash
# Verify archive has data
cartographer export --atls crawl.atls --report pages | head -5
```

### "No accessibility dataset"

**Issue:** Images report requires `full` mode crawl

**Fix:**
```bash
# Re-crawl with full mode
cartographer crawl --seeds https://example.com --mode full --out crawl.atls
```

### CSV encoding issues

**Issue:** Special characters in URLs or content

**Fix:** Open CSV with UTF-8 encoding in Excel/LibreOffice

---

## Further Reading

- **Implementation Details:** [docs/SEO_ANALYSIS_REMEDIATION_COMPLETE.md](SEO_ANALYSIS_REMEDIATION_COMPLETE.md)
- **Gap Analysis:** [docs/DATA_COLLECTION_GAP_ANALYSIS.md](DATA_COLLECTION_GAP_ANALYSIS.md)
- **Atlas Specification:** [docs/ATLAS_V1_SPECIFICATION.md](ATLAS_V1_SPECIFICATION.md)
- **CLI Reference:** [README.md](../README.md)
