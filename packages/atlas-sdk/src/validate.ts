/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { openAtlas } from "./index.js";
import type { AtlasManifest, PageRecord, EdgeRecord, AssetRecord } from "./types.js";

/**
 * Validation issue severity levels
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Validation issue
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  dataset?: string;
  record?: any;
  details?: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    pagesChecked: number;
    edgesChecked: number;
    assetsChecked: number;
    errorsFound: number;
    warningsFound: number;
  };
}

/**
 * Validation options
 */
export interface ValidateOptions {
  /**
   * Check referential integrity (edges reference valid pages, etc.)
   * @default true
   */
  checkIntegrity?: boolean;
  
  /**
   * Check for broken internal links
   * @default true
   */
  checkBrokenLinks?: boolean;
  
  /**
   * Check manifest consistency with actual data
   * @default true
   */
  checkManifest?: boolean;
  
  /**
   * Maximum number of issues to collect before stopping
   * @default 1000
   */
  maxIssues?: number;
  
  /**
   * Only report errors, skip warnings
   * @default false
   */
  errorsOnly?: boolean;
}

/**
 * Validate an Atlas archive for schema compliance and referential integrity
 * 
 * Checks:
 * - Schema compliance: All records have required fields
 * - Referential integrity: Edges reference valid page IDs, assets have valid URLs
 * - Manifest consistency: Counts match actual data
 * - Broken links: Internal links that lead to 404s or errors
 * 
 * @param atlsPath Path to .atls file
 * @param options Validation options
 * @returns Validation result with issues and statistics
 * 
 * @example
 * ```typescript
 * const result = await validate('./crawl.atls');
 * 
 * if (!result.valid) {
 *   console.error(`Found ${result.stats.errorsFound} errors`);
 *   for (const issue of result.issues) {
 *     console.log(`[${issue.severity}] ${issue.code}: ${issue.message}`);
 *   }
 * }
 * ```
 */
export async function validate(
  atlsPath: string,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const {
    checkIntegrity = true,
    checkBrokenLinks = true,
    checkManifest = true,
    maxIssues = 1000,
    errorsOnly = false,
  } = options;
  
  const issues: ValidationIssue[] = [];
  const stats = {
    pagesChecked: 0,
    edgesChecked: 0,
    assetsChecked: 0,
    errorsFound: 0,
    warningsFound: 0,
  };
  
  // Helper to add issue
  const addIssue = (issue: ValidationIssue): boolean => {
    if (errorsOnly && issue.severity !== "error") {
      return true; // Skip non-errors
    }
    
    issues.push(issue);
    
    if (issue.severity === "error") {
      stats.errorsFound++;
    } else if (issue.severity === "warning") {
      stats.warningsFound++;
    }
    
    return issues.length < maxIssues;
  };
  
  try {
    const atlas = await openAtlas(atlsPath);
    
    // Phase 1: Check manifest schema
    if (checkManifest) {
      validateManifestSchema(atlas.manifest, addIssue);
    }
    
    // Phase 2: Build page index for integrity checks
    const pageUrls = new Set<string>();
    const pageStatusCodes = new Map<string, number>();
    
    for await (const page of atlas.readers.pages()) {
      stats.pagesChecked++;
      
      // Validate page schema
      if (!validatePageSchema(page, addIssue)) {
        continue; // Skip integrity checks if schema invalid
      }
      
      pageUrls.add(page.url);
      pageStatusCodes.set(page.url, page.statusCode);
      
      if (issues.length >= maxIssues) break;
    }
    
    // Phase 3: Validate edges
    if (checkIntegrity) {
      for await (const edge of atlas.readers.edges()) {
        stats.edgesChecked++;
        
        // Validate edge schema
        if (!validateEdgeSchema(edge, addIssue)) {
          continue;
        }
        
        // Check referential integrity
        if (!pageUrls.has(edge.sourceUrl)) {
          addIssue({
            severity: "error",
            code: "EDGE_INVALID_SOURCE",
            message: `Edge references non-existent source page: ${edge.sourceUrl}`,
            dataset: "edges",
            record: edge,
            details: { sourceUrl: edge.sourceUrl, targetUrl: edge.targetUrl },
          });
        }
        
        // Check for broken internal links
        if (checkBrokenLinks && !edge.isExternal && edge.targetUrl) {
          const targetStatus = pageStatusCodes.get(edge.targetUrl);
          if (targetStatus && (targetStatus === 404 || targetStatus >= 500)) {
            addIssue({
              severity: "warning",
              code: "EDGE_BROKEN_LINK",
              message: `Internal link leads to ${targetStatus}: ${edge.sourceUrl} → ${edge.targetUrl}`,
              dataset: "edges",
              record: edge,
              details: { sourceUrl: edge.sourceUrl, targetUrl: edge.targetUrl, statusCode: targetStatus },
            });
          }
        }
        
        if (issues.length >= maxIssues) break;
      }
    }
    
    // Phase 4: Validate assets
    for await (const asset of atlas.readers.assets()) {
      stats.assetsChecked++;
      
      // Validate asset schema
      if (!validateAssetSchema(asset, addIssue)) {
        continue;
      }
      
      // Check referential integrity
      if (checkIntegrity && !pageUrls.has(asset.pageUrl)) {
        addIssue({
          severity: "error",
          code: "ASSET_INVALID_REFERRER",
          message: `Asset references non-existent referrer page: ${asset.pageUrl}`,
          dataset: "assets",
          record: asset,
          details: { assetUrl: asset.assetUrl, pageUrl: asset.pageUrl },
        });
      }
      
      if (issues.length >= maxIssues) break;
    }
    
    // Phase 5: Check manifest counts
    if (checkManifest) {
      validateManifestCounts(atlas.manifest, {
        pages: stats.pagesChecked,
        edges: stats.edgesChecked,
        assets: stats.assetsChecked,
      }, addIssue);
    }
    
  } catch (error) {
    addIssue({
      severity: "error",
      code: "VALIDATION_FATAL",
      message: `Fatal validation error: ${error instanceof Error ? error.message : String(error)}`,
      details: { error: String(error) },
    });
  }
  
  return {
    valid: stats.errorsFound === 0,
    issues,
    stats,
  };
}

/**
 * Validate manifest schema
 */
function validateManifestSchema(
  manifest: AtlasManifest,
  addIssue: (issue: ValidationIssue) => boolean
): void {
  if (!manifest.atlasVersion) {
    addIssue({
      severity: "error",
      code: "MANIFEST_MISSING_VERSION",
      message: "Manifest missing atlasVersion field",
    });
  }
  
  if (!manifest.owner?.name) {
    addIssue({
      severity: "warning",
      code: "MANIFEST_MISSING_OWNER",
      message: "Manifest missing owner.name field",
    });
  }
  
  if (!manifest.generator) {
    addIssue({
      severity: "warning",
      code: "MANIFEST_MISSING_GENERATOR",
      message: "Manifest missing generator field",
    });
  }
  
  if (!manifest.parts || !manifest.parts.pages || manifest.parts.pages.length === 0) {
    addIssue({
      severity: "error",
      code: "MANIFEST_MISSING_PARTS",
      message: "Manifest missing parts.pages field or empty",
    });
  }
}

/**
 * Validate page record schema
 */
function validatePageSchema(
  page: PageRecord,
  addIssue: (issue: ValidationIssue) => boolean
): boolean {
  let valid = true;
  
  if (!page.url) {
    addIssue({
      severity: "error",
      code: "PAGE_MISSING_URL",
      message: "Page record missing url field",
      dataset: "pages",
      record: page,
    });
    valid = false;
  }
  
  if (!page.finalUrl) {
    addIssue({
      severity: "error",
      code: "PAGE_MISSING_FINAL_URL",
      message: `Page missing finalUrl: ${page.url}`,
      dataset: "pages",
      record: page,
    });
    valid = false;
  }
  
  if (typeof page.statusCode !== "number") {
    addIssue({
      severity: "error",
      code: "PAGE_MISSING_STATUS_CODE",
      message: `Page missing statusCode: ${page.url}`,
      dataset: "pages",
      record: page,
    });
    valid = false;
  }
  
  if (typeof page.depth !== "number" || page.depth < 0) {
    addIssue({
      severity: "error",
      code: "PAGE_INVALID_DEPTH",
      message: `Page has invalid depth: ${page.url} (depth: ${page.depth})`,
      dataset: "pages",
      record: page,
      details: { depth: page.depth },
    });
    valid = false;
  }
  
  if (!page.fetchedAt) {
    addIssue({
      severity: "warning",
      code: "PAGE_MISSING_TIMESTAMP",
      message: `Page missing fetchedAt timestamp: ${page.url}`,
      dataset: "pages",
      record: page,
    });
  }
  
  return valid;
}

/**
 * Validate edge record schema
 */
function validateEdgeSchema(
  edge: EdgeRecord,
  addIssue: (issue: ValidationIssue) => boolean
): boolean {
  let valid = true;
  
  if (!edge.sourceUrl) {
    addIssue({
      severity: "error",
      code: "EDGE_MISSING_SOURCE",
      message: "Edge record missing sourceUrl field",
      dataset: "edges",
      record: edge,
    });
    valid = false;
  }
  
  if (!edge.targetUrl) {
    addIssue({
      severity: "error",
      code: "EDGE_MISSING_TARGET",
      message: `Edge missing targetUrl field (sourceUrl: ${edge.sourceUrl})`,
      dataset: "edges",
      record: edge,
    });
    valid = false;
  }
  
  if (typeof edge.isExternal !== "boolean") {
    addIssue({
      severity: "warning",
      code: "EDGE_MISSING_IS_EXTERNAL",
      message: `Edge missing isExternal flag: ${edge.sourceUrl} → ${edge.targetUrl}`,
      dataset: "edges",
      record: edge,
    });
  }
  
  return valid;
}

/**
 * Validate asset record schema
 */
function validateAssetSchema(
  asset: AssetRecord,
  addIssue: (issue: ValidationIssue) => boolean
): boolean {
  let valid = true;
  
  if (!asset.assetUrl) {
    addIssue({
      severity: "error",
      code: "ASSET_MISSING_URL",
      message: "Asset record missing assetUrl field",
      dataset: "assets",
      record: asset,
    });
    valid = false;
  }
  
  if (!asset.pageUrl) {
    addIssue({
      severity: "error",
      code: "ASSET_MISSING_PAGE_URL",
      message: `Asset missing pageUrl: ${asset.assetUrl}`,
      dataset: "assets",
      record: asset,
    });
    valid = false;
  }
  
  if (!asset.type || !["image", "video"].includes(asset.type)) {
    addIssue({
      severity: "warning",
      code: "ASSET_INVALID_TYPE",
      message: `Asset has invalid type: ${asset.assetUrl} (type: ${asset.type})`,
      dataset: "assets",
      record: asset,
      details: { type: asset.type },
    });
  }
  
  return valid;
}

/**
 * Validate manifest counts against actual data
 */
function validateManifestCounts(
  manifest: AtlasManifest,
  actual: { pages: number; edges: number; assets: number },
  addIssue: (issue: ValidationIssue) => boolean
): void {
  // Get counts from datasets if available
  const manifestPages = manifest.datasets?.pages?.recordCount ?? 0;
  const manifestEdges = manifest.datasets?.edges?.recordCount ?? 0;
  const manifestAssets = manifest.datasets?.assets?.recordCount ?? 0;
  
  if (manifestPages !== actual.pages) {
    addIssue({
      severity: "error",
      code: "MANIFEST_COUNT_MISMATCH_PAGES",
      message: `Manifest pages count mismatch: manifest=${manifestPages}, actual=${actual.pages}`,
      details: { manifest: manifestPages, actual: actual.pages },
    });
  }
  
  if (manifestEdges !== actual.edges) {
    addIssue({
      severity: "error",
      code: "MANIFEST_COUNT_MISMATCH_EDGES",
      message: `Manifest edges count mismatch: manifest=${manifestEdges}, actual=${actual.edges}`,
      details: { manifest: manifestEdges, actual: actual.edges },
    });
  }
  
  if (manifestAssets !== actual.assets) {
    addIssue({
      severity: "error",
      code: "MANIFEST_COUNT_MISMATCH_ASSETS",
      message: `Manifest assets count mismatch: manifest=${manifestAssets}, actual=${actual.assets}`,
      details: { manifest: manifestAssets, actual: actual.assets },
    });
  }
}
