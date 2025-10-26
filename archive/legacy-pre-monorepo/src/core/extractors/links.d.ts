import type { EdgeRecord, RenderMode } from "../types.js";
export interface LinksInput {
    domSource: "raw" | "playwright";
    html: string;
    baseUrl: string;
    discoveredInMode: RenderMode;
}
/**
 * Extract links from HTML and deduplicate by (sourceUrl, targetUrl, selectorHint)
 */
export declare function extractLinks(input: LinksInput): EdgeRecord[];
//# sourceMappingURL=links.d.ts.map