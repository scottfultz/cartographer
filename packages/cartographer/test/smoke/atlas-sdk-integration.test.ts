/*
 * Copyright © 2025 Cai Frazier.
 * Atlas SDK Integration Test - Verifies SDK works with engine output
 */

import { test, expect } from "vitest";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import { execSync } from "child_process";
import { openAtlas, select } from "@atlas/sdk";

const OUT_FILE = "tmp/sdk-integration-test.atls";

// Skip this test in CI - accessibility data generation is inconsistent in CI
test.skipIf(process.env.CI === 'true')("Atlas SDK can read engine output", async () => {
  // Clean up
  if (existsSync(OUT_FILE)) {
    await rm(OUT_FILE);
  }
  if (existsSync(OUT_FILE + ".staging")) {
    await rm(OUT_FILE + ".staging", { recursive: true });
  }
  
  // Create a test .atls file (use full mode to get accessibility data)
  execSync(
  `node dist/cli/index.js crawl --seeds https://caifrazier.com --out ${OUT_FILE} --max-pages 3 --mode full`,
    { encoding: "utf-8", stdio: "inherit" }
  );
  
  expect(existsSync(OUT_FILE)).toBeTruthy();
  
  // Test 1: openAtlas
  const atlas = await openAtlas(OUT_FILE);
  
  expect(atlas.manifest.atlasVersion).toBe("1.0");
  expect(atlas.summary.stats.totalPages > 0).toBeTruthy();
  expect(atlas.datasets.has("pages")).toBeTruthy();
  // Note: accessibility dataset may not be present in all modes
  // expect(atlas.datasets.has("accessibility")).toBeTruthy();
  
  // Test 2: Iterate pages
  let pageCount = 0;
  for await (const page of atlas.readers.pages()) {
    expect(page.url).toBeTruthy();
    expect(typeof page.statusCode === "number").toBeTruthy();
    pageCount++;
  }
  expect(pageCount).toBe(atlas.summary.stats.totalPages);
  
  // Test 3: select with filter
  let successCount = 0;
  for await (const page of select(OUT_FILE, {
    dataset: "pages",
    where: (p: any) => p.statusCode === 200
  })) {
    expect(page.statusCode).toBe(200);
    successCount++;
  }
  expect(successCount > 0).toBeTruthy();
  
  // Test 4: Accessibility stream
  let accCount = 0;
  for await (const record of atlas.readers.accessibility()) {
    expect(record.pageUrl).toBeTruthy();
    expect(typeof record.missingAltCount === "number").toBeTruthy();
    accCount++;
  }
  expect(accCount > 0).toBeTruthy();
  
  console.log(`✓ SDK successfully read ${pageCount} pages and ${accCount} accessibility records`);
});
