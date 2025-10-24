/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { EngineConfig } from "./types.js";
import { buildConfig } from "./config.js";
import { log, setLogLevel, initLogging, closeLogFile, getLogFilePath, logEvent } from "../utils/logging.js";
import { AtlasWriter } from "../io/atlas/writer.js";
import { Scheduler } from "./scheduler.js";
import { initBrowser, closeBrowser } from "./renderer.js";
import { readCheckpoint } from "./checkpoint.js";
import { EXIT_OK, EXIT_ERR_RENDER, EXIT_ERR_WRITE, EXIT_ERR_UNKNOWN, type CrawlResult, decideExitCode } from "../utils/exitCodes.js";
import * as fs from "fs";

/**
 * Main job orchestration
 * Coordinates crawling, rendering, extraction, and Atlas file writing
 * Returns exit code
 */
export async function startJob(partialConfig: Partial<EngineConfig>): Promise<number> {
  const startTime = Date.now();
  const config = buildConfig(partialConfig);
  
  // Extract CLI options
  const logLevel = config.cli?.logLevel || "info";
  const quiet = config.cli?.quiet || false;
  const jsonMode = config.cli?.json || false;
  const logFile = config.cli?.logFile || "logs/crawl-<crawlId>.jsonl";
  
  // Set basic logging (no file yet - we need crawlId first)
  setLogLevel(logLevel);
  
  // Check if resuming
  let resumeCrawlId: string | undefined;
  if (config.resume?.stagingDir) {
    const state = readCheckpoint(config.resume.stagingDir);
    if (state) {
      resumeCrawlId = state.crawlId;
      log("info", `Resuming crawl ${resumeCrawlId} from checkpoint...`);
    }
  } else {
    log("info", `Cartographer Engine starting...`);
  }
  
  log("info", `Seeds: ${config.seeds.join(", ")}`);
  log("info", `Output: ${config.outAtls}`);
  log("info", `Mode: ${config.render.mode}, RPS: ${config.http.rps}, Concurrency: ${config.render.concurrency}`);
  
  // Initialize Atlas writer with staging directory (use existing crawlId if resuming)
  const writer = new AtlasWriter(config.outAtls, config, resumeCrawlId);
  await writer.init();
  
  const crawlId = writer.getCrawlId();
  
  // NOW initialize logging with actual crawlId
  initLogging({
    level: logLevel,
    quiet,
    json: jsonMode,
    logFile: logFile,
    crawlId
  });
  
  const result: CrawlResult = {
    success: false,
    errorCount: 0
  };
  
  try {
    // Log crawl start event
    logEvent({
      ts: new Date().toISOString(),
      level: "info",
      event: "crawl.started",
      crawlId,
      seeds: config.seeds,
      mode: config.render.mode,
      paramPolicy: config.discovery.paramPolicy,
      rps: config.http.rps
    });
    
    // Initialize browser if needed
    if (config.render.mode !== "raw") {
      try {
        await initBrowser(config);
      } catch (error) {
        log("error", `Failed to initialize browser: ${error}`);
        result.fatalError = 'render';
        const exitCode = decideExitCode(result);
        
        closeLogFile();
        return exitCode;
      }
    }
    
    // Create scheduler and start crawl
    const scheduler = new Scheduler(config, writer);
    const schedulerResult = await scheduler.run();
    
    // Check if error budget was exceeded
    if (schedulerResult.errorBudgetExceeded) {
      result.errorBudgetExceeded = true;
    }
    
    result.errorCount = schedulerResult.errorCount;
    
    // Finalize Atlas file
    log("info", "Finalizing .atls archive...");
    try {
      await writer.finalize();
    } catch (error) {
      log("error", `Failed to finalize archive: ${error}`);
      result.fatalError = 'write';
      const exitCode = decideExitCode(result);
      
      closeLogFile();
      return exitCode;
    }
    
    // Write performance summary
    const perfSummary = scheduler.getMetrics().getSummary();
    const perfPath = config.outAtls.replace(/\.atls$/, ".perf.json");
    fs.writeFileSync(perfPath, JSON.stringify(perfSummary, null, 2));
    log("info", `Performance metrics written to: ${perfPath}`);
    
    const duration = Date.now() - startTime;
    log("info", `Crawl complete in ${(duration / 1000).toFixed(1)}s`);
    log("info", `Archive written to: ${config.outAtls}`);
    
    const summary = writer.getSummary();
    
    // Log crawl finish event
    logEvent({
      ts: new Date().toISOString(),
      level: "info",
      event: "crawl.finished",
      crawlId,
      durationMs: duration,
      pages: summary.stats.totalPages,
      edges: summary.stats.totalEdges,
      assets: summary.stats.totalAssets,
      errors: summary.stats.totalErrors,
      atls: config.outAtls
    });
    
    // If JSON mode, emit summary to stdout
    if (jsonMode) {
      const jsonSummary = {
        crawlId,
        outFile: config.outAtls,
        summary: {
          pages: summary.stats.totalPages,
          edges: summary.stats.totalEdges,
          assets: summary.stats.totalAssets,
          errors: summary.stats.totalErrors,
          durationMs: duration
        },
        perf: {
          avgPagesPerSec: perfSummary.throughput.avgPagesPerSec || 0,
          peakRssMB: perfSummary.memory.peakRssMB || 0
        },
        notes: [
          `Checkpoint interval: ${config.checkpoint?.interval || 500} pages`,
          `Graceful shutdown: ${schedulerResult.gracefulShutdown || false}`,
          ...(schedulerResult.errorBudgetExceeded ? ["Terminated: error budget exceeded"] : [])
        ]
      };
      
      // Write to stdout (bypass logging)
      process.stdout.write(JSON.stringify(jsonSummary, null, 2) + '\n');
    }
    
    result.success = !result.errorBudgetExceeded;
    result.summary = summary;
    
  } catch (error) {
    log("error", `Job failed: ${error}`);
    await writer.cleanup();
    result.fatalError = 'unknown';
    
  } finally {
    // Clean up browser
    if (config.render.mode !== "raw") {
      await closeBrowser();
    }
    
    // Close log file
    const logFilePath = getLogFilePath();
    closeLogFile();
    if (logFilePath) {
      log("info", `Structured logs written to: ${logFilePath}`);
    }
  }
  
  return decideExitCode(result);
}
