/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";
import { log } from "../../utils/logging.js";
import { iterateParts } from "../readers/atlsReader.js";

interface ExportOptions {
  atlsPath: string;
  report: "pages" | "edges" | "assets" | "errors" | "accessibility";
  outPath?: string;
}

/**
 * Fixed-order field mappings for each report type
 */
const FIELD_MAPS = {
  pages: [
    "url", "finalUrl", "normalizedUrl", "statusCode", "contentType",
    "rawHtmlHash", "domHash", "renderMode", "navEndReason", "depth",
    "discoveredFrom", "section", "title", "metaDescription", "h1",
    "internalLinksCount", "externalLinksCount", "mediaAssetsCount",
    "canonicalHref", "canonicalResolved", "noindexSurface", "fetchMs", "renderMs",
    // Network metrics
    "network.totalRequests", "network.totalBytes", "network.totalDuration",
    // Enhanced SEO
    "enhancedSEO.indexability.isNoIndex", "enhancedSEO.content.titleLength.pixels",
    "enhancedSEO.international.hreflangCount",
    // Performance scores
    "performance.scores.performance", "performance.scores.accessibility",
    // Response metadata (Atlas v1.0 Enhancement - Phase 5)
    "response_headers.server", "response_headers.cache_control", "response_headers.content_encoding",
    "cdn_indicators.detected", "cdn_indicators.provider", "cdn_indicators.confidence",
    "compression_details.algorithm", "compression_details.compressed_size"
  ],
  edges: [
    "sourceUrl", "targetUrl", "isExternal", "anchorText", "rel",
    "nofollow", "location", "selectorHint", "discoveredInMode",
    // Link attributes
    "sponsored", "ugc",
    // Link context (Atlas v1.0 Enhancement - Phase 4)
    "link_type", "target_attr", "title_attr", "download_attr",
    "hreflang", "type_attr", "aria_label", "role",
    "is_primary_nav", "is_breadcrumb", "is_skip_link", "is_pagination"
  ],
  assets: [
    "pageUrl", "src", "type", "alt", "hasAlt",
    "naturalWidth", "naturalHeight", "displayWidth", "displayHeight",
    "loadingAttr", "wasLazyLoaded", "visible", "inViewport"
  ],
  errors: [
    "url", "origin", "hostname", "phase", "code",
    "message", "occurredAt"
  ],
  accessibility: [
    "pageUrl",
    // Audit versioning (Atlas v1.0 Enhancement - Phase 3)
    "audit_engine.name", "audit_engine.version", "wcag_version", "audit_profile", "audited_at",
    // Basic metrics
    "missingAltCount", "lang",
    // Heading order
    "headingOrder",
    // Landmarks
    "landmarks.header", "landmarks.nav", "landmarks.main", "landmarks.aside", "landmarks.footer",
    // Form controls
    "formControls.totalInputs", "formControls.missingLabel",
    // WCAG Data - Images
    "wcagData.images.total", "wcagData.images.withAlt", "wcagData.images.withoutAlt",
    // WCAG Data - Tables
    "wcagData.tables.total", "wcagData.tables.withHeaders", "wcagData.tables.withCaption",
    // WCAG Data - Keyboard accessibility
    "wcagData.keyboardAccessibility.focusableElements",
    "wcagData.keyboardAccessibility.customTabindexPositive",
    // WCAG Data - Bypass mechanisms
    "wcagData.bypassMechanisms.hasAriaLandmarks", "wcagData.bypassMechanisms.headingCount",
    // WCAG Data - Multimedia
    "wcagData.multimedia.videos", "wcagData.multimedia.audios",
    // WCAG Data - Responsive design
    "wcagData.responsiveDesign.hasViewportMeta", "wcagData.responsiveDesign.hasMediaQueries",
    // WCAG Data - Viewport restrictions
    "wcagData.viewportRestrictions.hasUserScalableNo", "wcagData.viewportRestrictions.hasMaximumScale",
    // WCAG Enhancements - Multiple Ways
    "wcagData.multipleWays.hasSiteMap", "wcagData.multipleWays.hasSearchFunction", 
    "wcagData.multipleWays.hasBreadcrumbs", "wcagData.multipleWays.searchForms",
    // WCAG Enhancements - Sensory Characteristics
    "wcagData.sensoryCharacteristics.sensoryReferences",
    // WCAG Enhancements - Images of Text
    "wcagData.imagesOfText.suspiciousImages",
    // WCAG Enhancements - Navigation Elements
    "wcagData.navigationElements.mainNav", "wcagData.navigationElements.headerNav", 
    "wcagData.navigationElements.footerNav",
    // WCAG Enhancements - Component Identification
    "wcagData.componentIdentification.buttons", "wcagData.componentIdentification.links",
    "wcagData.componentIdentification.icons",
    // WCAG Enhancements - Pointer Cancellation
    "wcagData.pointerCancellation.elementsWithMousedown", 
    "wcagData.pointerCancellation.elementsWithTouchstart",
    // WCAG Enhancements - Focus Context Change
    "wcagData.onFocusContextChange.elementsWithOnfocus",
    "wcagData.onFocusContextChange.suspiciousElements"
  ]
};

/**
 * Export CSV from an .atls archive
 */
export async function exportCsv(options: ExportOptions): Promise<void> {
  // Log to stderr to avoid mixing with CSV stdout
  const logToStderr = (level: string, msg: string) => {
    console.error(`[${level.toUpperCase()}] ${msg}`);
  };
  
  logToStderr("info", `Exporting ${options.report} from ${options.atlsPath}...`);
  
  const fields = FIELD_MAPS[options.report];
  
  // Create CSV stream with fixed headers
  const csvStream = format({ 
    headers: fields,
    writeHeaders: true,
    includeEndRowDelimiter: true
  });
  
  // Pipe to output
  if (options.outPath) {
    const output = createWriteStream(options.outPath);
    csvStream.pipe(output);
  } else {
    csvStream.pipe(process.stdout);
  }
  
  let count = 0;
  
  try {
    // Stream JSONL lines from compressed parts
    for await (const line of iterateParts(options.atlsPath, options.report)) {
      const record = JSON.parse(line);
      
      // Map record to CSV row with fixed field order
      const row = mapRecordToRow(record, options.report);
      csvStream.write(row);
      count++;
    }
    
    csvStream.end();
    
    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      csvStream.on("finish", resolve);
      csvStream.on("error", reject);
    });
    
    // If no records were written, fast-csv won't have written headers
    // Write them manually for header-only files
    if (count === 0 && options.outPath) {
      const output = createWriteStream(options.outPath);
      output.write(fields.join(",") + "\n");
      output.end();
      await new Promise<void>((resolve) => output.on("finish", () => resolve()));
    }
    
    logToStderr("info", `Export complete: ${count} records`);
  } catch (error) {
    csvStream.end();
    logToStderr("error", `Export failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Map a JSONL record to a CSV row array with fixed field order
 */
function mapRecordToRow(record: any, report: string): any[] {
  const fields = FIELD_MAPS[report as keyof typeof FIELD_MAPS];
  
  return fields.map(field => {
    // Handle nested fields (e.g., "network.totalRequests", "enhancedSEO.indexability.isNoIndex")
    if (field.includes('.')) {
      const parts = field.split('.');
      let value = record;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined || value === null) break;
      }
      
      // Handle null/undefined
      if (value == null) return "";
      
      // Convert objects/arrays to JSON strings
      if (typeof value === "object") return JSON.stringify(value);
      
      return value;
    }
    
    // Handle simple fields
    const value = record[field];
    
    // Handle null/undefined
    if (value == null) return "";
    
    // Convert objects/arrays to JSON strings
    if (typeof value === "object") return JSON.stringify(value);
    
    return value;
  });
}
