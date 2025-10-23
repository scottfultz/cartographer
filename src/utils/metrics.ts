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
  getPagesPerSecond(): number {
    const totalSec = (Date.now() - this.startTime) / 1000;
    return totalSec > 0 ? parseFloat((this.totalPages / totalSec).toFixed(2)) : 0;
  }

  /**
   * Get crawl startedAt ISO string
   */
  getStartedAt(): string {
    return new Date(this.startTime).toISOString();
  }
  // Counters
  private totalPages = 0;
  private totalEdges = 0;
  private totalAssets = 0;
  private totalErrors = 0;
  private bytesWritten = 0;
  
  // Timing arrays for percentile calculation
  private fetchTimes: number[] = [];
  private renderTimes: number[] = [];
  private extractTimes: number[] = [];
  private writeTimes: number[] = [];
  
  // Current state
  private queueSize = 0;
  private currentRssMB = 0;
  private peakRssMB = 0;
  
  // Throughput tracking
  private startTime = Date.now();
  private lastLogTime = Date.now();
  private lastPageCount = 0;
  
  // Periodic logging
  private logInterval?: NodeJS.Timeout;
  
  constructor() {}
  
  /**
   * Start periodic logging (every 5 seconds)
   */
  startPeriodicLogging(): void {
    this.logInterval = setInterval(() => {
      this.logSnapshot();
    }, 5000);
  }
  
  /**
   * Stop periodic logging
   */
  stopPeriodicLogging(): void {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = undefined;
    }
  }
  
  /**
   * Record a page crawled
   */
  recordPage(fetchMs: number, renderMs: number, extractMs: number, writeMs: number): void {
    this.totalPages++;
    this.fetchTimes.push(fetchMs);
    this.renderTimes.push(renderMs);
    this.extractTimes.push(extractMs);
    this.writeTimes.push(writeMs);
  }
  
  /**
   * Record edges written
   */
  recordEdges(count: number): void {
    this.totalEdges += count;
  }
  
  /**
   * Record assets written
   */
  recordAssets(count: number): void {
    this.totalAssets += count;
  }
  
  /**
   * Record error
   */
  recordError(): void {
    this.totalErrors++;
  }
  
  /**
   * Record bytes written
   */
  recordBytesWritten(bytes: number): void {
    this.bytesWritten += bytes;
  }
  
  /**
   * Update queue size
   */
  updateQueueSize(size: number): void {
    this.queueSize = size;
  }
  
  /**
   * Update RSS memory usage
   */
  updateRss(): void {
    const usage = process.memoryUsage();
    this.currentRssMB = Math.round(usage.rss / 1024 / 1024);
    if (this.currentRssMB > this.peakRssMB) {
      this.peakRssMB = this.currentRssMB;
    }
  }
  
  /**
   * Get current RSS in MB
   */
  getCurrentRssMB(): number {
    this.updateRss();
    return this.currentRssMB;
  }
  
  /**
   * Get peak RSS in MB
   */
  getPeakRssMB(): number {
    return this.peakRssMB;
  }
  
  /**
   * Log current snapshot
   */
  private logSnapshot(): void {
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
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
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

export interface PerformanceSummary {
  duration: {
    totalSeconds: number;
    startTime: string;
    endTime: string;
  };
  counts: {
    totalPages: number;
    totalEdges: number;
    totalAssets: number;
    totalErrors: number;
  };
  throughput: {
    avgPagesPerSec: number;
    bytesWritten: number;
    bytesWrittenMB: number;
  };
  memory: {
    currentRssMB: number;
    peakRssMB: number;
  };
  timings: {
    fetch: TimingStats;
    render: TimingStats;
    extract: TimingStats;
    write: TimingStats;
  };
}

export interface TimingStats {
  p50: number;
  p95: number;
  p99: number;
  count: number;
}
