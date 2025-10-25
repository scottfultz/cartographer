export interface PageFactsInput {
    domSource: "raw" | "playwright";
    html: string;
    fetchHeaders: Record<string, string | string[]>;
    baseUrl: string;
}
export interface PageFacts {
    title?: string;
    metaDescription?: string;
    h1?: string;
    headings: Array<{
        level: number;
        text: string;
    }>;
    canonicalHref?: string;
    canonicalResolved?: string;
    robotsMeta?: string;
    xRobotsTagHeader?: string;
    hreflang: Array<{
        lang: string;
        url: string;
    }>;
    faviconUrl?: string;
    linksOutCount: number;
    mediaCount: number;
    missingAltCount: number;
}
/**
 * Extract page metadata from HTML
 */
export declare function extractPageFacts(input: PageFactsInput): PageFacts;
//# sourceMappingURL=pageFacts.d.ts.map