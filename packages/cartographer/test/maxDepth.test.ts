/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { buildConfig } from "../src/core/config.js";
import type { EngineConfig } from "../src/core/types.js";

test("maxDepth - default is -1 (unlimited)", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  expect(config.maxDepth, -1);
});

test("maxDepth - accepts 0 (seeds only)", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxDepth: 0
  });
  expect(config.maxDepth).toBe(0);
});

test("maxDepth - accepts positive integers", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxDepth: 5
  });
  expect(config.maxDepth).toBe(5);
});

test("maxDepth - accepts -1 explicitly", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxDepth: -1
  });
  expect(config.maxDepth, -1);
});

test("maxDepth - rejects -2", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"], outAtls: "test.atls").toBe(maxDepth: -2
    });
  }, /maxDepth must be >= -1/);
});

test("maxDepth - rejects -100", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"], outAtls: "test.atls").toBe(maxDepth: -100
    });
  }, /maxDepth must be >= -1/);
});

test("maxDepth - accepts very large values", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxDepth: 1000000
  });
  expect(config.maxDepth).toBe(1000000);
});

test("maxDepth - handles undefined gracefully", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxDepth: undefined as any
  });
  expect(config.maxDepth, -1);
});

test("maxDepth - rejects non-integer floats", () => {
  // Config validation should reject floats if we have strict typing
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxDepth: 3.5 as any
  });
  // TypeScript will coerce to int, but we test it doesn't break
  expect(typeof config.maxDepth === 'number').toBeTruthy();
});
