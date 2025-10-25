/**
 * Options for URL normalization
 */
export interface NormalizeOptions {
    /**
     * Convert http:// to https:// if possible
     * Default: false
     */
    upgradeScheme?: boolean;
    /**
     * Remove URL fragment (#anchor)
     * Default: true
     */
    removeFragment?: boolean;
    /**
     * Sort query parameters alphabetically
     * Default: true
     */
    sortQueryParams?: boolean;
    /**
     * Convert IDN domains to punycode
     * Default: true
     */
    punycodeDomains?: boolean;
    /**
     * Normalize trailing slashes
     * Default: false (preserve as-is)
     */
    normalizeTrailingSlash?: boolean;
    /**
     * Convert domain to lowercase
     * Default: true
     */
    lowercaseDomain?: boolean;
    /**
     * Convert path to lowercase
     * Default: false (preserve case for path-sensitive servers)
     */
    lowercasePath?: boolean;
}
/**
 * Enhanced URL normalizer with security features
 *
 * Features:
 * - Punycode/IDN domain normalization
 * - Optional http→https upgrade
 * - Fragment removal
 * - Query parameter sorting
 * - Trailing slash normalization
 * - Lowercase normalization
 *
 * @param url - URL to normalize
 * @param options - Normalization options
 * @returns Normalized URL string
 */
export declare function normalizeUrlEnhanced(url: string, options?: NormalizeOptions): string;
/**
 * Check if domain contains non-ASCII characters (IDN)
 */
export declare function isIDN(hostname: string): boolean;
/**
 * Convert punycode domain to Unicode (for display)
 */
export declare function punycodeToUnicode(hostname: string): string;
/**
 * Convert Unicode domain to punycode (for comparison)
 */
export declare function unicodeToPunycode(hostname: string): string;
/**
 * Check if URL uses private IP address (RFC1918, loopback, link-local)
 *
 * @param url - URL to check
 * @returns true if URL hostname resolves to private IP range
 */
export declare function isPrivateIP(url: string): boolean;
/**
 * Detect potential homograph attacks using IDN lookalikes
 *
 * @param url - URL to check
 * @returns true if URL contains suspicious lookalike characters
 */
export declare function isHomographAttack(url: string): boolean;
/**
 * Legacy normalizeUrl function (backward compatible)
 * Delegates to normalizeUrlEnhanced with default options
 */
export declare function normalizeUrl(url: string): string;
//# sourceMappingURL=urlNormalizer.d.ts.map