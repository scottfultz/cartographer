/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { startJob } from "../../core/startJob.js";
import { z } from "zod";
import { DEFAULT_CONFIG } from "../../core/config.js";
export const crawlCommand = {
    command: "crawl",
    describe: "Run a crawl and write an .atls file",
    builder: (y) => y
        .option("seeds", { type: "array", demandOption: true })
        .option("out", { type: "string", demandOption: true })
        .option("mode", { type: "string", choices: ["raw", "prerender", "full"], default: "prerender" })
        .option("rps", { type: "number", default: 3 })
        .option("concurrency", { type: "number", default: 8 })
        .option("respectRobots", { type: "boolean", default: true })
        .option("overrideRobots", { type: "boolean", default: false })
        .option("userAgent", { type: "string", describe: "Custom User-Agent string" })
        .option("maxPages", { type: "number", default: 0 })
        .option("resume", { type: "string", describe: "Resume from staging directory" })
        .option("checkpointInterval", { type: "number", default: 500, describe: "Write checkpoint every N pages" })
        .option("quiet", { type: "boolean", default: false, describe: "Suppress periodic metrics (errors still shown)" })
        .option("json", { type: "boolean", default: false, describe: "Emit final crawl summary as JSON to stdout" })
        .option("errorBudget", { type: "number", default: 0, describe: "Max errors before aborting (0 = unlimited)" })
        .option("logFile", { type: "string", default: "logs/crawl-<crawlId>.jsonl", describe: "Path for NDJSON log file" })
        .option("logLevel", { type: "string", choices: ["info", "warn", "error", "debug"], default: "info", describe: "Minimum log level" }),
    handler: async (argv) => {
        const schema = z.object({
            seeds: z.array(z.string().url()).min(1),
            out: z.string(),
            mode: z.enum(["raw", "prerender", "full"]),
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
            logLevel: z.enum(["info", "warn", "error", "debug"])
        });
        const cfg = schema.parse(argv);
        const userAgent = cfg.userAgent || DEFAULT_CONFIG.http?.userAgent || "CartographerBot/1.0 (+contact:continuum)";
        const manifestNotes = [];
        if (cfg.overrideRobots && cfg.respectRobots) {
            const warning = "Robots override used. Only crawl sites you administer. Owner: Cai Frazier.";
            console.warn(warning);
            manifestNotes.push(warning);
        }
        if (cfg.userAgent) {
            manifestNotes.push(`Custom User-Agent: ${cfg.userAgent}`);
        }
        const exitCode = await startJob({
            seeds: cfg.seeds,
            outAtls: cfg.out,
            render: { mode: cfg.mode, concurrency: cfg.concurrency, timeoutMs: 30000, maxRequestsPerPage: 100, maxBytesPerPage: 10_000_000 },
            http: { rps: cfg.rps, userAgent },
            discovery: {
                followExternal: false,
                paramPolicy: "sample",
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
        });
        process.exit(exitCode);
    }
};
//# sourceMappingURL=crawl.js.map