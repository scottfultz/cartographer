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
    
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length > 0).toBeTruthy();
  });

  test("produces consistent hash for same input", () => {
    const input = "test data";
    const hash1 = sha256(input);
    const hash2 = sha256(input);
    
    expect(hash1).toBe(hash2);
  });

  test("produces different hashes for different inputs", () => {
    const hash1 = sha256("input1");
    const hash2 = sha256("input2");
    
    expect(hash1).not.toBe(hash2);
  });

  test("handles Buffer input", () => {
    const buffer = Buffer.from("hello world", "utf-8");
    const result = sha256(buffer);
    
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  test("handles empty string", () => {
    const result = sha256("");
    
    expect(result).toBeTruthy();
    expect(result.length > 0).toBeTruthy();
  });

  test("handles Unicode characters", () => {
    const input = "こんにちは世界 🌍";
    const result = sha256(input);
    
    expect(result).toBeTruthy();
    expect(result.length > 0).toBeTruthy();
  });

  test("produces base64 output", () => {
    const result = sha256("test");
    
    // Base64 pattern: alphanumeric, +, /, and = for padding
    expect(/^[A-Za-z0-9+/=]+$/.test(result).toBeTruthy());
  });
});

describe("sha256Hex", () => {
  test("produces hex output", () => {
    const input = "hello world";
    const result = sha256Hex(input);
    
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    // Hex pattern: only 0-9 and a-f
    expect(/^[0-9a-f]+$/.test(result).toBeTruthy());
  });

  test("produces 64-character hex string (256 bits)", () => {
    const result = sha256Hex("test");
    
    expect(result.length).toBe(64);
  });

  test("produces consistent hash", () => {
    const input = "consistent test";
    const hash1 = sha256Hex(input);
    const hash2 = sha256Hex(input);
    
    expect(hash1).toBe(hash2);
  });

  test("known hash value verification", () => {
    // SHA-256 of empty string is a well-known value
    const result = sha256Hex("");
    
    // Known SHA-256 hash of empty string
    expect(result).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  test("handles Buffer input", () => {
    const buffer = Buffer.from("test", "utf-8");
    const result = sha256Hex(buffer);
    
    expect(result.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(result).toBeTruthy());
  });
});

describe("sha1Hex", () => {
  test("produces hex output", () => {
    const input = "hello world";
    const result = sha1Hex(input);
    
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    // Hex pattern
    expect(/^[0-9a-f]+$/.test(result).toBeTruthy());
  });

  test("produces 40-character hex string (160 bits)", () => {
    const result = sha1Hex("test");
    
    expect(result.length).toBe(40);
  });

  test("produces consistent hash", () => {
    const input = "sha1 test";
    const hash1 = sha1Hex(input);
    const hash2 = sha1Hex(input);
    
    expect(hash1).toBe(hash2);
  });

  test("known hash value verification", () => {
    // SHA-1 of empty string is a well-known value
    const result = sha1Hex("");
    
    // Known SHA-1 hash of empty string
    expect(result).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
  });

  test("handles Unicode input", () => {
    const input = "测试 🎉";
    const result = sha1Hex(input);
    
    expect(result.length).toBe(40);
    expect(/^[0-9a-f]+$/.test(result).toBeTruthy());
  });
});

describe("hashing edge cases", () => {
  test("handles very long strings", () => {
    const longString = "a".repeat(1000000); // 1MB of 'a's
    const result = sha256Hex(longString);
    
    expect(result.length).toBe(64);
  });

  test("handles newlines and special characters", () => {
    const input = "line1\nline2\r\nline3\ttabbed";
    const result = sha256Hex(input);
    
    expect(result.length).toBe(64);
  });

  test("different hash algorithms produce different output lengths", () => {
    const input = "same input";
    const sha256Result = sha256Hex(input);
    const sha1Result = sha1Hex(input);
    
    expect(sha256Result.length).toBe(64); // 256 bits = 64 hex chars
    expect(sha1Result.length).toBe(40);   // 160 bits = 40 hex chars
    expect(sha256Result).not.toBe(sha1Result);
  });

  test("URL hashing (real-world use case)", () => {
    const url = "https://example.com/path/to/page?param=value&other=123";
    const hash = sha256Hex(url);
    
    expect(hash.length).toBe(64);
    
    // Same URL produces same hash
    const hash2 = sha256Hex(url);
    expect(hash).toBe(hash2);
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
    expect(hash.length).toBe(64);
    
    // Small change produces different hash
    const modifiedContent = htmlContent.replace("Test Page").toBe("Modified Page");
    const hash2 = sha256Hex(modifiedContent);
    expect(hash).not.toBe(hash2);
  });
});
