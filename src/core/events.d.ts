import { CrawlEvent } from "./types.js";
export declare function nextSeq(): number;
export declare function withCrawlId<T extends {
    crawlId?: string;
    seq?: number;
    timestamp?: string;
}>(crawlId: string, ev: Omit<T, "crawlId" | "seq" | "timestamp">): T;
type Handler<T> = (ev: T) => void;
export declare class EventEmitter<T> {
    private handlers;
    static global: EventEmitter<CrawlEvent>;
    on(type: string, handler: Handler<T>): () => void;
    emit(ev: T & {
        type: string;
    }): void;
}
export {};
//# sourceMappingURL=events.d.ts.map