/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { existsSync } from "fs";
import { mkdir, rm } from "fs/promises";
import { execSync } from "child_process";
import { open } from "yauzl";
import { openAtlas } from "@atlas/sdk";

// Run sequentially to ensure example.atls exists for export tests
test.sequential("crawl small site", async () => {
  // Ensure tmp directory exists
  await mkdir("./tmp", { recursive: true });
  
  // Remove old test file if exists
  if (existsSync("./tmp/example.atls")) {
    await rm("./tmp/example.atls");
  }
  
  // Run crawl on example.com (simple, stable site)
  const cmd = `node dist/cli/index.js crawl --seeds https://example.com --out ./tmp/example.atls --mode prerender --maxPages 2`;
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
    
    // Verify .atls file exists
    expect(existsSync("./tmp/example.atls")).toBeTruthy();
    
    // Verify it's a valid ZIP
    await new Promise<void>((resolve, reject) => {
      open("./tmp/example.atls", { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);
        zipfile.close();
        resolve();
      });
    });
    
    // Verify manifest.json exists and has correct structure
    const atlas = await openAtlas("./tmp/example.atls");
    const manifest = atlas.manifest;
    
    expect(manifest.atlasVersion).toBe("1.0");
    expect(manifest.owner.name).toBe("Cai Frazier");
    expect(Array.isArray(manifest.consumers)).toBeTruthy();
    expect(manifest.consumers.length > 0).toBeTruthy();
    expect(manifest.hashing.urlKeyAlgo).toBeTruthy();
    
    // Verify parts exist
    expect(manifest.parts.pages.length > 0).toBeTruthy();
    expect(manifest.parts.edges.length > 0).toBeTruthy();
    
    // Verify schemas are referenced
    expect(manifest.schemas.pages).toBeTruthy();
    expect(manifest.schemas.edges).toBeTruthy();
    expect(manifest.schemas.assets).toBeTruthy();
    expect(manifest.schemas.errors).toBeTruthy();
    
    // Read first PageRecord
    let pageCount = 0;
    for await (const page of atlas.readers.pages()) {
      if (pageCount >= 1) break;
      
      // Verify required fields
      expect(page.rawHtmlHash).toBeTruthy();
      expect(page.rawHtmlHash!.length > 0).toBeTruthy();
      expect(page.domHash).toBeTruthy();
      expect(page.domHash!.length > 0).toBeTruthy();
      expect(page.renderMode).toBe("prerender");
      
      pageCount++;
    }
    
    expect(pageCount >= 1).toBeTruthy();
    
    // Verify summary has sensible counts
    const summaryData = await readZipEntry("./tmp/example.atls", "summary.json");
    const summary = JSON.parse(summaryData.toString("utf-8"));
    
    expect(summary.stats.totalPages >= 1).toBeTruthy();
    expect(summary.stats.totalEdges >= 1).toBeTruthy();
    
    console.log(`✓ Crawl produced: ${summary.stats.totalPages} pages, ${summary.stats.totalEdges} edges, ${summary.stats.totalAssets} assets`);
});

/**
 * Helper to read a file from ZIP
 */
async function readZipEntry(atlsPath: string, fileName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    open(atlsPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err || new Error("Failed to open ZIP"));
      
      zipfile.readEntry();
      
      zipfile.on("entry", (entry: any) => {
        if (entry.fileName === fileName) {
          zipfile.openReadStream(entry, (err: any, readStream: any) => {
            if (err || !readStream) return reject(err || new Error("Failed to open stream"));
            
            const chunks: Buffer[] = [];
            readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
            readStream.on("end", () => {
              zipfile.close();
              resolve(Buffer.concat(chunks));
            });
            readStream.on("error", reject);
          });
        } else {
          zipfile.readEntry();
        }
      });
      
      zipfile.on("end", () => {
        reject(new Error(`Entry not found: ${fileName}`));
      });
      
      zipfile.on("error", reject);
    });
  });
}
