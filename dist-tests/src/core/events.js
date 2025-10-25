// Process-wide typed event bus with tiny ring-buffer replay
function createBus(ringSize = 32) {
    const handlers = new Map();
    const ring = new Map(); // last N per type
    function addToRing(ev) {
        const arr = ring.get(ev.type) ?? [];
        arr.push(ev);
        if (arr.length > ringSize)
            arr.shift();
        ring.set(ev.type, arr);
    }
    function on(type, handler) {
        let set = handlers.get(type);
        if (!set) {
            set = new Set();
            handlers.set(type, set);
        }
        set.add(handler);
        return () => off(type, handler);
    }
    function once(type, handler) {
        const offOnce = on(type, (ev) => { offOnce(); handler(ev); });
        return offOnce;
    }
    function off(type, handler) {
        handlers.get(type)?.delete(handler);
    }
    function emit(ev) {
        addToRing(ev);
        handlers.get(ev.type)?.forEach(h => {
            try {
                h(ev);
            }
            catch { }
        });
    }
    function onWithReplay(type, handler) {
        const dispose = on(type, handler);
        const last = ring.get(type);
        if (last && last.length) {
            // deliver the most recent immediately; helpful for tests joining slightly late
            const ev = last[last.length - 1];
            queueMicrotask(() => handler(ev));
        }
        return dispose;
    }
    return { on, once, off, emit, onWithReplay };
}
const busInstance = globalThis.__CARTOGRAPHER_BUS__ ?? (globalThis.__CARTOGRAPHER_BUS__ = createBus());
export default busInstance;
//# sourceMappingURL=events.js.map