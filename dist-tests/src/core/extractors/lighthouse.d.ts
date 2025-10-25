import type { Page } from "playwright";
/**
 * Lighthouse metrics and scores collected from a page
 */
export interface LighthouseMetrics {
    lcp?: number;
    cls?: number;
    inp?: number;
    ttfb?: number;
    fcp?: number;
    tbt?: number;
    speedIndex?: number;
    tti?: number;
    scores?: {
        performance?: number;
        accessibility?: number;
        bestPractices?: number;
        seo?: number;
    };
    resources?: {
        totalRequests: number;
        totalBytes: number;
        mainThreadTime?: number;
    };
}
/**
 * Extract Lighthouse-style performance metrics from a Playwright page.
 *
 * Note: This uses browser Performance APIs rather than running full Lighthouse,
 * which would require additional dependencies and significantly slow down crawls.
 * For production-grade Lighthouse integration, consider using the lighthouse npm package
 * with puppeteer or lighthouse-ci.
 *
 * @param page - Playwright page instance
 * @returns LighthouseMetrics object
 */
export declare function extractLighthouseMetrics(page: Page): Promise<LighthouseMetrics>;
//# sourceMappingURL=lighthouse.d.ts.map