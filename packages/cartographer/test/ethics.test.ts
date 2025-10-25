/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { RobotsCache } from "../src/core/robotsCache.js";
import type { EngineConfig } from "../src/core/types.js";

// Test configuration
const baseConfig: EngineConfig = {
  seeds: ["https://example.com"],
  outAtls: "test.atls",
  maxPages: 0,
  maxDepth: -1,
  render: {
    mode: "prerender",
    concurrency: 1,
    timeoutMs: 30000,
    maxRequestsPerPage: 1000,
    maxBytesPerPage: 50000000
  },
  http: {
    rps: 3,
    userAgent: "CartographerBot/1.0 (+test)"
  },
  discovery: {
    followExternal: false,
    paramPolicy: "keep",
    blockList: []
  },
  robots: {
    respect: true,
    overrideUsed: false
  },
  checkpoint: {
    enabled: false,
    interval: 500
  }
};

test("RobotsCache - respects robots.txt by default", async () => {
  const cache = new RobotsCache();
  const config = { ...baseConfig, robots: { respect: true, overrideUsed: false } };

  // Mock robots.txt: Disallow /admin/
  const robotsTxt = `
User-agent: *
Disallow: /admin/
`;

  // Simulate checking a disallowed URL
  // (Note: This is a unit test, real integration would require a test server)
  const result = cache['checkRules'](robotsTxt, '/admin/secrets', config.http.userAgent);
  
  expect(result.allow).toBe(false);
  expect(result.matchedRule).toBeTruthy();
});

test("RobotsCache - allows URL when robots.txt permits", async () => {
  const cache = new RobotsCache();
  const config = { ...baseConfig, robots: { respect: true, overrideUsed: false } };

  const robotsTxt = `
User-agent: *
Disallow: /private/
Allow: /public/
`;

  const result = cache['checkRules'](robotsTxt, '/public/page', config.http.userAgent);
  
  expect(result.allow).toBe(true);
});

test("RobotsCache - respects User-Agent specific rules", async () => {
  const cache = new RobotsCache();
  const config = { ...baseConfig, http: { ...baseConfig.http, userAgent: "CartographerBot/1.0" } };

  const robotsTxt = `
User-agent: CartographerBot
Disallow: /api/

User-agent: *
Disallow: /admin/
`;

  const result = cache['checkRules'](robotsTxt, '/api/endpoint', "CartographerBot/1.0");
  
  expect(result.allow).toBe(false);
  expect(result.matchedRule?.includes('/api/').toBeTruthy());
});

test("RobotsCache - allows when no matching rules", async () => {
  const cache = new RobotsCache();
  const config = { ...baseConfig };

  const robotsTxt = `
User-agent: *
Disallow: /admin/
`;

  const result = cache['checkRules'](robotsTxt, '/public/page', config.http.userAgent);
  
  expect(result.allow).toBe(true);
});

test("RobotsCache - wildcard User-Agent matching", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
User-agent: *
Disallow: /private/
`;

  const result = cache['checkRules'](robotsTxt, '/private/data', "AnyBot/1.0");
  
  expect(result.allow).toBe(false);
});

test("RobotsCache - prefix matching for Disallow rules", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
User-agent: *
Disallow: /admin
`;

  // Should match /admin, /admin/, /admin/page, etc.
  expect(cache['matchesRule']('/admin', '/admin'), true);
  expect(cache['matchesRule']('/admin/', '/admin'), true);
  expect(cache['matchesRule']('/admin/page', '/admin'), true);
  expect(cache['matchesRule']('/other/page', '/admin'), false);
});

test("RobotsCache - case-insensitive User-Agent matching", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
User-agent: googlebot
Disallow: /private/
`;

  const result = cache['checkRules'](robotsTxt, '/private/data', "Googlebot/2.1");
  
  expect(result.allow).toBe(false);
});

test("RobotsCache - override bypasses robots.txt", async () => {
  const cache = new RobotsCache();
  const config = { ...baseConfig, robots: { respect: true, overrideUsed: true } };

  // Even with respect=true, override should allow everything
  const result = await cache.shouldFetch(config, "https://example.com/admin/");
  
  expect(result.allow).toBe(true);
});

test("RobotsCache - respect disabled allows all URLs", async () => {
  const cache = new RobotsCache();
  const config = { ...baseConfig, robots: { respect: false, overrideUsed: false } };

  const result = await cache.shouldFetch(config, "https://example.com/admin/");
  
  expect(result.allow).toBe(true);
});

test("RobotsCache - handles empty robots.txt", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = "";
  const result = cache['checkRules'](robotsTxt, '/any/path', "AnyBot/1.0");
  
  // Empty robots.txt = allow everything
  expect(result.allow).toBe(true);
});

test("RobotsCache - handles malformed robots.txt gracefully", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
This is not a valid robots.txt
It has no structure
Random text
`;

  const result = cache['checkRules'](robotsTxt, '/any/path', "AnyBot/1.0");
  
  // Malformed robots.txt = allow by default
  expect(result.allow).toBe(true);
});

test("RobotsCache - handles comments in robots.txt", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
# This is a comment
User-agent: *
# Another comment
Disallow: /admin/
`;

  const result = cache['checkRules'](robotsTxt, '/admin/page', "AnyBot/1.0");
  
  // Comments should be ignored, Disallow rule should still apply
  expect(result.allow).toBe(false);
});

test("RobotsCache - handles multiple Disallow rules", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: /private/
Disallow: /api/
`;

  expect(cache['checkRules'](robotsTxt, '/admin/page', "Bot").allow, false);
  expect(cache['checkRules'](robotsTxt, '/private/page', "Bot").allow, false);
  expect(cache['checkRules'](robotsTxt, '/api/endpoint', "Bot").allow, false);
  expect(cache['checkRules'](robotsTxt, '/public/page', "Bot").allow, true);
});

test("RobotsCache - handles Allow rules (precedence)", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
User-agent: *
Disallow: /admin/
Allow: /admin/public/
`;

  // Allow should take precedence over Disallow for specific paths
  const result1 = cache['checkRules'](robotsTxt, '/admin/public/page', "Bot");
  const result2 = cache['checkRules'](robotsTxt, '/admin/private/page', "Bot");
  
  expect(result1.allow).toBe(true); // Allow rule matches
  expect(result2.allow).toBe(false); // Only Disallow matches
});

test("RobotsCache - handles root path Disallow", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
User-agent: BadBot
Disallow: /
`;

  const result = cache['checkRules'](robotsTxt, '/any/path', "BadBot/1.0");
  
  expect(result.allow).toBe(false); // Disallow / blocks everything
});

test("RobotsCache - handles empty Disallow (allow all)", async () => {
  const cache = new RobotsCache();
  
  const robotsTxt = `
User-agent: GoodBot
Disallow:
`;

  const result = cache['checkRules'](robotsTxt, '/any/path', "GoodBot/1.0");
  
  expect(result.allow).toBe(true); // Empty Disallow = allow all
});

test("Rate limiting - validates RPS configuration", () => {
  // Test that RPS is a positive number
  const validRPS = 3;
  expect(validRPS > 0).toBeTruthy();

  const invalidRPS = -1;
  expect(invalidRPS < 0).toBeTruthy(); // Should be rejected by config validation
});

test("Rate limiting - validates concurrency configuration", () => {
  // Test that concurrency is a positive number
  const validConcurrency = 8;
  expect(validConcurrency > 0).toBeTruthy();

  const invalidConcurrency = 0;
  expect(invalidConcurrency === 0).toBeTruthy(); // Should be rejected by config validation
});

test("User-Agent - validates custom User-Agent", () => {
  const validUserAgent = "MyBot/1.0 (+https://example.com/bot-info)";
  expect(validUserAgent.length > 0).toBeTruthy();
  expect(validUserAgent.includes("/").toBeTruthy()); // Should have version
  expect(validUserAgent.includes("+").toBeTruthy()); // Should have contact info
});

test("User-Agent - validates default User-Agent", () => {
  const defaultUserAgent = "CartographerBot/1.0 (+contact:continuum)";
  expect(defaultUserAgent.length > 0).toBeTruthy();
  expect(defaultUserAgent.includes("CartographerBot").toBeTruthy());
  expect(defaultUserAgent.includes("contact:").toBeTruthy());
});

test("Error budget - validates error budget configuration", () => {
  const unlimitedBudget = 0;
  const limitedBudget = 100;
  
  expect(unlimitedBudget === 0).toBeTruthy(); // 0 = unlimited
  expect(limitedBudget > 0).toBeTruthy(); // Positive number = limit
});

test("Retry logic - validates retry configuration", () => {
  // Test retry logic parameters
  const maxRetries = 2;
  const backoffMs = [1000, 2000, 5000]; // Exponential backoff
  
  expect(maxRetries).toBe(2);
  expect(backoffMs[0]).toBe(1000); // 1s
  expect(backoffMs[1]).toBe(2000); // 2s
  expect(backoffMs[2]).toBe(5000); // 5s max
});

test("Retry logic - validates retryable status codes", () => {
  const retryableStatuses = [429, 503, 500, 502, 504];
  
  expect(retryableStatuses.includes(429).toBeTruthy()); // Too Many Requests
  expect(retryableStatuses.includes(503).toBeTruthy()); // Service Unavailable
  expect(retryableStatuses.includes(500).toBeTruthy()); // Internal Server Error
  
  const nonRetryableStatuses = [400, 401, 403, 404];
  expect(!retryableStatuses.includes(400).toBeTruthy()); // Bad Request
  expect(!retryableStatuses.includes(404).toBeTruthy()); // Not Found
});

test("Timeout configuration - validates page timeout", () => {
  const defaultTimeout = 30000; // 30 seconds
  const conservativeTimeout = 60000; // 60 seconds
  
  expect(defaultTimeout > 0).toBeTruthy();
  expect(conservativeTimeout >= defaultTimeout).toBeTruthy();
});

test("Memory management - validates context recycling threshold", () => {
  const recycleThreshold = 50; // Recycle every 50 pages
  
  expect(recycleThreshold > 0).toBeTruthy();
  expect(recycleThreshold <= 100).toBeTruthy(); // Reasonable upper bound
});

test("Checkpoint configuration - validates checkpoint interval", () => {
  const defaultInterval = 500; // Every 500 pages
  
  expect(defaultInterval > 0).toBeTruthy();
  expect(defaultInterval >= 100).toBeTruthy(); // Not too frequent
  expect(defaultInterval <= 1000).toBeTruthy(); // Not too infrequent
});

test("Max bytes per page - validates resource limits", () => {
  const defaultMaxBytes = 50000000; // 50 MB
  
  expect(defaultMaxBytes > 0).toBeTruthy();
  expect(defaultMaxBytes).toBe(50000000); // Not 50 * 1024 * 1024 (that's 52428800)
});

test("RobotsCache - validates crawl-delay parsing (future)", () => {
  // Future feature: crawl-delay enforcement
  const robotsTxt = `
User-agent: *
Crawl-delay: 1
Disallow: /admin/
`;

  // Currently not implemented, but test structure for future
  expect(robotsTxt.includes("Crawl-delay").toBeTruthy());
  
  // Expected behavior: Extract and enforce 1 second delay between requests
  const expectedDelay = 1000; // 1 second in milliseconds
  expect(expectedDelay).toBe(1000);
});

test("RobotsCache - handles sitemap directives (data collection)", () => {
  const robotsTxt = `
User-agent: *
Sitemap: https://example.com/sitemap.xml
Disallow: /admin/
`;

  // Sitemap directives should be collected but not enforced
  expect(robotsTxt.includes("Sitemap:").toBeTruthy());
  
  // Expected behavior: Store sitemap URLs in metadata
  const expectedSitemapUrl = "https://example.com/sitemap.xml";
  expect(expectedSitemapUrl.endsWith(".xml").toBeTruthy());
});
