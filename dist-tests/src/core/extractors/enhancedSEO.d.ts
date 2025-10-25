/**
 * Enhanced SEO metadata extracted from a page
 */
export interface EnhancedSEOMetadata {
    indexability: {
        metaRobots?: string;
        xRobotsTag?: string;
        canonical?: string;
        isNoIndex: boolean;
        isNoFollow: boolean;
    };
    content: {
        title?: string;
        titleLength?: {
            characters: number;
            pixels: number;
        };
        metaDescription?: string;
        descriptionLength?: {
            characters: number;
            pixels: number;
        };
        h1?: string;
        h1Count: number;
        h2Count: number;
        h3Count: number;
        h4Count: number;
        h5Count: number;
        h6Count: number;
        wordCount: number;
        textContentLength: number;
    };
    international: {
        hreflangTags: Array<{
            lang: string;
            url: string;
        }>;
        hreflangCount: number;
        hreflangErrors?: string[];
    };
    social: {
        openGraph: {
            ogTitle?: string;
            ogDescription?: string;
            ogImage?: string;
            ogType?: string;
            ogUrl?: string;
            ogSiteName?: string;
        };
        twitter: {
            twitterCard?: string;
            twitterTitle?: string;
            twitterDescription?: string;
            twitterImage?: string;
            twitterSite?: string;
            twitterCreator?: string;
        };
    };
    schema: {
        hasJsonLd: boolean;
        hasMicrodata: boolean;
        schemaTypes: string[];
    };
}
/**
 * Input for enhanced SEO metadata extraction
 */
export interface EnhancedSEOInput {
    html: string;
    baseUrl: string;
    headers?: Record<string, string | string[]>;
    bodyText?: string;
}
/**
 * Extract enhanced SEO metadata from HTML
 *
 * @param input - Enhanced SEO input data
 * @returns EnhancedSEOMetadata object
 */
export declare function extractEnhancedSEOMetadata(input: EnhancedSEOInput): EnhancedSEOMetadata;
//# sourceMappingURL=enhancedSEO.d.ts.map