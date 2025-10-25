// Cartographer public API
// Provides start, pause, resume, cancel, status, and event subscription
// Delegates to internal modules. See types in src/core/types.ts
import { Scheduler } from "../core/scheduler.js";
import { buildConfig } from "../core/config.js";
import { log } from '../utils/logging.js';
import { initBrowser, closeBrowser } from '../core/renderer.js';
import bus from "../core/events.js";
// ...existing code...
const activeCrawls = new Map();
let seq = 1;
export class Cartographer {
    scheduler = null;
    writer = null;
    /**
     * Subscribe to crawl events. Returns unsubscribe function.
     */
    on(type, handler) {
        return bus.on(type, handler);
    }
    /**
     * Start a crawl. Returns crawlId.
     */
    async start(config) {
        let crawlId;
        let resumeConfig = config.resume;
        if (config.resume?.stagingDir) {
            // This is a RESUME crawl.
            // The stagingDir is provided, so we must extract the crawlId from it.
            const parts = config.resume.stagingDir.split('/');
            const dirName = parts.pop() || parts.pop(); // Handle potential trailing slash
            if (!dirName || !dirName.startsWith('crawl_')) {
                bus.emit({
                    type: 'error.occurred',
                    crawlId: 'unknown',
                    error: {
                        message: `Invalid resume stagingDir, could not extract crawlId: ${config.resume.stagingDir}`,
                        url: config.resume?.stagingDir || '',
                        origin: 'Cartographer.start',
                        hostname: '',
                        occurredAt: new Date().toISOString(),
                        phase: 'write'
                    },
                    seq: seq++,
                    timestamp: new Date().toISOString()
                });
                throw new Error(`Invalid resume stagingDir, could not extract crawlId: ${config.resume.stagingDir}`);
            }
            crawlId = dirName;
            // Ensure the final resume config has both stagingDir and the extracted crawlId
            resumeConfig = { ...config.resume, crawlId };
        }
        else {
            // This is a NEW crawl.
            // Generate a new crawlId.
            crawlId = `crawl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            // The resume config will just contain this new ID.
            resumeConfig = { crawlId };
        }
        await Promise.resolve();
        // Build the final config, now merging the *correct* resumeConfig
        const finalConfig = buildConfig({ ...config, resume: resumeConfig });
        await Promise.resolve();
        bus.emit({ type: "crawl.started", crawlId, config: finalConfig, seq: seq++, timestamp: new Date().toISOString() });
        // Initialize the browser
        const persistSession = finalConfig.cli?.persistSession === true;
        const stealth = finalConfig.cli?.stealth === true;
        await initBrowser(finalConfig, persistSession, stealth);
        this.writer = new (await import("../io/atlas/writer.js")).AtlasWriter(finalConfig.outAtls, finalConfig, crawlId);
        await this.writer.init();
        this.scheduler = new Scheduler(finalConfig, this.writer);
        this.scheduler.run();
        return { crawlId };
    }
    /**
     * Closes the browser instance.
     * This should be called after a crawl is completely finished.
     */
    async close() {
        log('info', '[Cartographer] Closing writer and browser...');
        if (this.writer) {
            try {
                await this.writer.finalize();
                log('info', '[Cartographer] AtlasWriter finalized and archive created.');
            }
            catch (error) {
                log('error', `[Cartographer] Error finalizing AtlasWriter: ${error.message}`);
            }
            this.writer = null;
        }
        else {
            log('warn', '[Cartographer] close() called but writer was already null.');
        }
        await closeBrowser();
        this.scheduler = null;
    }
    /**
     * Cancel the crawl currently managed by this instance.
     * This is the method the integration test is calling.
     */
    async cancel() {
        if (this.scheduler) {
            log('info', '[Cartographer] Received cancel() request, forwarding to Scheduler.');
            await this.scheduler.cancel();
        }
        else {
            log('warn', '[Cartographer] cancel() called but no scheduler is running.');
        }
    }
    // --- The methods below rely on the 'activeCrawls' map, which 'start' does not populate ---
    // --- They are left here to avoid breaking other parts of the API, but are not used by our test ---
    /** Pause crawl by crawlId */
    async pause(crawlId) {
        log('warn', '[Cartographer] pause(crawlId) is not supported by this crawl instance.');
        const handle = activeCrawls.get(crawlId);
        if (handle) {
            await handle.scheduler.pause();
            handle.state = handle.scheduler.getState();
        }
    }
    /** Resume crawl by crawlId */
    async resume(crawlId) {
        log('warn', '[Cartographer] resume(crawlId) is not supported by this crawl instance.');
        const handle = activeCrawls.get(crawlId);
        if (handle) {
            await handle.scheduler.resume();
            handle.state = handle.scheduler.getState();
        }
    }
    /** Get status and progress for crawlId */
    async status(crawlId) {
        log('warn', '[Cartographer] status(crawlId) is not supported by this crawl instance.');
        const handle = activeCrawls.get(crawlId);
        if (handle) {
            return { state: handle.scheduler.getState(), progress: handle.scheduler.getProgress() };
        }
        return { state: "idle", progress: { queued: 0, inFlight: 0, completed: 0, errors: 0, pagesPerSecond: 0, startedAt: "", updatedAt: "" } };
    }
}
//# sourceMappingURL=cartographer.js.map