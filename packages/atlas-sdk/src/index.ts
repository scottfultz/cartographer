/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { readManifest, readSummary, iterateDataset, iterateParts } from "./reader.js";
import type {
  AtlasManifest,
  AtlasSummary,
  PageRecord,
  EdgeRecord,
  AssetRecord,
  ErrorRecord,
  AccessibilityRecord,
  DatasetName
} from "./types.js";

export * from "./types.js";

// Re-export low-level functions for engine use
export { readManifest, readSummary, iterateParts } from "./reader.js";

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
export async function openAtlas(atlsPath: string): Promise<AtlasReader> {
  const manifest = await readManifest(atlsPath);
  const summary = await readSummary(atlsPath);
  
  // Determine which datasets are present
  const datasets = new Set<DatasetName>(["pages", "edges", "assets", "errors"]);
  
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
          yield JSON.parse(line) as PageRecord;
        }
      },
      async *edges() {
        for await (const line of iterateDataset(atlsPath, "edges")) {
          yield JSON.parse(line) as EdgeRecord;
        }
      },
      async *assets() {
        for await (const line of iterateDataset(atlsPath, "assets")) {
          yield JSON.parse(line) as AssetRecord;
        }
      },
      async *errors() {
        for await (const line of iterateDataset(atlsPath, "errors")) {
          yield JSON.parse(line) as ErrorRecord;
        }
      },
      async *accessibility() {
        if (!datasets.has("accessibility")) {
          return; // Empty iterator if not present
        }
        for await (const line of iterateDataset(atlsPath, "accessibility")) {
          yield JSON.parse(line) as AccessibilityRecord;
        }
      }
    }
  };
}

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
export async function* select<T = any>(
  atlsPath: string,
  options: SelectOptions<T>
): AsyncIterable<Partial<T>> {
  const { dataset, where, fields, limit } = options;
  let count = 0;
  
  for await (const line of iterateDataset(atlsPath, dataset)) {
    const record = JSON.parse(line) as T;
    
    // Apply filter
    if (where && !where(record)) {
      continue;
    }
    
    // Apply projection
    let result: any = record;
    if (fields && fields.length > 0) {
      result = {};
      for (const field of fields) {
        if (field in (record as any)) {
          result[field] = (record as any)[field];
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
