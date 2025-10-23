/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { normalizeUrl, sectionOf, applyParamPolicy } from "../utils/url.js";
import { sha1Hex } from "../utils/hashing.js";
import { log, logEvent } from "../utils/logging.js";
import { EventEmitter, withCrawlId } from "./events.js";
import { Metrics } from "../utils/metrics.js";
import { writeCheckpoint, writeVisitedIndex, writeFrontier, readCheckpoint, readVisitedIndex, readFrontier } from "./checkpoint.js";
import pLimit from "p-limit";
import { fetchUrl } from "./fetcher.js";
import { renderPage } from "./renderer.js";
import { extractPageFacts } from "./extractors/pageFacts.js";
import { extractLinks } from "./extractors/links.js";
import { extractAssets } from "./extractors/assets.js";
import { extractTextSample } from "./extractors/textSample.js";
import { extractAccessibility } from "./extractors/accessibility.js";
import { validateEdgeRecord, validateAssetRecord } from "../io/validator.js";
import { robotsCache } from "./robotsCache.js";
import * as perHostTokens from './perHostTokens.js';
/**
 * BFS Scheduler with URL normalization, parameter sampling, and queue hygiene
 */
export class Scheduler {
    heartbeatInterval = null;
    config;
    writer;
    metrics;
    visited = new Set();
    enqueued = new Set();
    queue = [];
    // Per-host queues for rate limiting
    hostQueues = new Map();
    seenParams = new Map();
    pageCount = 0;
    errorCount = 0;
    errorBudgetExceeded = false;
    rpsLimiter;
    memoryPaused = false;
    checkpointInterval;
    lastCheckpointAt = 0;
    resumeOf;
    shutdownRequested = false;
    gracefulShutdown = false;
    // Public API state
    crawlState = "idle";
    constructor(config, writer, metrics) {
        this.config = config;
        this.writer = writer;
        this.metrics = metrics || new Metrics();
        this.checkpointInterval = config.checkpoint?.interval || 500;
        this.resumeOf = config.resume?.crawlId;
        this.rpsLimiter = pLimit(1);
        this.setupSignalHandlers();
        this.crawlState = "idle";
    }
    /** Get current crawl state */
    getState() {
        return this.crawlState;
    }
    /** Get crawl progress snapshot */
    getProgress() {
        return {
            queued: this.queue.length,
            inFlight: 0, // TODO: track in-flight
            completed: this.pageCount,
            errors: this.errorCount,
            pagesPerSecond: this.metrics.getPagesPerSecond(),
            startedAt: this.metrics.getStartedAt(),
            updatedAt: new Date().toISOString()
        };
    }
    /** Get manifest path */
    getManifestPath() {
        return this.writer.getManifestPath ? this.writer.getManifestPath() : "";
    }
    /** Pause crawl: stop dequeuing new URLs */
    async pause() {
        this.memoryPaused = true;
        this.crawlState = "paused";
    }
    /** Resume crawl: re-enable dequeues */
    async resume() {
        this.memoryPaused = false;
        this.crawlState = "running";
    }
    /** Cancel crawl: request graceful shutdown */
    async cancel() {
        this.shutdownRequested = true;
        this.crawlState = "canceling";
    }
    getMetrics() {
        return this.metrics;
    }
    /**
     * Setup signal handlers for graceful shutdown
     */
    setupSignalHandlers() {
        const handleShutdown = async (signal) => {
            if (this.shutdownRequested) {
                log("warn", `[Shutdown] Already shutting down, received ${signal} again. Forcing exit...`);
                process.exit(1);
            }
            this.shutdownRequested = true;
            log("warn", `[Shutdown] Received ${signal}. Gracefully shutting down...`);
            log("info", "[Shutdown] Pausing new enqueueing, finishing in-flight tasks...");
            // Wait for current tasks with timeout
            const timeoutMs = this.config.shutdown?.gracefulTimeoutMs || 15000;
            const shutdownTimeout = setTimeout(() => {
                log("error", "[Shutdown] Timeout reached. Writing checkpoint and exiting...");
                this.forceShutdown();
            }, timeoutMs);
            // Let the run loop detect shutdownRequested and exit naturally
            // The loop will write final checkpoint
        };
        process.on("SIGINT", () => handleShutdown("SIGINT"));
        process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    }
    /**
     * Force shutdown with final checkpoint
     */
    async forceShutdown() {
        try {
            await this.writer.flushAndSync();
            await this.writeCheckpointIfNeeded(true);
            this.gracefulShutdown = false; // Forced shutdown
        }
        catch (error) {
            log("error", `[Shutdown] Error during forced shutdown: ${error}`);
        }
        process.exit(1);
    }
    /**
     * Restore state from checkpoint for resume
     */
    async restoreFromCheckpoint() {
        const stagingDir = this.writer.getStagingDir();
        const state = readCheckpoint(stagingDir);
        if (!state) {
            return false;
        }
        // Restore visited set
        this.visited = readVisitedIndex(stagingDir);
        // Restore queue
        this.queue = readFrontier(stagingDir);
        // Rebuild enqueued set
        this.enqueued = new Set([...this.visited, ...this.queue.map(q => q.url)]);
        // Restore page count
        this.pageCount = state.visitedCount;
        this.lastCheckpointAt = state.visitedCount;
        log("info", `[Resume] Restored: ${this.visited.size} visited, ${this.queue.length} in queue`);
        return true;
    }
    /**
     * Write checkpoint if interval reached
     */
    async writeCheckpointIfNeeded(force = false) {
        if (!this.config.checkpoint?.enabled && this.config.checkpoint?.enabled !== undefined) {
            return;
        }
        const shouldCheckpoint = force ||
            (this.pageCount - this.lastCheckpointAt >= this.checkpointInterval);
        if (shouldCheckpoint) {
            await this.writer.flushAndSync();
            const state = {
                crawlId: this.writer.getCrawlId(),
                visitedCount: this.visited.size,
                enqueuedCount: this.enqueued.size,
                queueDepth: this.queue.length,
                visitedUrlKeysFile: "visited.idx",
                frontierSnapshot: "frontier.json",
                lastPartPointers: this.writer.getPartPointers(),
                rssMB: this.metrics.getCurrentRssMB(),
                timestamp: new Date().toISOString(),
                resumeOf: this.resumeOf,
                gracefulShutdown: this.gracefulShutdown
            };
            const stagingDir = this.writer.getStagingDir();
            writeCheckpoint(stagingDir, state);
            writeVisitedIndex(stagingDir, this.visited);
            writeFrontier(stagingDir, this.queue);
            this.lastCheckpointAt = this.pageCount;
            log("info", `[Checkpoint] Saved at ${this.pageCount} pages`);
        }
    }
    async run() {
        // Start periodic metrics logging (unless quiet mode)
        if (!this.config.cli?.quiet) {
            this.metrics.startPeriodicLogging();
        }
        // Start 1 Hz heartbeat event stream
        const crawlId = this.writer.getCrawlId();
        const emitter = EventEmitter.global;
        this.heartbeatInterval = setInterval(() => {
            emitter.emit(withCrawlId(crawlId, {
                type: "crawl.heartbeat",
                progress: this.getProgress()
            })); // Type assertion for union
        }, 1000);
        // Emit crawl.started event
        emitter.emit(withCrawlId(crawlId, {
            type: "crawl.started",
            config: this.config
        }));
        // Try to restore from checkpoint if resuming
        if (this.config.resume?.stagingDir) {
            const restored = await this.restoreFromCheckpoint();
            if (restored) {
                log("info", "[Resume] Successfully restored state from checkpoint");
            }
            else {
                log("warn", "[Resume] No checkpoint found, starting fresh");
            }
        }
        // Log crawl configuration
        log("info", `[Scheduler] paramPolicy=${this.config.discovery.paramPolicy} blockList=[${this.config.discovery.blockList.join(", ")}] maxPages=${this.config.maxPages}`);
        // Process queue with concurrency limit
        const concurrencyLimit = pLimit(this.config.render.concurrency);
        // Per-host rate limiting loop
        const perHostRps = this.config.perHostRps ?? 2;
        const burst = Math.max(2, perHostRps);
        perHostTokens.init({ perHostRps, burst });
        while (Array.from(this.hostQueues.values()).some(q => q.length > 0)) {
            const now = Date.now();
            // Round-robin host selection
            const hosts = Array.from(this.hostQueues.keys());
            let processed = false;
            for (const host of hosts) {
                const queue = this.hostQueues.get(host);
                if (queue.length === 0)
                    continue;
                if (perHostTokens.tryConsume(host, now)) {
                    const item = queue.shift();
                    // Mark as visited immediately
                    if (this.visited.has(item.url))
                        continue;
                    this.visited.add(item.url);
                    await concurrencyLimit(async () => {
                        await this.rpsLimiter(async () => {
                            await this.processPage(item);
                        });
                    });
                    processed = true;
                }
                else {
                    // Emit backpressure event for host
                    EventEmitter.global.emit(withCrawlId(crawlId, {
                        type: "crawl.backpressure",
                        reason: "per_host_rps",
                        host,
                        hostsWithTokens: hosts.filter(h => perHostTokens.getTokens(h) > 0),
                        hostsDeferred: hosts.filter(h => perHostTokens.getTokens(h) === 0)
                    }));
                }
            }
            if (!processed) {
                // If no hosts could process, wait 100ms before next round
                await new Promise(res => setTimeout(res, 100));
            }
        }
        // Get final counts from metrics summary
        const finalSummary = this.metrics.getSummary();
        // Log final checkpoint event
        logEvent({
            ts: new Date().toISOString(),
            level: "info",
            event: "crawl.checkpoint",
            crawlId: this.writer.getCrawlId(),
            pageCount: this.pageCount,
            edges: finalSummary.counts.totalEdges,
            assets: finalSummary.counts.totalAssets,
            errors: this.errorCount,
            rssMB: this.metrics.getCurrentRssMB()
        });
        // Set provenance information on writer for manifest
        this.writer.setProvenance({
            resumeOf: this.resumeOf,
            checkpointInterval: this.checkpointInterval,
            gracefulShutdown: this.gracefulShutdown
        });
        // Stop metrics logging
        if (!this.config.cli?.quiet) {
            this.metrics.stopPeriodicLogging();
        }
        log("info", `[Scheduler] Crawl complete. Processed ${this.pageCount} pages`);
        // Emit crawl.finished event
        emitter.emit(withCrawlId(crawlId, {
            type: "crawl.finished",
            manifestPath: this.writer.getManifestPath(),
            incomplete: this.gracefulShutdown
        }));
        // Stop heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        return {
            success: !this.errorBudgetExceeded,
            errorCount: this.errorCount,
            errorBudgetExceeded: this.errorBudgetExceeded,
            gracefulShutdown: this.gracefulShutdown
        };
    }
    normalizeAndApplyPolicy(url) {
        try {
            const parsed = new URL(url);
            const applied = applyParamPolicy(parsed, this.config.discovery.paramPolicy, this.config.discovery.blockList, this.seenParams);
            return normalizeUrl(applied.toString());
        }
        catch {
            return null;
        }
    }
    async processPage(item) {
        const startTime = performance.now();
        try {
            log("debug", `[Crawl] depth=${item.depth} ${item.url}`);
            // Robots check (unless overridden)
            if (!this.config.robots.overrideUsed && this.config.robots.respect) {
                const robotsResult = await robotsCache.shouldFetch(this.config, item.url);
                if (!robotsResult.allow) {
                    log("warn", `[Robots] Blocked by robots.txt: ${item.url} (rule: ${robotsResult.matchedRule})`);
                    await this.writer.writeError({
                        url: item.url,
                        origin: new URL(item.url).origin,
                        hostname: new URL(item.url).hostname,
                        occurredAt: new Date().toISOString(),
                        phase: "fetch",
                        code: "ROBOTS_BLOCKED",
                        message: `Blocked by robots.txt rule: ${robotsResult.matchedRule}`
                    });
                    return;
                }
            }
            // Fetch page
            const fetchStart = performance.now();
            const fetchResult = await fetchUrl(this.config, item.url);
            const fetchMs = Math.round(performance.now() - fetchStart);
            // Render page
            const renderStart = performance.now();
            const renderResult = await renderPage(this.config, fetchResult.finalUrl, fetchResult);
            const renderMs = Math.round(performance.now() - renderStart);
            // Determine DOM source for extractors
            const domSource = renderResult.modeUsed === "raw" ? "raw" : "playwright";
            // Extract page facts
            const extractStart = performance.now();
            const pageFacts = extractPageFacts({
                domSource,
                html: renderResult.dom,
                fetchHeaders: fetchResult.headers,
                baseUrl: fetchResult.finalUrl
            });
            // Extract text sample
            const textSample = extractTextSample({
                domSource,
                html: renderResult.dom
            });
            // Extract links
            const allEdges = extractLinks({
                domSource,
                html: renderResult.dom,
                baseUrl: fetchResult.finalUrl,
                discoveredInMode: renderResult.modeUsed
            });
            // Separate internal and external edges
            const internalEdges = allEdges.filter(e => !e.isExternal);
            const externalEdges = allEdges.filter(e => e.isExternal);
            // Extract assets with cap
            const assetsResult = extractAssets({
                domSource,
                html: renderResult.dom,
                baseUrl: fetchResult.finalUrl
            });
            // Extract accessibility if enabled
            let accessibilityRecord;
            if (this.config.accessibility?.enabled !== false) {
                accessibilityRecord = extractAccessibility({
                    domSource,
                    html: renderResult.dom,
                    baseUrl: fetchResult.finalUrl
                });
            }
            const extractMs = Math.round(performance.now() - extractStart);
            // Detect noindex
            let noindexSurface;
            const hasMetaNoindex = pageFacts.robotsMeta?.includes("noindex");
            const hasHeaderNoindex = pageFacts.xRobotsTagHeader?.includes("noindex");
            if (hasMetaNoindex && hasHeaderNoindex) {
                noindexSurface = "both";
            }
            else if (hasMetaNoindex) {
                noindexSurface = "meta";
            }
            else if (hasHeaderNoindex) {
                noindexSurface = "header";
            }
            // Build PageRecord
            const normalizedUrl = normalizeUrl(fetchResult.finalUrl);
            const parsedUrl = new URL(fetchResult.finalUrl);
            const pageRecord = {
                url: item.url,
                finalUrl: fetchResult.finalUrl,
                normalizedUrl,
                urlKey: sha1Hex(normalizedUrl),
                origin: parsedUrl.origin,
                pathname: parsedUrl.pathname,
                section: sectionOf(fetchResult.finalUrl),
                statusCode: fetchResult.statusCode,
                contentType: fetchResult.contentType,
                fetchedAt: new Date().toISOString(),
                redirectChain: fetchResult.redirectChain,
                // Page facts
                title: pageFacts.title || fetchResult.title,
                metaDescription: pageFacts.metaDescription,
                h1: pageFacts.h1,
                headings: pageFacts.headings,
                canonicalHref: pageFacts.canonicalHref,
                canonicalResolved: pageFacts.canonicalResolved,
                canonical: pageFacts.canonicalResolved, // Backwards compat
                robotsMeta: pageFacts.robotsMeta,
                robotsHeader: fetchResult.robotsHeader,
                noindexSurface,
                // Content hashes
                rawHtmlHash: fetchResult.rawHtmlHash,
                domHash: renderResult.domHash,
                textSample,
                // Render info
                renderMode: renderResult.modeUsed,
                renderMs: renderResult.renderMs,
                fetchMs,
                navEndReason: renderResult.navEndReason,
                // Counts
                internalLinksCount: internalEdges.length,
                externalLinksCount: externalEdges.length,
                mediaAssetsCount: assetsResult.assets.length,
                mediaAssetsTruncated: assetsResult.truncated,
                // Hreflang
                hreflangLinks: pageFacts.hreflang,
                // Discovery
                depth: item.depth,
                discoveredFrom: item.discoveredFrom,
                discoveredInMode: renderResult.modeUsed,
                // Basic flags
                basicFlags: {
                    hasTitle: !!pageFacts.title,
                    hasMetaDescription: !!pageFacts.metaDescription,
                    hasH1: !!pageFacts.h1,
                    hasCanonical: !!pageFacts.canonicalResolved
                }
            };
            // Write page, edges, and assets
            const writeStart = performance.now();
            await this.writer.writePage(pageRecord);
            this.pageCount++;
            // Write edges
            for (const edge of internalEdges) {
                validateEdgeRecord(edge);
                await this.writer.writeEdge(edge);
            }
            for (const edge of externalEdges) {
                validateEdgeRecord(edge);
                await this.writer.writeEdge(edge);
            }
            // Write assets
            for (const asset of assetsResult.assets) {
                validateAssetRecord(asset);
                await this.writer.writeAsset(asset);
            }
            // Write accessibility
            if (accessibilityRecord) {
                await this.writer.writeAccessibility(accessibilityRecord);
            }
            const writeMs = Math.round(performance.now() - writeStart);
            // Record metrics
            this.metrics.recordPage(fetchMs, renderMs, extractMs, writeMs);
            this.metrics.recordEdges(allEdges.length);
            this.metrics.recordAssets(assetsResult.assets.length);
            this.metrics.recordBytesWritten(this.writer.getBytesWritten());
            // Enqueue new URLs (internal links only)
            if (!this.config.discovery.followExternal) {
                for (const edge of internalEdges) {
                    await this.enqueueIfNew(edge.targetUrl, item.depth + 1, fetchResult.finalUrl);
                }
            }
            // Log progress
            const totalMs = Math.round(performance.now() - startTime);
            log("info", `[Crawl] depth=${item.depth} ${item.url} → ${fetchResult.statusCode} (${renderResult.navEndReason}) render=${renderResult.renderMs}ms edges=${allEdges.length} assets=${assetsResult.assets.length} total=${totalMs}ms`);
            // Log structured page processed event
            logEvent({
                ts: new Date().toISOString(),
                level: "info",
                event: "crawl.pageProcessed",
                crawlId: this.writer.getCrawlId(),
                url: item.url,
                depth: item.depth,
                status: fetchResult.statusCode,
                fetchMs,
                renderMs,
                extractMs,
                writeMs,
                rssMB: this.metrics.getCurrentRssMB()
            });
        }
        catch (error) {
            log("error", `[Crawl] Failed to process ${item.url}: ${error.message}`);
            // Record error in metrics and counter
            this.metrics.recordError();
            this.errorCount++;
            const parsedUrl = new URL(item.url);
            await this.writer.writeError({
                url: item.url,
                origin: parsedUrl.origin,
                hostname: parsedUrl.hostname,
                occurredAt: new Date().toISOString(),
                phase: "fetch",
                code: error.code || "UNKNOWN_ERROR",
                message: error.message || String(error),
                stack: error.stack
            });
            // Log structured error event
            logEvent({
                ts: new Date().toISOString(),
                level: "error",
                event: "crawl.error",
                crawlId: this.writer.getCrawlId(),
                url: item.url,
                stage: "fetch",
                code: error.code || "UNKNOWN_ERROR",
                message: error.message || String(error)
            });
        }
    }
    async enqueueIfNew(url, depth, discoveredFrom) {
        const normalized = this.normalizeAndApplyPolicy(url);
        if (!normalized)
            return;
        // Skip if already visited or enqueued
        if (this.visited.has(normalized) || this.enqueued.has(normalized)) {
            return;
        }
        // Check maxPages before enqueuing
        if (this.config.maxPages > 0 && this.visited.size >= this.config.maxPages) {
            return;
        }
        this.enqueued.add(normalized);
        this.queue.push({ url: normalized, depth, discoveredFrom });
        log("debug", `[Queue] Enqueued: ${normalized} (depth=${depth})`);
    }
}
//# sourceMappingURL=scheduler.js.map