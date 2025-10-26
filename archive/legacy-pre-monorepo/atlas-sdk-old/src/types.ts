/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Atlas v1.0 Type Definitions for SDK
 */

export type RenderMode = "raw" | "prerender" | "full";
export type NavEndReason = "fetch" | "load" | "networkidle" | "timeout" | "error";
export type EdgeLocation = "nav" | "header" | "footer" | "aside" | "main" | "other" | "unknown";

/**
 * PageRecord - Complete page crawl data
 */
export interface PageRecord {
  url: string;
  finalUrl: string;
  normalizedUrl: string;
  urlKey: string;
  origin: string;
  pathname: string;
  section: string;
  statusCode: number;
  contentType?: string;
  fetchedAt: string;
  redirectChain?: string[];
  
  title?: string;
  metaDescription?: string;
  h1?: string;
  headings: { level: number; text: string }[];
  
  canonicalHref?: string;
  canonicalResolved?: string;
  canonical?: string;
  robotsMeta?: string;
  robotsHeader?: string;
  noindexSurface?: string;
  
  rawHtmlHash: string;
  domHash?: string;
  textSample: string;
  
  renderMode: RenderMode;
  renderMs?: number;
  fetchMs?: number;
  navEndReason: NavEndReason;
  
  internalLinksCount: number;
  externalLinksCount: number;
  mediaAssetsCount: number;
  mediaAssetsTruncated: boolean;
  
  hreflangLinks: Array<{ lang: string; url: string }>;
  
  depth: number;
  discoveredFrom?: string;
  discoveredInMode: RenderMode;
  
  basicFlags?: {
    hasTitle: boolean;
    hasMetaDescription: boolean;
    hasH1: boolean;
    hasCanonical: boolean;
  };
}

/**
 * EdgeRecord - Link between pages
 */
export interface EdgeRecord {
  fromUrl: string;
  toUrl: string;
  toUrlNormalized: string;
  anchorText: string;
  isExternal: boolean;
  location: EdgeLocation;
  discoveredInMode: RenderMode;
}

/**
 * AssetRecord - Media asset reference
 */
export interface AssetRecord {
  pageUrl: string;
  assetUrl: string;
  assetType: "image" | "video" | "audio" | "other";
  altText?: string;
  tagName: string;
}

/**
 * ErrorRecord - Crawl error
 */
export interface ErrorRecord {
  url: string;
  timestamp: string;
  phase: "fetch" | "render" | "extract" | "write";
  code?: string;
  message: string;
  stack?: string;
}

/**
 * AccessibilityRecord - Accessibility audit data
 */
export interface AccessibilityRecord {
  pageUrl: string;
  missingAltCount: number;
  missingAltSources?: string[];
  headingOrder: Array<"H1" | "H2" | "H3" | "H4" | "H5" | "H6">;
  landmarks: {
    header: boolean;
    nav: boolean;
    main: boolean;
    aside: boolean;
    footer: boolean;
  };
  roles: Record<string, number>;
  contrastViolations?: Array<{
    selector: string;
    fg?: string;
    bg?: string;
    ratio: number;
    level: "AA" | "AAA";
  }>;
  ariaIssues?: string[];
}

/**
 * AtlasManifest - Archive metadata
 */
export interface AtlasManifest {
  atlasVersion: string;
  
  owner: {
    name: string;
  };
  
  consumers: string[];
  
  hashing: {
    algorithm: string;
    urlKeyAlgo: string;
    rawHtmlHash: string;
    domHash: string;
  };
  
  parts: {
    pages: string[];
    edges: string[];
    assets: string[];
    errors: string[];
  };
  
  schemas: {
    pages: string;
    edges: string;
    assets: string;
    errors: string;
  };
  
  datasets?: {
    [key: string]: {
      present: boolean;
      parts: number;
      schema: string;
    };
  };
  
  capabilities?: {
    renderModes: RenderMode[];
    robots: {
      respectsRobotsTxt: boolean;
      overrideUsed: boolean;
    };
  };
  
  configIncluded: boolean;
  redactionApplied: boolean;
  
  notes: string[];
  
  integrity: {
    files: Record<string, string>;
  };
  
  createdAt: string;
  generator: string;
}

/**
 * AtlasSummary - Crawl statistics
 */
export interface AtlasSummary {
  totalPages: number;
  totalEdges: number;
  totalAssets: number;
  totalErrors: number;
  totalAccessibilityRecords?: number;
  
  statusCodes: Record<number, number>;
  renderModes: Record<RenderMode, number>;
  
  avgRenderMs?: number;
  maxDepth: number;
  
  crawlStartedAt: string;
  crawlCompletedAt: string;
  crawlDurationMs: number;
}

/**
 * Dataset names
 */
export type DatasetName = "pages" | "edges" | "assets" | "errors" | "accessibility";

/**
 * Union of all record types
 */
export type AnyRecord = PageRecord | EdgeRecord | AssetRecord | ErrorRecord | AccessibilityRecord;
