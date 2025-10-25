/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { request } from "undici";
import pLimit from "p-limit";
import { sha256Hex } from "../utils/hashing.js";
import { robotsCache } from "./robotsCache.js";
import { log } from "../utils/logging.js";
// Global rate limiter
let globalLimiter = null;
/**
 * Initialize rate limiter based on config
 */
export function initRateLimiter(rps) {
    globalLimiter = pLimit(rps);
}
/**
 * Fetch URL with robots.txt check, retries, and rate limiting
 */
export async function fetchUrl(cfg, url) {
    // Initialize rate limiter if not already done
    if (!globalLimiter) {
        initRateLimiter(cfg.http.rps);
    }
    // Check robots.txt
    const robotsCheck = await robotsCache.shouldFetch(cfg, url);
    if (!robotsCheck.allow) {
        throw new Error(`Blocked by robots.txt: ${robotsCheck.matchedRule}`);
    }
    // Execute fetch with rate limiting
    return globalLimiter(() => fetchWithRetry(cfg, url, 0));
}
/**
 * Fetch with retry logic
 */
async function fetchWithRetry(cfg, url, attempt) {
    const maxRetries = 2;
    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
    try {
        return await performFetch(cfg, url);
    }
    catch (error) {
        const isRetryable = error.code === "ECONNRESET" ||
            error.code === "ETIMEDOUT" ||
            error.code === "UND_ERR_CONNECT_TIMEOUT" ||
            error.code === "UND_ERR_HEADERS_TIMEOUT" ||
            error.code === "UND_ERR_BODY_TIMEOUT" ||
            (error.statusCode >= 500 && error.statusCode < 600);
        if (isRetryable && attempt < maxRetries) {
            log("warn", `Retry ${attempt + 1}/${maxRetries} for ${url} after ${backoffMs}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            return fetchWithRetry(cfg, url, attempt + 1);
        }
        throw error;
    }
}
/**
 * Perform HTTP fetch with Undici
 */
async function performFetch(cfg, url) {
    const redirectChain = [];
    let currentUrl = url;
    let redirectCount = 0;
    const maxRedirects = 5;
    while (redirectCount <= maxRedirects) {
        const response = await request(currentUrl, {
            method: "GET",
            headers: {
                "User-Agent": cfg.http.userAgent,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            headersTimeout: 10000,
            bodyTimeout: 30000,
            maxRedirections: 0 // Handle redirects manually to track chain
        });
        const statusCode = response.statusCode;
        const headers = response.headers;
        // Handle redirects
        if (statusCode >= 300 && statusCode < 400) {
            const location = headers.location;
            if (!location) {
                throw new Error(`Redirect ${statusCode} without Location header`);
            }
            redirectChain.push(currentUrl);
            currentUrl = new URL(location, currentUrl).href;
            redirectCount++;
            if (redirectCount > maxRedirects) {
                throw new Error(`Too many redirects (${redirectCount})`);
            }
            continue;
        }
        // Read body with size limit
        const chunks = [];
        let totalBytes = 0;
        const maxBytes = cfg.render.maxBytesPerPage;
        for await (const chunk of response.body) {
            totalBytes += chunk.length;
            if (totalBytes > maxBytes) {
                response.body.destroy();
                throw new Error(`Response exceeds maxBytesPerPage (${maxBytes} bytes)`);
            }
            chunks.push(Buffer.from(chunk));
        }
        const bodyBuffer = Buffer.concat(chunks);
        const rawHtmlHash = sha256Hex(bodyBuffer);
        // Extract content type
        const contentType = headers["content-type"]?.split(";")[0];
        // Extract X-Robots-Tag header
        const robotsHeader = headers["x-robots-tag"];
        // Basic HTML parsing for title and text sample (fallback for raw mode)
        const html = bodyBuffer.toString("utf-8");
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : undefined;
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyText = bodyMatch
            ? bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
            : "";
        const textSample = bodyText.substring(0, 1500);
        return {
            statusCode,
            headers,
            bodyBuffer,
            contentType,
            finalUrl: currentUrl,
            redirectChain,
            rawHtmlHash,
            robotsHeader,
            title,
            textSample
        };
    }
    throw new Error("Unexpected state in fetch redirect loop");
}
//# sourceMappingURL=fetcher.js.map