export interface FilenameOptions {
    seedUrl: string;
    mode: "raw" | "prerender" | "full";
    timestamp?: Date;
}
/**
 * Generate a standardized .atls filename from crawl parameters
 * Format: [domain]_[YYYYMMDD_HHMMSS]_[mode].atls
 *
 * Examples:
 * - drancich.com_20251024_100532_raw.atls
 * - example.org_20251024_143022_full.atls
 */
export declare function generateAtlsFilename(options: FilenameOptions): string;
/**
 * Resolve output path with automatic filename generation
 *
 * @param userProvidedPath - Path from --out flag (optional)
 * @param options - Filename generation options
 * @param defaultDir - Default directory (default: "./export")
 * @returns Resolved absolute path
 */
export declare function resolveOutputPath(userProvidedPath: string | undefined, options: FilenameOptions, defaultDir?: string): Promise<string>;
//# sourceMappingURL=filenameGenerator.d.ts.map