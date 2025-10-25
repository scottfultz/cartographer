// Utility to attach crawlId, seq, and timestamp to events
let globalSeq = 1;
export function nextSeq() {
    return globalSeq++;
}
export function withCrawlId(crawlId, ev) {
    return {
        ...ev,
        crawlId,
        seq: nextSeq(),
        timestamp: new Date().toISOString()
    };
}
//# sourceMappingURL=withCrawlId.js.map