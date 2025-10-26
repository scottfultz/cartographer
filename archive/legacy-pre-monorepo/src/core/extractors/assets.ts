/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { load as cheerioLoad } from "cheerio";
import type { AssetRecord } from "../types.js";
import { safeJoinUrl } from "../../utils/url.js";

export interface AssetsInput {
  domSource: "raw" | "playwright";
  html: string;
  baseUrl: string;
}

export interface AssetsResult {
  assets: AssetRecord[];
  truncated: boolean;
}

const ASSET_CAP = 1000;

/**
 * Extract media assets from HTML with 1000 cap
 */
export function extractAssets(input: AssetsInput): AssetsResult {
  const $ = cheerioLoad(input.html);
  const assets: AssetRecord[] = [];
  let totalFound = 0;

  $("img, video").each((_, el) => {
    totalFound++;
    
    // Skip if already at cap
    if (assets.length >= ASSET_CAP) return;

    const isImage = el.tagName.toLowerCase() === "img";
    const src = $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    const loading = $(el).attr("loading") || "";

    if (!src) return;

    const assetUrl = safeJoinUrl(input.baseUrl, src) || src;

    // For raw mode, we don't have visibility/viewport data
    const asset: AssetRecord = {
      pageUrl: input.baseUrl,
      assetUrl,
      type: isImage ? "image" : "video",
      alt,
      hasAlt: alt.length > 0,
      visible: input.domSource === "raw" ? true : false, // Default for raw
      inViewport: false, // Cannot determine in Cheerio
      loading,
      wasLazyLoaded: loading === "lazy",
    };

    assets.push(asset);
  });

  return {
    assets,
    truncated: totalFound > ASSET_CAP,
  };
}
