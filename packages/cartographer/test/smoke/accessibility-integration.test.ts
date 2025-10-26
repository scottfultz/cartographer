/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { existsSync } from "fs";
import { rm } from "fs/promises";
import { execSync } from "child_process";
import { readManifest, iterateParts } from "@atlas/sdk";

const OUT_FILE = "tmp/accessibility-test.atls";

// Skip this test in CI - import resolution issues with @atlas/sdk
test.skipIf(process.env.CI === 'true')("crawl with accessibility should write accessibility stream and enrich manifest", async () => {
  // Clean up
  if (existsSync(OUT_FILE)) {
    await rm(OUT_FILE);
  }
  if (existsSync(OUT_FILE + ".staging")) {
    await rm(OUT_FILE + ".staging", { recursive: true });
  }
  
  // Crawl with accessibility enabled (need full mode for accessibility data)
  execSync(
    `node dist/cli/index.js crawl --seeds https://example.com --out ${OUT_FILE} --max-pages 3 --mode full`,
    { encoding: "utf-8", stdio: "inherit" }
  );
  
  // Verify .atls was created
  expect(existsSync(OUT_FILE)).toBeTruthy();
  
  // Read manifest
  const manifest = await readManifest(OUT_FILE);
  
  // Verify atlasVersion is still 1.0
  expect(manifest.atlasVersion).toBe("1.0");
  
  // Verify datasets map exists and includes accessibility
  expect(manifest.datasets).toBeTruthy();
  expect(manifest.datasets.accessibility).toBeTruthy();
  expect(manifest.datasets.accessibility.present).toBe(true);
  expect(manifest.datasets.accessibility.parts >= 1).toBeTruthy();
  expect(manifest.datasets.accessibility.schema).toBe("schemas/accessibility.schema.json#1");
  
  // Verify capabilities exists
  expect(manifest.capabilities).toBeTruthy();
  expect(Array.isArray(manifest.capabilities.renderModes)).toBe(true);
  expect(manifest.capabilities.robots).toBeTruthy();
  
  // Verify we can read accessibility records
  let accessibilityCount = 0;
  for await (const line of iterateParts(OUT_FILE, "accessibility")) {
    const record = JSON.parse(line);
    accessibilityCount++;
    
    // Validate structure
    expect(record.pageUrl).toBeTruthy();
    expect(typeof record.missingAltCount === "number").toBeTruthy();
    expect(Array.isArray(record.headingOrder)).toBe(true);
    expect(record.landmarks).toBeTruthy();
    expect(record.roles).toBeTruthy();
    
    // Raw mode shouldn't have contrastViolations
    expect(record.contrastViolations).toBe(undefined);
  }
  
  expect(accessibilityCount > 0).toBeTruthy();
  
  console.log(`✓ Found ${accessibilityCount} accessibility records`);
  console.log(`✓ Manifest datasets: ${Object.keys(manifest.datasets || {}).join(", ")}`);
  console.log(`✓ Atlas version: ${manifest.atlasVersion}`);
});
