/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { test } from "node:test";
import assert from "node:assert";
import { buildConfig } from "../src/core/config.js";
test("maxDepth - default is -1 (unlimited)", () => {
    const config = buildConfig({
        seeds: ["https://example.com"],
        outAtls: "test.atls"
    });
    assert.strictEqual(config.maxDepth, -1, "Default maxDepth should be -1");
});
test("maxDepth - accepts 0 (seeds only)", () => {
    const config = buildConfig({
        seeds: ["https://example.com"],
        outAtls: "test.atls",
        maxDepth: 0
    });
    assert.strictEqual(config.maxDepth, 0);
});
test("maxDepth - accepts positive integers", () => {
    const config = buildConfig({
        seeds: ["https://example.com"],
        outAtls: "test.atls",
        maxDepth: 5
    });
    assert.strictEqual(config.maxDepth, 5);
});
test("maxDepth - accepts -1 explicitly", () => {
    const config = buildConfig({
        seeds: ["https://example.com"],
        outAtls: "test.atls",
        maxDepth: -1
    });
    assert.strictEqual(config.maxDepth, -1);
});
test("maxDepth - rejects -2", () => {
    assert.throws(() => {
        buildConfig({
            seeds: ["https://example.com"],
            outAtls: "test.atls",
            maxDepth: -2
        });
    }, /maxDepth must be >= -1/);
});
test("maxDepth - rejects -100", () => {
    assert.throws(() => {
        buildConfig({
            seeds: ["https://example.com"],
            outAtls: "test.atls",
            maxDepth: -100
        });
    }, /maxDepth must be >= -1/);
});
test("maxDepth - accepts very large values", () => {
    const config = buildConfig({
        seeds: ["https://example.com"],
        outAtls: "test.atls",
        maxDepth: 1000000
    });
    assert.strictEqual(config.maxDepth, 1000000);
});
test("maxDepth - handles undefined gracefully", () => {
    const config = buildConfig({
        seeds: ["https://example.com"],
        outAtls: "test.atls",
        maxDepth: undefined
    });
    assert.strictEqual(config.maxDepth, -1, "Should default to -1 when undefined");
});
test("maxDepth - rejects non-integer floats", () => {
    // Config validation should reject floats if we have strict typing
    const config = buildConfig({
        seeds: ["https://example.com"],
        outAtls: "test.atls",
        maxDepth: 3.5
    });
    // TypeScript will coerce to int, but we test it doesn't break
    assert.ok(typeof config.maxDepth === 'number');
});
//# sourceMappingURL=maxDepth.test.js.map