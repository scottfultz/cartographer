/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { load as cheerioLoad } from "cheerio";
/**
 * Extract enhanced SEO metadata from HTML
 *
 * @param input - Enhanced SEO input data
 * @returns EnhancedSEOMetadata object
 */
export function extractEnhancedSEOMetadata(input) {
    const $ = cheerioLoad(input.html);
    // === Indexability ===
    const metaRobots = $('meta[name="robots"]').attr("content");
    const xRobotsTagRaw = input.headers?.["x-robots-tag"];
    const xRobotsTag = Array.isArray(xRobotsTagRaw) ? xRobotsTagRaw[0] : xRobotsTagRaw;
    const canonical = $('link[rel="canonical"]').attr("href");
    const robotsDirectives = [metaRobots, xRobotsTag].filter(Boolean).join(",").toLowerCase();
    const isNoIndex = robotsDirectives.includes("noindex");
    const isNoFollow = robotsDirectives.includes("nofollow");
    // === Content ===
    const title = $("title").first().text().trim();
    const metaDescription = $('meta[name="description"]').attr("content");
    const h1 = $("h1").first().text().trim();
    // Count headings
    const h1Count = $("h1").length;
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;
    const h4Count = $("h4").length;
    const h5Count = $("h5").length;
    const h6Count = $("h6").length;
    // Word count - use body text if provided, otherwise extract from main/body
    let wordCount = 0;
    let textContentLength = 0;
    if (input.bodyText) {
        textContentLength = input.bodyText.length;
        wordCount = countWords(input.bodyText);
    }
    else {
        // Try to extract main content
        const mainContent = $("main, article, [role='main']").first();
        const contentText = mainContent.length > 0
            ? mainContent.text()
            : $("body").text();
        textContentLength = contentText.length;
        wordCount = countWords(contentText);
    }
    // Calculate approximate title/description lengths in pixels
    // Using Google's SERP display limits as reference:
    // Title: ~600px = ~60 characters (depends on character width)
    // Description: ~920px = ~160 characters
    const titleLength = title ? {
        characters: title.length,
        pixels: estimatePixelWidth(title),
    } : undefined;
    const descriptionLength = metaDescription ? {
        characters: metaDescription.length,
        pixels: estimatePixelWidth(metaDescription),
    } : undefined;
    // === International (hreflang) ===
    const hreflangTags = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
        const lang = $(el).attr("hreflang");
        const url = $(el).attr("href");
        if (lang && url) {
            hreflangTags.push({ lang, url });
        }
    });
    // Basic hreflang error detection (simplified)
    const hreflangErrors = [];
    if (hreflangTags.length > 0) {
        // Check for x-default
        const hasXDefault = hreflangTags.some(tag => tag.lang === "x-default");
        if (!hasXDefault && hreflangTags.length > 1) {
            hreflangErrors.push("Missing x-default hreflang tag for multi-language site");
        }
        // Check for self-referential tag
        const hasSelfRef = hreflangTags.some(tag => tag.url === input.baseUrl);
        if (!hasSelfRef) {
            hreflangErrors.push("Missing self-referential hreflang tag");
        }
    }
    // === Social (OpenGraph & Twitter) ===
    const openGraph = {
        ogTitle: $('meta[property="og:title"]').attr("content"),
        ogDescription: $('meta[property="og:description"]').attr("content"),
        ogImage: $('meta[property="og:image"]').attr("content"),
        ogType: $('meta[property="og:type"]').attr("content"),
        ogUrl: $('meta[property="og:url"]').attr("content"),
        ogSiteName: $('meta[property="og:site_name"]').attr("content"),
    };
    const twitter = {
        twitterCard: $('meta[name="twitter:card"]').attr("content"),
        twitterTitle: $('meta[name="twitter:title"]').attr("content"),
        twitterDescription: $('meta[name="twitter:description"]').attr("content"),
        twitterImage: $('meta[name="twitter:image"]').attr("content"),
        twitterSite: $('meta[name="twitter:site"]').attr("content"),
        twitterCreator: $('meta[name="twitter:creator"]').attr("content"),
    };
    // === Schema ===
    const jsonLdScripts = $('script[type="application/ld+json"]');
    const hasJsonLd = jsonLdScripts.length > 0;
    // Check for microdata
    const microdataElements = $("[itemscope], [itemprop], [itemtype]");
    const hasMicrodata = microdataElements.length > 0;
    // Extract schema types from JSON-LD
    const schemaTypes = [];
    jsonLdScripts.each((_, el) => {
        try {
            const scriptContent = $(el).html();
            if (scriptContent) {
                const jsonData = JSON.parse(scriptContent);
                extractSchemaTypes(jsonData, schemaTypes);
            }
        }
        catch (e) {
            // Invalid JSON, skip
        }
    });
    return {
        indexability: {
            metaRobots,
            xRobotsTag,
            canonical,
            isNoIndex,
            isNoFollow,
        },
        content: {
            title: title || undefined,
            titleLength,
            metaDescription,
            descriptionLength,
            h1: h1 || undefined,
            h1Count,
            h2Count,
            h3Count,
            h4Count,
            h5Count,
            h6Count,
            wordCount,
            textContentLength,
        },
        international: {
            hreflangTags,
            hreflangCount: hreflangTags.length,
            hreflangErrors: hreflangErrors.length > 0 ? hreflangErrors : undefined,
        },
        social: {
            openGraph,
            twitter,
        },
        schema: {
            hasJsonLd,
            hasMicrodata,
            schemaTypes,
        },
    };
}
/**
 * Count words in text (simplified - splits on whitespace)
 */
function countWords(text) {
    // Remove extra whitespace and split on word boundaries
    const cleaned = text.trim().replace(/\s+/g, " ");
    if (cleaned.length === 0)
        return 0;
    return cleaned.split(" ").length;
}
/**
 * Estimate pixel width of text (approximation for Google SERP)
 * Average character width: ~10px for title, ~8px for description
 */
function estimatePixelWidth(text, isTitle = true) {
    const avgCharWidth = isTitle ? 10 : 8;
    // Adjust for uppercase (wider) and lowercase/numbers (narrower)
    let adjustedWidth = 0;
    for (const char of text) {
        if (char >= "A" && char <= "Z") {
            adjustedWidth += avgCharWidth * 1.2; // Uppercase wider
        }
        else if (char >= "a" && char <= "z") {
            adjustedWidth += avgCharWidth * 0.9; // Lowercase narrower
        }
        else if (char >= "0" && char <= "9") {
            adjustedWidth += avgCharWidth * 0.95; // Numbers
        }
        else if (char === " ") {
            adjustedWidth += avgCharWidth * 0.3; // Space
        }
        else {
            adjustedWidth += avgCharWidth; // Punctuation and others
        }
    }
    return Math.round(adjustedWidth);
}
/**
 * Recursively extract @type fields from JSON-LD schema data
 */
function extractSchemaTypes(data, types) {
    if (!data || typeof data !== "object")
        return;
    // Check for @type field
    if (data["@type"]) {
        const typeValue = data["@type"];
        if (typeof typeValue === "string") {
            if (!types.includes(typeValue)) {
                types.push(typeValue);
            }
        }
        else if (Array.isArray(typeValue)) {
            for (const type of typeValue) {
                if (typeof type === "string" && !types.includes(type)) {
                    types.push(type);
                }
            }
        }
    }
    // Recurse into nested objects and arrays
    if (Array.isArray(data)) {
        for (const item of data) {
            extractSchemaTypes(item, types);
        }
    }
    else {
        for (const value of Object.values(data)) {
            if (typeof value === "object") {
                extractSchemaTypes(value, types);
            }
        }
    }
}
//# sourceMappingURL=enhancedSEO.js.map