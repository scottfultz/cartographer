/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Normalize URL for deduplication
 * - Lowercase
 * - Remove fragment
 * - Sort query params (if param policy is "keep")
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = ""; // Remove fragment
    // Sort query params for consistent comparison
    const params = Array.from(u.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    u.search = "";
    params.forEach(([key, val]) => u.searchParams.append(key, val));
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Get origin from URL
 */
export function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/**
 * Check if URL is same origin as base
 */
export function isSameOrigin(url: string, baseUrl: string): boolean {
  return getOrigin(url) === getOrigin(baseUrl);
}

/**
 * Safely join a relative URL to a base
 */
export function safeJoinUrl(base: string, relative: string): string | null {
  try {
    return new URL(relative, base).toString();
  } catch {
    return null;
  }
}

/**
 * Extract URL pathname without query/hash
 */
export function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

/**
 * Check if target URL is internal relative to source URL
 */
export function isInternal(from: string, to: string): boolean {
  return isSameOrigin(from, to);
}

/**
 * Extract section from URL (leading "/" + first path segment with trailing slash)
 * Examples:
 *   https://example.com/products/shoes → "/products/"
 *   https://example.com/blog/post-1 → "/blog/"
 *   https://example.com/ → "/"
 */
export function sectionOf(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(p => p.length > 0);
    if (parts.length === 0) return "/";
    return `/${parts[0]}/`;
  } catch {
    return "/";
  }
}

/**
 * Strip tracking parameters from URL based on blockList
 * Supports wildcards (e.g., "utm_*" matches "utm_source", "utm_medium")
 */
export function stripTrackingParams(url: URL, blockList: string[]): URL {
  const stripped = new URL(url.toString());
  const paramsToDelete: string[] = [];
  
  for (const param of stripped.searchParams.keys()) {
    for (const pattern of blockList) {
      if (matchesPattern(param, pattern)) {
        paramsToDelete.push(param);
        break;
      }
    }
  }
  
  for (const param of paramsToDelete) {
    stripped.searchParams.delete(param);
  }
  
  return stripped;
}

/**
 * Check if parameter name matches pattern (supports wildcards)
 */
function matchesPattern(param: string, pattern: string): boolean {
  if (!pattern.includes("*")) {
    return param === pattern;
  }
  
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape special chars
    .replace(/\\\*/g, ".*"); // Convert * to .*
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(param);
}

/**
 * Determine if a parameter value should be sampled (kept)
 * When paramPolicy is "sample", only the first value per parameter family is kept
 * Returns true if this is a new value we should keep
 */
export function shouldSampleParam(
  param: string,
  value: string,
  seenParams: Map<string, Set<string>>
): boolean {
  if (!seenParams.has(param)) {
    seenParams.set(param, new Set([value]));
    return true;
  }
  
  const seenValues = seenParams.get(param)!;
  if (seenValues.has(value)) {
    return true; // Already seen this exact value
  }
  
  // For "sample" policy, only keep first value
  return false;
}

/**
 * Apply parameter policy to URL
 * - "keep": Keep all params
 * - "strip": Remove all params
 * - "sample": Keep only first value per parameter name
 */
export function applyParamPolicy(
  url: URL,
  policy: "keep" | "strip" | "sample",
  blockList: string[],
  seenParams: Map<string, Set<string>>
): URL {
  // First strip blocked params
  let result = stripTrackingParams(url, blockList);
  
  if (policy === "strip") {
    result.search = "";
    return result;
  }
  
  if (policy === "keep") {
    return result;
  }
  
  // Sample policy: keep only first value per param
  const sampledUrl = new URL(result.toString());
  sampledUrl.search = "";
  
  for (const [param, value] of result.searchParams.entries()) {
    if (shouldSampleParam(param, value, seenParams)) {
      sampledUrl.searchParams.append(param, value);
    }
  }
  
  return sampledUrl;
}
