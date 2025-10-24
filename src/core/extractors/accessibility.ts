/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import * as cheerio from "cheerio";
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
  
  // All modes
  lang?: string; // lang attribute from <html> tag
  
  // Prerender/Full modes only
  formControls?: {
    totalInputs: number;
    missingLabel: number;
    inputsMissingLabel: string[]; // Array of selectors
  };
  focusOrder?: Array<{
    selector: string;
    tabindex: number;
  }>;
  
  // Full mode only
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
export function extractAccessibility(opts: {
  domSource: "raw" | "playwright";
  html: string;
  baseUrl: string;
  page?: Page;
  renderMode: "raw" | "prerender" | "full";
}): AccessibilityRecord {
  const $ = cheerio.load(opts.html);
  
  // Extract lang attribute (all modes)
  const lang = $("html").attr("lang") || undefined;
  
  // Count missing alt attributes
  let missingAltCount = 0;
  const missingAltSources: string[] = [];
  
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined || alt.trim() === "") {
      missingAltCount++;
      const src = $(el).attr("src");
      if (src && missingAltSources.length < 50) {
        missingAltSources.push(src);
      }
    }
  });
  
  // Build heading order
  const headingOrder: Array<"H1" | "H2" | "H3" | "H4" | "H5" | "H6"> = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tagName = $(el).prop("tagName");
    if (tagName) {
      headingOrder.push(tagName.toUpperCase() as any);
    }
  });
  
  // Check landmarks
  const landmarks = {
    header: $("header").length > 0,
    nav: $("nav").length > 0,
    main: $("main").length > 0,
    aside: $("aside").length > 0,
    footer: $("footer").length > 0
  };
  
  // Count roles
  const roles: Record<string, number> = {};
  $("[role]").each((_, el) => {
    const role = $(el).attr("role");
    if (role) {
      roles[role] = (roles[role] || 0) + 1;
    }
  });
  
  const record: AccessibilityRecord = {
    pageUrl: opts.baseUrl,
    missingAltCount,
    headingOrder,
    landmarks,
    roles,
    lang
  };
  
  // Add optional fields only if they have data
  if (missingAltSources.length > 0) {
    record.missingAltSources = missingAltSources;
  }
  
  // Prerender/Full mode additions: form controls and focus order
  if (opts.renderMode === "prerender" || opts.renderMode === "full") {
    // Form controls
    const inputs = $("input, textarea, select");
    let missingLabel = 0;
    const inputsMissingLabel: string[] = [];
    
    inputs.each((idx, el) => {
      const id = $(el).attr("id");
      const ariaLabel = $(el).attr("aria-label");
      const ariaLabelledby = $(el).attr("aria-labelledby");
      
      // Check if has associated label
      let hasLabel = false;
      if (id && $(`label[for="${id}"]`).length > 0) {
        hasLabel = true;
      }
      if (ariaLabel || ariaLabelledby) {
        hasLabel = true;
      }
      if ($(el).parent("label").length > 0) {
        hasLabel = true;
      }
      
      if (!hasLabel) {
        missingLabel++;
        const selector = id ? `#${id}` : `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`;
        inputsMissingLabel.push(selector);
      }
    });
    
    record.formControls = {
      totalInputs: inputs.length,
      missingLabel,
      inputsMissingLabel
    };
    
    // Focus order (simplified - get all focusable elements)
    const focusOrder: Array<{ selector: string; tabindex: number }> = [];
    $("a[href], button, input, textarea, select, [tabindex]").each((idx, el) => {
      const tabindex = parseInt($(el).attr("tabindex") || "0", 10);
      const id = $(el).attr("id");
      const selector = id ? `#${id}` : `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`;
      focusOrder.push({ selector, tabindex });
    });
    
    if (focusOrder.length > 0) {
      record.focusOrder = focusOrder;
    }
  }
  
  return record;
}

/**
 * Extract accessibility data with contrast checking (Playwright mode only)
 */
export async function extractAccessibilityWithContrast(opts: {
  page: Page;
  baseUrl: string;
  html: string;
}): Promise<AccessibilityRecord> {
  // Get basic accessibility data
  const record = extractAccessibility({
    domSource: "playwright",
    html: opts.html,
    baseUrl: opts.baseUrl,
    page: opts.page,
    renderMode: "full"
  });
  
  // Add contrast violations check
  try {
    // Use new Function to avoid TypeScript DOM type errors
    const contrastCheck = new Function(`
      function luminance(c) {
        const s = c.match(/\\d+(\\.\\d+)?/g)?.map(Number) || [0, 0, 0];
        const [r, g, b] = s.slice(0, 3).map(function(v) {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      
      function ratio(fg, bg) {
        const L1 = luminance(fg);
        const L2 = luminance(bg);
        const hi = Math.max(L1, L2);
        const lo = Math.min(L1, L2);
        return (hi + 0.05) / (lo + 0.05);
      }
      
      const nodes = Array.from(document.querySelectorAll('body *'))
        .filter(function(el) {
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') return false;
          if (!el.textContent || el.textContent.trim().length === 0) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .slice(0, 200);
      
      const out = [];
      for (const el of nodes) {
        const cs = getComputedStyle(el);
        const r = ratio(cs.color, cs.backgroundColor);
        const level = r >= 7 ? null : (r >= 4.5 ? null : "AA");
        if (level) {
          out.push({
            selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
            fg: cs.color,
            bg: cs.backgroundColor,
            ratio: Number(r.toFixed(2)),
            level: level
          });
          if (out.length >= 20) break;
        }
      }
      return out;
    `);
    
    const contrastViolations = await (opts.page.evaluate as any)(contrastCheck) as Array<{
      selector: string;
      fg: string;
      bg: string;
      ratio: number;
      level: "AA" | "AAA";
    }>;
    
    if (contrastViolations.length > 0) {
      record.contrastViolations = contrastViolations;
    }
  } catch (error) {
    // Contrast check failed, skip it
  }
  
  return record;
}
