export declare function nextSeq(): number;
export declare function withCrawlId<T extends {
    type: string;
}>(crawlId: string, ev: T): T & {
    crawlId: string;
    seq: number;
    timestamp: string;
};
//# sourceMappingURL=withCrawlId.d.ts.map