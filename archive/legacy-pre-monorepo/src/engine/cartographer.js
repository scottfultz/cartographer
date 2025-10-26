// Cartographer public API
// Provides start, pause, resume, cancel, status, and event subscription
// Delegates to internal modules. See types in src/core/types.ts
import { Scheduler } from "../core/scheduler.js";
import { buildConfig } from "../core/config.js";
import { EventEmitter } from "../core/events.js";
const activeCrawls = new Map();
let seq = 1;
export class Cartographer {
    /**
     * Subscribe to crawl events. Returns unsubscribe function.
     */
    on(type, handler) {
        return EventEmitter.global.on(type, handler);
    }
    /**
     * Start a crawl. Returns crawlId.
     */
    async start(config) {
        const crawlId = `crawl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const emitter = EventEmitter.global;
        const finalConfig = buildConfig({ ...config, resume: { crawlId } });
        emitter.emit({ type: "crawl.started", crawlId, config: finalConfig, seq: seq++, timestamp: new Date().toISOString() });
        // Delegate to startJob, which returns exit code (need to wire up Scheduler instance)
        // For now, create Scheduler manually for API surface
        const writer = new (await import("../io/atlas/writer.js")).AtlasWriter(finalConfig.outAtls, finalConfig, crawlId);
        await writer.init();
        const scheduler = new Scheduler(finalConfig, writer);
        // Start crawl in background
        scheduler.run();
        const handle = {
            scheduler,
            state: "running",
            progress: scheduler.getProgress(),
            emitter,
            manifestPath: writer.getManifestPath(),
            incomplete: true,
        };
        activeCrawls.set(crawlId, handle);
        return { crawlId };
    }
    /** Pause crawl by crawlId */
    async pause(crawlId) {
        const handle = activeCrawls.get(crawlId);
        if (handle) {
            await handle.scheduler.pause();
            handle.state = handle.scheduler.getState();
        }
    }
    /** Resume crawl by crawlId */
    async resume(crawlId) {
        const handle = activeCrawls.get(crawlId);
        if (handle) {
            await handle.scheduler.resume();
            handle.state = handle.scheduler.getState();
        }
    }
    /** Cancel crawl by crawlId */
    async cancel(crawlId) {
        const handle = activeCrawls.get(crawlId);
        if (handle) {
            await handle.scheduler.cancel();
            handle.state = handle.scheduler.getState();
        }
    }
    /** Get status and progress for crawlId */
    async status(crawlId) {
        const handle = activeCrawls.get(crawlId);
        if (handle) {
            return { state: handle.scheduler.getState(), progress: handle.scheduler.getProgress() };
        }
        return { state: "idle", progress: { queued: 0, inFlight: 0, completed: 0, errors: 0, pagesPerSecond: 0, startedAt: "", updatedAt: "" } };
    }
}
//# sourceMappingURL=cartographer.js.map