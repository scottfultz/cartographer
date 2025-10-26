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
 * Helper to run CLI command and capture output
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

    setTimeout(() => {
      proc.kill();
      resolve({ exitCode: -1, stdout, stderr: stderr + "\nTimeout" });
    }, 30000);
  });
}

describe("CLI JSON Output", () => {
  it("should output valid JSON with --json flag", async () => {
    const { exitCode, stdout } = await runCLI([
      "crawl",
      "--seeds",
      "https://example.com",
      "--out",
      "tmp/json-test-output.atls",
      "--maxPages",
      "1",
      "--json",
    ]);

    expect(exitCode).toBe(0);

    // Parse JSON output
    let json: any;
    expect(() => {
      json = JSON.parse(stdout);
    }).not.toThrow();

    // Verify required fields
    expect(json).toHaveProperty("summary");
    expect(json.summary).toHaveProperty("totalPages");
    expect(json.summary).toHaveProperty("totalEdges");
    expect(json.summary).toHaveProperty("totalAssets");
    expect(json.summary).toHaveProperty("totalErrors");

    expect(json).toHaveProperty("performance");
    expect(json.performance).toHaveProperty("durationMs");
    expect(json.performance).toHaveProperty("startedAt");
    expect(json.performance).toHaveProperty("completedAt");

    expect(json).toHaveProperty("notes");
    expect(Array.isArray(json.notes)).toBe(true);

    // Check that numbers are valid
    expect(typeof json.summary.totalPages).toBe("number");
    expect(json.summary.totalPages).toBeGreaterThanOrEqual(0);
  }, 60000);

  it("should output only JSON to stdout (no other text)", async () => {
    const { exitCode, stdout } = await runCLI([
      "crawl",
      "--seeds",
      "https://example.com",
      "--out",
      "tmp/json-test-clean.atls",
      "--maxPages",
      "1",
      "--json",
    ]);

    expect(exitCode).toBe(0);

    // Entire stdout should be valid JSON (no extra text)
    const trimmed = stdout.trim();
    expect(trimmed.startsWith("{")).toBe(true);
    expect(trimmed.endsWith("}")).toBe(true);

    // Should not contain log markers
    expect(stdout).not.toContain("[INFO]");
    expect(stdout).not.toContain("[WARN]");
    expect(stdout).not.toContain("[ERROR]");
  }, 60000);

  it("should combine --json and --quiet flags correctly", async () => {
    const { exitCode, stdout, stderr } = await runCLI([
      "crawl",
      "--seeds",
      "https://example.com",
      "--out",
      "tmp/json-test-quiet.atls",
      "--maxPages",
      "1",
      "--json",
      "--quiet",
    ]);

    expect(exitCode).toBe(0);

    // Stdout should still be valid JSON
    const json = JSON.parse(stdout);
    expect(json).toHaveProperty("summary");

    // Stderr should be minimal (quiet mode)
    expect(stderr.length).toBeGreaterThan(0); // Still has some logs
  }, 60000);
});
