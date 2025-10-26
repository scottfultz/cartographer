import { CrawlConfig, CrawlState, CrawlProgress, CrawlEvent } from "../core/types.js";
export declare class Cartographer {
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
    /** Pause crawl by crawlId */
    pause(crawlId: string): Promise<void>;
    /** Resume crawl by crawlId */
    resume(crawlId: string): Promise<void>;
    /** Cancel crawl by crawlId */
    cancel(crawlId: string): Promise<void>;
    /** Get status and progress for crawlId */
    status(crawlId: string): Promise<{
        state: CrawlState;
        progress: CrawlProgress;
    }>;
}
//# sourceMappingURL=cartographer.d.ts.map