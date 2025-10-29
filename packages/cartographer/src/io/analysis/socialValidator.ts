/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { PageRecord } from "@atlas/spec";

export interface SocialIssue {
  url: string;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  issues: string[];
}

/**
 * Validate OpenGraph and Twitter Card tags across crawled pages
 * 
 * Checks for:
 * - Missing required OpenGraph properties (og:title, og:description, og:image, og:url)
 * - Missing Twitter Card
 * - og:url ≠ canonical URL mismatch
 * - Incomplete social sharing setup
 */
export function validateSocialTags(pages: PageRecord[]): SocialIssue[] {
  return pages
    .map(p => {
      const issues: string[] = [];
      const og = p.openGraph;
      const tw = p.twitterCard;
      
      // Check OpenGraph completeness
      if (!og || Object.keys(og).length === 0) {
        issues.push('no-opengraph');
      } else {
        // Check for required OG properties (with both formats: 'og:title' and 'ogTitle')
        const hasTitle = og['og:title'] || og.ogTitle;
        const hasDescription = og['og:description'] || og.ogDescription;
        const hasImage = og['og:image'] || og.ogImage;
        const hasUrl = og['og:url'] || og.ogUrl;
        
        if (!hasTitle) issues.push('og-title-missing');
        if (!hasDescription) issues.push('og-description-missing');
        if (!hasImage) issues.push('og-image-missing');
        if (!hasUrl) issues.push('og-url-missing');
        
        // Check og:url vs canonical mismatch
        const ogUrl = hasUrl;
        const canonicalUrl = p.canonicalResolved || p.canonical || p.canonicalHref;
        if (ogUrl && canonicalUrl && ogUrl !== canonicalUrl) {
          issues.push('og-url-canonical-mismatch');
        }
      }
      
      // Check Twitter Card
      if (!tw || !tw['twitter:card']) {
        issues.push('twitter-card-missing');
      } else {
        // Check for Twitter-specific properties
        const hasTitle = tw['twitter:title'];
        const hasDescription = tw['twitter:description'];
        const hasImage = tw['twitter:image'];
        
        if (!hasTitle) issues.push('twitter-title-missing');
        if (!hasDescription) issues.push('twitter-description-missing');
        if (!hasImage) issues.push('twitter-image-missing');
      }
      
      return {
        url: p.url,
        hasOpenGraph: !!og && Object.keys(og).length > 0,
        hasTwitterCard: !!tw && !!tw['twitter:card'],
        issues
      };
    })
    .filter(result => result.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length); // Sort by issue count
}

/**
 * Get summary statistics for social tag issues
 */
export function getSocialStats(issues: SocialIssue[]) {
  return {
    totalIssues: issues.length,
    noOpenGraph: issues.filter(i => i.issues.includes('no-opengraph')).length,
    ogTitleMissing: issues.filter(i => i.issues.includes('og-title-missing')).length,
    ogDescriptionMissing: issues.filter(i => i.issues.includes('og-description-missing')).length,
    ogImageMissing: issues.filter(i => i.issues.includes('og-image-missing')).length,
    ogUrlMissing: issues.filter(i => i.issues.includes('og-url-missing')).length,
    ogUrlCanonicalMismatch: issues.filter(i => i.issues.includes('og-url-canonical-mismatch')).length,
    twitterCardMissing: issues.filter(i => i.issues.includes('twitter-card-missing')).length,
    twitterTitleMissing: issues.filter(i => i.issues.includes('twitter-title-missing')).length,
    twitterDescriptionMissing: issues.filter(i => i.issues.includes('twitter-description-missing')).length,
    twitterImageMissing: issues.filter(i => i.issues.includes('twitter-image-missing')).length
  };
}
