/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { load as cheerioLoad } from "cheerio";
import type { EdgeRecord, EdgeLocation, RenderMode, LinkType } from "../types.js";
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
    const sponsored = rel?.includes("sponsored") || false;
    const ugc = rel?.includes("ugc") || false;
    const isExternal = !isSameOrigin(input.baseUrl, targetUrl);

    // === LINK CONTEXT EXTRACTION (Atlas v1.0 Enhancement - Phase 4) ===
    
    // Extract HTML attributes
    const target_attr = $(el).attr("target") || undefined;
    const title_attr = $(el).attr("title") || undefined;
    const download_attr = $(el).attr("download") !== undefined 
      ? ($(el).attr("download") || true) 
      : undefined;
    const hreflang = $(el).attr("hreflang") || undefined;
    const type_attr = $(el).attr("type") || undefined;
    const aria_label = $(el).attr("aria-label") || undefined;
    const role = $(el).attr("role") || undefined;

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

    // === LINK TYPE CLASSIFICATION ===
    let link_type: LinkType = "other";
    let is_primary_nav = false;
    let is_breadcrumb = false;
    let is_skip_link = false;
    let is_pagination = false;

    // Skip link detection (href="#main", "#content", etc.)
    if (href.startsWith("#") && /^#(main|content|skip|primary)/i.test(href)) {
      link_type = "skip";
      is_skip_link = true;
    }
    // Download link
    else if (download_attr !== undefined || /\.(pdf|zip|doc|docx|xls|xlsx|ppt|pptx|csv|txt)$/i.test(targetUrl)) {
      link_type = "download";
    }
    // Social media links
    else if (/^https?:\/\/(www\.)?(facebook|twitter|instagram|linkedin|youtube|github|tiktok)\.com/i.test(targetUrl)) {
      link_type = "social";
    }
    // Breadcrumb detection (role, class, or nav[aria-label])
    else if (
      role === "breadcrumb" ||
      $(el).attr("class")?.includes("breadcrumb") ||
      $(el).closest('[role="breadcrumb"]').length > 0 ||
      $(el).closest('nav[aria-label*="breadcrumb" i]').length > 0
    ) {
      link_type = "breadcrumb";
      is_breadcrumb = true;
    }
    // Pagination detection
    else if (
      /^(next|prev|previous|page|[0-9]+)$/i.test(anchorText) ||
      $(el).attr("class")?.includes("paginat") ||
      $(el).attr("rel") === "next" ||
      $(el).attr("rel") === "prev"
    ) {
      link_type = "pagination";
      is_pagination = true;
    }
    // Navigation links (in <nav> or header)
    else if (location === "nav" || location === "header") {
      link_type = "navigation";
      // Primary nav detection (role="navigation" or <nav> directly under <header>)
      if ($(el).closest('nav[role="navigation"]').length > 0 || $(el).closest('header > nav').length > 0) {
        is_primary_nav = true;
      }
    }
    // Footer links
    else if (location === "footer") {
      link_type = "footer";
    }
    // CTA/Action detection (role="button", class="btn", etc.)
    else if (
      role === "button" ||
      $(el).attr("class")?.match(/\b(btn|button|cta|call-to-action)\b/i)
    ) {
      link_type = "action";
    }
    // Tag/category links
    else if (
      $(el).attr("class")?.match(/\b(tag|category|label)\b/i) ||
      $(el).attr("rel") === "tag" ||
      href.includes("/tag/") ||
      href.includes("/category/")
    ) {
      link_type = "tag";
    }
    // Author links
    else if (
      $(el).attr("rel") === "author" ||
      $(el).attr("class")?.includes("author") ||
      href.includes("/author/") ||
      href.includes("/profile/")
    ) {
      link_type = "author";
    }
    // Related content
    else if (
      $(el).closest('[class*="related"]').length > 0 ||
      $(el).closest('[class*="recommend"]').length > 0
    ) {
      link_type = "related";
    }
    // Content links (in <main> or <article>)
    else if (location === "main" || $(el).closest("article").length > 0) {
      link_type = "content";
    }
    // External links explicitly marked
    else if (rel?.includes("external") || target_attr === "_blank") {
      link_type = "external";
    }

    // Selector hint for deduplication
    const selectorHint = `a:nth-of-type(${idx + 1})`;

    // Dedupe key
    const dedupeKey = `${input.baseUrl}|${targetUrl}|${selectorHint}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const edge: EdgeRecord = {
      sourceUrl: input.baseUrl,
      targetUrl,
      anchorText,
      rel,
      nofollow,
      sponsored,
      ugc,
      isExternal,
      location,
      selectorHint,
      discoveredInMode: input.discoveredInMode,
    };

    // Add optional link context fields only if they have values
    if (link_type !== "other") edge.link_type = link_type;
    if (target_attr) edge.target_attr = target_attr;
    if (title_attr) edge.title_attr = title_attr;
    if (download_attr !== undefined) edge.download_attr = download_attr;
    if (hreflang) edge.hreflang = hreflang;
    if (type_attr) edge.type_attr = type_attr;
    if (aria_label) edge.aria_label = aria_label;
    if (role) edge.role = role;
    if (is_primary_nav) edge.is_primary_nav = is_primary_nav;
    if (is_breadcrumb) edge.is_breadcrumb = is_breadcrumb;
    if (is_skip_link) edge.is_skip_link = is_skip_link;
    if (is_pagination) edge.is_pagination = is_pagination;

    edges.push(edge);
  });

  return edges;
}
