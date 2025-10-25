export interface TextSampleInput {
    domSource: "raw" | "playwright";
    html: string;
}
/**
 * Extract text sample from HTML body
 * Collapses whitespace and returns first 1500 UTF-8 bytes
 */
export declare function extractTextSample(input: TextSampleInput): string;
//# sourceMappingURL=textSample.d.ts.map