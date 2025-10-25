/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { EngineConfig, PageRecord, ErrorRecord } from "./types.js";
import type { AtlasWriter } from "../io/atlas/writer.js";
import { normalizeUrl, isSameOrigin, sectionOf, applyParamPolicy } from "../utils/url.js";
import { sha1Hex, sha256Hex } from "../utils/hashing.js";
import { log, logEvent } from "../utils/logging.js";
import bus from "./events.js";
import { withCrawlId } from "./withCrawlId.js";
import { Metrics } from "../utils/metrics.js";
import { writeCheckpoint, writeVisitedIndex, writeFrontier, readCheckpoint, readVisitedIndex, readFrontier, type CheckpointState } from "./checkpoint.js";
import pLimit from "p-limit";
import { URL } from 'url';
import { fetchUrl } from "./fetcher.js";
import { renderPage } from "./renderer.js";
import { extractPageFacts } from "./extractors/pageFacts.js";
import { extractLinks } from "./extractors/links.js";
import { extractAssets } from "./extractors/assets.js";
import { extractTextSample } from "./extractors/textSample.js";
import { extractAccessibility, extractAccessibilityWithContrast } from "./extractors/accessibility.js";
import { extractStructuredData, filterRelevantStructuredData } from "./extractors/structuredData.js";
import { extractAllOpenGraph } from "./extractors/openGraph.js";
import { extractAllTwitterCards } from "./extractors/twitterCard.js";
import { detectTechStack, extractScriptUrls } from "./extractors/wappalyzer.js";
import { extractViewportMeta, detectMixedContent, checkSubresourceIntegrity, extractEncoding, countResources, extractCompression, detectSitemaps, countBrokenLinks, extractOutboundDomains } from "./extractors/enhancedMetrics.js";
import { extractLighthouseMetrics } from "./extractors/lighthouse.js";
import { extractEnhancedSEOMetadata } from "./extractors/enhancedSEO.js";
import { validateEdgeRecord, validateAssetRecord } from "../io/validator.js";
import { robotsCache } from "./robotsCache.js";
import * as perHostTokens from './perHostTokens.js';
import { URLFilter } from "../utils/urlFilter.js";

interface QueueItem {
  url: string;
  depth: number;
  discoveredFrom?: string;
}

export interface SchedulerResult {
  success: boolean;
  errorCount: number;
  errorBudgetExceeded: boolean;
  gracefulShutdown: boolean;
}

/**
 * BFS Scheduler with URL normalization, parameter sampling, and queue hygiene
 */
export class Scheduler {
  private _eventSeq = 1;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: EngineConfig;
  private writer: AtlasWriter;
  private metrics: Metrics;
  private visited = new Set<string>();
  private enqueued = new Set<string>();
  private queue: QueueItem[] = [];
  // Per-host queues for rate limiting
  private hostQueues: Map<string, QueueItem[]> = new Map();
  private seenParams = new Map<string, Set<string>>();
  private pageCount = 0;
  private errorCount = 0;
  private errorBudgetExceeded = false;
  private inFlightCount = 0; // Track concurrent page processing
  private rpsLimiter: ReturnType<typeof pLimit>;
  private memoryPaused = false;
  private checkpointInterval: number;
  private lastCheckpointAt = 0;
  private lastCheckpointTime = Date.now();
  private resumeOf?: string;
  private shutdownRequested = false;
  private gracefulShutdown = false;
  // Favicon cache (deduplicate by origin)
  private faviconCache = new Map<string, string>(); // origin -> path in archive
  // Public API state
  private crawlState: "idle" | "running" | "paused" | "canceling" | "finalizing" | "done" | "failed" = "idle";
  // URL filtering
  private urlFilter?: URLFilter;

  constructor(config: EngineConfig, writer: AtlasWriter, metrics?: Metrics) {
    log('debug', `Scheduler constructor received resume config: ${JSON.stringify(config.resume, null, 2)}`);
    this.config = config;
    this.writer = writer;
    this.metrics = metrics || new Metrics();
    this.checkpointInterval = config.checkpoint?.interval || 500;
    this.resumeOf = config.resume?.crawlId;
    this.rpsLimiter = pLimit(1);
    this.setupSignalHandlers();
    this.crawlState = "idle";
    
    // Initialize URL filter if patterns are provided
    if (config.discovery.allowUrls || config.discovery.denyUrls) {
      this.urlFilter = new URLFilter(config.discovery.allowUrls, config.discovery.denyUrls);
      log('info', `[URLFilter] Initialized with ${config.discovery.allowUrls?.length || 0} allow patterns, ${config.discovery.denyUrls?.length || 0} deny patterns`);
    }
  }

  /** Get current crawl state */
  getState(): "idle" | "running" | "paused" | "canceling" | "finalizing" | "done" | "failed" {
    return this.crawlState;
  }

  /** Get crawl progress snapshot */
  getProgress(): import("./types.js").CrawlProgress {
    return {
      queued: this.queue.length,
      inFlight: this.inFlightCount,
      completed: this.pageCount,
      errors: this.errorCount,
      pagesPerSecond: this.metrics.getPagesPerSecond(),
      startedAt: this.metrics.getStartedAt(),
      updatedAt: new Date().toISOString()
    };
  }

  /** Get manifest path */
  getManifestPath(): string {
    return this.writer.getManifestPath ? this.writer.getManifestPath() : "";
  }

  /** Pause crawl: stop dequeuing new URLs */
  async pause(): Promise<void> {
    this.memoryPaused = true;
    this.crawlState = "paused";
  }

  /** Resume crawl: re-enable dequeues */
  async resume(): Promise<void> {
    this.memoryPaused = false;
    this.crawlState = "running";
  }

  /** Cancel crawl: request graceful shutdown */
  async cancel(): Promise<void> {
    if (!this.shutdownRequested) {
      this.shutdownRequested = true;
      this.gracefulShutdown = true;
      this.crawlState = "canceling";
      bus.emit(withCrawlId(this.writer.getCrawlId(), {
        type: "crawl.shutdown",
        reason: "cancel"
      } as import("./types.js").CrawlEvent));
    }
  }
  
  getMetrics(): Metrics {
    return this.metrics;
  }
  
  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const handleShutdown = async (signal: string) => {
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
  private async forceShutdown(): Promise<void> {
    try {
      bus.emit(withCrawlId(this.writer.getCrawlId(), {
        type: "crawl.shutdown",
        reason: "error"
      } as import("./types.js").CrawlEvent));
      await this.writer.flushAndSync();
      await this.writeCheckpointIfNeeded(true);
      this.gracefulShutdown = false; // Forced shutdown
    } catch (error) {
      log("error", `[Shutdown] Error during forced shutdown: ${error}`);
    }
    process.exit(1);
  }
  
  /**
   * Restore state from checkpoint for resume
   */
  async restoreFromCheckpoint(): Promise<boolean> {
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
  private async writeCheckpointIfNeeded(force = false): Promise<void> {
    log('debug', `writeCheckpointIfNeeded entry: force=${force}, checkpoint enabled=${this.config.checkpoint?.enabled}`);
    if (!this.config.checkpoint?.enabled && this.config.checkpoint?.enabled !== undefined) {
      log('debug', 'writeCheckpointIfNeeded: checkpoint not enabled, returning');
      return;
    }

    let shouldCheckpoint = force || 
      (this.pageCount - this.lastCheckpointAt >= this.checkpointInterval);
    log('debug', `writeCheckpointIfNeeded: shouldCheckpoint=${shouldCheckpoint}, pageCount=${this.pageCount}, lastCheckpointAt=${this.lastCheckpointAt}, interval=${this.checkpointInterval}`);
    // Time-based fallback
    if (!shouldCheckpoint && this.config.checkpoint?.everySeconds && this.config.checkpoint.everySeconds > 0) {
      const now = Date.now();
      const timeElapsed = (now - this.lastCheckpointTime) >= this.config.checkpoint.everySeconds * 1000;
      log('debug', `writeCheckpointIfNeeded: timeElapsed=${timeElapsed}, now=${now}, lastCheckpointTime=${this.lastCheckpointTime}, everySeconds=${this.config.checkpoint.everySeconds}`);
      if (timeElapsed) {
        shouldCheckpoint = true;
        this.lastCheckpointTime = now;
      }
    }

    if (shouldCheckpoint) {
      log('debug', 'writeCheckpointIfNeeded: shouldCheckpoint is true, proceeding to write checkpoint and emit event');
      try {
        await this.writer.flushAndSync();

        const state: CheckpointState = {
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
        log('debug', `Writing checkpoint to ${stagingDir}`);
        log('debug', `CheckpointState: ${JSON.stringify(state)}`);
        writeCheckpoint(stagingDir, state);
        writeVisitedIndex(stagingDir, this.visited);
        writeFrontier(stagingDir, this.queue);

        // Emit checkpoint.saved event for integration test
        if (!this._eventSeq) this._eventSeq = 1;
        const checkpointEvent = {
          type: 'checkpoint.saved' as const,
          crawlId: this.writer.getCrawlId(),
          path: this.writer.getManifestPath(),
          seq: this._eventSeq++,
          timestamp: new Date().toISOString()
        };
        log('debug', `bus.emit checkpoint.saved: ${JSON.stringify(checkpointEvent)}`);
        bus.emit(checkpointEvent);

        this.lastCheckpointAt = this.pageCount;
        this.lastCheckpointTime = Date.now();
        log("info", `[Checkpoint] Saved at ${this.pageCount} pages`);
        log('debug', `Checkpoint state updated: lastCheckpointAt=${this.lastCheckpointAt}, lastCheckpointTime=${this.lastCheckpointTime}`);
      } catch (error: any) {
        log('error', `[Checkpoint] FAILED to write checkpoint: ${error.message}`);
        log('debug', `Checkpoint write error details: ${error.stack || error}`);
      }
    } else {
      log('debug', 'writeCheckpointIfNeeded: shouldCheckpoint is false, skipping checkpoint');
    }
  }
  
  async run(): Promise<SchedulerResult> {
    log('debug', `Scheduler.run() checking for resume. stagingDir is: ${this.config.resume?.stagingDir}`);
    // Start periodic metrics logging (unless quiet mode)
    if (!this.config.cli?.quiet) {
      log('debug', 'Starting periodic metrics logging');
      this.metrics.startPeriodicLogging();
    }

    // Start 1 Hz heartbeat event stream
    const crawlId = this.writer.getCrawlId();
    this.heartbeatInterval = setInterval(() => {
      log('debug', 'Emitting crawl.heartbeat event');
      bus.emit(withCrawlId(crawlId, {
        type: "crawl.heartbeat",
        progress: this.getProgress()
      } as any)); // Type assertion for union
    }, 1000);

    // Emit crawl.started event
    log('debug', 'Emitting crawl.started event');
    bus.emit(withCrawlId(crawlId, {
      type: "crawl.started",
      config: this.config
    } as any));

    // Try to restore from checkpoint if resuming
    if (this.config.resume?.stagingDir) {
      log('debug', 'Resume mode detected, attempting restore from checkpoint');
      const restored = await this.restoreFromCheckpoint();
      log('debug', `restoreFromCheckpoint returned: ${restored}`);
      if (restored) {
        log("info", "[Resume] Successfully restored state from checkpoint");
        log('info', `[Resume] Repopulating host queues from restored frontier...`);
        for (const item of this.queue) {
          try {
            const host = new URL(item.url).hostname;
            if (!this.hostQueues.has(host)) {
              this.hostQueues.set(host, []);
            }
            this.hostQueues.get(host)!.push(item);
          } catch (e: any) {
            log('warn', `[Resume] Failed to parse URL ${item.url} from restored queue: ${e.message}`);
          }
        }
        this.queue.length = 0; // Clear the array
        log('info', `[Resume] Host queues repopulated. ${this.hostQueues.size} hosts active.`);
        log('debug', 'Forcing checkpoint emission after resume');
        log('debug', 'Calling writeCheckpointIfNeeded(force=true) after resume');
        await this.writeCheckpointIfNeeded(true);
        log('debug', 'writeCheckpointIfNeeded(force=true) after resume completed');
      } else {
        log("warn", "[Resume] No checkpoint found, starting fresh");
      }
    } else {
      // New crawl: enqueue seeds
      log("info", "[Scheduler] Starting new crawl, enqueuing seeds...");
      if (!this.config.seeds || this.config.seeds.length === 0) {
        log("warn", "[Scheduler] No seeds provided for new crawl.");
      } else {
        for (const seedUrl of this.config.seeds) {
          const normalized = this.normalizeAndApplyPolicy(seedUrl);
          if (normalized && !this.visited.has(normalized) && !this.enqueued.has(normalized)) {
            this.enqueued.add(normalized);
            // Add to host queues directly
            try {
              const host = new URL(normalized).hostname;
              if (!this.hostQueues.has(host)) {
                this.hostQueues.set(host, []);
              }
              this.hostQueues.get(host)!.push({ url: normalized, depth: 0, discoveredFrom: 'seed' });
            } catch (e: any) {
              log('warn', `[Scheduler] Failed to parse seed URL ${seedUrl}: ${e.message}`);
            }
          }
        }
        log("info", `[Scheduler] Enqueued ${this.enqueued.size} seeds.`);
      }
    }

    // Log crawl configuration
    log("info", `[Scheduler] paramPolicy=${this.config.discovery.paramPolicy} blockList=[${this.config.discovery.blockList.join(", ")}] maxPages=${this.config.maxPages} maxDepth=${this.config.maxDepth}`);

    // Emit a seeded checkpoint immediately after seeding the frontier
    if (this.config.checkpoint?.enabled) {
      await this.writeCheckpointIfNeeded(true);
    }
    
    // Process queue with concurrency limit
    const concurrencyLimit = pLimit(this.config.render.concurrency);
        // Emit a checkpoint immediately after seeding (before first fetch)
        if (this.config.checkpoint?.enabled) {
          await this.writeCheckpointIfNeeded(true);
        }
    // Per-host rate limiting loop
    const perHostRps = this.config.perHostRps ?? 2;
    const burst = Math.max(2, perHostRps);
    perHostTokens.init({ perHostRps, burst });
    while (Array.from(this.hostQueues.values()).some(q => q.length > 0)) {
      // Time-based checkpoint fallback
      await this.writeCheckpointIfNeeded(false);
      const now = Date.now();
      // Round-robin host selection
      const hosts = Array.from(this.hostQueues.keys());
      let processed = false;
      for (const host of hosts) {
        const queue = this.hostQueues.get(host)!;
        if (queue.length === 0) continue;
        if (perHostTokens.tryConsume(host, now)) {
          const item = queue.shift()!;
          // Mark as visited immediately
          if (this.visited.has(item.url)) continue;
          this.visited.add(item.url);
          await concurrencyLimit(async () => {
            await this.rpsLimiter(async () => {
              this.inFlightCount++;
              try {
                await this.processPage(item);
              } finally {
                this.inFlightCount--;
              }
            });
          });
          processed = true;
        } else {
          // Emit backpressure event for host
          bus.emit(withCrawlId(crawlId, {
            type: "crawl.backpressure",
            reason: "per_host_rps",
            host,
            hostsWithTokens: hosts.filter(h => perHostTokens.getTokens(h) > 0),
            hostsDeferred: hosts.filter(h => perHostTokens.getTokens(h) === 0)
          } as any));
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
    
    // Determine completion reason
    let completionReason: "finished" | "capped" | "error_budget" | "manual" = "finished";
    // Check if we hit maxPages limit (whether we processed exactly maxPages or stopped early with remaining queue)
    if (this.config.maxPages > 0 && this.pageCount >= this.config.maxPages) {
      completionReason = "capped";
    } else if (this.config.maxPages > 0 && this.visited.size >= this.config.maxPages) {
      // Also mark as capped if visited count reached maxPages (accounts for edge cases)
      completionReason = "capped";
    } else if (this.gracefulShutdown) {
      completionReason = "manual";
    }
    // Note: error_budget would be set earlier if errorBudget was exceeded
    this.writer.setCompletionReason(completionReason);
    
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

    // Get summary and performance data for the event
    const summary = this.writer.getSummary();
    const perfSummary = this.metrics.getSummary();

    // Emit crawl.finished event with summary data
  bus.emit(withCrawlId(crawlId, {
      type: "crawl.finished",
      manifestPath: this.writer.getManifestPath(),
      incomplete: this.gracefulShutdown,
      summary: {
        pages: summary.stats.totalPages,
        edges: summary.stats.totalEdges,
        assets: summary.stats.totalAssets,
        errors: summary.stats.totalErrors,
        durationMs: perfSummary.duration.totalSeconds * 1000
      },
      perf: {
        avgPagesPerSec: perfSummary.throughput.avgPagesPerSec || 0,
        peakRssMB: perfSummary.memory.peakRssMB || 0
      },
      notes: [
        `Checkpoint interval: ${this.config.checkpoint?.interval || 500} pages`,
        `Graceful shutdown: ${this.gracefulShutdown}`,
        ...(this.errorBudgetExceeded ? ["Terminated: error budget exceeded"] : [])
      ]
    } as any));

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
  
  private normalizeAndApplyPolicy(url: string): string | null {
    try {
      const parsed = new URL(url);
      const applied = applyParamPolicy(
        parsed,
        this.config.discovery.paramPolicy,
        this.config.discovery.blockList,
        this.seenParams
      );
      return normalizeUrl(applied.toString());
    } catch {
      return null;
    }
  }
  
  private async processPage(item: QueueItem): Promise<void> {
    const startTime = performance.now();
    
    try {
      log("debug", `[Crawl] depth=${item.depth} ${item.url}`);
      
      // URL filter check (allow/deny lists)
      if (this.urlFilter && !this.urlFilter.shouldAllow(item.url)) {
        const reason = this.urlFilter.getDenyReason(item.url) || "URL filtered";
        log("warn", `[URLFilter] Blocked: ${item.url} - ${reason}`);
        
        await this.writer.writeError({
          url: item.url,
          origin: new URL(item.url).origin,
          hostname: new URL(item.url).hostname,
          occurredAt: new Date().toISOString(),
          phase: "fetch",
          code: "URL_FILTERED",
          message: reason
        });
        
        return;
      }
      
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
      
      // Check for challenge page detection
      if (renderResult.challengeDetected) {
        if (renderResult.challengePageCaptured) {
          // We captured the challenge page content - log warning but continue processing
          // The challengePageCaptured flag will be set in PageRecord to warn consumers
          log('warn', `[Scheduler] Challenge page captured for ${item.url}. Content may not be reliable.`);
        } else {
          // Challenge detected but no content captured - this is an error
          const errorMsg = "Page failed to load due to a server/CDN challenge (e.g., Cloudflare, Akamai). Challenge did not resolve within 15s. Data is not available.";
          log('error', `[Scheduler] Challenge detected for ${item.url}: ${errorMsg}`);
          
          const errorRecord: ErrorRecord = {
            url: item.url,
            origin: new URL(item.url).origin,
            hostname: new URL(item.url).hostname,
            occurredAt: new Date().toISOString(),
            phase: 'render',
            code: 'CHALLENGE_DETECTED',
            message: errorMsg
          };
          
          await this.writer.writeError(errorRecord);
          
          // Do NOT create PageRecord with poisoned data - skip to next page
          this.errorCount++;
          return;
        }
      }
      
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
          baseUrl: fetchResult.finalUrl,
          renderMode: renderResult.modeUsed,
          runtimeWCAGData: renderResult.runtimeWCAGData
        });
      }
      
      // Extract structured data (JSON-LD and Microdata)
      let structuredData;
      try {
        log('debug', `[Scheduler] Extracting structured data from ${item.url}`);
        const allStructuredData = extractStructuredData({
          html: renderResult.dom,
          url: fetchResult.finalUrl
        });
        
        log('debug', `[Scheduler] Found ${allStructuredData.length} total structured data items on ${item.url}`);
        
        // Filter to only relevant types to reduce noise
        const relevant = filterRelevantStructuredData(allStructuredData);
        
        // Extract Open Graph metadata
        const ogData = extractAllOpenGraph(renderResult.dom);
        relevant.push(...ogData);
        
        // Extract Twitter Card metadata
        const twitterData = extractAllTwitterCards(renderResult.dom);
        relevant.push(...twitterData);
        
        // Only include if we found something
        if (relevant.length > 0) {
          structuredData = relevant;
          log('info', `[Scheduler] Captured ${relevant.length} structured data items on ${item.url} (types: ${relevant.map(r => r.schemaType).join(', ')})`);
        } else if (allStructuredData.length > 0) {
          log('debug', `[Scheduler] Found ${allStructuredData.length} structured data items but none were relevant types`);
        }
      } catch (sdError: any) {
        log('warn', `[Scheduler] Failed to extract structured data from ${item.url}: ${sdError.message}`);
      }
      
      // Detect tech stack (frameworks, CMS, analytics, etc.)
      let techStack;
      try {
        log('debug', `[Scheduler] Detecting tech stack on ${item.url}`);
        
        // Normalize headers (convert string[] to string)
        const normalizedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(fetchResult.headers)) {
          normalizedHeaders[key] = Array.isArray(value) ? value[0] : value;
        }
        
        // Extract script URLs from HTML for better detection
        const scriptUrls = extractScriptUrls(renderResult.dom);
        
        const detected = await detectTechStack({
          html: renderResult.dom,
          url: fetchResult.finalUrl,
          headers: normalizedHeaders,
          scripts: scriptUrls
        });
        
        if (detected.length > 0) {
          techStack = detected;
          log('info', `[Scheduler] Detected ${detected.length} technologies on ${item.url}: ${detected.join(', ')}`);
        } else {
          log('debug', `[Scheduler] No technologies detected on ${item.url}`);
        }
      } catch (techError: any) {
        log('warn', `[Scheduler] Failed to detect tech stack on ${item.url}: ${techError.message}`);
      }
      
      // Extract viewport meta tag
      let viewportMeta;
      try {
        viewportMeta = extractViewportMeta(renderResult.dom);
        if (viewportMeta) {
          log('debug', `[Scheduler] Viewport meta found on ${item.url}: ${viewportMeta.content}`);
        }
      } catch (viewportError: any) {
        log('warn', `[Scheduler] Failed to extract viewport meta from ${item.url}: ${viewportError.message}`);
      }
      
      // Detect mixed content issues
      let mixedContentIssues;
      try {
        const issues = detectMixedContent({
          pageUrl: fetchResult.finalUrl,
          html: renderResult.dom
        });
        if (issues.length > 0) {
          mixedContentIssues = issues;
          log('warn', `[Scheduler] Found ${issues.length} mixed content issues on ${item.url}`);
        }
      } catch (mixedError: any) {
        log('warn', `[Scheduler] Failed to detect mixed content on ${item.url}: ${mixedError.message}`);
      }
      
      // Check Subresource Integrity
      let subresourceIntegrity;
      try {
        subresourceIntegrity = checkSubresourceIntegrity(renderResult.dom);
        if (subresourceIntegrity.totalScripts > 0 || subresourceIntegrity.totalStyles > 0) {
          log('debug', `[Scheduler] SRI check on ${item.url}: scripts=${subresourceIntegrity.scriptsWithSRI}/${subresourceIntegrity.totalScripts}, styles=${subresourceIntegrity.stylesWithSRI}/${subresourceIntegrity.totalStyles}`);
        }
      } catch (sriError: any) {
        log('warn', `[Scheduler] Failed to check SRI on ${item.url}: ${sriError.message}`);
      }
      
      // Extract encoding
      let encoding;
      try {
        const contentTypeHeader = Array.isArray(fetchResult.headers['content-type']) 
          ? fetchResult.headers['content-type'][0] 
          : fetchResult.headers['content-type'];
        encoding = extractEncoding({
          html: renderResult.dom,
          contentTypeHeader
        });
        if (encoding) {
          log('debug', `[Scheduler] Encoding detected on ${item.url}: ${encoding.encoding} (${encoding.source})`);
        }
      } catch (encodingError: any) {
        log('warn', `[Scheduler] Failed to extract encoding from ${item.url}: ${encodingError.message}`);
      }
      
      // Count resources
      let resourceCounts;
      try {
        resourceCounts = countResources(renderResult.dom);
        log('debug', `[Scheduler] Resource counts on ${item.url}: CSS=${resourceCounts.cssCount}, JS=${resourceCounts.jsCount}, fonts=${resourceCounts.fontCount}`);
      } catch (resourceError: any) {
        log('warn', `[Scheduler] Failed to count resources on ${item.url}: ${resourceError.message}`);
      }
      
      // Extract compression
      let compression;
      try {
        compression = extractCompression(fetchResult.headers);
        if (compression.compression && compression.compression !== 'none') {
          log('debug', `[Scheduler] Compression detected on ${item.url}: ${compression.compression}`);
        }
      } catch (compressionError: any) {
        log('warn', `[Scheduler] Failed to extract compression from ${item.url}: ${compressionError.message}`);
      }
      
      // SEO Quick Wins: Sitemap detection, broken links, outbound domains
      let sitemapData;
      let brokenLinksCount;
      let outboundDomains;
      try {
        const parsedUrl = new URL(fetchResult.finalUrl);
        const origin = parsedUrl.origin;
        
        // Get robots.txt from cache (if available)
        const robotsTxt = robotsCache.getCachedRobotsTxt(origin);
        
        // Detect sitemaps
        sitemapData = await detectSitemaps({
          origin,
          robotsTxt: robotsTxt || undefined
        });
        
        // Count broken links
        brokenLinksCount = countBrokenLinks(allEdges);
        
        // Extract outbound domains
        outboundDomains = extractOutboundDomains(allEdges);
        
        log('debug', `[Scheduler] SEO data for ${item.url}: sitemaps=${sitemapData?.sitemapUrls.length || 0}, brokenLinks=${brokenLinksCount}, outboundDomains=${outboundDomains.length}`);
      } catch (seoError: any) {
        log('warn', `[Scheduler] Failed to extract SEO data from ${item.url}: ${seoError.message}`);
      }
      
      const extractMs = Math.round(performance.now() - extractStart);
      
      // Extract enhanced SEO metadata (full and prerender modes)
      let enhancedSEO;
      if (renderResult.modeUsed === "full" || renderResult.modeUsed === "prerender") {
        try {
          log('debug', `[Scheduler] Extracting enhanced SEO metadata from ${item.url}`);
          const seoData = extractEnhancedSEOMetadata({
            html: renderResult.dom,
            baseUrl: fetchResult.finalUrl,
            headers: fetchResult.headers,
            bodyText: textSample
          });
          
          // Transform to PageRecord format
          enhancedSEO = {
            indexability: {
              isNoIndex: seoData.indexability.isNoIndex,
              isNoFollow: seoData.indexability.isNoFollow
            },
            content: {
              titleLength: seoData.content.titleLength,
              descriptionLength: seoData.content.descriptionLength,
              h1Count: seoData.content.h1Count,
              h2Count: seoData.content.h2Count,
              h3Count: seoData.content.h3Count,
              h4Count: seoData.content.h4Count,
              h5Count: seoData.content.h5Count,
              h6Count: seoData.content.h6Count,
              wordCount: seoData.content.wordCount,
              textContentLength: seoData.content.textContentLength
            },
            international: {
              hreflangCount: seoData.international.hreflangCount,
              hreflangErrors: seoData.international.hreflangErrors
            },
            social: {
              hasOpenGraph: !!(seoData.social.openGraph.ogTitle || seoData.social.openGraph.ogDescription),
              hasTwitterCard: !!seoData.social.twitter.twitterCard
            },
            schema: {
              hasJsonLd: seoData.schema.hasJsonLd,
              hasMicrodata: seoData.schema.hasMicrodata,
              schemaTypes: seoData.schema.schemaTypes
            }
          };
          
          log('debug', `[Scheduler] Enhanced SEO collected: wordCount=${enhancedSEO.content.wordCount}, h1Count=${enhancedSEO.content.h1Count}, hasOG=${enhancedSEO.social.hasOpenGraph}`);
        } catch (seoError: any) {
          log('warn', `[Scheduler] Failed to extract enhanced SEO metadata from ${item.url}: ${seoError.message}`);
        }
      }
      
      // Detect noindex
      let noindexSurface: "meta" | "header" | "both" | undefined;
      const hasMetaNoindex = pageFacts.robotsMeta?.includes("noindex");
      const hasHeaderNoindex = pageFacts.xRobotsTagHeader?.includes("noindex");
      if (hasMetaNoindex && hasHeaderNoindex) {
        noindexSurface = "both";
      } else if (hasMetaNoindex) {
        noindexSurface = "meta";
      } else if (hasHeaderNoindex) {
        noindexSurface = "header";
      }
      
      // Build PageRecord
      const normalizedUrl = normalizeUrl(fetchResult.finalUrl);
      const parsedUrl = new URL(fetchResult.finalUrl);
      
      const pageRecord: PageRecord = {
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
        canonicalResolved: pageFacts.canonicalResolved, // <-- THIS IS THE FIX
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
        challengePageCaptured: renderResult.challengePageCaptured, // Flag if this is challenge page content
        
        // Counts
        internalLinksCount: internalEdges.length,
        externalLinksCount: externalEdges.length,
        mediaAssetsCount: assetsResult.assets.length,
        mediaAssetsTruncated: assetsResult.truncated,
        
        // Hreflang
        hreflangLinks: pageFacts.hreflang,
        
        // Favicon
        faviconUrl: pageFacts.faviconUrl,
        
        // Discovery
        depth: item.depth,
        discoveredFrom: item.discoveredFrom,
        discoveredInMode: renderResult.modeUsed,
        
        // Structured data
        structuredData,
        
        // Tech stack
        techStack,
        
        // Mobile & Viewport
        viewportMeta,
        
        // Security & Best Practices
        mixedContentIssues,
        subresourceIntegrity,
        
        // Content & Encoding
        encoding,
        compression,
        resourceCounts,
        
        // Performance (full mode only - extract from renderResult.performance)
        performance: renderResult.modeUsed === "full" && renderResult.performance ? {
          lcp: renderResult.performance.lcp,
          cls: renderResult.performance.cls,
          tbt: renderResult.performance.tbt,
          fcp: renderResult.performance.fcp,
          ttfb: renderResult.performance.ttfb,
          fid: renderResult.performance.fid,
          inp: renderResult.performance.inp,
          speedIndex: renderResult.performance.speedIndex,
          tti: renderResult.performance.tti,
          jsExecutionTime: renderResult.performance.jsExecutionTime,
          scores: renderResult.performance.lighthouseScores as any,
          renderBlockingResources: renderResult.performance.renderBlockingResources as any,
          thirdPartyRequestCount: renderResult.performance.thirdPartyRequestCount,
        } : undefined,
        
        // Network performance (prerender/full modes - from renderResult.networkMetrics)
        network: renderResult.networkMetrics ? {
          totalRequests: renderResult.networkMetrics.totalRequests,
          totalBytes: renderResult.networkMetrics.totalBytes,
          totalDuration: renderResult.networkMetrics.totalDuration,
          breakdown: renderResult.networkMetrics.breakdown,
          compression: renderResult.networkMetrics.compression,
          statusCodes: renderResult.networkMetrics.statusCodes,
          cachedRequests: renderResult.networkMetrics.cachedRequests,
          uncachedRequests: renderResult.networkMetrics.uncachedRequests
        } : undefined,
        
        // Enhanced SEO (full/prerender modes)
        enhancedSEO,
        
        // SEO Quick Wins
        seo: (sitemapData || brokenLinksCount !== undefined || outboundDomains) ? {
          sitemap: sitemapData,
          brokenLinksCount,
          outboundDomains
        } : undefined,
        
        // Basic flags
        basicFlags: {
          hasTitle: !!pageFacts.title,
          hasMetaDescription: !!pageFacts.metaDescription,
          hasH1: !!pageFacts.h1,
          hasCanonical: !!pageFacts.canonicalResolved
        }
      };
      
      // Handle screenshots if present
      if (renderResult.screenshots) {
        const urlKey = sha256Hex(item.url).substring(0, 16); // Use URL hash as key
        const screenshotPaths: { desktop?: string; mobile?: string } = {};
        
        if (renderResult.screenshots.desktop) {
          screenshotPaths.desktop = await this.writer.writeScreenshot('desktop', urlKey, renderResult.screenshots.desktop);
          log('info', `[Scheduler] Wrote desktop screenshot (${renderResult.screenshots.desktop.length} bytes): ${screenshotPaths.desktop}`);
        }
        
        if (renderResult.screenshots.mobile) {
          screenshotPaths.mobile = await this.writer.writeScreenshot('mobile', urlKey, renderResult.screenshots.mobile);
          log('info', `[Scheduler] Wrote mobile screenshot (${renderResult.screenshots.mobile.length} bytes): ${screenshotPaths.mobile}`);
        }
        
        // Add media paths to page record
        pageRecord.media = {
          screenshots: screenshotPaths
        };
      }
      
      // Handle favicon if present (deduplicated by origin)
      if (renderResult.favicon) {
        const urlObj = new URL(item.url);
        const origin = urlObj.origin;
        
        // Check if we've already stored a favicon for this origin
        if (!this.faviconCache.has(origin)) {
          const originKey = sha256Hex(origin).substring(0, 16);
          const faviconPath = await this.writer.writeFavicon(originKey, renderResult.favicon.data, renderResult.favicon.mimeType);
          this.faviconCache.set(origin, faviconPath);
          log('info', `[Scheduler] Wrote favicon for ${origin} (${renderResult.favicon.data.length} bytes): ${faviconPath}`);
        }
        
        // Add favicon path to page record (all pages from same origin share the favicon)
        if (!pageRecord.media) {
          pageRecord.media = {};
        }
        pageRecord.media.favicon = this.faviconCache.get(origin);
      }
      
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
      
    } catch (error: any) {
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
  
  private async enqueueIfNew(url: string, depth: number, discoveredFrom: string): Promise<void> {
    log('debug', `[Enqueue] Considering URL: ${url} (from ${discoveredFrom})`);

    const normalized = this.normalizeAndApplyPolicy(url);
    log('debug', `[Enqueue] Normalized URL: ${normalized} (Original: ${url})`);

    if (!normalized) {
      log('debug', `[Enqueue] Skipping: URL normalized to null.`);
      return;
    }

    // Check maxDepth (-1 = unlimited, 0 = seeds only, N = up to depth N)
    if (this.config.maxDepth >= 0 && depth > this.config.maxDepth) {
      log('debug', `[Enqueue] Skipping: Depth ${depth} exceeds maxDepth ${this.config.maxDepth}: ${normalized}`);
      return;
    }

    // Skip if already visited or enqueued
    if (this.visited.has(normalized)) {
      log('debug', `[Enqueue] Skipping: Already visited: ${normalized}`);
      return;
    }
    if (this.enqueued.has(normalized)) {
      log('debug', `[Enqueue] Skipping: Already enqueued: ${normalized}`);
      return;
    }

    // Check maxPages before enqueuing
    // Use > instead of >= so we can enqueue up to maxPages (not maxPages-1)
    if (this.config.maxPages > 0 && this.visited.size + this.enqueued.size > this.config.maxPages) {
      log('debug', `[Enqueue] Skipping: Max pages (${this.config.maxPages}) limit reached.`);
      return;
    }

    // --- Check if the link is internal ---
    try {
       const seedUrl = new URL(this.config.seeds[0]);
       const linkUrl = new URL(normalized);
       
       // Normalize hostnames by removing www. prefix for comparison
       const normalizeDomain = (hostname: string) => hostname.replace(/^www\./i, '');
       const seedDomain = normalizeDomain(seedUrl.hostname);
       const linkDomain = normalizeDomain(linkUrl.hostname);
       
       // Compare normalized domains and protocols
       if (linkDomain !== seedDomain || linkUrl.protocol !== seedUrl.protocol) {
         log('debug', `[Enqueue] Skipping: Link is external (${normalized}) compared to seed origin (${seedUrl.origin}).`);
         return;
       }
    } catch (e: any) {
       log('warn', `[Enqueue] Error checking origin for ${normalized}: ${e.message}`);
       return;
    }
    // --- End of internal link check ---

    this.enqueued.add(normalized);
    try {
      const host = new URL(normalized).hostname;
      if (!this.hostQueues.has(host)) {
         this.hostQueues.set(host, []);
      }
      this.hostQueues.get(host)!.push({ url: normalized, depth, discoveredFrom });
      log("info", `[Enqueue] Enqueued: ${normalized} (depth=${depth})`);
    } catch (e: any) {
       log('warn', `[Enqueue] Failed to add to host queue for ${normalized}: ${e.message}`);
    }
    // this.queue.push({ url: normalized, depth, discoveredFrom });
    // log("debug", `[Queue] Enqueued: ${normalized} (depth=${depth})`);
  }
}