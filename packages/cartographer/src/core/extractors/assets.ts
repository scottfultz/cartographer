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
 * Parse srcset attribute into structured candidates
 */
function parseSrcset(srcset: string, baseUrl: string): Array<{
  url: string;
  descriptor: string;
  width?: number;
  density?: number;
}> {
  if (!srcset) return [];
  
  const candidates: Array<{ url: string; descriptor: string; width?: number; density?: number }> = [];
  
  // Split by comma, handling URLs with commas in query strings
  const parts = srcset.split(/,\s*(?=\S)/);
  
  for (const part of parts) {
    const match = part.trim().match(/^(\S+)\s+(.+)$/);
    if (!match) {
      // No descriptor - treat as 1x density
      const url = safeJoinUrl(baseUrl, part.trim()) || part.trim();
      candidates.push({ url, descriptor: "1x", density: 1 });
      continue;
    }
    
    const [, urlPart, descriptor] = match;
    const url = safeJoinUrl(baseUrl, urlPart) || urlPart;
    
    // Parse descriptor
    if (descriptor.endsWith('w')) {
      const width = parseInt(descriptor.slice(0, -1), 10);
      candidates.push({ url, descriptor, width });
    } else if (descriptor.endsWith('x')) {
      const density = parseFloat(descriptor.slice(0, -1));
      candidates.push({ url, descriptor, density });
    } else {
      candidates.push({ url, descriptor });
    }
  }
  
  return candidates;
}

/**
 * Detect lazy loading strategy from element attributes and classes
 */
function detectLazyLoading(el: any, $: any): {
  lazy_strategy: "native" | "intersection-observer" | "data-src" | "none";
  lazy_data_attrs?: Record<string, string>;
  lazy_classes?: string[];
} {
  const loading = $(el).attr("loading");
  const classList = ($(el).attr("class") || "").split(/\s+/).filter(Boolean);
  const dataSrc = $(el).attr("data-src");
  const dataSrcset = $(el).attr("data-srcset");
  const dataBg = $(el).attr("data-bg");
  
  // Native lazy loading
  if (loading === "lazy") {
    return {
      lazy_strategy: "native",
      lazy_classes: classList.filter((c: string) => /lazy/i.test(c))
    };
  }
  
  // Data attribute lazy loading (lazysizes, lozad, etc.)
  if (dataSrc || dataSrcset || dataBg) {
    const lazy_data_attrs: Record<string, string> = {};
    if (dataSrc) lazy_data_attrs.data_src = dataSrc;
    if (dataSrcset) lazy_data_attrs.data_srcset = dataSrcset;
    if (dataBg) lazy_data_attrs.data_bg = dataBg;
    
    return {
      lazy_strategy: "data-src",
      lazy_data_attrs,
      lazy_classes: classList.filter((c: string) => /lazy/i.test(c))
    };
  }
  
  // Intersection Observer heuristic (class-based detection)
  const lazyClasses = classList.filter((c: string) => /lazy|load/i.test(c));
  if (lazyClasses.length > 0) {
    return {
      lazy_strategy: "intersection-observer",
      lazy_classes: lazyClasses
    };
  }
  
  return { lazy_strategy: "none" };
}

/**
 * Extract media assets from HTML with 1000 cap
 * Enhanced for responsive images, picture elements, and video/audio metadata
 */
export function extractAssets(input: AssetsInput): AssetsResult {
  const $ = cheerioLoad(input.html);
  const assets: AssetRecord[] = [];
  let totalFound = 0;

  // === EXTRACT IMAGES (including srcset and picture context) ===
  $("img").each((_, el) => {
    totalFound++;
    
    if (assets.length >= ASSET_CAP) return;

    const src = $(el).attr("src") || "";
    const srcset = $(el).attr("srcset") || "";
    const sizes = $(el).attr("sizes") || "";
    const alt = $(el).attr("alt") || "";
    const loading = $(el).attr("loading") || "";

    // Use srcset first image if no src
    let assetUrl = src;
    if (!assetUrl && srcset) {
      const firstCandidate = srcset.split(',')[0].trim().split(/\s+/)[0];
      assetUrl = firstCandidate;
    }
    
    if (!assetUrl) return;

    assetUrl = safeJoinUrl(input.baseUrl, assetUrl) || assetUrl;
    
    // Parse srcset
    const srcset_candidates = srcset ? parseSrcset(srcset, input.baseUrl) : undefined;
    
    // Check for picture parent
    const $parent = $(el).parent();
    const hasPictureParent = $parent.prop("tagName")?.toLowerCase() === "picture";
    let picture_context: AssetRecord["picture_context"];
    
    if (hasPictureParent) {
      const $sources = $parent.find("source");
      const sources = $sources.map((_, source) => ({
        srcset: $(source).attr("srcset") || "",
        media: $(source).attr("media"),
        type: $(source).attr("type")
      })).get();
      
      picture_context = {
        has_picture_parent: true,
        source_count: sources.length,
        sources: sources.length > 0 ? sources : undefined
      };
    }
    
    // Detect lazy loading
    const lazyInfo = detectLazyLoading(el, $);

    const asset: AssetRecord = {
      pageUrl: input.baseUrl,
      assetUrl,
      type: "image",
      alt,
      hasAlt: alt.length > 0,
      visible: input.domSource === "raw" ? true : false,
      inViewport: false,
      loading,
      wasLazyLoaded: loading === "lazy" || lazyInfo.lazy_strategy !== "none",
      
      // Responsive images
      srcset: srcset || undefined,
      srcset_candidates,
      sizes: sizes || undefined,
      picture_context,
      
      // Lazy loading detection
      lazy_strategy: lazyInfo.lazy_strategy,
      lazy_data_attrs: lazyInfo.lazy_data_attrs,
      lazy_classes: lazyInfo.lazy_classes && lazyInfo.lazy_classes.length > 0 ? lazyInfo.lazy_classes : undefined
    };

    assets.push(asset);
  });

  // === EXTRACT VIDEOS ===
  $("video").each((_, el) => {
    totalFound++;
    
    if (assets.length >= ASSET_CAP) return;

    const src = $(el).attr("src") || "";
    const poster = $(el).attr("poster") || "";
    const preload = $(el).attr("preload") || "";
    const controls = $(el).attr("controls") !== undefined;
    const autoplay = $(el).attr("autoplay") !== undefined;
    const loop = $(el).attr("loop") !== undefined;
    const muted = $(el).attr("muted") !== undefined;

    // Extract source elements
    const $sources = $(el).find("source");
    const sources = $sources.map((_, source) => ({
      src: $(source).attr("src") || "",
      type: $(source).attr("type")
    })).get().filter(s => s.src);

    // Extract track elements
    const $tracks = $(el).find("track");
    const tracks = $tracks.map((_, track) => ({
      kind: $(track).attr("kind") || "subtitles",
      src: $(track).attr("src") || "",
      srclang: $(track).attr("srclang"),
      label: $(track).attr("label")
    })).get().filter(t => t.src);

    // Use first source element if no direct src
    let assetUrl = src;
    if (!assetUrl && sources.length > 0) {
      assetUrl = sources[0].src;
    }
    
    if (!assetUrl) return;

    assetUrl = safeJoinUrl(input.baseUrl, assetUrl) || assetUrl;
    
    // Detect MIME type from first source
    const mime_type = sources.length > 0 ? sources[0].type : undefined;

    const asset: AssetRecord = {
      pageUrl: input.baseUrl,
      assetUrl,
      type: "video",
      hasAlt: false, // Videos don't have alt text
      visible: input.domSource === "raw" ? true : false,
      inViewport: false,
      wasLazyLoaded: false,
      
      // Video metadata
      mime_type,
      has_controls: controls,
      autoplay,
      loop,
      muted,
      preload: preload || undefined,
      poster: poster ? (safeJoinUrl(input.baseUrl, poster) || poster) : undefined,
      tracks: tracks.length > 0 ? tracks : undefined,
      sources: sources.length > 1 ? sources : undefined // Only include if multiple sources
    };

    assets.push(asset);
  });

  // === EXTRACT AUDIO ===
  $("audio").each((_, el) => {
    totalFound++;
    
    if (assets.length >= ASSET_CAP) return;

    const src = $(el).attr("src") || "";
    const preload = $(el).attr("preload") || "";
    const controls = $(el).attr("controls") !== undefined;
    const autoplay = $(el).attr("autoplay") !== undefined;
    const loop = $(el).attr("loop") !== undefined;
    const muted = $(el).attr("muted") !== undefined;

    // Extract source elements
    const $sources = $(el).find("source");
    const sources = $sources.map((_, source) => ({
      src: $(source).attr("src") || "",
      type: $(source).attr("type")
    })).get().filter(s => s.src);

    // Use first source element if no direct src
    let assetUrl = src;
    if (!assetUrl && sources.length > 0) {
      assetUrl = sources[0].src;
    }
    
    if (!assetUrl) return;

    assetUrl = safeJoinUrl(input.baseUrl, assetUrl) || assetUrl;
    
    // Detect MIME type from first source
    const mime_type = sources.length > 0 ? sources[0].type : undefined;

    const asset: AssetRecord = {
      pageUrl: input.baseUrl,
      assetUrl,
      type: "audio",
      hasAlt: false, // Audio doesn't have alt text
      visible: input.domSource === "raw" ? true : false,
      inViewport: false,
      wasLazyLoaded: false,
      
      // Audio metadata
      mime_type,
      has_controls: controls,
      autoplay,
      loop,
      muted,
      preload: preload || undefined,
      sources: sources.length > 1 ? sources : undefined // Only include if multiple sources
    };

    assets.push(asset);
  });

  return {
    assets,
    truncated: totalFound > ASSET_CAP,
  };
}
