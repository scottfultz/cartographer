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
import { readManifest, iterateParts } from "../../src/io/readers/atlsReader.js";

const OUT_FILE = "tmp/accessibility-test.atls";

test("crawl with accessibility should write accessibility stream and enrich manifest", async () => {
  // Clean up
  if (existsSync(OUT_FILE)) {
    await rm(OUT_FILE);
  }
  if (existsSync(OUT_FILE + ".staging")) {
    await rm(OUT_FILE + ".staging", { recursive: true });
  }
  
  // Crawl with accessibility enabled (default)
  execSync(
    `node dist/cli/index.js crawl --seeds https://example.com --out ${OUT_FILE} --max-pages 3 --mode raw`,
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
  assert(Array.isArray(manifest.capabilities.renderModes), "capabilities.renderModes should be array");
  expect(manifest.capabilities.robots).toBeTruthy();
  
  // Verify we can read accessibility records
  let accessibilityCount = 0;
  for await (const line of iterateParts(OUT_FILE, "accessibility")) {
    const record = JSON.parse(line);
    accessibilityCount++;
    
    // Validate structure
    expect(record.pageUrl).toBeTruthy();
    expect(typeof record.missingAltCount === "number").toBeTruthy();
    assert(Array.isArray(record.headingOrder), "should have headingOrder array");
    expect(record.landmarks).toBeTruthy();
    expect(record.roles).toBeTruthy();
    
    // Raw mode shouldn't have contrastViolations
    expect(record.contrastViolations, undefined).toBe("raw mode shouldn't have contrastViolations");
  }
  
  expect(accessibilityCount > 0).toBeTruthy();
  
  console.log(`✓ Found ${accessibilityCount} accessibility records`);
  console.log(`✓ Manifest datasets: ${Object.keys(manifest.datasets || {}).join(", ")}`);
  console.log(`✓ Atlas version: ${manifest.atlasVersion}`);
});
