import type { Page } from "playwright";
/**
 * Network resource data collected during page load
 */
export interface NetworkResourceData {
    url: string;
    type: "document" | "stylesheet" | "script" | "image" | "font" | "media" | "xhr" | "fetch" | "websocket" | "other";
    status: number;
    size: number;
    compression?: "gzip" | "brotli" | "deflate" | "none";
    mimeType?: string;
    fromCache: boolean;
    duration?: number;
}
/**
 * Network performance metrics collected during page load
 */
export interface NetworkPerformanceMetrics {
    totalRequests: number;
    totalBytes: number;
    totalDuration?: number;
    breakdown: {
        document: {
            count: number;
            bytes: number;
        };
        stylesheet: {
            count: number;
            bytes: number;
        };
        script: {
            count: number;
            bytes: number;
        };
        image: {
            count: number;
            bytes: number;
        };
        font: {
            count: number;
            bytes: number;
        };
        media: {
            count: number;
            bytes: number;
        };
        xhr: {
            count: number;
            bytes: number;
        };
        fetch: {
            count: number;
            bytes: number;
        };
        other: {
            count: number;
            bytes: number;
        };
    };
    compression: {
        gzip: number;
        brotli: number;
        deflate: number;
        none: number;
        uncompressibleTypes: number;
    };
    statusCodes: {
        [code: number]: number;
    };
    cachedRequests: number;
    uncachedRequests: number;
    resources: NetworkResourceData[];
}
/**
 * Create a network performance collector for a Playwright page.
 * Returns an object with methods to start/stop collection and get results.
 *
 * @param page - Playwright page instance
 * @returns NetworkPerformanceCollector object
 */
export declare function createNetworkPerformanceCollector(page: Page): {
    /**
     * Start collecting network performance data
     */
    start(): void;
    /**
     * Stop collecting network performance data
     */
    stop(): void;
    /**
     * Get collected network performance metrics
     */
    getMetrics(): NetworkPerformanceMetrics;
    /**
     * Clear collected data and reset
     */
    reset(): void;
};
/**
 * Helper to format bytes as human-readable string
 */
export declare function formatBytes(bytes: number): string;
/**
 * Helper to calculate compression savings
 */
export declare function calculateCompressionSavings(uncompressedSize: number, compressedSize: number): {
    savings: number;
    percentage: number;
};
//# sourceMappingURL=networkPerformance.d.ts.map