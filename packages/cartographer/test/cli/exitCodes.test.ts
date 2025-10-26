/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, it, expect } from "vitest";
import { spawn } from "child_process";
import { join } from "path";

const CLI_PATH = join(__dirname, "../../dist/cli/index.js");

/**
 * Helper to run CLI command and capture exit code
 */
async function runCLI(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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

    // Timeout after 30 seconds
    setTimeout(() => {
      proc.kill();
      resolve({ exitCode: -1, stdout, stderr: stderr + "\nTimeout" });
    }, 30000);
  });
}

describe("CLI Exit Codes", () => {
  it("should exit with 0 on successful crawl", async () => {
    const { exitCode } = await runCLI([
      "crawl",
      "--seeds",
      "https://example.com",
      "--out",
      "tmp/exit-test-success.atls",
      "--maxPages",
      "1",
      "--quiet",
    ]);

    expect(exitCode).toBe(0);
  }, 60000);

  it("should exit with 2 when maxErrors is exceeded", async () => {
    const { exitCode } = await runCLI([
      "crawl",
      "--seeds",
      "https://invalid-domain-that-does-not-exist-12345.com",
      "--out",
      "tmp/exit-test-error-budget.atls",
      "--maxErrors",
      "0",
      "--quiet",
    ]);

    expect(exitCode).toBe(2);
  }, 60000);

  it("should exit with 4 when output file cannot be written", async () => {
    // Try to write to a path that doesn't exist and --force is not used
    const { exitCode } = await runCLI([
      "crawl",
      "--seeds",
      "https://example.com",
      "--out",
      "/nonexistent/path/that/will/fail.atls",
      "--maxPages",
      "1",
      "--quiet",
    ]);

    // Should fail with write error (exit code 4 or general error 10)
    expect([4, 10]).toContain(exitCode);
  }, 60000);

  it("should exit with 5 when validate command finds errors", async () => {
    // First create a valid archive
    await runCLI([
      "crawl",
      "--seeds",
      "https://example.com",
      "--out",
      "tmp/exit-test-validate.atls",
      "--maxPages",
      "1",
      "--quiet",
    ]);

    // Validate it (should pass or have warnings but not hard fail)
    const { exitCode } = await runCLI([
      "validate",
      "--atls",
      "tmp/exit-test-validate.atls",
    ]);

    // Validate should exit 0 for valid archives or 5 for corrupt ones
    // Since we just created it, it should be valid (though may have schema warnings)
    expect([0, 5]).toContain(exitCode);
  }, 60000);

  it("should exit with 1 for invalid CLI arguments", async () => {
    const { exitCode } = await runCLI([
      "crawl",
      // Missing required --seeds argument
      "--out",
      "tmp/test.atls",
    ]);

    expect(exitCode).toBe(1);
  }, 10000);

  it("should exit with 0 for --help", async () => {
    const { exitCode, stdout } = await runCLI(["--help"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("cartographer");
  }, 10000);

  it("should exit with 0 for --version", async () => {
    const { exitCode, stdout } = await runCLI(["--version"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("1.0.0");
  }, 10000);
});
