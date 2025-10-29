/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { mkdir, writeFile, rm, readdir, unlink, copyFile, stat as fsStat } from "fs/promises";
import { finished } from "stream/promises";
import { createWriteStream } from "fs";
import type { WriteStream } from "fs";
import { fsync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import Ajv from "ajv";
import type { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { randomBytes } from "crypto";
import archiver from "archiver";
import type { EngineConfig, PageRecord, EdgeRecord, ErrorRecord, EventRecord, AtlasManifest, AtlasSummary, ConsoleRecord, ComputedTextNodeRecord, RenderMode, AssetRecord } from "../../core/types.js";
import type { ResponseRecordV1 } from "@atlas/spec";
import { BlobStorage } from "./blobStorage.js";
import type { AccessibilityRecord } from "../../core/extractors/accessibility.js";
import { sha256 } from "../../utils/hashing.js";
import { compressFile } from "./compressor.js";
import { buildManifest } from "./manifest.js";
import { log } from "../../utils/logging.js";
import { validateAtlas } from "../validate/validator.js";
import { buildCapabilities } from "./capabilitiesBuilder.js";
import { ProvenanceTracker } from "./provenanceTracker.js";
import type { AtlasCapabilitiesV1 } from '@atlas/spec';
import { captureProducerMetadata, captureEnvironmentSnapshot, type ProducerMetadata, type EnvironmentSnapshot } from "../../utils/environmentCapture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Streaming Atlas writer
 * Writes JSONL parts to staging directory, then compresses and packages into .atls ZIP
 */
export class AtlasWriter {
  private outPath: string;
  private config: EngineConfig;
  private stagingDir: string;
  private uuid: string;
  private recordsSinceFlush = 0;
  private readonly FLUSH_INTERVAL = 1000;
  private capabilities!: AtlasCapabilitiesV1;
  private provenanceTracker!: ProvenanceTracker;
  private producerMetadata!: ProducerMetadata;
  private environmentSnapshot!: EnvironmentSnapshot;
  
  // Timing tracking (Atlas v1.0 Enhancement - Phase 3)
  private crawlStartedAt?: string;
  private crawlCompletedAt?: string;
  
  private provenance: {
    resumeOf?: string;
    checkpointInterval?: number;
    gracefulShutdown?: boolean;
  } = {};
  
  // Part writers
  private pagesPart = 1;
  private edgesPart = 1;
  private assetsPart = 1;
  private responsesPart = 1;
  private errorsPart = 1;
  private eventsPart = 1; // Phase 7: Event log
  private accessibilityPart = 1;
  private consolePart = 1;
  private stylesPart = 1;
  private domSnapshotsPart = 1; // DOM snapshots for offline accessibility audits
  
  // Streams
  private pagesStream: ReturnType<typeof createWriteStream> | null = null;
  private edgesStream: ReturnType<typeof createWriteStream> | null = null;
  private assetsStream: ReturnType<typeof createWriteStream> | null = null;
  private responsesStream: ReturnType<typeof createWriteStream> | null = null;
  private errorsStream: ReturnType<typeof createWriteStream> | null = null;
  private eventsStream: ReturnType<typeof createWriteStream> | null = null; // Phase 7: Event log
  private accessibilityStream: ReturnType<typeof createWriteStream> | null = null;
  private consoleStream: ReturnType<typeof createWriteStream> | null = null;
  private stylesStream: ReturnType<typeof createWriteStream> | null = null;
  private domSnapshotsStream: ReturnType<typeof createWriteStream> | null = null; // DOM snapshots
  
  // Byte counters (for rolling parts at 150MB)
  private pagesBytes = 0;
  private edgesBytes = 0;
  private assetsBytes = 0;
  private responsesBytes = 0;
  private errorsBytes = 0;
  private eventsBytes = 0; // Phase 7: Event log
  private accessibilityBytes = 0;
  private consoleBytes = 0;
  private stylesBytes = 0;
  private domSnapshotsBytes = 0; // DOM snapshots

  // Per-part record and uncompressed byte counters for manifest parts_index
  private pagesPartCounts: number[] = [];
  private edgesPartCounts: number[] = [];
  private assetsPartCounts: number[] = [];
  private responsesPartCounts: number[] = [];
  private errorsPartCounts: number[] = [];
  private eventsPartCounts: number[] = [];
  private accessibilityPartCounts: number[] = [];
  private consolePartCounts: number[] = [];
  private stylesPartCounts: number[] = [];
  private domSnapshotsPartCounts: number[] = [];

  private pagesPartUncompressed: number[] = [];
  private edgesPartUncompressed: number[] = [];
  private assetsPartUncompressed: number[] = [];
  private responsesPartUncompressed: number[] = [];
  private errorsPartUncompressed: number[] = [];
  private eventsPartUncompressed: number[] = [];
  private accessibilityPartUncompressed: number[] = [];
  private consolePartUncompressed: number[] = [];
  private stylesPartUncompressed: number[] = [];
  private domSnapshotsPartUncompressed: number[] = [];
  
  // Stats
  private stats: AtlasSummary = {
    identity: {
      seedUrls: [],
      primaryOrigin: "",
      domain: "",
      publicSuffix: ""
    },
    crawlContext: {
      specLevel: 1,
      completionReason: "finished",
      config: {
        maxPages: 0,
        maxDepth: -1,
        robotsRespect: true,
        followExternal: false
      }
    },
    stats: {
      totalPages: 0,
      totalEdges: 0,
      totalAssets: 0,
      totalErrors: 0,
      totalAccessibilityRecords: 0,
      totalConsoleRecords: 0,
      totalStyleRecords: 0,
      statusCodes: {},
      renderModes: { raw: 0, prerender: 0, full: 0 }
    },
    performance: {
      maxDepthReached: 0
    },
    timestamps: {
      crawlStartedAt: new Date().toISOString(),
      crawlCompletedAt: "",
      crawlDurationMs: 0
    }
  };

  // v1 schema validators (compiled from @atlas/spec)
  private ajv?: Ajv.default;
  private validatePageV1?: Ajv.ValidateFunction;
  private validateLinkV1?: Ajv.ValidateFunction;
  private validateResourceV1?: Ajv.ValidateFunction;
  private validateResponseV1?: Ajv.ValidateFunction;

  // Map URL to page_id for joinable datasets (used for accessibility mapping)
  private pageIdByUrl: Map<string, string> = new Map();
  private blobStorage!: BlobStorage;

  private formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
    if (!errors || errors.length === 0) {
      return "unknown validation error";
    }
    return errors
      .map(error => {
        const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : "/";
        if (error.keyword === "additionalProperties" && typeof (error.params as any)?.additionalProperty === "string") {
          return `${path} has unexpected property '${(error.params as any).additionalProperty}'`;
        }
        return `${path} ${error.message || "failed schema validation"}`;
      })
      .join("; ");
  }
  
  constructor(outPath: string, config: EngineConfig, crawlId?: string) {
  this.outPath = outPath;
  this.config = config;
  this.uuid = crawlId || randomBytes(8).toString("hex");
  this.stagingDir = join(outPath + ".staging", this.uuid);
  log('debug', `AtlasWriter: Initializing with outPath: ${this.outPath}`);
  
  // Initialize identity from config
  this.stats.identity.seedUrls = config.seeds || [];
  if (config.seeds && config.seeds.length > 0) {
    try {
      const primaryUrl = new URL(config.seeds[0]);
      this.stats.identity.primaryOrigin = primaryUrl.origin;
      this.stats.identity.domain = primaryUrl.hostname;
      
      // Extract public suffix (simple approach - last part after last dot)
      const parts = primaryUrl.hostname.split(".");
      this.stats.identity.publicSuffix = parts.length > 1 ? parts[parts.length - 1] : "";
    } catch (e) {
      // Invalid URL, leave defaults
    }
  }
  
  // Initialize crawl context from config
  this.stats.crawlContext.config.maxPages = config.maxPages;
  this.stats.crawlContext.config.maxDepth = config.maxDepth;
  this.stats.crawlContext.config.robotsRespect = config.robots.respect;
  this.stats.crawlContext.config.followExternal = config.discovery.followExternal;
  
  // Set specLevel based on render mode
  const modeToLevel: Record<RenderMode, number> = { raw: 1, prerender: 2, full: 3 };
  this.stats.crawlContext.specLevel = modeToLevel[config.render.mode] || 1;
}
  
  async init(): Promise<void> {
    log("debug", `Initializing staging dir: ${this.stagingDir}`);
    
    // Capture crawl start timestamp (Atlas v1.0 Enhancement - Phase 3)
    this.crawlStartedAt = new Date().toISOString();
    log("debug", `[Timing] Crawl started at: ${this.crawlStartedAt}`);
    
    // Capture producer metadata at init time
    this.producerMetadata = captureProducerMetadata();
    log("debug", `[Producer] Captured metadata: ${this.producerMetadata.name} v${this.producerMetadata.version} (${this.producerMetadata.build})`);
    
    // Capture environment snapshot from config
    this.environmentSnapshot = captureEnvironmentSnapshot(this.config);
    log("debug", `[Environment] Captured snapshot: ${this.environmentSnapshot.device} device, ${this.environmentSnapshot.browser.name} ${this.environmentSnapshot.browser.version}`);
    
    // Build capabilities from config
    const replayTier = this.config.replay?.tier || 'html+css';
    log("debug", `[Capabilities] Replay tier from config: ${replayTier}`);
    
    this.capabilities = buildCapabilities({
      renderMode: this.config.render.mode,
      replayTier,
      accessibility: this.config.accessibility?.enabled !== false,
      performance: false, // Will be added in future phases
      seoEnhanced: true // Always capture enhanced SEO
    });
    log("debug", `[Capabilities] Built capabilities: ${this.capabilities.capabilities.join(', ')}`);
    
    // Initialize provenance tracker
    this.provenanceTracker = new ProvenanceTracker();
    log("debug", `[Provenance] Initialized provenance tracker`);
    
    await mkdir(this.stagingDir, { recursive: true });
    await mkdir(join(this.stagingDir, "pages"), { recursive: true });
    await mkdir(join(this.stagingDir, "edges"), { recursive: true });
    await mkdir(join(this.stagingDir, "assets"), { recursive: true });
  await mkdir(join(this.stagingDir, "responses"), { recursive: true });
    await mkdir(join(this.stagingDir, "errors"), { recursive: true });
    await mkdir(join(this.stagingDir, "events"), { recursive: true }); // Phase 7: Event log
    await mkdir(join(this.stagingDir, "accessibility"), { recursive: true });
    await mkdir(join(this.stagingDir, "dom_snapshots"), { recursive: true }); // DOM snapshots
    
    // Full mode datasets
    if (this.config.render.mode === "full") {
      await mkdir(join(this.stagingDir, "console"), { recursive: true });
      await mkdir(join(this.stagingDir, "styles"), { recursive: true });
      await mkdir(join(this.stagingDir, "media"), { recursive: true });
      await mkdir(join(this.stagingDir, "media", "screenshots"), { recursive: true });
      await mkdir(join(this.stagingDir, "media", "screenshots", "desktop"), { recursive: true });
      await mkdir(join(this.stagingDir, "media", "screenshots", "mobile"), { recursive: true });
      await mkdir(join(this.stagingDir, "media", "favicons"), { recursive: true });
      // Legacy directories (for backward compatibility)
      await mkdir(join(this.stagingDir, "media", "viewports"), { recursive: true });
    }
    
    // Initialize first part streams
  await this.rotatePagesPart();
  await this.rotateEdgesPart();
  await this.rotateAssetsPart();
  await this.rotateResponsesPart();
  await this.rotateErrorsPart();
    await this.rotateEventsPart(); // Phase 7: Event log
    await this.rotateAccessibilityPart();
    await this.rotateDOMSnapshotsPart(); // DOM snapshots
    
    if (this.config.render.mode === "full") {
      await this.rotateConsolePart();
      await this.rotateStylesPart();
    }

    // Initialize blob storage for responses/resources bodies
    const blobsDir = join(this.stagingDir, "blobs");
    await mkdir(blobsDir, { recursive: true });
    this.blobStorage = new BlobStorage({
      blobsDir,
      format: "individual",
      deduplication: true
    });
    await this.blobStorage.init();

    // Compile spec v1 validators for on-write validation
    try {
      const atlasSpecRoot = (() => {
        try {
          const pkgDir = dirname(require.resolve("@atlas/spec/package.json"));
          return join(pkgDir, "dist", "schemas");
        } catch {
          return join(__dirname, "../../../../atlas-spec/dist/schemas");
        }
      })();
      const fs = await import("fs/promises");
      const engineSchemaDir = join(__dirname, "schemas");
      const pagesSchema = JSON.parse(await fs.readFile(join(engineSchemaDir, "pages.schema.json"), "utf-8"));
      const edgesSchema = JSON.parse(await fs.readFile(join(engineSchemaDir, "edges.schema.json"), "utf-8"));
      const assetsSchema = JSON.parse(await fs.readFile(join(engineSchemaDir, "assets.schema.json"), "utf-8"));
  const responsesSchema = JSON.parse(await fs.readFile(join(atlasSpecRoot, "responses.v1.schema.json"), "utf-8"));
      this.ajv = new Ajv.default({ allErrors: true, strictSchema: false });
      addFormats.default(this.ajv);
      this.validatePageV1 = this.ajv.compile(pagesSchema);
      this.validateLinkV1 = this.ajv.compile(edgesSchema);
      this.validateResourceV1 = this.ajv.compile(assetsSchema);
      this.validateResponseV1 = this.ajv.compile(responsesSchema);
  log("debug", "[AtlasWriter] Initialized validators for pages, edges, assets, and responses datasets");
    } catch (e: any) {
      log("warn", `[AtlasWriter] Failed to initialize v1 validators: ${e?.message || e}`);
    }
  }
  
  async writePage(page: PageRecord): Promise<void> {
    const record: Record<string, unknown> = { ...page } as Record<string, unknown>;
    if (this.validatePageV1 && !this.validatePageV1(record)) {
      const err = this.formatAjvErrors(this.validatePageV1.errors);
      throw new Error(`Page schema validation failed: ${err}`);
    }
    try {
      const pageId = (record.page_id ?? (record as any).pageId) as string | undefined;
      if (pageId) {
        const url = record.url as string | undefined;
        const normalizedUrl = (record.normalizedUrl ?? (record as any).normalized_url) as string | undefined;
        const finalUrl = (record.finalUrl ?? (record as any).final_url ?? url) as string | undefined;
        if (url) this.pageIdByUrl.set(String(url), String(pageId));
        if (normalizedUrl) this.pageIdByUrl.set(String(normalizedUrl), String(pageId));
        if (finalUrl) this.pageIdByUrl.set(String(finalUrl), String(pageId));
      }
    } catch {}
    const line = JSON.stringify(record) + "\n";
    const bytes = Buffer.byteLength(line);
    
    // Roll part if exceeds 150MB
    if (this.pagesBytes + bytes > 150_000_000) {
      await this.rotatePagesPart();
    }
    
  this.pagesStream!.write(line);
    this.pagesBytes += bytes;
  // track per-part counts/uncompressed bytes
  if (this.pagesPartCounts.length === 0) this.pagesPartCounts.push(0);
  if (this.pagesPartUncompressed.length === 0) this.pagesPartUncompressed.push(0);
  this.pagesPartCounts[this.pagesPartCounts.length - 1] += 1;
  this.pagesPartUncompressed[this.pagesPartUncompressed.length - 1] += bytes;
    this.stats.stats.totalPages++;
  // Update summary stats using original page fields
  // @ts-ignore - internal rich PageRecord has these fields
  this.stats.stats.statusCodes[page.statusCode] = (this.stats.stats.statusCodes[page.statusCode] || 0) + 1;
  // @ts-ignore
  this.stats.stats.renderModes[page.renderMode]++;
  // @ts-ignore
  this.stats.performance.maxDepthReached = Math.max(this.stats.performance.maxDepthReached, page.depth);
    
    this.recordsSinceFlush++;
    if (this.recordsSinceFlush >= this.FLUSH_INTERVAL) {
      await this.flushAndSync();
    }
  }
  
  async writeEdge(edge: EdgeRecord): Promise<void> {
    const record: Record<string, unknown> = { ...edge } as Record<string, unknown>;
    if (this.validateLinkV1 && !this.validateLinkV1(record)) {
      const err = this.formatAjvErrors(this.validateLinkV1.errors);
      throw new Error(`Link schema validation failed: ${err}`);
    }
    const line = JSON.stringify(record) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.edgesBytes + bytes > 150_000_000) {
      await this.rotateEdgesPart();
    }
    
    this.edgesStream!.write(line);
    this.edgesBytes += bytes;
    if (this.edgesPartCounts.length === 0) this.edgesPartCounts.push(0);
    if (this.edgesPartUncompressed.length === 0) this.edgesPartUncompressed.push(0);
    this.edgesPartCounts[this.edgesPartCounts.length - 1] += 1;
    this.edgesPartUncompressed[this.edgesPartUncompressed.length - 1] += bytes;
    this.stats.stats.totalEdges++;
  }
  
  async writeAsset(asset: AssetRecord): Promise<void> {
    const record: Record<string, unknown> = { ...asset } as Record<string, unknown>;
    if (this.validateResourceV1 && !this.validateResourceV1(record)) {
      const err = this.formatAjvErrors(this.validateResourceV1.errors);
      throw new Error(`Asset schema validation failed: ${err}`);
    }
    const line = JSON.stringify(record) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.assetsBytes + bytes > 150_000_000) {
      await this.rotateAssetsPart();
    }
    
    this.assetsStream!.write(line);
    this.assetsBytes += bytes;
    if (this.assetsPartCounts.length === 0) this.assetsPartCounts.push(0);
    if (this.assetsPartUncompressed.length === 0) this.assetsPartUncompressed.push(0);
    this.assetsPartCounts[this.assetsPartCounts.length - 1] += 1;
    this.assetsPartUncompressed[this.assetsPartUncompressed.length - 1] += bytes;
    this.stats.stats.totalAssets++;
  }

  async writeResponse(response: ResponseRecordV1): Promise<void> {
    if (this.validateResponseV1 && !this.validateResponseV1(response)) {
      const err = this.formatAjvErrors(this.validateResponseV1.errors);
      throw new Error(`Response schema validation failed (v1): ${err}`);
    }

    const line = JSON.stringify(response) + "\n";
    const bytes = Buffer.byteLength(line);

    if (this.responsesBytes + bytes > 150_000_000) {
      await this.rotateResponsesPart();
    }

    this.responsesStream!.write(line);
    this.responsesBytes += bytes;
    if (this.responsesPartCounts.length === 0) this.responsesPartCounts.push(0);
    if (this.responsesPartUncompressed.length === 0) this.responsesPartUncompressed.push(0);
    this.responsesPartCounts[this.responsesPartCounts.length - 1] += 1;
    this.responsesPartUncompressed[this.responsesPartUncompressed.length - 1] += bytes;
  }

  async writeResponseBody(pageId: string, body: Buffer | string, encoding: string): Promise<void> {
    const { blob_ref } = await this.blobStorage.store(body);
    await this.writeResponse({
      page_id: pageId,
      encoding,
      body_blob_ref: blob_ref,
    });
  }
  
  async writeError(error: ErrorRecord): Promise<void> {
    const line = JSON.stringify(error) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.errorsBytes + bytes > 150_000_000) {
      await this.rotateErrorsPart();
    }
    
    this.errorsStream!.write(line);
    this.errorsBytes += bytes;
    if (this.errorsPartCounts.length === 0) this.errorsPartCounts.push(0);
    if (this.errorsPartUncompressed.length === 0) this.errorsPartUncompressed.push(0);
    this.errorsPartCounts[this.errorsPartCounts.length - 1] += 1;
    this.errorsPartUncompressed[this.errorsPartUncompressed.length - 1] += bytes;
    this.stats.stats.totalErrors++;
  }
  
  /**
   * Write an operational event (Phase 7: Event log)
   * Events are persisted to a dedicated dataset for operational insights
   */
  async writeEvent(event: EventRecord): Promise<void> {
    const line = JSON.stringify(event) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.eventsBytes + bytes > 150_000_000) {
      await this.rotateEventsPart();
    }
    
    this.eventsStream!.write(line);
    this.eventsBytes += bytes;
    if (this.eventsPartCounts.length === 0) this.eventsPartCounts.push(0);
    if (this.eventsPartUncompressed.length === 0) this.eventsPartUncompressed.push(0);
    this.eventsPartCounts[this.eventsPartCounts.length - 1] += 1;
    this.eventsPartUncompressed[this.eventsPartUncompressed.length - 1] += bytes;
    this.stats.stats.totalEvents = (this.stats.stats.totalEvents || 0) + 1;
  }
  
  async writeAccessibility(record: AccessibilityRecord): Promise<void> {
    const line = JSON.stringify(record) + "\n";
    const bytes = Buffer.byteLength(line);

    if (this.accessibilityBytes + bytes > 150_000_000) {
      await this.rotateAccessibilityPart();
    }

    this.accessibilityStream!.write(line);
    this.accessibilityBytes += bytes;
    if (this.accessibilityPartCounts.length === 0) this.accessibilityPartCounts.push(0);
    if (this.accessibilityPartUncompressed.length === 0) this.accessibilityPartUncompressed.push(0);
    this.accessibilityPartCounts[this.accessibilityPartCounts.length - 1] += 1;
    this.accessibilityPartUncompressed[this.accessibilityPartUncompressed.length - 1] += bytes;
    this.stats.stats.totalAccessibilityRecords = (this.stats.stats.totalAccessibilityRecords || 0) + 1;
  }
  
  /**
   * Write DOM snapshot record for offline accessibility audits
   * Only writes in full mode
   */
  async writeDOMSnapshot(record: any): Promise<void> {
    // Only write in full mode
    if (this.config.render.mode !== "full") {
      return;
    }
    
    const line = JSON.stringify(record) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.domSnapshotsBytes + bytes > 150_000_000) {
      await this.rotateDOMSnapshotsPart();
    }
    
    this.domSnapshotsStream!.write(line);
    this.domSnapshotsBytes += bytes;
    if (this.domSnapshotsPartCounts.length === 0) this.domSnapshotsPartCounts.push(0);
    if (this.domSnapshotsPartUncompressed.length === 0) this.domSnapshotsPartUncompressed.push(0);
    this.domSnapshotsPartCounts[this.domSnapshotsPartCounts.length - 1] += 1;
    this.domSnapshotsPartUncompressed[this.domSnapshotsPartUncompressed.length - 1] += bytes;
    this.stats.stats.totalDOMSnapshots = (this.stats.stats.totalDOMSnapshots || 0) + 1;
  }
  
  async writeConsole(record: ConsoleRecord): Promise<void> {
    // Only write in full mode and filter to source: "page" only
    if (this.config.render.mode !== "full" || record.source !== "page") {
      return;
    }
    
    const line = JSON.stringify(record) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.consoleBytes + bytes > 150_000_000) {
      await this.rotateConsolePart();
    }
    
    this.consoleStream!.write(line);
    this.consoleBytes += bytes;
    if (this.consolePartCounts.length === 0) this.consolePartCounts.push(0);
    if (this.consolePartUncompressed.length === 0) this.consolePartUncompressed.push(0);
    this.consolePartCounts[this.consolePartCounts.length - 1] += 1;
    this.consolePartUncompressed[this.consolePartUncompressed.length - 1] += bytes;
    this.stats.stats.totalConsoleRecords = (this.stats.stats.totalConsoleRecords || 0) + 1;
  }
  
  async writeStyle(record: ComputedTextNodeRecord): Promise<void> {
    // Only write in full mode
    if (this.config.render.mode !== "full") {
      return;
    }
    
    const line = JSON.stringify(record) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.stylesBytes + bytes > 150_000_000) {
      await this.rotateStylesPart();
    }
    
    this.stylesStream!.write(line);
    this.stylesBytes += bytes;
    if (this.stylesPartCounts.length === 0) this.stylesPartCounts.push(0);
    if (this.stylesPartUncompressed.length === 0) this.stylesPartUncompressed.push(0);
    this.stylesPartCounts[this.stylesPartCounts.length - 1] += 1;
    this.stylesPartUncompressed[this.stylesPartUncompressed.length - 1] += bytes;
    this.stats.stats.totalStyleRecords = (this.stats.stats.totalStyleRecords || 0) + 1;
  }
  
  async writeScreenshot(viewport: 'desktop' | 'mobile', urlKey: string, buffer: Buffer): Promise<string> {
    // Determine file extension based on buffer content
    const ext = buffer[0] === 0xFF && buffer[1] === 0xD8 ? 'jpg' : 'png';
    const path = join(this.stagingDir, "media", "screenshots", viewport, `${urlKey}.${ext}`);
    await writeFile(path, buffer);
    
    // Return relative path for PageRecord
    return `media/screenshots/${viewport}/${urlKey}.${ext}`;
  }
  
  async writeFavicon(originKey: string, buffer: Buffer, mimeType: string): Promise<string> {
    // Determine file extension from MIME type
    const extMap: Record<string, string> = {
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/svg+xml': 'svg',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    
    const ext = extMap[mimeType] || 'ico';
    const path = join(this.stagingDir, "media", "favicons", `${originKey}.${ext}`);
    await writeFile(path, buffer);
    
    // Return relative path for PageRecord
    return `media/favicons/${originKey}.${ext}`;
  }
  
  // Legacy method (backward compatibility)
  async writeLegacyScreenshot(urlKey: string, buffer: Buffer): Promise<void> {
    const path = join(this.stagingDir, "media", "screenshots", `${urlKey}.png`);
    await writeFile(path, buffer);
  }
  
  async writeViewport(urlKey: string, buffer: Buffer): Promise<void> {
    const path = join(this.stagingDir, "media", "viewports", `${urlKey}.png`);
    await writeFile(path, buffer);
  }
  
  /**
   * Get total bytes written (uncompressed JSONL)
   */
  getBytesWritten(): number {
    return this.pagesBytes + this.edgesBytes + this.assetsBytes + this.errorsBytes + this.accessibilityBytes;
  }
  
  /**
   * Get crawl ID (UUID)
   */
  getCrawlId(): string {
    return this.uuid;
  }
  
  /**
   * Get staging directory path
   */
  getStagingDir(): string {
    return this.stagingDir;
  }
  
  /**
   * Get current summary statistics
   */
  getSummary(): AtlasSummary {
    return { ...this.stats };
  }

  /**
   * Set completion reason for crawl
   */
  setCompletionReason(reason: "finished" | "capped" | "error_budget" | "manual"): void {
    this.stats.crawlContext.completionReason = reason;
  }

  /**
   * Get manifest.json path for this crawl
   */
  getManifestPath(): string {
    return join(this.stagingDir, "manifest.json");
  }
  
  /**
   * Set provenance information for manifest
   */
  setProvenance(provenance: {
    resumeOf?: string;
    checkpointInterval?: number;
    gracefulShutdown?: boolean;
  }): void {
    this.provenance = provenance;
  }
  
  /**
   * Get current part pointers for checkpoint
   */
  getPartPointers(): {
    pages: [string, number];
    edges: [string, number];
    assets: [string, number];
    responses: [string, number];
    errors: [string, number];
    accessibility: [string, number];
  } {
    return {
      pages: [`part-${String(this.pagesPart - 1).padStart(3, "0")}.jsonl`, this.pagesBytes],
      edges: [`part-${String(this.edgesPart - 1).padStart(3, "0")}.jsonl`, this.edgesBytes],
      assets: [`part-${String(this.assetsPart - 1).padStart(3, "0")}.jsonl`, this.assetsBytes],
      responses: [`part-${String(this.responsesPart - 1).padStart(3, "0")}.jsonl`, this.responsesBytes],
      errors: [`part-${String(this.errorsPart - 1).padStart(3, "0")}.jsonl`, this.errorsBytes],
      accessibility: [`part-${String(this.accessibilityPart - 1).padStart(3, "0")}.jsonl`, this.accessibilityBytes]
    };
  }
  
  /**
   * Flush and fsync all streams
   */
  async flushAndSync(): Promise<void> {
    const streams = [
      this.pagesStream,
      this.edgesStream,
      this.assetsStream,
      this.responsesStream,
      this.errorsStream
    ].filter(s => s !== null);
    
    for (const stream of streams) {
      if (stream && !stream.closed) {
        await new Promise<void>((resolve, reject) => {
          stream.write("", (err) => {
            if (err) reject(err);
            else {
              // @ts-ignore - fd exists on WriteStream
              const fd = stream.fd;
              if (fd !== undefined && typeof fd === "number") {
                fsync(fd, (fsyncErr: any) => {
                  if (fsyncErr) reject(fsyncErr);
                  else resolve();
                });
              } else {
                resolve();
              }
            }
          });
        });
      }
    }
    
    this.recordsSinceFlush = 0;
    log("debug", "[Writer] Flushed and synced all streams");
  }
  
  private async rotatePagesPart(): Promise<void> {
    if (this.pagesStream) {
      this.pagesStream.end();
    }
    const filename = `part-${String(this.pagesPart).padStart(3, "0")}.jsonl`;
    this.pagesStream = createWriteStream(join(this.stagingDir, "pages", filename));
    this.pagesPart++;
    this.pagesBytes = 0;
    // start tracking for new part
    this.pagesPartCounts.push(0);
    this.pagesPartUncompressed.push(0);
  }
  
  private async rotateEdgesPart(): Promise<void> {
    if (this.edgesStream) {
      this.edgesStream.end();
    }
    const filename = `part-${String(this.edgesPart).padStart(3, "0")}.jsonl`;
    this.edgesStream = createWriteStream(join(this.stagingDir, "edges", filename));
    this.edgesPart++;
    this.edgesBytes = 0;
    this.edgesPartCounts.push(0);
    this.edgesPartUncompressed.push(0);
  }
  
  private async rotateAssetsPart(): Promise<void> {
    if (this.assetsStream) {
      this.assetsStream.end();
    }
    const filename = `part-${String(this.assetsPart).padStart(3, "0")}.jsonl`;
    this.assetsStream = createWriteStream(join(this.stagingDir, "assets", filename));
    this.assetsPart++;
    this.assetsBytes = 0;
    this.assetsPartCounts.push(0);
    this.assetsPartUncompressed.push(0);
  }

  private async rotateResponsesPart(): Promise<void> {
    if (this.responsesStream) {
      this.responsesStream.end();
    }
    const filename = `part-${String(this.responsesPart).padStart(3, "0")}.jsonl`;
    this.responsesStream = createWriteStream(join(this.stagingDir, "responses", filename));
    this.responsesPart++;
    this.responsesBytes = 0;
    this.responsesPartCounts.push(0);
    this.responsesPartUncompressed.push(0);
  }
  
  private async rotateErrorsPart(): Promise<void> {
    if (this.errorsStream) {
      this.errorsStream.end();
    }
    const filename = `part-${String(this.errorsPart).padStart(3, "0")}.jsonl`;
    this.errorsStream = createWriteStream(join(this.stagingDir, "errors", filename));
    this.errorsPart++;
    this.errorsBytes = 0;
    this.errorsPartCounts.push(0);
    this.errorsPartUncompressed.push(0);
  }
  
  /**
   * Rotate events part file (Phase 7: Event log)
   */
  private async rotateEventsPart(): Promise<void> {
    if (this.eventsStream) {
      this.eventsStream.end();
    }
    const filename = `part-${String(this.eventsPart).padStart(3, "0")}.jsonl`;
    this.eventsStream = createWriteStream(join(this.stagingDir, "events", filename));
    this.eventsPart++;
    this.eventsBytes = 0;
    this.eventsPartCounts.push(0);
    this.eventsPartUncompressed.push(0);
  }
  
  private async rotateAccessibilityPart(): Promise<void> {
    if (this.accessibilityStream) {
      this.accessibilityStream.end();
    }
    const filename = `part-${String(this.accessibilityPart).padStart(3, "0")}.jsonl`;
    this.accessibilityStream = createWriteStream(join(this.stagingDir, "accessibility", filename));
    this.accessibilityPart++;
    this.accessibilityBytes = 0;
    this.accessibilityPartCounts.push(0);
    this.accessibilityPartUncompressed.push(0);
  }
  
  private async rotateConsolePart(): Promise<void> {
    if (this.consoleStream) {
      this.consoleStream.end();
    }
    const filename = `part-${String(this.consolePart).padStart(3, "0")}.jsonl`;
    this.consoleStream = createWriteStream(join(this.stagingDir, "console", filename));
    this.consolePart++;
    this.consoleBytes = 0;
    this.consolePartCounts.push(0);
    this.consolePartUncompressed.push(0);
  }
  
  private async rotateStylesPart(): Promise<void> {
    if (this.stylesStream) {
      this.stylesStream.end();
    }
    const filename = `part-${String(this.stylesPart).padStart(3, "0")}.jsonl`;
    this.stylesStream = createWriteStream(join(this.stagingDir, "styles", filename));
    this.stylesPart++;
    this.stylesBytes = 0;
    this.stylesPartCounts.push(0);
    this.stylesPartUncompressed.push(0);
  }
  
  /**
   * Rotate DOM snapshots part file
   */
  private async rotateDOMSnapshotsPart(): Promise<void> {
    if (this.domSnapshotsStream) {
      this.domSnapshotsStream.end();
    }
    const filename = `part-${String(this.domSnapshotsPart).padStart(3, "0")}.jsonl`;
    this.domSnapshotsStream = createWriteStream(join(this.stagingDir, "dom_snapshots", filename));
    this.domSnapshotsPart++;
    this.domSnapshotsBytes = 0;
    this.domSnapshotsPartCounts.push(0);
    this.domSnapshotsPartUncompressed.push(0);
  }
  
  /**
   * Hash all parts of a dataset for provenance tracking
   */
  private async hashParts(parts: string[]): Promise<string> {
    const hashes = await Promise.all(parts.map(p => sha256(p)));
    // Concatenate all hashes and hash again for single dataset hash
    const combinedHash = hashes.join('');
    return sha256(Buffer.from(combinedHash));
  }
  
  /**
   * Write capabilities.v1.json to staging directory
   */
  private async writeCapabilities(): Promise<void> {
    const path = join(this.stagingDir, 'capabilities.v1.json');
    await writeFile(path, JSON.stringify(this.capabilities, null, 2));
    log('debug', `[Capabilities] Wrote capabilities.v1.json with ${this.capabilities.capabilities.length} capabilities`);
  }
  
  /**
   * Write provenance.v1.jsonl.zst to staging directory
   */
  private async writeProvenance(): Promise<void> {
    // Write provenance.v1.jsonl.zst directly in staging root (Atlas v1.0 Spec)
    const jsonlPath = join(this.stagingDir, 'provenance.v1.jsonl');
    const records = this.provenanceTracker.getRecords();
    
    if (records.length === 0) {
      log('debug', '[Provenance] No provenance records to write');
      return;
    }
    
    const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    await writeFile(jsonlPath, lines);
    
    // Compress with Zstandard
    const zstPath = jsonlPath + '.zst';
    await compressFile(jsonlPath, zstPath);
    
    // Remove uncompressed file
    await unlink(jsonlPath);
    
    log('info', `[Provenance] Wrote provenance.v1.jsonl.zst with ${records.length} records`);
  }
  
  async finalize(): Promise<void> {
    log('info', '[DIAGNOSTIC] AtlasWriter: Starting finalize()...');
    
    // Capture crawl completion timestamp (Atlas v1.0 Enhancement - Phase 3)
    this.crawlCompletedAt = new Date().toISOString();
    log("debug", `[Timing] Crawl completed at: ${this.crawlCompletedAt}`);
    
    try {
      // Close all streams robustly
      const streamsToClose = [
        this.pagesStream,
        this.edgesStream,
        this.assetsStream,
        this.errorsStream,
        this.eventsStream, // Phase 7: Event log
        this.accessibilityStream,
        this.domSnapshotsStream, // DOM snapshots
        ...(this.config.render.mode === "full" ? [this.consoleStream, this.stylesStream] : [])
      ].filter((s): s is WriteStream => s !== null);

      log('debug', `[DIAGNOSTIC] AtlasWriter: Ending ${streamsToClose.length} streams...`);
      streamsToClose.forEach(s => s.end());

      // Wait for streams to finish flushing using 'finished'
      try {
        log('debug', '[DIAGNOSTIC] AtlasWriter: Waiting for streams to finish...');
        await Promise.all(streamsToClose.map(s => finished(s)));
        log('info', '[DIAGNOSTIC] AtlasWriter: All streams finished successfully.');
      } catch (error: any) {
        log('error', `[DIAGNOSTIC] AtlasWriter: Error waiting for streams to finish: ${error.message}`);
        // Should we throw here or try to continue? Let's try to continue for now.
      }

      // Update stats
      this.stats.timestamps.crawlCompletedAt = new Date().toISOString();
      this.stats.timestamps.crawlDurationMs = new Date(this.stats.timestamps.crawlCompletedAt).getTime() - new Date(this.stats.timestamps.crawlStartedAt).getTime();

      log("info", "[DIAGNOSTIC] AtlasWriter: Compressing JSONL parts with Zstandard...");

      // Compress all parts and get absolute paths
      const pagesParts = await this.compressParts("pages");
  const edgesParts = await this.compressParts("edges");
  const assetsParts = await this.compressParts("assets");
  const responsesParts = await this.compressParts("responses");
  const errorsParts = await this.compressParts("errors");
      const eventsParts = await this.compressParts("events"); // Phase 7: Event log
      const accessibilityParts = await this.compressParts("accessibility");
      const domSnapshotsParts = await this.compressParts("dom_snapshots"); // DOM snapshots
      
      // Compress full mode datasets
      let consoleParts: string[] = [];
      let stylesParts: string[] = [];
      if (this.config.render.mode === "full") {
        consoleParts = await this.compressParts("console");
        stylesParts = await this.compressParts("styles");
      }
      
      // Track provenance for all datasets
      log("info", "[DIAGNOSTIC] AtlasWriter: Recording provenance for datasets...");
      const version = "1.0.0-beta.1"; // TODO: Get from package.json dynamically
      
      // Add provenance for pages dataset
      if (pagesParts.length > 0) {
        const pagesHash = await this.hashParts(pagesParts);
        this.provenanceTracker.addExtraction(
          'pages.v1',
          'extractor-pages',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalPages, hash_sha256: pagesHash }
        );
      }
      
      // Add provenance for edges dataset
      if (edgesParts.length > 0) {
        const edgesHash = await this.hashParts(edgesParts);
        this.provenanceTracker.addExtraction(
          'edges.v1',
          'extractor-edges',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalEdges, hash_sha256: edgesHash }
        );
      }
      
      // Add provenance for assets dataset
      if (assetsParts.length > 0) {
        const assetsHash = await this.hashParts(assetsParts);
        this.provenanceTracker.addExtraction(
          'assets.v1',
          'extractor-assets',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalAssets, hash_sha256: assetsHash }
        );
      }

      // Add provenance for responses dataset
      if (responsesParts.length > 0) {
        const responsesHash = await this.hashParts(responsesParts);
        const responsesRecords = this.responsesPartCounts.reduce((acc, count) => acc + count, 0);
        this.provenanceTracker.addExtraction(
          'responses.v1',
          'extractor-responses',
          version,
          { mode: this.config.render.mode },
          { record_count: responsesRecords, hash_sha256: responsesHash }
        );
      }
      
      // Add provenance for errors dataset
      if (errorsParts.length > 0) {
        const errorsHash = await this.hashParts(errorsParts);
        this.provenanceTracker.addExtraction(
          'errors.v1',
          'extractor-errors',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalErrors, hash_sha256: errorsHash }
        );
      }
      
      // Add provenance for events dataset (Phase 7: Event log)
      if (eventsParts.length > 0) {
        const eventsHash = await this.hashParts(eventsParts);
        this.provenanceTracker.addExtraction(
          'events.v1',
          'event-logger',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalEvents || 0, hash_sha256: eventsHash }
        );
      }
      
      // Add provenance for accessibility dataset
      if (accessibilityParts.length > 0) {
        const accessibilityHash = await this.hashParts(accessibilityParts);
        this.provenanceTracker.addExtraction(
          'accessibility.v1',
          'extractor-accessibility',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalAccessibilityRecords || 0, hash_sha256: accessibilityHash }
        );
      }
      
      // Add provenance for DOM snapshots dataset
      if (domSnapshotsParts.length > 0) {
        const domSnapshotsHash = await this.hashParts(domSnapshotsParts);
        this.provenanceTracker.addExtraction(
          'dom_snapshots.v1',
          'extractor-dom-snapshot',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalDOMSnapshots || 0, hash_sha256: domSnapshotsHash }
        );
      }
      
      // Add provenance for console dataset (full mode only)
      if (consoleParts.length > 0) {
        const consoleHash = await this.hashParts(consoleParts);
        this.provenanceTracker.addExtraction(
          'console.v1',
          'extractor-console',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalConsoleRecords || 0, hash_sha256: consoleHash }
        );
      }
      
      // Add provenance for styles dataset (full mode only)
      if (stylesParts.length > 0) {
        const stylesHash = await this.hashParts(stylesParts);
        this.provenanceTracker.addExtraction(
          'styles.v1',
          'extractor-styles',
          version,
          { mode: this.config.render.mode },
          { record_count: this.stats.stats.totalStyleRecords || 0, hash_sha256: stylesHash }
        );
      }
      
      log("info", `[Provenance] Recorded provenance for ${this.provenanceTracker.getRecordCount()} datasets`);
      
      // Write capabilities and provenance
      await this.writeCapabilities();
      await this.writeProvenance();

      // Copy schemas into staging (use @atlas/spec v1 schemas where available)
      log("info", "[DIAGNOSTIC] AtlasWriter: Copying schemas to staging (spec v1)…");
      await mkdir(join(this.stagingDir, "schemas"), { recursive: true });

      // Map datasets to spec v1 schema filenames
      const specSchemaMap: Record<string, string> = {
        responses: "responses.v1.schema.json"
      };

      // Resolve and copy each spec schema
      // Resolve @atlas/spec package root to bypass package exports restrictions
      let atlasSpecSchemasDir: string | null = null;
      try {
        const atlasSpecPkgDir = dirname(require.resolve("@atlas/spec/package.json"));
        atlasSpecSchemasDir = join(atlasSpecPkgDir, "dist", "schemas");
      } catch {
        atlasSpecSchemasDir = null;
      }
      // Fallback for monorepo dev: derive relative path to atlas-spec/dist/schemas
      if (!atlasSpecSchemasDir) {
        const candidate = join(__dirname, "../../../../atlas-spec/dist/schemas");
        try {
          const s = await fsStat(candidate);
          if (s.isDirectory()) atlasSpecSchemasDir = candidate;
        } catch {}
      }
      if (!atlasSpecSchemasDir) {
        throw new Error("Unable to locate @atlas/spec dist/schemas directory");
      }
      for (const file of Object.values(specSchemaMap)) {
        const abs = join(atlasSpecSchemasDir, file);
        await copyFile(abs, join(this.stagingDir, "schemas", file));
      }

      const engineSchemas = [
        "pages.schema.json",
        "edges.schema.json",
        "assets.schema.json",
        "errors.schema.json",
        "events.schema.json",
        "accessibility.schema.json",
        "dom_snapshots.schema.json",
        ...(this.config.render.mode === "full" ? ["console.schema.json", "styles.schema.json"] : [])
      ];
      for (const file of engineSchemas) {
        const src = join(__dirname, "schemas", file);
        await copyFile(src, join(this.stagingDir, "schemas", file));
      }

      // Build notes for manifest
      const notes: string[] = [];
      if (this.config.robots.overrideUsed) {
        notes.push("WARNING: Robots.txt override was used. Only use on sites you administer.");
      }

      // Build manifest with integrity hashes
      log("info", "[DIAGNOSTIC] AtlasWriter: Building manifest with integrity hashes...");
      
      // IMPORTANT: Write summary.json FIRST so buildManifest can read record counts
      await writeFile(join(this.stagingDir, "summary.json"), JSON.stringify(this.stats, null, 2));
      
      // Write manifest with incomplete=true first
      const manifestPath = join(this.stagingDir, "manifest.json");
      const manifest = await buildManifest({
        parts: {
          pages: pagesParts,
          edges: edgesParts,
          assets: assetsParts,
          responses: responsesParts,
          errors: errorsParts,
          events: eventsParts.length > 0 ? eventsParts : undefined,
          accessibility: accessibilityParts.length > 0 ? accessibilityParts : undefined,
          domSnapshots: domSnapshotsParts.length > 0 ? domSnapshotsParts : undefined,
          console: consoleParts.length > 0 ? consoleParts : undefined,
          styles: stylesParts.length > 0 ? stylesParts : undefined
        },
        partMeta: {
          pages: pagesParts.map((_, i) => ({
            records: this.pagesPartCounts[i] ?? 0,
            bytesUncompressed: this.pagesPartUncompressed[i] ?? 0
          })),
          edges: edgesParts.map((_, i) => ({
            records: this.edgesPartCounts[i] ?? 0,
            bytesUncompressed: this.edgesPartUncompressed[i] ?? 0
          })),
          assets: assetsParts.map((_, i) => ({
            records: this.assetsPartCounts[i] ?? 0,
            bytesUncompressed: this.assetsPartUncompressed[i] ?? 0
          })),
          responses: responsesParts.map((_, i) => ({
            records: this.responsesPartCounts[i] ?? 0,
            bytesUncompressed: this.responsesPartUncompressed[i] ?? 0
          })),
          errors: errorsParts.map((_, i) => ({
            records: this.errorsPartCounts[i] ?? 0,
            bytesUncompressed: this.errorsPartUncompressed[i] ?? 0
          })),
          events: eventsParts.map((_, i) => ({
            records: this.eventsPartCounts[i] ?? 0,
            bytesUncompressed: this.eventsPartUncompressed[i] ?? 0
          })),
          accessibility: accessibilityParts.map((_, i) => ({
            records: this.accessibilityPartCounts[i] ?? 0,
            bytesUncompressed: this.accessibilityPartUncompressed[i] ?? 0
          })),
          domSnapshots: domSnapshotsParts.map((_, i) => ({
            records: this.domSnapshotsPartCounts[i] ?? 0,
            bytesUncompressed: this.domSnapshotsPartUncompressed[i] ?? 0
          })),
          console: consoleParts.map((_, i) => ({
            records: this.consolePartCounts[i] ?? 0,
            bytesUncompressed: this.consolePartUncompressed[i] ?? 0
          })),
          styles: stylesParts.map((_, i) => ({
            records: this.stylesPartCounts[i] ?? 0,
            bytesUncompressed: this.stylesPartUncompressed[i] ?? 0
          }))
        },
        notes,
        stagingDir: this.stagingDir,
        renderMode: this.config.render.mode,
        robotsRespect: this.config.robots.respect,
        robotsOverride: this.config.robots.overrideUsed,
        robotsOverrideReason: this.config.robots.overrideUsed ? "Manual override via --overrideRobots flag" : undefined,
        replayTier: this.config.replay?.tier,
        privacyConfig: this.config.privacy,
        seeds: this.config.seeds,
        provenance: this.provenance,
        producer: this.producerMetadata,
        environment: this.environmentSnapshot,
        crawlStartedAt: this.crawlStartedAt,
        crawlCompletedAt: this.crawlCompletedAt
      });
      manifest.incomplete = true;
      await writeFile(manifestPath + ".tmp", JSON.stringify(manifest, null, 2));
      // Atomically rename manifest to manifest.json (incomplete=true)
      await rm(manifestPath, { force: true }).catch(() => {});
      await copyFile(manifestPath + ".tmp", manifestPath);
      await rm(manifestPath + ".tmp", { force: true }).catch(() => {});

      // After successful finalization, set incomplete=false and atomically update
      manifest.incomplete = false;
      await writeFile(manifestPath + ".tmp", JSON.stringify(manifest, null, 2));
      await rm(manifestPath, { force: true }).catch(() => {});
      await copyFile(manifestPath + ".tmp", manifestPath);
      await rm(manifestPath + ".tmp", { force: true }).catch(() => {});

      // Create .atls ZIP archive
      log("info", "[DIAGNOSTIC] AtlasWriter: Creating .atls ZIP archive...");
      // ADD LOG immediately before the call
      log('debug', '[DIAGNOSTIC] AtlasWriter: Calling createZipArchive()...');
      try {
        await this.createZipArchive();
      } catch (zipError: any) {
        log('error', `[DIAGNOSTIC] AtlasWriter: Error during createZipArchive: ${zipError?.message || zipError}`);
        throw zipError;
      }

      // Validate archive if enabled (default true)
      const shouldValidate = this.config.cli?.validateArchive !== false;
      if (shouldValidate) {
        log("info", "[AtlasWriter] Running post-creation validation (QA check)...");
        try {
          const validationResult = await validateAtlas(this.outPath);
          
          // Only fail on truly corrupt archives (file not found, can't read, etc.)
          // Schema errors are warnings - the archive may still be usable
          if (validationResult.status === "corrupt" && validationResult.message?.includes("not found")) {
            log("error", `[AtlasWriter] Validation FAILED: ${validationResult.message}`);
            throw new Error(`Archive validation failed: ${validationResult.message}`);
          }
          
          // Log validation results
          const totalErrors = validationResult.pages.errors + 
                             validationResult.edges.errors + 
                             validationResult.assets.errors + 
                             validationResult.errors.errors +
                             (validationResult.accessibility?.errors || 0);
          
          const totalRecords = validationResult.pages.count + 
                              validationResult.edges.count + 
                              validationResult.assets.count + 
                              validationResult.errors.count +
                              (validationResult.accessibility?.count || 0);
          
          if (totalErrors > 0) {
            log("warn", `[AtlasWriter] Validation completed with ${totalErrors} schema warnings (may indicate data quality issues)`);
            log("warn", `  Pages: ${validationResult.pages.count} records, ${validationResult.pages.errors} errors`);
            log("warn", `  Edges: ${validationResult.edges.count} records, ${validationResult.edges.errors} errors`);
            log("warn", `  Assets: ${validationResult.assets.count} records, ${validationResult.assets.errors} errors`);
            log("warn", `  Errors: ${validationResult.errors.count} records, ${validationResult.errors.errors} errors`);
            if (validationResult.accessibility) {
              log("warn", `  Accessibility: ${validationResult.accessibility.count} records, ${validationResult.accessibility.errors} errors`);
            }
            
            // Log sample errors for debugging (limit to first 3)
            if (validationResult.pages.sampleErrors && validationResult.pages.sampleErrors.length > 0) {
              log("warn", "  Sample page errors:");
              validationResult.pages.sampleErrors.slice(0, 3).forEach(err => log("warn", `    ${err}`));
            }
            if (validationResult.edges.sampleErrors && validationResult.edges.sampleErrors.length > 0) {
              log("warn", "  Sample edge errors:");
              validationResult.edges.sampleErrors.slice(0, 3).forEach(err => log("warn", `    ${err}`));
            }
            
            log("warn", "[AtlasWriter] Archive created despite schema warnings - use 'cartographer validate' for full report");
          } else {
            log("info", `[AtlasWriter] Validation PASSED ✓ All ${totalRecords} records are valid`);
          }
        } catch (validationError: any) {
          // Log validation errors but don't fail the build
          log("warn", `[AtlasWriter] Validation check failed: ${validationError?.message || validationError}`);
          log("warn", "[AtlasWriter] Archive created but validation could not complete - manual inspection recommended");
        }
      }

      log("info", `[DIAGNOSTIC] AtlasWriter: Finalize() completed. Atlas archive should be complete: ${this.outPath}`);
    } catch (finalizeError: any) {
      log('error', `[DIAGNOSTIC] AtlasWriter: Uncaught error in finalize: ${finalizeError?.message || finalizeError}`);
      throw finalizeError;
    }
  }
  
  private async compressParts(type: string): Promise<string[]> {
    const dir = join(this.stagingDir, type);
    const files = await readdir(dir);
    const compressed: string[] = [];
    
    for (const file of files) {
      if (file.endsWith(".jsonl")) {
        const inPath = join(dir, file);
        const outPath = inPath + ".zst";
        await compressFile(inPath, outPath);
        compressed.push(outPath); // Return absolute path for hashing
        
        // Delete original uncompressed file
        await unlink(inPath);
      }
    }
    
    return compressed;
  }
  
  /**
   * Create final .atls ZIP archive from staging directory
   */
  private async createZipArchive(): Promise<void> {
    log('debug', '[DIAGNOSTIC] AtlasWriter: ENTERING createZipArchive method.');
    log('debug', `[DIAGNOSTIC] AtlasWriter: Attempting to create ZIP archive at: ${this.outPath}`);

    const output = createWriteStream(this.outPath);
    const archive = archiver("zip", {
      zlib: { level: 0 } // No additional compression
    });

    // Create a promise specifically for the output stream closing
    // We need this to ensure the file handle is closed before the function returns
    const streamClosePromise = new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        log('info', `[DIAGNOSTIC] AtlasWriter: ZIP output stream closed. Size: ${archive.pointer()} bytes`);
        resolve();
      });
      output.on('error', (err) => {
  log('error', `[DIAGNOSTIC] AtlasWriter: Write stream FAILED: ${err.message}`);
        reject(err); // Reject if the stream fails
      });
    });

    // Log warnings and errors from the archiver itself
    archive.on('warning', (err) => {
  log('warn', `[DIAGNOSTIC] AtlasWriter: ZIP archive warning: ${err.code}`);
    });
    archive.on('error', (err) => {
      // This error should also cause finalize() to reject
  log('error', `[DIAGNOSTIC] AtlasWriter: ZIP archive error: ${err.message}`);
    });

    // Pipe the archive data to the file
    archive.pipe(output);

    // Add directory contents
    log('debug', `[DIAGNOSTIC] AtlasWriter: Adding directory ${this.stagingDir} to ZIP.`);
    archive.directory(this.stagingDir, false);
    log('debug', `[DIAGNOSTIC] AtlasWriter: Directory added.`);

    // Finalize the archive AND await the promise returned by archiver.finalize()
    log('debug', `[DIAGNOSTIC] AtlasWriter: Calling and awaiting archive.finalize()...`);
    try {
      await archive.finalize(); // <-- Direct await
      log('info', `[DIAGNOSTIC] AtlasWriter: archive.finalize() completed successfully.`);
    } catch (err: any) {
  log('error', `[DIAGNOSTIC] AtlasWriter: archive.finalize() FAILED: ${err.message}`);
      throw err; // Re-throw the error so the await in finalize() catches it
    }

    // Also wait for the output stream to confirm it's closed
    log('debug', '[DIAGNOSTIC] AtlasWriter: Waiting for output stream to close...');
    await streamClosePromise;

    log('debug', '[DIAGNOSTIC] AtlasWriter: EXITING createZipArchive method.');
  }
  
  async cleanup(): Promise<void> {
    try {
      await rm(this.stagingDir, { recursive: true, force: true });
    } catch (error) {
      log("warn", `Failed to cleanup staging dir: ${error}`);
    }
  }
}
