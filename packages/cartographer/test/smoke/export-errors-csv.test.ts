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

test("export errors CSV", async () => {
  // Ensure example.atls exists
  expect(existsSync("./tmp/example.atls")).toBeTruthy();
  
  // Remove old CSV if exists
  if (existsSync("./tmp/errors.csv")) {
    await rm("./tmp/errors.csv");
  }
  
  // Run export
  const cmd = "node dist/cli/index.js export --atls ./tmp/example.atls --report errors --out ./tmp/errors.csv";
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
  
  // Verify CSV exists
  expect(existsSync("./tmp/errors.csv")).toBeTruthy();
  
  // Read CSV
  const csvContent = await readFile("./tmp/errors.csv", "utf-8");
  const lines = csvContent.trim().split("\n");
  
  // Should have at least header (even if no errors)
  expect(lines.length >= 1).toBeTruthy();
  
  // Verify exact header order
  const expectedHeader = "url,origin,hostname,phase,code,message,occurredAt";
  const actualHeader = lines[0];
  
  expect(actualHeader).toBe(expectedHeader);
  
  // If no errors occurred, that's fine - just confirm header is present
  if (lines.length === 1) {
    console.log(`✓ No errors occurred (header-only file)`);
  } else {
    console.log(`✓ Exported ${lines.length - 1} errors with correct header order`);
  }
});
