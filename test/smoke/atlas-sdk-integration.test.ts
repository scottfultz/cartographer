/*
 * Copyright © 2025 Cai Frazier.
 * Atlas SDK Integration Test - Verifies SDK works with engine output
 */

import { test } from "node:test";
import assert from "node:assert";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import { execSync } from "child_process";
import { openAtlas, select } from "../../packages/atlas-sdk/src/index.js";

const OUT_FILE = "tmp/sdk-integration-test.atls";

test("Atlas SDK can read engine output", async () => {
  // Clean up
  if (existsSync(OUT_FILE)) {
    await rm(OUT_FILE);
  }
  if (existsSync(OUT_FILE + ".staging")) {
    await rm(OUT_FILE + ".staging", { recursive: true });
  }
  
  // Create a test .atls file
  execSync(
    `node dist/cli/index.js crawl --seeds https://example.com --out ${OUT_FILE} --max-pages 3 --mode raw`,
    { encoding: "utf-8", stdio: "inherit" }
  );
  
  assert(existsSync(OUT_FILE), ".atls file should exist");
  
  // Test 1: openAtlas
  const atlas = await openAtlas(OUT_FILE);
  
  assert.equal(atlas.manifest.atlasVersion, "1.0");
  assert(atlas.summary.totalPages > 0);
  assert(atlas.datasets.has("pages"));
  assert(atlas.datasets.has("accessibility"));
  
  // Test 2: Iterate pages
  let pageCount = 0;
  for await (const page of atlas.readers.pages()) {
    assert(page.url);
    assert(typeof page.statusCode === "number");
    pageCount++;
  }
  assert.equal(pageCount, atlas.summary.totalPages);
  
  // Test 3: select with filter
  let successCount = 0;
  for await (const page of select(OUT_FILE, {
    dataset: "pages",
    where: (p: any) => p.statusCode === 200
  })) {
    assert.equal(page.statusCode, 200);
    successCount++;
  }
  assert(successCount > 0);
  
  // Test 4: Accessibility stream
  let accCount = 0;
  for await (const record of atlas.readers.accessibility()) {
    assert(record.pageUrl);
    assert(typeof record.missingAltCount === "number");
    accCount++;
  }
  assert(accCount > 0);
  
  console.log(`✓ SDK successfully read ${pageCount} pages and ${accCount} accessibility records`);
});
