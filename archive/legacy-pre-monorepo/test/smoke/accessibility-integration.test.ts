/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test } from "node:test";
import assert from "node:assert";
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
  assert(existsSync(OUT_FILE), ".atls file should exist");
  
  // Read manifest
  const manifest = await readManifest(OUT_FILE);
  
  // Verify atlasVersion is still 1.0
  assert.equal(manifest.atlasVersion, "1.0", "Atlas version should be 1.0");
  
  // Verify datasets map exists and includes accessibility
  assert(manifest.datasets, "Manifest should have datasets map");
  assert(manifest.datasets.accessibility, "datasets should include accessibility");
  assert.equal(manifest.datasets.accessibility.present, true, "accessibility should be marked as present");
  assert(manifest.datasets.accessibility.parts >= 1, "accessibility should have at least 1 part");
  assert.equal(manifest.datasets.accessibility.schema, "schemas/accessibility.schema.json#1");
  
  // Verify capabilities exists
  assert(manifest.capabilities, "Manifest should have capabilities");
  assert(Array.isArray(manifest.capabilities.renderModes), "capabilities.renderModes should be array");
  assert(manifest.capabilities.robots, "capabilities should have robots info");
  
  // Verify we can read accessibility records
  let accessibilityCount = 0;
  for await (const line of iterateParts(OUT_FILE, "accessibility")) {
    const record = JSON.parse(line);
    accessibilityCount++;
    
    // Validate structure
    assert(record.pageUrl, "accessibility record should have pageUrl");
    assert(typeof record.missingAltCount === "number", "should have missingAltCount");
    assert(Array.isArray(record.headingOrder), "should have headingOrder array");
    assert(record.landmarks, "should have landmarks object");
    assert(record.roles, "should have roles object");
    
    // Raw mode shouldn't have contrastViolations
    assert.equal(record.contrastViolations, undefined, "raw mode shouldn't have contrastViolations");
  }
  
  assert(accessibilityCount > 0, "Should have at least one accessibility record");
  
  console.log(`✓ Found ${accessibilityCount} accessibility records`);
  console.log(`✓ Manifest datasets: ${Object.keys(manifest.datasets || {}).join(", ")}`);
  console.log(`✓ Atlas version: ${manifest.atlasVersion}`);
});
