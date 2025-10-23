/**
 * Normalize URL for deduplication
 * - Lowercase
 * - Remove fragment
 * - Sort query params (if param policy is "keep")
 */
export declare function normalizeUrl(url: string): string;
/**
 * Get origin from URL
 */
export declare function getOrigin(url: string): string;
/**
 * Check if URL is same origin as base
 */
export declare function isSameOrigin(url: string, baseUrl: string): boolean;
/**
 * Safely join a relative URL to a base
 */
export declare function safeJoinUrl(base: string, relative: string): string | null;
/**
 * Extract URL pathname without query/hash
 */
export declare function getPathname(url: string): string;
/**
 * Check if target URL is internal relative to source URL
 */
export declare function isInternal(from: string, to: string): boolean;
/**
 * Extract section from URL (leading "/" + first path segment with trailing slash)
 * Examples:
 *   https://example.com/products/shoes → "/products/"
 *   https://example.com/blog/post-1 → "/blog/"
 *   https://example.com/ → "/"
 */
export declare function sectionOf(url: string): string;
/**
 * Strip tracking parameters from URL based on blockList
 * Supports wildcards (e.g., "utm_*" matches "utm_source", "utm_medium")
 */
export declare function stripTrackingParams(url: URL, blockList: string[]): URL;
/**
 * Determine if a parameter value should be sampled (kept)
 * When paramPolicy is "sample", only the first value per parameter family is kept
 * Returns true if this is a new value we should keep
 */
export declare function shouldSampleParam(param: string, value: string, seenParams: Map<string, Set<string>>): boolean;
/**
 * Apply parameter policy to URL
 * - "keep": Keep all params
 * - "strip": Remove all params
 * - "sample": Keep only first value per parameter name
 */
export declare function applyParamPolicy(url: URL, policy: "keep" | "strip" | "sample", blockList: string[], seenParams: Map<string, Set<string>>): URL;
//# sourceMappingURL=url.d.ts.map