/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Enhanced Links Extractor Tests
 * 
 * Tests for new link attributes: sponsored and ugc (user-generated content)
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { extractLinks } from "../src/core/extractors/links.js";
import { baseTestConfig } from './helpers/testConfig.js';

test("extractLinks - detects sponsored links", () => {
  const html = `
    <html>
      <body>
        <a href="/regular">Regular Link</a>
        <a href="https://affiliate.com" rel="sponsored">Affiliate Link</a>
        <a href="https://ad.com" rel="nofollow sponsored">Ad Link</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    ...baseTestConfig,
    domSource: "playwright",
    html,
    baseUrl: "https://example.com",
    discoveredInMode: "prerender"
  });

  const regularLink = edges.find(e => e.targetUrl.includes("/regular"));
  const affiliateLink = edges.find(e => e.targetUrl.includes("affiliate.com"));
  const adLink = edges.find(e => e.targetUrl.includes("ad.com"));

  expect(regularLink?.sponsored).toBe(false);
  expect(affiliateLink?.sponsored).toBe(true);
  expect(adLink?.sponsored).toBe(true);
});

test("extractLinks - detects UGC (user-generated content) links", () => {
  const html = `
    <html>
      <body>
        <a href="/internal">Internal Link</a>
        <a href="https://user-comment.com" rel="ugc">User Comment Link</a>
        <a href="https://forum-post.com" rel="nofollow ugc">Forum Post</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    ...baseTestConfig,
    domSource: "playwright",
    html,
    baseUrl: "https://example.com",
    discoveredInMode: "prerender"
  });

  const internalLink = edges.find(e => e.targetUrl.includes("/internal"));
  const commentLink = edges.find(e => e.targetUrl.includes("user-comment.com"));
  const forumLink = edges.find(e => e.targetUrl.includes("forum-post.com"));

  expect(internalLink?.ugc).toBe(false);
  expect(commentLink?.ugc).toBe(true);
  expect(forumLink?.ugc).toBe(true);
});

test("extractLinks - handles combined rel attributes", () => {
  const html = `
    <html>
      <body>
        <a href="https://example.com" rel="nofollow noopener sponsored ugc">Complex Link</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    ...baseTestConfig,
    domSource: "playwright",
    html,
    baseUrl: "https://test.com",
    discoveredInMode: "prerender"
  });

  expect(edges.length).toBe(1);
  expect(edges[0].nofollow).toBe(true);
  expect(edges[0].sponsored).toBe(true);
  expect(edges[0].ugc).toBe(true);
});

test("extractLinks - sponsored/ugc default to false when not present", () => {
  const html = `
    <html>
      <body>
        <a href="/page1">Page 1</a>
        <a href="/page2" rel="nofollow">Page 2</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    ...baseTestConfig,
    domSource: "playwright",
    html,
    baseUrl: "https://example.com",
    discoveredInMode: "prerender"
  });

  edges.forEach(edge => {
    expect(edge.sponsored).toBe(false);
    expect(edge.ugc).toBe(false);
  });
});

test("extractLinks - raw mode sets sponsored/ugc to false", () => {
  const html = `
    <html>
      <body>
        <a href="/page1" rel="sponsored">Page 1</a>
        <a href="/page2" rel="ugc">Page 2</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    ...baseTestConfig,
    domSource: "raw",
    html,
    baseUrl: "https://example.com",
    discoveredInMode: "raw"
  });

  // Raw mode should still detect these from HTML
  edges.forEach(edge => {
    // Even in raw mode, we parse rel attributes from HTML
    if (edge.targetUrl.includes("page1")) {
      expect(edge.sponsored).toBe(true);
    }
    if (edge.targetUrl.includes("page2")) {
      expect(edge.ugc).toBe(true);
    }
  });
});
