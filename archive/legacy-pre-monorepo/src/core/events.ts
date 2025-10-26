

// Process-wide typed event bus with tiny ring-buffer replay

export type Handler<T> = (ev: T) => void;

export interface TypedBus<T extends { type: string }> {
  on<E extends T["type"]>(type: E, handler: (ev: Extract<T, { type: E }>) => void): () => void;
  once<E extends T["type"]>(type: E, handler: (ev: Extract<T, { type: E }>) => void): () => void;
  off<E extends T["type"]>(type: E, handler: (ev: Extract<T, { type: E }>) => void): void;
  emit(ev: T): void;
  // optional convenience for tests: deliver the last event of this type immediately if present
  onWithReplay<E extends T["type"]>(type: E, handler: (ev: Extract<T, { type: E }>) => void): () => void;
}

function createBus<T extends { type: string }>(ringSize = 32): TypedBus<T> {
  const handlers = new Map<string, Set<Handler<T>>>();
  const ring = new Map<string, T[]>(); // last N per type

  function addToRing(ev: T) {
    const arr = ring.get(ev.type) ?? [];
    arr.push(ev);
    if (arr.length > ringSize) arr.shift();
    ring.set(ev.type, arr);
  }

  function on<E extends T["type"]>(type: E, handler: (ev: Extract<T, { type: E }>) => void) {
    let set = handlers.get(type as string);
    if (!set) { set = new Set(); handlers.set(type as string, set); }
    set.add(handler as Handler<T>);
    return () => off(type, handler as Handler<T>);
  }

  function once<E extends T["type"]>(type: E, handler: (ev: Extract<T, { type: E }>) => void) {
    const offOnce = on(type, (ev: any) => { offOnce(); handler(ev); });
    return offOnce;
  }

  function off<E extends T["type"]>(type: E, handler: (ev: Extract<T, { type: E }>) => void) {
    handlers.get(type as string)?.delete(handler as Handler<T>);
  }

  function emit(ev: T) {
    addToRing(ev);
    handlers.get(ev.type)?.forEach(h => {
      try { (h as any)(ev); } catch {}
    });
  }

  function onWithReplay<E extends T["type"]>(type: E, handler: (ev: Extract<T, { type: E }>) => void) {
    const dispose = on(type, handler);
    const last = ring.get(type as string);
    if (last && last.length) {
      // deliver the most recent immediately; helpful for tests joining slightly late
      const ev = last[last.length - 1] as any;
      queueMicrotask(() => handler(ev));
    }
    return dispose;
  }

  return { on, once, off, emit, onWithReplay };
}

// Hoist a single instance onto globalThis so all module graphs share it
type GlobalBusAny = ReturnType<typeof createBus<any>>;
declare global {
  // eslint-disable-next-line no-var
  var __CARTOGRAPHER_BUS__: GlobalBusAny | undefined;
}

const busInstance: GlobalBusAny =
  globalThis.__CARTOGRAPHER_BUS__ ?? (globalThis.__CARTOGRAPHER_BUS__ = createBus());

export default busInstance as TypedBus<import("./types.ts").CrawlEvent>;
