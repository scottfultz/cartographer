/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Atlas v1.0 Type Definitions
 * 
 * Core types for Atlas archive specification.
 * Used by both the Cartographer engine and Atlas SDK.
 */

// ============================================================================
// Enum Codification (Atlas v1.0 Enhancement #7)
// ============================================================================

/**
 * Render modes define the level of JavaScript execution during crawling.
 * 
 * - raw: No JavaScript execution, HTML only
 * - prerender: Wait for page load event
 * - full: Wait for network idle + run accessibility audits
 */
export const RenderMode = {
  /** No JavaScript execution, HTML only */
  RAW: 'raw' as const,
  /** Wait for page load event */
  PRERENDER: 'prerender' as const,
  /** Wait for network idle + run accessibility audits */
  FULL: 'full' as const,
  /** All valid render mode values */
  values: ['raw', 'prerender', 'full'] as const,
  /** Human-readable descriptions */
  descriptions: {
    raw: 'No JavaScript execution, HTML only',
    prerender: 'Wait for page load event',
    full: 'Wait for network idle + run accessibility audits'
  }
} as const;

export type RenderMode = typeof RenderMode.values[number];

/**
 * Type guard for RenderMode validation
 */
export function isRenderMode(value: unknown): value is RenderMode {
  return typeof value === 'string' && RenderMode.values.includes(value as any);
}

/**
 * Navigation end reasons document why page navigation completed.
 * 
 * - fetch: Response received but not processed
 * - load: DOMContentLoaded event fired
 * - networkidle: Network idle (2 connections for 500ms)
 * - timeout: Navigation timeout exceeded
 * - error: Navigation error occurred
 */
export const NavEndReason = {
  /** Response received but not processed */
  FETCH: 'fetch' as const,
  /** DOMContentLoaded event fired */
  LOAD: 'load' as const,
  /** Network idle (2 connections for 500ms) */
  NETWORKIDLE: 'networkidle' as const,
  /** Navigation timeout exceeded */
  TIMEOUT: 'timeout' as const,
  /** Navigation error occurred */
  ERROR: 'error' as const,
  /** All valid navigation end reasons */
  values: ['fetch', 'load', 'networkidle', 'timeout', 'error'] as const,
  /** Human-readable descriptions */
  descriptions: {
    fetch: 'Response received but not processed',
    load: 'DOMContentLoaded event fired',
    networkidle: 'Network idle (2 connections for 500ms)',
    timeout: 'Navigation timeout exceeded',
    error: 'Navigation error occurred'
  }
} as const;

export type NavEndReason = typeof NavEndReason.values[number];

/**
 * Type guard for NavEndReason validation
 */
export function isNavEndReason(value: unknown): value is NavEndReason {
  return typeof value === 'string' && NavEndReason.values.includes(value as any);
}

/**
 * Edge locations indicate where in the DOM a link was discovered.
 * Used for link context and navigation pattern analysis.
 * 
 * - nav: Navigation menu (<nav> element)
 * - header: Page header
 * - footer: Page footer
 * - aside: Sidebar or aside content
 * - main: Main content area
 * - other: Other semantic location
 * - unknown: Location could not be determined
 */
export const EdgeLocation = {
  /** Navigation menu (<nav> element) */
  NAV: 'nav' as const,
  /** Page header */
  HEADER: 'header' as const,
  /** Page footer */
  FOOTER: 'footer' as const,
  /** Sidebar or aside content */
  ASIDE: 'aside' as const,
  /** Main content area */
  MAIN: 'main' as const,
  /** Other semantic location */
  OTHER: 'other' as const,
  /** Location could not be determined */
  UNKNOWN: 'unknown' as const,
  /** All valid edge locations */
  values: ['nav', 'header', 'footer', 'aside', 'main', 'other', 'unknown'] as const,
  /** Human-readable descriptions */
  descriptions: {
    nav: 'Navigation menu (<nav> element)',
    header: 'Page header',
    footer: 'Page footer',
    aside: 'Sidebar or aside content',
    main: 'Main content area',
    other: 'Other semantic location',
    unknown: 'Location could not be determined'
  }
} as const;

export type EdgeLocation = typeof EdgeLocation.values[number];

/**
 * Type guard for EdgeLocation validation
 */
export function isEdgeLocation(value: unknown): value is EdgeLocation {
  return typeof value === 'string' && EdgeLocation.values.includes(value as any);
}

/**
 * Link type classification for semantic link analysis (Atlas v1.0 Enhancement - Phase 4)
 */
export const LinkType = {
  values: [
    'navigation',   // Primary/secondary navigation links
    'content',      // In-content editorial links
    'action',       // CTAs, buttons styled as links
    'footer',       // Footer utility links
    'breadcrumb',   // Breadcrumb navigation
    'pagination',   // Next/prev/page number links
    'skip',         // Skip-to-content accessibility links
    'social',       // Social media links
    'download',     // File download links
    'external',     // Explicitly marked external links
    'related',      // Related content/suggestions
    'tag',          // Tag/category links
    'author',       // Author profile links
    'other'         // Other/unclassified
  ] as const,
  descriptions: {
    navigation: 'Primary or secondary navigation link',
    content: 'In-content editorial link',
    action: 'Call-to-action or button-styled link',
    footer: 'Footer utility link',
    breadcrumb: 'Breadcrumb navigation link',
    pagination: 'Pagination control link',
    skip: 'Skip-to-content accessibility link',
    social: 'Social media link',
    download: 'File download link',
    external: 'Explicitly marked external link',
    related: 'Related content or suggestion',
    tag: 'Tag or category link',
    author: 'Author profile link',
    other: 'Other or unclassified link'
  }
} as const;

export type LinkType = typeof LinkType.values[number];

/**
 * Type guard for LinkType validation
 */
export function isLinkType(value: unknown): value is LinkType {
  return typeof value === 'string' && LinkType.values.includes(value as any);
}

/**
 * Parameter policies control URL query parameter handling.
 * 
 * - sample: Keep only first occurrence of each parameter
 * - strip: Remove all query parameters
 * - keep: Preserve all parameters
 */
export const ParamPolicy = {
  /** Keep only first occurrence of each parameter */
  SAMPLE: 'sample' as const,
  /** Remove all query parameters */
  STRIP: 'strip' as const,
  /** Preserve all parameters */
  KEEP: 'keep' as const,
  /** All valid parameter policies */
  values: ['sample', 'strip', 'keep'] as const,
  /** Human-readable descriptions */
  descriptions: {
    sample: 'Keep only first occurrence of each parameter',
    strip: 'Remove all query parameters',
    keep: 'Preserve all parameters'
  }
} as const;

export type ParamPolicy = typeof ParamPolicy.values[number];

/**
 * Type guard for ParamPolicy validation
 */
export function isParamPolicy(value: unknown): value is ParamPolicy {
  return typeof value === 'string' && ParamPolicy.values.includes(value as any);
}

/**
 * Detected technology/tool on a page
 */
export interface Technology {
  name: string;
  version?: string;
  categories?: string[];
}

/**
 * PageRecord - Complete page crawl data
 */
export interface PageRecord {
  // === STABLE IDENTIFIER (Atlas v1.0 Enhancement) ===
  page_id?: string; // UUID v7 (time-ordered, globally unique) - Optional for backward compat
  
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
  
  // Social metadata (top-level fields for easy access)
  openGraph?: Record<string, string | undefined>; // OpenGraph metadata (og:title, og:description, etc.)
  twitterCard?: Record<string, string | undefined>; // Twitter Card metadata (twitter:card, twitter:title, etc.)
  technologies?: Technology[]; // Detected technologies (alternative field name to techStack)
  
  // Canonical and robots
  canonicalHref?: string; // Verbatim from href attribute
  canonicalResolved?: string; // Absolute URL
  canonical?: string; // For backwards compatibility (same as canonicalResolved)
  robotsMeta?: string;
  robotsHeader?: string;
  noindexSurface?: string; // "meta" | "header" | "both" if noindex detected
  
  // Hashing and content (Atlas v1.0 Enhancement)
  rawHtmlHash: string; // SHA-256 of raw HTTP body
  domHash?: string; // SHA-256 of document.documentElement.outerHTML (only if rendered)
  contentHash?: string; // SHA-256 of normalized text content (for change detection)
  textSample: string; // First 1500 bytes of body.innerText, whitespace collapsed
  
  // Temporal tracking (Atlas v1.0 Enhancement)
  previous_page_id?: string; // page_id from previous crawl (for re-crawl diffing)
  content_changed?: boolean; // Did content change since last crawl?
  dom_changed?: boolean; // Did DOM change since last crawl?
  
  // Response metadata (Atlas v1.0 Enhancement - Phase 5)
  response_headers?: {
    // Content headers
    content_type?: string;           // Full Content-Type header value
    content_length?: number;         // Response size in bytes
    content_encoding?: string;       // gzip, br, deflate, etc.
    // Caching headers
    cache_control?: string;          // Cache-Control directives
    expires?: string;                // Expires header (ISO timestamp)
    etag?: string;                   // Entity tag for caching
    last_modified?: string;          // Last-Modified header (ISO timestamp)
    age?: number;                    // Age header (seconds)
    // CDN & Server identification
    server?: string;                 // Server header (nginx, Apache, etc.)
    x_powered_by?: string;           // X-Powered-By header (PHP, ASP.NET, etc.)
    via?: string;                    // Via header (proxy/CDN chain)
    x_cache?: string;                // X-Cache header (HIT, MISS, etc.)
    cf_cache_status?: string;        // Cloudflare cache status
    x_amz_cf_id?: string;            // AWS CloudFront request ID
    x_cdn_provider?: string;         // Detected CDN provider
    // Security headers (already in securityHeaders, but kept here for completeness)
    strict_transport_security?: string;
    content_security_policy?: string;
    x_frame_options?: string;
    x_content_type_options?: string;
    referrer_policy?: string;
    permissions_policy?: string;
    // Additional useful headers
    vary?: string;                   // Vary header (affects caching)
    pragma?: string;                 // Legacy cache control
    date?: string;                   // Server date (ISO timestamp)
    connection?: string;             // Connection header
    transfer_encoding?: string;      // chunked, compress, etc.
  };
  
  cdn_indicators?: {
    detected: boolean;               // True if CDN was detected
    provider?: string;               // cloudflare, fastly, cloudfront, akamai, etc.
    confidence: "high" | "medium" | "low";  // Detection confidence
    signals: string[];               // Array of detection signals (header names, IP ranges, etc.)
  };
  
  compression_details?: {
    algorithm?: "gzip" | "br" | "deflate" | "none";  // Compression algorithm used
    original_size?: number;          // Uncompressed size (if available)
    compressed_size?: number;        // Compressed size from Content-Length
    compression_ratio?: number;      // original_size / compressed_size (if calculable)
    supports_brotli?: boolean;       // Server advertises Brotli support
  };
  
  // Detailed timing breakdown (Atlas v1.0 Enhancement - Phase 3)
  timing?: {
    fetch_started_at?: string;    // ISO timestamp when fetch began
    fetch_completed_at?: string;  // ISO timestamp when fetch completed
    render_started_at?: string;   // ISO timestamp when render began (if mode != raw)
    render_completed_at?: string; // ISO timestamp when render completed (if mode != raw)
  };
  
  // Render timing (Atlas v1.0 Enhancement - Phase 3B)
  wait_condition?: "domcontentloaded" | "networkidle0" | "networkidle2" | "load";
  timings?: {
    nav_start: number;              // Performance.timeOrigin
    dom_content_loaded?: number;    // DOMContentLoaded timestamp
    load_event_end?: number;        // Load event timestamp
    network_idle_reached?: number;  // Network idle timestamp (if applicable)
    first_paint?: number;           // First Paint (if available)
    first_contentful_paint?: number; // FCP (if available)
  };
  
  // Render info
  renderMode: RenderMode;
  renderMs?: number;
  fetchMs?: number;
  navEndReason: NavEndReason;
  challengePageCaptured?: boolean; // True if this is a challenge page (content not reliable)
  
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
  
  // Content & Encoding
  encoding?: {
    encoding: string;
    source: "meta" | "header" | "detected";
  };
  compression?: {
    compression?: "gzip" | "brotli" | "deflate" | "none" | string;
    contentEncoding?: string;
  };
  
  // Resource Counts
  resourceCounts?: {
    cssCount: number;
    jsCount: number;
    fontCount: number;
    inlineStyles: number;
    inlineScripts: number;
  };
  
  // Mobile & Viewport
  viewportMeta?: {
    content: string;
    width?: string;
    initialScale?: number;
    hasViewport: boolean;
  };
  
  // Security & Best Practices
  mixedContentIssues?: Array<{
    assetUrl: string;
    type: "script" | "stylesheet" | "image" | "video" | "audio" | "iframe" | "other";
  }>;
  subresourceIntegrity?: {
    totalScripts: number;
    totalStyles: number;
    scriptsWithSRI: number;
    stylesWithSRI: number;
    missingResources?: Array<{url: string; type: "script" | "stylesheet"}>;
  };
  
  // SEO & Tech (prerender/full modes only)
  structuredData?: Array<{
    type: "json-ld" | "microdata" | "microformat" | "opengraph" | "twittercard";
    schemaType?: string;
    data: any;
  }>;
  techStack?: string[]; // Detected technologies: ["React", "WordPress", etc.]
  
  // SEO Quick Wins (data collection)
  seo?: {
    sitemap?: {
      hasSitemap: boolean;
      sitemapUrls: string[]; // Found via robots.txt or common locations
    };
    brokenLinksCount?: number; // Count of outbound links with HTTP >= 400
    outboundDomains?: string[]; // Unique external domains linked from this page
  };
  
  // Performance (full mode only)
  performance?: {
    // Core Web Vitals
    lcp?: number; // Largest Contentful Paint (ms)
    cls?: number; // Cumulative Layout Shift
    tbt?: number; // Total Blocking Time (ms)
    fcp?: number; // First Contentful Paint (ms)
    ttfb?: number; // Time to First Byte (ms)
    fid?: number; // First Input Delay (ms) - Legacy Core Web Vital
    inp?: number; // Interaction to Next Paint (ms) - Core Web Vital (replaces FID)
    speedIndex?: number; // Speed Index
    tti?: number; // Time to Interactive (ms)
    jsExecutionTime?: number; // JavaScript execution time (ms)
    
    // Lighthouse-style scores (0-100)
    scores?: {
      performance?: number;
      accessibility?: number;
      bestPractices?: number;
      seo?: number;
    };
    
    // Resource metrics
    renderBlockingResources?: Array<{
      url: string;
      type: "script" | "stylesheet";
      size?: number;
    }>;
    thirdPartyRequestCount?: number;
  };
  
  // Network Performance (collected with --performance flag)
  network?: {
    totalRequests: number;
    totalBytes: number;
    totalDuration?: number; // Total time from first to last request (ms)
    
    // Breakdown by resource type
    breakdown: {
      document: { count: number; bytes: number };
      stylesheet: { count: number; bytes: number };
      script: { count: number; bytes: number };
      image: { count: number; bytes: number };
      font: { count: number; bytes: number };
      media: { count: number; bytes: number };
      xhr: { count: number; bytes: number };
      fetch: { count: number; bytes: number };
      other: { count: number; bytes: number };
    };
    
    // Compression analysis
    compression: {
      gzip: number;
      brotli: number;
      deflate: number;
      none: number;
      uncompressibleTypes: number;
    };
    
    // Status code summary
    statusCodes: {
      [code: number]: number;
    };
    
    // Cache performance
    cachedRequests: number;
    uncachedRequests: number;
  };
  
  // Enhanced SEO metadata
  enhancedSEO?: {
    // Indexability
    indexability: {
      isNoIndex: boolean;
      isNoFollow: boolean;
    };
    
    // Content metrics
    content: {
      titleLength?: { characters: number; pixels: number };
      descriptionLength?: { characters: number; pixels: number };
      h1Count: number;
      h2Count: number;
      h3Count: number;
      h4Count: number;
      h5Count: number;
      h6Count: number;
      wordCount: number;
      textContentLength: number;
    };
    
    // International
    international: {
      hreflangCount: number;
      hreflangErrors?: string[];
    };
    
    // Social (OpenGraph & Twitter)
    social: {
      hasOpenGraph: boolean;
      hasTwitterCard: boolean;
    };
    
    // Schema
    schema: {
      hasJsonLd: boolean;
      hasMicrodata: boolean;
      schemaTypes: string[];
    };
  };
  
  // Media
  media?: {
    screenshots?: {
      desktop?: string; // "media/screenshots/desktop/{urlHash}.jpg"
      mobile?: string;  // "media/screenshots/mobile/{urlHash}.jpg"
    };
    favicon?: string;   // "media/favicons/{originHash}.{ext}"
  };
  
  // Deprecated fields (kept for backward compatibility)
  screenshotFile?: string; // Legacy: "media/screenshots/{urlKey}.png"
  viewportFile?: string; // Legacy: "media/viewports/{urlKey}.png"
  
  // Errors
  error?: string;
}

/**
 * EdgeRecord - Link from source to target
 */
export interface EdgeRecord {
  // === STABLE REFERENCES (Atlas v1.0 Enhancement) ===
  source_page_id?: string; // UUID of source page - Optional for backward compat
  target_page_id?: string; // UUID of target page (if crawled) - Optional for backward compat
  
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  rel?: string;
  nofollow: boolean;
  sponsored?: boolean; // Link has rel="sponsored"
  ugc?: boolean; // Link has rel="ugc" (user-generated content)
  isExternal: boolean;
  location: EdgeLocation; // nav, head, footer, aside, main, other
  selectorHint?: string; // CSS selector hint for debugging
  discoveredInMode: RenderMode;
  httpStatusAtTo?: number; // HTTP status code of target if visited during crawl
  
  // === LINK CONTEXT (Atlas v1.0 Enhancement - Phase 4) ===
  link_type?: LinkType; // Semantic classification: navigation, content, action, etc.
  target_attr?: string; // Link target attribute (_blank, _self, _parent, _top)
  title_attr?: string; // Link title attribute (tooltip text)
  download_attr?: string | boolean; // Download attribute (filename or true)
  hreflang?: string; // Language code for linked resource
  type_attr?: string; // MIME type hint for linked resource
  aria_label?: string; // Accessible label (overrides anchor text)
  role?: string; // ARIA role attribute
  is_primary_nav?: boolean; // Link is in primary navigation
  is_breadcrumb?: boolean; // Link is part of breadcrumb trail
  is_skip_link?: boolean; // Link is a skip-to-content link
  is_pagination?: boolean; // Link is part of pagination controls
}

/**
 * AssetRecord - Media asset on a page
 */
export interface AssetRecord {
  // === STABLE REFERENCES (Atlas v1.0 Enhancement) ===
  page_id?: string; // UUID of page containing asset - Optional for backward compat
  asset_id?: string; // UUID v5(namespace, assetUrl) - deterministic - Optional for backward compat
  
  pageUrl: string;
  assetUrl: string;
  type: "image" | "video" | "audio";
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
  
  // === RESPONSIVE IMAGES (Atlas v1.0 Enhancement - Phase 6) ===
  
  /**
   * Srcset attribute value (comma-separated image candidates with descriptors)
   * Example: "small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
   */
  srcset?: string;
  
  /**
   * Parsed srcset candidates for programmatic analysis
   */
  srcset_candidates?: Array<{
    url: string;          // Resolved URL
    descriptor: string;   // "480w", "1.5x", etc.
    width?: number;       // Pixel width (from "w" descriptor)
    density?: number;     // Pixel density (from "x" descriptor)
  }>;
  
  /**
   * Sizes attribute (media queries for responsive selection)
   * Example: "(max-width: 600px) 480px, (max-width: 900px) 800px, 1200px"
   */
  sizes?: string;
  
  /**
   * Parent picture element info (if image is inside <picture>)
   */
  picture_context?: {
    has_picture_parent: boolean;
    source_count: number;      // Number of <source> elements
    sources?: Array<{
      srcset: string;
      media?: string;          // Media query
      type?: string;           // MIME type (e.g., "image/webp")
    }>;
  };
  
  // === VIDEO/AUDIO METADATA (Atlas v1.0 Enhancement - Phase 6) ===
  
  /**
   * Video/audio duration in seconds (from runtime inspection)
   */
  duration?: number;
  
  /**
   * MIME type from type attribute or Content-Type header
   * Examples: "video/mp4", "video/webm", "audio/mpeg", "audio/wav"
   */
  mime_type?: string;
  
  /**
   * Video/audio controls
   */
  has_controls?: boolean;
  
  /**
   * Autoplay flag
   */
  autoplay?: boolean;
  
  /**
   * Loop flag
   */
  loop?: boolean;
  
  /**
   * Muted flag
   */
  muted?: boolean;
  
  /**
   * Preload strategy: "none", "metadata", "auto"
   */
  preload?: string;
  
  /**
   * Poster image URL (for video)
   */
  poster?: string;
  
  /**
   * Track elements (captions, subtitles, etc.)
   */
  tracks?: Array<{
    kind: string;        // "captions", "subtitles", "descriptions", "chapters", "metadata"
    src: string;
    srclang?: string;
    label?: string;
  }>;
  
  /**
   * Source elements (for video/audio with multiple formats)
   */
  sources?: Array<{
    src: string;
    type?: string;       // MIME type
  }>;
  
  // === LAZY LOADING DETECTION (Atlas v1.0 Enhancement - Phase 6) ===
  
  /**
   * Lazy loading strategy detected
   */
  lazy_strategy?: "native" | "intersection-observer" | "data-src" | "none";
  
  /**
   * Data attributes used for lazy loading
   */
  lazy_data_attrs?: {
    data_src?: string;
    data_srcset?: string;
    data_sizes?: string;
    data_bg?: string;
    [key: string]: string | undefined;
  };
  
  /**
   * Class names that indicate lazy loading (e.g., "lazyload", "lazy")
   */
  lazy_classes?: string[];
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

// ============================================================================
// Event Log Dataset (Atlas v1.0 Phase 7)
// ============================================================================

/**
 * EventRecord - Operational event log for debugging and monitoring
 * 
 * Captures render failures, rate limiting, challenge detection, resource
 * consumption peaks, and performance metrics for operational insights.
 * 
 * @since Atlas v1.0 Phase 7
 */
export interface EventRecord {
  // Core identification
  event_id: string;                  // UUID v7 for event tracking
  crawl_id: string;                  // Crawl identifier
  occurred_at: string;               // ISO 8601 timestamp
  
  // Event classification
  event_type: EventType;             // Event category (see EventType enum)
  severity: EventSeverity;           // info | warn | error | critical
  
  // Context
  url?: string;                      // Associated URL (if applicable)
  hostname?: string;                 // Hostname for grouping
  page_id?: string;                  // Page UUID v7 (if applicable)
  
  // Event details
  message: string;                   // Human-readable description
  details?: Record<string, any>;     // Structured event data
  
  // Performance metrics (when applicable)
  metrics?: {
    duration_ms?: number;            // Operation duration
    memory_rss_mb?: number;          // RSS memory at event time
    queue_depth?: number;            // Queue size at event time
    concurrent_requests?: number;    // Active requests
  };
  
  // Rate limiting context (for throttle events)
  rate_limit?: {
    host: string;                    // Affected host
    status_code?: number;            // HTTP status (429, 503)
    retry_after?: number;            // Retry-After header (seconds)
    backoff_ms?: number;             // Applied backoff duration
    attempts?: number;               // Retry attempt number
  };
  
  // Challenge detection (for bot/captcha challenges)
  challenge?: {
    provider?: string;               // Cloudflare, Akamai, etc.
    detection_confidence: "high" | "medium" | "low";
    resolution_attempted: boolean;   // Whether we tried to resolve
    resolution_success?: boolean;    // Resolution outcome
    wait_duration_ms?: number;       // How long we waited
  };
  
  // Resource consumption (for memory/cpu alerts)
  resource_usage?: {
    cpu_percent?: number;            // CPU usage percentage
    memory_heap_mb?: number;         // Heap memory (MB)
    memory_external_mb?: number;     // External memory (MB)
    gc_duration_ms?: number;         // Garbage collection time
  };
}

/**
 * Event type categories for operational event classification
 */
export const EventType = {
  // Crawl lifecycle
  CRAWL_STARTED: 'crawl.started' as const,
  CRAWL_PAUSED: 'crawl.paused' as const,
  CRAWL_RESUMED: 'crawl.resumed' as const,
  CRAWL_COMPLETED: 'crawl.completed' as const,
  CRAWL_ABORTED: 'crawl.aborted' as const,
  
  // Render operations
  RENDER_SUCCESS: 'render.success' as const,
  RENDER_FAILURE: 'render.failure' as const,
  RENDER_TIMEOUT: 'render.timeout' as const,
  RENDER_CHALLENGE_DETECTED: 'render.challenge_detected' as const,
  RENDER_CHALLENGE_RESOLVED: 'render.challenge_resolved' as const,
  
  // Rate limiting & throttling
  RATE_LIMIT_HIT: 'rate_limit.hit' as const,
  RATE_LIMIT_BACKOFF: 'rate_limit.backoff' as const,
  RATE_LIMIT_RESUMED: 'rate_limit.resumed' as const,
  BACKPRESSURE_APPLIED: 'backpressure.applied' as const,
  BACKPRESSURE_RELEASED: 'backpressure.released' as const,
  
  // Resource management
  RESOURCE_LIMIT_EXCEEDED: 'resource.limit_exceeded' as const,
  MEMORY_PRESSURE_HIGH: 'resource.memory_pressure_high' as const,
  MEMORY_PRESSURE_NORMAL: 'resource.memory_pressure_normal' as const,
  BROWSER_CONTEXT_RECYCLED: 'resource.browser_context_recycled' as const,
  
  // Network & connectivity
  NETWORK_ERROR: 'network.error' as const,
  DNS_RESOLUTION_FAILED: 'network.dns_failed' as const,
  SSL_ERROR: 'network.ssl_error' as const,
  CONNECTION_TIMEOUT: 'network.connection_timeout' as const,
  
  // Data quality
  VALIDATION_WARNING: 'validation.warning' as const,
  VALIDATION_ERROR: 'validation.error' as const,
  EXTRACTION_FAILED: 'extraction.failed' as const,
  
  // Checkpoint & recovery
  CHECKPOINT_SAVED: 'checkpoint.saved' as const,
  CHECKPOINT_LOADED: 'checkpoint.loaded' as const,
  CHECKPOINT_FAILED: 'checkpoint.failed' as const,
  
  // Heartbeat & observability
  HEARTBEAT: 'observability.heartbeat' as const,
  METRICS_SNAPSHOT: 'observability.metrics_snapshot' as const,
  
  /** All valid event type values */
  values: [
    'crawl.started', 'crawl.paused', 'crawl.resumed', 'crawl.completed', 'crawl.aborted',
    'render.success', 'render.failure', 'render.timeout', 'render.challenge_detected', 'render.challenge_resolved',
    'rate_limit.hit', 'rate_limit.backoff', 'rate_limit.resumed', 'backpressure.applied', 'backpressure.released',
    'resource.limit_exceeded', 'resource.memory_pressure_high', 'resource.memory_pressure_normal', 'resource.browser_context_recycled',
    'network.error', 'network.dns_failed', 'network.ssl_error', 'network.connection_timeout',
    'validation.warning', 'validation.error', 'extraction.failed',
    'checkpoint.saved', 'checkpoint.loaded', 'checkpoint.failed',
    'observability.heartbeat', 'observability.metrics_snapshot'
  ] as const
} as const;

export type EventType = typeof EventType.values[number];

/**
 * Event severity levels for filtering and alerting
 */
export const EventSeverity = {
  INFO: 'info' as const,
  WARN: 'warn' as const,
  ERROR: 'error' as const,
  CRITICAL: 'critical' as const,
  
  values: ['info', 'warn', 'error', 'critical'] as const
} as const;

export type EventSeverity = typeof EventSeverity.values[number];

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
  
  media?: {
    screenshots?: {
      enabled: boolean;           // Enable screenshot capture
      desktop: boolean;           // Desktop viewport (1280×720)
      mobile: boolean;            // Mobile viewport (375×667)
      quality: number;            // JPEG quality 1-100 (default: 80)
      format: 'png' | 'jpeg';     // Image format (default: jpeg)
    };
    favicons?: {
      enabled: boolean;           // Enable favicon collection
    };
  };
  
  replay?: {
    tier: 'html' | 'html+css' | 'full';  // Replay capture tier
  };

  http: {
    rps: number; // requests per second
    userAgent: string;
  };

  discovery: {
    followExternal: boolean;
    paramPolicy: ParamPolicy;
    blockList: string[]; // Tracking params to strip (supports wildcards like "utm_*")
    allowUrls?: string[]; // URL patterns to allow (glob or regex)
    denyUrls?: string[]; // URL patterns to deny (glob or regex)
  };

  robots: {
    respect: boolean;
    overrideUsed: boolean;
  };

  privacy?: {
    stripCookies: boolean; // Strip cookies from requests (default true for privacy)
    stripAuthHeaders: boolean; // Strip Authorization headers (default true)
    redactInputValues: boolean; // Redact input field values in DOM snapshots (default true)
    redactForms: boolean; // Redact form data (default true)
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
    maxErrors?: number; // Max errors before aborting (-1 = unlimited, 0 = abort immediately, N = abort after N errors)
    logFile?: string; // Path to NDJSON log file
    logLevel?: "info" | "warn" | "error" | "debug"; // Minimum log level
    persistSession?: boolean; // Persist browser sessions per origin to bypass bot detection
    stealth?: boolean; // Enable stealth mode to hide automation signals
    validateArchive?: boolean; // Validate .atls archive after creation (QA check, default true)
  };
}

/**
 * Public API config type (alias for EngineConfig)
 */
export type CrawlConfig = EngineConfig;

/**
 * Crawl state machine states represent the lifecycle of a crawl job.
 * 
 * - idle: No crawl running, ready to start
 * - running: Active crawl in progress
 * - paused: Crawl paused, can be resumed
 * - canceling: User requested cancel, cleaning up
 * - finalizing: Crawl complete, writing final data
 * - done: Crawl successfully completed
 * - failed: Crawl failed with error
 */
export const CrawlState = {
  /** No crawl running, ready to start */
  IDLE: 'idle' as const,
  /** Active crawl in progress */
  RUNNING: 'running' as const,
  /** Crawl paused, can be resumed */
  PAUSED: 'paused' as const,
  /** User requested cancel, cleaning up */
  CANCELING: 'canceling' as const,
  /** Crawl complete, writing final data */
  FINALIZING: 'finalizing' as const,
  /** Crawl successfully completed */
  DONE: 'done' as const,
  /** Crawl failed with error */
  FAILED: 'failed' as const,
  /** All valid crawl states */
  values: ['idle', 'running', 'paused', 'canceling', 'finalizing', 'done', 'failed'] as const,
  /** Human-readable descriptions */
  descriptions: {
    idle: 'No crawl running, ready to start',
    running: 'Active crawl in progress',
    paused: 'Crawl paused, can be resumed',
    canceling: 'User requested cancel, cleaning up',
    finalizing: 'Crawl complete, writing final data',
    done: 'Crawl successfully completed',
    failed: 'Crawl failed with error'
  }
} as const;

export type CrawlState = typeof CrawlState.values[number];

/**
 * Type guard for CrawlState validation
 */
export function isCrawlState(value: unknown): value is CrawlState {
  return typeof value === 'string' && CrawlState.values.includes(value as any);
}

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
  | { type: "crawl.observability"; crawlId: string; queueDepth: number; inFlightCount: number; completedCount: number; errorCount: number; perHostQueues: Record<string, number>; throttledHosts: string[]; currentRps: number; memoryRssMB: number; seq: number; timestamp: string }
  | { type: "crawl.backpressure"; crawlId: string; host: string; reason: string; hostsWithTokens: string[]; hostsDeferred: string[]; tokens?: number; queued?: number; seq?: number; timestamp?: string }
  | { type: "crawl.shutdown"; crawlId: string; reason: "cancel"|"error"; seq: number; timestamp: string }
  | { type: "crawl.finished"; crawlId: string; manifestPath: string; incomplete: boolean; summary?: { pages: number; edges: number; assets: number; errors: number; durationMs: number }; perf?: { avgPagesPerSec: number; peakRssMB: number }; notes?: string[]; seq: number; timestamp: string };

export type AtlasPackName = "Core" | "A11y-Light" | "A11y-Full" | "Perf" | "Visual";
export type AtlasPackState = "embedded" | "sidecar" | "missing";

export interface AtlasPack {
  name: AtlasPackName;
  version: string;
  state: AtlasPackState;
  uri?: string;
  sha256?: string | null;
  notes?: string[];
}

/**
 * Manifest for .atls file
 */
export interface AtlasManifest {
  atlasVersion: string; // "1.0"
  formatVersion: string; // "1.0.0" - Explicit format version for compatibility checks
  specVersion?: string;
  schemaVersion?: string;
  incomplete?: boolean;
  
  owner: {
    name: string; // "Cai Frazier"
  };
  
  consumers: string[]; // ["Continuum SEO", "Horizon Accessibility"]

  identity?: {
    primary_origin?: string;
    primaryOrigin?: string;
    domain?: string;
    publicSuffix?: string;
    seed_urls?: string[];
    seedUrls?: string[];
  };

  crawlContext?: {
    mode?: RenderMode;
    robots?: boolean;
    urlNormalization?: string;
    urlNormalizationRules?: string[];
  };

  packs?: AtlasPack[];
  
  // Crawl timing (Atlas v1.0 Enhancement - Phase 3)
  crawl_started_at?: string;    // ISO timestamp when crawl began
  crawl_completed_at?: string;  // ISO timestamp when crawl finished
  
  // Producer metadata (Atlas v1.0 Enhancement - Phase 2)
  producer?: {
    name: string;                 // "cartographer-engine"
    version: string;              // "1.0.0-beta.1"
    build: string;                // "202510281348" (YYYYMMDDHHmm)
    git_hash?: string;            // "a1b2c3d4" (8-char short hash)
    command_line?: string;        // Full CLI invocation (PII-redacted)
  };
  
  // Environment snapshot (Atlas v1.0 Enhancement - Phase 2)
  environment?: {
    device: "desktop" | "mobile"; // Emulation mode
    viewport: {
      width: number;              // 1920 or 375
      height: number;             // 1080 or 667
    };
    user_agent: string;           // Full UA string
    locale: string;               // "en-US"
    timezone: string;             // "America/Los_Angeles"
    accept_language: string;      // "en-US,en;q=0.9"
    cpu_throttling?: number;      // 4 = 4x slowdown
    network_profile?: {
      name: string;               // "Fast 3G"
      download_kbps: number;
      upload_kbps: number;
      latency_ms: number;
    };
    consent_state?: {
      cookies_enabled: boolean;
      do_not_track: boolean;
      gdpr_mode?: boolean;
    };
    browser: {
      name: string;               // "chromium"
      version: string;            // "120.0.6099.109"
      headless: boolean;
    };
    platform: {
      os: string;                 // "darwin", "linux", "win32"
      arch: string;               // "x64", "arm64"
      node_version: string;       // "v20.11.0"
    };
  };
  
  // Privacy policy (Atlas v1.0 Spec - Phase 3B)
  privacy_policy?: {
    strip_cookies: boolean;        // Strip cookies from requests (default true)
    strip_auth_headers: boolean;   // Strip Authorization headers (default true)
    redact_inputs: boolean;        // Redact input field values (default true)
    redact_forms: boolean;         // Redact form data (default true)
    redact_pii: boolean;           // Redact obvious PII fields (default false)
  };
  
  // Robots.txt policy (Atlas v1.0 Spec - Phase 3B)
  robots_policy?: {
    respect: boolean;              // Respect robots.txt (default true)
    overrides_used: boolean;       // If true, robots.txt was overridden
    override_reason?: string;      // Reason for override (if overrides_used)
  };
  
  // Crawl config hash (Atlas v1.0 Spec - Phase 3B)
  crawl_config_hash?: string;      // SHA-256 of normalized config for reproducibility
  
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
    responses?: string[];
    errors: string[];
    events?: string[];
    accessibility?: string[];
    dom_snapshots?: string[];
    console?: string[]; // Full mode only
    styles?: string[]; // Full mode only
  };
  
  schemas: {
    pages: string; // "schemas/pages.schema.json#1"
    edges: string;
    assets: string;
    responses?: string;
    errors: string;
    events?: string;
    accessibility?: string;
    dom_snapshots?: string;
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
      sidecarUri?: string;
      sidecarSha256?: string | null;
      // Per-part integrity checksums (Atlas v1.0 Enhancement - Phase 2)
      integrity?: {
        algorithm: string;  // "sha256"
        checksums: Record<string, string>; // filename -> sha256
      };
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
  
  // Coverage matrix (Atlas v1.0 Enhancement - Phase 2)
  coverage?: {
    matrix: Array<{
      part: string;               // "pages" | "edges" | "assets" | "errors" | "console" | "styles"
      expected: boolean;          // Should this part exist?
      present: boolean;           // Is this part present?
      row_count: number;          // Actual record count
      coverage_pct?: number;      // Optional: estimated completeness
      reason_if_absent?: string;  // "not_in_render_mode" | "no_records" | "disabled"
    }>;
    total_pages: number;
    successful_pages: number;
    failed_pages: number;
    pages_with_errors: number;
    incomplete: boolean;          // Crawl terminated early?
    truncated_parts?: string[];   // Parts that hit limits
  };
  
  configIncluded: boolean;
  redactionApplied: boolean;
  
  // Storage and compression configuration (Atlas v1.0 Enhancement - Phase 2)
  storage?: {
    compression: {
      algorithm: string;            // "zstd" for JSONL parts
      level?: number;               // Compression level (1-22 for zstd)
    };
    // Atlas v1.0 Spec additions - Phase 3B
    blob_format?: "zst" | "tar.zst";  // Individual files or packed
    replay_tier?: "html" | "html+css" | "full";  // Replay capture mode
    content_addressing?: "on" | "off";  // Content-addressed blob storage
    image_policy?: "none" | "dimensions" | "full";  // Image capture policy
    max_image_bytes?: number;  // Maximum image size in bytes
    
    media?: {
      location: string;             // "media/" - directory in archive
      formats: string[];            // ["jpeg", "png"] - supported formats
      screenshots?: {
        enabled: boolean;
        quality?: number;           // JPEG quality (1-100)
        viewports: string[];        // ["desktop", "mobile"]
      };
      favicons?: {
        enabled: boolean;
        max_size_bytes?: number;
      };
    };
    blobs?: {
      enabled: boolean;             // Content-addressed storage
      format?: string;              // Future: "sha256-dir" for blobs/ab/cd/abcd...
    };
  };
  
  notes: string[];
  
  integrity: {
    algorithm?: string; // "sha256"
    archiveSha256?: string; // Deterministic archive hash over sorted file hashes
    files: Record<string, string>; // filename -> sha256
    audit_hash?: string;           // SHA-256 of sorted concatenated part hashes (Merkle root)
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
    totalAssets: number; // Asset metadata records (not downloaded files)
  totalResponses?: number; // HTML response bodies stored in blob storage
    totalErrors: number; // Crawl errors: failed fetches, render crashes, timeouts (not data quality issues)
    totalEvents?: number; // Operational events (Phase 7: Event log)
    totalAccessibilityRecords?: number; // Optional for backward compatibility
    totalConsoleRecords?: number; // Browser console logs (full mode only)
    totalStyleRecords?: number; // CSS records (full mode only)
    totalDOMSnapshots?: number; // DOM snapshots for offline accessibility audits (full mode only)
    statusCodes: Record<number, number>;
    renderModes: Record<RenderMode, number>; // Count by mode: raw/prerender/full
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

// ============================================================================
// ATLAS V1.0 ENHANCEMENTS - Phase 1
// ============================================================================

/**
 * Enhanced Atlas Manifest with comprehensive metadata
 * Addresses gaps in validation, versioning, coverage, integrity, and provenance
 */
export interface AtlasManifestV1Enhanced {
  // === SPEC VERSION & IDENTITY ===
  spec_version: string;           // "1.0.0" - Semantic versioning for feature gating
  format_version: string;         // "1.0.0" - Wire format version
  crawl_id: string;               // UUID v7 (time-ordered) for tracking
  
  // === PRODUCER ===
  producer: {
    name: string;                 // "cartographer-engine"
    version: string;              // "1.0.0-beta.1"
    build: string;                // "20250123.2145"
    git_hash?: string;            // "a1b2c3d4" (8-char short hash)
    command_line?: string;        // Full CLI invocation (PII-redacted)
  };
  
  // === OWNERSHIP ===
  owner: {
    name: string;                 // "Cai Frazier"
    organization?: string;        // Optional org name
  };
  
  // === TIMESTAMPS ===
  created_at: string;             // ISO 8601 with timezone
  started_at: string;             // Crawl start
  completed_at: string;           // Crawl end
  duration_sec: number;           // Total crawl duration
  
  // === ENVIRONMENT ===
  environment: {
    // Device & Platform
    device: "desktop" | "mobile"; // Emulation mode
    viewport: {
      width: number;              // 1920 or 375
      height: number;             // 1080 or 667
    };
    user_agent: string;           // Full UA string
    
    // Localization
    locale: string;               // "en-US"
    timezone: string;             // "America/Los_Angeles"
    accept_language: string;      // "en-US,en;q=0.9"
    
    // Performance Profiles
    cpu_throttling?: number;      // 4 = 4x slowdown
    network_profile?: {
      name: string;               // "Fast 3G"
      download_kbps: number;
      upload_kbps: number;
      latency_ms: number;
    };
    
    // Privacy & Compliance
    consent_state?: {
      cookies_enabled: boolean;
      do_not_track: boolean;
      gdpr_mode?: boolean;
    };
    
    // Browser Details
    browser: {
      name: string;               // "chromium"
      version: string;            // "120.0.6099.109"
      headless: boolean;
    };
  };
  
  // === CONFIGURATION ===
  configuration: {
    seeds: string[];              // Initial URLs
    max_pages?: number;           // Page budget
    max_depth?: number;           // Link depth limit
    render_mode: RenderMode;      // "raw" | "prerender" | "full"
    concurrency: number;          // Parallel page limit
    rate_limit_ms?: number;       // Per-origin delay
    respect_robots: boolean;      // robots.txt compliance
    override_robots?: boolean;    // If robots.txt was ignored
    include_external_links: boolean;
    screenshot_mode?: "none" | "errors" | "all";
    error_budget?: number;        // Max errors before abort
  };
  
  // === COVERAGE MATRIX ===
  coverage: {
    matrix: Array<{
      part: string;               // "pages" | "edges" | "assets" | "errors" | "console" | "styles"
      expected: boolean;          // Should this part exist?
      present: boolean;           // Is this part present?
      row_count: number;          // Actual record count
      coverage_pct?: number;      // Optional: estimated completeness
      reason_if_absent?: string;  // "not_in_render_mode" | "no_records" | "disabled"
    }>;
    
    // High-Level Stats
    total_pages: number;
    successful_pages: number;
    failed_pages: number;
    pages_with_errors: number;
    
    // Quality Indicators
    incomplete: boolean;          // Crawl terminated early?
    truncated_parts?: string[];   // Parts that hit limits
  };
  
  // === PARTS (Data Files) ===
  parts: {
    [partName: string]: {
      files: string[];            // ["data/pages/pages_part_00.jsonl.zst"]
      row_count: number;          // Total records across all files
      bytes_compressed: number;   // Total compressed size
      bytes_uncompressed?: number;// Total uncompressed size
      schema_ref: string;         // JSON Schema $id reference
      integrity: {
        algorithm: string;        // "sha256"
        checksums: {
          [fileName: string]: string; // filename -> sha256
        };
      };
    };
  };
  
  // === SCHEMAS ===
  schemas: {
    embedded: boolean;            // Are schemas embedded in archive?
    refs: {
      [partName: string]: {
        id: string;               // "$id" URI from JSON Schema
        version: string;          // "1.0.0"
        hash: string;             // SHA-256 of canonical schema JSON
      };
    };
  };
  
  // === CAPABILITIES ===
  capabilities: {
    render_modes: RenderMode[];   // ["raw", "prerender", "full"]
    modes_used: RenderMode[];     // Modes actually used in this crawl
    spec_level: 1 | 2 | 3;        // 1=Raw, 2=Prerender, 3=Full
    datasets: string[];           // Available parts
    features: string[];           // ["page_id", "content_hashing", "accessibility", "console"]
    
    // Robots Compliance
    robots: {
      respects_robots_txt: boolean;
      override_used: boolean;
      override_reason?: string;   // "owned_site" | "testing"
    };
    
    // Metrics Versions
    metrics: {
      performance?: string;       // "web-vitals@4.2.0"
      accessibility?: string;     // "axe-core@4.10.0"
      seo?: string;               // "lighthouse-seo@11.5.0"
    };
  };
  
  // === PRIVACY ===
  privacy: {
    redaction_applied: boolean;
    redaction_policy?: {
      fields_redacted: string[];  // ["command_line", "cookies"]
      pii_detected: boolean;
      pii_fields?: string[];      // Fields with PII tags
    };
    
    // Field-Level Tags (for future use)
    field_tags?: {
      [field: string]: string[];  // "PageRecord.title": ["pii:potential"]
    };
  };
  
  // === WARNINGS ===
  warnings: Array<{
    code: string;                 // "W001" - machine-readable
    message: string;              // Human-readable explanation
    count?: number;               // How many times occurred
    severity: "info" | "warning" | "error";
    first_occurrence?: string;    // URL or timestamp
  }>;
  
  // === INTEGRITY ===
  integrity: {
    algorithm: string;            // "sha256"
    manifest_hash?: string;       // Hash of this manifest (excluding this field)
    archive_hash?: string;        // Hash of entire archive
    archiveSha256?: string;       // New deterministic archive summary hash
    files: {
      [fileName: string]: string; // All files in archive -> sha256
    };
    audit_hash?: string;          // Legacy Merkle hash
  };
  
  // === NOTES ===
  notes: string[];                // Human-readable notes
  
  // === DEPRECATED (Backward Compatibility) ===
  atlasVersion?: string;          // Legacy: "1.0"
  formatVersion?: string;         // Legacy: "1.0.0"
  generator?: string;             // Legacy: "cartographer-engine/1.0.0"
  consumers?: string[];           // Legacy: intended consumers
  incomplete?: boolean;           // Legacy: use coverage.incomplete instead
  configIncluded?: boolean;       // Legacy: always true now
}

/**
 * Enhanced PageRecord with stable UUID-based identifier
 * Solves URL-based join fragility with redirects/canonicalization
 */
export interface PageRecordV1Enhanced extends PageRecord {
  // === STABLE IDENTIFIER ===
  page_id: string;                // UUID v7 (time-ordered, globally unique)
  
  // === CONTENT HASHING ===
  content_hash: string;           // SHA-256 of normalized text content
  // Note: dom_hash already exists in PageRecord, but now mandatory
  
  // === TEMPORAL TRACKING ===
  previous_page_id?: string;      // page_id from previous crawl (for diffing)
  content_changed?: boolean;      // Did content change since last crawl?
  dom_changed?: boolean;          // Did DOM change since last crawl?
  
  // Note: All URL fields (url, finalUrl, normalizedUrl, urlKey) retained for display
}

/**
 * Enhanced EdgeRecord with stable page_id references
 * Replaces fragile URL-based joins with UUID references
 */
export interface EdgeRecordV1Enhanced {
  // === STABLE REFERENCES ===
  source_page_id: string;         // UUID of source page
  target_page_id?: string;        // UUID of target page (if crawled)
  
  // === URL VARIANTS (for display) ===
  source_url: string;             // Display only
  target_url: string;             // Display only
  
  // === LINK CONTEXT ===
  anchor_text: string;
  rel?: string;
  nofollow: boolean;
  sponsored?: boolean;
  ugc?: boolean;
  is_external: boolean;
  
  // === DOM LOCATION ===
  location: EdgeLocation;         // nav, header, footer, aside, main, other
  selector_hint?: string;         // CSS selector path
  xpath?: string;                 // XPath to link element
  ordinal?: number;               // Nth link in DOM order
  
  // === DISCOVERY ===
  discovered_in_mode: RenderMode;
  http_status_at_target?: number;
  
  // === TEMPORAL ===
  extracted_at: string;           // ISO timestamp when link was extracted
}

/**
 * Enhanced AssetRecord with stable page_id reference
 */
export interface AssetRecordV1Enhanced {
  // === STABLE REFERENCES ===
  page_id: string;                // UUID of page containing asset
  asset_id: string;               // UUID v5(namespace, assetUrl) - deterministic
  
  // === URL VARIANTS ===
  page_url: string;               // Display only
  asset_url: string;              // Actual asset URL
  
  // === ASSET METADATA ===
  type: "image" | "video";
  alt?: string;
  has_alt: boolean;
  
  // === DIMENSIONS ===
  natural_width?: number;
  natural_height?: number;
  display_width?: number;
  display_height?: number;
  estimated_bytes?: number;
  
  // === VISIBILITY ===
  visible: boolean;
  in_viewport: boolean;
  loading?: string;               // "lazy" attribute
  was_lazy_loaded: boolean;
  
  // === DOM LOCATION ===
  selector_hint?: string;         // CSS selector path
  xpath?: string;                 // XPath to element
  ordinal?: number;               // Nth asset of this type
}
