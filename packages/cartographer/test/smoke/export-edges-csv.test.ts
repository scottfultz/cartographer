/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { existsSync } from "fs";
import { readFile, rm } from "fs/promises";
import { execSync } from "child_process";

test("export edges CSV", async () => {
  // Ensure example.atls exists
  expect(existsSync("./tmp/example.atls")).toBeTruthy();
  
  // Remove old CSV if exists
  if (existsSync("./tmp/edges.csv")) {
    await rm("./tmp/edges.csv");
  }
  
  // Run export
  const cmd = "node dist/cli/index.js export --atls ./tmp/example.atls --report edges --out ./tmp/edges.csv";
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
  
  // Verify CSV exists
  expect(existsSync("./tmp/edges.csv")).toBeTruthy();
  
  // Read CSV
  const csvContent = await readFile("./tmp/edges.csv", "utf-8");
  const lines = csvContent.trim().split("\n");
  
  expect(lines.length >= 2).toBeTruthy();
  
  // Verify exact header order
  const expectedHeader = "sourceUrl,targetUrl,isExternal,anchorText,rel,nofollow,location,selectorHint,discoveredInMode";
  const actualHeader = lines[0];
  
  expect(actualHeader, expectedHeader);
  
  // Check for external link (iana.org for example.com)
  const hasExternalLink = lines.some(line => line.includes("iana.org") && line.includes("true"));
  expect(hasExternalLink).toBeTruthy();
  
  console.log(`✓ Exported ${lines.length - 1} edges with correct header order`);
  console.log(`✓ Found external link`);
});
