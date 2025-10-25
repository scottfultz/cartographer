/**
 * Tech Stack Detection
 *
 * Comprehensive technology detection that rivals BuiltWith.com
 * Analyzes: meta tags, scripts, HTML patterns, headers, global variables, DOM elements
 *
 * @module core/extractors/techStack
 */
export interface TechStackDetectorOptions {
    html: string;
    url: string;
    headers?: Record<string, string>;
}
/**
 * Detect technologies used on a webpage
 */
export declare function detectTechStack(options: TechStackDetectorOptions): string[];
/**
 * Get detailed tech stack with categories
 */
export declare function detectTechStackDetailed(options: TechStackDetectorOptions): Array<{
    name: string;
    category: string;
    certainty: 'high' | 'medium' | 'low';
}>;
//# sourceMappingURL=techStack.d.ts.map