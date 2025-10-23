/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { load as cheerioLoad } from "cheerio";

export interface TextSampleInput {
  domSource: "raw" | "playwright";
  html: string;
}

/**
 * Extract text sample from HTML body
 * Collapses whitespace and returns first 1500 UTF-8 bytes
 */
export function extractTextSample(input: TextSampleInput): string {
  const $ = cheerioLoad(input.html);
  
  // Get body text (innerText-like behavior)
  const bodyText = $("body").text();
  
  // Collapse whitespace
  const collapsed = bodyText.replace(/\s+/g, " ").trim();
  
  // Take first 1500 UTF-8 bytes
  const buffer = Buffer.from(collapsed, "utf-8");
  if (buffer.length <= 1500) {
    return collapsed;
  }
  
  // Truncate to 1500 bytes and decode back
  const truncated = buffer.subarray(0, 1500);
  return truncated.toString("utf-8");
}
