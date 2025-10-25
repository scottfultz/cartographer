export interface StructuredDataItem {
    type: "json-ld" | "microdata" | "microformat" | "opengraph" | "twittercard";
    schemaType?: string;
    data: any;
}
export interface StructuredDataInput {
    html: string;
    url: string;
}
/**
 * Extract JSON-LD structured data from HTML
 * Uses regex-based parsing to avoid DOM library dependency
 */
export declare function extractStructuredData(input: StructuredDataInput): StructuredDataItem[];
/**
 * Filter structured data to only common/useful types
 * Reduces noise from generic Schema.org items
 */
export declare function filterRelevantStructuredData(items: StructuredDataItem[]): StructuredDataItem[];
//# sourceMappingURL=structuredData.d.ts.map