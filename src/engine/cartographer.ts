// Cartographer public API
// Provides start, pause, resume, cancel, status, and event subscription
// Delegates to internal modules. See types in src/core/types.ts

import { CrawlConfig, CrawlState, CrawlProgress, CrawlEvent } from "../core/types.js";

import { startJob } from "../core/startJob.js";
import { Scheduler } from "../core/scheduler.js";
import { buildConfig } from "../core/config.js";
import bus from "../core/events.js";

interface CrawlHandle {
  scheduler: Scheduler;
  state: CrawlState;
  progress: CrawlProgress;
  manifestPath: string;
  incomplete: boolean;
  // Event bus is available via import from src/core/events if needed
}

const activeCrawls = new Map<string, CrawlHandle>();
let seq = 1;

export class Cartographer {
  /**
   * Subscribe to crawl events. Returns unsubscribe function.
   */
  on(type: CrawlEvent["type"], handler: (ev: CrawlEvent) => void): () => void {
    return bus.on(type, handler);
  }

  /**
   * Start a crawl. Returns crawlId.
   */
  async start(config: CrawlConfig): Promise<{ crawlId: string }> {
    const crawlId = `crawl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  // nextTick to allow listeners to attach after new Cartographer()
  await Promise.resolve();
    const finalConfig = buildConfig({ ...config, resume: { crawlId } });
    // nextTick to allow listeners to attach after new Cartographer()
    await Promise.resolve();
  bus.emit({ type: "crawl.started", crawlId, config: finalConfig, seq: seq++, timestamp: new Date().toISOString() });
    // For now, create Scheduler manually for API surface
    const writer = new (await import("../io/atlas/writer.js")).AtlasWriter(finalConfig.outAtls, finalConfig, crawlId);
    await writer.init();
    const scheduler = new Scheduler(finalConfig, writer);
    // Start crawl in background
    scheduler.run();
    const handle: CrawlHandle = {
      scheduler,
      state: "running",
    progress: scheduler.getProgress(),
      manifestPath: writer.getManifestPath(),
      incomplete: true,
    };
    activeCrawls.set(crawlId, handle);
    return { crawlId };
  }

  /** Pause crawl by crawlId */
  async pause(crawlId: string): Promise<void> {
    const handle = activeCrawls.get(crawlId);
    if (handle) {
      await handle.scheduler.pause();
      handle.state = handle.scheduler.getState();
    }
  }

  /** Resume crawl by crawlId */
  async resume(crawlId: string): Promise<void> {
    const handle = activeCrawls.get(crawlId);
    if (handle) {
      await handle.scheduler.resume();
      handle.state = handle.scheduler.getState();
    }
  }

  /** Cancel crawl by crawlId */
  async cancel(crawlId: string): Promise<void> {
    const handle = activeCrawls.get(crawlId);
    if (handle) {
      await handle.scheduler.cancel();
      handle.state = handle.scheduler.getState();
    }
  }

  /** Get status and progress for crawlId */
  async status(crawlId: string): Promise<{ state: CrawlState; progress: CrawlProgress }> {
    const handle = activeCrawls.get(crawlId);
    if (handle) {
      return { state: handle.scheduler.getState(), progress: handle.scheduler.getProgress() };
    }
    return { state: "idle", progress: { queued: 0, inFlight: 0, completed: 0, errors: 0, pagesPerSecond: 0, startedAt: "", updatedAt: "" } };
  }
}
