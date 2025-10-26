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
    headings: {
        level: number;
        text: string;
    }[];
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
    hreflangLinks: Array<{
        lang: string;
        url: string;
    }>;
    depth: number;
    discoveredFrom?: string;
    discoveredInMode: RenderMode;
    basicFlags?: {
        hasTitle: boolean;
        hasMetaDescription: boolean;
        hasH1: boolean;
        hasCanonical: boolean;
    };
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
    location: EdgeLocation;
    selectorHint?: string;
    discoveredInMode: RenderMode;
    httpStatusAtTo?: number;
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
    loading?: string;
    wasLazyLoaded: boolean;
}
/**
 * ErrorRecord - Crawl error
 */
export interface ErrorRecord {
    url: string;
    origin: string;
    hostname: string;
    occurredAt: string;
    phase: "fetch" | "render" | "extract" | "write";
    code?: string;
    message: string;
    stack?: string;
}
/**
 * Engine Configuration
 */
export interface EngineConfig {
    seeds: string[];
    outAtls: string;
    maxPages: number;
    /**
     * Additional config for public API
     */
    perHostRps?: number;
    renderMode?: RenderMode;
    render: {
        mode: RenderMode;
        concurrency: number;
        timeoutMs: number;
        maxRequestsPerPage: number;
        maxBytesPerPage: number;
    };
    http: {
        rps: number;
        userAgent: string;
    };
    discovery: {
        followExternal: boolean;
        paramPolicy: ParamPolicy;
        blockList: string[];
    };
    robots: {
        respect: boolean;
        overrideUsed: boolean;
    };
    memory?: {
        maxRssMB: number;
    };
    accessibility?: {
        enabled: boolean;
    };
    checkpoint?: {
        interval: number;
        enabled: boolean;
    };
    shutdown?: {
        gracefulTimeoutMs: number;
    };
    resume?: {
        crawlId?: string;
        stagingDir?: string;
    };
    manifestNotes?: string[];
    cli?: {
        quiet?: boolean;
        json?: boolean;
        errorBudget?: number;
        logFile?: string;
        logLevel?: "info" | "warn" | "error" | "debug";
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
export type CrawlEvent = {
    type: "crawl.started";
    crawlId: string;
    config: CrawlConfig;
    seq: number;
    timestamp: string;
} | {
    type: "page.fetched";
    crawlId: string;
    url: string;
    statusCode: number;
    seq: number;
    timestamp: string;
} | {
    type: "page.parsed";
    crawlId: string;
    url: string;
    record: PageRecord;
    seq: number;
    timestamp: string;
} | {
    type: "error.occurred";
    crawlId: string;
    error: ErrorRecord;
    seq: number;
    timestamp: string;
} | {
    type: "checkpoint.saved";
    crawlId: string;
    path: string;
    seq: number;
    timestamp: string;
} | {
    type: "crawl.heartbeat";
    crawlId: string;
    progress: CrawlProgress;
    seq: number;
    timestamp: string;
} | {
    type: "crawl.finished";
    crawlId: string;
    manifestPath: string;
    incomplete: boolean;
    seq: number;
    timestamp: string;
};
/**
 * Manifest for .atls file
 */
export interface AtlasManifest {
    atlasVersion: string;
    specVersion?: string;
    schemaVersion?: string;
    incomplete?: boolean;
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
 * Summary statistics
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
 * Robots.txt cache entry
 */
export interface RobotsCacheEntry {
    origin: string;
    rules: string;
    etag?: string;
    fetchedAt: string;
    expiresAt: string;
}
//# sourceMappingURL=types.d.ts.map