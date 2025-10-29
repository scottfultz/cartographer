/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";
import { iterateParts } from "../readers/atlsReader.js";
import { openAtlas } from "@atlas/sdk";
import type { PageRecord } from "@atlas/spec";
import type { AccessibilityRecord } from "../../core/extractors/accessibility.js";
import {
  analyzeRedirects,
  analyzeNoindex,
  validateCanonicals,
  validateSitemap,
  validateSocialTags,
  type RedirectAnalysis,
  type NoindexAnalysis,
  type CanonicalIssue,
  type SitemapIssue,
  type SocialIssue
} from "../analysis/index.js";

export type EnhancedReportType = 
  | 'redirects'
  | 'noindex'
  | 'canonicals'
  | 'sitemap'
  | 'social'
  | 'images';

interface EnhancedExportOptions {
  atlsPath: string;
  report: EnhancedReportType;
  outPath?: string;
}

/**
 * Field mappings for enhanced report types
 */
const ENHANCED_FIELD_MAPS: Record<EnhancedReportType, string[]> = {
  redirects: [
    'url',
    'finalUrl',
    'statusCode',
    'redirectCount',
    'redirectChain'
  ],
  noindex: [
    'url',
    'noindexSource',
    'robotsMeta',
    'robotsHeader',
    'statusCode'
  ],
  canonicals: [
    'url',
    'finalUrl',
    'hasCanonical',
    'canonicalUrl',
    'issues'
  ],
  sitemap: [
    'url',
    'issueType',
    'details'
  ],
  social: [
    'url',
    'hasOpenGraph',
    'hasTwitterCard',
    'issues'
  ],
  images: [
    'pageUrl',
    'missingAltCount',
    'missingAltSources'
  ]
};

/**
 * Export enhanced analysis reports from an .atls archive
 */
export async function exportEnhancedReport(options: EnhancedExportOptions): Promise<void> {
  const logToStderr = (level: string, msg: string) => {
    console.error(`[${level.toUpperCase()}] ${msg}`);
  };
  
  logToStderr("info", `Generating ${options.report} report from ${options.atlsPath}...`);
  
  try {
    let data: any[];
    
    switch (options.report) {
      case 'redirects':
        data = await generateRedirectsReport(options.atlsPath);
        break;
      case 'noindex':
        data = await generateNoindexReport(options.atlsPath);
        break;
      case 'canonicals':
        data = await generateCanonicalsReport(options.atlsPath);
        break;
      case 'sitemap':
        data = await generateSitemapReport(options.atlsPath);
        break;
      case 'social':
        data = await generateSocialReport(options.atlsPath);
        break;
      case 'images':
        data = await generateImagesReport(options.atlsPath);
        break;
      default:
        throw new Error(`Unknown report type: ${options.report}`);
    }
    
    // Write CSV
    await writeCsv(data, ENHANCED_FIELD_MAPS[options.report], options.outPath);
    
    logToStderr("info", `Export complete: ${data.length} records`);
  } catch (error) {
    logToStderr("error", `Export failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Generate redirects report
 */
async function generateRedirectsReport(atlsPath: string): Promise<RedirectAnalysis[]> {
  const pages: PageRecord[] = [];
  
  for await (const line of iterateParts(atlsPath, 'pages')) {
    pages.push(JSON.parse(line));
  }
  
  return analyzeRedirects(pages);
}

/**
 * Generate noindex report
 */
async function generateNoindexReport(atlsPath: string): Promise<NoindexAnalysis[]> {
  const pages: PageRecord[] = [];
  
  for await (const line of iterateParts(atlsPath, 'pages')) {
    pages.push(JSON.parse(line));
  }
  
  return analyzeNoindex(pages);
}

/**
 * Generate canonicals report
 */
async function generateCanonicalsReport(atlsPath: string): Promise<CanonicalIssue[]> {
  const pages: PageRecord[] = [];
  
  for await (const line of iterateParts(atlsPath, 'pages')) {
    pages.push(JSON.parse(line));
  }
  
  // Get redirect URLs for cross-reference
  const redirects = analyzeRedirects(pages);
  const redirectUrls = new Set(redirects.map(r => r.url));
  
  return validateCanonicals(pages, redirectUrls);
}

/**
 * Generate sitemap report
 * 
 * Note: Sitemap URLs are not currently stored in PageRecord.
 * This function expects the user to provide sitemap URLs manually
 * or extract them from robots.txt separately. For now, we'll analyze
 * pages without sitemap cross-reference.
 */
async function generateSitemapReport(atlsPath: string): Promise<SitemapIssue[]> {
  const pages: PageRecord[] = [];
  
  for await (const line of iterateParts(atlsPath, 'pages')) {
    const page = JSON.parse(line) as PageRecord;
    pages.push(page);
  }
  
  // For now, pass empty sitemap array. Users can provide sitemap URLs separately.
  // TODO: Extract sitemap URLs from robots.txt or add to PageRecord during crawl
  const sitemapUrls: string[] = [];
  
  return validateSitemap(pages, sitemapUrls);
}

/**
 * Generate social tags report
 */
async function generateSocialReport(atlsPath: string): Promise<SocialIssue[]> {
  const pages: PageRecord[] = [];
  
  for await (const line of iterateParts(atlsPath, 'pages')) {
    pages.push(JSON.parse(line));
  }
  
  return validateSocialTags(pages);
}

/**
 * Generate images alt text report from accessibility dataset
 */
async function generateImagesReport(atlsPath: string): Promise<any[]> {
  const atlas = await openAtlas(atlsPath);
  const results: any[] = [];
  
  // Check if accessibility dataset exists
  if (!atlas.datasets.has('accessibility')) {
    return results;
  }
  
  for await (const a11y of atlas.readers.accessibility()) {
    if (a11y.missingAltCount > 0) {
      results.push({
        pageUrl: a11y.pageUrl,
        missingAltCount: a11y.missingAltCount,
        missingAltSources: JSON.stringify(a11y.missingAltSources || [])
      });
    }
  }
  
  return results;
}

/**
 * Write data to CSV
 */
async function writeCsv(data: any[], fields: string[], outPath?: string): Promise<void> {
  const csvStream = format({
    headers: fields,
    writeHeaders: true,
    includeEndRowDelimiter: true
  });
  
  // Pipe to output
  if (outPath) {
    const output = createWriteStream(outPath);
    csvStream.pipe(output);
  } else {
    csvStream.pipe(process.stdout);
  }
  
  // Write each record
  for (const record of data) {
    const row = fields.map(field => {
      const value = record[field];
      
      // Handle null/undefined
      if (value == null) return "";
      
      // Convert arrays/objects to JSON strings
      if (typeof value === "object") return JSON.stringify(value);
      
      return value;
    });
    
    csvStream.write(row);
  }
  
  csvStream.end();
  
  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    csvStream.on("finish", resolve);
    csvStream.on("error", reject);
  });
}
