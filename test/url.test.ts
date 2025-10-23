/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test } from "node:test";
import assert from "node:assert";
import {
  normalizeUrl,
  isInternal,
  isSameOrigin,
  sectionOf,
  stripTrackingParams,
  shouldSampleParam,
  applyParamPolicy,
} from "../src/utils/url.js";

test("normalizeUrl - removes fragment", () => {
  const result = normalizeUrl("https://caifrazier.com/page#section");
  assert.ok(!result.includes("#"), "Should remove fragment");
});

test("normalizeUrl - lowercases URL", () => {
  const result = normalizeUrl("HTTPS://CAIFRAZIER.COM/PAGE");
  assert.strictEqual(result, "https://caifrazier.com/page");
});

test("normalizeUrl - sorts query params", () => {
  const result = normalizeUrl("https://caifrazier.com?z=1&a=2&m=3");
  assert.ok(result.includes("a=2") && result.indexOf("a=2") < result.indexOf("m=3"));
  assert.ok(result.indexOf("m=3") < result.indexOf("z=1"));
});

test("normalizeUrl - is idempotent", () => {
  const url = "https://caifrazier.com/Page?b=2&a=1#frag";
  const normalized = normalizeUrl(url);
  const doubleNormalized = normalizeUrl(normalized);
  assert.strictEqual(normalized, doubleNormalized, "Should be idempotent");
});

test("isInternal - same origin returns true", () => {
  assert.strictEqual(
  isInternal("https://caifrazier.com/page1", "https://caifrazier.com/page2"),
    true
  );
});

test("isInternal - different origin returns false", () => {
  assert.strictEqual(
  isInternal("https://caifrazier.com/page", "https://other.com/page"),
    false
  );
});

test("isSameOrigin - same origin", () => {
  assert.strictEqual(
  isSameOrigin("https://caifrazier.com/a", "https://caifrazier.com/b"),
    true
  );
});

test("isSameOrigin - different subdomain", () => {
  assert.strictEqual(
  isSameOrigin("https://www.caifrazier.com/a", "https://blog.caifrazier.com/b"),
    false
  );
});

test("sectionOf - root path", () => {
  assert.strictEqual(sectionOf("https://example.com/"), "/");
  assert.strictEqual(sectionOf("https://caifrazier.com/"), "/");
  assert.strictEqual(sectionOf("https://caifrazier.com"), "/");
  assert.strictEqual(sectionOf("https://caifrazier.com/products"), "/products/");
  assert.strictEqual(sectionOf("https://caifrazier.com/products/"), "/products/");
  assert.strictEqual(sectionOf("https://example.com/products"), "/products/");
  assert.strictEqual(sectionOf("https://example.com/products/"), "/products/");
});

test("sectionOf - multiple segments", () => {
  assert.strictEqual(
  sectionOf("https://caifrazier.com/products/shoes/nike"),
    "/products/"
  );
});

test("sectionOf - with query and fragment", () => {
  assert.strictEqual(
  sectionOf("https://caifrazier.com/blog/post?id=1#section"),
    "/blog/"
  );
});

test("stripTrackingParams - removes exact matches", () => {
  const url = new URL("https://caifrazier.com?gclid=123&page=2");
  const blockList = ["gclid", "fbclid"];
  const result = stripTrackingParams(url, blockList);
  
  assert.strictEqual(result.searchParams.has("gclid"), false);
  assert.strictEqual(result.searchParams.has("page"), true);
});

test("stripTrackingParams - handles wildcards", () => {
  const url = new URL("https://caifrazier.com?utm_source=fb&utm_medium=cpc&page=2");
  const blockList = ["utm_*"];
  const result = stripTrackingParams(url, blockList);
  
  assert.strictEqual(result.searchParams.has("utm_source"), false);
  assert.strictEqual(result.searchParams.has("utm_medium"), false);
  assert.strictEqual(result.searchParams.has("page"), true);
});

test("stripTrackingParams - multiple wildcards", () => {
  const url = new URL("https://caifrazier.com?ref=123&ref_source=twitter&other=val");
  const blockList = ["ref", "ref_*"];
  const result = stripTrackingParams(url, blockList);
  
  assert.strictEqual(result.searchParams.has("ref"), false);
  assert.strictEqual(result.searchParams.has("ref_source"), false);
  assert.strictEqual(result.searchParams.has("other"), true);
});

test("shouldSampleParam - first value is kept", () => {
  const seenParams = new Map<string, Set<string>>();
  
  const result = shouldSampleParam("color", "red", seenParams);
  assert.strictEqual(result, true, "First value should be kept");
  assert.strictEqual(seenParams.get("color")?.has("red"), true);
});

test("shouldSampleParam - second different value is rejected", () => {
  const seenParams = new Map<string, Set<string>>();
  seenParams.set("color", new Set(["red"]));
  
  const result = shouldSampleParam("color", "blue", seenParams);
  assert.strictEqual(result, false, "Second value should be rejected in sample mode");
});

test("shouldSampleParam - same value is kept", () => {
  const seenParams = new Map<string, Set<string>>();
  seenParams.set("color", new Set(["red"]));
  
  const result = shouldSampleParam("color", "red", seenParams);
  assert.strictEqual(result, true, "Same value should be kept");
});

test("applyParamPolicy - keep policy keeps all params", () => {
  const url = new URL("https://example.com?a=1&b=2&c=3");
  const seenParams = new Map<string, Set<string>>();
  
  const result = applyParamPolicy(url, "keep", [], seenParams);
  
  assert.strictEqual(result.searchParams.get("a"), "1");
  assert.strictEqual(result.searchParams.get("b"), "2");
  assert.strictEqual(result.searchParams.get("c"), "3");
});

test("applyParamPolicy - strip policy removes all params", () => {
  const url = new URL("https://example.com?a=1&b=2");
  const seenParams = new Map<string, Set<string>>();
  
  const result = applyParamPolicy(url, "strip", [], seenParams);
  
  assert.strictEqual(result.search, "");
});

test("applyParamPolicy - sample policy keeps first value only", () => {
  const seenParams = new Map<string, Set<string>>();
  
  // First URL with color=red
  const url1 = new URL("https://example.com?color=red");
  const result1 = applyParamPolicy(url1, "sample", [], seenParams);
  assert.strictEqual(result1.searchParams.get("color"), "red");
  
  // Second URL with color=blue - should be stripped
  const url2 = new URL("https://example.com?color=blue");
  const result2 = applyParamPolicy(url2, "sample", [], seenParams);
  assert.strictEqual(result2.searchParams.has("color"), false, "Should strip second value");
});

test("applyParamPolicy - sample policy strips blocked params first", () => {
  const url = new URL("https://example.com?gclid=123&color=red");
  const seenParams = new Map<string, Set<string>>();
  const blockList = ["gclid"];
  
  const result = applyParamPolicy(url, "sample", blockList, seenParams);
  
  assert.strictEqual(result.searchParams.has("gclid"), false);
  assert.strictEqual(result.searchParams.get("color"), "red");
});

test("applyParamPolicy - keeps same URL normalized", () => {
  const seenParams = new Map<string, Set<string>>();
  
  const url1 = new URL("https://example.com?size=large&color=red");
  const result1 = applyParamPolicy(url1, "sample", [], seenParams);
  
  // Same params, same values
  const url2 = new URL("https://example.com?size=large&color=red");
  const result2 = applyParamPolicy(url2, "sample", [], seenParams);
  
  assert.strictEqual(result2.searchParams.get("size"), "large");
  assert.strictEqual(result2.searchParams.get("color"), "red");
});
