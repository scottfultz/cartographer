import type { AssetRecord } from "../types.js";
export interface AssetsInput {
    domSource: "raw" | "playwright";
    html: string;
    baseUrl: string;
}
export interface AssetsResult {
    assets: AssetRecord[];
    truncated: boolean;
}
/**
 * Extract media assets from HTML with 1000 cap
 */
export declare function extractAssets(input: AssetsInput): AssetsResult;
//# sourceMappingURL=assets.d.ts.map