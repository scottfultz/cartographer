/**
 * Iterate over all JSONL records in a subdir (pages, edges, etc)
 */
export declare function iterateParts(atlsPath: string, subdir: "pages" | "edges" | "assets" | "errors" | "accessibility"): AsyncIterable<string>;
/**
 * Read manifest.json from .atls archive
 */
export declare function readManifest(atlsPath: string): Promise<any>;
/**
 * Read summary.json from .atls archive
 */
export declare function readSummary(atlsPath: string): Promise<any>;
/**
 * Iterate over all records in a dataset
 */
export declare function iterateDataset(atlsPath: string, dataset: string): AsyncIterable<string>;
//# sourceMappingURL=reader.d.ts.map