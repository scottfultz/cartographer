/**
 * Extract character encoding from HTML
 */
export declare function extractEncoding(opts: {
    html: string;
    contentTypeHeader?: string;
}): {
    encoding: string;
    source: "meta" | "header" | "detected";
} | undefined;
/**
 * Count resource types in HTML
 */
export declare function countResources(html: string): {
    cssCount: number;
    jsCount: number;
    fontCount: number;
    inlineStyles: number;
    inlineScripts: number;
};
/**
 * Detect flashing content for WCAG 2.3.1 (seizure risk)
 */
export declare function detectFlashingContent(page: any): Promise<{
    hasBlinkTag: boolean;
    hasMarqueeTag: boolean;
    hasAnimations: boolean;
    animationCount: number;
    suspiciousAnimations: Array<{
        selector: string;
        duration: string;
        iterationCount: string;
    }>;
}>;
/**
 * Extract compression information from headers
 */
export declare function extractCompression(headers: Record<string, string | string[]>): {
    compression?: "gzip" | "brotli" | "deflate" | "none" | string;
    contentEncoding?: string;
};
/**
 * Extract viewport meta tag information
 */
export declare function extractViewportMeta(html: string): {
    content: string;
    width?: string;
    initialScale?: number;
    hasViewport: boolean;
} | undefined;
/**
 * Detect mixed content issues (HTTP resources on HTTPS pages)
 */
export declare function detectMixedContent(opts: {
    pageUrl: string;
    html: string;
}): Array<{
    assetUrl: string;
    type: "script" | "stylesheet" | "image" | "video" | "audio" | "iframe" | "other";
}>;
/**
 * Check Subresource Integrity (SRI) on scripts and stylesheets
 */
export declare function checkSubresourceIntegrity(html: string): {
    totalScripts: number;
    totalStyles: number;
    scriptsWithSRI: number;
    stylesWithSRI: number;
    missingResources?: Array<{
        url: string;
        type: "script" | "stylesheet";
    }>;
};
/**
 * Extract additional performance metrics from Playwright page
 */
export declare function collectAdvancedPerformanceMetrics(page: any): Promise<{
    fid?: number;
    inp?: number;
    speedIndex?: number;
    tti?: number;
    jsExecutionTime?: number;
    lcp?: number;
    cls?: number;
    tbt?: number;
    fcp?: number;
    ttfb?: number;
    renderBlockingResources?: Array<{
        url: string;
        type: "script" | "stylesheet";
        size?: number;
    }>;
    thirdPartyRequestCount?: number;
}>;
/**
 * Extract sitemap presence from robots.txt
 * Data collection only - stores sitemap URLs found in robots.txt
 */
export declare function detectSitemaps(opts: {
    origin: string;
    robotsTxt?: string;
}): Promise<{
    hasSitemap: boolean;
    sitemapUrls: string[];
} | undefined>;
/**
 * Count broken outbound links from edge data
 * Data collection only - counts edges with HTTP status >= 400
 */
export declare function countBrokenLinks(edges: Array<{
    httpStatusAtTo?: number;
    isExternal: boolean;
}>): number;
/**
 * Extract unique outbound domains from edge data
 * Data collection only - lists distinct external domains
 */
export declare function extractOutboundDomains(edges: Array<{
    targetUrl: string;
    isExternal: boolean;
}>): string[];
//# sourceMappingURL=enhancedMetrics.d.ts.map