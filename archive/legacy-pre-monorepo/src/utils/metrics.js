/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { log } from "./logging.js";
/**
 * Performance metrics tracking
 */
export class Metrics {
    /**
     * Get current pages per second (since start)
     */
    getPagesPerSecond() {
        const totalSec = (Date.now() - this.startTime) / 1000;
        return totalSec > 0 ? parseFloat((this.totalPages / totalSec).toFixed(2)) : 0;
    }
    /**
     * Get crawl startedAt ISO string
     */
    getStartedAt() {
        return new Date(this.startTime).toISOString();
    }
    // Counters
    totalPages = 0;
    totalEdges = 0;
    totalAssets = 0;
    totalErrors = 0;
    bytesWritten = 0;
    // Timing arrays for percentile calculation
    fetchTimes = [];
    renderTimes = [];
    extractTimes = [];
    writeTimes = [];
    // Current state
    queueSize = 0;
    currentRssMB = 0;
    peakRssMB = 0;
    // Throughput tracking
    startTime = Date.now();
    lastLogTime = Date.now();
    lastPageCount = 0;
    // Periodic logging
    logInterval;
    constructor() { }
    /**
     * Start periodic logging (every 5 seconds)
     */
    startPeriodicLogging() {
        this.logInterval = setInterval(() => {
            this.logSnapshot();
        }, 5000);
    }
    /**
     * Stop periodic logging
     */
    stopPeriodicLogging() {
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = undefined;
        }
    }
    /**
     * Record a page crawled
     */
    recordPage(fetchMs, renderMs, extractMs, writeMs) {
        this.totalPages++;
        this.fetchTimes.push(fetchMs);
        this.renderTimes.push(renderMs);
        this.extractTimes.push(extractMs);
        this.writeTimes.push(writeMs);
    }
    /**
     * Record edges written
     */
    recordEdges(count) {
        this.totalEdges += count;
    }
    /**
     * Record assets written
     */
    recordAssets(count) {
        this.totalAssets += count;
    }
    /**
     * Record error
     */
    recordError() {
        this.totalErrors++;
    }
    /**
     * Record bytes written
     */
    recordBytesWritten(bytes) {
        this.bytesWritten += bytes;
    }
    /**
     * Update queue size
     */
    updateQueueSize(size) {
        this.queueSize = size;
    }
    /**
     * Update RSS memory usage
     */
    updateRss() {
        const usage = process.memoryUsage();
        this.currentRssMB = Math.round(usage.rss / 1024 / 1024);
        if (this.currentRssMB > this.peakRssMB) {
            this.peakRssMB = this.currentRssMB;
        }
    }
    /**
     * Get current RSS in MB
     */
    getCurrentRssMB() {
        this.updateRss();
        return this.currentRssMB;
    }
    /**
     * Get peak RSS in MB
     */
    getPeakRssMB() {
        return this.peakRssMB;
    }
    /**
     * Log current snapshot
     */
    logSnapshot() {
        this.updateRss();
        const now = Date.now();
        const elapsedSec = (now - this.lastLogTime) / 1000;
        const pagesInPeriod = this.totalPages - this.lastPageCount;
        const pagesPerSec = elapsedSec > 0 ? (pagesInPeriod / elapsedSec).toFixed(2) : "0.00";
        log("info", `[Metrics] ${pagesPerSec} p/s | RSS: ${this.currentRssMB} MB | Queue: ${this.queueSize} | Pages: ${this.totalPages} | Edges: ${this.totalEdges} | Assets: ${this.totalAssets} | Errors: ${this.totalErrors}`);
        this.lastLogTime = now;
        this.lastPageCount = this.totalPages;
    }
    /**
     * Calculate percentile
     */
    percentile(arr, p) {
        if (arr.length === 0)
            return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    /**
     * Get performance summary
     */
    getSummary() {
        const totalSec = (Date.now() - this.startTime) / 1000;
        const avgPagesPerSec = totalSec > 0 ? this.totalPages / totalSec : 0;
        return {
            duration: {
                totalSeconds: Math.round(totalSec),
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date().toISOString()
            },
            counts: {
                totalPages: this.totalPages,
                totalEdges: this.totalEdges,
                totalAssets: this.totalAssets,
                totalErrors: this.totalErrors
            },
            throughput: {
                avgPagesPerSec: parseFloat(avgPagesPerSec.toFixed(2)),
                bytesWritten: this.bytesWritten,
                bytesWrittenMB: parseFloat((this.bytesWritten / 1024 / 1024).toFixed(2))
            },
            memory: {
                currentRssMB: this.currentRssMB,
                peakRssMB: this.peakRssMB
            },
            timings: {
                fetch: {
                    p50: Math.round(this.percentile(this.fetchTimes, 50)),
                    p95: Math.round(this.percentile(this.fetchTimes, 95)),
                    p99: Math.round(this.percentile(this.fetchTimes, 99)),
                    count: this.fetchTimes.length
                },
                render: {
                    p50: Math.round(this.percentile(this.renderTimes, 50)),
                    p95: Math.round(this.percentile(this.renderTimes, 95)),
                    p99: Math.round(this.percentile(this.renderTimes, 99)),
                    count: this.renderTimes.length
                },
                extract: {
                    p50: Math.round(this.percentile(this.extractTimes, 50)),
                    p95: Math.round(this.percentile(this.extractTimes, 95)),
                    p99: Math.round(this.percentile(this.extractTimes, 99)),
                    count: this.extractTimes.length
                },
                write: {
                    p50: Math.round(this.percentile(this.writeTimes, 50)),
                    p95: Math.round(this.percentile(this.writeTimes, 95)),
                    p99: Math.round(this.percentile(this.writeTimes, 99)),
                    count: this.writeTimes.length
                }
            }
        };
    }
}
//# sourceMappingURL=metrics.js.map