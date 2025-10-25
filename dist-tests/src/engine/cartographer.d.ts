import { CrawlConfig, CrawlState, CrawlProgress, CrawlEvent } from "../core/types.js";
export declare class Cartographer {
    private scheduler;
    private writer;
    /**
     * Subscribe to crawl events. Returns unsubscribe function.
     */
    on(type: CrawlEvent["type"], handler: (ev: CrawlEvent) => void): () => void;
    /**
     * Start a crawl. Returns crawlId.
     */
    start(config: CrawlConfig): Promise<{
        crawlId: string;
    }>;
    /**
     * Closes the browser instance.
     * This should be called after a crawl is completely finished.
     */
    close(): Promise<void>;
    /**
     * Cancel the crawl currently managed by this instance.
     * This is the method the integration test is calling.
     */
    cancel(): Promise<void>;
    /** Pause crawl by crawlId */
    pause(crawlId: string): Promise<void>;
    /** Resume crawl by crawlId */
    resume(crawlId: string): Promise<void>;
    /** Get status and progress for crawlId */
    status(crawlId: string): Promise<{
        state: CrawlState;
        progress: CrawlProgress;
    }>;
}
//# sourceMappingURL=cartographer.d.ts.map