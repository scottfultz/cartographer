import type { Browser, BrowserContext } from "playwright";
import type { EngineConfig } from "./types.js";
/**
 * Browser Context Pool Manager
 *
 * Manages persistent browser contexts per domain/origin to preserve session state
 * (cookies, localStorage, etc.) across pages in a crawl.
 *
 * This enables bypassing Cloudflare/bot detection after the first challenge is solved,
 * either manually or automatically. Once a session is established, subsequent pages
 * reuse the same context and avoid re-triggering challenges.
 *
 * Storage format: JSON files in <storageDir>/<origin-hash>.json
 * Contains: cookies, localStorage, sessionStorage, origins
 */
export declare class BrowserContextPool {
    private browser;
    private cfg;
    private storageDir;
    private contexts;
    private contextUsageCounts;
    private readonly CONTEXT_RECYCLE_THRESHOLD;
    private readonly MAX_RSS_MULTIPLIER;
    constructor(browser: Browser, cfg: EngineConfig, storageDir?: string);
    /**
     * Get or create a browser context for the given origin
     * Loads persistent state if available
     */
    getContext(origin: string): Promise<BrowserContext>;
    /**
     * Save browser context state to disk
     */
    saveContext(origin: string, context?: BrowserContext): Promise<void>;
    /**
     * Save all active contexts
     */
    saveAllContexts(): Promise<void>;
    /**
     * Close a specific context
     */
    closeContext(origin: string): Promise<void>;
    /**
     * Close all contexts and save their states
     */
    closeAllContexts(): Promise<void>;
    /**
     * Get the storage state file path for an origin
     */
    private getStorageStatePath;
    /**
     * Get statistics about the pool
     */
    getStats(): {
        contexts: number;
        totalUsage: number;
    };
    /**
     * Clear all saved sessions (delete storage files)
     */
    clearAllSessions(): void;
}
//# sourceMappingURL=browserContextPool.d.ts.map