/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { mkdir, writeFile, rm, readdir, unlink, copyFile } from "fs/promises";
import { createWriteStream } from "fs";
import { fsync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import archiver from "archiver";
import { compressFile } from "./compressor.js";
import { buildManifest } from "./manifest.js";
import { log } from "../../utils/logging.js";
/**
 * Streaming Atlas writer
 * Writes JSONL parts to staging directory, then compresses and packages into .atls ZIP
 */
export class AtlasWriter {
    outPath;
    config;
    stagingDir;
    uuid;
    recordsSinceFlush = 0;
    FLUSH_INTERVAL = 1000;
    provenance = {};
    // Part writers
    pagesPart = 1;
    edgesPart = 1;
    assetsPart = 1;
    errorsPart = 1;
    accessibilityPart = 1;
    // Streams
    pagesStream = null;
    edgesStream = null;
    assetsStream = null;
    errorsStream = null;
    accessibilityStream = null;
    // Byte counters (for rolling parts at 150MB)
    pagesBytes = 0;
    edgesBytes = 0;
    assetsBytes = 0;
    errorsBytes = 0;
    accessibilityBytes = 0;
    // Stats
    stats = {
        totalPages: 0,
        totalEdges: 0,
        totalAssets: 0,
        totalErrors: 0,
        totalAccessibilityRecords: 0,
        statusCodes: {},
        renderModes: { raw: 0, prerender: 0, full: 0 },
        maxDepth: 0,
        crawlStartedAt: new Date().toISOString(),
        crawlCompletedAt: "",
        crawlDurationMs: 0
    };
    constructor(outPath, config, crawlId) {
        this.outPath = outPath;
        this.config = config;
        this.uuid = crawlId || randomBytes(8).toString("hex");
        this.stagingDir = join(outPath + ".staging", this.uuid);
    }
    async init() {
        log("debug", `Initializing staging dir: ${this.stagingDir}`);
        await mkdir(this.stagingDir, { recursive: true });
        await mkdir(join(this.stagingDir, "pages"), { recursive: true });
        await mkdir(join(this.stagingDir, "edges"), { recursive: true });
        await mkdir(join(this.stagingDir, "assets"), { recursive: true });
        await mkdir(join(this.stagingDir, "errors"), { recursive: true });
        await mkdir(join(this.stagingDir, "accessibility"), { recursive: true });
        // Initialize first part streams
        await this.rotatePagesPart();
        await this.rotateEdgesPart();
        await this.rotateAssetsPart();
        await this.rotateErrorsPart();
        await this.rotateAccessibilityPart();
    }
    async writePage(page) {
        const line = JSON.stringify(page) + "\n";
        const bytes = Buffer.byteLength(line);
        // Roll part if exceeds 150MB
        if (this.pagesBytes + bytes > 150_000_000) {
            await this.rotatePagesPart();
        }
        this.pagesStream.write(line);
        this.pagesBytes += bytes;
        this.stats.totalPages++;
        this.stats.statusCodes[page.statusCode] = (this.stats.statusCodes[page.statusCode] || 0) + 1;
        this.stats.renderModes[page.renderMode]++;
        this.stats.maxDepth = Math.max(this.stats.maxDepth, page.depth);
        this.recordsSinceFlush++;
        if (this.recordsSinceFlush >= this.FLUSH_INTERVAL) {
            await this.flushAndSync();
        }
    }
    async writeEdge(edge) {
        const line = JSON.stringify(edge) + "\n";
        const bytes = Buffer.byteLength(line);
        if (this.edgesBytes + bytes > 150_000_000) {
            await this.rotateEdgesPart();
        }
        this.edgesStream.write(line);
        this.edgesBytes += bytes;
        this.stats.totalEdges++;
    }
    async writeAsset(asset) {
        const line = JSON.stringify(asset) + "\n";
        const bytes = Buffer.byteLength(line);
        if (this.assetsBytes + bytes > 150_000_000) {
            await this.rotateAssetsPart();
        }
        this.assetsStream.write(line);
        this.assetsBytes += bytes;
        this.stats.totalAssets++;
    }
    async writeError(error) {
        const line = JSON.stringify(error) + "\n";
        const bytes = Buffer.byteLength(line);
        if (this.errorsBytes + bytes > 150_000_000) {
            await this.rotateErrorsPart();
        }
        this.errorsStream.write(line);
        this.errorsBytes += bytes;
        this.stats.totalErrors++;
    }
    async writeAccessibility(record) {
        const line = JSON.stringify(record) + "\n";
        const bytes = Buffer.byteLength(line);
        if (this.accessibilityBytes + bytes > 150_000_000) {
            await this.rotateAccessibilityPart();
        }
        this.accessibilityStream.write(line);
        this.accessibilityBytes += bytes;
        this.stats.totalAccessibilityRecords = (this.stats.totalAccessibilityRecords || 0) + 1;
    }
    /**
     * Get total bytes written (uncompressed JSONL)
     */
    getBytesWritten() {
        return this.pagesBytes + this.edgesBytes + this.assetsBytes + this.errorsBytes + this.accessibilityBytes;
    }
    /**
     * Get crawl ID (UUID)
     */
    getCrawlId() {
        return this.uuid;
    }
    /**
     * Get staging directory path
     */
    getStagingDir() {
        return this.stagingDir;
    }
    /**
     * Get current summary statistics
     */
    getSummary() {
        return { ...this.stats };
    }
    /**
     * Get manifest.json path for this crawl
     */
    getManifestPath() {
        return join(this.stagingDir, "manifest.json");
    }
    /**
     * Set provenance information for manifest
     */
    setProvenance(provenance) {
        this.provenance = provenance;
    }
    /**
     * Get current part pointers for checkpoint
     */
    getPartPointers() {
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
    async flushAndSync() {
        const streams = [
            this.pagesStream,
            this.edgesStream,
            this.assetsStream,
            this.errorsStream
        ].filter(s => s !== null);
        for (const stream of streams) {
            if (stream && !stream.closed) {
                await new Promise((resolve, reject) => {
                    stream.write("", (err) => {
                        if (err)
                            reject(err);
                        else {
                            // @ts-ignore - fd exists on WriteStream
                            const fd = stream.fd;
                            if (fd !== undefined && typeof fd === "number") {
                                fsync(fd, (fsyncErr) => {
                                    if (fsyncErr)
                                        reject(fsyncErr);
                                    else
                                        resolve();
                                });
                            }
                            else {
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
    async rotatePagesPart() {
        if (this.pagesStream) {
            this.pagesStream.end();
        }
        const filename = `part-${String(this.pagesPart).padStart(3, "0")}.jsonl`;
        this.pagesStream = createWriteStream(join(this.stagingDir, "pages", filename));
        this.pagesPart++;
        this.pagesBytes = 0;
    }
    async rotateEdgesPart() {
        if (this.edgesStream) {
            this.edgesStream.end();
        }
        const filename = `part-${String(this.edgesPart).padStart(3, "0")}.jsonl`;
        this.edgesStream = createWriteStream(join(this.stagingDir, "edges", filename));
        this.edgesPart++;
        this.edgesBytes = 0;
    }
    async rotateAssetsPart() {
        if (this.assetsStream) {
            this.assetsStream.end();
        }
        const filename = `part-${String(this.assetsPart).padStart(3, "0")}.jsonl`;
        this.assetsStream = createWriteStream(join(this.stagingDir, "assets", filename));
        this.assetsPart++;
        this.assetsBytes = 0;
    }
    async rotateErrorsPart() {
        if (this.errorsStream) {
            this.errorsStream.end();
        }
        const filename = `part-${String(this.errorsPart).padStart(3, "0")}.jsonl`;
        this.errorsStream = createWriteStream(join(this.stagingDir, "errors", filename));
        this.errorsPart++;
        this.errorsBytes = 0;
    }
    async rotateAccessibilityPart() {
        if (this.accessibilityStream) {
            this.accessibilityStream.end();
        }
        const filename = `part-${String(this.accessibilityPart).padStart(3, "0")}.jsonl`;
        this.accessibilityStream = createWriteStream(join(this.stagingDir, "accessibility", filename));
        this.accessibilityPart++;
        this.accessibilityBytes = 0;
    }
    async finalize() {
        // Close all streams
        this.pagesStream?.end();
        this.edgesStream?.end();
        this.assetsStream?.end();
        this.errorsStream?.end();
        this.accessibilityStream?.end();
        // Wait for streams to finish
        await new Promise(resolve => setTimeout(resolve, 100));
        // Update stats
        this.stats.crawlCompletedAt = new Date().toISOString();
        this.stats.crawlDurationMs = new Date(this.stats.crawlCompletedAt).getTime() - new Date(this.stats.crawlStartedAt).getTime();
        log("info", "Compressing JSONL parts with Zstandard...");
        // Compress all parts and get absolute paths
        const pagesParts = await this.compressParts("pages");
        const edgesParts = await this.compressParts("edges");
        const assetsParts = await this.compressParts("assets");
        const errorsParts = await this.compressParts("errors");
        const accessibilityParts = await this.compressParts("accessibility");
        // Copy schemas into staging
        log("info", "Copying schemas to staging...");
        await mkdir(join(this.stagingDir, "schemas"), { recursive: true });
        const schemaFiles = ["pages.schema.json", "edges.schema.json", "assets.schema.json", "errors.schema.json", "accessibility.schema.json", "perf.schema.json"];
        for (const file of schemaFiles) {
            await copyFile(join(process.cwd(), "src/io/atlas/schemas", file), join(this.stagingDir, "schemas", file));
        }
        // Build notes for manifest
        const notes = [];
        if (this.config.robots.overrideUsed) {
            notes.push("WARNING: Robots.txt override was used. Only use on sites you administer.");
        }
        // Build manifest with integrity hashes
        log("info", "Building manifest with integrity hashes...");
        // Write manifest with incomplete=true first
        const manifestPath = join(this.stagingDir, "manifest.json");
        const manifest = await buildManifest({
            parts: {
                pages: pagesParts,
                edges: edgesParts,
                assets: assetsParts,
                errors: errorsParts,
                accessibility: accessibilityParts.length > 0 ? accessibilityParts : undefined
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
        await writeFile(join(this.stagingDir, "summary.json"), JSON.stringify(this.stats, null, 2));
        // Atomically rename manifest to manifest.json (incomplete=true)
        await rm(manifestPath, { force: true }).catch(() => { });
        await copyFile(manifestPath + ".tmp", manifestPath);
        await rm(manifestPath + ".tmp", { force: true }).catch(() => { });
        // After successful finalization, set incomplete=false and atomically update
        manifest.incomplete = false;
        await writeFile(manifestPath + ".tmp", JSON.stringify(manifest, null, 2));
        await rm(manifestPath, { force: true }).catch(() => { });
        await copyFile(manifestPath + ".tmp", manifestPath);
        await rm(manifestPath + ".tmp", { force: true }).catch(() => { });
        // Create .atls ZIP archive
        log("info", "Creating .atls ZIP archive...");
        await this.createZipArchive();
        log("info", `Atlas archive complete: ${this.outPath}`);
    }
    async compressParts(type) {
        const dir = join(this.stagingDir, type);
        const files = await readdir(dir);
        const compressed = [];
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
    async createZipArchive() {
        return new Promise((resolve, reject) => {
            const output = createWriteStream(this.outPath);
            const archive = archiver("zip", {
                zlib: { level: 0 } // No additional compression (parts already compressed)
            });
            output.on("close", () => {
                log("debug", `ZIP archive created: ${archive.pointer()} bytes`);
                resolve();
            });
            archive.on("error", (err) => {
                reject(err);
            });
            archive.pipe(output);
            // Add all files from staging directory
            archive.directory(this.stagingDir, false);
            archive.finalize();
        });
    }
    async cleanup() {
        try {
            await rm(this.stagingDir, { recursive: true, force: true });
        }
        catch (error) {
            log("warn", `Failed to cleanup staging dir: ${error}`);
        }
    }
}
//# sourceMappingURL=writer.js.map