/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { load as cheerioLoad } from "cheerio";
import type { EdgeRecord, EdgeLocation, RenderMode } from "../types.js";
import { isSameOrigin, safeJoinUrl } from "../../utils/url.js";

export interface LinksInput {
  domSource: "raw" | "playwright";
  html: string;
  baseUrl: string;
  discoveredInMode: RenderMode;
}

/**
 * Extract links from HTML and deduplicate by (sourceUrl, targetUrl, selectorHint)
 */
export function extractLinks(input: LinksInput): EdgeRecord[] {
  const $ = cheerioLoad(input.html);
  const edges: EdgeRecord[] = [];
  const seen = new Set<string>();

  $("a[href]").each((idx, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const targetUrl = safeJoinUrl(input.baseUrl, href);
    if (!targetUrl) return;

    const anchorText = $(el).text().trim();
    const rel = $(el).attr("rel") || undefined;
    const nofollow = rel?.includes("nofollow") || false;
    const isExternal = !isSameOrigin(input.baseUrl, targetUrl);

    // Determine location
    let location: EdgeLocation;
    if (input.domSource === "raw") {
      location = "unknown";
    } else {
      // Playwright - walk up ancestors to find semantic container
      location = "other";
      let current = el.parent;
      while (current && current.type === "tag") {
        const tag = current.name?.toLowerCase();
        if (tag === "nav") { location = "nav"; break; }
        if (tag === "header") { location = "header"; break; }
        if (tag === "footer") { location = "footer"; break; }
        if (tag === "aside") { location = "aside"; break; }
        if (tag === "main") { location = "main"; break; }
        current = current.parent;
      }
    }

    // Selector hint for deduplication
    const selectorHint = `a:nth-of-type(${idx + 1})`;

    // Dedupe key
    const dedupeKey = `${input.baseUrl}|${targetUrl}|${selectorHint}`;
    if (seen.has(dedupeKey)) return;
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
