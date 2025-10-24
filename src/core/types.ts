/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Atlas v1.0 Type Definitions
 */

export type RenderMode = "raw" | "prerender" | "full";

export type NavEndReason = "fetch" | "load" | "networkidle" | "timeout" | "error";

export type EdgeLocation = "nav" | "header" | "footer" | "aside" | "main" | "other" | "unknown";

export type ParamPolicy = "sample" | "strip" | "keep";

/**
 * PageRecord - Complete page crawl data
 */
export interface PageRecord {
  url: string;
  finalUrl: string;
  normalizedUrl: string;
  urlKey: string; // SHA-1 hash of normalizedUrl
  origin: string;
  pathname: string;
  section: string; // Leading "/" + first path segment with trailing slash (e.g., "/products/")
  statusCode: number;
  contentType?: string;
  fetchedAt: string; // ISO timestamp
  redirectChain?: string[];
  
  // Title and meta
  title?: string;
  metaDescription?: string;
  h1?: string;
  headings: { level: number; text: string }[];
  
  // Canonical and robots
  canonicalHref?: string; // Verbatim from href attribute
  canonicalResolved?: string; // Absolute URL
  canonical?: string; // For backwards compatibility (same as canonicalResolved)
  robotsMeta?: string;
  robotsHeader?: string;
  noindexSurface?: string; // "meta" | "header" | "both" if noindex detected
  
  // Hashing and content
  rawHtmlHash: string; // SHA-256 of raw HTTP body
  domHash?: string; // SHA-256 of document.documentElement.outerHTML (only if rendered)
  textSample: string; // First 1500 bytes of body.innerText, whitespace collapsed
  
  // Render info
  renderMode: RenderMode;
  renderMs?: number;
  fetchMs?: number;
  navEndReason: NavEndReason;
  
  // Links and assets (counts only in PageRecord, full data in EdgeRecord/AssetRecord)
  internalLinksCount: number;
  externalLinksCount: number;
  mediaAssetsCount: number;
  mediaAssetsTruncated: boolean; // True if > 1000 assets
  
  // Hreflang
  hreflangLinks: Array<{ lang: string; url: string }>;
  
  // Depth and discovery
  depth: number;
  discoveredFrom?: string; // URL that linked to this page
  discoveredInMode: RenderMode;
  
  // Basic flags
  basicFlags?: {
    hasTitle: boolean;
    hasMetaDescription: boolean;
    hasH1: boolean;
    hasCanonical: boolean;
  };
  
  // Technical (all modes)
  securityHeaders?: {
    "content-security-policy"?: string;
    "strict-transport-security"?: string;
    "x-frame-options"?: string;
    "x-content-type-options"?: string;
    "referrer-policy"?: string;
    "permissions-policy"?: string;
  };
  faviconUrl?: string;
  
  // SEO & Tech (prerender/full modes only)
  structuredData?: Array<{
    type: "json-ld" | "microdata" | "microformat";
    schemaType?: string;
    data: any;
  }>;
  techStack?: string[]; // Detected technologies: ["React", "WordPress", etc.]
  
  // Performance (full mode only)
  performance?: {
    lcp?: number; // Largest Contentful Paint (ms)
    cls?: number; // Cumulative Layout Shift
    tbt?: number; // Total Blocking Time (ms)
    fcp?: number; // First Contentful Paint (ms)
    ttfb?: number; // Time to First Byte (ms)
  };
  
  // Media (full mode only)
  screenshotFile?: string; // "media/screenshots/{urlKey}.png"
  viewportFile?: string; // "media/viewports/{urlKey}.png"
  
  // Errors
  error?: string;
}

/**
 * EdgeRecord - Link from source to target
 */
export interface EdgeRecord {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  rel?: string;
  nofollow: boolean;
  isExternal: boolean;
  location: EdgeLocation; // nav, head, footer, aside, main, other
  selectorHint?: string; // CSS selector hint for debugging
  discoveredInMode: RenderMode;
  httpStatusAtTo?: number; // HTTP status code of target if visited during crawl
}

/**
 * AssetRecord - Media asset on a page
 */
export interface AssetRecord {
  pageUrl: string;
  assetUrl: string;
  type: "image" | "video";
  alt?: string;
  hasAlt: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
  displayWidth?: number;
  displayHeight?: number;
  estimatedBytes?: number;
  visible: boolean;
  inViewport: boolean;
  loading?: string; // "lazy" attribute
  wasLazyLoaded: boolean;
}

/**
 * ErrorRecord - Crawl error
 */
export interface ErrorRecord {
  url: string;
  origin: string; // For DNS/SSL triage
  hostname: string; // For host-level error grouping
  occurredAt: string; // ISO timestamp
  phase: "fetch" | "render" | "extract" | "write";
  code?: string;
  message: string;
  stack?: string;
}

/**
 * ConsoleRecord - Browser console message (full mode only)
 */
export interface ConsoleRecord {
  pageUrl: string;
  type: "log" | "warn" | "error" | "info";
  message: string;
  stackTrace?: string;
  source: "page" | "browser"; // Filter to only include "page" in dataset
  timestamp: string; // ISO timestamp
}

/**
 * ComputedTextNodeRecord - Computed styles for text nodes (full mode only)
 */
export interface ComputedTextNodeRecord {
  pageUrl: string;
  selector: string;
  textSample: string; // First 50 chars
  fontSize: string; // e.g., "16px"
  fontWeight: string; // e.g., "400", "700"
  color: string; // e.g., "rgb(51, 51, 51)"
  backgroundColor: string; // e.g., "rgb(255, 255, 255)"
  lineHeight?: string;
  nodeType: "TEXT_NODE";
}

/**
 * Engine Configuration
 */
export interface EngineConfig {
  seeds: string[];
  outAtls: string;
  maxPages: number; // 0 = unlimited
  maxDepth: number; // -1 = unlimited, 0 = seeds only, N = up to depth N

  /**
   * Additional config for public API
   */
  perHostRps?: number; // Requests per second per host (default 2)
  renderMode?: RenderMode; // "raw" | "prerender" | "full" (default "prerender")

  render: {
    mode: RenderMode;
    concurrency: number;
    timeoutMs: number;
    maxRequestsPerPage: number;
    maxBytesPerPage: number;
  };

  http: {
    rps: number; // requests per second
    userAgent: string;
  };

  discovery: {
    followExternal: boolean;
    paramPolicy: ParamPolicy;
    blockList: string[]; // Tracking params to strip (supports wildcards like "utm_*")
  };

  robots: {
    respect: boolean;
    overrideUsed: boolean;
  };

  memory?: {
    maxRssMB: number; // Maximum RSS memory in MB before pausing queue
  };

  accessibility?: {
    enabled: boolean; // Enable accessibility auditing (default true)
  };

  checkpoint?: {
  interval: number; // Write state.json every N pages (default 500)
  enabled: boolean; // Enable checkpointing (default true)
  everySeconds?: number; // Optional: time-based checkpointing
  };

  shutdown?: {
    gracefulTimeoutMs: number; // Max time to wait for graceful shutdown (default 15000)
  };

  resume?: {
    crawlId?: string; // Resume from this crawl ID
    stagingDir?: string; // Path to staging directory to resume from
  };

  manifestNotes?: string[]; // Optional notes to add to manifest

  cli?: {
    quiet?: boolean; // Suppress periodic metrics output
    json?: boolean; // Emit JSON summary to stdout
    errorBudget?: number; // Max errors before aborting (0 = unlimited)
    logFile?: string; // Path to NDJSON log file
    logLevel?: "info" | "warn" | "error" | "debug"; // Minimum log level
  };
}

/**
 * Public API config type (alias for EngineConfig)
 */
export type CrawlConfig = EngineConfig;

/**
 * Crawl state machine states
 */
export type CrawlState = "idle" | "running" | "paused" | "canceling" | "finalizing" | "done" | "failed";

/**
 * Progress snapshot for UI and events
 */
export interface CrawlProgress {
  queued: number;
  inFlight: number;
  completed: number;
  errors: number;
  pagesPerSecond: number;
  etaSeconds?: number;
  startedAt: string;
  updatedAt: string;
}

/**
 * Typed event stream for Cartographer
 */
export type CrawlEvent =
  | { type: "crawl.started"; crawlId: string; config: CrawlConfig; seq: number; timestamp: string }
  | { type: "page.fetched"; crawlId: string; url: string; statusCode: number; seq: number; timestamp: string }
  | { type: "page.parsed"; crawlId: string; url: string; record: PageRecord; seq: number; timestamp: string }
  | { type: "error.occurred"; crawlId: string; error: ErrorRecord; seq: number; timestamp: string }
  | { type: "checkpoint.saved"; crawlId: string; path: string; seq: number; timestamp: string }
  | { type: "crawl.heartbeat"; crawlId: string; progress: CrawlProgress; seq: number; timestamp: string }
  | { type: "crawl.backpressure"; crawlId: string; host: string; reason: string; hostsWithTokens: string[]; hostsDeferred: string[]; tokens?: number; queued?: number; seq?: number; timestamp?: string }
  | { type: "crawl.shutdown"; crawlId: string; reason: "cancel"|"error"; seq: number; timestamp: string }
  | { type: "crawl.finished"; crawlId: string; manifestPath: string; incomplete: boolean; seq: number; timestamp: string };

/**
 * Manifest for .atls file
 */
export interface AtlasManifest {
  atlasVersion: string; // "1.0"
  specVersion?: string;
  schemaVersion?: string;
  incomplete?: boolean;
  
  owner: {
    name: string; // "Cai Frazier"
  };
  
  consumers: string[]; // ["Continuum SEO", "Horizon Accessibility"]
  
  hashing: {
    algorithm: string; // "sha256"
    urlKeyAlgo: string; // "sha1"
    rawHtmlHash: string; // "sha256 of raw HTTP body"
    domHash: string; // "sha256 of document.documentElement.outerHTML"
  };
  
  parts: {
    pages: string[]; // ["pages/part-001.jsonl.zst", ...]
    edges: string[];
    assets: string[];
    errors: string[];
    console?: string[]; // Full mode only
    styles?: string[]; // Full mode only
  };
  
  schemas: {
    pages: string; // "schemas/pages.schema.json#1"
    edges: string;
    assets: string;
    errors: string;
    console?: string; // Full mode only
    styles?: string; // Full mode only
  };
  
  datasets?: {
    // Optional: Maps dataset name to metadata
    [key: string]: {
      name?: string;
      partCount?: number;
      recordCount?: number;
      bytes?: number;
      schema?: string;
      schemaVersion?: string;
      schemaHash?: string;
      present?: boolean;
      parts?: number;
    };
  };
  
  capabilities?: {
    renderModes: RenderMode[];
    modesUsed: RenderMode[]; // All modes used in crawl
    specLevel: 1 | 2 | 3; // 1=Raw, 2=Prerender, 3=Full
    dataSets: string[]; // ["pages", "edges", "assets", "errors", "console", "styles"]
    robots: {
      respectsRobotsTxt: boolean;
      overrideUsed: boolean;
    };
  };
  
  configIncluded: boolean;
  redactionApplied: boolean;
  
  notes: string[];
  
  integrity: {
    files: Record<string, string>; // filename -> sha256
  };
  
  createdAt: string; // ISO timestamp
  generator: string; // "cartographer-engine/1.0.0"
}

/**
 * Summary statistics
 */
export interface AtlasSummary {
  // Identity - "what" was crawled
  identity: {
    seedUrls: string[];
    primaryOrigin: string; // e.g., "https://drancich.com"
    domain: string; // e.g., "drancich.com"
    publicSuffix: string; // e.g., "com"
  };
  
  // Context - "how" and "why" it was crawled
  crawlContext: {
    specLevel: number; // 1 = Raw, 2 = Prerender, 3 = Full
    completionReason: "finished" | "capped" | "error_budget" | "manual";
    config: {
      maxPages?: number;
      maxDepth?: number;
      robotsRespect: boolean;
      followExternal: boolean;
    };
  };
  
  // Statistics - counts
  stats: {
    totalPages: number;
    totalEdges: number;
    totalAssets: number;
    totalErrors: number;
    totalAccessibilityRecords?: number; // Optional for backward compatibility
    totalConsoleRecords?: number; // Full mode only
    totalStyleRecords?: number; // Full mode only
    statusCodes: Record<number, number>;
    renderModes: Record<RenderMode, number>;
  };
  
  // Performance metrics
  performance: {
    avgRenderMs?: number;
    maxDepthReached: number; // Renamed from maxDepth
  };
  
  // Timestamps
  timestamps: {
    crawlStartedAt: string;
    crawlCompletedAt: string;
    crawlDurationMs: number;
  };
}

/**
 * Robots.txt cache entry
 */
export interface RobotsCacheEntry {
  origin: string;
  rules: string;
  etag?: string;
  fetchedAt: string;
  expiresAt: string;
}
