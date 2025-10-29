/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { PageRecord } from "@atlas/spec";

export interface CanonicalIssue {
  url: string;
  finalUrl: string;
  hasCanonical: boolean;
  canonicalUrl: string | null;
  issues: string[];
}

/**
 * Validate canonical tags across crawled pages
 * 
 * Detects:
 * - Missing canonical tags
 * - Non-self canonicals (may be intentional for consolidation)
 * - Canonical URL ≠ Open Graph URL
 * - Canonical pointing to a redirecting URL (requires redirect analysis)
 */
export function validateCanonicals(pages: PageRecord[], redirectUrls?: Set<string>): CanonicalIssue[] {
  return pages
    .map(p => {
      const issues: string[] = [];
      const canonicalUrl = p.canonicalResolved || p.canonical || p.canonicalHref || null;
      const finalUrl = p.finalUrl || p.url;
      
      // Check for missing canonical
      if (!canonicalUrl) {
        issues.push('missing');
      }
      
      // Check for non-self canonical (not always an error, but worth noting)
      if (canonicalUrl && canonicalUrl !== finalUrl) {
        issues.push('non-self');
      }
      
      // Check canonical vs Open Graph URL mismatch
      const ogUrl = p.openGraph?.['og:url'] || p.openGraph?.ogUrl;
      if (canonicalUrl && ogUrl && canonicalUrl !== ogUrl) {
        issues.push('og-url-mismatch');
      }
      
      // Check if canonical points to a redirecting URL
      if (canonicalUrl && redirectUrls && redirectUrls.has(canonicalUrl)) {
        issues.push('points-to-redirect');
      }
      
      return {
        url: p.url,
        finalUrl,
        hasCanonical: !!canonicalUrl,
        canonicalUrl,
        issues
      };
    })
    .filter(result => result.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length); // Sort by issue count
}

/**
 * Get summary statistics for canonical issues
 */
export function getCanonicalStats(issues: CanonicalIssue[]) {
  const issueTypes = {
    missing: issues.filter(i => i.issues.includes('missing')).length,
    nonSelf: issues.filter(i => i.issues.includes('non-self')).length,
    ogMismatch: issues.filter(i => i.issues.includes('og-url-mismatch')).length,
    pointsToRedirect: issues.filter(i => i.issues.includes('points-to-redirect')).length
  };
  
  return {
    totalIssues: issues.length,
    ...issueTypes
  };
}
