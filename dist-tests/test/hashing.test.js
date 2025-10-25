/**
 * Hashing Utilities Tests
 *
 * Tests for SHA256 and SHA1 hashing functions
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { sha256, sha256Hex, sha1Hex } from "../src/utils/hashing.js";
describe("sha256", () => {
    test("hashes string input", () => {
        const input = "hello world";
        const result = sha256(input);
        assert.ok(result);
        assert.equal(typeof result, "string");
        assert.ok(result.length > 0);
    });
    test("produces consistent hash for same input", () => {
        const input = "test data";
        const hash1 = sha256(input);
        const hash2 = sha256(input);
        assert.equal(hash1, hash2);
    });
    test("produces different hashes for different inputs", () => {
        const hash1 = sha256("input1");
        const hash2 = sha256("input2");
        assert.notEqual(hash1, hash2);
    });
    test("handles Buffer input", () => {
        const buffer = Buffer.from("hello world", "utf-8");
        const result = sha256(buffer);
        assert.ok(result);
        assert.equal(typeof result, "string");
    });
    test("handles empty string", () => {
        const result = sha256("");
        assert.ok(result);
        assert.ok(result.length > 0);
    });
    test("handles Unicode characters", () => {
        const input = "こんにちは世界 🌍";
        const result = sha256(input);
        assert.ok(result);
        assert.ok(result.length > 0);
    });
    test("produces base64 output", () => {
        const result = sha256("test");
        // Base64 pattern: alphanumeric, +, /, and = for padding
        assert.ok(/^[A-Za-z0-9+/=]+$/.test(result));
    });
});
describe("sha256Hex", () => {
    test("produces hex output", () => {
        const input = "hello world";
        const result = sha256Hex(input);
        assert.ok(result);
        assert.equal(typeof result, "string");
        // Hex pattern: only 0-9 and a-f
        assert.ok(/^[0-9a-f]+$/.test(result));
    });
    test("produces 64-character hex string (256 bits)", () => {
        const result = sha256Hex("test");
        assert.equal(result.length, 64);
    });
    test("produces consistent hash", () => {
        const input = "consistent test";
        const hash1 = sha256Hex(input);
        const hash2 = sha256Hex(input);
        assert.equal(hash1, hash2);
    });
    test("known hash value verification", () => {
        // SHA-256 of empty string is a well-known value
        const result = sha256Hex("");
        // Known SHA-256 hash of empty string
        assert.equal(result, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });
    test("handles Buffer input", () => {
        const buffer = Buffer.from("test", "utf-8");
        const result = sha256Hex(buffer);
        assert.equal(result.length, 64);
        assert.ok(/^[0-9a-f]+$/.test(result));
    });
});
describe("sha1Hex", () => {
    test("produces hex output", () => {
        const input = "hello world";
        const result = sha1Hex(input);
        assert.ok(result);
        assert.equal(typeof result, "string");
        // Hex pattern
        assert.ok(/^[0-9a-f]+$/.test(result));
    });
    test("produces 40-character hex string (160 bits)", () => {
        const result = sha1Hex("test");
        assert.equal(result.length, 40);
    });
    test("produces consistent hash", () => {
        const input = "sha1 test";
        const hash1 = sha1Hex(input);
        const hash2 = sha1Hex(input);
        assert.equal(hash1, hash2);
    });
    test("known hash value verification", () => {
        // SHA-1 of empty string is a well-known value
        const result = sha1Hex("");
        // Known SHA-1 hash of empty string
        assert.equal(result, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
    });
    test("handles Unicode input", () => {
        const input = "测试 🎉";
        const result = sha1Hex(input);
        assert.equal(result.length, 40);
        assert.ok(/^[0-9a-f]+$/.test(result));
    });
});
describe("hashing edge cases", () => {
    test("handles very long strings", () => {
        const longString = "a".repeat(1000000); // 1MB of 'a's
        const result = sha256Hex(longString);
        assert.equal(result.length, 64);
    });
    test("handles newlines and special characters", () => {
        const input = "line1\nline2\r\nline3\ttabbed";
        const result = sha256Hex(input);
        assert.equal(result.length, 64);
    });
    test("different hash algorithms produce different output lengths", () => {
        const input = "same input";
        const sha256Result = sha256Hex(input);
        const sha1Result = sha1Hex(input);
        assert.equal(sha256Result.length, 64); // 256 bits = 64 hex chars
        assert.equal(sha1Result.length, 40); // 160 bits = 40 hex chars
        assert.notEqual(sha256Result, sha1Result);
    });
    test("URL hashing (real-world use case)", () => {
        const url = "https://example.com/path/to/page?param=value&other=123";
        const hash = sha256Hex(url);
        assert.equal(hash.length, 64);
        // Same URL produces same hash
        const hash2 = sha256Hex(url);
        assert.equal(hash, hash2);
    });
    test("content hashing (real-world use case)", () => {
        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body><h1>Content</h1></body>
      </html>
    `;
        const hash = sha256Hex(htmlContent);
        assert.equal(hash.length, 64);
        // Small change produces different hash
        const modifiedContent = htmlContent.replace("Test Page", "Modified Page");
        const hash2 = sha256Hex(modifiedContent);
        assert.notEqual(hash, hash2);
    });
});
//# sourceMappingURL=hashing.test.js.map