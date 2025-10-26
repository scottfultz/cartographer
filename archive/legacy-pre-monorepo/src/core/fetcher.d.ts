import type { EngineConfig } from "./types.js";
export interface FetchResult {
    statusCode: number;
    headers: Record<string, string | string[]>;
    bodyBuffer: Buffer;
    contentType?: string;
    finalUrl: string;
    redirectChain: string[];
    rawHtmlHash: string;
    robotsHeader?: string;
    title?: string;
    textSample?: string;
}
/**
 * Initialize rate limiter based on config
 */
export declare function initRateLimiter(rps: number): void;
/**
 * Fetch URL with robots.txt check, retries, and rate limiting
 */
export declare function fetchUrl(cfg: EngineConfig, url: string): Promise<FetchResult>;
//# sourceMappingURL=fetcher.d.ts.map