/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { test } from "node:test";
import assert from "node:assert";
/**
 * Depth Limiting Edge Cases
 * Tests for the depth checking logic
 */
function shouldEnqueueAtDepth(currentDepth, maxDepth) {
    // maxDepth -1 = unlimited
    // maxDepth 0 = seeds only
    // maxDepth N = up to depth N
    if (maxDepth >= 0 && currentDepth > maxDepth) {
        return false;
    }
    return true;
}
test("depth limiting - unlimited depth (-1) allows depth 0", () => {
    assert.strictEqual(shouldEnqueueAtDepth(0, -1), true);
});
test("depth limiting - unlimited depth (-1) allows depth 1", () => {
    assert.strictEqual(shouldEnqueueAtDepth(1, -1), true);
});
test("depth limiting - unlimited depth (-1) allows depth 100", () => {
    assert.strictEqual(shouldEnqueueAtDepth(100, -1), true);
});
test("depth limiting - unlimited depth (-1) allows depth 1000000", () => {
    assert.strictEqual(shouldEnqueueAtDepth(1000000, -1), true);
});
test("depth limiting - maxDepth 0 allows depth 0 (seeds)", () => {
    assert.strictEqual(shouldEnqueueAtDepth(0, 0), true);
});
test("depth limiting - maxDepth 0 blocks depth 1", () => {
    assert.strictEqual(shouldEnqueueAtDepth(1, 0), false);
});
test("depth limiting - maxDepth 0 blocks depth 2", () => {
    assert.strictEqual(shouldEnqueueAtDepth(2, 0), false);
});
test("depth limiting - maxDepth 1 allows depth 0", () => {
    assert.strictEqual(shouldEnqueueAtDepth(0, 1), true);
});
test("depth limiting - maxDepth 1 allows depth 1", () => {
    assert.strictEqual(shouldEnqueueAtDepth(1, 1), true);
});
test("depth limiting - maxDepth 1 blocks depth 2", () => {
    assert.strictEqual(shouldEnqueueAtDepth(2, 1), false);
});
test("depth limiting - maxDepth 5 allows depth 5 (boundary)", () => {
    assert.strictEqual(shouldEnqueueAtDepth(5, 5), true);
});
test("depth limiting - maxDepth 5 blocks depth 6", () => {
    assert.strictEqual(shouldEnqueueAtDepth(6, 5), false);
});
test("depth limiting - maxDepth 5 blocks depth 100", () => {
    assert.strictEqual(shouldEnqueueAtDepth(100, 5), false);
});
test("depth limiting - maxDepth 100 allows depth 99", () => {
    assert.strictEqual(shouldEnqueueAtDepth(99, 100), true);
});
test("depth limiting - maxDepth 100 allows depth 100 (boundary)", () => {
    assert.strictEqual(shouldEnqueueAtDepth(100, 100), true);
});
test("depth limiting - maxDepth 100 blocks depth 101", () => {
    assert.strictEqual(shouldEnqueueAtDepth(101, 100), false);
});
test("depth limiting - negative depth with unlimited", () => {
    // Shouldn't happen in practice, but test robustness
    assert.strictEqual(shouldEnqueueAtDepth(-1, -1), true);
});
test("depth limiting - zero depth with maxDepth 0", () => {
    assert.strictEqual(shouldEnqueueAtDepth(0, 0), true);
});
test("depth limiting - large maxDepth allows large depth", () => {
    assert.strictEqual(shouldEnqueueAtDepth(999999, 1000000), true);
});
test("depth limiting - large maxDepth boundary", () => {
    assert.strictEqual(shouldEnqueueAtDepth(1000000, 1000000), true);
});
test("depth limiting - exceeds large maxDepth", () => {
    assert.strictEqual(shouldEnqueueAtDepth(1000001, 1000000), false);
});
test("depth limiting - maxDepth 10 series", () => {
    const maxDepth = 10;
    for (let depth = 0; depth <= 10; depth++) {
        assert.strictEqual(shouldEnqueueAtDepth(depth, maxDepth), true, `Depth ${depth} should be allowed`);
    }
    assert.strictEqual(shouldEnqueueAtDepth(11, maxDepth), false, "Depth 11 should be blocked");
    assert.strictEqual(shouldEnqueueAtDepth(12, maxDepth), false, "Depth 12 should be blocked");
});
test("depth limiting - unlimited allows arbitrary depths", () => {
    const maxDepth = -1;
    for (let depth = 0; depth <= 100; depth += 10) {
        assert.strictEqual(shouldEnqueueAtDepth(depth, maxDepth), true, `Depth ${depth} should be allowed with unlimited`);
    }
});
test("depth limiting - seeds only blocks everything except 0", () => {
    const maxDepth = 0;
    assert.strictEqual(shouldEnqueueAtDepth(0, maxDepth), true, "Depth 0 allowed");
    for (let depth = 1; depth <= 10; depth++) {
        assert.strictEqual(shouldEnqueueAtDepth(depth, maxDepth), false, `Depth ${depth} should be blocked with seeds-only`);
    }
});
//# sourceMappingURL=depth-limiting.test.js.map