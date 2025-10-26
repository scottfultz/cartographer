/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { readFile, stat } from "fs/promises";
import { sha256 } from "../../utils/hashing.js";
import type { AtlasManifest, AtlasSummary } from "../../core/types.js";

/**
 * Build Atlas manifest with owner attribution and integrity hashes
 */
export async function buildManifest(opts: {
  parts: {
    pages: string[];
    edges: string[];
    assets: string[];
    errors: string[];
    accessibility?: string[];
    console?: string[];
    styles?: string[];
  };
  notes: string[];
  stagingDir: string;
  renderMode: string;
  robotsRespect: boolean;
  robotsOverride: boolean;
  provenance?: {
    resumeOf?: string;
    checkpointInterval?: number;
    gracefulShutdown?: boolean;
  };
}): Promise<AtlasManifest> {
  const files: Record<string, string> = {};
  
  // Compute integrity hashes for all parts
  const allParts = [
    ...opts.parts.pages,
    ...opts.parts.edges,
    ...opts.parts.assets,
    ...opts.parts.errors,
    ...(opts.parts.accessibility || []),
    ...(opts.parts.console || []),
    ...(opts.parts.styles || [])
  ];
  
  for (const partPath of allParts) {
    const content = await readFile(partPath);
    // Use relative path from staging dir for integrity keys
    const relativePath = partPath.replace(opts.stagingDir + "/", "");
    files[relativePath] = sha256(content);
  }
  
  // Read summary.json for record counts
  let summary: AtlasSummary | null = null;
  try {
    const summaryPath = `${opts.stagingDir}/summary.json`;
    const summaryContent = await readFile(summaryPath, "utf-8");
    summary = JSON.parse(summaryContent);
  } catch (error) {
    // summary.json not found or invalid - use zeros
  }
  
  // Spec and schema version
  const specVersion = "1.0.0";
  const schemaVersion = "2025-10-22";

  // Compute canonical schema hashes for each dataset
  async function schemaHash(schemaPath: string): Promise<string> {
    const content = await readFile(schemaPath);
    return sha256(content);
  }

  // Dataset metadata
  const datasets: Record<string, any> = {};
  for (const [name, partList] of Object.entries({
    pages: opts.parts.pages,
    edges: opts.parts.edges,
    assets: opts.parts.assets,
    errors: opts.parts.errors,
    ...(opts.parts.accessibility ? { accessibility: opts.parts.accessibility } : {}),
    ...(opts.parts.console ? { console: opts.parts.console } : {}),
    ...(opts.parts.styles ? { styles: opts.parts.styles } : {})
  })) {
    const schemaFile = `schemas/${name}.schema.json`;
    const schemaAbs = `${opts.stagingDir}/${schemaFile}`;
    
    // Calculate total bytes for this dataset's parts
    let totalBytes = 0;
    for (const partPath of partList) {
      try {
        const stats = await stat(partPath);
        totalBytes += stats.size;
      } catch {
        // Part file not found, skip
      }
    }
    
    // Get record count from summary.json
    let recordCount = 0;
    if (summary) {
      switch (name) {
        case "pages":
          recordCount = summary.stats.totalPages;
          break;
        case "edges":
          recordCount = summary.stats.totalEdges;
          break;
        case "assets":
          recordCount = summary.stats.totalAssets;
          break;
        case "errors":
          recordCount = summary.stats.totalErrors;
          break;
        case "accessibility":
          recordCount = summary.stats.totalAccessibilityRecords || 0;
          break;
        case "console":
          recordCount = summary.stats.totalConsoleRecords || 0;
          break;
        case "styles":
          recordCount = summary.stats.totalStyleRecords || 0;
          break;
      }
    }
    
    datasets[name] = {
      name,
      partCount: partList.length,
      recordCount,
      bytes: totalBytes,
      schema: `${schemaFile}#1`,
      schemaVersion,
      schemaHash: await schemaHash(schemaAbs)
    };
  }

  return {
    atlasVersion: "1.0",
    specVersion,
    schemaVersion,
    incomplete: true, // Set to true at crawl start, flip to false after finalization
    owner: {
      name: "Cai Frazier"
    },
    consumers: ["Continuum SEO", "Horizon Accessibility"],
    hashing: {
      algorithm: "sha256",
      urlKeyAlgo: "sha1",
      rawHtmlHash: "sha256 of raw HTTP body",
      domHash: "sha256 of document.documentElement.outerHTML"
    },
    parts: {
      pages: opts.parts.pages.map(p => p.replace(opts.stagingDir + "/", "")),
      edges: opts.parts.edges.map(p => p.replace(opts.stagingDir + "/", "")),
      assets: opts.parts.assets.map(p => p.replace(opts.stagingDir + "/", "")),
      errors: opts.parts.errors.map(p => p.replace(opts.stagingDir + "/", "")),
      ...(opts.parts.accessibility ? { accessibility: opts.parts.accessibility.map(p => p.replace(opts.stagingDir + "/", "")) } : {}),
      ...(opts.parts.console ? { console: opts.parts.console.map(p => p.replace(opts.stagingDir + "/", "")) } : {}),
      ...(opts.parts.styles ? { styles: opts.parts.styles.map(p => p.replace(opts.stagingDir + "/", "")) } : {})
    },
    schemas: {
      pages: "schemas/pages.schema.json#1",
      edges: "schemas/edges.schema.json#1",
      assets: "schemas/assets.schema.json#1",
      errors: "schemas/errors.schema.json#1",
      ...(opts.parts.accessibility ? { accessibility: "schemas/accessibility.schema.json#1" } : {}),
      ...(opts.parts.console ? { console: "schemas/console.schema.json#1" } : {}),
      ...(opts.parts.styles ? { styles: "schemas/styles.schema.json#1" } : {})
    },
    datasets,
    capabilities: {
      renderModes: [opts.renderMode as any],
      modesUsed: [opts.renderMode as any], // For now, single mode per crawl
      specLevel: opts.renderMode === "raw" ? 1 : opts.renderMode === "prerender" ? 2 : 3,
      dataSets: [
        "pages",
        "edges",
        "assets",
        "errors",
        ...(opts.parts.accessibility && opts.parts.accessibility.length > 0 ? ["accessibility"] : []),
        ...(opts.parts.console && opts.parts.console.length > 0 ? ["console"] : []),
        ...(opts.parts.styles && opts.parts.styles.length > 0 ? ["styles"] : [])
      ],
      robots: {
        respectsRobotsTxt: opts.robotsRespect,
        overrideUsed: opts.robotsOverride
      }
    },
    configIncluded: false,
    redactionApplied: false,
    notes: [
      ...opts.notes,
      ...(opts.provenance?.resumeOf ? [`Resumed from crawl: ${opts.provenance.resumeOf}`] : []),
      ...(opts.provenance?.checkpointInterval ? [`Checkpoint interval: ${opts.provenance.checkpointInterval} pages`] : []),
      ...(opts.provenance?.gracefulShutdown !== undefined ? [`Graceful shutdown: ${opts.provenance.gracefulShutdown}`] : [])
    ],
    integrity: {
      files
    },
    createdAt: new Date().toISOString(),
    generator: "cartographer-engine/1.0.0"
  };
}
