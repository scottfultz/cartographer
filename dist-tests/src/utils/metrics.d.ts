/**
 * Performance metrics tracking
 */
export declare class Metrics {
    /**
     * Get current pages per second (since start)
     */
    getPagesPerSecond(): number;
    /**
     * Get crawl startedAt ISO string
     */
    getStartedAt(): string;
    private totalPages;
    private totalEdges;
    private totalAssets;
    private totalErrors;
    private bytesWritten;
    private fetchTimes;
    private renderTimes;
    private extractTimes;
    private writeTimes;
    private queueSize;
    private currentRssMB;
    private peakRssMB;
    private startTime;
    private lastLogTime;
    private lastPageCount;
    private logInterval?;
    constructor();
    /**
     * Start periodic logging (every 5 seconds)
     */
    startPeriodicLogging(): void;
    /**
     * Stop periodic logging
     */
    stopPeriodicLogging(): void;
    /**
     * Record a page crawled
     */
    recordPage(fetchMs: number, renderMs: number, extractMs: number, writeMs: number): void;
    /**
     * Record edges written
     */
    recordEdges(count: number): void;
    /**
     * Record assets written
     */
    recordAssets(count: number): void;
    /**
     * Record error
     */
    recordError(): void;
    /**
     * Record bytes written
     */
    recordBytesWritten(bytes: number): void;
    /**
     * Update queue size
     */
    updateQueueSize(size: number): void;
    /**
     * Update RSS memory usage
     */
    updateRss(): void;
    /**
     * Get current RSS in MB
     */
    getCurrentRssMB(): number;
    /**
     * Get peak RSS in MB
     */
    getPeakRssMB(): number;
    /**
     * Log current snapshot
     */
    private logSnapshot;
    /**
     * Calculate percentile
     */
    private percentile;
    /**
     * Get performance summary
     */
    getSummary(): PerformanceSummary;
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
//# sourceMappingURL=metrics.d.ts.map