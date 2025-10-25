/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { readManifest, readSummary, iterateDataset } from "./reader.js";
export * from "./types.js";
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
export async function openAtlas(atlsPath) {
    const manifest = await readManifest(atlsPath);
    const summary = await readSummary(atlsPath);
    // Determine which datasets are present
    const datasets = new Set(["pages", "edges", "assets", "errors"]);
    if (manifest.datasets?.accessibility?.present) {
        datasets.add("accessibility");
    }
    return {
        manifest,
        summary,
        datasets,
        readers: {
            async *pages() {
                for await (const line of iterateDataset(atlsPath, "pages")) {
                    yield JSON.parse(line);
                }
            },
            async *edges() {
                for await (const line of iterateDataset(atlsPath, "edges")) {
                    yield JSON.parse(line);
                }
            },
            async *assets() {
                for await (const line of iterateDataset(atlsPath, "assets")) {
                    yield JSON.parse(line);
                }
            },
            async *errors() {
                for await (const line of iterateDataset(atlsPath, "errors")) {
                    yield JSON.parse(line);
                }
            },
            async *accessibility() {
                if (!datasets.has("accessibility")) {
                    return; // Empty iterator if not present
                }
                for await (const line of iterateDataset(atlsPath, "accessibility")) {
                    yield JSON.parse(line);
                }
            }
        }
    };
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
export async function* select(atlsPath, options) {
    const { dataset, where, fields, limit } = options;
    let count = 0;
    for await (const line of iterateDataset(atlsPath, dataset)) {
        const record = JSON.parse(line);
        // Apply filter
        if (where && !where(record)) {
            continue;
        }
        // Apply projection
        let result = record;
        if (fields && fields.length > 0) {
            result = {};
            for (const field of fields) {
                if (field in record) {
                    result[field] = record[field];
                }
            }
        }
        yield result;
        // Apply limit
        count++;
        if (limit && count >= limit) {
            break;
        }
    }
}
//# sourceMappingURL=index.js.map