/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import { openAtlas } from "@atlas/sdk";

const execAsync = promisify(exec);

describe("Error Budget Enforcement", () => {
  const atlsPath = "./tmp/error-budget-test.atls";
  const cliPath = "./dist/cli/index.js";
  
  it("should stop crawl when error budget is exceeded and return exit code 2", async () => {
    // Clean up from previous runs
    if (fs.existsSync(atlsPath)) {
      fs.unlinkSync(atlsPath);
    }
    if (fs.existsSync(atlsPath + ".staging")) {
      fs.rmSync(atlsPath + ".staging", { recursive: true, force: true });
    }
    
    // Use an invalid URL that will generate errors, plus a valid seed
    // The invalid URLs will cause fetch failures
    const cmd = `node ${cliPath} crawl --seeds https://invalid-domain-xyz-12345.example --out ${atlsPath} --mode raw --errorBudget 1 --json --quiet --maxPages 10`;
    
    let stdout = "";
    let exitCode = 0;
    
    try {
      const result = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
      exitCode = 0;
    } catch (error: any) {
      stdout = error.stdout || "";
      exitCode = error.code || 0;
    }
    
    // Verify exit code is 2 (error budget exceeded)
    expect(exitCode).toBe(2);
    
    // Verify JSON summary was written
    expect(stdout.trim().length > 0).toBeTruthy();
    
    const json = JSON.parse(stdout.trim());
    
    // Verify notes contain error budget exceeded message
    const hasErrorBudgetNote = json.notes.some((note: string) => 
      note.includes("error budget exceeded") || note.includes("Terminated")
    );
    expect(hasErrorBudgetNote).toBeTruthy();
    
    // Verify .atls file exists (partial data)
    expect(fs.existsSync(atlsPath)).toBeTruthy();
    
    // Verify the archive can be opened
    const atlas = await openAtlas(atlsPath);
    expect(atlas.manifest).toBeTruthy();
    expect(atlas.summary).toBeTruthy();
    
    // Verify error count is > 0
    expect(atlas.summary.stats.totalErrors > 0).toBeTruthy();
    
    console.log(`✓ Error budget test passed: ${atlas.summary.stats.totalErrors} errors recorded, exit code ${exitCode}`);
  });
  
  it("should complete successfully when errors are within budget", async () => {
    const successAtlsPath = "./tmp/error-budget-success.atls";
    
    // Clean up from previous runs
    if (fs.existsSync(successAtlsPath)) {
      fs.unlinkSync(successAtlsPath);
    }
    if (fs.existsSync(successAtlsPath + ".staging")) {
      fs.rmSync(successAtlsPath + ".staging", { recursive: true, force: true });
    }
    
    // Use a valid URL with high error budget
    const cmd = `node ${cliPath} crawl --seeds https://example.com --out ${successAtlsPath} --mode raw --errorBudget 100 --maxPages 3 --json --quiet`;
    
    let stdout = "";
    let exitCode = 0;
    
    try {
      const result = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
      exitCode = 0;
    } catch (error: any) {
      stdout = error.stdout || "";
      exitCode = error.code || 0;
    }
    
    // Verify exit code is 0 (success)
    expect(exitCode).toBe(0);
    
    // Verify JSON summary
    const json = JSON.parse(stdout.trim());
    expect(json.summary.pages > 0).toBeTruthy();
    
    // Verify notes do NOT contain error budget exceeded
    const hasErrorBudgetNote = json.notes.some((note: string) => 
      note.includes("error budget exceeded")
    );
    expect(!hasErrorBudgetNote).toBeTruthy();
    
    console.log(`✓ Success test passed: ${json.summary.pages} pages crawled, exit code ${exitCode}`);
  });
});
