/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { PageRecord } from "@atlas/spec";

export interface RedirectAnalysis {
  url: string;
  finalUrl: string;
  statusCode: number;
  redirectCount: number;
  redirectChain: string[];
  hasRedirect: boolean;
}

/**
 * Analyze redirect chains from crawled pages
 * 
 * Returns pages that went through one or more redirects before reaching
 * their final destination. Useful for:
 * - Finding redirects in sitemap
 * - Identifying redirect chains that should be shortened
 * - Detecting pages that link to redirecting URLs
 */
export function analyzeRedirects(pages: PageRecord[]): RedirectAnalysis[] {
  return pages
    .filter(p => p.redirectChain && p.redirectChain.length > 1)
    .map(p => ({
      url: p.url,
      finalUrl: p.finalUrl || p.url,
      statusCode: p.statusCode,
      redirectCount: (p.redirectChain?.length || 1) - 1,
      redirectChain: p.redirectChain || [p.url],
      hasRedirect: true
    }))
    .sort((a, b) => b.redirectCount - a.redirectCount); // Sort by chain length
}

/**
 * Get summary statistics for redirects
 */
export function getRedirectStats(analysis: RedirectAnalysis[]) {
  return {
    totalRedirects: analysis.length,
    maxChainLength: Math.max(...analysis.map(a => a.redirectCount), 0),
    avgChainLength: analysis.length > 0 
      ? analysis.reduce((sum, a) => sum + a.redirectCount, 0) / analysis.length 
      : 0
  };
}
