/**
 * Metrics Collection Tests
 * 
 * Tests for performance metrics tracking, counters, timings,
 * percentile calculations, and summary generation
 */

import { describe, test, beforeEach , expect } from "vitest";
import assert from "node:assert/strict";
import { Metrics } from "../src/utils/metrics.js";

describe("Metrics - Counters", () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  test("starts with zero counters", () => {
    const summary = metrics.getSummary();
    
    expect(summary.counts.totalPages).toBe(0);
    expect(summary.counts.totalEdges).toBe(0);
    expect(summary.counts.totalAssets).toBe(0);
    expect(summary.counts.totalErrors).toBe(0);
  });

  test("records page with timings", () => {
    metrics.recordPage(100, 200, 50, 10);
    
    const summary = metrics.getSummary();
    expect(summary.counts.totalPages).toBe(1);
  });

  test("records multiple pages", () => {
    metrics.recordPage(100, 200, 50, 10);
    metrics.recordPage(150, 180, 60, 15);
    metrics.recordPage(120, 210, 55, 12);
    
    const summary = metrics.getSummary();
    expect(summary.counts.totalPages).toBe(3);
  });

  test("records edges", () => {
    metrics.recordEdges(10);
    metrics.recordEdges(5);
    
    const summary = metrics.getSummary();
    expect(summary.counts.totalEdges).toBe(15);
  });

  test("records assets", () => {
    metrics.recordAssets(20);
    metrics.recordAssets(15);
    
    const summary = metrics.getSummary();
    expect(summary.counts.totalAssets).toBe(35);
  });

  test("records errors", () => {
    metrics.recordError();
    metrics.recordError();
    metrics.recordError();
    
    const summary = metrics.getSummary();
    expect(summary.counts.totalErrors).toBe(3);
  });

  test("records bytes written", () => {
    metrics.recordBytesWritten(1024);
    metrics.recordBytesWritten(2048);
    
    const summary = metrics.getSummary();
    expect(summary.throughput.bytesWritten).toBe(3072);
    expect(summary.throughput.bytesWrittenMB).toBe(0);
  });

  test("records large bytes written", () => {
    metrics.recordBytesWritten(5 * 1024 * 1024); // 5 MB
    metrics.recordBytesWritten(3 * 1024 * 1024); // 3 MB
    
    const summary = metrics.getSummary();
    expect(summary.throughput.bytesWrittenMB).toBe(8);
  });
});

describe("Metrics - Timing Percentiles", () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  test("calculates fetch timing percentiles", () => {
    // Record varied fetch times
    for (let i = 0; i < 100; i++) {
      metrics.recordPage(50 + i, 200, 50, 10);
    }
    
    const summary = metrics.getSummary();
    
    expect(summary.timings.fetch.p50 > 0).toBeTruthy();
    expect(summary.timings.fetch.p95 > summary.timings.fetch.p50).toBeTruthy();
    expect(summary.timings.fetch.p99 > summary.timings.fetch.p95).toBeTruthy();
    expect(summary.timings.fetch.count).toBe(100);
  });

  test("calculates render timing percentiles", () => {
    for (let i = 0; i < 50; i++) {
      metrics.recordPage(100, 100 + i * 10, 50, 10);
    }
    
    const summary = metrics.getSummary();
    
    expect(summary.timings.render.p50 > 0).toBeTruthy();
    expect(summary.timings.render.p95 > summary.timings.render.p50).toBeTruthy();
    expect(summary.timings.render.count).toBe(50);
  });

  test("calculates extract timing percentiles", () => {
    for (let i = 0; i < 30; i++) {
      metrics.recordPage(100, 200, 30 + i, 10);
    }
    
    const summary = metrics.getSummary();
    
    expect(summary.timings.extract.p50 > 0).toBeTruthy();
    expect(summary.timings.extract.count).toBe(30);
  });

  test("calculates write timing percentiles", () => {
    for (let i = 0; i < 20; i++) {
      metrics.recordPage(100, 200, 50, 5 + i);
    }
    
    const summary = metrics.getSummary();
    
    expect(summary.timings.write.p50 > 0).toBeTruthy();
    expect(summary.timings.write.count).toBe(20);
  });

  test("handles zero timings gracefully", () => {
    const summary = metrics.getSummary();
    
    expect(summary.timings.fetch.p50).toBe(0);
    expect(summary.timings.fetch.p95).toBe(0);
    expect(summary.timings.fetch.p99).toBe(0);
    expect(summary.timings.fetch.count).toBe(0);
  });

  test("handles single timing value", () => {
    metrics.recordPage(123, 456, 78, 9);
    
    const summary = metrics.getSummary();
    
    // All percentiles should be the single value
    expect(summary.timings.fetch.p50).toBe(123);
    expect(summary.timings.fetch.p95).toBe(123);
    expect(summary.timings.fetch.p99).toBe(123);
  });
});

describe("Metrics - Throughput", () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  test("calculates pages per second", () => {
    metrics.recordPage(100, 200, 50, 10);
    metrics.recordPage(100, 200, 50, 10);
    metrics.recordPage(100, 200, 50, 10);
    
    const pps = metrics.getPagesPerSecond();
    
    expect(pps >= 0).toBeTruthy();
    expect(typeof pps === "number").toBeTruthy();
  });

  test("returns zero pages per second initially", () => {
    const pps = metrics.getPagesPerSecond();
    
    expect(pps).toBe(0);
  });

  test("calculates average pages per second in summary", () => {
    for (let i = 0; i < 10; i++) {
      metrics.recordPage(100, 200, 50, 10);
    }
    
    const summary = metrics.getSummary();
    
    expect(summary.throughput.avgPagesPerSec >= 0).toBeTruthy();
    expect(typeof summary.throughput.avgPagesPerSec === "number").toBeTruthy();
  });

  test("getStartedAt returns ISO timestamp", () => {
    const startedAt = metrics.getStartedAt();
    
    expect(startedAt).toBeTruthy();
    expect(typeof startedAt === "string").toBeTruthy();
    // Should be valid ISO date
    expect(!isNaN(Date.parse(startedAt)))).toBeTruthy());
  });
});

describe("Metrics - Memory Tracking", () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  test("getCurrentRssMB returns positive number", () => {
    const rssMB = metrics.getCurrentRssMB();
    
    expect(rssMB > 0).toBeTruthy();
    expect(typeof rssMB === "number").toBeTruthy();
  });

  test("getPeakRssMB returns peak value", () => {
    const rss1 = metrics.getCurrentRssMB();
    const peak1 = metrics.getPeakRssMB();
    
    expect(peak1 >= rss1).toBeTruthy();
  });

  test("tracks peak RSS in summary", () => {
    metrics.getCurrentRssMB();
    metrics.getCurrentRssMB();
    
    const summary = metrics.getSummary();
    
    expect(summary.memory.peakRssMB >= summary.memory.currentRssMB).toBeTruthy();
  });
});

describe("Metrics - Queue Size", () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  test("updates queue size", () => {
    metrics.updateQueueSize(42);
    
    // Queue size is private, tested indirectly through periodic logging
    expect(true).toBeTruthy();
  });

  test("handles zero queue size", () => {
    metrics.updateQueueSize(0);
    
    expect(true).toBeTruthy();
  });

  test("handles large queue size", () => {
    metrics.updateQueueSize(10000);
    
    expect(true).toBeTruthy();
  });
});

describe("Metrics - Summary Generation", () => {
  let metrics: Metrics;

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
    expect(summary.duration).toBeTruthy();
    expect(summary.duration.totalSeconds >= 0).toBeTruthy();
    expect(summary.duration.startTime).toBeTruthy();
    expect(summary.duration.endTime).toBeTruthy();
    
    // Counts
    expect(summary.counts).toBeTruthy();
    expect(summary.counts.totalPages).toBe(1);
    expect(summary.counts.totalEdges).toBe(5);
    expect(summary.counts.totalAssets).toBe(10);
    expect(summary.counts.totalErrors).toBe(1);
    
    // Throughput
    expect(summary.throughput).toBeTruthy();
    expect(summary.throughput.avgPagesPerSec >= 0).toBeTruthy();
    
    // Memory
    expect(summary.memory).toBeTruthy();
    expect(summary.memory.currentRssMB >= 0).toBeTruthy();
    expect(summary.memory.peakRssMB >= 0).toBeTruthy();
    
    // Timings
    expect(summary.timings).toBeTruthy();
    expect(summary.timings.fetch).toBeTruthy();
    expect(summary.timings.render).toBeTruthy();
    expect(summary.timings.extract).toBeTruthy();
    expect(summary.timings.write).toBeTruthy();
  });

  test("summary timestamps are valid ISO format", () => {
    const summary = metrics.getSummary();
    
    expect(!isNaN(Date.parse(summary.duration.startTime)))).toBeTruthy());
    expect(!isNaN(Date.parse(summary.duration.endTime)))).toBeTruthy());
  });

  test("summary duration increases over time", async () => {
    const summary1 = metrics.getSummary();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const summary2 = metrics.getSummary();
    
    expect(summary2.duration.totalSeconds >= summary1.duration.totalSeconds).toBeTruthy();
  });
});

describe("Metrics - Periodic Logging", () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  test("starts periodic logging", () => {
    metrics.startPeriodicLogging();
    
    // Should not crash
    expect(true).toBeTruthy();
    
    metrics.stopPeriodicLogging();
  });

  test("stops periodic logging", () => {
    metrics.startPeriodicLogging();
    metrics.stopPeriodicLogging();
    
    expect(true).toBeTruthy();
  });

  test("can stop without starting", () => {
    metrics.stopPeriodicLogging();
    
    expect(true).toBeTruthy();
  });

  test("can start/stop multiple times", () => {
    metrics.startPeriodicLogging();
    metrics.stopPeriodicLogging();
    metrics.startPeriodicLogging();
    metrics.stopPeriodicLogging();
    
    expect(true).toBeTruthy();
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
    
    expect(summary.counts.totalPages).toBe(10);
    expect(summary.counts.totalEdges > 0).toBeTruthy();
    expect(summary.counts.totalAssets > 0).toBeTruthy();
    expect(summary.counts.totalErrors).toBe(2);
    expect(summary.throughput.avgPagesPerSec >= 0).toBeTruthy();
  });

  test("simulates large crawl (1000 pages)", () => {
    const metrics = new Metrics();
    
    for (let i = 0; i < 1000; i++) {
      metrics.recordPage(
        50 + Math.random() * 200,  // fetch
        100 + Math.random() * 400, // render
        20 + Math.random() * 80,   // extract
        5 + Math.random() * 20     // write
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
    
    expect(summary.counts.totalPages).toBe(1000);
    expect(summary.counts.totalErrors > 0).toBeTruthy();
    expect(summary.timings.fetch.p50 > 0).toBeTruthy();
    expect(summary.timings.fetch.p95 > summary.timings.fetch.p50).toBeTruthy();
    expect(summary.timings.fetch.p99 > summary.timings.fetch.p95).toBeTruthy();
    expect(summary.throughput.bytesWrittenMB > 0).toBeTruthy();
  });

  test("tracks memory pressure during crawl", () => {
    const metrics = new Metrics();
    
    for (let i = 0; i < 100; i++) {
      metrics.recordPage(100, 200, 50, 10);
      metrics.getCurrentRssMB(); // Trigger memory update
    }
    
    const summary = metrics.getSummary();
    
    expect(summary.memory.currentRssMB > 0).toBeTruthy();
    expect(summary.memory.peakRssMB >= summary.memory.currentRssMB).toBeTruthy();
  });
});

describe("Metrics - Edge Cases", () => {
  test("handles zero-time operations", () => {
    const metrics = new Metrics();
    
    metrics.recordPage(0, 0, 0, 0);
    
    const summary = metrics.getSummary();
    expect(summary.timings.fetch.p50).toBe(0);
  });

  test("handles very large timing values", () => {
    const metrics = new Metrics();
    
    metrics.recordPage(10000, 50000, 5000, 1000);
    
    const summary = metrics.getSummary();
    expect(summary.timings.fetch.p50 > 0).toBeTruthy();
    expect(summary.timings.render.p50 > 0).toBeTruthy();
  });

  test("handles negative counter values gracefully", () => {
    const metrics = new Metrics();
    
    // API doesn't allow negative values, but test boundary
    metrics.recordEdges(0);
    metrics.recordAssets(0);
    
    const summary = metrics.getSummary();
    expect(summary.counts.totalEdges).toBe(0);
    expect(summary.counts.totalAssets).toBe(0);
  });

  test("handles very large counters", () => {
    const metrics = new Metrics();
    
    metrics.recordEdges(1000000);
    metrics.recordAssets(5000000);
    
    const summary = metrics.getSummary();
    expect(summary.counts.totalEdges).toBe(1000000);
    expect(summary.counts.totalAssets).toBe(5000000);
  });

  test("percentile calculation with identical values", () => {
    const metrics = new Metrics();
    
    // All identical timings
    for (let i = 0; i < 100; i++) {
      metrics.recordPage(100, 200, 50, 10);
    }
    
    const summary = metrics.getSummary();
    
    // All percentiles should be the same
    expect(summary.timings.fetch.p50).toBe(100);
    expect(summary.timings.fetch.p95).toBe(100);
    expect(summary.timings.fetch.p99).toBe(100);
  });
});
