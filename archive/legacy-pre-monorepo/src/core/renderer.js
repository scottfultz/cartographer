/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { chromium } from "playwright";
import { sha256Hex } from "../utils/hashing.js";
import { log } from "../utils/logging.js";
// Browser lifecycle state
let browser = null;
let context = null;
let pagesRendered = 0;
const CONTEXT_RECYCLE_THRESHOLD = 50;
/**
 * Initialize Playwright browser (Chromium only)
 */
export async function initBrowser(cfg) {
    if (browser) {
        log("warn", "Browser already initialized");
        return;
    }
    log("info", `Initializing Chromium browser (concurrency: ${cfg.render.concurrency})`);
    browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    context = await browser.newContext({
        userAgent: cfg.http.userAgent,
        viewport: { width: 1280, height: 720 }
    });
    log("info", "✓ Renderer setup verified – default mode: prerender ✓ Playwright installed ✓");
}
/**
 * Close browser and cleanup
 */
export async function closeBrowser() {
    if (context) {
        await context.close();
        context = null;
    }
    if (browser) {
        await browser.close();
        browser = null;
    }
    pagesRendered = 0;
    log("info", "Browser closed");
}
/**
 * Force context recycling (can be called externally for memory management)
 */
export async function forceContextRecycle(cfg) {
    await recycleContextIfNeeded(cfg, true);
}
/**
 * Recycle browser context after threshold pages or high RSS (memory management)
 */
async function recycleContextIfNeeded(cfg, force = false) {
    const currentRssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const maxRssMB = cfg.memory?.maxRssMB || 2048;
    const rssThreshold = maxRssMB * 0.7; // Recycle at 70% of max
    const shouldRecycle = force ||
        pagesRendered >= CONTEXT_RECYCLE_THRESHOLD ||
        currentRssMB > rssThreshold;
    if (shouldRecycle) {
        const reason = force ? "forced" :
            (pagesRendered >= CONTEXT_RECYCLE_THRESHOLD ? `${pagesRendered} pages` : `RSS ${currentRssMB}MB`);
        log("info", `[Renderer] Recycling browser context (${reason})`);
        if (context) {
            await context.close();
        }
        if (browser) {
            context = await browser.newContext({
                userAgent: cfg.http.userAgent,
                viewport: { width: 1280, height: 720 }
            });
        }
        pagesRendered = 0;
    }
}
/**
 * Main render function - handles raw, prerender, and full modes
 * Returns only DOM and timing data. Extraction is handled by separate extractors.
 */
export async function renderPage(cfg, url, rawFetch) {
    const mode = cfg.render.mode;
    const startTime = performance.now();
    log("debug", `[Renderer] ${mode} ${url}`);
    // RAW MODE: Return raw HTML without browser rendering
    if (mode === "raw") {
        const html = rawFetch.bodyBuffer.toString('utf-8');
        const renderMs = Math.round(performance.now() - startTime);
        log("info", `[Renderer] raw ${url} → ${renderMs}ms (no browser)`);
        return {
            modeUsed: "raw",
            navEndReason: "fetch",
            dom: html,
            domHash: sha256Hex(html),
            renderMs,
            performance: { parseMs: renderMs }
        };
    }
    // PRERENDER or FULL MODE: Use Playwright
    if (!browser || !context) {
        throw new Error("Browser not initialized. Call initBrowser() first.");
    }
    await recycleContextIfNeeded(cfg);
    const result = await renderWithPlaywright(cfg, url);
    const renderMs = Math.round(performance.now() - startTime);
    log("info", `[Renderer] ${mode} ${url} → ${renderMs}ms ${result.navEndReason}`);
    pagesRendered++;
    return { ...result, renderMs };
}
/**
 * Prerender/Full mode: Use Playwright to render with JavaScript
 * Returns only DOM and navigation metrics. No extraction.
 */
async function renderWithPlaywright(cfg, url) {
    if (!context) {
        throw new Error("Browser context not available");
    }
    const page = await context.newPage();
    const perfMetrics = {};
    let requestCount = 0;
    let bytesLoaded = 0;
    let navEndReason = "networkidle";
    try {
        // Request interception for caps
        await page.route('**/*', (route) => {
            requestCount++;
            if (requestCount > cfg.render.maxRequestsPerPage) {
                navEndReason = "error";
                route.abort('failed');
                return;
            }
            route.continue();
        });
        // Track bytes loaded
        page.on('response', async (response) => {
            try {
                const buffer = await response.body().catch(() => null);
                if (buffer) {
                    bytesLoaded += buffer.length;
                    if (bytesLoaded > cfg.render.maxBytesPerPage) {
                        navEndReason = "error";
                        await page.close();
                    }
                }
            }
            catch (e) {
                // Ignore response body errors
            }
        });
        // Navigate with timeout
        const navStart = performance.now();
        try {
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout: cfg.render.timeoutMs
            });
            navEndReason = "networkidle";
        }
        catch (error) {
            if (error.message?.includes('Timeout')) {
                navEndReason = "timeout";
            }
            else {
                navEndReason = "error";
            }
        }
        perfMetrics.navMs = Math.round(performance.now() - navStart);
        // Extract DOM only
        const outerHTML = await page.evaluate(() => {
            // @ts-expect-error - Running in browser context
            return document.documentElement.outerHTML;
        });
        const domHash = sha256Hex(outerHTML);
        await page.close();
        return {
            modeUsed: cfg.render.mode,
            navEndReason,
            dom: outerHTML,
            domHash,
            performance: perfMetrics
        };
    }
    catch (error) {
        await page.close().catch(() => { });
        throw error;
    }
}
//# sourceMappingURL=renderer.js.map