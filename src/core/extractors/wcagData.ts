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
  // === WCAG 2.1/2.2 Success Criteria Data ===
  
  // 1.1.1 Non-text Content
  images: {
    total: number;
    withAlt: number;
    withoutAlt: number;
    withEmptyAlt: number; // Decorative
    missingAltSources: string[];
  };
  
  // 1.3.1 Info and Relationships
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
  
  // 1.3.5 Identify Input Purpose (WCAG 2.1)
  inputAutocomplete: {
    inputsWithAutocomplete: number;
    autocompleteValues: Record<string, number>;
  };
  
  // 1.4.3 Contrast (Minimum) - Collected in Playwright mode
  // Handled by existing contrastViolations
  
  // 1.4.4 Resize Text
  viewportRestrictions: {
    hasUserScalableNo: boolean;
    hasMaximumScale: boolean;
    maximumScale?: number;
  };
  
  // 1.4.10 Reflow (WCAG 2.1)
  responsiveDesign: {
    hasViewportMeta: boolean;
    viewportContent: string;
    hasMediaQueries: boolean;
  };
  
  // 1.4.11 Non-text Contrast (WCAG 2.1)
  // UI component contrast - collected in Playwright mode
  
  // 1.4.12 Text Spacing (WCAG 2.1)
  textSpacingProperties: {
    hasInlineStyles: boolean;
    hasImportantLineHeight: boolean;
    hasImportantLetterSpacing: boolean;
  };
  
  // 1.4.13 Content on Hover or Focus (WCAG 2.1)
  hoverFocusContent: {
    elementsWithTitle: number;
    elementsWithAriaDescribedby: number;
    tooltips: number;
  };
  
  // 2.1.1 Keyboard
  keyboardAccessibility: {
    focusableElements: number;
    customTabindexPositive: number;
    customTabindexNegative: number;
  };
  
  // 2.1.4 Character Key Shortcuts (WCAG 2.1)
  accessKeys: {
    elementsWithAccesskey: number;
    accesskeyValues: string[];
  };
  
  // 2.2.1 Timing Adjustable
  timingMechanisms: {
    hasMetaRefresh: boolean;
    refreshDelay?: number;
    refreshUrl?: string;
  };
  
  // 2.2.2 Pause, Stop, Hide
  autoplayElements: {
    autoplayVideos: number;
    autoplayAudios: number;
    marquees: number;
    blinks: number;
  };
  
  // 2.3.1 Three Flashes or Below Threshold (WCAG 2.1)
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
  
  // 1.2.1, 1.2.2, 1.2.3, 1.2.5 Multimedia (Captions, Transcripts, Audio Description)
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
      hasTranscript: boolean; // Detected by proximity
    }>;
    transcriptLinks: Array<{
      text: string;
      href: string;
    }>;
  };
  
  // 2.4.1 Bypass Blocks
  bypassMechanisms: {
    skipLinks: Array<{
      text: string;
      href: string;
    }>;
    hasAriaLandmarks: boolean;
    headingCount: number;
  };
  
  // 2.1.2 No Keyboard Trap (Runtime - full mode only)
  keyboardTraps?: {
    hasPotentialTraps: boolean;
    suspiciousElements: Array<{
      selector: string;
      reason: "no-tabindex-exit" | "focus-locked" | "event-prevent-default";
    }>;
  };
  
  // 2.4.1 Skip Links (Enhanced - Runtime - full mode only)
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
  
  // 4.1.3 Status Messages / ARIA Live Regions
  ariaLiveRegions?: {
    count: number;
    regions: Array<{
      live: "polite" | "assertive" | "off";
      atomic: boolean;
      relevant?: string;
      selector: string;
    }>;
  };
  
  // 2.4.3 Focus Order (Enhanced)
  focusOrderAnalysis?: {
    customTabIndexCount: number;
    negativeTabIndexCount: number;
    positiveTabIndexElements: Array<{
      selector: string;
      tabindex: number;
    }>;
  };
  
  // 1.3.5 Identify Input Purpose (Enhanced)
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
  
  // 1.2.x Video/Audio Analysis (Runtime - full mode only)
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
  
  // 2.4.2 Page Titled
  pageTitle: {
    exists: boolean;
    title: string;
    isEmpty: boolean;
  };
  
  // 2.4.3 Focus Order
  // Handled by existing focusOrder
  
  // 2.4.4 Link Purpose (In Context)
  links: {
    total: number;
    withText: number;
    withoutText: number;
    withAriaLabel: number;
    withTitle: number;
    ambiguousText: string[]; // "click here", "more", etc.
  };
  
  // 2.4.6 Headings and Labels
  headingsAndLabels: {
    headings: Array<"H1" | "H2" | "H3" | "H4" | "H5" | "H6">;
    multipleH1: boolean;
    skippedLevels: boolean;
  };
  
  // 2.4.11 Focus Not Obscured (Minimum) (WCAG 2.2)
  // Requires runtime analysis - collected in Playwright mode
  focusNotObscured?: Array<{
    selector: string;
    isObscured: boolean;
    visiblePercentage: number;
  }>;
  
  // 2.4.12 Focus Not Obscured (Enhanced) (WCAG 2.2)
  // Same as 2.4.11 but stricter - covered by focusNotObscured data
  
  // 2.4.13 Focus Appearance (WCAG 2.2)
  // Requires runtime analysis - collected in Playwright mode
  focusAppearance?: Array<{
    selector: string;
    outline: string;
    outlineWidth: string;
    outlineColor: string;
    boxShadow: string;
    hasFocusIndicator: boolean;
  }>;
  
  // 2.5.1 Pointer Gestures (WCAG 2.1)
  touchGestures: {
    hasTouchEventListeners: boolean;
  };
  
  // 2.5.2 Pointer Cancellation (WCAG 2.1)
  // Requires runtime analysis
  
  // 2.5.3 Label in Name (WCAG 2.1)
  labelInName: Array<{
    selector: string;
    visibleLabel?: string;
    accessibleName?: string;
  }>;
  
  // 2.5.4 Motion Actuation (WCAG 2.1)
  deviceMotion: {
    hasDeviceOrientationListeners: boolean;
    hasDeviceMotionListeners: boolean;
  };
  
  // 2.5.7 Dragging Movements (WCAG 2.2)
  draggableElements: {
    draggableCount: number;
    draggableSelectors: string[];
  };
  
  // 2.5.8 Target Size (Minimum) (WCAG 2.2)
  // Requires runtime measurement - collected in Playwright mode
  targetSize?: Array<{
    selector: string;
    width: number;
    height: number;
    meetsMinimum: boolean; // 24x24px minimum
  }>;
  
  // 3.1.1 Language of Page
  pageLanguage: {
    hasLang: boolean;
    lang?: string;
    isValid: boolean;
  };
  
  // 3.1.2 Language of Parts
  languageChanges: Array<{
    selector: string;
    lang: string;
  }>;
  
  // 3.2.1 On Focus
  // Requires runtime analysis
  
  // 3.2.2 On Input
  onChangeHandlers: {
    formsWithOnChange: number;
    inputsWithOnChange: number;
  };
  
  // 3.2.3 Consistent Navigation
  // Requires cross-page analysis (site-level)
  
  // 3.2.4 Consistent Identification
  // Requires cross-page analysis (site-level)
  
  // 3.2.6 Consistent Help (WCAG 2.2)
  // Requires cross-page analysis (site-level)
  
  // 3.3.1 Error Identification
  errorIdentification: {
    ariaInvalid: number;
    ariaErrormessage: number;
    requiredFields: number;
  };
  
  // 3.3.2 Labels or Instructions
  formLabels: {
    totalInputs: number;
    inputsWithLabels: number;
    inputsWithoutLabels: number;
    inputsMissingLabel: string[];
    inputTypes: Record<string, number>;
  };
  
  // 3.3.3 Error Suggestion
  // Requires runtime analysis
  
  // 3.3.7 Redundant Entry (WCAG 2.2)
  redundantEntry: {
    duplicateNameAttributes: string[];
    duplicateLabelTexts: string[];
  };
  
  // 3.3.8 Accessible Authentication (WCAG 2.2)
  authentication: {
    hasPasswordInput: boolean;
    hasCaptcha: boolean;
    hasAutocompletePassword: boolean;
  };
  
  // 4.1.1 Parsing
  parsingIssues: {
    duplicateIds: string[];
    missingClosingTags: number; // Approximate
  };
  
  // 4.1.2 Name, Role, Value
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
  
  // 4.1.3 Status Messages (WCAG 2.1)
  statusMessages: {
    ariaLive: number;
    ariaRoleStatus: number;
    ariaRoleAlert: number;
  };
}

/**
 * Collect WCAG audit data from HTML
 */
export function collectWCAGData($: CheerioAPI, baseUrl: string): WCAGDataCollection {
  // === 1.1.1 Images ===
  let imagesTotal = 0;
  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;
  let imagesWithEmptyAlt = 0;
  const missingAltSources: string[] = [];
  
  $("img").each((_, el) => {
    imagesTotal++;
    const alt = $(el).attr("alt");
    if (alt === undefined) {
      imagesWithoutAlt++;
      const src = $(el).attr("src");
      if (src && missingAltSources.length < 100) {
        missingAltSources.push(src);
      }
    } else if (alt.trim() === "") {
      imagesWithEmptyAlt++; // Decorative
    } else {
      imagesWithAlt++;
    }
  });
  
  // === 1.3.1 Tables ===
  const tables = $("table");
  const tableDetails: WCAGDataCollection["tables"]["details"] = [];
  
  tables.each((idx, table) => {
    const $table = $(table);
    const hasHeaders = $table.find("th").length > 0;
    const hasCaption = $table.find("caption").length > 0;
    const hasScope = $table.find("[scope]").length > 0;
    const hasSummary = $table.attr("summary") !== undefined;
    const id = $table.attr("id");
    
    tableDetails.push({
      selector: id ? `#${id}` : `table:nth-of-type(${idx + 1})`,
      hasHeaders,
      hasCaption,
      hasScope,
      hasSummary
    });
  });
  
  // === 1.3.5 Input Autocomplete ===
  const inputsWithAutocomplete: string[] = [];
  const autocompleteValues: Record<string, number> = {};
  
  $("input[autocomplete], textarea[autocomplete], select[autocomplete]").each((_, el) => {
    const autocomplete = $(el).attr("autocomplete");
    if (autocomplete && autocomplete !== "off" && autocomplete !== "on") {
      inputsWithAutocomplete.push(autocomplete);
      autocompleteValues[autocomplete] = (autocompleteValues[autocomplete] || 0) + 1;
    }
  });
  
  // === 1.4.4 Viewport Restrictions ===
  const viewportMeta = $("meta[name='viewport']").attr("content") || "";
  const viewportRestrictions = {
    hasUserScalableNo: /user-scalable\s*=\s*no/i.test(viewportMeta),
    hasMaximumScale: /maximum-scale\s*=\s*[\d.]+/i.test(viewportMeta),
    maximumScale: viewportMeta.match(/maximum-scale\s*=\s*([\d.]+)/i)?.[1]
      ? parseFloat(viewportMeta.match(/maximum-scale\s*=\s*([\d.]+)/i)![1])
      : undefined
  };
  
  // === 1.4.10 Responsive Design ===
  const styleContent = $("style").text();
  const responsiveDesign = {
    hasViewportMeta: $("meta[name='viewport']").length > 0,
    viewportContent: viewportMeta,
    hasMediaQueries: /@media/.test(styleContent)
  };
  
  // === 1.4.12 Text Spacing ===
  const textSpacingProperties = {
    hasInlineStyles: $("[style]").length > 0,
    hasImportantLineHeight: /line-height\s*:\s*[^;]*!important/i.test(styleContent),
    hasImportantLetterSpacing: /letter-spacing\s*:\s*[^;]*!important/i.test(styleContent)
  };
  
  // === 1.4.13 Hover/Focus Content ===
  const hoverFocusContent = {
    elementsWithTitle: $("[title]").length,
    elementsWithAriaDescribedby: $("[aria-describedby]").length,
    tooltips: $("[role='tooltip']").length
  };
  
  // === 2.1.1 Keyboard Accessibility ===
  const focusableElements = $("a[href], button, input, textarea, select, [tabindex]");
  const keyboardAccessibility = {
    focusableElements: focusableElements.length,
    customTabindexPositive: $("[tabindex]").filter((_, el) => {
      const tabindex = parseInt($(el).attr("tabindex") || "0", 10);
      return tabindex > 0;
    }).length,
    customTabindexNegative: $("[tabindex]").filter((_, el) => {
      const tabindex = parseInt($(el).attr("tabindex") || "0", 10);
      return tabindex < 0;
    }).length
  };
  
  // === 2.1.4 Access Keys ===
  const accesskeyElements = $("[accesskey]");
  const accessKeys = {
    elementsWithAccesskey: accesskeyElements.length,
    accesskeyValues: accesskeyElements.map((_, el) => $(el).attr("accesskey") || "").get()
  };
  
  // === 2.2.1 Timing ===
  const metaRefreshTag = $("meta[http-equiv='refresh']").attr("content");
  let timingMechanisms: WCAGDataCollection["timingMechanisms"] = {
    hasMetaRefresh: false
  };
  if (metaRefreshTag) {
    const match = metaRefreshTag.match(/(\d+)(?:;\s*url=(.+))?/i);
    timingMechanisms = {
      hasMetaRefresh: true,
      refreshDelay: match?.[1] ? parseInt(match[1], 10) : undefined,
      refreshUrl: match?.[2]
    };
  }
  
  // === 2.2.2 Autoplay ===
  const autoplayElements = {
    autoplayVideos: $("video[autoplay]").length,
    autoplayAudios: $("audio[autoplay]").length,
    marquees: $("marquee").length,
    blinks: $("blink").length
  };
  
  // === 1.2.1, 1.2.2, 1.2.3, 1.2.5 Multimedia Accessibility ===
  const videoElements: WCAGDataCollection["multimedia"]["videos"] = [];
  $("video").slice(0, 20).each((_, video) => {
    const $video = $(video);
    const id = $video.attr("id");
    const selector = id ? `video#${id}` : `video[${videoElements.length}]`;
    
    // Check for <track> elements (captions, descriptions)
    const tracks = $video.find("track");
    let captionTracks = 0;
    let audioDescriptionTracks = 0;
    
    tracks.each((_, track) => {
      const kind = $(track).attr("kind");
      if (kind === "captions" || kind === "subtitles") {
        captionTracks++;
      } else if (kind === "descriptions") {
        audioDescriptionTracks++;
      }
    });
    
    videoElements.push({
      selector,
      hasControls: $video.attr("controls") !== undefined,
      hasCaptions: captionTracks > 0,
      captionTracks,
      hasAudioDescription: audioDescriptionTracks > 0,
      audioDescriptionTracks
    });
  });
  
  const audioElements: WCAGDataCollection["multimedia"]["audios"] = [];
  $("audio").slice(0, 20).each((_, audio) => {
    const $audio = $(audio);
    const id = $audio.attr("id");
    const selector = id ? `audio#${id}` : `audio[${audioElements.length}]`;
    
    // Check for nearby transcript links (heuristic: within same parent or next siblings)
    const parent = $audio.parent();
    const hasTranscript = 
      parent.find("a[href*='transcript'], a:contains('Transcript'), a:contains('transcript')").length > 0 ||
      $audio.next().is("a[href*='transcript']");
    
    audioElements.push({
      selector,
      hasControls: $audio.attr("controls") !== undefined,
      hasTranscript
    });
  });
  
  // Look for transcript links globally
  const transcriptLinks: WCAGDataCollection["multimedia"]["transcriptLinks"] = [];
  $("a[href*='transcript'], a:contains('Transcript'), a:contains('transcript')").slice(0, 10).each((_, link) => {
    const $link = $(link);
    const text = $link.text().trim();
    const href = $link.attr("href");
    if (text && href) {
      transcriptLinks.push({ text, href });
    }
  });
  
  const multimedia = {
    videos: videoElements,
    audios: audioElements,
    transcriptLinks
  };
  
  // === 2.4.1 Bypass Blocks ===
  const skipLinks: WCAGDataCollection["bypassMechanisms"]["skipLinks"] = [];
  $("a[href^='#']").slice(0, 10).each((_, link) => {
    const $link = $(link);
    const text = $link.text().trim();
    const href = $link.attr("href");
    if (text && href && /skip|jump|main|content|navigation/i.test(text)) {
      skipLinks.push({ text, href });
    }
  });
  
  const hasAriaLandmarks = $("[role='main'], [role='navigation'], [role='banner'], [role='contentinfo']").length > 0 ||
                           $("main, nav, header, footer").length > 0;
  
  // === 2.4.2 Page Title ===
  const titleElement = $("title");
  const titleText = titleElement.text().trim();
  const pageTitle = {
    exists: titleElement.length > 0,
    title: titleText,
    isEmpty: titleText.length === 0
  };
  
  // === 2.4.4 Link Purpose ===
  const allLinks = $("a[href]");
  let linksWithText = 0;
  let linksWithoutText = 0;
  let linksWithAriaLabel = 0;
  let linksWithTitle = 0;
  const ambiguousText: string[] = [];
  const ambiguousTerms = ["click here", "read more", "more", "here", "link", "this", "click"];
  
  allLinks.each((_, link) => {
    const $link = $(link);
    const text = $link.text().trim().toLowerCase();
    const ariaLabel = $link.attr("aria-label");
    const title = $link.attr("title");
    
    if (text) linksWithText++;
    else linksWithoutText++;
    
    if (ariaLabel) linksWithAriaLabel++;
    if (title) linksWithTitle++;
    
    if (ambiguousTerms.includes(text) && ambiguousText.length < 50) {
      ambiguousText.push(`${text} → ${$link.attr("href")}`);
    }
  });
  
  // === 2.4.6 Headings ===
  const headings: Array<"H1" | "H2" | "H3" | "H4" | "H5" | "H6"> = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tagName = $(el).prop("tagName");
    if (tagName) {
      headings.push(tagName.toUpperCase() as any);
    }
  });
  
  const h1Count = headings.filter(h => h === "H1").length;
  let skippedLevels = false;
  for (let i = 1; i < headings.length; i++) {
    const current = parseInt(headings[i].replace("H", ""));
    const previous = parseInt(headings[i - 1].replace("H", ""));
    if (current - previous > 1) {
      skippedLevels = true;
      break;
    }
  }
  
  // === 2.5.3 Label in Name ===
  const labelInName: WCAGDataCollection["labelInName"] = [];
  $("button, a[href], input[type='button'], input[type='submit']").slice(0, 50).each((idx, el) => {
    const $el = $(el);
    const visibleLabel = $el.text().trim();
    const ariaLabel = $el.attr("aria-label");
    const id = $el.attr("id");
    
    if (visibleLabel && ariaLabel && !ariaLabel.includes(visibleLabel)) {
      labelInName.push({
        selector: id ? `#${id}` : `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`,
        visibleLabel,
        accessibleName: ariaLabel
      });
    }
  });
  
  // === 2.5.4 Device Motion ===
  const scriptContent = $("script").text();
  const deviceMotion = {
    hasDeviceOrientationListeners: /deviceorientation/i.test(scriptContent),
    hasDeviceMotionListeners: /devicemotion/i.test(scriptContent)
  };
  
  // === 2.5.7 Dragging ===
  const draggableElements = {
    draggableCount: $("[draggable='true']").length,
    draggableSelectors: $("[draggable='true']").slice(0, 20).map((_, el) => {
      const id = $(el).attr("id");
      return id ? `#${id}` : el.tagName.toLowerCase();
    }).get()
  };
  
  // === 3.1.1 Page Language ===
  const htmlLang = $("html").attr("lang");
  const validLangPattern = /^[a-z]{2,3}(-[A-Z]{2})?$/;
  const pageLanguage = {
    hasLang: htmlLang !== undefined,
    lang: htmlLang,
    isValid: htmlLang ? validLangPattern.test(htmlLang) : false
  };
  
  // === 3.1.2 Language of Parts ===
  const languageChanges: WCAGDataCollection["languageChanges"] = [];
  $("[lang]").not("html").slice(0, 50).each((idx, el) => {
    const elementLang = $(el).attr("lang");
    const id = $(el).attr("id");
    if (elementLang) {
      languageChanges.push({
        selector: id ? `#${id}` : `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`,
        lang: elementLang
      });
    }
  });
  
  // === 3.2.2 On Input ===
  const onChangeHandlers = {
    formsWithOnChange: $("form[onchange]").length,
    inputsWithOnChange: $("input[onchange], select[onchange], textarea[onchange]").length
  };
  
  // === 3.3.1 Error Identification ===
  const errorIdentification = {
    ariaInvalid: $("[aria-invalid='true']").length,
    ariaErrormessage: $("[aria-errormessage]").length,
    requiredFields: $("[required], [aria-required='true']").length
  };
  
  // === 3.3.2 Form Labels ===
  const allInputs = $("input, textarea, select");
  let inputsWithLabels = 0;
  let inputsWithoutLabels = 0;
  const inputsMissingLabel: string[] = [];
  const inputTypes: Record<string, number> = {};
  
  allInputs.each((idx, el) => {
    const $el = $(el);
    const id = $el.attr("id");
    const type = $el.attr("type") || el.tagName.toLowerCase();
    const ariaLabel = $el.attr("aria-label");
    const ariaLabelledby = $el.attr("aria-labelledby");
    
    inputTypes[type] = (inputTypes[type] || 0) + 1;
    
    let hasLabel = false;
    if (id && $(`label[for="${id}"]`).length > 0) hasLabel = true;
    if (ariaLabel || ariaLabelledby) hasLabel = true;
    if ($el.parent("label").length > 0) hasLabel = true;
    
    if (hasLabel) {
      inputsWithLabels++;
    } else {
      inputsWithoutLabels++;
      if (inputsMissingLabel.length < 100) {
        const selector = id ? `#${id}` : `${el.tagName.toLowerCase()}[type="${type}"]:nth-of-type(${idx + 1})`;
        inputsMissingLabel.push(selector);
      }
    }
  });
  
  // === 3.3.7 Redundant Entry ===
  const nameAttributes = new Map<string, number>();
  const labelTexts = new Map<string, number>();
  
  $("input[name], textarea[name], select[name]").each((_, el) => {
    const name = $(el).attr("name");
    if (name) {
      nameAttributes.set(name, (nameAttributes.get(name) || 0) + 1);
    }
  });
  
  $("label").each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      labelTexts.set(text, (labelTexts.get(text) || 0) + 1);
    }
  });
  
  const redundantEntry = {
    duplicateNameAttributes: Array.from(nameAttributes.entries())
      .filter(([_, count]) => count > 1)
      .map(([name]) => name)
      .slice(0, 20),
    duplicateLabelTexts: Array.from(labelTexts.entries())
      .filter(([_, count]) => count > 1)
      .map(([text]) => text)
      .slice(0, 20)
  };
  
  // === 3.3.8 Authentication ===
  const authentication = {
    hasPasswordInput: $("input[type='password']").length > 0,
    hasCaptcha: $("[class*='captcha'], [id*='captcha'], [class*='recaptcha'], [id*='recaptcha']").length > 0,
    hasAutocompletePassword: $("input[autocomplete='current-password'], input[autocomplete='new-password']").length > 0
  };
  
  // === 4.1.1 Parsing ===
  const ids = new Map<string, number>();
  $("[id]").each((_, el) => {
    const id = $(el).attr("id");
    if (id) {
      ids.set(id, (ids.get(id) || 0) + 1);
    }
  });
  
  const duplicateIds = Array.from(ids.entries())
    .filter(([_, count]) => count > 1)
    .map(([id]) => id)
    .slice(0, 50);
  
  // === 4.1.2 ARIA Compliance ===
  const totalAriaElements = $("[role], [aria-label], [aria-labelledby], [aria-describedby]").length;
  let ariaLabelledbyIssues = 0;
  let ariaDescribedbyIssues = 0;
  const missingRequiredAriaAttributes: WCAGDataCollection["ariaCompliance"]["missingRequiredAriaAttributes"] = [];
  const invalidAriaReferences: WCAGDataCollection["ariaCompliance"]["invalidAriaReferences"] = [];
  
  // Check aria-labelledby references
  $("[aria-labelledby]").each((_, el) => {
    const labelledby = $(el).attr("aria-labelledby");
    if (labelledby) {
      const ids = labelledby.split(/\s+/);
      for (const id of ids) {
        if (!$(`#${id}`).length) {
          ariaLabelledbyIssues++;
          if (invalidAriaReferences.length < 50) {
            invalidAriaReferences.push({
              selector: $(el).attr("id") || el.tagName.toLowerCase(),
              attribute: "aria-labelledby",
              missingId: id
            });
          }
        }
      }
    }
  });
  
  // Check aria-describedby references
  $("[aria-describedby]").each((_, el) => {
    const describedby = $(el).attr("aria-describedby");
    if (describedby) {
      const ids = describedby.split(/\s+/);
      for (const id of ids) {
        if (!$(`#${id}`).length) {
          ariaDescribedbyIssues++;
          if (invalidAriaReferences.length < 50) {
            invalidAriaReferences.push({
              selector: $(el).attr("id") || el.tagName.toLowerCase(),
              attribute: "aria-describedby",
              missingId: id
            });
          }
        }
      }
    }
  });
  
  // Check required ARIA attributes
  $("[role='checkbox'], [role='radio']").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("aria-checked")) {
      if (missingRequiredAriaAttributes.length < 50) {
        missingRequiredAriaAttributes.push({
          selector: $el.attr("id") || el.tagName.toLowerCase(),
          role: $el.attr("role") || "",
          missingAttribute: "aria-checked"
        });
      }
    }
  });
  
  // === 4.1.3 Status Messages ===
  const statusMessages = {
    ariaLive: $("[aria-live]").length,
    ariaRoleStatus: $("[role='status']").length,
    ariaRoleAlert: $("[role='alert']").length
  };
  
  // === Phase 1 Enhancements: Static Analysis ===
  const ariaLiveRegions = extractAriaLiveRegions($);
  const focusOrderAnalysis = analyzeFocusOrder($);
  const formAutocomplete = analyzeFormAutocomplete($);
  
  return {
    images: {
      total: imagesTotal,
      withAlt: imagesWithAlt,
      withoutAlt: imagesWithoutAlt,
      withEmptyAlt: imagesWithEmptyAlt,
      missingAltSources
    },
    tables: {
      total: tables.length,
      withHeaders: tableDetails.filter(t => t.hasHeaders).length,
      withCaption: tableDetails.filter(t => t.hasCaption).length,
      withScope: tableDetails.filter(t => t.hasScope).length,
      details: tableDetails.slice(0, 50)
    },
    inputAutocomplete: {
      inputsWithAutocomplete: inputsWithAutocomplete.length,
      autocompleteValues
    },
    viewportRestrictions,
    responsiveDesign,
    textSpacingProperties,
    hoverFocusContent,
    keyboardAccessibility,
    accessKeys,
    timingMechanisms,
    autoplayElements,
    multimedia,
    bypassMechanisms: {
      skipLinks,
      hasAriaLandmarks,
      headingCount: headings.length
    },
    ariaLiveRegions,
    focusOrderAnalysis,
    formAutocomplete,
    pageTitle,
    links: {
      total: allLinks.length,
      withText: linksWithText,
      withoutText: linksWithoutText,
      withAriaLabel: linksWithAriaLabel,
      withTitle: linksWithTitle,
      ambiguousText
    },
    headingsAndLabels: {
      headings,
      multipleH1: h1Count > 1,
      skippedLevels
    },
    touchGestures: {
      hasTouchEventListeners: /touchstart|touchmove|touchend/i.test(scriptContent)
    },
    labelInName,
    deviceMotion,
    draggableElements,
    pageLanguage,
    languageChanges,
    onChangeHandlers,
    errorIdentification,
    formLabels: {
      totalInputs: allInputs.length,
      inputsWithLabels,
      inputsWithoutLabels,
      inputsMissingLabel,
      inputTypes
    },
    redundantEntry,
    authentication,
    parsingIssues: {
      duplicateIds,
      missingClosingTags: 0 // Cheerio auto-fixes, so this is approximate
    },
    ariaCompliance: {
      totalAriaElements,
      ariaLabelledbyIssues,
      ariaDescribedbyIssues,
      missingRequiredAriaAttributes,
      invalidAriaReferences
    },
    statusMessages
  };
}

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
export async function collectRuntimeWCAGData(page: any): Promise<Partial<WCAGDataCollection>> {
  try {
    // Define the browser-side collection script as a string to avoid TS DOM errors
    const runtimeScript = new Function(`
      // Target Size Check (WCAG 2.2 - 2.5.8)
      const interactiveElements = Array.from(document.querySelectorAll(
        'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [onclick]'
      )).slice(0, 100); // Limit to 100 elements
      
      const targetSizes = interactiveElements.map((el, idx) => {
        const rect = el.getBoundingClientRect();
        const tagName = el.tagName.toLowerCase();
        const id = el.id;
        const selector = id ? tagName + '#' + id : tagName + '[' + idx + ']';
        
        return {
          selector: selector,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          meetsMinimum: rect.width >= 24 && rect.height >= 24
        };
      }).filter(function(item) { return item.width > 0 && item.height > 0; }); // Filter out hidden elements
      
      // Focus Appearance Check (WCAG 2.2 - 2.4.13)
      const focusableElements = Array.from(document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).slice(0, 50); // Limit to 50 elements
      
      const focusAppearance = focusableElements.map((el, idx) => {
        const tagName = el.tagName.toLowerCase();
        const id = el.id;
        const selector = id ? tagName + '#' + id : tagName + '[' + idx + ']';
        
        // Temporarily focus the element to check styles
        const originalFocus = document.activeElement;
        el.focus();
        
        const styles = window.getComputedStyle(el);
        const outline = styles.outline;
        const outlineWidth = styles.outlineWidth;
        const outlineColor = styles.outlineColor;
        const boxShadow = styles.boxShadow;
        
        // Determine if there's a visible focus indicator
        const hasFocusIndicator = 
          (outline && outline !== 'none' && outlineWidth !== '0px') ||
          (boxShadow && boxShadow !== 'none');
        
        // Restore original focus
        if (originalFocus) {
          originalFocus.focus();
        } else {
          el.blur();
        }
        
        return {
          selector: selector,
          outline: outline,
          outlineWidth: outlineWidth,
          outlineColor: outlineColor,
          boxShadow: boxShadow,
          hasFocusIndicator: hasFocusIndicator
        };
      });
      
      // Focus Not Obscured Check (WCAG 2.2 - 2.4.11, 2.4.12)
      const focusNotObscured = focusableElements.slice(0, 50).map((el, idx) => {
        const tagName = el.tagName.toLowerCase();
        const id = el.id;
        const selector = id ? tagName + '#' + id : tagName + '[' + idx + ']';
        
        const rect = el.getBoundingClientRect();
        
        // Check if element is fully visible (simple heuristic)
        const isInViewport = 
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth;
        
        const visiblePercentage = isInViewport ? 100 : 0; // Simplified calculation
        
        return {
          selector: selector,
          isObscured: !isInViewport,
          visiblePercentage: visiblePercentage
        };
      });
      
      return {
        targetSize: targetSizes,
        focusAppearance: focusAppearance,
        focusNotObscured: focusNotObscured
      };
    `);
    
    const runtimeData = await (page.evaluate as any)(runtimeScript) as Partial<WCAGDataCollection>;
    return runtimeData;
  } catch (error) {
    // Runtime collection failed, return empty
    return {};
  }
}

/**
 * Extract ARIA live regions (WCAG 4.1.3)
 * Static analysis - finds elements with aria-live attribute or implicit live roles
 */
export function extractAriaLiveRegions($: CheerioAPI): {
  count: number;
  regions: Array<{
    live: "polite" | "assertive" | "off";
    atomic: boolean;
    relevant?: string;
    selector: string;
  }>;
} {
  const regions: Array<{
    live: "polite" | "assertive" | "off";
    atomic: boolean;
    relevant?: string;
    selector: string;
  }> = [];
  
  // Find explicit aria-live attributes
  $('[aria-live]').each((i, el) => {
    if (i >= 50) return false; // Limit to 50 regions
    
    const $el = $(el);
    const live = $el.attr('aria-live') as "polite" | "assertive" | "off";
    const atomic = $el.attr('aria-atomic') === 'true';
    const relevant = $el.attr('aria-relevant');
    
    const selector = el.tagName.toLowerCase() + 
      (el.attribs.id ? `#${el.attribs.id}` : '') +
      (el.attribs.class ? `.${el.attribs.class.split(' ').slice(0, 2).join('.')}` : '');
    
    regions.push({
      live: live || 'polite',
      atomic,
      relevant,
      selector: selector.substring(0, 100)
    });
  });
  
  // Find implicit live regions (status, alert, log roles)
  $('[role="status"], [role="alert"], [role="log"]').each((i, el) => {
    if (regions.length >= 50) return false;
    
    const $el = $(el);
    const role = $el.attr('role');
    const atomic = $el.attr('aria-atomic') === 'true';
    const relevant = $el.attr('aria-relevant');
    
    // Map role to live value
    const liveValue: "polite" | "assertive" | "off" = 
      role === 'alert' ? 'assertive' : 'polite';
    
    const selector = el.tagName.toLowerCase() +
      (el.attribs.id ? `#${el.attribs.id}` : '') +
      (el.attribs.class ? `.${el.attribs.class.split(' ').slice(0, 2).join('.')}` : '');
    
    regions.push({
      live: liveValue,
      atomic,
      relevant,
      selector: selector.substring(0, 100)
    });
  });
  
  return {
    count: regions.length,
    regions
  };
}

/**
 * Analyze focus order and tabindex usage (WCAG 2.4.3)
 * Static analysis - identifies custom tabindex values
 */
export function analyzeFocusOrder($: CheerioAPI): {
  customTabIndexCount: number;
  negativeTabIndexCount: number;
  positiveTabIndexElements: Array<{
    selector: string;
    tabindex: number;
  }>;
} {
  const positiveTabIndexElements: Array<{
    selector: string;
    tabindex: number;
  }> = [];
  
  let customTabIndexCount = 0;
  let negativeTabIndexCount = 0;
  
  $('[tabindex]').each((i, el) => {
    const $el = $(el);
    const tabindex = parseInt($el.attr('tabindex') || '0');
    
    if (tabindex !== 0) {
      customTabIndexCount++;
      
      if (tabindex < 0) {
        negativeTabIndexCount++;
      } else if (tabindex > 0 && positiveTabIndexElements.length < 20) {
        // Positive tabindex is an anti-pattern
        const selector = el.tagName.toLowerCase() +
          (el.attribs.id ? `#${el.attribs.id}` : '') +
          (el.attribs.class ? `.${el.attribs.class.split(' ').slice(0, 2).join('.')}` : '');
        
        positiveTabIndexElements.push({
          selector: selector.substring(0, 100),
          tabindex
        });
      }
    }
  });
  
  return {
    customTabIndexCount,
    negativeTabIndexCount,
    positiveTabIndexElements
  };
}

/**
 * Analyze form autocomplete (WCAG 1.3.5)
 * Static analysis - checks for autocomplete attributes on personal data inputs
 */
export function analyzeFormAutocomplete($: CheerioAPI): {
  totalForms: number;
  formsWithAutocomplete: number;
  personalDataInputs: Array<{
    type: string;
    hasAutocomplete: boolean;
    autocompleteValue?: string;
    selector: string;
  }>;
} {
  const personalDataInputs: Array<{
    type: string;
    hasAutocomplete: boolean;
    autocompleteValue?: string;
    selector: string;
  }> = [];
  
  const totalForms = $('form').length;
  const formsWithAutocomplete = $('form[autocomplete]').length;
  
  // Personal data input types and patterns
  const personalDataPatterns = [
    { selector: 'input[type="email"]', type: 'email' },
    { selector: 'input[type="tel"]', type: 'tel' },
    { selector: 'input[name*="email"]', type: 'email' },
    { selector: 'input[name*="phone"]', type: 'tel' },
    { selector: 'input[name*="address"]', type: 'address' },
    { selector: 'input[name*="name"]', type: 'name' },
    { selector: 'input[name*="postal"]', type: 'postal-code' },
    { selector: 'input[name*="zip"]', type: 'postal-code' },
    { selector: 'input[name*="city"]', type: 'address-level2' },
    { selector: 'input[name*="country"]', type: 'country' },
  ];
  
  personalDataPatterns.forEach(pattern => {
    $(pattern.selector).each((i, el) => {
      if (personalDataInputs.length >= 50) return false; // Limit to 50
      
      const $el = $(el);
      const autocomplete = $el.attr('autocomplete');
      const hasAutocomplete = !!autocomplete;
      
      const tagName = (el as any).tagName || 'input';
      const attribs = (el as any).attribs || {};
      const selector = tagName.toLowerCase() +
        (attribs.id ? `#${attribs.id}` : '') +
        (attribs.name ? `[name="${attribs.name}"]` : '');
      
      personalDataInputs.push({
        type: pattern.type,
        hasAutocomplete,
        autocompleteValue: autocomplete,
        selector: selector.substring(0, 100)
      });
    });
  });
  
  return {
    totalForms,
    formsWithAutocomplete,
    personalDataInputs
  };
}
