/**
 * Runtime Accessibility Analysis (Playwright-only)
 *
 * Collects accessibility data that requires browser runtime.
 * Pure data collection - no analysis or scoring.
 *
 * @module core/extractors/runtimeAccessibility
 */
import type { Page } from "playwright";
/**
 * Detect potential keyboard traps (WCAG 2.1.2)
 *
 * Data collection only - identifies elements that may trap keyboard focus.
 * Does not determine if traps are justified (e.g., modal dialogs).
 */
export declare function detectKeyboardTraps(page: Page): Promise<{
    hasPotentialTraps: boolean;
    suspiciousElements: Array<{
        selector: string;
        reason: "no-tabindex-exit" | "focus-locked" | "event-prevent-default";
    }>;
}>;
/**
 * Detect skip navigation links (WCAG 2.4.1)
 *
 * Data collection only - identifies skip links and their properties.
 */
export declare function detectSkipLinks(page: Page): Promise<{
    hasSkipLinks: boolean;
    links: Array<{
        text: string;
        href: string;
        isVisible: boolean;
        isFirstFocusable: boolean;
        targetExists: boolean;
    }>;
}>;
/**
 * Analyze video and audio elements (WCAG 1.2.x)
 *
 * Data collection only - checks for captions, subtitles, descriptions, transcripts.
 */
export declare function analyzeMediaElements(page: Page): Promise<{
    videos: Array<{
        src?: string;
        hasCaptions: boolean;
        hasSubtitles: boolean;
        hasDescriptions: boolean;
        autoplay: boolean;
        controls: boolean;
        trackCount: number;
    }>;
    audios: Array<{
        src?: string;
        hasTranscript: boolean;
        autoplay: boolean;
        controls: boolean;
    }>;
}>;
//# sourceMappingURL=runtimeAccessibility.d.ts.map