/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import * as cheerio from "cheerio";
import { collectWCAGData, collectRuntimeWCAGData } from "./wcagData.js";
/**
 * Extract accessibility data from HTML
 */
export function extractAccessibility(opts) {
    const $ = cheerio.load(opts.html);
    // Extract lang attribute (all modes)
    const lang = $("html").attr("lang") || undefined;
    // Count missing alt attributes
    let missingAltCount = 0;
    const missingAltSources = [];
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
    const headingOrder = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        const tagName = $(el).prop("tagName");
        if (tagName) {
            headingOrder.push(tagName.toUpperCase());
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
    const roles = {};
    $("[role]").each((_, el) => {
        const role = $(el).attr("role");
        if (role) {
            roles[role] = (roles[role] || 0) + 1;
        }
    });
    const record = {
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
        const inputsMissingLabel = [];
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
        const focusOrder = [];
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
    // Full mode: Collect comprehensive WCAG 2.1 & 2.2 data
    if (opts.renderMode === "full") {
        try {
            record.wcagData = collectWCAGData($, opts.baseUrl);
            // Merge runtime WCAG data if provided
            if (opts.runtimeWCAGData) {
                record.wcagData = {
                    ...record.wcagData,
                    ...opts.runtimeWCAGData
                };
            }
        }
        catch (wcagError) {
            // WCAG data collection failed, skip it
        }
    }
    return record;
}
/**
 * Extract accessibility data with contrast checking (Playwright mode only)
 */
export async function extractAccessibilityWithContrast(opts) {
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
        const contrastViolations = await opts.page.evaluate(contrastCheck);
        if (contrastViolations.length > 0) {
            record.contrastViolations = contrastViolations;
        }
    }
    catch (error) {
        // Contrast check failed, skip it
    }
    // Collect runtime-only WCAG data (target size, focus appearance, etc.)
    if (record.wcagData) {
        try {
            const runtimeData = await collectRuntimeWCAGData(opts.page);
            record.wcagData = {
                ...record.wcagData,
                ...runtimeData
            };
        }
        catch (error) {
            // Runtime WCAG data collection failed, skip it
        }
    }
    return record;
}
//# sourceMappingURL=accessibility.js.map