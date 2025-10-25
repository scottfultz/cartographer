/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { generateAtlsFilename, resolveOutputPath } from "../src/utils/filenameGenerator.js";

test("generateAtlsFilename - basic domain extraction", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com", mode: "prerender" });
  expect(result.startsWith("example.com_")).toBeTruthy();
  expect(result.endsWith("_prerender.atls")).toBeTruthy();
});

test("generateAtlsFilename - subdomain included", () => {
  const result = generateAtlsFilename({ seedUrl: "https://blog.example.com", mode: "raw" });
  expect(result.startsWith("blog.example.com_")).toBeTruthy();
  expect(result.endsWith("_raw.atls")).toBeTruthy();
});

test("generateAtlsFilename - www subdomain included", () => {
  const result = generateAtlsFilename({ seedUrl: "https://www.example.com", mode: "full" });
  expect(result.startsWith("www.example.com_")).toBeTruthy();
  expect(result.endsWith("_full.atls")).toBeTruthy();
});

test("generateAtlsFilename - handles port numbers", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com:8080", mode: "prerender" });
  // Port should not be in filename
  expect(result.startsWith("example.com_")).toBeTruthy();
  expect(!result.includes(":8080")).toBeTruthy();
});

test("generateAtlsFilename - handles deep paths", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com/path/to/page", mode: "raw" });
  expect(result.startsWith("example.com_")).toBeTruthy();
});

test("generateAtlsFilename - handles query strings", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com?param=value", mode: "prerender" });
  expect(result.startsWith("example.com_")).toBeTruthy();
  expect(!result.includes("?")).toBeTruthy();
  expect(!result.includes("param")).toBeTruthy();
});

test("generateAtlsFilename - handles fragments", () => {
  const result = generateAtlsFilename({ seedUrl: "https://example.com#section", mode: "full" });
  expect(result.startsWith("example.com_")).toBeTruthy();
  expect(!result.includes("#")).toBeTruthy();
});

test("generateAtlsFilename - timestamp format YYYYMMDD_HHMMSS", () => {
  const testDate = new Date("2025-10-24T15:30:45");
  const result = generateAtlsFilename({ 
    seedUrl: "https://example.com", 
    mode: "raw",
    timestamp: testDate
  });
  expect(result.includes("20251024_153045")).toBeTruthy();
});

test("generateAtlsFilename - all three modes", () => {
  const raw = generateAtlsFilename({ seedUrl: "https://example.com", mode: "raw" });
  const prerender = generateAtlsFilename({ seedUrl: "https://example.com", mode: "prerender" });
  const full = generateAtlsFilename({ seedUrl: "https://example.com", mode: "full" });
  
  expect(raw.endsWith("_raw.atls")).toBeTruthy();
  expect(prerender.endsWith("_prerender.atls")).toBeTruthy();
  expect(full.endsWith("_full.atls")).toBeTruthy();
});

test("generateAtlsFilename - IPv4 address", () => {
  const result = generateAtlsFilename({ seedUrl: "http://192.168.1.1", mode: "raw" });
  expect(result.startsWith("192.168.1.1_")).toBeTruthy();
});

test("generateAtlsFilename - localhost", () => {
  const result = generateAtlsFilename({ seedUrl: "http://localhost", mode: "prerender" });
  expect(result.startsWith("localhost_")).toBeTruthy();
});

test("generateAtlsFilename - localhost with port", () => {
  const result = generateAtlsFilename({ seedUrl: "http://localhost:3000", mode: "full" });
  expect(result.startsWith("localhost_")).toBeTruthy();
  expect(!result.includes(":3000")).toBeTruthy();
});

test("resolveOutputPath - uses provided path", async () => {
  const result = await resolveOutputPath("custom/path.atls", {
    seedUrl: "https://example.com",
    mode: "raw"
  });
  expect(result).toBe("custom/path.atls");
});

test("resolveOutputPath - generates when undefined", async () => {
  const result = await resolveOutputPath(undefined, {
    seedUrl: "https://example.com",
    mode: "prerender"
  });
  expect(result.startsWith("./export/example.com_")).toBeTruthy();
  expect(result.endsWith("_prerender.atls")).toBeTruthy();
});

test("resolveOutputPath - handles absolute paths", async () => {
  const result = await resolveOutputPath("/tmp/test.atls", {
    seedUrl: "https://example.com",
    mode: "raw"
  });
  expect(result).toBe("/tmp/test.atls");
});

test("resolveOutputPath - handles relative paths with directories", async () => {
  const result = await resolveOutputPath("./archives/crawl.atls", {
    seedUrl: "https://example.com",
    mode: "full"
  });
  expect(result).toBe("./archives/crawl.atls");
});

test("generateAtlsFilename - uppercase URL normalized", () => {
  const result = generateAtlsFilename({ seedUrl: "HTTPS://EXAMPLE.COM", mode: "raw" });
  expect(result.startsWith("example.com_")).toBeTruthy();
});

test("generateAtlsFilename - hyphenated domain", () => {
  const result = generateAtlsFilename({ seedUrl: "https://my-site.example.com", mode: "prerender" });
  expect(result.startsWith("my-site.example.com_")).toBeTruthy();
});

test("generateAtlsFilename - numeric domain", () => {
  const result = generateAtlsFilename({ seedUrl: "https://123.example.com", mode: "full" });
  expect(result.startsWith("123.example.com_")).toBeTruthy();
});

test("generateAtlsFilename - international domain (punycode)", () => {
  // Most browsers convert internationalized domains to punycode
  const result = generateAtlsFilename({ seedUrl: "https://münchen.de", mode: "raw" });
  // Should handle gracefully
  expect(result.includes("_raw.atls")).toBeTruthy();
});

test("generateAtlsFilename - very long domain", () => {
  const longDomain = "https://this-is-a-very-long-subdomain-that-might-cause-issues.example.com";
  const result = generateAtlsFilename({ seedUrl: longDomain, mode: "prerender" });
  expect(result.includes("this-is-a-very-long-subdomain-that-might-cause-issues.example.com_")).toBeTruthy();
});

test("generateAtlsFilename - trailing slash ignored", () => {
  const result1 = generateAtlsFilename({ seedUrl: "https://example.com", mode: "raw" });
  const result2 = generateAtlsFilename({ seedUrl: "https://example.com/", mode: "raw" });
  // Should extract same domain
  expect(result1.startsWith("example.com_")).toBeTruthy();
  expect(result2.startsWith("example.com_")).toBeTruthy();
});

test("generateAtlsFilename - invalid URL falls back gracefully", () => {
  const result = generateAtlsFilename({ seedUrl: "not-a-valid-url", mode: "raw" });
  // Should sanitize and use the input
  expect(result.includes("_raw.atls")).toBeTruthy();
  expect(!result.includes("://")).toBeTruthy();
});

test("generateAtlsFilename - empty string URL", () => {
  const result = generateAtlsFilename({ seedUrl: "", mode: "prerender" });
  expect(result.includes("_prerender.atls")).toBeTruthy();
});

test("generateAtlsFilename - URL with authentication", () => {
  const result = generateAtlsFilename({ seedUrl: "https://user:pass@example.com", mode: "full" });
  expect(result.startsWith("example.com_")).toBeTruthy();
  expect(!result.includes("user")).toBeTruthy();
  expect(!result.includes("pass")).toBeTruthy();
});

test("generateAtlsFilename - consistent timestamps", () => {
  const testDate = new Date("2025-12-31T23:59:59");
  const result = generateAtlsFilename({ 
    seedUrl: "https://example.com", 
    mode: "raw",
    timestamp: testDate
  });
  expect(result.includes("20251231_235959")).toBeTruthy();
});

test("generateAtlsFilename - midnight timestamp", () => {
  const testDate = new Date("2025-01-01T00:00:00");
  const result = generateAtlsFilename({ 
    seedUrl: "https://example.com", 
    mode: "prerender",
    timestamp: testDate
  });
  expect(result.includes("20250101_000000")).toBeTruthy();
});
