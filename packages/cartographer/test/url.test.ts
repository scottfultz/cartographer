/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
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
  expect(!result.includes("#")).toBeTruthy();
});

test("normalizeUrl - lowercases URL", () => {
  const result = normalizeUrl("HTTPS://CAIFRAZIER.COM/PAGE");
  expect(result).toBe("https://caifrazier.com/page");
});

test("normalizeUrl - sorts query params", () => {
  const result = normalizeUrl("https://caifrazier.com?z=1&a=2&m=3");
  expect(result.includes("a=2") && result.indexOf("a=2") < result.indexOf("m=3")).toBeTruthy();
  expect(result.indexOf("m=3") < result.indexOf("z=1")).toBeTruthy();
});

test("normalizeUrl - is idempotent", () => {
  const url = "https://caifrazier.com/Page?b=2&a=1#frag";
  const normalized = normalizeUrl(url);
  const doubleNormalized = normalizeUrl(normalized);
  expect(normalized).toBe(doubleNormalized);
});

test("isInternal - same origin returns true", () => {
  expect(
  isInternal("https://caifrazier.com/page1", "https://caifrazier.com/page2"),
    true
  );
});

test("isInternal - different origin returns false", () => {
  expect(
  isInternal("https://caifrazier.com/page", "https://other.com/page"),
    false
  );
});

test("isSameOrigin - same origin", () => {
  expect(
  isSameOrigin("https://caifrazier.com/a", "https://caifrazier.com/b"),
    true
  );
});

test("isSameOrigin - different subdomain", () => {
  expect(
  isSameOrigin("https://www.caifrazier.com/a", "https://blog.caifrazier.com/b"),
    false
  );
});

test("sectionOf - root path", () => {
  expect(sectionOf("https://example.com/")).toBe("/");
  expect(sectionOf("https://caifrazier.com/")).toBe("/");
  expect(sectionOf("https://caifrazier.com")).toBe("/");
  expect(sectionOf("https://caifrazier.com/products")).toBe("/products/");
  expect(sectionOf("https://caifrazier.com/products/")).toBe("/products/");
  expect(sectionOf("https://example.com/products")).toBe("/products/");
  expect(sectionOf("https://example.com/products/")).toBe("/products/");
});

test("sectionOf - multiple segments", () => {
  expect(
  sectionOf("https://caifrazier.com/products/shoes/nike")).toBe("/products/"
  );
});

test("sectionOf - with query and fragment", () => {
  expect(
  sectionOf("https://caifrazier.com/blog/post?id=1#section")).toBe("/blog/"
  );
});

test("stripTrackingParams - removes exact matches", () => {
  const url = new URL("https://caifrazier.com?gclid=123&page=2");
  const blockList = ["gclid", "fbclid"];
  const result = stripTrackingParams(url, blockList);
  
  expect(result.searchParams.has("gclid")).toBe(false);
  expect(result.searchParams.has("page")).toBe(true);
});

test("stripTrackingParams - handles wildcards", () => {
  const url = new URL("https://caifrazier.com?utm_source=fb&utm_medium=cpc&page=2");
  const blockList = ["utm_*"];
  const result = stripTrackingParams(url, blockList);
  
  expect(result.searchParams.has("utm_source")).toBe(false);
  expect(result.searchParams.has("utm_medium")).toBe(false);
  expect(result.searchParams.has("page")).toBe(true);
});

test("stripTrackingParams - multiple wildcards", () => {
  const url = new URL("https://caifrazier.com?ref=123&ref_source=twitter&other=val");
  const blockList = ["ref", "ref_*"];
  const result = stripTrackingParams(url, blockList);
  
  expect(result.searchParams.has("ref")).toBe(false);
  expect(result.searchParams.has("ref_source")).toBe(false);
  expect(result.searchParams.has("other")).toBe(true);
});

test("shouldSampleParam - first value is kept", () => {
  const seenParams = new Map<string, Set<string>>();
  
  const result = shouldSampleParam("color", "red", seenParams);
  expect(result).toBe(true);
  expect(seenParams.get("color")?.has("red")).toBe(true);
});

test("shouldSampleParam - second different value is rejected", () => {
  const seenParams = new Map<string, Set<string>>();
  seenParams.set("color", new Set(["red"]));
  
  const result = shouldSampleParam("color", "blue", seenParams);
  expect(result).toBe(false);
});

test("shouldSampleParam - same value is kept", () => {
  const seenParams = new Map<string, Set<string>>();
  seenParams.set("color", new Set(["red"]));
  
  const result = shouldSampleParam("color", "red", seenParams);
  expect(result).toBe(true);
});

test("applyParamPolicy - keep policy keeps all params", () => {
  const url = new URL("https://example.com?a=1&b=2&c=3");
  const seenParams = new Map<string, Set<string>>();
  
  const result = applyParamPolicy(url, "keep", [], seenParams);
  
  expect(result.searchParams.get("a")).toBe("1");
  expect(result.searchParams.get("b")).toBe("2");
  expect(result.searchParams.get("c")).toBe("3");
});

test("applyParamPolicy - strip policy removes all params", () => {
  const url = new URL("https://example.com?a=1&b=2");
  const seenParams = new Map<string, Set<string>>();
  
  const result = applyParamPolicy(url, "strip", [], seenParams);
  
  expect(result.search).toBe("");
});

test("applyParamPolicy - sample policy keeps first value only", () => {
  const seenParams = new Map<string, Set<string>>();
  
  // First URL with color=red
  const url1 = new URL("https://example.com?color=red");
  const result1 = applyParamPolicy(url1, "sample", [], seenParams);
  expect(result1.searchParams.get("color")).toBe("red");
  
  // Second URL with color=blue - should be stripped
  const url2 = new URL("https://example.com?color=blue");
  const result2 = applyParamPolicy(url2, "sample", [], seenParams);
  expect(result2.searchParams.has("color")).toBe(false);
});

test("applyParamPolicy - sample policy strips blocked params first", () => {
  const url = new URL("https://example.com?gclid=123&color=red");
  const seenParams = new Map<string, Set<string>>();
  const blockList = ["gclid"];
  
  const result = applyParamPolicy(url, "sample", blockList, seenParams);
  
  expect(result.searchParams.has("gclid")).toBe(false);
  expect(result.searchParams.get("color")).toBe("red");
});

test("applyParamPolicy - keeps same URL normalized", () => {
  const seenParams = new Map<string, Set<string>>();
  
  const url1 = new URL("https://example.com?size=large&color=red");
  const result1 = applyParamPolicy(url1, "sample", [], seenParams);
  
  // Same params, same values
  const url2 = new URL("https://example.com?size=large&color=red");
  const result2 = applyParamPolicy(url2, "sample", [], seenParams);
  
  expect(result2.searchParams.get("size")).toBe("large");
  expect(result2.searchParams.get("color")).toBe("red");
});
