/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
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
export async function extractLighthouseMetrics(page) {
    try {
        // Extract metrics using browser Performance APIs
        // Note: This code runs in the browser context via page.evaluate()
        const metrics = await page.evaluate(() => {
            // @ts-ignore - Browser API types
            const perfEntries = performance.getEntriesByType("navigation")[0];
            // @ts-ignore - Browser API types
            const paintEntries = performance.getEntriesByType("paint");
            // Core Web Vitals and key metrics
            const result = {};
            // TTFB - Time to First Byte
            if (perfEntries?.responseStart && perfEntries?.requestStart) {
                result.ttfb = Math.round(perfEntries.responseStart - perfEntries.requestStart);
            }
            // FCP - First Contentful Paint
            const fcpEntry = paintEntries.find((entry) => entry.name === "first-contentful-paint");
            if (fcpEntry) {
                result.fcp = Math.round(fcpEntry.startTime);
            }
            // LCP - Largest Contentful Paint
            // Using PerformanceObserver API if available
            // @ts-ignore - Browser API types
            if ("PerformanceObserver" in window) {
                try {
                    const lcpEntries = [];
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        lcpEntries.push(...entries);
                    });
                    // @ts-ignore - Browser API types
                    observer.observe({ type: "largest-contentful-paint", buffered: true });
                    // Get the latest LCP entry
                    if (lcpEntries.length > 0) {
                        const lastEntry = lcpEntries[lcpEntries.length - 1];
                        result.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);
                    }
                }
                catch (e) {
                    // PerformanceObserver not available or error
                }
            }
            // CLS - Cumulative Layout Shift
            // This requires layout-shift entries
            // @ts-ignore - Browser API types
            if ("PerformanceObserver" in window) {
                try {
                    let clsScore = 0;
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsScore += entry.value;
                            }
                        }
                    });
                    // @ts-ignore - Browser API types
                    observer.observe({ type: "layout-shift", buffered: true });
                    result.cls = Math.round(clsScore * 1000) / 1000; // Round to 3 decimals
                }
                catch (e) {
                    // Layout shift observer not available
                }
            }
            // TTI approximation - use domContentLoadedEventEnd
            if (perfEntries?.domContentLoadedEventEnd) {
                result.tti = Math.round(perfEntries.domContentLoadedEventEnd);
            }
            // Resource counts
            const resourceEntries = performance.getEntriesByType("resource");
            result.totalRequests = resourceEntries.length;
            result.totalBytes = resourceEntries.reduce((sum, entry) => {
                return sum + (entry.transferSize || entry.encodedBodySize || 0);
            }, 0);
            return result;
        });
        // INP - Interaction to Next Paint
        // This requires event timing API which may not be available in all browsers
        // We'll attempt to capture it but it may not always be present
        try {
            const inpMetric = await page.evaluate(() => {
                // @ts-ignore - Browser API types
                if (!("PerformanceObserver" in window))
                    return null;
                let maxDuration = 0;
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > maxDuration) {
                            maxDuration = entry.duration;
                        }
                    }
                });
                try {
                    // @ts-ignore - Browser API types
                    observer.observe({ type: "event", buffered: true });
                    return maxDuration > 0 ? Math.round(maxDuration) : null;
                }
                catch (e) {
                    return null;
                }
            });
            if (inpMetric) {
                metrics.inp = inpMetric;
            }
        }
        catch (e) {
            // INP not available
        }
        // Calculate approximate scores based on metrics
        // These are simplified heuristics, not actual Lighthouse scoring
        const scores = calculateApproximateScores(metrics);
        return {
            lcp: metrics.lcp,
            cls: metrics.cls,
            inp: metrics.inp,
            ttfb: metrics.ttfb,
            fcp: metrics.fcp,
            tbt: metrics.tbt,
            speedIndex: metrics.speedIndex,
            tti: metrics.tti,
            scores,
            resources: {
                totalRequests: metrics.totalRequests || 0,
                totalBytes: metrics.totalBytes || 0,
            },
        };
    }
    catch (error) {
        // Return empty metrics on error
        console.error("Error extracting Lighthouse metrics:", error);
        return {
            resources: {
                totalRequests: 0,
                totalBytes: 0,
            },
        };
    }
}
/**
 * Calculate approximate Lighthouse scores based on collected metrics.
 * These are simplified heuristics and should not be considered equivalent
 * to actual Lighthouse scores.
 *
 * @param metrics - Collected performance metrics
 * @returns Approximate scores object (0-100 scale)
 */
function calculateApproximateScores(metrics) {
    const scores = {};
    // Performance score (simplified heuristic)
    let perfScore = 100;
    if (metrics.lcp) {
        // LCP: Good < 2500ms, Needs improvement < 4000ms, Poor >= 4000ms
        if (metrics.lcp > 4000)
            perfScore -= 40;
        else if (metrics.lcp > 2500)
            perfScore -= 20;
    }
    if (metrics.cls) {
        // CLS: Good < 0.1, Needs improvement < 0.25, Poor >= 0.25
        if (metrics.cls > 0.25)
            perfScore -= 30;
        else if (metrics.cls > 0.1)
            perfScore -= 15;
    }
    if (metrics.fcp) {
        // FCP: Good < 1800ms, Needs improvement < 3000ms, Poor >= 3000ms
        if (metrics.fcp > 3000)
            perfScore -= 20;
        else if (metrics.fcp > 1800)
            perfScore -= 10;
    }
    scores.performance = Math.max(0, perfScore);
    // Note: Accessibility, Best Practices, and SEO scores require deep analysis
    // and are not calculated here. These should come from dedicated extractors.
    return scores;
}
//# sourceMappingURL=lighthouse.js.map