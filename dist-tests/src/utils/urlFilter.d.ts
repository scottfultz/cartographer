/**
 * URL filter for allow/deny lists
 * Supports both glob patterns and regex patterns
 */
export declare class URLFilter {
    private allowPatterns;
    private denyPatterns;
    constructor(allowUrls?: string[], denyUrls?: string[]);
    /**
     * Parse pattern string into glob or regex
     */
    private parsePattern;
    /**
     * Check if URL should be allowed
     *
     * Logic:
     * 1. If deny list matches, return false
     * 2. If allow list exists and doesn't match, return false
     * 3. Otherwise return true
     */
    shouldAllow(url: string): boolean;
    /**
     * Check if allow list is defined
     */
    hasAllowList(): boolean;
    /**
     * Check if deny list is defined
     */
    hasDenyList(): boolean;
    /**
     * Get reason why URL was denied (for logging)
     */
    getDenyReason(url: string): string | null;
}
//# sourceMappingURL=urlFilter.d.ts.map