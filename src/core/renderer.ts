/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { Browser, BrowserContext } from "playwright";
import { chromium } from "playwright";
import type { EngineConfig, NavEndReason, RenderMode } from "./types.js";
import { sha256Hex } from "../utils/hashing.js";
import { log } from "../utils/logging.js";
import type { FetchResult } from "./fetcher.js";

// Browser lifecycle state
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let pagesRendered = 0;
const CONTEXT_RECYCLE_THRESHOLD = 50;

export interface RenderResult {
  modeUsed: RenderMode;
  navEndReason: NavEndReason;
  dom: string;
  domHash: string;
  renderMs: number;
  performance: Record<string, number>;
  challengeDetected?: boolean;
}

/**
 * Initialize Playwright browser (Chromium only)
 */
export async function initBrowser(cfg: EngineConfig): Promise<void> {
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
export async function closeBrowser(): Promise<void> {
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
export async function forceContextRecycle(cfg: EngineConfig): Promise<void> {
  await recycleContextIfNeeded(cfg, true);
}

/**
 * Recycle browser context after threshold pages or high RSS (memory management)
 */
async function recycleContextIfNeeded(cfg: EngineConfig, force = false): Promise<void> {
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
export async function renderPage(
  cfg: EngineConfig,
  url: string,
  rawFetch: FetchResult
): Promise<RenderResult> {
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
 * Detect if page is a challenge/verification page (Cloudflare, Akamai, etc.)
 * Returns true if challenge patterns are detected
 */
function detectChallengePage(page: any, html: string, statusCode?: number): boolean {
  // Check status codes commonly used for rate limiting/challenges
  if (statusCode === 503 || statusCode === 429) {
    return true;
  }

  // Check page title for common challenge patterns
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].toLowerCase();
    const challengeTitles = [
      'just a moment',
      'attention required',
      'checking your browser',
      'verifying you are',
      'security check',
      'please wait',
      'access denied',
      'ddos protection'
    ];
    if (challengeTitles.some(pattern => title.includes(pattern))) {
      return true;
    }
  }

  // Check for common challenge page DOM patterns
  const challengeSelectors = [
    '#cf-challenge-form',
    '.cf-browser-verification',
    '#challenge-form',
    '[data-ray-id]',
    '.ray-id',
    '#captcha',
    '.g-recaptcha',
    '[id*="challenge"]',
    '[class*="challenge"]'
  ];

  for (const selector of challengeSelectors) {
    if (html.includes(selector) || html.includes(selector.replace(/[#.]/g, ''))) {
      return true;
    }
  }

  return false;
}

/**
 * Prerender/Full mode: Use Playwright to render with JavaScript
 * Returns only DOM and navigation metrics. No extraction.
 */
async function renderWithPlaywright(
  cfg: EngineConfig,
  url: string
): Promise<Omit<RenderResult, 'renderMs'>> {
  if (!context) {
    throw new Error("Browser context not available");
  }

  log('debug', `[Renderer] Creating new page for ${url}`);
  const page = await context.newPage();
  const perfMetrics: Record<string, number> = {};
  let requestCount = 0;
  let bytesLoaded = 0;
  let navEndReason: NavEndReason = "networkidle";
  let pageClosedPrematurely = false;

  try {
    // Request interception for caps
    await page.route('**/*', (route) => {
      requestCount++;
      if (requestCount > cfg.render.maxRequestsPerPage) {
        log('warn', `[Renderer] Max requests (${cfg.render.maxRequestsPerPage}) hit for ${url}. Aborting further requests.`);
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
          if (bytesLoaded > cfg.render.maxBytesPerPage && !pageClosedPrematurely) {
            log('warn', `[Renderer] Max bytes (${cfg.render.maxBytesPerPage}) hit for ${url}. Closing page.`);
            navEndReason = "error";
            pageClosedPrematurely = true;
            await page.close();
          }
        }
      } catch (e: any) {
        log('debug', `[Renderer] Error reading response body for ${url}: ${e.message}`);
      }
    });

    log('debug', `[Renderer] Navigating page to ${url}`);
    const navStart = performance.now();
    try {
      if (pageClosedPrematurely) {
        log('warn', `[Renderer] Page closed due to byte limit before navigation could complete for ${url}.`);
        throw new Error('Page closed due to byte limit');
      }
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: cfg.render.timeoutMs
      });
      navEndReason = "networkidle";
      log('debug', `[Renderer] Navigation successful for ${url}`);
    } catch (error: any) {
      log('warn', `[Renderer] Navigation error for ${url}: ${error.message}`);
      if (error.message?.includes('Timeout')) {
        navEndReason = "timeout";
      } else if (error.message?.includes('Page closed')) {
        navEndReason = "error";
        pageClosedPrematurely = true;
      } else {
        navEndReason = "error";
      }
    }
    perfMetrics.navMs = Math.round(performance.now() - navStart);

    log('debug', `[Renderer] Page state before evaluate for ${url}: isClosed=${page.isClosed()}`);
    if (page.isClosed()) {
      log('error', `[Renderer] Cannot evaluate DOM for ${url}, page is already closed (Reason: ${navEndReason}).`);
      return {
        modeUsed: cfg.render.mode,
        navEndReason,
        dom: '',
        domHash: sha256Hex(''),
        performance: perfMetrics,
        challengeDetected: false
      };
    }

    log('debug', `[Renderer] Evaluating DOM for ${url}`);
    const outerHTML = await page.evaluate(() => {
      // @ts-expect-error - Running in browser context
      return document.documentElement.outerHTML as string;
    });
    
    // Detect challenge page
    const statusCode = await page.evaluate(() => {
      // @ts-expect-error - Running in browser context
      return window.performance?.getEntries?.()?.[0]?.responseStatus;
    }).catch(() => undefined);
    
    const isChallengeDetected = detectChallengePage(page, outerHTML, statusCode);
    
    if (isChallengeDetected) {
      log('warn', `[Renderer] Challenge page detected for ${url}. Attempting smart wait (15s)...`);
      
      try {
        // Smart wait: Wait for challenge to resolve (Cloudflare typically shows then hides challenge)
        await page.waitForFunction(
          () => {
            // @ts-expect-error - Running in browser context
            const title = document.title.toLowerCase();
            // @ts-expect-error - Running in browser context
            const body = document.body.innerHTML.toLowerCase();
            
            // If title/content no longer contains challenge patterns, consider it resolved
            const challengePatterns = [
              'just a moment',
              'attention required',
              'checking your browser',
              'verifying you are',
              'security check'
            ];
            
            return !challengePatterns.some(pattern => 
              title.includes(pattern) || body.includes(pattern)
            );
          },
          { timeout: 15000 }
        );
        
        log('info', `[Renderer] Challenge resolved for ${url}. Re-capturing DOM...`);
        
        // Re-capture DOM after challenge resolution
        const resolvedHTML = await page.evaluate(() => {
          // @ts-expect-error - Running in browser context
          return document.documentElement.outerHTML as string;
        });
        
        const domHash = sha256Hex(resolvedHTML);
        await page.close();
        
        return {
          modeUsed: cfg.render.mode,
          navEndReason,
          dom: resolvedHTML,
          domHash,
          performance: perfMetrics,
          challengeDetected: false // Resolved successfully
        };
        
      } catch (waitError: any) {
        log('error', `[Renderer] Challenge did not resolve within 15s for ${url}: ${waitError.message}`);
        await page.close();
        
        // Return result with challengeDetected flag set
        return {
          modeUsed: cfg.render.mode,
          navEndReason: 'error',
          dom: outerHTML,
          domHash: sha256Hex(outerHTML),
          performance: perfMetrics,
          challengeDetected: true
        };
      }
    }
    
    const domHash = sha256Hex(outerHTML);
    log('debug', `[Renderer] DOM evaluation successful for ${url}`);

    await page.close();

    return {
      modeUsed: cfg.render.mode,
      navEndReason,
      dom: outerHTML,
      domHash,
      performance: perfMetrics,
      challengeDetected: false
    };

  } catch (error: any) {
    log('error', `[Renderer] Unexpected error during renderWithPlaywright for ${url}: ${error.message}`);
    if (!page.isClosed()) {
      await page.close().catch(() => {});
    }
    throw error;
  }
}
