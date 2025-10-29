/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
import path from "node:path";
// Migrated to vitest expect()
import { existsSync } from "fs";
import { readFile, rm, mkdir } from "fs/promises";
import { execSync } from "child_process";

// Run sequentially after crawl-fixture.test.ts creates example.atls
test.sequential("export pages CSV", async () => {
  // Use unique filenames to avoid cross-test races
  if (!existsSync("./tmp")) {
    await mkdir("./tmp", { recursive: true });
  }
  const unique = `export-pages-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const atlsPath = `./tmp/${unique}.atls`;
  const csvPath = `./tmp/${unique}.pages.csv`;
  const CLI = path.resolve(__dirname, "../../dist/cli/index.js");

  // Always create a fresh archive for this test to avoid dependency on other files
  const crawlCmd = `node ${CLI} crawl --seeds https://example.com --out ${atlsPath} --mode prerender --maxPages 2`;
  console.log(`Running (bootstrap crawl): ${crawlCmd}`);
  execSync(crawlCmd, { stdio: "inherit" });
  expect(existsSync(atlsPath)).toBeTruthy();

  // Remove old CSV if exists (paranoia; should be unique)
  if (existsSync(csvPath)) {
    await rm(csvPath);
  }

  // Run export
  const cmd = `node ${CLI} export --atls ${atlsPath} --report pages --out ${csvPath}`;
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (err: any) {
    console.error("Export pages CSV command failed:", err?.message || err);
    if (err?.stdout) console.error("STDOUT:", err.stdout.toString());
    if (err?.stderr) console.error("STDERR:", err.stderr.toString());
    // Surface failure for diagnosis
    throw err;
  }

  // Verify CSV exists
  expect(existsSync(csvPath)).toBeTruthy();

  // Read CSV
  const csvContent = await readFile(csvPath, "utf-8");
  const lines = csvContent.trim().split("\n");
  
  expect(lines.length >= 2).toBeTruthy();
  
  // Verify exact header order
  const expectedHeader = "url,finalUrl,normalizedUrl,statusCode,contentType,rawHtmlHash,domHash,renderMode,navEndReason,depth,discoveredFrom,section,title,metaDescription,h1,internalLinksCount,externalLinksCount,mediaAssetsCount,canonicalHref,canonicalResolved,noindexSurface,fetchMs,renderMs,network.totalRequests,network.totalBytes,network.totalDuration,enhancedSEO.indexability.isNoIndex,enhancedSEO.content.titleLength.pixels,enhancedSEO.international.hreflangCount,performance.scores.performance,performance.scores.accessibility,response_headers.server,response_headers.cache_control,response_headers.content_encoding,cdn_indicators.detected,cdn_indicators.provider,cdn_indicators.confidence,compression_details.algorithm,compression_details.compressed_size";
  const actualHeader = lines[0];
  
  expect(actualHeader).toBe(expectedHeader);
  
  // Parse all rows
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    return {
      url: values[0], finalUrl: values[1],
      normalizedUrl: values[2],
      statusCode: values[3],
      contentType: values[4],
      rawHtmlHash: values[5],
      domHash: values[6],
      renderMode: values[7],
      navEndReason: values[8],
      depth: values[9],
      discoveredFrom: values[10],
      section: values[11],
      title: values[12],
      metaDescription: values[13],
      h1: values[14],
      internalLinksCount: values[15],
      externalLinksCount: values[16],
      mediaAssetsCount: values[17],
      canonicalHref: values[18],
      canonicalResolved: values[19],
      noindexSurface: values[20],
      fetchMs: values[21],
      renderMs: values[22]
    };
  });
  
  // Verify at least one page has externalLinksCount >= 1  
  const pageWithExternalLinks = rows.find(r => parseInt(r.externalLinksCount) >= 1);
  expect(pageWithExternalLinks).toBeTruthy();
  
  // Verify rawHtmlHash and domHash are present
  const firstPage = rows[0];
  expect(firstPage.rawHtmlHash && firstPage.rawHtmlHash.length > 0).toBeTruthy();
  expect(firstPage.domHash && firstPage.domHash.length > 0).toBeTruthy();
  
  console.log(`✓ Exported ${rows.length} pages with correct header order`);
  console.log(`✓ rawHtmlHash: ${firstPage.rawHtmlHash.substring(0, 16)}...`);
  console.log(`✓ domHash: ${firstPage.domHash.substring(0, 16)}...`);
  console.log(`✓ Found page with ${pageWithExternalLinks!.externalLinksCount} external link(s)`);
});

/**
 * Simple CSV line parser (handles basic cases)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}
