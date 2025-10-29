/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { readFile, stat } from "fs/promises";
import { sha256 } from "../../utils/hashing.js";
import type { AtlasManifest, AtlasSummary } from "../../core/types.js";
import type { ProducerMetadata, EnvironmentSnapshot } from "../../utils/environmentCapture.js";
import { readdir } from "fs/promises";
import { join } from "path";

/**
 * Build Atlas manifest with owner attribution and integrity hashes
 */
export async function buildManifest(opts: {
  parts: {
    pages: string[];
    edges: string[];
    assets: string[];
    responses: string[];
    errors: string[];
    events?: string[];
    accessibility?: string[];
    domSnapshots?: string[];
    console?: string[];
    styles?: string[];
  };
  partMeta?: {
    pages?: Array<{ records: number; bytesUncompressed: number }>;
    edges?: Array<{ records: number; bytesUncompressed: number }>;
    assets?: Array<{ records: number; bytesUncompressed: number }>;
    responses?: Array<{ records: number; bytesUncompressed: number }>;
    errors?: Array<{ records: number; bytesUncompressed: number }>;
    events?: Array<{ records: number; bytesUncompressed: number }>;
    accessibility?: Array<{ records: number; bytesUncompressed: number }>;
    domSnapshots?: Array<{ records: number; bytesUncompressed: number }>;
    console?: Array<{ records: number; bytesUncompressed: number }>;
    styles?: Array<{ records: number; bytesUncompressed: number }>;
  };
  notes: string[];
  stagingDir: string;
  renderMode: string;
  robotsRespect: boolean;
  robotsOverride: boolean;
  robotsOverrideReason?: string;
  replayTier?: 'html' | 'html+css' | 'full';
  privacyConfig?: {
    stripCookies?: boolean;
    stripAuthHeaders?: boolean;
    redactInputValues?: boolean;
    redactForms?: boolean;
  };
  seeds?: string[];
  provenance?: {
    resumeOf?: string;
    checkpointInterval?: number;
    gracefulShutdown?: boolean;
  };
  producer?: ProducerMetadata;
  environment?: EnvironmentSnapshot;
  crawlStartedAt?: string;
  crawlCompletedAt?: string;
}): Promise<AtlasManifest> {
  const files: Record<string, string> = {};
  
  // Compute integrity hashes for all parts
  const allPartFiles = [
    ...opts.parts.pages,
    ...opts.parts.edges,
    ...opts.parts.assets,
  ...opts.parts.responses,
    ...opts.parts.errors,
    ...(opts.parts.events || []),
    ...(opts.parts.accessibility || []),
    ...(opts.parts.domSnapshots || []),
    ...(opts.parts.console || []),
    ...(opts.parts.styles || [])
  ];
  
  for (const partPath of allPartFiles) {
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

  // Resolve schema filename for each dataset (prefer spec v1 schemas)
  const schemaFileFor = (datasetName: string): string => {
    switch (datasetName) {
      case "pages":
        return "schemas/pages.schema.json";
      case "edges":
        return "schemas/edges.schema.json";
      case "assets":
        return "schemas/assets.schema.json";
      case "responses":
        return "schemas/responses.v1.schema.json";
      case "errors":
        return "schemas/errors.schema.json";
      case "accessibility":
        return "schemas/accessibility.schema.json";
      case "dom_snapshots":
        return "schemas/dom_snapshots.schema.json";
      // Engine-specific datasets (no spec v1 schema yet)
      case "events":
        return "schemas/events.schema.json";
      case "console":
        return "schemas/console.schema.json";
      case "styles":
        return "schemas/styles.schema.json";
      default:
        return `schemas/${datasetName}.schema.json`;
    }
  };

  // Dataset metadata with integrity information
  const datasets: Record<string, any> = {};
  for (const [name, partList] of Object.entries({
    pages: opts.parts.pages,
    edges: opts.parts.edges,
    assets: opts.parts.assets,
    responses: opts.parts.responses,
    errors: opts.parts.errors,
    ...(opts.parts.events ? { events: opts.parts.events } : {}),
    ...(opts.parts.accessibility ? { accessibility: opts.parts.accessibility } : {}),
    ...(opts.parts.domSnapshots ? { dom_snapshots: opts.parts.domSnapshots } : {}),
    ...(opts.parts.console ? { console: opts.parts.console } : {}),
    ...(opts.parts.styles ? { styles: opts.parts.styles } : {})
  })) {
    const schemaFile = schemaFileFor(name);
    const schemaAbs = `${opts.stagingDir}/${schemaFile}`;
    
    // Calculate total bytes and per-file checksums for this dataset's parts
    let totalBytes = 0;
    const partChecksums: Record<string, string> = {};
    
    for (const partPath of partList) {
      try {
        const stats = await stat(partPath);
        totalBytes += stats.size;
        
        // Get checksum from files map
        const relativePath = partPath.replace(opts.stagingDir + "/", "");
        if (files[relativePath]) {
          partChecksums[relativePath] = files[relativePath];
        }
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
        case "responses":
          recordCount = opts.partMeta?.responses?.reduce((acc, meta) => acc + meta.records, 0) || 0;
          break;
        case "errors":
          recordCount = summary.stats.totalErrors;
          break;
        case "events":
          recordCount = summary.stats.totalEvents || 0;
          break;
        case "accessibility":
          recordCount = summary.stats.totalAccessibilityRecords || 0;
          break;
        case "dom_snapshots":
          recordCount = summary.stats.totalDOMSnapshots || 0;
          break;
        case "console":
          recordCount = summary.stats.totalConsoleRecords || 0;
          break;
        case "styles":
          recordCount = summary.stats.totalStyleRecords || 0;
          break;
      }
    }

    if (name === "responses" && recordCount === 0 && opts.partMeta?.responses) {
      recordCount = opts.partMeta.responses.reduce((acc, meta) => acc + meta.records, 0);
    }
    
    datasets[name] = {
      name,
  present: recordCount > 0,
      parts: partList.length,
      partCount: partList.length,
      recordCount,
      bytes: totalBytes,
      schema: `${schemaFile}#1`,
      schemaVersion,
      schemaHash: await schemaHash(schemaAbs),
      integrity: {
        algorithm: "sha256",
        checksums: partChecksums
      }
    };
  }

  // Build parts_index with explicit per-part descriptors
  type PartDescriptor = {
    name: string; // dataset name
    path: string; // relative path to .jsonl.zst
    schemaRef: string;
    contentType: string; // application/x-ndjson
    contentEncoding: string; // zstd
    recordCount: number;
    bytesUncompressed?: number;
    bytesCompressed: number;
    sha256: string;
    dependsOn?: string[];
  };

  const parts_index: PartDescriptor[] = [];
  async function pushDatasetParts(datasetName: string, partPaths: string[] | undefined, metaArr?: Array<{ records: number; bytesUncompressed: number }>, dependsOn?: string[]) {
    if (!partPaths || partPaths.length === 0) return;
    for (let i = 0; i < partPaths.length; i++) {
      const abs = partPaths[i];
      const rel = abs.replace(opts.stagingDir + "/", "");
      const st = await stat(abs).catch(() => null as any);
      const bytesCompressed = st?.size ?? 0;
      const sha = files[rel];
      const recordCount = metaArr && metaArr[i] ? metaArr[i].records : 0;
      const bytesUncompressed = metaArr && metaArr[i] ? metaArr[i].bytesUncompressed : undefined;
      const schemaRef = `${schemaFileFor(datasetName)}#1`;
      parts_index.push({
        name: datasetName,
        path: rel,
        schemaRef,
        contentType: "application/x-ndjson",
        contentEncoding: "zstd",
        recordCount,
        bytesUncompressed,
        bytesCompressed,
        sha256: sha,
        dependsOn
      });
    }
  }

  await pushDatasetParts("pages", opts.parts.pages, opts.partMeta?.pages, undefined);
  await pushDatasetParts("edges", opts.parts.edges, opts.partMeta?.edges, ["pages"]);
  await pushDatasetParts("assets", opts.parts.assets, opts.partMeta?.assets, ["pages"]);
  await pushDatasetParts("responses", opts.parts.responses, opts.partMeta?.responses, ["pages"]);
  await pushDatasetParts("errors", opts.parts.errors, opts.partMeta?.errors, ["pages"]);
  await pushDatasetParts("events", opts.parts.events, opts.partMeta?.events, ["pages"]);
  await pushDatasetParts("accessibility", opts.parts.accessibility, opts.partMeta?.accessibility, ["pages", "dom_snapshots"]);
  await pushDatasetParts("dom_snapshots", opts.parts.domSnapshots, opts.partMeta?.domSnapshots, ["pages"]);
  await pushDatasetParts("console", opts.parts.console, opts.partMeta?.console, ["pages"]);
  await pushDatasetParts("styles", opts.parts.styles, opts.partMeta?.styles, ["pages"]);

  // Build coverage matrix (Atlas v1.0 Enhancement - Phase 2)
  const coverageMatrix: Array<{
    part: string;
    expected: boolean;
    present: boolean;
    row_count: number;
    coverage_pct?: number;
    reason_if_absent?: string;
  }> = [];
  
  // Define expected parts based on render mode
  const allParts = ["pages", "edges", "assets", "responses", "errors", "accessibility", "dom_snapshots", "console", "styles"];
  const expectedParts = new Set<string>();
  
  // Core parts always expected
  expectedParts.add("pages");
  expectedParts.add("edges");
  expectedParts.add("assets");
  expectedParts.add("errors");
  
  // Mode-specific parts
  if (opts.renderMode === "prerender" || opts.renderMode === "full") {
    expectedParts.add("accessibility");
  }
  if (opts.renderMode === "full") {
    expectedParts.add("dom_snapshots");
    expectedParts.add("console");
    expectedParts.add("styles");
  }
  
  // Build matrix for all parts
  for (const part of allParts) {
    const expected = expectedParts.has(part);
    const dataset = datasets[part];
    const present = dataset !== undefined && dataset.recordCount > 0;
    const row_count = dataset?.recordCount || 0;
    
    let reason_if_absent: string | undefined;
    if (expected && !present) {
      reason_if_absent = row_count === 0 ? "no_records" : "disabled";
    } else if (!expected) {
      reason_if_absent = "not_in_render_mode";
    }
    
    coverageMatrix.push({
      part,
      expected,
      present,
      row_count,
      reason_if_absent
    });
  }
  
  // Calculate high-level stats from summary
  let totalPages = 0;
  let successfulPages = 0;
  let failedPages = 0;
  let pagesWithErrors = 0;
  let incomplete = false;
  
  if (summary) {
    totalPages = summary.stats.totalPages;
    
    // Count successful pages (2xx status codes)
    for (const [code, count] of Object.entries(summary.stats.statusCodes)) {
      const statusCode = parseInt(code);
      if (statusCode >= 200 && statusCode < 300) {
        successfulPages += count;
      } else if (statusCode >= 400) {
        failedPages += count;
      }
    }
    
    pagesWithErrors = summary.stats.totalErrors;
    incomplete = summary.crawlContext?.completionReason !== "finished";
  }

  // Build storage configuration (Atlas v1.0 Enhancement - Phase 2)
  const storageConfig: AtlasManifest["storage"] = {
    compression: {
      algorithm: "zstd",
      level: 3  // Default Zstandard compression level
    },
    // Atlas v1.0 Spec additions
    blob_format: "zst" as any,  // Individual compressed files
    replay_tier: opts.replayTier || "html" as any,  // Default to html-only
    content_addressing: "off" as any  // Set to "on" when blob storage is implemented
  };
  
  // Check for media files
  const mediaDir = join(opts.stagingDir, "media");
  let hasMedia = false;
  let hasScreenshots = false;
  let hasFavicons = false;
  
  try {
    const mediaStats = await stat(mediaDir);
    if (mediaStats.isDirectory()) {
      hasMedia = true;
      
      // Check for screenshots
      try {
        const screenshotsDir = join(mediaDir, "screenshots");
        const screenshotsDirStats = await stat(screenshotsDir);
        if (screenshotsDirStats.isDirectory()) {
          const desktopDir = join(screenshotsDir, "desktop");
          const mobileDir = join(screenshotsDir, "mobile");
          
          const hasDesktop = await stat(desktopDir).then(() => true).catch(() => false);
          const hasMobile = await stat(mobileDir).then(() => true).catch(() => false);
          
          if (hasDesktop || hasMobile) {
            hasScreenshots = true;
          }
        }
      } catch {
        // No screenshots directory
      }
      
      // Check for favicons
      try {
        const faviconsDir = join(mediaDir, "favicons");
        const faviconsDirStats = await stat(faviconsDir);
        if (faviconsDirStats.isDirectory()) {
          hasFavicons = true;
        }
      } catch {
        // No favicons directory
      }
    }
  } catch {
    // No media directory
  }
  
  // Add media configuration if media exists
  if (hasMedia) {
    const formats: string[] = [];
    const viewports: string[] = [];
    
    if (hasScreenshots) {
      formats.push("jpeg");  // Default screenshot format
      
      // Detect which viewports have screenshots
      try {
        const desktopFiles = await readdir(join(mediaDir, "screenshots/desktop")).catch(() => []);
        if (desktopFiles.length > 0) viewports.push("desktop");
      } catch {}
      
      try {
        const mobileFiles = await readdir(join(mediaDir, "screenshots/mobile")).catch(() => []);
        if (mobileFiles.length > 0) viewports.push("mobile");
      } catch {}
    }
    
    storageConfig.media = {
      location: "media/",
      formats: formats.length > 0 ? formats : ["jpeg"],
      screenshots: hasScreenshots ? {
        enabled: true,
        quality: 80,  // Default quality
        viewports
      } : undefined,
      favicons: hasFavicons ? {
        enabled: true
      } : undefined
    };
  }

  const result: any = {
    atlasVersion: "1.0",
    formatVersion: "1.0.0", // Explicit format version for compatibility checks
    specVersion,
    schemaVersion,
    incomplete: true, // Set to true at crawl start, flip to false after finalization
    owner: {
      name: "Cai Frazier"
    },
    consumers: ["Continuum SEO", "Horizon Accessibility"],
    // Declare project identity at manifest level
    identity: {
      primary_origin: (summary?.identity?.primaryOrigin) || (opts.seeds && opts.seeds[0] ? new URL(opts.seeds[0]).origin : undefined),
      seed_urls: opts.seeds || []
    } as any,
    crawl_started_at: opts.crawlStartedAt,
    crawl_completed_at: opts.crawlCompletedAt,
    producer: opts.producer,
    environment: opts.environment,
    
    // Privacy policy (Atlas v1.0 Spec - Phase 3B)
    privacy_policy: opts.privacyConfig ? {
      strip_cookies: opts.privacyConfig.stripCookies ?? true,
      strip_auth_headers: opts.privacyConfig.stripAuthHeaders ?? true,
      redact_inputs: opts.privacyConfig.redactInputValues ?? true,
      redact_forms: opts.privacyConfig.redactForms ?? true,
      redact_pii: false  // Not yet implemented
    } : undefined,
    
    // Robots.txt policy (Atlas v1.0 Spec - Phase 3B)
    robots_policy: {
      respect: opts.robotsRespect,
      overrides_used: opts.robotsOverride,
      override_reason: opts.robotsOverrideReason
    },
    
    // Crawl config hash (Atlas v1.0 Spec - Phase 3B)
    crawl_config_hash: opts.seeds ? (() => {
      // Create normalized config object for hashing
      const normalizedConfig = {
        seeds: opts.seeds.sort(),  // Sort for deterministic ordering
        renderMode: opts.renderMode,
        replayTier: opts.replayTier,
        robotsRespect: opts.robotsRespect,
        privacyConfig: opts.privacyConfig
      };
      return sha256(Buffer.from(JSON.stringify(normalizedConfig)));
    })() : undefined,
    
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
      responses: opts.parts.responses.map(p => p.replace(opts.stagingDir + "/", "")),
      errors: opts.parts.errors.map(p => p.replace(opts.stagingDir + "/", "")),
      ...(opts.parts.events ? { events: opts.parts.events.map(p => p.replace(opts.stagingDir + "/", "")) } : {}),
      ...(opts.parts.accessibility ? { accessibility: opts.parts.accessibility.map(p => p.replace(opts.stagingDir + "/", "")) } : {}),
      ...(opts.parts.domSnapshots ? { dom_snapshots: opts.parts.domSnapshots.map(p => p.replace(opts.stagingDir + "/", "")) } : {}),
      ...(opts.parts.console ? { console: opts.parts.console.map(p => p.replace(opts.stagingDir + "/", "")) } : {}),
      ...(opts.parts.styles ? { styles: opts.parts.styles.map(p => p.replace(opts.stagingDir + "/", "")) } : {})
    },
    // Explicit parts index to enable consumers to discover datasets without heuristics
    parts_index: parts_index as any,
    // Naming contract for parts
    naming: {
      currentPattern: "{dataset}/part-XXX.jsonl.zst",
      recommended: "parts/{name}.v{schemaMajor}.jsonl.zst"
    } as any,
    schemas: {
      pages: `${schemaFileFor("pages")}#1`,
      edges: `${schemaFileFor("edges")}#1`,
      assets: `${schemaFileFor("assets")}#1`,
      responses: `${schemaFileFor("responses")}#1`,
      errors: `${schemaFileFor("errors")}#1`,
      ...(opts.parts.events ? { events: `${schemaFileFor("events")}#1` } : {}),
      ...(opts.parts.accessibility ? { accessibility: `${schemaFileFor("accessibility")}#1` } : {}),
      ...(opts.parts.domSnapshots ? { dom_snapshots: `${schemaFileFor("dom_snapshots")}#1` } : {}),
      ...(opts.parts.console ? { console: `${schemaFileFor("console")}#1` } : {}),
      ...(opts.parts.styles ? { styles: `${schemaFileFor("styles")}#1` } : {})
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
        "responses",
        "errors",
        ...(opts.parts.accessibility && opts.parts.accessibility.length > 0 ? ["accessibility"] : []),
        ...(opts.parts.domSnapshots && opts.parts.domSnapshots.length > 0 ? ["dom_snapshots"] : []),
        ...(opts.parts.console && opts.parts.console.length > 0 ? ["console"] : []),
        ...(opts.parts.styles && opts.parts.styles.length > 0 ? ["styles"] : [])
      ],
      robots: {
        respectsRobotsTxt: opts.robotsRespect,
        overrideUsed: opts.robotsOverride
      }
    },
    coverage: {
      matrix: coverageMatrix,
      total_pages: totalPages,
      successful_pages: successfulPages,
      failed_pages: failedPages,
      pages_with_errors: pagesWithErrors,
      incomplete
    },
    storage: storageConfig,
    // Consumer requirements contract (hints for downstreams)
    consumers_requirements: {
      Continuum: {
        requires: ["pages", "edges", "assets"],
        optional: ["accessibility"],
        a11yLight: {
          providedBy: "pages",
          fields: ["a11y_missingAlt", "a11y_emptyAnchors", "a11y_invalidAriaRefs"]
        }
      },
      Horizon: {
        requires: ["accessibility"],
        canDeriveFrom: ["dom_snapshots"]
      },
      Vector: {
        requires: ["perf"],
        note: "perf dataset planned"
      }
    } as any,
    compare: {
      canonicalKeys: {
        page: ["page_id", "url_normalized"],
        asset: ["url_normalized"],
        edge: ["source_page_id", "target_url_normalized"]
      },
      normalization: {
        url: {
          lowercaseHost: true,
          removeDefaultPort: true,
          stripFragment: true,
          removeTrailingSlash: true
        }
      }
    } as any,
    configIncluded: false,
    redactionApplied: false,
    notes: [
      ...opts.notes,
      ...(opts.provenance?.resumeOf ? [`Resumed from crawl: ${opts.provenance.resumeOf}`] : []),
      ...(opts.provenance?.checkpointInterval ? [`Checkpoint interval: ${opts.provenance.checkpointInterval} pages`] : []),
      ...(opts.provenance?.gracefulShutdown !== undefined ? [`Graceful shutdown: ${opts.provenance.gracefulShutdown}`] : [])
    ],
    integrity: {
      files,
      // Audit hash (Merkle root) - Atlas v1.0 Enhancement Phase 3B
      audit_hash: (() => {
        // Sort file hashes by filename for deterministic ordering
        const sortedHashes = Object.entries(files)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([_, hash]) => hash)
          .join('');
        return sha256(Buffer.from(sortedHashes));
      })()
    },
    createdAt: new Date().toISOString(),
    generator: "cartographer-engine/1.0.0"
  };
  return result as AtlasManifest;
}
