/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { load as cheerioLoad } from "cheerio";
import { safeJoinUrl } from "../../utils/url.js";
/**
 * Extract page metadata from HTML
 */
export function extractPageFacts(input) {
    const $ = cheerioLoad(input.html);
    // Basic facts
    const title = $("title").first().text().trim() || undefined;
    const metaDescription = $('meta[name="description"]').attr("content") || undefined;
    const h1 = $("h1").first().text().trim() || undefined;
    // Headings
    const headings = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        const level = parseInt(el.tagName.substring(1));
        const text = $(el).text().trim();
        if (text) {
            headings.push({ level, text });
        }
    });
    // Canonical - verbatim and resolved
    const canonicalHref = $('link[rel="canonical"]').attr("href") || undefined;
    const canonicalResolved = canonicalHref ? safeJoinUrl(input.baseUrl, canonicalHref) || undefined : undefined;
    // Robots
    const robotsMeta = $('meta[name="robots"]').attr("content") || undefined;
    const xRobotsTagRaw = input.fetchHeaders["x-robots-tag"];
    const xRobotsTagHeader = Array.isArray(xRobotsTagRaw) ? xRobotsTagRaw[0] : xRobotsTagRaw;
    // Hreflang
    const hreflang = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
        const lang = $(el).attr("hreflang");
        const href = $(el).attr("href");
        if (lang && href) {
            hreflang.push({ lang, url: href });
        }
    });
    // Favicon - check multiple possible locations
    let faviconUrl;
    // Priority 1: <link rel="icon">
    const iconHref = $('link[rel="icon"], link[rel="shortcut icon"]').first().attr("href");
    if (iconHref) {
        faviconUrl = safeJoinUrl(input.baseUrl, iconHref) || undefined;
    }
    // Priority 2: <link rel="apple-touch-icon">
    if (!faviconUrl) {
        const appleIconHref = $('link[rel="apple-touch-icon"]').first().attr("href");
        if (appleIconHref) {
            faviconUrl = safeJoinUrl(input.baseUrl, appleIconHref) || undefined;
        }
    }
    // Priority 3: Default /favicon.ico (only if we're at the root of the origin)
    if (!faviconUrl) {
        try {
            const baseUrlObj = new URL(input.baseUrl);
            faviconUrl = `${baseUrlObj.origin}/favicon.ico`;
        }
        catch {
            // Invalid base URL, skip default favicon
        }
    }
    // Counts
    const linksOutCount = $("a[href]").length;
    const mediaCount = $("img, video").length;
    let missingAltCount = 0;
    $("img").each((_, el) => {
        const alt = $(el).attr("alt");
        if (!alt || alt.trim() === "") {
            missingAltCount++;
        }
    });
    return {
        title,
        metaDescription,
        h1,
        headings,
        canonicalHref,
        canonicalResolved,
        robotsMeta,
        xRobotsTagHeader,
        hreflang,
        faviconUrl,
        linksOutCount,
        mediaCount,
        missingAltCount,
    };
}
//# sourceMappingURL=pageFacts.js.map