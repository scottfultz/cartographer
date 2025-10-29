/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { Browser, BrowserContext } from "playwright";
import { chromium } from "playwright";
import { join } from "path";
import type { EngineConfig, NavEndReason, RenderMode } from "./types.js";
import { sha256Hex } from "../utils/hashing.js";
import { log } from "../utils/logging.js";
import type { FetchResult } from "./fetcher.js";
import { BrowserContextPool } from "./browserContextPool.js";
import { collectRuntimeWCAGData } from "./extractors/wcagData.js";
import { collectAdvancedPerformanceMetrics, detectFlashingContent } from "./extractors/enhancedMetrics.js";
import { detectKeyboardTraps, detectSkipLinks, analyzeMediaElements } from "./extractors/runtimeAccessibility.js";
import { createNetworkPerformanceCollector, type NetworkPerformanceMetrics } from "./extractors/networkPerformance.js";
import { extractLighthouseMetrics } from "./extractors/lighthouse.js";
import { captureDOMSnapshot } from "./extractors/domSnapshot.js";

// Browser lifecycle state
let browser: Browser | null = null;
let context: BrowserContext | null = null; // Legacy single context (used when persistSession is disabled)
let contextPool: BrowserContextPool | null = null; // Pool for persistent sessions
let pagesRendered = 0;
const CONTEXT_RECYCLE_THRESHOLD = 50;
let persistSessionEnabled = false;
let stealthModeEnabled = false;

export interface RenderResult {
  modeUsed: RenderMode;
  navEndReason: NavEndReason;
  dom: string;
  domHash: string;
  renderMs: number;
  performance: Record<string, number>;
  
  // Atlas v1.0 Enhancement - Phase 3B: Timing metadata
  wait_condition?: "domcontentloaded" | "networkidle0" | "networkidle2" | "load";
  timings?: {
    nav_start: number;
    dom_content_loaded?: number;
    load_event_end?: number;
    network_idle_reached?: number;
    first_paint?: number;
    first_contentful_paint?: number;
  };
  
  challengeDetected?: boolean;
  challengePageCaptured?: boolean; // True if we captured challenge page content (not real page data)
  screenshots?: {
    desktop?: Buffer;
    mobile?: Buffer;
  };
  favicon?: {
    url: string;
    data: Buffer;
    mimeType: string;
  };
  runtimeWCAGData?: any; // Runtime-only WCAG data collected in Playwright mode
  networkMetrics?: NetworkPerformanceMetrics; // Network performance data (prerender/full modes)
  domSnapshot?: any; // DOM snapshot for offline accessibility audits (full mode only)
}

/**
 * Initialize Playwright browser (Chromium only)
 */
export async function initBrowser(cfg: EngineConfig, enablePersistSession = false, enableStealth = false): Promise<void> {
  if (browser) {
    log("warn", "Browser already initialized");
    return;
  }

  log("info", `Initializing Chromium browser (concurrency: ${cfg.render.concurrency}${enableStealth ? ', stealth mode' : ''})`);
  
  stealthModeEnabled = enableStealth;

  if (enableStealth) {
    // Use playwright-extra with stealth plugin
    try {
      const { chromium: chromiumExtra } = await import('playwright-extra');
      const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
      
      chromiumExtra.use(StealthPlugin());
      
      browser = await chromiumExtra.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage'
        ]
      }) as Browser;
      
      log("info", "✓ Stealth mode enabled - automation signals hidden");
    } catch (error: any) {
      log("warn", `Failed to initialize stealth mode: ${error.message}. Falling back to standard browser.`);
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  } else {
    // Standard Playwright browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  persistSessionEnabled = enablePersistSession;

  if (enablePersistSession) {
    // Use persistent context pool
    const sessionDir = join(process.cwd(), '.cartographer', 'sessions');
    contextPool = new BrowserContextPool(browser, cfg, sessionDir);
    log("info", `✓ Renderer setup verified – persistent sessions enabled (${sessionDir}) ✓ Playwright installed ✓`);
  } else {
    // Use single shared context (legacy mode)
    context = await browser.newContext({
      userAgent: cfg.http.userAgent,
      viewport: { width: 1280, height: 720 }
    });
    log("info", "✓ Renderer setup verified – default mode: prerender ✓ Playwright installed ✓");
  }
}

/**
 * Close browser and cleanup
 */
export async function closeBrowser(): Promise<void> {
  if (contextPool) {
    await contextPool.closeAllContexts();
    contextPool = null;
  }
  
  if (context) {
    await context.close();
    context = null;
  }
  
  if (browser) {
    await browser.close();
    browser = null;
  }
  
  pagesRendered = 0;
  persistSessionEnabled = false;
  stealthModeEnabled = false;
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
  if (!browser) {
    throw new Error("Browser not initialized. Call initBrowser() first.");
  }
  
  if (!persistSessionEnabled && !context) {
    throw new Error("Browser context not initialized.");
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
    log('debug', `[Challenge Detection] Matched status code: ${statusCode}`);
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
    const matchedTitle = challengeTitles.find(pattern => title.includes(pattern));
    if (matchedTitle) {
      log('debug', `[Challenge Detection] Matched title pattern: "${matchedTitle}" in title: "${title}"`);
      return true;
    }
  }

  // Check for common challenge page DOM patterns using proper attribute/class checks
  // Instead of checking for CSS selector strings, check for actual HTML patterns
  const patterns = [
    { name: 'cf-challenge-form', check: (h: string) => h.includes('id="cf-challenge-form"') || h.includes('cf-challenge-form') },
    { name: 'cf-browser-verification', check: (h: string) => h.includes('cf-browser-verification') },
    { name: 'challenge-form', check: (h: string) => h.includes('id="challenge-form"') || h.includes('challenge-form') },
    { name: 'data-ray-id', check: (h: string) => h.includes('data-ray-id=') },
    { name: 'ray-id class', check: (h: string) => h.includes('class="ray-id"') || h.includes('ray-id') },
    { name: 'captcha', check: (h: string) => h.includes('id="captcha"') || h.includes('g-recaptcha') }
  ];

  for (const pattern of patterns) {
    if (pattern.check(html)) {
      log('debug', `[Challenge Detection] Matched DOM pattern: ${pattern.name}`);
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
  // Get appropriate context (persistent pool or legacy single context)
  let pageContext: BrowserContext;
  
  if (persistSessionEnabled && contextPool) {
    // Extract origin from URL for context selection
    const urlObj = new URL(url);
    const origin = urlObj.origin; // e.g., "https://example.com"
    pageContext = await contextPool.getContext(origin);
    log('debug', `[Renderer] Using persistent context for origin: ${origin}`);
  } else {
    if (!context) {
      throw new Error("Browser context not available");
    }
    pageContext = context;
  }

  log('debug', `[Renderer] Creating new page for ${url}`);
  const page = await pageContext.newPage();
  const perfMetrics: Record<string, number> = {};
  let requestCount = 0;
  let bytesLoaded = 0;
  let navEndReason: NavEndReason = "networkidle";
  let pageClosedPrematurely = false;
  
  // Initialize network performance collector
  const networkCollector = createNetworkPerformanceCollector(page);
  networkCollector.start();

  try {
    // Request interception for caps and privacy
    await page.route('**/*', (route) => {
      requestCount++;
      if (requestCount > cfg.render.maxRequestsPerPage) {
        log('warn', `[Renderer] Max requests (${cfg.render.maxRequestsPerPage}) hit for ${url}. Aborting further requests.`);
        navEndReason = "error";
        route.abort('failed');
        return;
      }
      
      // Apply privacy settings
      const headers = { ...route.request().headers() };
      if (cfg.privacy?.stripCookies && headers['cookie']) {
        delete headers['cookie'];
      }
      if (cfg.privacy?.stripAuthHeaders && headers['authorization']) {
        delete headers['authorization'];
      }
      
      route.continue({ headers });
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
      
      // Stop network collector before returning
      networkCollector.stop();
      const networkMetrics = networkCollector.getMetrics();
      
      return {
        modeUsed: cfg.render.mode,
        navEndReason,
        dom: '',
        domHash: sha256Hex(''),
        performance: perfMetrics,
        challengeDetected: false,
        networkMetrics
      };
    }

    log('debug', `[Renderer] Evaluating DOM for ${url}`);
    const outerHTML = await page.evaluate(() => {
      // @ts-expect-error - Running in browser context
      return document.documentElement.outerHTML as string;
    });
    
    // ===== CAPTURE SCREENSHOTS IMMEDIATELY (before any early returns) =====
    // This ensures screenshots are captured even if page times out or has challenges
    const screenshots: { desktop?: Buffer; mobile?: Buffer } = {};
    
    if (cfg.render.mode === "full" && cfg.media?.screenshots?.enabled) {
      const screenshotFormat = cfg.media.screenshots.format || 'jpeg';
      const screenshotQuality = cfg.media.screenshots.quality || 80;
      
      try {
        // Desktop screenshot (current viewport is already 1280×720)
        if (cfg.media.screenshots.desktop) {
          log('debug', `[Renderer] Capturing desktop screenshot for ${url}`);
          screenshots.desktop = await page.screenshot({
            type: screenshotFormat,
            quality: screenshotFormat === 'jpeg' ? screenshotQuality : undefined,
            fullPage: false // Above-the-fold only
          });
        }
        
        // Mobile screenshot (switch viewport)
        if (cfg.media.screenshots.mobile) {
          log('debug', `[Renderer] Capturing mobile screenshot for ${url}`);
          await page.setViewportSize({ width: 375, height: 667 });
          await page.waitForTimeout(500); // Allow reflow
          
          screenshots.mobile = await page.screenshot({
            type: screenshotFormat,
            quality: screenshotFormat === 'jpeg' ? screenshotQuality : undefined,
            fullPage: false // Above-the-fold only
          });
        }
        
        log('debug', `[Renderer] Screenshot capture complete for ${url} (desktop: ${!!screenshots.desktop}, mobile: ${!!screenshots.mobile})`);
      } catch (screenshotError: any) {
        log('warn', `[Renderer] Failed to capture screenshots for ${url}: ${screenshotError.message}`);
        // Don't fail the crawl if screenshots fail - just log and continue
      }
    } else if (cfg.media?.screenshots?.enabled && cfg.render.mode !== "full") {
      log('debug', `[Renderer] Screenshot capture skipped (mode=${cfg.render.mode}, requires full mode)`);
    }
    
    // ===== CAPTURE FAVICON IMMEDIATELY (before any early returns) =====
    let favicon: { url: string; data: Buffer; mimeType: string } | undefined;
    
    if (cfg.render.mode === "full" && cfg.media?.favicons?.enabled) {
      try {
        log('debug', `[Renderer] Collecting favicon for ${url}`);
        
        // Extract favicon URL from page (DOM APIs available in browser context)
        const faviconUrl = await page.evaluate(() => {
          // Look for various favicon link tags
          const selectors = [
            'link[rel="icon"]',
            'link[rel="shortcut icon"]',
            'link[rel="apple-touch-icon"]',
            'link[rel="apple-touch-icon-precomposed"]'
          ];
          
          for (const selector of selectors) {
            // @ts-ignore - DOM APIs available in browser context
            const link = document.querySelector(selector);
            if (link?.href) {
              return link.href;
            }
          }
          
          // Fallback to /favicon.ico
          // @ts-ignore - window available in browser context
          return new URL('/favicon.ico', window.location.origin).href;
        });
        
        if (faviconUrl) {
          // Download favicon
          const response = await page.context().request.get(faviconUrl, {
            timeout: 5000,
            failOnStatusCode: false
          });
          
          if (response.ok()) {
            const data = await response.body();
            const contentType = response.headers()['content-type'] || 'image/x-icon';
            
            favicon = {
              url: faviconUrl,
              data,
              mimeType: contentType
            };
            
            log('debug', `[Renderer] Favicon collected: ${faviconUrl} (${data.length} bytes, ${contentType})`);
          } else {
            log('debug', `[Renderer] Favicon not found or failed to download: ${faviconUrl} (status ${response.status()})`);
          }
        }
      } catch (faviconError: any) {
        log('debug', `[Renderer] Failed to collect favicon for ${url}: ${faviconError.message}`);
        // Don't fail the crawl if favicon collection fails
      }
    }
    // ===== END EARLY MEDIA CAPTURE =====
    
    // Detect challenge page
    const statusCode = await page.evaluate(() => {
      // @ts-expect-error - Running in browser context
      return window.performance?.getEntries?.()?.[0]?.responseStatus;
    }).catch(() => undefined);
    
    const isChallengeDetected = detectChallengePage(page, outerHTML, statusCode);
    
    if (isChallengeDetected) {
      // Only wait for challenge resolution if we didn't already timeout
      // If page.goto() timed out, we already waited 30 seconds - don't wait another 15s!
      const shouldWaitForResolution = navEndReason !== 'timeout';
      
      if (shouldWaitForResolution) {
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
          
          // Stop network collector and get metrics
          networkCollector.stop();
          const networkMetrics = networkCollector.getMetrics();
          
          await page.close();
          
          return {
            modeUsed: cfg.render.mode,
            navEndReason,
            dom: resolvedHTML,
            domHash,
            performance: perfMetrics,
            challengeDetected: false, // Resolved successfully
            screenshots: Object.keys(screenshots).length > 0 ? screenshots : undefined,
            favicon,
            networkMetrics
          };
          
        } catch (waitError: any) {
          log('warn', `[Renderer] Challenge did not resolve within 15s for ${url}. Capturing challenge page content for review.`);
          
          // Instead of erroring, capture the challenge page content
          // Mark it as untrusted so consumers know it's not real page data
          const domHash = sha256Hex(outerHTML);
          
          // Stop network collector and get metrics
          networkCollector.stop();
          const networkMetrics = networkCollector.getMetrics();
          
          await page.close();
          
          return {
            modeUsed: cfg.render.mode,
            navEndReason: 'timeout',
            dom: outerHTML,
            domHash,
            performance: perfMetrics,
            challengeDetected: true,
            challengePageCaptured: true, // Flag for consumers: this is challenge page, not real content
            screenshots: Object.keys(screenshots).length > 0 ? screenshots : undefined,
            favicon,
            networkMetrics
          };
        }
      } else {
        // Already timed out waiting for networkidle - don't wait another 15s
        // This is likely a false positive (page loaded slowly, not a challenge)
        log('warn', `[Renderer] Challenge patterns detected but page already timed out (${perfMetrics.navMs}ms). Likely false positive - capturing page as-is.`);
        
        const domHash = sha256Hex(outerHTML);
        
        // Stop network collector and get metrics
        networkCollector.stop();
        const networkMetrics = networkCollector.getMetrics();
        
        await page.close();
        
        return {
          modeUsed: cfg.render.mode,
          navEndReason,
          dom: outerHTML,
          domHash,
          performance: perfMetrics,
          challengeDetected: false, // Don't set flag - likely false positive
          challengePageCaptured: undefined, // Not a challenge, just slow
          screenshots: Object.keys(screenshots).length > 0 ? screenshots : undefined,
          favicon,
          networkMetrics
        };
      }
    }
    
    const domHash = sha256Hex(outerHTML);
    log('debug', `[Renderer] DOM evaluation successful for ${url}`);

    // === CAPTURE PERFORMANCE TIMING DATA (Atlas v1.0 Enhancement - Phase 3B) ===
    let perfTimingData: {
      nav_start: number;
      dom_content_loaded?: number;
      load_event_end?: number;
      network_idle_reached?: number;
      first_paint?: number;
      first_contentful_paint?: number;
    } | undefined;
    
    let waitCondition: "domcontentloaded" | "networkidle0" | "networkidle2" | "load" | undefined;
    
    try {
      log('debug', `[Renderer] Capturing performance timing data for ${url}`);
      
      // Determine wait condition based on render mode and actual navigation outcome
      if (cfg.render.mode === "raw") {
        waitCondition = undefined; // No JS execution
      } else if (cfg.render.mode === "prerender") {
        waitCondition = "load";
      } else if (cfg.render.mode === "full") {
        // Default to networkidle0 for full mode
        waitCondition = "networkidle0";
      }
      
      // Capture performance timing from browser
      perfTimingData = await page.evaluate(() => {
        // @ts-expect-error - Running in browser context, window available
        const perf = window.performance;
        const timing = perf.timing;
        const paintEntries = perf.getEntriesByType('paint');
        
        return {
          nav_start: perf.timeOrigin,
          dom_content_loaded: timing.domContentLoadedEventEnd > 0 ? timing.domContentLoadedEventEnd : undefined,
          load_event_end: timing.loadEventEnd > 0 ? timing.loadEventEnd : undefined,
          network_idle_reached: undefined, // Not directly available, approximated by networkidle event
          first_paint: paintEntries.find((e: any) => e.name === 'first-paint')?.startTime,
          first_contentful_paint: paintEntries.find((e: any) => e.name === 'first-contentful-paint')?.startTime
        };
      });
      
      log('debug', `[Renderer] Performance timing captured: nav_start=${perfTimingData.nav_start}, dclEnd=${perfTimingData.dom_content_loaded}, loadEnd=${perfTimingData.load_event_end}, fcp=${perfTimingData.first_contentful_paint}`);
    } catch (timingError: any) {
      log('warn', `[Renderer] Failed to capture performance timing data for ${url}: ${timingError.message}`);
      // Don't fail the crawl if timing capture fails
    }
    // === END TIMING CAPTURE ===

    // NOTE: Screenshots and favicons are now captured EARLY (right after DOM extraction)
    // to ensure they're captured even if page times out or has challenges.
    // See lines 405-498 for screenshot/favicon capture logic.
    
    // Collect runtime-only WCAG data if in full mode and accessibility enabled
    let runtimeWCAGData: any = undefined;
    
    if (cfg.render.mode === "full" && cfg.accessibility?.enabled !== false) {
      try {
        log('debug', `[Renderer] Collecting runtime WCAG data for ${url}`);
        runtimeWCAGData = await collectRuntimeWCAGData(page);
        
        // Add flashing content detection (WCAG 2.3.1)
        const flashingContent = await detectFlashingContent(page);
        if (flashingContent) {
          runtimeWCAGData.flashingContent = flashingContent;
        }
        
        // Phase 1 Enhancements: Runtime accessibility analysis
        log('debug', `[Renderer] Collecting Phase 1 runtime accessibility data for ${url}`);
        
        // Keyboard trap detection (WCAG 2.1.2)
        const keyboardTraps = await detectKeyboardTraps(page);
        if (keyboardTraps) {
          runtimeWCAGData.keyboardTraps = keyboardTraps;
        }
        
        // Skip links detection (WCAG 2.4.1)
        const skipLinks = await detectSkipLinks(page);
        if (skipLinks) {
          runtimeWCAGData.skipLinksEnhanced = skipLinks;
        }
        
        // Video/audio analysis (WCAG 1.2.x)
        const mediaElements = await analyzeMediaElements(page);
        if (mediaElements) {
          runtimeWCAGData.mediaElementsEnhanced = mediaElements;
        }
        
        log('debug', `[Renderer] Runtime WCAG data collected (targetSize: ${runtimeWCAGData?.targetSize?.length || 0}, focusAppearance: ${runtimeWCAGData?.focusAppearance?.length || 0}, keyboardTraps: ${keyboardTraps?.suspiciousElements?.length || 0}, skipLinks: ${skipLinks?.links?.length || 0}, videos: ${mediaElements?.videos?.length || 0}, audios: ${mediaElements?.audios?.length || 0})`);
      } catch (wcagError: any) {
        log('warn', `[Renderer] Failed to collect runtime WCAG data for ${url}: ${wcagError.message}`);
        // Don't fail the crawl if WCAG data collection fails
      }
    }
    
    // Collect advanced performance metrics if in full mode
    if (cfg.render.mode === "full") {
      try {
        log('debug', `[Renderer] Collecting advanced performance metrics for ${url}`);
        const advancedPerf = await collectAdvancedPerformanceMetrics(page);
        // Merge into perfMetrics
        Object.assign(perfMetrics, advancedPerf);
        log('debug', `[Renderer] Advanced performance metrics collected (tti: ${advancedPerf.tti}, jsExecution: ${advancedPerf.jsExecutionTime}, thirdParty: ${advancedPerf.thirdPartyRequestCount})`);
      } catch (perfError: any) {
        log('warn', `[Renderer] Failed to collect advanced performance metrics for ${url}: ${perfError.message}`);
        // Don't fail the crawl if performance metrics fail
      }
      
      // Collect Lighthouse-style metrics (Core Web Vitals, etc.)
      try {
        log('debug', `[Renderer] Collecting Lighthouse metrics for ${url}`);
        const lighthouseMetrics = await extractLighthouseMetrics(page);
        // Merge into perfMetrics
        Object.assign(perfMetrics, {
          lcp: lighthouseMetrics.lcp,
          cls: lighthouseMetrics.cls,
          inp: lighthouseMetrics.inp,
          ttfb: lighthouseMetrics.ttfb,
          fcp: lighthouseMetrics.fcp,
          tbt: lighthouseMetrics.tbt,
          speedIndex: lighthouseMetrics.speedIndex,
          lighthouseScores: lighthouseMetrics.scores
        });
        log('debug', `[Renderer] Lighthouse metrics collected (LCP: ${lighthouseMetrics.lcp}ms, CLS: ${lighthouseMetrics.cls}, INP: ${lighthouseMetrics.inp}ms)`);
      } catch (lhError: any) {
        log('warn', `[Renderer] Failed to collect Lighthouse metrics for ${url}: ${lhError.message}`);
        // Don't fail the crawl if Lighthouse metrics fail
      }
    }
    
    // NOTE: Favicon collection is now done EARLY (right after DOM extraction)
    // to ensure it's captured even if page times out or has challenges.
    // See lines 445-498 for favicon capture logic.

    // Stop network collector and get metrics
    networkCollector.stop();
    const networkMetrics = networkCollector.getMetrics();
    log('debug', `[Renderer] Network metrics collected: ${networkMetrics.totalRequests} requests, ${Math.round(networkMetrics.totalBytes / 1024)}KB`);

    // Capture DOM snapshot for offline accessibility audits (full mode only)
    let domSnapshotData;
    if (cfg.render.mode === "full") {
      try {
        log('debug', `[Renderer] Capturing DOM snapshot for ${url}`);
        // Capture DOM snapshot without page_id (will be added in scheduler)
        domSnapshotData = await captureDOMSnapshot(page, {
          pageId: "", // Will be filled in by scheduler
          stylesApplied: true,
          scriptsExecuted: true
        });
        log('debug', `[Renderer] Captured DOM snapshot: ${domSnapshotData.node_count} nodes`);
      } catch (domError: any) {
        log('warn', `[Renderer] Failed to capture DOM snapshot for ${url}: ${domError.message}`);
      }
    }

    await page.close();

    return {
      modeUsed: cfg.render.mode,
      navEndReason,
      dom: outerHTML,
      domHash,
      performance: perfMetrics,
      challengeDetected: false,
      wait_condition: waitCondition,
      timings: perfTimingData,
      screenshots: Object.keys(screenshots).length > 0 ? screenshots : undefined,
      favicon,
      runtimeWCAGData,
      networkMetrics,
      domSnapshot: domSnapshotData
    };

  } catch (error: any) {
    log('error', `[Renderer] Unexpected error during renderWithPlaywright for ${url}: ${error.message}`);
    if (!page.isClosed()) {
      await page.close().catch(() => {});
    }
    throw error;
  }
}
