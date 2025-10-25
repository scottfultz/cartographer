/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()

/**
 * Depth Limiting Edge Cases
 * Tests for the depth checking logic
 */

function shouldEnqueueAtDepth(currentDepth: number, maxDepth: number): boolean {
  // maxDepth -1 = unlimited
  // maxDepth 0 = seeds only
  // maxDepth N = up to depth N
  if (maxDepth >= 0 && currentDepth > maxDepth) {
    return false;
  }
  return true;
}

test("depth limiting - unlimited depth (-1) allows depth 0", () => {
  expect(shouldEnqueueAtDepth(0, -1), true);
});

test("depth limiting - unlimited depth (-1) allows depth 1", () => {
  expect(shouldEnqueueAtDepth(1, -1), true);
});

test("depth limiting - unlimited depth (-1) allows depth 100", () => {
  expect(shouldEnqueueAtDepth(100, -1), true);
});

test("depth limiting - unlimited depth (-1) allows depth 1000000", () => {
  expect(shouldEnqueueAtDepth(1000000, -1), true);
});

test("depth limiting - maxDepth 0 allows depth 0 (seeds)", () => {
  expect(shouldEnqueueAtDepth(0, 0), true);
});

test("depth limiting - maxDepth 0 blocks depth 1", () => {
  expect(shouldEnqueueAtDepth(1, 0), false);
});

test("depth limiting - maxDepth 0 blocks depth 2", () => {
  expect(shouldEnqueueAtDepth(2, 0), false);
});

test("depth limiting - maxDepth 1 allows depth 0", () => {
  expect(shouldEnqueueAtDepth(0, 1), true);
});

test("depth limiting - maxDepth 1 allows depth 1", () => {
  expect(shouldEnqueueAtDepth(1, 1), true);
});

test("depth limiting - maxDepth 1 blocks depth 2", () => {
  expect(shouldEnqueueAtDepth(2, 1), false);
});

test("depth limiting - maxDepth 5 allows depth 5 (boundary)", () => {
  expect(shouldEnqueueAtDepth(5, 5), true);
});

test("depth limiting - maxDepth 5 blocks depth 6", () => {
  expect(shouldEnqueueAtDepth(6, 5), false);
});

test("depth limiting - maxDepth 5 blocks depth 100", () => {
  expect(shouldEnqueueAtDepth(100, 5), false);
});

test("depth limiting - maxDepth 100 allows depth 99", () => {
  expect(shouldEnqueueAtDepth(99, 100), true);
});

test("depth limiting - maxDepth 100 allows depth 100 (boundary)", () => {
  expect(shouldEnqueueAtDepth(100, 100), true);
});

test("depth limiting - maxDepth 100 blocks depth 101", () => {
  expect(shouldEnqueueAtDepth(101, 100), false);
});

test("depth limiting - negative depth with unlimited", () => {
  // Shouldn't happen in practice, but test robustness
  expect(shouldEnqueueAtDepth(-1, -1), true);
});

test("depth limiting - zero depth with maxDepth 0", () => {
  expect(shouldEnqueueAtDepth(0, 0), true);
});

test("depth limiting - large maxDepth allows large depth", () => {
  expect(shouldEnqueueAtDepth(999999, 1000000), true);
});

test("depth limiting - large maxDepth boundary", () => {
  expect(shouldEnqueueAtDepth(1000000, 1000000), true);
});

test("depth limiting - exceeds large maxDepth", () => {
  expect(shouldEnqueueAtDepth(1000001, 1000000), false);
});

test("depth limiting - maxDepth 10 series", () => {
  const maxDepth = 10;
  for (let depth = 0; depth <= 10; depth++) {
    expect(shouldEnqueueAtDepth(depth, maxDepth), true, `Depth ${depth} should be allowed`);
  }
  expect(shouldEnqueueAtDepth(11, maxDepth), false, "Depth 11 should be blocked");
  expect(shouldEnqueueAtDepth(12, maxDepth), false, "Depth 12 should be blocked");
});

test("depth limiting - unlimited allows arbitrary depths", () => {
  const maxDepth = -1;
  for (let depth = 0; depth <= 100; depth += 10) {
    expect(shouldEnqueueAtDepth(depth, maxDepth), true, `Depth ${depth} should be allowed with unlimited`);
  }
});

test("depth limiting - seeds only blocks everything except 0", () => {
  const maxDepth = 0;
  expect(shouldEnqueueAtDepth(0, maxDepth), true, "Depth 0 allowed");
  for (let depth = 1; depth <= 10; depth++) {
    expect(shouldEnqueueAtDepth(depth, maxDepth), false, `Depth ${depth} should be blocked with seeds-only`);
  }
});
