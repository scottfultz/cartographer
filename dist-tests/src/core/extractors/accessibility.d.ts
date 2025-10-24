import type { Page } from "playwright";
export interface AccessibilityRecord {
    pageUrl: string;
    missingAltCount: number;
    missingAltSources?: string[];
    headingOrder: Array<"H1" | "H2" | "H3" | "H4" | "H5" | "H6">;
    landmarks: {
        header: boolean;
        nav: boolean;
        main: boolean;
        aside: boolean;
        footer: boolean;
    };
    roles: Record<string, number>;
    lang?: string;
    formControls?: {
        totalInputs: number;
        missingLabel: number;
        inputsMissingLabel: string[];
    };
    focusOrder?: Array<{
        selector: string;
        tabindex: number;
    }>;
    contrastViolations?: Array<{
        selector: string;
        fg?: string;
        bg?: string;
        ratio: number;
        level: "AA" | "AAA";
    }>;
    ariaIssues?: string[];
}
/**
 * Extract accessibility data from HTML
 */
export declare function extractAccessibility(opts: {
    domSource: "raw" | "playwright";
    html: string;
    baseUrl: string;
    page?: Page;
    renderMode: "raw" | "prerender" | "full";
}): AccessibilityRecord;
/**
 * Extract accessibility data with contrast checking (Playwright mode only)
 */
export declare function extractAccessibilityWithContrast(opts: {
    page: Page;
    baseUrl: string;
    html: string;
}): Promise<AccessibilityRecord>;
//# sourceMappingURL=accessibility.d.ts.map