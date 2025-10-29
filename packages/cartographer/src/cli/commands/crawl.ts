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
import { resolveOutputPath } from "../../utils/filenameGenerator.js";
import { PrettyLogger } from "../../utils/prettyLog.js";
import type { OutputMode } from "../../utils/prettyLog.js";
import * as fs from 'fs';
import * as path from 'path';

export const crawlCommand: CommandModule = {
  command: "crawl",
  describe: "Run a crawl and write an .atls file",
  builder: (y) => y
    .option("seeds", { type: "array", demandOption: true })
    .option("out", { type: "string", describe: "Output .atls path (default: auto-generated in ./export/)" })
    .option("profile", { 
      type: "string", 
      choices: ["core", "full"], 
      describe: "Crawl profile: 'core' (SEO only, faster) or 'full' (SEO + accessibility + replay, comprehensive)"
    })
    .option("mode", { type: "string", choices: ["raw","prerender","full"], default: "full", describe: "Render mode (deprecated: use --profile instead)" })
    .option("replayTier", { 
      type: "string", 
      choices: ["html", "html+css", "full"], 
      default: "html+css",
      describe: "Replay capture tier: 'html' (bodies only), 'html+css' (+ stylesheets/fonts), 'full' (+ scripts/images)"
    })
    .option("rps", { type: "number", default: 3 })
    .option("concurrency", { type: "number", default: 8 })
    .option("respectRobots", { type: "boolean", default: true })
    .option("overrideRobots", { type: "boolean", default: false })
    .option("userAgent", { type: "string", describe: "Custom User-Agent string" })
    .option("allowUrls", { type: "array", describe: "URL patterns to allow (glob or regex). Only matching URLs will be crawled." })
    .option("denyUrls", { type: "array", describe: "URL patterns to deny (glob or regex). Matching URLs will be skipped." })
  .option("maxPages", { type: "number", default: 0 })
  .option("maxDepth", { type: "number", default: -1, describe: "Maximum crawl depth (-1 = unlimited, 0 = seeds only, 1 = seeds + 1 hop). Default: -1 (unlimited)." })
  .option("maxBytesPerPage", { type: "number", default: 50000000, describe: "Maximum bytes to load per page (default: 50MB)" })
    .option("resume", { type: "string", describe: "Resume from staging directory" })
    .option("checkpointInterval", { type: "number", default: 500, describe: "Write checkpoint every N pages" })
    .option("quiet", { type: "boolean", default: false, describe: "Suppress periodic metrics (errors still shown)" })
    .option("json", { type: "boolean", default: false, describe: "Emit final crawl summary as JSON to stdout" })
    .option("maxErrors", { type: "number", default: -1, describe: "Max errors before aborting (-1 = unlimited, 0 = abort immediately)" })
    .option("logFile", { type: "string", default: "logs/crawl-<crawlId>.jsonl", describe: "Path for NDJSON log file" })
    .option("logLevel", { type: "string", choices: ["info","warn","error","debug"], default: "info", describe: "Minimum log level" })
    .option("persistSession", { type: "boolean", default: false, describe: "Persist browser sessions per origin to bypass bot detection" })
    .option("stealth", { type: "boolean", default: false, describe: "Enable stealth mode to hide automation signals (requires playwright-extra)" })
    .option("timeout", { type: "number", default: 30000, describe: "Page load timeout in milliseconds (default: 30000)" })
    .option("validateArchive", { type: "boolean", default: true, describe: "Validate .atls archive after creation (QA check)" })
    .option("force", { type: "boolean", default: false, describe: "Overwrite existing .atls file if it exists (default: false for safety)" })
    .option("noScreenshots", { type: "boolean", default: false, describe: "Disable screenshot capture in full mode (screenshots enabled by default)" })
    .option("screenshotQuality", { type: "number", default: 80, describe: "JPEG quality for screenshots (1-100, default: 80)" })
    .option("screenshotFormat", { type: "string", choices: ["jpeg", "png"], default: "jpeg", describe: "Screenshot format (default: jpeg)" })
    .option("noFavicons", { type: "boolean", default: false, describe: "Disable favicon collection in full mode (favicons enabled by default)" })
    .option("verbose", { type: "boolean", default: false, describe: "Enable verbose output with detailed extraction data" })
    .option("minimal", { type: "boolean", default: false, describe: "Minimal output: only errors and final summary" })
    .option("noColor", { type: "boolean", default: false, describe: "Disable colored output" })
    .option("chime", { type: "boolean", default: false, describe: "Play a sound when crawl completes" })
    .option("stripCookies", { type: "boolean", default: true, describe: "Strip cookies from requests for privacy (default: true)" })
    .option("stripAuthHeaders", { type: "boolean", default: true, describe: "Strip Authorization headers for security (default: true)" })
    .option("redactInputs", { type: "boolean", default: true, describe: "Redact input field values in DOM snapshots (default: true)" })
    .option("redactForms", { type: "boolean", default: true, describe: "Redact form data (default: true)" }),
  handler: async (argv) => {
    const schema = z.object({
      seeds: z.array(z.string().url()).min(1),
      out: z.string().optional(),
      profile: z.enum(["core", "full"]).optional(),
      mode: z.enum(["raw","prerender","full"]),
      replayTier: z.enum(["html", "html+css", "full"]),
      rps: z.number().positive(),
      concurrency: z.number().positive(),
      respectRobots: z.boolean(),
      overrideRobots: z.boolean(),
      userAgent: z.string().optional(),
      allowUrls: z.array(z.string()).optional(),
      denyUrls: z.array(z.string()).optional(),
      maxPages: z.number().nonnegative(),
      maxDepth: z.number().int(),
      resume: z.string().optional(),
      checkpointInterval: z.number().positive(),
      quiet: z.boolean(),
      json: z.boolean(),
      maxErrors: z.number().int(),
      logFile: z.string(),
      logLevel: z.enum(["info","warn","error","debug"]),
      persistSession: z.boolean(),
      stealth: z.boolean(),
      validateArchive: z.boolean(),
      force: z.boolean(),
      noScreenshots: z.boolean(),
      screenshotQuality: z.number().min(1).max(100),
      screenshotFormat: z.enum(["jpeg", "png"]),
      noFavicons: z.boolean(),
      verbose: z.boolean(),
      minimal: z.boolean(),
      noColor: z.boolean(),
      chime: z.boolean(),
      stripCookies: z.boolean(),
      stripAuthHeaders: z.boolean(),
      redactInputs: z.boolean(),
      redactForms: z.boolean()
    });
    const cfg = schema.parse(argv);
    
    // Apply profile presets if --profile specified
    if (cfg.profile) {
      if (cfg.profile === 'core') {
        // Core profile: prerender mode, minimal datasets, faster
        cfg.mode = 'prerender';
        cfg.noScreenshots = true;
        cfg.noFavicons = true;
        cfg.replayTier = 'html'; // Minimal replay capability
        if (!argv.quiet) {
          console.log('[Cartographer] Using CORE profile: prerender mode, SEO-only (faster, smaller archives)');
        }
      } else if (cfg.profile === 'full') {
        // Full profile: full mode, all datasets, comprehensive
        cfg.mode = 'full';
        cfg.noScreenshots = false;
        cfg.noFavicons = false;
        cfg.replayTier = 'full'; // Full replay with JS and images
        if (!argv.quiet) {
          console.log('[Cartographer] Using FULL profile: full mode, SEO + accessibility + full replay (comprehensive)');
        }
      }
    }

    // Resolve output path (auto-generate if not provided)
    const outAtls = await resolveOutputPath(cfg.out, {
      seedUrl: cfg.seeds[0],
      mode: cfg.mode
    });

    // Safety check: prevent overwriting existing .atls unless --force
    if (!cfg.force && fs.existsSync(outAtls)) {
      console.error(`[ERROR] Output file already exists: ${outAtls}`);
      console.error(`[ERROR] Use --force to overwrite, or specify a different --out path.`);
      process.exit(4); // Exit code 4: IO/Write error
    }

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
    
    // Determine screenshot capture: enabled by default in full mode unless --noScreenshots
    const captureScreenshots = cfg.mode === 'full' && !cfg.noScreenshots;
    
    // Info message if screenshots disabled in full mode
    if (cfg.mode === 'full' && cfg.noScreenshots) {
      console.log("[INFO] Screenshot capture disabled via --noScreenshots");
    }
    
    // Determine favicon collection: enabled by default in full mode unless --noFavicons
    const captureFavicons = cfg.mode === 'full' && !cfg.noFavicons;
    
    // Info message if favicons disabled in full mode
    if (cfg.mode === 'full' && cfg.noFavicons) {
      console.log("[INFO] Favicon collection disabled via --noFavicons");
    }

    // Build config for Cartographer API
    const crawlConfig = {
      seeds: cfg.seeds as string[],
      outAtls,
      render: {
        mode: cfg.mode,
        concurrency: cfg.concurrency,
        timeoutMs: typeof argv.timeout === 'number' ? argv.timeout : 30000,
        maxRequestsPerPage: 250, // Default increased from 100 to 250
        maxBytesPerPage: typeof argv.maxBytesPerPage === 'number' && !isNaN(argv.maxBytesPerPage)
          ? argv.maxBytesPerPage
          : (typeof DEFAULT_CONFIG.render?.maxBytesPerPage === 'number' ? DEFAULT_CONFIG.render.maxBytesPerPage : 50_000_000)
      },
      replay: {
        tier: cfg.replayTier
      },
      http: { rps: cfg.rps, userAgent },
      discovery: { 
        followExternal: false, 
  paramPolicy: parseParamPolicy((argv as any).paramPolicy),
        blockList: ["gclid", "fbclid", "msclkid", "yclid", "irclickid", "utm_*", "mc_cid", "mc_eid", "ref", "ref_*"],
        allowUrls: cfg.allowUrls,
        denyUrls: cfg.denyUrls
      },
      robots: { respect: cfg.respectRobots, overrideUsed: cfg.overrideRobots },
      privacy: {
        stripCookies: cfg.stripCookies,
        stripAuthHeaders: cfg.stripAuthHeaders,
        redactInputValues: cfg.redactInputs,
        redactForms: cfg.redactForms
      },
      maxPages: cfg.maxPages,
      maxDepth: cfg.maxDepth,
      checkpoint: { interval: cfg.checkpointInterval, enabled: true },
      resume: cfg.resume ? { stagingDir: cfg.resume } : undefined,
      manifestNotes,
      media: {
        screenshots: {
          enabled: captureScreenshots,
          desktop: true, // Always capture desktop if enabled
          mobile: true,  // Always capture mobile if enabled
          quality: cfg.screenshotQuality,
          format: cfg.screenshotFormat
        },
        favicons: {
          enabled: captureFavicons
        }
      },
      cli: {
        quiet: cfg.quiet,
        json: cfg.json,
        maxErrors: cfg.maxErrors,
        logFile: cfg.logFile,
        logLevel: cfg.logLevel,
        persistSession: cfg.persistSession,
        stealth: cfg.stealth,
        validateArchive: cfg.validateArchive
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

    // Initialize pretty logger
    let outputMode: OutputMode = "compact";
    if (cfg.minimal) outputMode = "minimal";
    if (cfg.verbose) outputMode = "verbose";
    
    const prettyLogger = new PrettyLogger({
      mode: outputMode,
      colors: !cfg.noColor && process.stderr.isTTY,
      chime: cfg.chime
    });

    // Show banner unless in json/quiet/minimal mode
    if (!asJson && !quiet && !cfg.minimal) {
      prettyLogger.logBanner({
        seeds: crawlConfig.seeds,
        mode: crawlConfig.render.mode,
        stealth: crawlConfig.cli?.stealth || false,
        concurrency: crawlConfig.render.concurrency,
        rps: crawlConfig.http.rps,
        maxPages: crawlConfig.maxPages,
        maxDepth: crawlConfig.maxDepth,
        outAtls: crawlConfig.outAtls
      });
    }

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
          // Output full JSON summary (enriched event from scheduler)
          process.stdout.write(
            JSON.stringify({
              crawlId: ev.crawlId,
              outFile: ev.manifestPath,
              summary: ev.summary,
              perf: ev.perf,
              notes: ev.notes
            }, null, 2) + '\n'
          );
        } else if (!quiet && !cfg.minimal) {
          // Show pretty summary
          const durationSec = Math.floor((ev.summary?.durationMs || 0) / 1000);
          prettyLogger.logSummary({
            durationSec,
            pages: ev.summary?.pages || 0,
            edges: ev.summary?.edges || 0,
            assets: ev.summary?.assets || 0,
            errors: ev.summary?.errors || 0,
            errorBudget: cfg.maxErrors > 0 ? cfg.maxErrors : 100,
            pagesPerSec: ev.perf?.avgPagesPerSec || 0,
            peakRssMB: ev.perf?.peakRssMB || 0,
            avgRssMB: ev.perf?.peakRssMB || 0, // Use peak for now, avg not in event
            outAtls: ev.manifestPath
          });
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
      
      // Show spinner in quiet mode
      let spinnerInterval: NodeJS.Timeout | null = null;
      if (quiet && !asJson && process.stderr.isTTY) {
        const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let frameIndex = 0;
        process.stderr.write('\n');
        spinnerInterval = setInterval(() => {
          const frame = spinnerFrames[frameIndex];
          process.stderr.write(`\r${frame} Crawl in progress...`);
          frameIndex = (frameIndex + 1) % spinnerFrames.length;
        }, 80);
      }
      
      await crawlFinishedPromise;
      
      // Clear spinner
      if (spinnerInterval) {
        clearInterval(spinnerInterval);
        process.stderr.write('\r\x1b[K'); // Clear line
      }
      
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
