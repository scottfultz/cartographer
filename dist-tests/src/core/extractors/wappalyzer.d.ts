/**
 * Options for Wappalyzer detection
 */
export interface WappalyzerDetectorOptions {
    html: string;
    url: string;
    headers?: Record<string, string>;
    scripts?: string[];
    robotsTxt?: string;
}
/**
 * Detected technology with metadata
 */
export interface DetectedTechnology {
    name: string;
    categories: string[];
    version?: string;
    confidence: number;
    website?: string;
    icon?: string;
}
/**
 * Wappalyzer detection result
 */
export interface WappalyzerResult {
    technologies: DetectedTechnology[];
    detectionTime: number;
}
/**
 * Detect technologies using Wappalyzer
 *
 * @param options - Detection options including HTML, URL, headers, scripts
 * @returns Detected technologies with metadata
 */
export declare function detectTechnologies(options: WappalyzerDetectorOptions): Promise<WappalyzerResult>;
/**
 * Extract script URLs from HTML
 * Helper function to get all script src attributes
 *
 * @param html - HTML content
 * @returns Array of script URLs
 */
export declare function extractScriptUrls(html: string): string[];
/**
 * Legacy API: Simple string array of technology names
 * For backward compatibility with existing code
 *
 * @param options - Detection options
 * @returns Array of technology names
 */
export declare function detectTechStack(options: WappalyzerDetectorOptions): Promise<string[]>;
//# sourceMappingURL=wappalyzer.d.ts.map