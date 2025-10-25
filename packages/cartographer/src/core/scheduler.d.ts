import type { EngineConfig } from "./types.js";
import type { AtlasWriter } from "../io/atlas/writer.js";
import { Metrics } from "../utils/metrics.js";
export interface SchedulerResult {
    success: boolean;
    errorCount: number;
    errorBudgetExceeded: boolean;
    gracefulShutdown: boolean;
}
/**
 * BFS Scheduler with URL normalization, parameter sampling, and queue hygiene
 */
export declare class Scheduler {
    private heartbeatInterval;
    private config;
    private writer;
    private metrics;
    private visited;
    private enqueued;
    private queue;
    private hostQueues;
    private seenParams;
    private pageCount;
    private errorCount;
    private errorBudgetExceeded;
    private rpsLimiter;
    private memoryPaused;
    private checkpointInterval;
    private lastCheckpointAt;
    private resumeOf?;
    private shutdownRequested;
    private gracefulShutdown;
    private crawlState;
    constructor(config: EngineConfig, writer: AtlasWriter, metrics?: Metrics);
    /** Get current crawl state */
    getState(): "idle" | "running" | "paused" | "canceling" | "finalizing" | "done" | "failed";
    /** Get crawl progress snapshot */
    getProgress(): import("./types.js").CrawlProgress;
    /** Get manifest path */
    getManifestPath(): string;
    /** Pause crawl: stop dequeuing new URLs */
    pause(): Promise<void>;
    /** Resume crawl: re-enable dequeues */
    resume(): Promise<void>;
    /** Cancel crawl: request graceful shutdown */
    cancel(): Promise<void>;
    getMetrics(): Metrics;
    /**
     * Setup signal handlers for graceful shutdown
     */
    private setupSignalHandlers;
    /**
     * Force shutdown with final checkpoint
     */
    private forceShutdown;
    /**
     * Restore state from checkpoint for resume
     */
    restoreFromCheckpoint(): Promise<boolean>;
    /**
     * Write checkpoint if interval reached
     */
    private writeCheckpointIfNeeded;
    run(): Promise<SchedulerResult>;
    private normalizeAndApplyPolicy;
    private processPage;
    private enqueueIfNew;
}
//# sourceMappingURL=scheduler.d.ts.map