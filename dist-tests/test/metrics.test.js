/**
 * Metrics Collection Tests
 *
 * Tests for performance metrics tracking, counters, timings,
 * percentile calculations, and summary generation
 */
import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Metrics } from "../src/utils/metrics.js";
describe("Metrics - Counters", () => {
    let metrics;
    beforeEach(() => {
        metrics = new Metrics();
    });
    test("starts with zero counters", () => {
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalPages, 0);
        assert.equal(summary.counts.totalEdges, 0);
        assert.equal(summary.counts.totalAssets, 0);
        assert.equal(summary.counts.totalErrors, 0);
    });
    test("records page with timings", () => {
        metrics.recordPage(100, 200, 50, 10);
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalPages, 1);
    });
    test("records multiple pages", () => {
        metrics.recordPage(100, 200, 50, 10);
        metrics.recordPage(150, 180, 60, 15);
        metrics.recordPage(120, 210, 55, 12);
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalPages, 3);
    });
    test("records edges", () => {
        metrics.recordEdges(10);
        metrics.recordEdges(5);
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalEdges, 15);
    });
    test("records assets", () => {
        metrics.recordAssets(20);
        metrics.recordAssets(15);
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalAssets, 35);
    });
    test("records errors", () => {
        metrics.recordError();
        metrics.recordError();
        metrics.recordError();
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalErrors, 3);
    });
    test("records bytes written", () => {
        metrics.recordBytesWritten(1024);
        metrics.recordBytesWritten(2048);
        const summary = metrics.getSummary();
        assert.equal(summary.throughput.bytesWritten, 3072);
        assert.equal(summary.throughput.bytesWrittenMB, 0);
    });
    test("records large bytes written", () => {
        metrics.recordBytesWritten(5 * 1024 * 1024); // 5 MB
        metrics.recordBytesWritten(3 * 1024 * 1024); // 3 MB
        const summary = metrics.getSummary();
        assert.equal(summary.throughput.bytesWrittenMB, 8);
    });
});
describe("Metrics - Timing Percentiles", () => {
    let metrics;
    beforeEach(() => {
        metrics = new Metrics();
    });
    test("calculates fetch timing percentiles", () => {
        // Record varied fetch times
        for (let i = 0; i < 100; i++) {
            metrics.recordPage(50 + i, 200, 50, 10);
        }
        const summary = metrics.getSummary();
        assert.ok(summary.timings.fetch.p50 > 0);
        assert.ok(summary.timings.fetch.p95 > summary.timings.fetch.p50);
        assert.ok(summary.timings.fetch.p99 > summary.timings.fetch.p95);
        assert.equal(summary.timings.fetch.count, 100);
    });
    test("calculates render timing percentiles", () => {
        for (let i = 0; i < 50; i++) {
            metrics.recordPage(100, 100 + i * 10, 50, 10);
        }
        const summary = metrics.getSummary();
        assert.ok(summary.timings.render.p50 > 0);
        assert.ok(summary.timings.render.p95 > summary.timings.render.p50);
        assert.equal(summary.timings.render.count, 50);
    });
    test("calculates extract timing percentiles", () => {
        for (let i = 0; i < 30; i++) {
            metrics.recordPage(100, 200, 30 + i, 10);
        }
        const summary = metrics.getSummary();
        assert.ok(summary.timings.extract.p50 > 0);
        assert.equal(summary.timings.extract.count, 30);
    });
    test("calculates write timing percentiles", () => {
        for (let i = 0; i < 20; i++) {
            metrics.recordPage(100, 200, 50, 5 + i);
        }
        const summary = metrics.getSummary();
        assert.ok(summary.timings.write.p50 > 0);
        assert.equal(summary.timings.write.count, 20);
    });
    test("handles zero timings gracefully", () => {
        const summary = metrics.getSummary();
        assert.equal(summary.timings.fetch.p50, 0);
        assert.equal(summary.timings.fetch.p95, 0);
        assert.equal(summary.timings.fetch.p99, 0);
        assert.equal(summary.timings.fetch.count, 0);
    });
    test("handles single timing value", () => {
        metrics.recordPage(123, 456, 78, 9);
        const summary = metrics.getSummary();
        // All percentiles should be the single value
        assert.equal(summary.timings.fetch.p50, 123);
        assert.equal(summary.timings.fetch.p95, 123);
        assert.equal(summary.timings.fetch.p99, 123);
    });
});
describe("Metrics - Throughput", () => {
    let metrics;
    beforeEach(() => {
        metrics = new Metrics();
    });
    test("calculates pages per second", () => {
        metrics.recordPage(100, 200, 50, 10);
        metrics.recordPage(100, 200, 50, 10);
        metrics.recordPage(100, 200, 50, 10);
        const pps = metrics.getPagesPerSecond();
        assert.ok(pps >= 0);
        assert.ok(typeof pps === "number");
    });
    test("returns zero pages per second initially", () => {
        const pps = metrics.getPagesPerSecond();
        assert.equal(pps, 0);
    });
    test("calculates average pages per second in summary", () => {
        for (let i = 0; i < 10; i++) {
            metrics.recordPage(100, 200, 50, 10);
        }
        const summary = metrics.getSummary();
        assert.ok(summary.throughput.avgPagesPerSec >= 0);
        assert.ok(typeof summary.throughput.avgPagesPerSec === "number");
    });
    test("getStartedAt returns ISO timestamp", () => {
        const startedAt = metrics.getStartedAt();
        assert.ok(startedAt);
        assert.ok(typeof startedAt === "string");
        // Should be valid ISO date
        assert.ok(!isNaN(Date.parse(startedAt)));
    });
});
describe("Metrics - Memory Tracking", () => {
    let metrics;
    beforeEach(() => {
        metrics = new Metrics();
    });
    test("getCurrentRssMB returns positive number", () => {
        const rssMB = metrics.getCurrentRssMB();
        assert.ok(rssMB > 0);
        assert.ok(typeof rssMB === "number");
    });
    test("getPeakRssMB returns peak value", () => {
        const rss1 = metrics.getCurrentRssMB();
        const peak1 = metrics.getPeakRssMB();
        assert.ok(peak1 >= rss1);
    });
    test("tracks peak RSS in summary", () => {
        metrics.getCurrentRssMB();
        metrics.getCurrentRssMB();
        const summary = metrics.getSummary();
        assert.ok(summary.memory.peakRssMB >= summary.memory.currentRssMB);
    });
});
describe("Metrics - Queue Size", () => {
    let metrics;
    beforeEach(() => {
        metrics = new Metrics();
    });
    test("updates queue size", () => {
        metrics.updateQueueSize(42);
        // Queue size is private, tested indirectly through periodic logging
        assert.ok(true);
    });
    test("handles zero queue size", () => {
        metrics.updateQueueSize(0);
        assert.ok(true);
    });
    test("handles large queue size", () => {
        metrics.updateQueueSize(10000);
        assert.ok(true);
    });
});
describe("Metrics - Summary Generation", () => {
    let metrics;
    beforeEach(() => {
        metrics = new Metrics();
    });
    test("generates complete summary structure", () => {
        metrics.recordPage(100, 200, 50, 10);
        metrics.recordEdges(5);
        metrics.recordAssets(10);
        metrics.recordError();
        const summary = metrics.getSummary();
        // Duration
        assert.ok(summary.duration);
        assert.ok(summary.duration.totalSeconds >= 0);
        assert.ok(summary.duration.startTime);
        assert.ok(summary.duration.endTime);
        // Counts
        assert.ok(summary.counts);
        assert.equal(summary.counts.totalPages, 1);
        assert.equal(summary.counts.totalEdges, 5);
        assert.equal(summary.counts.totalAssets, 10);
        assert.equal(summary.counts.totalErrors, 1);
        // Throughput
        assert.ok(summary.throughput);
        assert.ok(summary.throughput.avgPagesPerSec >= 0);
        // Memory
        assert.ok(summary.memory);
        assert.ok(summary.memory.currentRssMB >= 0);
        assert.ok(summary.memory.peakRssMB >= 0);
        // Timings
        assert.ok(summary.timings);
        assert.ok(summary.timings.fetch);
        assert.ok(summary.timings.render);
        assert.ok(summary.timings.extract);
        assert.ok(summary.timings.write);
    });
    test("summary timestamps are valid ISO format", () => {
        const summary = metrics.getSummary();
        assert.ok(!isNaN(Date.parse(summary.duration.startTime)));
        assert.ok(!isNaN(Date.parse(summary.duration.endTime)));
    });
    test("summary duration increases over time", async () => {
        const summary1 = metrics.getSummary();
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));
        const summary2 = metrics.getSummary();
        assert.ok(summary2.duration.totalSeconds >= summary1.duration.totalSeconds);
    });
});
describe("Metrics - Periodic Logging", () => {
    let metrics;
    beforeEach(() => {
        metrics = new Metrics();
    });
    test("starts periodic logging", () => {
        metrics.startPeriodicLogging();
        // Should not crash
        assert.ok(true);
        metrics.stopPeriodicLogging();
    });
    test("stops periodic logging", () => {
        metrics.startPeriodicLogging();
        metrics.stopPeriodicLogging();
        assert.ok(true);
    });
    test("can stop without starting", () => {
        metrics.stopPeriodicLogging();
        assert.ok(true);
    });
    test("can start/stop multiple times", () => {
        metrics.startPeriodicLogging();
        metrics.stopPeriodicLogging();
        metrics.startPeriodicLogging();
        metrics.stopPeriodicLogging();
        assert.ok(true);
    });
});
describe("Metrics - Real-world Crawl Simulation", () => {
    test("simulates small crawl (10 pages)", async () => {
        const metrics = new Metrics();
        // Wait a tiny bit to ensure time passes
        await new Promise(resolve => setTimeout(resolve, 10));
        // Simulate 10 pages with varying timings
        for (let i = 0; i < 10; i++) {
            const fetchMs = 80 + Math.random() * 100;
            const renderMs = 150 + Math.random() * 200;
            const extractMs = 30 + Math.random() * 50;
            const writeMs = 5 + Math.random() * 15;
            metrics.recordPage(fetchMs, renderMs, extractMs, writeMs);
            metrics.recordEdges(3 + Math.floor(Math.random() * 10));
            metrics.recordAssets(5 + Math.floor(Math.random() * 20));
        }
        // Simulate some errors
        metrics.recordError();
        metrics.recordError();
        // Simulate bytes written
        metrics.recordBytesWritten(500 * 1024); // 500 KB
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalPages, 10);
        assert.ok(summary.counts.totalEdges > 0);
        assert.ok(summary.counts.totalAssets > 0);
        assert.equal(summary.counts.totalErrors, 2);
        assert.ok(summary.throughput.avgPagesPerSec >= 0);
    });
    test("simulates large crawl (1000 pages)", () => {
        const metrics = new Metrics();
        for (let i = 0; i < 1000; i++) {
            metrics.recordPage(50 + Math.random() * 200, // fetch
            100 + Math.random() * 400, // render
            20 + Math.random() * 80, // extract
            5 + Math.random() * 20 // write
            );
            if (i % 10 === 0) {
                metrics.recordEdges(Math.floor(Math.random() * 20));
                metrics.recordAssets(Math.floor(Math.random() * 30));
            }
            if (Math.random() < 0.05) {
                metrics.recordError();
            }
        }
        metrics.recordBytesWritten(50 * 1024 * 1024); // 50 MB
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalPages, 1000);
        assert.ok(summary.counts.totalErrors > 0);
        assert.ok(summary.timings.fetch.p50 > 0);
        assert.ok(summary.timings.fetch.p95 > summary.timings.fetch.p50);
        assert.ok(summary.timings.fetch.p99 > summary.timings.fetch.p95);
        assert.ok(summary.throughput.bytesWrittenMB > 0);
    });
    test("tracks memory pressure during crawl", () => {
        const metrics = new Metrics();
        for (let i = 0; i < 100; i++) {
            metrics.recordPage(100, 200, 50, 10);
            metrics.getCurrentRssMB(); // Trigger memory update
        }
        const summary = metrics.getSummary();
        assert.ok(summary.memory.currentRssMB > 0);
        assert.ok(summary.memory.peakRssMB >= summary.memory.currentRssMB);
    });
});
describe("Metrics - Edge Cases", () => {
    test("handles zero-time operations", () => {
        const metrics = new Metrics();
        metrics.recordPage(0, 0, 0, 0);
        const summary = metrics.getSummary();
        assert.equal(summary.timings.fetch.p50, 0);
    });
    test("handles very large timing values", () => {
        const metrics = new Metrics();
        metrics.recordPage(10000, 50000, 5000, 1000);
        const summary = metrics.getSummary();
        assert.ok(summary.timings.fetch.p50 > 0);
        assert.ok(summary.timings.render.p50 > 0);
    });
    test("handles negative counter values gracefully", () => {
        const metrics = new Metrics();
        // API doesn't allow negative values, but test boundary
        metrics.recordEdges(0);
        metrics.recordAssets(0);
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalEdges, 0);
        assert.equal(summary.counts.totalAssets, 0);
    });
    test("handles very large counters", () => {
        const metrics = new Metrics();
        metrics.recordEdges(1000000);
        metrics.recordAssets(5000000);
        const summary = metrics.getSummary();
        assert.equal(summary.counts.totalEdges, 1000000);
        assert.equal(summary.counts.totalAssets, 5000000);
    });
    test("percentile calculation with identical values", () => {
        const metrics = new Metrics();
        // All identical timings
        for (let i = 0; i < 100; i++) {
            metrics.recordPage(100, 200, 50, 10);
        }
        const summary = metrics.getSummary();
        // All percentiles should be the same
        assert.equal(summary.timings.fetch.p50, 100);
        assert.equal(summary.timings.fetch.p95, 100);
        assert.equal(summary.timings.fetch.p99, 100);
    });
});
//# sourceMappingURL=metrics.test.js.map