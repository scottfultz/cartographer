export interface PerHostTokensConfig {
    perHostRps: number;
    burst?: number;
}
export declare function init(cfg: PerHostTokensConfig): void;
export declare function tryConsume(host: string, nowMs: number): boolean;
export declare function getTokens(host: string): number;
export declare function _reset(): void;
//# sourceMappingURL=perHostTokens.d.ts.map