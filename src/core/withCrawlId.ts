// Utility to attach crawlId, seq, and timestamp to events
let globalSeq = 1;
export function nextSeq() {
    return globalSeq++;
}
export function withCrawlId<T extends { type: string }>(crawlId: string, ev: T): T & { crawlId: string; seq: number; timestamp: string } {
    return {
        ...ev,
        crawlId,
        seq: nextSeq(),
        timestamp: new Date().toISOString()
    };
}
