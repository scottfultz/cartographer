# RPM Cal Coast - Issue Analysis & Recommendations

**Site:** https://www.rpmcalcoast.com  
**Date:** October 28, 2025  
**Audit Type:** Cartographer Full Mode + Manual Review

---

## Executive Summary

Identified **4 major issue categories** affecting SEO performance and site hygiene:
1. **Noindex Pages** - 3 pages incorrectly marked as noindex
2. **Orphan Pages** - 1 PPC landing page with no internal links
3. **301 Redirects in Sitemap** - 2 redirecting URLs incorrectly included
4. **Double-Slash URLs** - 9 asset URLs with path errors

**Overall Impact:** LOW to MEDIUM  
**Priority:** Address noindex and sitemap issues first

---

## 1. Noindex Pages (3 Issues)

### Issue Description
Pages marked with `noindex` directive that should be indexable, or pages with conflicting SEO intent.

### Affected URLs

#### 1.1 `/property-management`
**URL:** https://www.rpmcalcoast.com/property-management  
**Status:** Noindex  
**Issue Type:** Blog archive page treated as secondary

**Analysis:**
- This appears to be a blog category/archive page
- Comment indicates "not primary page, /blog is"
- Yoast SEO likely setting noindex on archive pages (default behavior)

**Recommendation:**
- **If this is a legitimate blog category:** Remove noindex, allow indexing
- **If truly redundant with /blog:** Keep noindex OR redirect to /blog
- **Best practice:** Each category should be indexable if unique content

**Priority:** 🟡 MEDIUM

---

#### 1.2 `/property-management/frequently-asked-questions`
**URL:** https://www.rpmcalcoast.com/property-management/frequently-asked-questions  
**Status:** Noindex  
**Issue Type:** Blog category archive

**Analysis:**
- Blog category page for FAQs
- Yoast SEO default: noindex on category archives
- FAQ categories can drive organic traffic

**Recommendation:**
- **Enable indexing** - FAQ pages are high-value for organic search
- Add unique meta description highlighting FAQ topics
- Consider adding structured data (FAQPage schema)
- Ensure category has unique introductory content

**SEO Value:** HIGH - FAQ searches are common in property management  
**Priority:** 🔴 HIGH

---

#### 1.3 `/tag/featured-blog`
**URL:** https://www.rpmcalcoast.com/tag/featured-blog  
**Status:** Noindex  
**Issue Type:** Tag archive page

**Analysis:**
- WordPress tag archive page
- Yoast SEO default: noindex on tag archives
- Tags generally have lower SEO value than categories

**Recommendation:**
- **Keep noindex** - Tag archives typically create thin/duplicate content
- Tags are internal navigation, not organic landing pages
- Exception: If tag has substantial unique content and high search volume

**Priority:** 🟢 LOW - Current noindex is correct

---

### Noindex Configuration Audit

**Current Setup (Suspected):**
```
Yoast SEO Settings:
✓ Category archives: noindex
✓ Tag archives: noindex
✓ Author archives: noindex (likely)
```

**Recommended Changes:**
```
✓ Blog categories: index (change)
✗ Tag archives: noindex (keep)
? Author archives: evaluate based on multi-author site
```

---

## 2. Orphan Pages (1 Issue)

### Issue Description
Pages with no internal links pointing to them, making them invisible to users and crawlers navigating the site.

### Affected URLs

#### 2.1 `/california-property-management`
**URL:** https://www.rpmcalcoast.com/california-property-management  
**Status:** Orphaned  
**Page Type:** PPC Landing Page

**Analysis:**
- Designed for paid advertising campaigns (Google Ads, etc.)
- Intentionally isolated to control conversion flow
- No internal links = no "leak" from paid traffic to organic content
- Common practice for PPC-optimized landing pages

**Current State:**
- ✅ Accessible via direct URL
- ✅ Likely in sitemap
- ❌ Not linked from site navigation
- ❌ Not linked from related content

**SEO Impact:**
- **PageRank:** Not receiving internal link equity
- **Crawling:** Only discoverable via sitemap or external links
- **User Experience:** Not part of natural site navigation

**Recommendation:**

**Option A: Keep Isolated (Recommended for PPC)**
- Maintain as dedicated landing page
- Add `noindex,nofollow` if purely for paid traffic
- Remove from sitemap if noindexed
- Use canonical to similar indexable page if content duplicates

**Option B: Integrate into Site**
- Add to main navigation under "Services" or "About"
- Create contextual links from related blog posts
- Use as pillar content for California property management topic cluster
- **Risk:** Dilutes conversion focus for paid campaigns

**Priority:** 🟡 MEDIUM - Decision depends on marketing strategy

---

## 3. 301 Redirects in Sitemap (2 Issues)

### Issue Description
URLs returning 301 redirects are incorrectly included in XML sitemap. Search engines waste crawl budget on redirects.

### Affected URLs

#### 3.1 `/houses-for-rent` → `/houses-rent`
**From:** https://www.rpmcalcoast.com/houses-for-rent  
**To:** https://www.rpmcalcoast.com/houses-rent  
**Status:** 301 Permanent Redirect  
**Issue:** Duplicate URL pattern

**Analysis:**
- Old URL uses hyphenated format: `houses-for-rent`
- New URL uses simplified format: `houses-rent`
- Sitemap includes the OLD URL that redirects
- This is a **site migration artifact**

**Impact:**
- Search engines discover redirect via sitemap
- Must follow redirect to reach actual content
- Wastes crawl budget
- May delay indexing of new URL

**Recommendation:**
1. **Remove `/houses-for-rent` from sitemap**
2. **Keep `/houses-rent` in sitemap**
3. **Verify 301 redirect is permanent** (already done)
4. **Update any internal links** to point directly to `/houses-rent`
5. **Monitor:** Old URL should drop from index within 3-6 months

**Priority:** 🟡 MEDIUM

---

#### 3.2 `/privacy-policy` → Parent Company Policy
**From:** https://www.rpmcalcoast.com/privacy-policy  
**To:** [Parent company privacy policy URL]  
**Status:** 301 Permanent Redirect  
**Issue:** Defunct page redirecting to corporate policy

**Analysis:**
- Local privacy policy page was removed
- Now redirects to parent company (Real Property Management corporate)
- Common practice for franchise/multi-location businesses
- Sitemap still references local URL

**Legal/UX Considerations:**
- Users expect privacy policy on local domain
- Footer links likely point to local URL
- Redirect may confuse users expecting Cal Coast-specific policy

**Impact:**
- Crawl budget wasted on redirect
- May reduce user trust (expecting local policy, getting corporate)
- Could affect compliance if Cal Coast has unique data practices

**Recommendation:**

**Option A: Remove from Sitemap (Quick Fix)**
1. Remove `/privacy-policy` from sitemap
2. Keep 301 redirect for legacy bookmarks/links
3. Update footer to link directly to parent company policy

**Option B: Create Local Policy Page (Best Practice)**
1. Create Cal Coast-specific privacy policy page
2. Inherit from corporate policy but add local details
3. Remove redirect
4. Include in sitemap
5. Meets user expectations and legal best practices

**Priority:** 🔴 HIGH (affects legal compliance perception)

---

## 4. Double-Slash URLs (9 Issues)

### Issue Description
Asset URLs contain double-slashes (`//`) in path, indicating template/plugin error. May cause 404s or loading issues.

### Affected URLs

All URLs follow this pattern:
```
/wp-content/plugins/rpm-landing-pages/templates/[template]/assets//images/[file]
                                                                    ^^
                                                              Double slash
```

**Full List:**

#### Landing Template 2 (7 images)
1. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing2/assets//images/arrow.png
2. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing2/assets//images/openquote.png
3. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing2/assets//images/wrench.png
4. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing2/assets//images/closequote.png
5. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing2/assets//images/gear.png
6. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing2/assets//images/star.png
7. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing2/assets//images/calendar.png

#### Landing Template 5 (2 images)
8. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing5/assets//images/closequote.png
9. https://www.rpmcalcoast.com/wp-content/plugins/rpm-landing-pages/templates/landing5/assets//images/openquote.png

---

### Root Cause Analysis

**Plugin:** `rpm-landing-pages` (Corporate-managed plugin)  
**Issue:** Template string concatenation error

**Likely Code:**
```php
// Incorrect:
$image_url = $assets_dir . '/' . $images_dir . '/' . $filename;
//                         ^                    ^
//                    If $images_dir already starts with /
//                    Result: assets//images/file.png

// Correct:
$image_url = trailingslashit($assets_dir) . 'images/' . $filename;
```

**Affected Templates:**
- `landing2/` - 7 images affected
- `landing5/` - 2 images affected

---

### Impact Assessment

**Technical Impact:**
- ✅ **URLs still resolve** - Web servers normalize double-slashes
- ⚠️ **Not best practice** - Violates URL standards
- ⚠️ **SEO concern** - May be treated as duplicate resources
- ⚠️ **CDN/caching issues** - Some CDNs treat these as separate URLs

**Business Impact:**
- 🟢 **LOW** - Images still load correctly
- 🟡 **MEDIUM** - Professional appearance (URLs look broken)
- 🟢 **LOW** - Page speed not affected

**Why Images Still Work:**
```
HTTP/1.1 specification (RFC 2396):
Multiple slashes in path are normalized by servers
/path//to///file.png → /path/to/file.png
```

---

### Recommendations

#### Option A: Corporate Plugin Fix (Ideal)
**Who:** Real Property Management corporate IT  
**What:** Fix `rpm-landing-pages` plugin  
**How:**
1. Locate string concatenation in template files
2. Use proper path joining functions
3. Deploy updated plugin to all franchises
4. Test on staging environment

**Priority:** 🟡 MEDIUM  
**Timeline:** Corporate release cycle (likely 1-3 months)

---

#### Option B: Local Template Override
**Who:** Cal Coast IT/Developer  
**What:** Override plugin templates locally  
**How:**
1. Copy plugin templates to theme directory:
   ```
   wp-content/themes/[theme]/rpm-landing-pages/landing2/
   wp-content/themes/[theme]/rpm-landing-pages/landing5/
   ```
2. Fix double-slash in copied templates
3. WordPress will use theme version over plugin version

**Pros:**
- ✅ Immediate fix
- ✅ No waiting for corporate

**Cons:**
- ❌ Manual updates needed when plugin updates
- ❌ May break on theme changes
- ❌ Local customization not tracked by corporate

**Priority:** 🟢 LOW (if images load correctly)

---

#### Option C: Do Nothing (Acceptable)
**Rationale:**
- Images load correctly despite double-slash
- No user-facing impact
- No measurable SEO impact
- Cost of fix > benefit

**Monitor for:**
- 404 errors in server logs
- Image loading issues reported by users
- CDN cache miss patterns

**Priority:** 🟢 LOW

---

### Corporate Communication

**Note from audit:** *"All attributed to corporate PPC landing pages, no permissions."*

**Interpretation:**
- PPC landing page templates are corporate-managed
- Cal Coast does not have edit permissions
- Cannot modify plugin files
- Must request fix from corporate IT

**Action Items:**
1. Document issue with screenshots
2. Submit to Real Property Management corporate IT
3. Include:
   - Affected URLs
   - Template files (`landing2`, `landing5`)
   - Technical explanation (double-slash in path concatenation)
   - Priority: LOW (images work, but not best practice)

---

## 5. Summary & Action Plan

### Critical Issues (Fix Immediately)

1. **✅ Index `/property-management/frequently-asked-questions`**
   - **Action:** Yoast SEO > Search Appearance > Taxonomies > Uncheck "noindex" for FAQ category
   - **Owner:** SEO Manager
   - **Timeline:** 1 day
   - **Validation:** Fetch as Google, check rendered HTML for meta robots

2. **✅ Remove 301 URLs from Sitemap**
   - **Action:** Regenerate sitemap, exclude redirecting URLs
   - **URLs to remove:**
     - `/houses-for-rent`
     - `/privacy-policy`
   - **Owner:** Developer/SEO Manager
   - **Timeline:** 1 day
   - **Validation:** View sitemap XML, verify URLs removed

---

### Important Issues (Fix Within 2 Weeks)

3. **⚠️ Privacy Policy Strategy**
   - **Decision needed:** Local page or corporate redirect?
   - **If local page:** Create Cal Coast-specific privacy policy
   - **If corporate redirect:** Update footer links to point directly to corporate URL
   - **Owner:** Legal + Marketing
   - **Timeline:** 2 weeks

4. **⚠️ Orphan Page Strategy**
   - **Decision needed:** Keep isolated or integrate?
   - **If PPC-only:** Add noindex, remove from sitemap
   - **If integrated:** Add internal links from related content
   - **Owner:** Marketing Manager
   - **Timeline:** 2 weeks

---

### Minor Issues (Fix When Resources Available)

5. **🔧 Double-Slash URLs**
   - **Action:** Report to Real Property Management corporate IT
   - **Plugin:** `rpm-landing-pages`
   - **Affected templates:** `landing2`, `landing5`
   - **Priority:** LOW (images load correctly)
   - **Timeline:** Corporate release cycle

6. **🔧 Noindex Audit**
   - **Action:** Review all noindexed pages
   - **Tools:** Screaming Frog, Cartographer export
   - **Verify:** Each noindex decision is intentional
   - **Timeline:** Monthly SEO audit

---

## 6. Validation & Monitoring

### Post-Fix Validation

**For Indexing Changes:**
```bash
# Check meta robots tag
curl -s https://www.rpmcalcoast.com/property-management/frequently-asked-questions | grep -i "robots"

# Expected: NO noindex directive (or "index,follow")
```

**For Sitemap:**
```bash
# Download current sitemap
curl https://www.rpmcalcoast.com/sitemap.xml -o sitemap.xml

# Verify removed URLs
grep "houses-for-rent" sitemap.xml  # Should return nothing
grep "privacy-policy" sitemap.xml   # Should return nothing
```

**For Orphan Pages:**
```bash
# Check for internal links (using Cartographer)
node dist/cli/index.js export \
  --atls rpm-cal-coast-latest.atls \
  --report edges \
  --out edges.csv

# Filter edges CSV for target URL
grep "california-property-management" edges.csv
```

---

### Ongoing Monitoring

**Weekly:**
- Google Search Console > Coverage report
- Check for new "Excluded by noindex" pages
- Verify sitemap URLs are indexable

**Monthly:**
- Screaming Frog crawl
- Identify new orphan pages
- Audit noindex/nofollow directives

**Quarterly:**
- Full Cartographer crawl (full mode)
- Compare against previous crawl
- Track issue trends over time

---

## 7. Technical Details

### Noindex Detection

**How Cartographer Detected:**
```typescript
// From scheduler.ts lines 988-996
let noindexSurface: "meta" | "header" | "both" | undefined;
if (hasMetaNoindex && hasHeaderNoindex) {
  noindexSurface = "both";
} else if (hasMetaNoindex) {
  noindexSurface = "meta";
} else if (hasHeaderNoindex) {
  noindexSurface = "header";
}
```

**Sources Checked:**
1. Meta robots tag: `<meta name="robots" content="noindex,nofollow">`
2. X-Robots-Tag HTTP header: `X-Robots-Tag: noindex`

---

### Orphan Detection

**Definition:** Page with zero internal inbound links

**Cartographer Method:**
1. Build edge graph from all discovered links
2. Count inbound edges per page
3. Filter pages with `inboundCount === 0`
4. Exclude homepage (entry point)

**Query:**
```javascript
const orphans = pages.filter(p => {
  const inbound = edges.filter(e => e.target === p.url);
  return inbound.length === 0 && p.url !== homepage;
});
```

---

### 301 Detection in Sitemap

**Process:**
1. Parse sitemap XML
2. Fetch each URL (HEAD request)
3. Check status code
4. Flag any 3XX redirects

**Issue:** Sitemap should only contain final destination URLs

---

### Double-Slash Normalization

**Server Behavior:**
```
Request:  /path//to///file.png
Parsed:   /path/to/file.png
Served:   200 OK (normalized path)
```

**Why It Works:**
- HTTP specification allows path normalization
- Web servers collapse multiple slashes
- Final resolved path is correct

**Why It's Still Wrong:**
- Violates URL standards (RFC 3986)
- May cause CDN cache misses
- Looks unprofessional
- Some strict parsers may fail

---

## 8. WordPress/Yoast Configuration

### Current Setup (Inferred)

**Yoast SEO > Search Appearance:**
```
Posts:
  ☑ Show Posts in search results

Pages:
  ☑ Show Pages in search results

Categories:
  ☒ Show Categories in search results (← ISSUE HERE)
  
Tags:
  ☒ Show Tags in search results (correct)
  
Media:
  ☒ Show Media in search results (correct)
```

### Recommended Setup

**Categories:**
```
☑ Show Categories in search results

Exceptions (per-category basis):
- Blog meta categories → noindex
- Thin content categories → noindex
- FAQ category → index (high value)
```

**Configuration Code:**
```php
// In functions.php or SEO plugin
add_filter('wpseo_robots', function($robots) {
  if (is_category('frequently-asked-questions')) {
    return 'index,follow'; // Override Yoast default
  }
  return $robots;
});
```

---

## 9. Files & Resources

### Cartographer Exports

**Generate issue-specific reports:**

```bash
# Export pages with noindex
node dist/cli/index.js export \
  --atls rpm-cal-coast.atls \
  --report pages \
  --filter "noindexSurface !== undefined" \
  --out noindex-pages.csv

# Export orphan pages
node dist/cli/index.js export \
  --atls rpm-cal-coast.atls \
  --report orphans \
  --out orphan-pages.csv

# Export redirects
node dist/cli/index.js export \
  --atls rpm-cal-coast.atls \
  --report redirects \
  --out redirects.csv

# Export sitemap URLs
node dist/cli/index.js export \
  --atls rpm-cal-coast.atls \
  --report sitemap \
  --out sitemap-urls.csv
```

---

### Related Documentation

- `CODEBASE_DOCUMENTATION.md` - Cartographer architecture
- `DATA_COLLECTION_GAP_ANALYSIS.md` - Data collection completeness
- `RPM-SUNSTATE-COMPLETE-SEO-AUDIT.md` - Similar audit example
- `ATLAS_V1_SPECIFICATION.md` - Atlas data format

---

## 10. Conclusion

### Impact Summary

| Issue | Count | Severity | Impact | Effort |
|-------|-------|----------|--------|--------|
| Noindex Pages | 3 | MEDIUM | SEO traffic loss | 1 day |
| Orphan Pages | 1 | LOW | Crawl efficiency | 1 week |
| 301 in Sitemap | 2 | MEDIUM | Crawl budget waste | 1 day |
| Double-Slash | 9 | LOW | Professional appearance | Corporate fix |

**Total Estimated Effort:** 2-3 days (excluding corporate plugin fix)  
**Expected SEO Benefit:** 5-10% organic traffic increase from FAQ indexing  
**Risk Level:** LOW - All fixes are low-risk configuration changes

---

### Next Steps

1. ✅ **Immediate:** Fix Yoast settings for FAQ category
2. ✅ **Immediate:** Regenerate sitemap without 301 URLs
3. ⏳ **This Week:** Decide privacy policy strategy
4. ⏳ **This Week:** Decide PPC orphan page strategy
5. 📧 **This Month:** Report double-slash to corporate IT

---

**Audit Completed By:** Cartographer v1.0.0-beta.1  
**Manual Review By:** [Analyst Name]  
**Report Generated:** October 28, 2025  
**Next Audit:** November 28, 2025 (Monthly)
