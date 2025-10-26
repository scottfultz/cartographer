// Typed event emitter for Cartographer
// Usage: import { EventEmitter } from './events.js'
// Monotonic event sequence generator
let globalSeq = 1;
export function nextSeq() {
    return globalSeq++;
}
// CrawlId guard for event emission
export function withCrawlId(crawlId, ev) {
    return {
        ...ev,
        crawlId,
        seq: nextSeq(),
        timestamp: new Date().toISOString()
    };
}
export class EventEmitter {
    handlers = new Map();
    static global = new EventEmitter();
    on(type, handler) {
        if (!this.handlers.has(type))
            this.handlers.set(type, new Set());
        this.handlers.get(type).add(handler);
        return () => this.handlers.get(type)?.delete(handler);
    }
    emit(ev) {
        const set = this.handlers.get(ev.type);
        if (set)
            for (const h of set)
                h(ev);
    }
}
//# sourceMappingURL=events.js.map