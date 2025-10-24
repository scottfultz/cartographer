export type Handler<T> = (ev: T) => void;
export interface TypedBus<T extends {
    type: string;
}> {
    on<E extends T["type"]>(type: E, handler: (ev: Extract<T, {
        type: E;
    }>) => void): () => void;
    once<E extends T["type"]>(type: E, handler: (ev: Extract<T, {
        type: E;
    }>) => void): () => void;
    off<E extends T["type"]>(type: E, handler: (ev: Extract<T, {
        type: E;
    }>) => void): void;
    emit(ev: T): void;
    onWithReplay<E extends T["type"]>(type: E, handler: (ev: Extract<T, {
        type: E;
    }>) => void): () => void;
}
declare function createBus<T extends {
    type: string;
}>(ringSize?: number): TypedBus<T>;
type GlobalBusAny = ReturnType<typeof createBus<any>>;
declare global {
    var __CARTOGRAPHER_BUS__: GlobalBusAny | undefined;
}
declare const _default: TypedBus<import("./types.ts").CrawlEvent>;
export default _default;
//# sourceMappingURL=events.d.ts.map