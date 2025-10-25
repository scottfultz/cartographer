/**
 * WCAG 2.1 & 2.2 Data Collection
 *
 * Collects comprehensive accessibility data for WCAG auditing.
 * Consumer applications perform the actual analysis/interpretation.
 *
 * @module core/extractors/wcagData
 */
import type { CheerioAPI } from "cheerio";
export interface WCAGDataCollection {
    images: {
        total: number;
        withAlt: number;
        withoutAlt: number;
        withEmptyAlt: number;
        missingAltSources: string[];
    };
    tables: {
        total: number;
        withHeaders: number;
        withCaption: number;
        withScope: number;
        details: Array<{
            selector: string;
            hasHeaders: boolean;
            hasCaption: boolean;
            hasScope: boolean;
            hasSummary: boolean;
        }>;
    };
    inputAutocomplete: {
        inputsWithAutocomplete: number;
        autocompleteValues: Record<string, number>;
    };
    viewportRestrictions: {
        hasUserScalableNo: boolean;
        hasMaximumScale: boolean;
        maximumScale?: number;
    };
    responsiveDesign: {
        hasViewportMeta: boolean;
        viewportContent: string;
        hasMediaQueries: boolean;
    };
    textSpacingProperties: {
        hasInlineStyles: boolean;
        hasImportantLineHeight: boolean;
        hasImportantLetterSpacing: boolean;
    };
    hoverFocusContent: {
        elementsWithTitle: number;
        elementsWithAriaDescribedby: number;
        tooltips: number;
    };
    keyboardAccessibility: {
        focusableElements: number;
        customTabindexPositive: number;
        customTabindexNegative: number;
    };
    accessKeys: {
        elementsWithAccesskey: number;
        accesskeyValues: string[];
    };
    timingMechanisms: {
        hasMetaRefresh: boolean;
        refreshDelay?: number;
        refreshUrl?: string;
    };
    autoplayElements: {
        autoplayVideos: number;
        autoplayAudios: number;
        marquees: number;
        blinks: number;
    };
    flashingContent?: {
        hasBlinkTag: boolean;
        hasMarqueeTag: boolean;
        hasAnimations: boolean;
        animationCount: number;
        suspiciousAnimations: Array<{
            selector: string;
            duration: string;
            iterationCount: string;
        }>;
    };
    multimedia: {
        videos: Array<{
            selector: string;
            hasControls: boolean;
            hasCaptions: boolean;
            captionTracks: number;
            hasAudioDescription: boolean;
            audioDescriptionTracks: number;
        }>;
        audios: Array<{
            selector: string;
            hasControls: boolean;
            hasTranscript: boolean;
        }>;
        transcriptLinks: Array<{
            text: string;
            href: string;
        }>;
    };
    bypassMechanisms: {
        skipLinks: Array<{
            text: string;
            href: string;
        }>;
        hasAriaLandmarks: boolean;
        headingCount: number;
    };
    keyboardTraps?: {
        hasPotentialTraps: boolean;
        suspiciousElements: Array<{
            selector: string;
            reason: "no-tabindex-exit" | "focus-locked" | "event-prevent-default";
        }>;
    };
    skipLinksEnhanced?: {
        hasSkipLinks: boolean;
        links: Array<{
            text: string;
            href: string;
            isVisible: boolean;
            isFirstFocusable: boolean;
            targetExists: boolean;
        }>;
    };
    ariaLiveRegions?: {
        count: number;
        regions: Array<{
            live: "polite" | "assertive" | "off";
            atomic: boolean;
            relevant?: string;
            selector: string;
        }>;
    };
    focusOrderAnalysis?: {
        customTabIndexCount: number;
        negativeTabIndexCount: number;
        positiveTabIndexElements: Array<{
            selector: string;
            tabindex: number;
        }>;
    };
    formAutocomplete?: {
        totalForms: number;
        formsWithAutocomplete: number;
        personalDataInputs: Array<{
            type: string;
            hasAutocomplete: boolean;
            autocompleteValue?: string;
            selector: string;
        }>;
    };
    mediaElementsEnhanced?: {
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
    };
    pageTitle: {
        exists: boolean;
        title: string;
        isEmpty: boolean;
    };
    links: {
        total: number;
        withText: number;
        withoutText: number;
        withAriaLabel: number;
        withTitle: number;
        ambiguousText: string[];
    };
    headingsAndLabels: {
        headings: Array<"H1" | "H2" | "H3" | "H4" | "H5" | "H6">;
        multipleH1: boolean;
        skippedLevels: boolean;
    };
    focusNotObscured?: Array<{
        selector: string;
        isObscured: boolean;
        visiblePercentage: number;
    }>;
    focusAppearance?: Array<{
        selector: string;
        outline: string;
        outlineWidth: string;
        outlineColor: string;
        boxShadow: string;
        hasFocusIndicator: boolean;
    }>;
    touchGestures: {
        hasTouchEventListeners: boolean;
    };
    labelInName: Array<{
        selector: string;
        visibleLabel?: string;
        accessibleName?: string;
    }>;
    deviceMotion: {
        hasDeviceOrientationListeners: boolean;
        hasDeviceMotionListeners: boolean;
    };
    draggableElements: {
        draggableCount: number;
        draggableSelectors: string[];
    };
    targetSize?: Array<{
        selector: string;
        width: number;
        height: number;
        meetsMinimum: boolean;
    }>;
    pageLanguage: {
        hasLang: boolean;
        lang?: string;
        isValid: boolean;
    };
    languageChanges: Array<{
        selector: string;
        lang: string;
    }>;
    onChangeHandlers: {
        formsWithOnChange: number;
        inputsWithOnChange: number;
    };
    errorIdentification: {
        ariaInvalid: number;
        ariaErrormessage: number;
        requiredFields: number;
    };
    formLabels: {
        totalInputs: number;
        inputsWithLabels: number;
        inputsWithoutLabels: number;
        inputsMissingLabel: string[];
        inputTypes: Record<string, number>;
    };
    redundantEntry: {
        duplicateNameAttributes: string[];
        duplicateLabelTexts: string[];
    };
    authentication: {
        hasPasswordInput: boolean;
        hasCaptcha: boolean;
        hasAutocompletePassword: boolean;
    };
    parsingIssues: {
        duplicateIds: string[];
        missingClosingTags: number;
    };
    ariaCompliance: {
        totalAriaElements: number;
        ariaLabelledbyIssues: number;
        ariaDescribedbyIssues: number;
        missingRequiredAriaAttributes: Array<{
            selector: string;
            role: string;
            missingAttribute: string;
        }>;
        invalidAriaReferences: Array<{
            selector: string;
            attribute: string;
            missingId: string;
        }>;
    };
    statusMessages: {
        ariaLive: number;
        ariaRoleStatus: number;
        ariaRoleAlert: number;
    };
}
/**
 * Collect WCAG audit data from HTML
 */
export declare function collectWCAGData($: CheerioAPI, baseUrl: string): WCAGDataCollection;
/**
 * Collect runtime-only WCAG data (requires Playwright)
 *
 * Supplements static HTML analysis with measurements and checks that require
 * a running browser:
 * - Target sizes (2.5.8 - WCAG 2.2)
 * - Focus appearance (2.4.13 - WCAG 2.2)
 * - Focus obscured (2.4.11, 2.4.12 - WCAG 2.2)
 *
 * @param page - Playwright page instance
 * @returns Runtime-only WCAG data
 */
export declare function collectRuntimeWCAGData(page: any): Promise<Partial<WCAGDataCollection>>;
/**
 * Extract ARIA live regions (WCAG 4.1.3)
 * Static analysis - finds elements with aria-live attribute or implicit live roles
 */
export declare function extractAriaLiveRegions($: CheerioAPI): {
    count: number;
    regions: Array<{
        live: "polite" | "assertive" | "off";
        atomic: boolean;
        relevant?: string;
        selector: string;
    }>;
};
/**
 * Analyze focus order and tabindex usage (WCAG 2.4.3)
 * Static analysis - identifies custom tabindex values
 */
export declare function analyzeFocusOrder($: CheerioAPI): {
    customTabIndexCount: number;
    negativeTabIndexCount: number;
    positiveTabIndexElements: Array<{
        selector: string;
        tabindex: number;
    }>;
};
/**
 * Analyze form autocomplete (WCAG 1.3.5)
 * Static analysis - checks for autocomplete attributes on personal data inputs
 */
export declare function analyzeFormAutocomplete($: CheerioAPI): {
    totalForms: number;
    formsWithAutocomplete: number;
    personalDataInputs: Array<{
        type: string;
        hasAutocomplete: boolean;
        autocompleteValue?: string;
        selector: string;
    }>;
};
//# sourceMappingURL=wcagData.d.ts.map