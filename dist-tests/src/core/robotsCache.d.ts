import type { EngineConfig } from "./types.js";
interface RobotsCheckResult {
    allow: boolean;
    matchedRule?: string;
    ua: string;
}
/**
 * In-memory robots.txt cache with ETag revalidation and LRU eviction
 */
export declare class RobotsCache {
    private cache;
    private readonly TTL_MS;
    private readonly MAX_ENTRIES;
    /**
     * Check if URL should be fetched according to robots.txt
     */
    shouldFetch(cfg: EngineConfig, url: string): Promise<RobotsCheckResult>;
    /**
     * Get robots.txt for origin (from cache or fetch)
     */
    private getRobotsTxt;
    /**
     * Revalidate cached robots.txt using ETag/Last-Modified
     */
    private revalidate;
    /**
     * Fetch robots.txt from origin
     */
    private fetchRobotsTxt;
    /**
     * Parse robots.txt and check if path is allowed for user agent
     */
    private checkRules;
    /**
     * Check if path matches robots.txt rule pattern
     */
    private matchesRule;
    /**
     * LRU eviction when cache exceeds max size
     */
    private evictIfNeeded;
    /**
     * Clear the cache (for testing)
     */
    clear(): void;
    /**
     * Get cache size
     */
    size(): number;
}
export declare const robotsCache: RobotsCache;
export {};
//# sourceMappingURL=robotsCache.d.ts.map