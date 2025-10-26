/**
 * Read manifest.json from .atls archive
 */
export declare function readManifest(atlsPath: string): Promise<any>;
/**
 * Iterate over all JSONL parts in a subdirectory
 * @param atlsPath Path to .atls archive
 * @param subdir One of: "pages", "edges", "assets", "errors", "accessibility"
 * @yields Individual JSONL lines (as strings)
 */
export declare function iterateParts(atlsPath: string, subdir: "pages" | "edges" | "assets" | "errors" | "accessibility"): AsyncIterable<string>;
//# sourceMappingURL=atlsReader.d.ts.map