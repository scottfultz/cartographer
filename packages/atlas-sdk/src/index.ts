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
  EventRecord, // Phase 7: Event log
  AccessibilityRecord,
  DatasetName,
  PackView,
  AtlasPack,
  AtlasPackName,
  AtlasPackState,
  ResponseRecordV1,
  ConsoleRecord
} from "./types.js";

export * from "./types.js";
export * from "./validate.js";

// Re-export low-level functions for engine use
export { readManifest, readSummary, iterateParts } from "./reader.js";

function datasetPresent(manifest: AtlasManifest, datasetName: string): boolean {
  const datasets = manifest.datasets ?? {};
  const meta = datasets[datasetName as keyof typeof datasets] as Record<string, any> | undefined;

  if (meta) {
    if (typeof meta.recordCount === "number" && meta.recordCount > 0) {
      return true;
    }
    if (typeof meta.present === "boolean") {
      return meta.present;
    }
    if (typeof meta.partCount === "number" && meta.partCount > 0) {
      return true;
    }
    if (typeof meta.parts === "number" && meta.parts > 0) {
      return true;
    }
    if (Array.isArray(meta.files) && meta.files.length > 0) {
      return true;
    }
  }

  const partsByDataset = manifest.parts as Record<string, string[]> | undefined;
  if (partsByDataset && Array.isArray(partsByDataset[datasetName]) && partsByDataset[datasetName].length > 0) {
    return true;
  }

  const coverageEntry = manifest.coverage?.matrix?.find(entry => entry.part === datasetName);
  if (coverageEntry) {
    if (coverageEntry.present) {
      return true;
    }
    if (typeof coverageEntry.row_count === "number" && coverageEntry.row_count > 0) {
      return true;
    }
  }

  return false;
}

function collectDatasetNames(manifest: AtlasManifest): Set<string> {
  const names = new Set<string>();
  const datasets = manifest.datasets ?? {};
  for (const key of Object.keys(datasets)) {
    names.add(key);
  }

  const partsByDataset = manifest.parts as Record<string, string[]> | undefined;
  if (partsByDataset) {
    for (const key of Object.keys(partsByDataset)) {
      names.add(key);
    }
  }

  const coverage = manifest.coverage?.matrix ?? [];
  for (const entry of coverage) {
    names.add(entry.part);
  }

  // Ensure core datasets are always considered
  const coreCandidates = [
    "pages",
    "edges",
    "assets",
    "responses",
    "errors",
    "events",
    "accessibility",
    "dom_snapshots",
    "console",
    "styles",
    "perf",
    "performance"
  ];
  for (const candidate of coreCandidates) {
    names.add(candidate);
  }

  return names;
}

function buildPackView(manifest: AtlasManifest): PackView {
  const packs = Array.isArray(manifest.packs) ? manifest.packs.map(pack => ({ ...pack })) : [];
  const packMap = new Map<AtlasPackName, AtlasPack>();
  for (const pack of packs) {
    packMap.set(pack.name, pack);
  }

  const embedded = packs.filter(pack => pack.state === "embedded");
  const sidecar = packs.filter(pack => pack.state === "sidecar");
  const missing = packs.filter(pack => pack.state === "missing");

  const view: PackView = {
    all: packs,
    embedded,
    sidecar,
    missing,
    get(name: AtlasPackName): AtlasPack | undefined {
      return packMap.get(name);
    },
    has(name: AtlasPackName): boolean {
      return packMap.has(name);
    },
    hasEmbedded(name: AtlasPackName): boolean {
      return packMap.get(name)?.state === "embedded";
    },
    sidecarUri(name: AtlasPackName): string | undefined {
      const pack = packMap.get(name);
      return pack?.uri ?? undefined;
    },
    state(name: AtlasPackName): AtlasPackState | undefined {
      return packMap.get(name)?.state;
    }
  };

  return view;
}

/**
 * Atlas reader interface
 */
export interface AtlasReader {
  manifest: AtlasManifest;
  summary: AtlasSummary;
  datasets: Set<DatasetName>;
  packs: PackView;
  hasDataset: (dataset: DatasetName) => boolean;
  readers: {
    pages: () => AsyncIterable<PageRecord>;
    edges: () => AsyncIterable<EdgeRecord>;
    assets: () => AsyncIterable<AssetRecord>;
    errors: () => AsyncIterable<ErrorRecord>;
    events: () => AsyncIterable<EventRecord>; // Phase 7: Event log
    accessibility: () => AsyncIterable<AccessibilityRecord>;
    responses: () => AsyncIterable<ResponseRecordV1>;
    domSnapshots: () => AsyncIterable<Record<string, unknown>>;
    console: () => AsyncIterable<ConsoleRecord>;
    styles: () => AsyncIterable<Record<string, unknown>>;
    dataset: <T = any>(name: DatasetName) => AsyncIterable<T>;
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
  const packs = buildPackView(manifest);
  const datasetCandidates = collectDatasetNames(manifest);
  const datasets: Set<DatasetName> = new Set();

  for (const name of datasetCandidates) {
    if (datasetPresent(manifest, name)) {
      datasets.add(name as DatasetName);
    }
  }

  // Ensure required core datasets are always tracked
  datasets.add("pages");
  datasets.add("edges");
  datasets.add("assets");
  datasets.add("errors");

  const hasDataset = (dataset: DatasetName): boolean => datasets.has(dataset);

  const makeIterator = <T = any>(datasetName: DatasetName) => {
    return async function* (): AsyncGenerator<T, void, unknown> {
      if (!datasets.has(datasetName)) {
        return;
      }
      for await (const line of iterateDataset(atlsPath, datasetName)) {
        yield JSON.parse(line) as T;
      }
    };
  };

  return {
    manifest,
    summary,
    datasets,
    packs,
    hasDataset,
    readers: {
      pages: makeIterator<PageRecord>("pages"),
      edges: makeIterator<EdgeRecord>("edges"),
      assets: makeIterator<AssetRecord>("assets"),
      errors: makeIterator<ErrorRecord>("errors"),
      events: makeIterator<EventRecord>("events"),
      accessibility: makeIterator<AccessibilityRecord>("accessibility"),
      responses: makeIterator<ResponseRecordV1>("responses"),
      domSnapshots: makeIterator<Record<string, unknown>>("dom_snapshots"),
      console: makeIterator<ConsoleRecord>("console"),
      styles: makeIterator<Record<string, unknown>>("styles"),
      dataset<T = any>(name: DatasetName) {
        return makeIterator<T>(name)();
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
