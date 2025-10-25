/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import * as cheerio from "cheerio";
/**
 * Extract character encoding from HTML
 */
export function extractEncoding(opts) {
    const { html, contentTypeHeader } = opts;
    // Try Content-Type header first
    if (contentTypeHeader) {
        const charsetMatch = contentTypeHeader.match(/charset=([^;,\s]+)/i);
        if (charsetMatch) {
            return {
                encoding: charsetMatch[1].trim().toUpperCase(),
                source: "header"
            };
        }
    }
    // Try <meta charset> tag
    const $ = cheerio.load(html);
    const metaCharset = $('meta[charset]').attr('charset');
    if (metaCharset) {
        return {
            encoding: metaCharset.trim().toUpperCase(),
            source: "meta"
        };
    }
    // Try <meta http-equiv="Content-Type"> tag
    const metaContentType = $('meta[http-equiv="Content-Type"]').attr('content');
    if (metaContentType) {
        const charsetMatch = metaContentType.match(/charset=([^;,\s]+)/i);
        if (charsetMatch) {
            return {
                encoding: charsetMatch[1].trim().toUpperCase(),
                source: "meta"
            };
        }
    }
    return undefined;
}
/**
 * Count resource types in HTML
 */
export function countResources(html) {
    const $ = cheerio.load(html);
    // Count stylesheets (external and inline)
    const cssCount = $('link[rel="stylesheet"]').length;
    const inlineStyles = $('style').length;
    // Count scripts (external and inline)
    const externalScripts = $('script[src]').length;
    const inlineScripts = $('script:not([src])').length;
    const jsCount = externalScripts;
    // Count font preloads and font-face declarations
    let fontCount = 0;
    // Count <link rel="preload" as="font">
    fontCount += $('link[rel="preload"][as="font"]').length;
    // Count font-face in inline styles (approximate)
    $('style').each((_, el) => {
        const styleContent = $(el).text();
        const fontFaceMatches = styleContent.match(/@font-face/gi);
        if (fontFaceMatches) {
            fontCount += fontFaceMatches.length;
        }
    });
    return {
        cssCount,
        jsCount,
        fontCount,
        inlineStyles,
        inlineScripts
    };
}
/**
 * Detect flashing content for WCAG 2.3.1 (seizure risk)
 */
export async function detectFlashingContent(page) {
    try {
        const result = await page.evaluate(() => {
            const findings = {
                hasBlinkTag: false,
                hasMarqueeTag: false,
                hasAnimations: false,
                animationCount: 0,
                suspiciousAnimations: []
            };
            // Check for deprecated blink/marquee tags
            const doc = globalThis.document;
            findings.hasBlinkTag = doc.querySelectorAll('blink').length > 0;
            findings.hasMarqueeTag = doc.querySelectorAll('marquee').length > 0;
            // Check for CSS animations that might be flashing
            const allElements = doc.querySelectorAll('*');
            allElements.forEach((el, idx) => {
                const computed = globalThis.getComputedStyle(el);
                const animationName = computed.animationName;
                const animationDuration = computed.animationDuration;
                const animationIterationCount = computed.animationIterationCount;
                if (animationName && animationName !== 'none') {
                    findings.hasAnimations = true;
                    findings.animationCount++;
                    // Flag animations that iterate infinitely or many times (potential flashing)
                    if (animationIterationCount === 'infinite' || parseInt(animationIterationCount) > 10) {
                        const selector = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${Array.from(el.classList).join('.')}` : '') || `element[${idx}]`;
                        findings.suspiciousAnimations.push({
                            selector: selector.substring(0, 100), // Limit length
                            duration: animationDuration,
                            iterationCount: animationIterationCount
                        });
                    }
                }
            });
            // Limit suspicious animations to top 10
            findings.suspiciousAnimations = findings.suspiciousAnimations.slice(0, 10);
            return findings;
        });
        return result;
    }
    catch (error) {
        // If page evaluation fails, return safe defaults
        return {
            hasBlinkTag: false,
            hasMarqueeTag: false,
            hasAnimations: false,
            animationCount: 0,
            suspiciousAnimations: []
        };
    }
}
/**
 * Extract compression information from headers
 */
export function extractCompression(headers) {
    const contentEncoding = headers["content-encoding"] || headers["Content-Encoding"];
    if (!contentEncoding) {
        return { compression: "none" };
    }
    const encoding = Array.isArray(contentEncoding) ? contentEncoding[0] : contentEncoding;
    const lowerEncoding = encoding.toLowerCase().trim();
    // Map to standard compression types
    if (lowerEncoding.includes("br")) {
        return { compression: "brotli", contentEncoding: encoding };
    }
    else if (lowerEncoding.includes("gzip")) {
        return { compression: "gzip", contentEncoding: encoding };
    }
    else if (lowerEncoding.includes("deflate")) {
        return { compression: "deflate", contentEncoding: encoding };
    }
    else if (lowerEncoding === "identity" || lowerEncoding === "none") {
        return { compression: "none", contentEncoding: encoding };
    }
    else {
        return { compression: encoding, contentEncoding: encoding };
    }
}
/**
 * Extract viewport meta tag information
 */
export function extractViewportMeta(html) {
    const $ = cheerio.load(html);
    const viewportMeta = $('meta[name="viewport"]');
    if (viewportMeta.length === 0) {
        return undefined;
    }
    const content = viewportMeta.attr("content") || "";
    const result = {
        content,
        hasViewport: true,
    };
    // Parse common viewport properties
    const parts = content.split(",").map((p) => p.trim());
    for (const part of parts) {
        const [key, value] = part.split("=").map((s) => s.trim());
        if (key === "width") {
            result.width = value;
        }
        else if (key === "initial-scale") {
            result.initialScale = parseFloat(value);
        }
    }
    return result;
}
/**
 * Detect mixed content issues (HTTP resources on HTTPS pages)
 */
export function detectMixedContent(opts) {
    const { pageUrl, html } = opts;
    // Only check if page is HTTPS
    if (!pageUrl.startsWith("https://")) {
        return [];
    }
    const $ = cheerio.load(html);
    const issues = [];
    // Check scripts
    $("script[src]").each((_, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http://")) {
            issues.push({ assetUrl: src, type: "script" });
        }
    });
    // Check stylesheets
    $("link[rel='stylesheet'][href]").each((_, el) => {
        const href = $(el).attr("href");
        if (href && href.startsWith("http://")) {
            issues.push({ assetUrl: href, type: "stylesheet" });
        }
    });
    // Check images
    $("img[src]").each((_, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http://")) {
            issues.push({ assetUrl: src, type: "image" });
        }
    });
    // Check videos
    $("video[src], video source[src]").each((_, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http://")) {
            issues.push({ assetUrl: src, type: "video" });
        }
    });
    // Check audios
    $("audio[src], audio source[src]").each((_, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http://")) {
            issues.push({ assetUrl: src, type: "audio" });
        }
    });
    // Check iframes
    $("iframe[src]").each((_, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http://")) {
            issues.push({ assetUrl: src, type: "iframe" });
        }
    });
    return issues;
}
/**
 * Check Subresource Integrity (SRI) on scripts and stylesheets
 */
export function checkSubresourceIntegrity(html) {
    const $ = cheerio.load(html);
    let totalScripts = 0;
    let scriptsWithSRI = 0;
    let totalStyles = 0;
    let stylesWithSRI = 0;
    const missingResources = [];
    // Check external scripts (ignore inline scripts and relative URLs for SRI)
    $("script[src]").each((_, el) => {
        const src = $(el).attr("src");
        if (!src)
            return;
        // Only count external resources (different origin or CDN)
        if (src.startsWith("http://") || src.startsWith("https://")) {
            totalScripts++;
            const integrity = $(el).attr("integrity");
            if (integrity) {
                scriptsWithSRI++;
            }
            else {
                missingResources.push({ url: src, type: "script" });
            }
        }
    });
    // Check external stylesheets
    $("link[rel='stylesheet'][href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href)
            return;
        // Only count external resources
        if (href.startsWith("http://") || href.startsWith("https://")) {
            totalStyles++;
            const integrity = $(el).attr("integrity");
            if (integrity) {
                stylesWithSRI++;
            }
            else {
                missingResources.push({ url: href, type: "stylesheet" });
            }
        }
    });
    return {
        totalScripts,
        totalStyles,
        scriptsWithSRI,
        stylesWithSRI,
        missingResources: missingResources.length > 0 ? missingResources.slice(0, 20) : undefined, // Limit to 20
    };
}
/**
 * Extract additional performance metrics from Playwright page
 */
export async function collectAdvancedPerformanceMetrics(page) {
    try {
        // Collect performance metrics
        const metrics = await page.evaluate(() => {
            const result = {};
            // Check for Web Vitals API
            if (typeof PerformanceObserver !== "undefined") {
                // Note: FID and INP require user interaction, so we can't measure them in headless crawls
                // But we can check if the APIs are available and return placeholder data
                result.fidSupported = "PerformanceEventTiming" in globalThis;
                result.inpSupported = "PerformanceEventTiming" in globalThis;
            }
            // Get Core Web Vitals using PerformanceObserver
            // Note: These are approximations since they're collected at crawl time, not from real users
            try {
                const paintEntries = performance.getEntriesByType("paint");
                const fcpEntry = paintEntries.find((e) => e.name === "first-contentful-paint");
                if (fcpEntry) {
                    result.fcp = Math.round(fcpEntry.startTime);
                }
            }
            catch (e) {
                // Ignore
            }
            // Try to get LCP from PerformanceObserver
            try {
                const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
                if (lcpEntries.length > 0) {
                    result.lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
                }
            }
            catch (e) {
                // Ignore
            }
            // Try to get CLS from LayoutShift entries
            try {
                const layoutShifts = performance.getEntriesByType("layout-shift");
                let clsScore = 0;
                for (const shift of layoutShifts) {
                    if (!shift.hadRecentInput) {
                        clsScore += shift.value;
                    }
                }
                if (clsScore > 0) {
                    result.cls = Math.round(clsScore * 1000) / 1000; // Round to 3 decimals
                }
            }
            catch (e) {
                // Ignore
            }
            // Get performance entries
            if (performance && performance.getEntriesByType) {
                const navigationEntries = performance.getEntriesByType("navigation");
                const navigation = navigationEntries[0];
                if (navigation) {
                    // Time to Interactive approximation (domInteractive - fetchStart)
                    result.tti = navigation.domInteractive - navigation.fetchStart;
                    // Time to First Byte
                    result.ttfb = navigation.responseStart - navigation.fetchStart;
                    // Total Blocking Time (TBT) approximation
                    // Sum of long tasks > 50ms
                    try {
                        const longTasks = performance.getEntriesByType("longtask");
                        let tbtTime = 0;
                        for (const task of longTasks) {
                            const blockingTime = task.duration - 50;
                            if (blockingTime > 0) {
                                tbtTime += blockingTime;
                            }
                        }
                        if (tbtTime > 0) {
                            result.tbt = Math.round(tbtTime);
                        }
                    }
                    catch (e) {
                        // Long Tasks API might not be available
                    }
                }
                // JavaScript execution time (rough approximation from script resources)
                const resources = performance.getEntriesByType("resource");
                let jsTime = 0;
                let thirdPartyCount = 0;
                const currentOrigin = globalThis.location.origin;
                const renderBlocking = [];
                resources.forEach((resource) => {
                    const url = resource.name;
                    // Count third-party requests
                    try {
                        const resourceUrl = new URL(url);
                        if (resourceUrl.origin !== currentOrigin) {
                            thirdPartyCount++;
                        }
                    }
                    catch (e) {
                        // Ignore parse errors
                    }
                    // Sum JavaScript execution time
                    if (resource.initiatorType === "script") {
                        jsTime += resource.duration;
                        // Detect render-blocking scripts (loaded before DOMContentLoaded)
                        if (navigation && resource.fetchStart < navigation.domContentLoadedEventStart) {
                            renderBlocking.push({
                                url: resource.name,
                                type: "script",
                                size: resource.transferSize || resource.encodedBodySize,
                            });
                        }
                    }
                    // Detect render-blocking stylesheets
                    if (resource.initiatorType === "link" || resource.initiatorType === "css") {
                        if (navigation && resource.fetchStart < navigation.domContentLoadedEventStart) {
                            renderBlocking.push({
                                url: resource.name,
                                type: "stylesheet",
                                size: resource.transferSize || resource.encodedBodySize,
                            });
                        }
                    }
                });
                result.jsExecutionTime = Math.round(jsTime);
                result.thirdPartyRequestCount = thirdPartyCount;
                result.renderBlockingResources = renderBlocking.slice(0, 20); // Limit to 20
            }
            return result;
        });
        // Log what we collected for debugging
        const hasMetrics = Object.keys(metrics).filter(k => metrics[k] !== undefined && k !== 'fidSupported' && k !== 'inpSupported').length > 0;
        return {
            lcp: metrics.lcp ? Math.round(metrics.lcp) : undefined,
            cls: metrics.cls,
            tbt: metrics.tbt ? Math.round(metrics.tbt) : undefined,
            fcp: metrics.fcp ? Math.round(metrics.fcp) : undefined,
            ttfb: metrics.ttfb ? Math.round(metrics.ttfb) : undefined,
            tti: metrics.tti ? Math.round(metrics.tti) : undefined,
            jsExecutionTime: metrics.jsExecutionTime || undefined,
            renderBlockingResources: metrics.renderBlockingResources,
            thirdPartyRequestCount: metrics.thirdPartyRequestCount,
            // Note: FID and INP require real user interaction, can't be measured in automated crawls
            // These would need to be collected via RUM (Real User Monitoring) integration
        };
    }
    catch (error) {
        // Fail silently - performance metrics are nice-to-have
        return {};
    }
}
/**
 * Extract sitemap presence from robots.txt
 * Data collection only - stores sitemap URLs found in robots.txt
 */
export async function detectSitemaps(opts) {
    const { origin, robotsTxt } = opts;
    const sitemapUrls = [];
    // Parse robots.txt for sitemap directives
    if (robotsTxt) {
        const lines = robotsTxt.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.toLowerCase().startsWith('sitemap:')) {
                const url = trimmed.substring(8).trim();
                if (url) {
                    sitemapUrls.push(url);
                }
            }
        }
    }
    return {
        hasSitemap: sitemapUrls.length > 0,
        sitemapUrls
    };
}
/**
 * Count broken outbound links from edge data
 * Data collection only - counts edges with HTTP status >= 400
 */
export function countBrokenLinks(edges) {
    let count = 0;
    for (const edge of edges) {
        if (edge.httpStatusAtTo && edge.httpStatusAtTo >= 400) {
            count++;
        }
    }
    return count;
}
/**
 * Extract unique outbound domains from edge data
 * Data collection only - lists distinct external domains
 */
export function extractOutboundDomains(edges) {
    const domains = new Set();
    for (const edge of edges) {
        if (edge.isExternal) {
            try {
                const url = new URL(edge.targetUrl);
                domains.add(url.hostname);
            }
            catch {
                // Skip malformed URLs
            }
        }
    }
    return Array.from(domains).sort();
}
//# sourceMappingURL=enhancedMetrics.js.map