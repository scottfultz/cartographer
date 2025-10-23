/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { startJob } from "../../core/startJob.js";
import { z } from "zod";
import { DEFAULT_CONFIG } from "../../core/config.js";
import * as fs from "fs";
export const stressCommand = {
    command: "stress",
    describe: "Run high-volume stress test with periodic CSV reporting",
    builder: (y) => y
        .option("seeds", { type: "array", demandOption: true, describe: "Starting URLs" })
        .option("out", { type: "string", demandOption: true, describe: "Output .atls path" })
        .option("targetPages", { type: "number", default: 10000, describe: "Target number of pages to crawl" })
        .option("mode", { type: "string", choices: ["raw", "prerender", "full"], default: "prerender" })
        .option("rps", { type: "number", default: 5, describe: "Requests per second" })
        .option("concurrency", { type: "number", default: 10, describe: "Concurrent browser pages" })
        .option("maxRssMB", { type: "number", default: 2048, describe: "Max RSS before pausing" })
        .option("reportCsv", { type: "string", describe: "Path for per-minute CSV report" }),
    handler: async (argv) => {
        const schema = z.object({
            seeds: z.array(z.string().url()).min(1),
            out: z.string(),
            targetPages: z.number().positive(),
            mode: z.enum(["raw", "prerender", "full"]),
            rps: z.number().positive(),
            concurrency: z.number().positive(),
            maxRssMB: z.number().positive(),
            reportCsv: z.string().optional()
        });
        const cfg = schema.parse(argv);
        console.log("\n=== Cartographer Stress Test ===");
        console.log(`Seeds: ${cfg.seeds.join(", ")}`);
        console.log(`Target Pages: ${cfg.targetPages}`);
        console.log(`Mode: ${cfg.mode} | RPS: ${cfg.rps} | Concurrency: ${cfg.concurrency}`);
        console.log(`Max RSS: ${cfg.maxRssMB} MB`);
        if (cfg.reportCsv) {
            console.log(`CSV Report: ${cfg.reportCsv}`);
        }
        console.log("================================\n");
        const userAgent = DEFAULT_CONFIG.http?.userAgent || "CartographerBot/1.0 (+stress-test)";
        await startJob({
            seeds: cfg.seeds,
            outAtls: cfg.out,
            render: {
                mode: cfg.mode,
                concurrency: cfg.concurrency,
                timeoutMs: 30000,
                maxRequestsPerPage: 100,
                maxBytesPerPage: 10_000_000
            },
            http: { rps: cfg.rps, userAgent },
            discovery: {
                followExternal: false,
                paramPolicy: "sample",
                blockList: ["gclid", "fbclid", "msclkid", "yclid", "irclickid", "utm_*", "mc_cid", "mc_eid", "ref", "ref_*"]
            },
            robots: { respect: true, overrideUsed: false },
            memory: { maxRssMB: cfg.maxRssMB },
            maxPages: cfg.targetPages,
            manifestNotes: [`Stress test: target ${cfg.targetPages} pages`]
        });
        // Generate CSV report if requested
        if (cfg.reportCsv) {
            const perfPath = cfg.out.replace(/\.atls$/, ".perf.json");
            if (fs.existsSync(perfPath)) {
                const perfData = JSON.parse(fs.readFileSync(perfPath, "utf-8"));
                generateStressReport(perfData, cfg.reportCsv);
                console.log(`\nStress report written to: ${cfg.reportCsv}`);
            }
        }
        console.log("\n=== Stress Test Complete ===\n");
    }
};
/**
 * Generate CSV report from performance summary
 */
function generateStressReport(perf, csvPath) {
    const rows = [
        "metric,value",
        `duration_seconds,${perf.duration.totalSeconds}`,
        `total_pages,${perf.counts.totalPages}`,
        `total_edges,${perf.counts.totalEdges}`,
        `total_assets,${perf.counts.totalAssets}`,
        `total_errors,${perf.counts.totalErrors}`,
        `avg_pages_per_sec,${perf.throughput.avgPagesPerSec}`,
        `bytes_written,${perf.throughput.bytesWritten}`,
        `bytes_written_mb,${perf.throughput.bytesWrittenMB}`,
        `current_rss_mb,${perf.memory.currentRssMB}`,
        `peak_rss_mb,${perf.memory.peakRssMB}`,
        `fetch_p50_ms,${perf.timings.fetch.p50}`,
        `fetch_p95_ms,${perf.timings.fetch.p95}`,
        `fetch_p99_ms,${perf.timings.fetch.p99}`,
        `render_p50_ms,${perf.timings.render.p50}`,
        `render_p95_ms,${perf.timings.render.p95}`,
        `render_p99_ms,${perf.timings.render.p99}`,
        `extract_p50_ms,${perf.timings.extract.p50}`,
        `extract_p95_ms,${perf.timings.extract.p95}`,
        `extract_p99_ms,${perf.timings.extract.p99}`,
        `write_p50_ms,${perf.timings.write.p50}`,
        `write_p95_ms,${perf.timings.write.p95}`,
        `write_p99_ms,${perf.timings.write.p99}`
    ];
    fs.writeFileSync(csvPath, rows.join("\n") + "\n");
}
//# sourceMappingURL=stress.js.map