// Strict paramPolicy enum guard
const PARAM_POLICIES = new Set(['keep','sample','strip'] as const);
function parseParamPolicy(input: unknown, fallback: 'keep'|'sample'|'strip' = 'keep'): 'keep'|'sample'|'strip' {
  if (typeof input === 'string' && PARAM_POLICIES.has(input as any)) return input as any;
  console.warn(`[Cartographer CLI] Invalid paramPolicy: ${input}, falling back to '${fallback}'`);
  return fallback;
}
/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { CommandModule } from "yargs";
import { startJob } from "../../core/startJob.js";
import { z } from "zod";
import { DEFAULT_CONFIG } from "../../core/config.js";
import * as fs from 'fs';
import * as path from 'path';

export const crawlCommand: CommandModule = {
  command: "crawl",
  describe: "Run a crawl and write an .atls file",
  builder: (y) => y
    .option("seeds", { type: "array", demandOption: true })
    .option("out", { type: "string", demandOption: true })
    .option("mode", { type: "string", choices: ["raw","prerender","full"], default: "prerender" })
    .option("rps", { type: "number", default: 3 })
    .option("concurrency", { type: "number", default: 8 })
    .option("respectRobots", { type: "boolean", default: true })
    .option("overrideRobots", { type: "boolean", default: false })
    .option("userAgent", { type: "string", describe: "Custom User-Agent string" })
  .option("maxPages", { type: "number", default: 0 })
  .option("maxBytesPerPage", { type: "number", default: 50000000, describe: "Maximum bytes to load per page (default: 50MB)" })
    .option("resume", { type: "string", describe: "Resume from staging directory" })
    .option("checkpointInterval", { type: "number", default: 500, describe: "Write checkpoint every N pages" })
    .option("quiet", { type: "boolean", default: false, describe: "Suppress periodic metrics (errors still shown)" })
    .option("json", { type: "boolean", default: false, describe: "Emit final crawl summary as JSON to stdout" })
    .option("errorBudget", { type: "number", default: 0, describe: "Max errors before aborting (0 = unlimited)" })
    .option("logFile", { type: "string", default: "logs/crawl-<crawlId>.jsonl", describe: "Path for NDJSON log file" })
    .option("logLevel", { type: "string", choices: ["info","warn","error","debug"], default: "info", describe: "Minimum log level" }),
  handler: async (argv) => {
    const schema = z.object({
      seeds: z.array(z.string().url()).min(1),
      out: z.string(),
      mode: z.enum(["raw","prerender","full"]),
      rps: z.number().positive(),
      concurrency: z.number().positive(),
      respectRobots: z.boolean(),
      overrideRobots: z.boolean(),
      userAgent: z.string().optional(),
      maxPages: z.number().nonnegative(),
      resume: z.string().optional(),
      checkpointInterval: z.number().positive(),
      quiet: z.boolean(),
      json: z.boolean(),
      errorBudget: z.number().nonnegative(),
      logFile: z.string(),
      logLevel: z.enum(["info","warn","error","debug"])
    });
    const cfg = schema.parse(argv);

    const userAgent = cfg.userAgent || DEFAULT_CONFIG.http?.userAgent || "CartographerBot/1.0 (+contact:continuum)";
    const manifestNotes: string[] = [];

    if (cfg.overrideRobots && cfg.respectRobots) {
      const warning = "Robots override used. Only crawl sites you administer. Owner: Cai Frazier.";
      console.warn(warning);
      manifestNotes.push(warning);
    }

    if (cfg.userAgent) {
      manifestNotes.push(`Custom User-Agent: ${cfg.userAgent}`);
    }

    // Build config for Cartographer API
    const crawlConfig = {
      seeds: cfg.seeds as string[],
      outAtls: cfg.out,
      render: {
        mode: cfg.mode,
        concurrency: cfg.concurrency,
        timeoutMs: 30000,
        maxRequestsPerPage: 250, // Default increased from 100 to 250
        maxBytesPerPage: typeof argv.maxBytesPerPage === 'number' && !isNaN(argv.maxBytesPerPage)
          ? argv.maxBytesPerPage
          : (typeof DEFAULT_CONFIG.render?.maxBytesPerPage === 'number' ? DEFAULT_CONFIG.render.maxBytesPerPage : 50_000_000)
      },
      http: { rps: cfg.rps, userAgent },
      discovery: { 
        followExternal: false, 
  paramPolicy: parseParamPolicy((argv as any).paramPolicy),
        blockList: ["gclid", "fbclid", "msclkid", "yclid", "irclickid", "utm_*", "mc_cid", "mc_eid", "ref", "ref_*"]
      },
      robots: { respect: cfg.respectRobots, overrideUsed: cfg.overrideRobots },
      maxPages: cfg.maxPages,
      checkpoint: { interval: cfg.checkpointInterval, enabled: true },
      resume: cfg.resume ? { stagingDir: cfg.resume } : undefined,
      manifestNotes,
      cli: {
        quiet: cfg.quiet,
        json: cfg.json,
        errorBudget: cfg.errorBudget,
        logFile: cfg.logFile,
        logLevel: cfg.logLevel
      }
    };

    // Use Cartographer API
    const { Cartographer } = await import("../../engine/cartographer.js");
    const cart = new Cartographer();
    let lastHeartbeat = "";
    let exitCode = 0;
    let manifestPath = "";
    let incomplete = false;

    const asJson = cfg.json === true;
    const quiet = cfg.quiet === true;
    function outStd(msg: string) { if (!asJson && !quiet) process.stdout.write(msg + '\n'); }
    function outErr(msg: string) { if (!asJson) process.stderr.write(msg + '\n'); }

    cart.on("crawl.heartbeat", (ev) => {
      if (!asJson && !quiet && process.stderr.isTTY && ev.type === "crawl.heartbeat") {
        const t = Math.floor((Date.now() - new Date(ev.progress.startedAt).getTime()) / 1000);
        const mm = String(Math.floor(t / 60)).padStart(2, "0");
        const ss = String(t % 60).padStart(2, "0");
        process.stderr.write(`\r[t=${mm}:${ss}] q=${ev.progress.queued} in=${ev.progress.inFlight} done=${ev.progress.completed} err=${ev.progress.errors} rps≈${ev.progress.pagesPerSecond}  `);
      }
    });

    cart.on("crawl.finished", (ev) => {
      if (ev.type === "crawl.finished") {
        manifestPath = ev.manifestPath;
        incomplete = ev.incomplete;
        // Set the process.exitCode directly here, Node will use it on normal exit
        process.exitCode = incomplete ? 2 : 0;
        if (asJson) {
          // Print exactly one JSON object to stdout, nothing else
          process.stdout.write(
            JSON.stringify({
              event: 'crawl.finished',
              crawlId: ev.crawlId,
              manifestPath: ev.manifestPath,
              incomplete: ev.incomplete
            }) + '\n'
          );
        } else {
          outStd(`Finished ${ev.crawlId} manifest=${ev.manifestPath} incomplete=${ev.incomplete}`);
        }
        // DO NOT call process.exit() here
      }
    });

    cart.on("crawl.started", (ev) => {
      // Always create NDJSON log file and write crawl.started event
      if (cfg.logFile) {
        const logPath = path.resolve(cfg.logFile.replace('<crawlId>', ev.crawlId));
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.appendFileSync(logPath, JSON.stringify({ type: 'crawl.started', crawlId: ev.crawlId, timestamp: new Date().toISOString() }) + '\n');
      }
      if (ev.type === "crawl.started" && !asJson && !quiet) {
        outStd(`Started ${ev.crawlId} seeds=${crawlConfig.seeds.length} rps=${crawlConfig.http.rps} out=${crawlConfig.outAtls}`);
      }
    });

    // Fix paramPolicy type
    crawlConfig.discovery.paramPolicy = crawlConfig.discovery.paramPolicy as "sample" | "strip" | "keep";

    // Import event bus
    const bus = (await import('../../core/events.js')).default;

    // Set up a promise that resolves when crawl.finished is emitted
    const crawlFinishedPromise = new Promise((resolve, reject) => {
      const off_finished = bus.once('crawl.finished', (event) => {
        outStd(`[CLI] Crawl finished event received.`);
        resolve(event);
      });
      // Optional: error handling
      const off_error = bus.on('error.occurred', (event) => {
        outErr(`[CLI] Error occurred during crawl: ${event.error?.message || event}`);
      });
      process.on('exit', () => {
        off_finished();
        off_error();
      });
    });

    try {
      outStd(`[CLI] Starting crawl...`);
      await cart.start(crawlConfig); // returns immediately
      outStd(`[CLI] Cartographer started. Waiting for crawl completion...`);
      await crawlFinishedPromise;
      outStd(`[CLI] Crawl completed. Exiting.`);
    } catch (error: any) {
      outErr(`[CLI] Crawl failed to start or run: ${error?.message || error}`);
      process.exitCode = 1;
    }
    // Robust finalize/close with error logging
    try {
      outStd(`[CLI] Finalizing AtlasWriter and closing resources...`);
      await cart.close();
      outStd(`[CLI] Finalization and close complete.`);
    } catch (closeError: any) {
      outErr(`[CLI] Error during finalization/close: ${closeError?.message || closeError}`);
      process.exitCode = 2;
    }
  }
};
