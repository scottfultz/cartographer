import type { AtlasManifest, AtlasSummary, PageRecord, EdgeRecord, AssetRecord, ErrorRecord, AccessibilityRecord, DatasetName } from "./types.js";
export * from "./types.js";
/**
 * Atlas reader interface
 */
export interface AtlasReader {
    manifest: AtlasManifest;
    summary: AtlasSummary;
    datasets: Set<DatasetName>;
    readers: {
        pages: () => AsyncIterable<PageRecord>;
        edges: () => AsyncIterable<EdgeRecord>;
        assets: () => AsyncIterable<AssetRecord>;
        errors: () => AsyncIterable<ErrorRecord>;
        accessibility: () => AsyncIterable<AccessibilityRecord>;
    };
}
/**
 * Open an Atlas archive and get a reader interface
 *
 * @param atlsPath Path to .atls file
 * @returns Reader with manifest, summary, and dataset iterators
 *
 * @example
 * ```typescript
 * const atlas = await openAtlas('./crawl.atls');
 *
 * console.log(`Pages: ${atlas.summary.totalPages}`);
 * console.log(`Datasets: ${[...atlas.datasets].join(', ')}`);
 *
 * for await (const page of atlas.readers.pages()) {
 *   console.log(page.url, page.statusCode);
 * }
 * ```
 */
export declare function openAtlas(atlsPath: string): Promise<AtlasReader>;
/**
 * Select options for filtering and projection
 */
export interface SelectOptions<T = any> {
    dataset: DatasetName;
    where?: (record: T) => boolean;
    fields?: string[];
    limit?: number;
}
/**
 * Stream records from a dataset with optional filtering and projection
 *
 * @param atlsPath Path to .atls file
 * @param options Select options (dataset, where, fields, limit)
 * @returns Async iterable of filtered/projected records
 *
 * @example
 * ```typescript
 * // Get all 404 pages
 * for await (const page of select('./crawl.atls', {
 *   dataset: 'pages',
 *   where: (p) => p.statusCode === 404,
 *   fields: ['url', 'statusCode', 'discoveredFrom']
 * })) {
 *   console.log(page);
 * }
 *
 * // Get images with missing alt text
 * for await (const record of select('./crawl.atls', {
 *   dataset: 'accessibility',
 *   where: (a) => a.missingAltCount > 0,
 *   fields: ['pageUrl', 'missingAltCount', 'missingAltSources']
 * })) {
 *   console.log(record);
 * }
 * ```
 */
export declare function select<T = any>(atlsPath: string, options: SelectOptions<T>): AsyncIterable<Partial<T>>;
//# sourceMappingURL=index.d.ts.map