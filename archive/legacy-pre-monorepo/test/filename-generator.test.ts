/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test } from "node:test";
import assert from "node:assert";
import { generateAtlsFilename, resolveOutputPath } from "../src/utils/filenameGenerator.js";

test("generateAtlsFilename - basic domain extraction", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com", mode: "prerender" });
  assert.ok(result.startsWith("example.com_"));
  assert.ok(result.endsWith("_prerender.atls"));
});

test("generateAtlsFilename - subdomain included", () => {
  const result = generateAtlsFilename({ seedUrl: "https://blog.example.com", mode: "raw" });
  assert.ok(result.startsWith("blog.example.com_"));
  assert.ok(result.endsWith("_raw.atls"));
});

test("generateAtlsFilename - www subdomain included", () => {
  const result = generateAtlsFilename({ seedUrl: "https://www.example.com", mode: "full" });
  assert.ok(result.startsWith("www.example.com_"));
  assert.ok(result.endsWith("_full.atls"));
});

test("generateAtlsFilename - handles port numbers", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com:8080", mode: "prerender" });
  // Port should not be in filename
  assert.ok(result.startsWith("example.com_"));
  assert.ok(!result.includes(":8080"));
});

test("generateAtlsFilename - handles deep paths", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com/path/to/page", mode: "raw" });
  assert.ok(result.startsWith("example.com_"));
});

test("generateAtlsFilename - handles query strings", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com?param=value", mode: "prerender" });
  assert.ok(result.startsWith("example.com_"));
  assert.ok(!result.includes("?"));
  assert.ok(!result.includes("param"));
});

test("generateAtlsFilename - handles fragments", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com#section", mode: "full" });
  assert.ok(result.startsWith("example.com_"));
  assert.ok(!result.includes("#"));
});

test("generateAtlsFilename - timestamp format YYYYMMDD_HHMMSS", () => {
  const testDate = new Date("2025-10-24T15:30:45");
  const result = generateAtlsFilename({ 
    seedUrl: "https://example.com", 
    mode: "raw",
    timestamp: testDate
  });
  assert.ok(result.includes("20251024_153045"));
});

test("generateAtlsFilename - all three modes", () => {
  const raw = generateAtlsFilename({ seedUrl: "https://example.com", mode: "raw" });
  const prerender = generateAtlsFilename({ seedUrl: "https://example.com", mode: "prerender" });
  const full = generateAtlsFilename({ seedUrl: "https://example.com", mode: "full" });
  
  assert.ok(raw.endsWith("_raw.atls"));
  assert.ok(prerender.endsWith("_prerender.atls"));
  assert.ok(full.endsWith("_full.atls"));
});

test("generateAtlsFilename - IPv4 address", () => {
  const result = generateAtlsFilename({ seedUrl: "http://192.168.1.1", mode: "raw" });
  assert.ok(result.startsWith("192.168.1.1_"));
});

test("generateAtlsFilename - localhost", () => {
  const result = generateAtlsFilename({ seedUrl: "http://localhost", mode: "prerender" });
  assert.ok(result.startsWith("localhost_"));
});

test("generateAtlsFilename - localhost with port", () => {
  const result = generateAtlsFilename({ seedUrl: "http://localhost:3000", mode: "full" });
  assert.ok(result.startsWith("localhost_"));
  assert.ok(!result.includes(":3000"));
});

test("resolveOutputPath - uses provided path", async () => {
  const result = await resolveOutputPath("custom/path.atls", {
    seedUrl: "https://example.com",
    mode: "raw"
  });
  assert.strictEqual(result, "custom/path.atls");
});

test("resolveOutputPath - generates when undefined", async () => {
  const result = await resolveOutputPath(undefined, {
    seedUrl: "https://example.com",
    mode: "prerender"
  });
  assert.ok(result.startsWith("./export/example.com_"));
  assert.ok(result.endsWith("_prerender.atls"));
});

test("resolveOutputPath - handles absolute paths", async () => {
  const result = await resolveOutputPath("/tmp/test.atls", {
    seedUrl: "https://example.com",
    mode: "raw"
  });
  assert.strictEqual(result, "/tmp/test.atls");
});

test("resolveOutputPath - handles relative paths with directories", async () => {
  const result = await resolveOutputPath("./archives/crawl.atls", {
    seedUrl: "https://example.com",
    mode: "full"
  });
  assert.strictEqual(result, "./archives/crawl.atls");
});

test("generateAtlsFilename - uppercase URL normalized", () => {
  const result = generateAtlsFilename({ seedUrl: "HTTPS://EXAMPLE.COM", mode: "raw" });
  assert.ok(result.startsWith("example.com_"));
});

test("generateAtlsFilename - hyphenated domain", () => {
  const result = generateAtlsFilename({ seedUrl: "https://my-site.example.com", mode: "prerender" });
  assert.ok(result.startsWith("my-site.example.com_"));
});

test("generateAtlsFilename - numeric domain", () => {
  const result = generateAtlsFilename({ seedUrl: "https://123.example.com", mode: "full" });
  assert.ok(result.startsWith("123.example.com_"));
});

test("generateAtlsFilename - international domain (punycode)", () => {
  // Most browsers convert internationalized domains to punycode
  const result = generateAtlsFilename({ seedUrl: "https://münchen.de", mode: "raw" });
  // Should handle gracefully
  assert.ok(result.includes("_raw.atls"));
});

test("generateAtlsFilename - very long domain", () => {
  const longDomain = "https://this-is-a-very-long-subdomain-that-might-cause-issues.example.com";
  const result = generateAtlsFilename({ seedUrl: longDomain, mode: "prerender" });
  assert.ok(result.includes("this-is-a-very-long-subdomain-that-might-cause-issues.example.com_"));
});

test("generateAtlsFilename - trailing slash ignored", () => {
  const result1 = generateAtlsFilename({ seedUrl: "https://example.com", mode: "raw" });
  const result2 = generateAtlsFilename({ seedUrl: "https://example.com/", mode: "raw" });
  // Should extract same domain
  assert.ok(result1.startsWith("example.com_"));
  assert.ok(result2.startsWith("example.com_"));
});

test("generateAtlsFilename - invalid URL falls back gracefully", () => {
  const result = generateAtlsFilename({ seedUrl: "not-a-valid-url", mode: "raw" });
  // Should sanitize and use the input
  assert.ok(result.includes("_raw.atls"));
  assert.ok(!result.includes("://"));
});

test("generateAtlsFilename - empty string URL", () => {
  const result = generateAtlsFilename({ seedUrl: "", mode: "prerender" });
  assert.ok(result.includes("_prerender.atls"));
});

test("generateAtlsFilename - URL with authentication", () => {
  const result = generateAtlsFilename({ seedUrl: "https://user:pass@example.com", mode: "full" });
  assert.ok(result.startsWith("example.com_"));
  assert.ok(!result.includes("user"));
  assert.ok(!result.includes("pass"));
});

test("generateAtlsFilename - consistent timestamps", () => {
  const testDate = new Date("2025-12-31T23:59:59");
  const result = generateAtlsFilename({ 
    seedUrl: "https://example.com", 
    mode: "raw",
    timestamp: testDate
  });
  assert.ok(result.includes("20251231_235959"));
});

test("generateAtlsFilename - midnight timestamp", () => {
  const testDate = new Date("2025-01-01T00:00:00");
  const result = generateAtlsFilename({ 
    seedUrl: "https://example.com", 
    mode: "prerender",
    timestamp: testDate
  });
  assert.ok(result.includes("20250101_000000"));
});
