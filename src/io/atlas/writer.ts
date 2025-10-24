/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { mkdir, writeFile, rm, readdir, unlink, copyFile } from "fs/promises";
import { finished } from "stream/promises";
import { createWriteStream } from "fs";
import type { WriteStream } from "fs";
import { fsync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import archiver from "archiver";
import type { EngineConfig, PageRecord, EdgeRecord, AssetRecord, ErrorRecord, AtlasManifest, AtlasSummary, ConsoleRecord, ComputedTextNodeRecord, RenderMode } from "../../core/types.js";
import type { AccessibilityRecord } from "../../core/extractors/accessibility.js";
import { sha256 } from "../../utils/hashing.js";
import { compressFile } from "./compressor.js";
import { buildManifest } from "./manifest.js";
import { log } from "../../utils/logging.js";

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
  private provenance: {
    resumeOf?: string;
    checkpointInterval?: number;
    gracefulShutdown?: boolean;
  } = {};
  
  // Part writers
  private pagesPart = 1;
  private edgesPart = 1;
  private assetsPart = 1;
  private errorsPart = 1;
  private accessibilityPart = 1;
  private consolePart = 1;
  private stylesPart = 1;
  
  // Streams
  private pagesStream: ReturnType<typeof createWriteStream> | null = null;
  private edgesStream: ReturnType<typeof createWriteStream> | null = null;
  private assetsStream: ReturnType<typeof createWriteStream> | null = null;
  private errorsStream: ReturnType<typeof createWriteStream> | null = null;
  private accessibilityStream: ReturnType<typeof createWriteStream> | null = null;
  private consoleStream: ReturnType<typeof createWriteStream> | null = null;
  private stylesStream: ReturnType<typeof createWriteStream> | null = null;
  
  // Byte counters (for rolling parts at 150MB)
  private pagesBytes = 0;
  private edgesBytes = 0;
  private assetsBytes = 0;
  private errorsBytes = 0;
  private accessibilityBytes = 0;
  private consoleBytes = 0;
  private stylesBytes = 0;
  
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
    await mkdir(this.stagingDir, { recursive: true });
    await mkdir(join(this.stagingDir, "pages"), { recursive: true });
    await mkdir(join(this.stagingDir, "edges"), { recursive: true });
    await mkdir(join(this.stagingDir, "assets"), { recursive: true });
    await mkdir(join(this.stagingDir, "errors"), { recursive: true });
    await mkdir(join(this.stagingDir, "accessibility"), { recursive: true });
    
    // Full mode datasets
    if (this.config.render.mode === "full") {
      await mkdir(join(this.stagingDir, "console"), { recursive: true });
      await mkdir(join(this.stagingDir, "styles"), { recursive: true });
      await mkdir(join(this.stagingDir, "media"), { recursive: true });
      await mkdir(join(this.stagingDir, "media", "screenshots"), { recursive: true });
      await mkdir(join(this.stagingDir, "media", "viewports"), { recursive: true });
    }
    
    // Initialize first part streams
    await this.rotatePagesPart();
    await this.rotateEdgesPart();
    await this.rotateAssetsPart();
    await this.rotateErrorsPart();
    await this.rotateAccessibilityPart();
    
    if (this.config.render.mode === "full") {
      await this.rotateConsolePart();
      await this.rotateStylesPart();
    }
  }
  
  async writePage(page: PageRecord): Promise<void> {
    const line = JSON.stringify(page) + "\n";
    const bytes = Buffer.byteLength(line);
    
    // Roll part if exceeds 150MB
    if (this.pagesBytes + bytes > 150_000_000) {
      await this.rotatePagesPart();
    }
    
    this.pagesStream!.write(line);
    this.pagesBytes += bytes;
    this.stats.stats.totalPages++;
    this.stats.stats.statusCodes[page.statusCode] = (this.stats.stats.statusCodes[page.statusCode] || 0) + 1;
    this.stats.stats.renderModes[page.renderMode]++;
    this.stats.performance.maxDepthReached = Math.max(this.stats.performance.maxDepthReached, page.depth);
    
    this.recordsSinceFlush++;
    if (this.recordsSinceFlush >= this.FLUSH_INTERVAL) {
      await this.flushAndSync();
    }
  }
  
  async writeEdge(edge: EdgeRecord): Promise<void> {
    const line = JSON.stringify(edge) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.edgesBytes + bytes > 150_000_000) {
      await this.rotateEdgesPart();
    }
    
    this.edgesStream!.write(line);
    this.edgesBytes += bytes;
    this.stats.stats.totalEdges++;
  }
  
  async writeAsset(asset: AssetRecord): Promise<void> {
    const line = JSON.stringify(asset) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.assetsBytes + bytes > 150_000_000) {
      await this.rotateAssetsPart();
    }
    
    this.assetsStream!.write(line);
    this.assetsBytes += bytes;
    this.stats.stats.totalAssets++;
  }
  
  async writeError(error: ErrorRecord): Promise<void> {
    const line = JSON.stringify(error) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.errorsBytes + bytes > 150_000_000) {
      await this.rotateErrorsPart();
    }
    
    this.errorsStream!.write(line);
    this.errorsBytes += bytes;
    this.stats.stats.totalErrors++;
  }
  
  async writeAccessibility(record: AccessibilityRecord): Promise<void> {
    const line = JSON.stringify(record) + "\n";
    const bytes = Buffer.byteLength(line);
    
    if (this.accessibilityBytes + bytes > 150_000_000) {
      await this.rotateAccessibilityPart();
    }
    
    this.accessibilityStream!.write(line);
    this.accessibilityBytes += bytes;
    this.stats.stats.totalAccessibilityRecords = (this.stats.stats.totalAccessibilityRecords || 0) + 1;
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
    this.stats.stats.totalStyleRecords = (this.stats.stats.totalStyleRecords || 0) + 1;
  }
  
  async writeScreenshot(urlKey: string, buffer: Buffer): Promise<void> {
    // Only write in full mode
    if (this.config.render.mode !== "full") {
      return;
    }
    
    const path = join(this.stagingDir, "media", "screenshots", `${urlKey}.png`);
    await writeFile(path, buffer);
  }
  
  async writeViewport(urlKey: string, buffer: Buffer): Promise<void> {
    // Only write in full mode
    if (this.config.render.mode !== "full") {
      return;
    }
    
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
    errors: [string, number];
    accessibility: [string, number];
  } {
    return {
      pages: [`part-${String(this.pagesPart - 1).padStart(3, "0")}.jsonl`, this.pagesBytes],
      edges: [`part-${String(this.edgesPart - 1).padStart(3, "0")}.jsonl`, this.edgesBytes],
      assets: [`part-${String(this.assetsPart - 1).padStart(3, "0")}.jsonl`, this.assetsBytes],
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
  }
  
  private async rotateEdgesPart(): Promise<void> {
    if (this.edgesStream) {
      this.edgesStream.end();
    }
    const filename = `part-${String(this.edgesPart).padStart(3, "0")}.jsonl`;
    this.edgesStream = createWriteStream(join(this.stagingDir, "edges", filename));
    this.edgesPart++;
    this.edgesBytes = 0;
  }
  
  private async rotateAssetsPart(): Promise<void> {
    if (this.assetsStream) {
      this.assetsStream.end();
    }
    const filename = `part-${String(this.assetsPart).padStart(3, "0")}.jsonl`;
    this.assetsStream = createWriteStream(join(this.stagingDir, "assets", filename));
    this.assetsPart++;
    this.assetsBytes = 0;
  }
  
  private async rotateErrorsPart(): Promise<void> {
    if (this.errorsStream) {
      this.errorsStream.end();
    }
    const filename = `part-${String(this.errorsPart).padStart(3, "0")}.jsonl`;
    this.errorsStream = createWriteStream(join(this.stagingDir, "errors", filename));
    this.errorsPart++;
    this.errorsBytes = 0;
  }
  
  private async rotateAccessibilityPart(): Promise<void> {
    if (this.accessibilityStream) {
      this.accessibilityStream.end();
    }
    const filename = `part-${String(this.accessibilityPart).padStart(3, "0")}.jsonl`;
    this.accessibilityStream = createWriteStream(join(this.stagingDir, "accessibility", filename));
    this.accessibilityPart++;
    this.accessibilityBytes = 0;
  }
  
  private async rotateConsolePart(): Promise<void> {
    if (this.consoleStream) {
      this.consoleStream.end();
    }
    const filename = `part-${String(this.consolePart).padStart(3, "0")}.jsonl`;
    this.consoleStream = createWriteStream(join(this.stagingDir, "console", filename));
    this.consolePart++;
    this.consoleBytes = 0;
  }
  
  private async rotateStylesPart(): Promise<void> {
    if (this.stylesStream) {
      this.stylesStream.end();
    }
    const filename = `part-${String(this.stylesPart).padStart(3, "0")}.jsonl`;
    this.stylesStream = createWriteStream(join(this.stagingDir, "styles", filename));
    this.stylesPart++;
    this.stylesBytes = 0;
  }
  
  async finalize(): Promise<void> {
    log('info', '[DIAGNOSTIC] AtlasWriter: Starting finalize()...');
    try {
      // Close all streams robustly
      const streamsToClose = [
        this.pagesStream,
        this.edgesStream,
        this.assetsStream,
        this.errorsStream,
        this.accessibilityStream,
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
      const errorsParts = await this.compressParts("errors");
      const accessibilityParts = await this.compressParts("accessibility");
      
      // Compress full mode datasets
      let consoleParts: string[] = [];
      let stylesParts: string[] = [];
      if (this.config.render.mode === "full") {
        consoleParts = await this.compressParts("console");
        stylesParts = await this.compressParts("styles");
      }

      // Copy schemas into staging
      log("info", "[DIAGNOSTIC] AtlasWriter: Copying schemas to staging...");
      await mkdir(join(this.stagingDir, "schemas"), { recursive: true });
      const schemaFiles = [
        "pages.schema.json",
        "edges.schema.json",
        "assets.schema.json",
        "errors.schema.json",
        "accessibility.schema.json",
        "perf.schema.json",
        ...(this.config.render.mode === "full" ? ["console.schema.json", "styles.schema.json"] : [])
      ];
      for (const file of schemaFiles) {
        await copyFile(
          join(process.cwd(), "src/io/atlas/schemas", file),
          join(this.stagingDir, "schemas", file)
        );
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
          errors: errorsParts,
          accessibility: accessibilityParts.length > 0 ? accessibilityParts : undefined,
          console: consoleParts.length > 0 ? consoleParts : undefined,
          styles: stylesParts.length > 0 ? stylesParts : undefined
        },
        notes,
        stagingDir: this.stagingDir,
        renderMode: this.config.render.mode,
        robotsRespect: this.config.robots.respect,
        robotsOverride: this.config.robots.overrideUsed,
        provenance: this.provenance
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
