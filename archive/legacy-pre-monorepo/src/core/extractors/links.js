/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { load as cheerioLoad } from "cheerio";
import { isSameOrigin, safeJoinUrl } from "../../utils/url.js";
/**
 * Extract links from HTML and deduplicate by (sourceUrl, targetUrl, selectorHint)
 */
export function extractLinks(input) {
    const $ = cheerioLoad(input.html);
    const edges = [];
    const seen = new Set();
    $("a[href]").each((idx, el) => {
        const href = $(el).attr("href");
        if (!href)
            return;
        const targetUrl = safeJoinUrl(input.baseUrl, href);
        if (!targetUrl)
            return;
        const anchorText = $(el).text().trim();
        const rel = $(el).attr("rel") || undefined;
        const nofollow = rel?.includes("nofollow") || false;
        const isExternal = !isSameOrigin(input.baseUrl, targetUrl);
        // Determine location
        let location;
        if (input.domSource === "raw") {
            location = "unknown";
        }
        else {
            // Playwright - walk up ancestors to find semantic container
            location = "other";
            let current = el.parent;
            while (current && current.type === "tag") {
                const tag = current.name?.toLowerCase();
                if (tag === "nav") {
                    location = "nav";
                    break;
                }
                if (tag === "header") {
                    location = "header";
                    break;
                }
                if (tag === "footer") {
                    location = "footer";
                    break;
                }
                if (tag === "aside") {
                    location = "aside";
                    break;
                }
                if (tag === "main") {
                    location = "main";
                    break;
                }
                current = current.parent;
            }
        }
        // Selector hint for deduplication
        const selectorHint = `a:nth-of-type(${idx + 1})`;
        // Dedupe key
        const dedupeKey = `${input.baseUrl}|${targetUrl}|${selectorHint}`;
        if (seen.has(dedupeKey))
            return;
        seen.add(dedupeKey);
        edges.push({
            sourceUrl: input.baseUrl,
            targetUrl,
            anchorText,
            rel,
            nofollow,
            isExternal,
            location,
            selectorHint,
            discoveredInMode: input.discoveredInMode,
        });
    });
    return edges;
}
//# sourceMappingURL=links.js.map