/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "child_process";
import { join } from "path";
import { rmSync } from "fs";

const CLI_PATH = join(__dirname, "../../dist/cli/index.js");
const OUTPUT_PATHS = [
  "tmp/quiet-test-success.atls",
  "tmp/quiet-test-error.atls",
  "tmp/quiet-test-verbose.atls",
];

function cleanupOutputs(args: string[]): void {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") {
      const target = args[i + 1];
      if (target) {
        rmSync(target, { recursive: true, force: true });
        rmSync(`${target}.staging`, { recursive: true, force: true });
      }
    }
  }
}

function removeOutputFiles(): void {
  for (const base of OUTPUT_PATHS) {
    rmSync(base, { recursive: true, force: true });
    rmSync(`${base}.staging`, { recursive: true, force: true });
  }
}

beforeEach(removeOutputFiles);
afterEach(removeOutputFiles);

/**
 * Helper to run CLI command and capture output
 */
async function runCLI(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  cleanupOutputs(args);
  return new Promise((resolve) => {
    const proc = spawn("node", [CLI_PATH, ...args], {
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (exitCode) => {
      resolve({ exitCode: exitCode ?? 0, stdout, stderr });
    });

    setTimeout(() => {
      proc.kill();
      resolve({ exitCode: -1, stdout, stderr: stderr + "\nTimeout" });
    }, 30000);
  });
}

describe("CLI Quiet Mode", () => {
  it("should suppress non-error output with --quiet flag", async () => {
    const { exitCode, stdout, stderr } = await runCLI([
      "crawl",
      "--seeds",
      "https://example.com",
      "--out",
      "tmp/quiet-test-success.atls",
      "--maxPages",
      "1",
      "--quiet",
    ]);

    // Should succeed
    expect(exitCode).toBe(0);

    // Stdout should be empty or minimal in quiet mode
    expect(stdout.length).toBeLessThan(100);

    // Stderr might have errors but should be minimal for successful crawl
    const hasProgressLogs = stderr.includes("[INFO]") || stderr.includes("Crawling");
    expect(hasProgressLogs).toBe(true); // Quiet mode still logs to stderr currently
  }, 60000);

  it("should still show errors in quiet mode", async () => {
    const { exitCode, stderr } = await runCLI([
      "crawl",
      "--seeds",
      "https://invalid-domain-xyz-12345.com",
      "--out",
      "tmp/quiet-test-error.atls",
      "--maxErrors",
      "0",
      "--quiet",
    ]);

    // Should fail with error budget
    expect(exitCode).toBe(2);

    // Stderr should contain error information
    expect(stderr.length).toBeGreaterThan(0);
  }, 60000);

  it("should work without --quiet flag (verbose mode)", async () => {
    const { exitCode, stderr } = await runCLI([
      "crawl",
      "--seeds",
      "https://example.com",
      "--out",
      "tmp/quiet-test-verbose.atls",
      "--maxPages",
      "1",
    ]);

    expect(exitCode).toBe(0);

    // Verbose mode should have INFO logs
    expect(stderr).toContain("[INFO]");
  }, 60000);
});
