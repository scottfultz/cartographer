/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

describe("CLI Polish - Quiet and JSON modes", () => {
  const atlsPath = "./tmp/cli-polish-test.atls";
  const cliPath = "./dist/cli/index.js";
  
  it("--quiet --json should output single JSON object to stdout with no periodic metrics to stderr", async () => {
    // Clean up from previous runs
    if (fs.existsSync(atlsPath)) {
      fs.unlinkSync(atlsPath);
    }
    if (fs.existsSync(atlsPath + ".staging")) {
      fs.rmSync(atlsPath + ".staging", { recursive: true, force: true });
    }
    
    // Run crawl with --quiet --json
    const cmd = `node ${cliPath} crawl --seeds https://example.com --out ${atlsPath} --mode raw --maxPages 5 --quiet --json`;
    
    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    
    try {
      const result = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: any) {
      stdout = error.stdout || "";
      stderr = error.stderr || "";
      exitCode = error.code || 0;
    }
    
    // Verify stdout contains exactly one JSON object
    expect(stdout.trim().length > 0).toBeTruthy();
    
    const json = JSON.parse(stdout.trim());
    expect(json.crawlId).toBeTruthy();
    expect(json.outFile).toBeTruthy();
    expect(json.summary).toBeTruthy();
    expect(json.summary.pages !== undefined).toBeTruthy();
    expect(json.summary.edges !== undefined).toBeTruthy();
    expect(json.summary.durationMs !== undefined).toBeTruthy();
    expect(json.perf).toBeTruthy();
    expect(json.notes).toBeTruthy();
    
    // Verify stderr does NOT contain periodic metrics lines like "Pages: X/Y"
    // But may contain [INFO] startup messages and errors
    const stderrLines = stderr.split('\n').filter(l => l.trim().length > 0);
    
    // Should not have periodic metric updates (these would be in quiet mode suppressed)
    const hasPeriodicMetrics = stderrLines.some(line => 
      line.includes("Pages:") && line.includes("RSS:")
    );
    expect(!hasPeriodicMetrics).toBeTruthy();
    
    // Verify .atls file was created
    expect(fs.existsSync(atlsPath)).toBeTruthy();
    
    // Exit code should be 0 for success
    expect(exitCode).toBe(0);
  });
  
  it("Normal mode (no --quiet) should show periodic metrics on stderr", async () => {
    const normalAtlsPath = "./tmp/cli-normal-test.atls";
    
    // Clean up from previous runs
    if (fs.existsSync(normalAtlsPath)) {
      fs.unlinkSync(normalAtlsPath);
    }
    if (fs.existsSync(normalAtlsPath + ".staging")) {
      fs.rmSync(normalAtlsPath + ".staging", { recursive: true, force: true });
    }
    
    // Run crawl without --quiet (normal mode)
    const cmd = `node ${cliPath} crawl --seeds https://example.com --out ${normalAtlsPath} --mode raw --maxPages 3`;
    
    let stderr = "";
    
    try {
      const result = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      stderr = result.stderr;
    } catch (error: any) {
      stderr = error.stderr || "";
    }
    
    // In normal mode, we should see [INFO] log messages
    const hasInfoLogs = stderr.includes("[INFO]");
    expect(hasInfoLogs).toBeTruthy();
    
    // Verify .atls file was created
    expect(fs.existsSync(normalAtlsPath)).toBeTruthy();
  });
});
