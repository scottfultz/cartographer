import type { EngineConfig, NavEndReason, RenderMode } from "./types.js";
import type { FetchResult } from "./fetcher.js";
export interface RenderResult {
    modeUsed: RenderMode;
    navEndReason: NavEndReason;
    dom: string;
    domHash: string;
    renderMs: number;
    performance: Record<string, number>;
    challengeDetected?: boolean;
    challengePageCaptured?: boolean;
    screenshots?: {
        desktop?: Buffer;
        mobile?: Buffer;
    };
    favicon?: {
        url: string;
        data: Buffer;
        mimeType: string;
    };
    runtimeWCAGData?: any;
}
/**
 * Initialize Playwright browser (Chromium only)
 */
export declare function initBrowser(cfg: EngineConfig, enablePersistSession?: boolean, enableStealth?: boolean): Promise<void>;
/**
 * Close browser and cleanup
 */
export declare function closeBrowser(): Promise<void>;
/**
 * Force context recycling (can be called externally for memory management)
 */
export declare function forceContextRecycle(cfg: EngineConfig): Promise<void>;
/**
 * Main render function - handles raw, prerender, and full modes
 * Returns only DOM and timing data. Extraction is handled by separate extractors.
 */
export declare function renderPage(cfg: EngineConfig, url: string, rawFetch: FetchResult): Promise<RenderResult>;
//# sourceMappingURL=renderer.d.ts.map