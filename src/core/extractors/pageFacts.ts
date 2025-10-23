/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { load as cheerioLoad } from "cheerio";
import { safeJoinUrl } from "../../utils/url.js";

export interface PageFactsInput {
  domSource: "raw" | "playwright";
  html: string;
  fetchHeaders: Record<string, string | string[]>;
  baseUrl: string;
}

export interface PageFacts {
  title?: string;
  metaDescription?: string;
  h1?: string;
  headings: Array<{ level: number; text: string }>;
  canonicalHref?: string; // Verbatim from href attribute
  canonicalResolved?: string; // Absolute URL
  robotsMeta?: string;
  xRobotsTagHeader?: string;
  hreflang: Array<{ lang: string; url: string }>;
  linksOutCount: number;
  mediaCount: number;
  missingAltCount: number;
}

/**
 * Extract page metadata from HTML
 */
export function extractPageFacts(input: PageFactsInput): PageFacts {
  const $ = cheerioLoad(input.html);

  // Basic facts
  const title = $("title").first().text().trim() || undefined;
  const metaDescription = $('meta[name="description"]').attr("content") || undefined;
  const h1 = $("h1").first().text().trim() || undefined;

  // Headings
  const headings: Array<{ level: number; text: string }> = [];
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
  const hreflang: Array<{ lang: string; url: string }> = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang");
    const href = $(el).attr("href");
    if (lang && href) {
      hreflang.push({ lang, url: href });
    }
  });

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
    linksOutCount,
    mediaCount,
    missingAltCount,
  };
}
