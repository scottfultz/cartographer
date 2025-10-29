/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { PageRecord } from "@atlas/spec";

export interface NoindexAnalysis {
  url: string;
  noindexSource: 'meta' | 'header' | 'both' | null;
  robotsMeta: string | null;
  robotsHeader: string | null;
  statusCode: number;
}

/**
 * Analyze noindex directives across crawled pages
 * 
 * Identifies pages with noindex directives from:
 * - Meta robots tag
 * - X-Robots-Tag HTTP header
 * - Both sources
 */
export function analyzeNoindex(pages: PageRecord[]): NoindexAnalysis[] {
  return pages
    .filter(p => {
      // Check for noindex in multiple fields
      if (p.noindexSurface) return true;
      if (p.robotsMeta?.toLowerCase().includes('noindex')) return true;
      if (p.robotsHeader?.toLowerCase().includes('noindex')) return true;
      return false;
    })
    .map(p => ({
      url: p.url,
      noindexSource: (p.noindexSurface as 'meta' | 'header' | 'both') || null,
      robotsMeta: p.robotsMeta || null,
      robotsHeader: p.robotsHeader || null,
      statusCode: p.statusCode
    }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

/**
 * Get summary statistics for noindex pages
 */
export function getNoindexStats(analysis: NoindexAnalysis[]) {
  return {
    totalNoindex: analysis.length,
    metaOnly: analysis.filter(a => a.noindexSource === 'meta').length,
    headerOnly: analysis.filter(a => a.noindexSource === 'header').length,
    both: analysis.filter(a => a.noindexSource === 'both').length
  };
}
