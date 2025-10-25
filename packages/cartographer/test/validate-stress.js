#!/usr/bin/env node
/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
/**
 * Stress test validation script
 * Checks for zombie processes and validates performance metrics
 */
import { execSync } from "child_process";
import * as fs from "fs";
function checkZombieProcesses() {
    try {
        const output = execSync("ps aux | grep -i chromium | grep -v grep", { encoding: "utf-8" }).trim();
        if (output) {
            return {
                passed: false,
                message: `Found ${output.split("\n").length} zombie Chromium process(es):\n${output}`
            };
        }
        return { passed: true, message: "No zombie Chromium processes found" };
    }
    catch (error) {
        // grep returns exit code 1 when no matches found - this is good!
        return { passed: true, message: "No zombie Chromium processes found" };
    }
}
function validatePerformanceMetrics(perfPath, maxRssMB) {
    if (!fs.existsSync(perfPath)) {
        return [{ passed: false, message: `Performance file not found: ${perfPath}` }];
    }
    const perf = JSON.parse(fs.readFileSync(perfPath, "utf-8"));
    const results = [];
    // Check peak RSS is within bounds
    if (perf.memory.peakRssMB > maxRssMB) {
        results.push({
            passed: false,
            message: `Peak RSS (${perf.memory.peakRssMB} MB) exceeded limit (${maxRssMB} MB)`
        });
    }
    else {
        results.push({
            passed: true,
            message: `Peak RSS (${perf.memory.peakRssMB} MB) within limit (${maxRssMB} MB)`
        });
    }
    // Check that we got timing data
    if (perf.timings.fetch.count === 0) {
        results.push({ passed: false, message: "No fetch timing data collected" });
    }
    else {
        results.push({
            passed: true,
            message: `Collected timing data for ${perf.timings.fetch.count} page(s)`
        });
    }
    // Check throughput is reasonable (> 0.1 pages/sec)
    if (perf.throughput.avgPagesPerSec < 0.1) {
        results.push({
            passed: false,
            message: `Throughput too low: ${perf.throughput.avgPagesPerSec} pages/sec`
        });
    }
    else {
        results.push({
            passed: true,
            message: `Throughput: ${perf.throughput.avgPagesPerSec} pages/sec`
        });
    }
    // Report percentile timings
    results.push({
        passed: true,
        message: `Fetch timings - p50: ${perf.timings.fetch.p50}ms, p95: ${perf.timings.fetch.p95}ms, p99: ${perf.timings.fetch.p99}ms`
    });
    results.push({
        passed: true,
        message: `Render timings - p50: ${perf.timings.render.p50}ms, p95: ${perf.timings.render.p95}ms, p99: ${perf.timings.render.p99}ms`
    });
    return results;
}
// Main validation
console.log("\n=== Stress Test Validation ===\n");
const perfPath = process.argv[2] || "./tmp/stress-test.perf.json";
const maxRssMB = parseInt(process.argv[3] || "2048", 10);
console.log(`Performance file: ${perfPath}`);
console.log(`Max RSS limit: ${maxRssMB} MB\n`);
// Check zombie processes
const zombieCheck = checkZombieProcesses();
console.log(`[${zombieCheck.passed ? "✓" : "✗"}] ${zombieCheck.message}`);
// Validate metrics
const metricChecks = validatePerformanceMetrics(perfPath, maxRssMB);
metricChecks.forEach(check => {
    console.log(`[${check.passed ? "✓" : "✗"}] ${check.message}`);
});
// Overall result
const allPassed = zombieCheck.passed && metricChecks.every(c => c.passed);
console.log(`\n=== ${allPassed ? "PASSED" : "FAILED"} ===\n`);
process.exit(allPassed ? 0 : 1);
//# sourceMappingURL=validate-stress.js.map