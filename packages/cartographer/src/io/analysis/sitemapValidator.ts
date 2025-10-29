/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { PageRecord } from "@atlas/spec";

export interface SitemapIssue {
  url: string;
  issueType: '3xx-in-sitemap' | 'indexable-not-in-sitemap' | '4xx-in-sitemap' | '5xx-in-sitemap';
  details: string;
}

/**
 * Normalize URL for comparison (remove trailing slashes, fragments, etc.)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove fragment
    parsed.hash = '';
    // Normalize trailing slash
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Validate sitemap hygiene by cross-referencing with crawled pages
 * 
 * Detects:
 * - 3XX redirects in sitemap (should contain final URL instead)
 * - 4XX/5XX errors in sitemap (shouldn't be there at all)
 * - Indexable pages not in sitemap (potential discovery gap)
 */
export function validateSitemap(
  pages: PageRecord[],
  sitemapUrls: string[]
): SitemapIssue[] {
  const issues: SitemapIssue[] = [];
  const sitemapSet = new Set(sitemapUrls.map(normalizeUrl));
  
  // Find redirects (3XX) in sitemap
  const redirectsInSitemap = pages.filter(p => 
    p.redirectChain && 
    p.redirectChain.length > 1 &&
    sitemapSet.has(normalizeUrl(p.url))
  );
  
  for (const page of redirectsInSitemap) {
    issues.push({
      url: page.url,
      issueType: '3xx-in-sitemap',
      details: `Redirects to ${page.finalUrl || 'unknown'}, chain length: ${page.redirectChain!.length - 1}`
    });
  }
  
  // Find 4XX errors in sitemap
  const errors4xxInSitemap = pages.filter(p =>
    p.statusCode >= 400 &&
    p.statusCode < 500 &&
    sitemapSet.has(normalizeUrl(p.url))
  );
  
  for (const page of errors4xxInSitemap) {
    issues.push({
      url: page.url,
      issueType: '4xx-in-sitemap',
      details: `Status code: ${page.statusCode}`
    });
  }
  
  // Find 5XX errors in sitemap
  const errors5xxInSitemap = pages.filter(p =>
    p.statusCode >= 500 &&
    p.statusCode < 600 &&
    sitemapSet.has(normalizeUrl(p.url))
  );
  
  for (const page of errors5xxInSitemap) {
    issues.push({
      url: page.url,
      issueType: '5xx-in-sitemap',
      details: `Status code: ${page.statusCode}`
    });
  }
  
  // Find indexable pages not in sitemap
  const indexableNotInSitemap = pages.filter(p =>
    p.statusCode === 200 &&
    !p.noindexSurface &&
    !sitemapSet.has(normalizeUrl(p.finalUrl || p.url))
  );
  
  for (const page of indexableNotInSitemap) {
    issues.push({
      url: page.finalUrl || page.url,
      issueType: 'indexable-not-in-sitemap',
      details: `Indexable page with status 200, no noindex directive`
    });
  }
  
  return issues.sort((a, b) => a.issueType.localeCompare(b.issueType));
}

/**
 * Get summary statistics for sitemap issues
 */
export function getSitemapStats(issues: SitemapIssue[]) {
  return {
    totalIssues: issues.length,
    redirectsInSitemap: issues.filter(i => i.issueType === '3xx-in-sitemap').length,
    errors4xxInSitemap: issues.filter(i => i.issueType === '4xx-in-sitemap').length,
    errors5xxInSitemap: issues.filter(i => i.issueType === '5xx-in-sitemap').length,
    indexableNotInSitemap: issues.filter(i => i.issueType === 'indexable-not-in-sitemap').length
  };
}
