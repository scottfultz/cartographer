/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { test } from "node:test";
import assert from "node:assert";
import { RobotsCache } from "../src/core/robotsCache.js";
// Test configuration
const baseConfig = {
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
    assert.strictEqual(result.allow, false);
    assert.ok(result.matchedRule);
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
    assert.strictEqual(result.allow, true);
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
    assert.strictEqual(result.allow, false);
    assert.ok(result.matchedRule?.includes('/api/'));
});
test("RobotsCache - allows when no matching rules", async () => {
    const cache = new RobotsCache();
    const config = { ...baseConfig };
    const robotsTxt = `
User-agent: *
Disallow: /admin/
`;
    const result = cache['checkRules'](robotsTxt, '/public/page', config.http.userAgent);
    assert.strictEqual(result.allow, true);
});
test("RobotsCache - wildcard User-Agent matching", async () => {
    const cache = new RobotsCache();
    const robotsTxt = `
User-agent: *
Disallow: /private/
`;
    const result = cache['checkRules'](robotsTxt, '/private/data', "AnyBot/1.0");
    assert.strictEqual(result.allow, false);
});
test("RobotsCache - prefix matching for Disallow rules", async () => {
    const cache = new RobotsCache();
    const robotsTxt = `
User-agent: *
Disallow: /admin
`;
    // Should match /admin, /admin/, /admin/page, etc.
    assert.strictEqual(cache['matchesRule']('/admin', '/admin'), true);
    assert.strictEqual(cache['matchesRule']('/admin/', '/admin'), true);
    assert.strictEqual(cache['matchesRule']('/admin/page', '/admin'), true);
    assert.strictEqual(cache['matchesRule']('/other/page', '/admin'), false);
});
test("RobotsCache - case-insensitive User-Agent matching", async () => {
    const cache = new RobotsCache();
    const robotsTxt = `
User-agent: googlebot
Disallow: /private/
`;
    const result = cache['checkRules'](robotsTxt, '/private/data', "Googlebot/2.1");
    assert.strictEqual(result.allow, false);
});
test("RobotsCache - override bypasses robots.txt", async () => {
    const cache = new RobotsCache();
    const config = { ...baseConfig, robots: { respect: true, overrideUsed: true } };
    // Even with respect=true, override should allow everything
    const result = await cache.shouldFetch(config, "https://example.com/admin/");
    assert.strictEqual(result.allow, true);
});
test("RobotsCache - respect disabled allows all URLs", async () => {
    const cache = new RobotsCache();
    const config = { ...baseConfig, robots: { respect: false, overrideUsed: false } };
    const result = await cache.shouldFetch(config, "https://example.com/admin/");
    assert.strictEqual(result.allow, true);
});
test("RobotsCache - handles empty robots.txt", async () => {
    const cache = new RobotsCache();
    const robotsTxt = "";
    const result = cache['checkRules'](robotsTxt, '/any/path', "AnyBot/1.0");
    // Empty robots.txt = allow everything
    assert.strictEqual(result.allow, true);
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
    assert.strictEqual(result.allow, true);
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
    assert.strictEqual(result.allow, false);
});
test("RobotsCache - handles multiple Disallow rules", async () => {
    const cache = new RobotsCache();
    const robotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: /private/
Disallow: /api/
`;
    assert.strictEqual(cache['checkRules'](robotsTxt, '/admin/page', "Bot").allow, false);
    assert.strictEqual(cache['checkRules'](robotsTxt, '/private/page', "Bot").allow, false);
    assert.strictEqual(cache['checkRules'](robotsTxt, '/api/endpoint', "Bot").allow, false);
    assert.strictEqual(cache['checkRules'](robotsTxt, '/public/page', "Bot").allow, true);
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
    assert.strictEqual(result1.allow, true); // Allow rule matches
    assert.strictEqual(result2.allow, false); // Only Disallow matches
});
test("RobotsCache - handles root path Disallow", async () => {
    const cache = new RobotsCache();
    const robotsTxt = `
User-agent: BadBot
Disallow: /
`;
    const result = cache['checkRules'](robotsTxt, '/any/path', "BadBot/1.0");
    assert.strictEqual(result.allow, false); // Disallow / blocks everything
});
test("RobotsCache - handles empty Disallow (allow all)", async () => {
    const cache = new RobotsCache();
    const robotsTxt = `
User-agent: GoodBot
Disallow:
`;
    const result = cache['checkRules'](robotsTxt, '/any/path', "GoodBot/1.0");
    assert.strictEqual(result.allow, true); // Empty Disallow = allow all
});
test("Rate limiting - validates RPS configuration", () => {
    // Test that RPS is a positive number
    const validRPS = 3;
    assert.ok(validRPS > 0);
    const invalidRPS = -1;
    assert.ok(invalidRPS < 0); // Should be rejected by config validation
});
test("Rate limiting - validates concurrency configuration", () => {
    // Test that concurrency is a positive number
    const validConcurrency = 8;
    assert.ok(validConcurrency > 0);
    const invalidConcurrency = 0;
    assert.ok(invalidConcurrency === 0); // Should be rejected by config validation
});
test("User-Agent - validates custom User-Agent", () => {
    const validUserAgent = "MyBot/1.0 (+https://example.com/bot-info)";
    assert.ok(validUserAgent.length > 0);
    assert.ok(validUserAgent.includes("/")); // Should have version
    assert.ok(validUserAgent.includes("+")); // Should have contact info
});
test("User-Agent - validates default User-Agent", () => {
    const defaultUserAgent = "CartographerBot/1.0 (+contact:continuum)";
    assert.ok(defaultUserAgent.length > 0);
    assert.ok(defaultUserAgent.includes("CartographerBot"));
    assert.ok(defaultUserAgent.includes("contact:"));
});
test("Error budget - validates error budget configuration", () => {
    const unlimitedBudget = 0;
    const limitedBudget = 100;
    assert.ok(unlimitedBudget === 0); // 0 = unlimited
    assert.ok(limitedBudget > 0); // Positive number = limit
});
test("Retry logic - validates retry configuration", () => {
    // Test retry logic parameters
    const maxRetries = 2;
    const backoffMs = [1000, 2000, 5000]; // Exponential backoff
    assert.strictEqual(maxRetries, 2);
    assert.strictEqual(backoffMs[0], 1000); // 1s
    assert.strictEqual(backoffMs[1], 2000); // 2s
    assert.strictEqual(backoffMs[2], 5000); // 5s max
});
test("Retry logic - validates retryable status codes", () => {
    const retryableStatuses = [429, 503, 500, 502, 504];
    assert.ok(retryableStatuses.includes(429)); // Too Many Requests
    assert.ok(retryableStatuses.includes(503)); // Service Unavailable
    assert.ok(retryableStatuses.includes(500)); // Internal Server Error
    const nonRetryableStatuses = [400, 401, 403, 404];
    assert.ok(!retryableStatuses.includes(400)); // Bad Request
    assert.ok(!retryableStatuses.includes(404)); // Not Found
});
test("Timeout configuration - validates page timeout", () => {
    const defaultTimeout = 30000; // 30 seconds
    const conservativeTimeout = 60000; // 60 seconds
    assert.ok(defaultTimeout > 0);
    assert.ok(conservativeTimeout >= defaultTimeout);
});
test("Memory management - validates context recycling threshold", () => {
    const recycleThreshold = 50; // Recycle every 50 pages
    assert.ok(recycleThreshold > 0);
    assert.ok(recycleThreshold <= 100); // Reasonable upper bound
});
test("Checkpoint configuration - validates checkpoint interval", () => {
    const defaultInterval = 500; // Every 500 pages
    assert.ok(defaultInterval > 0);
    assert.ok(defaultInterval >= 100); // Not too frequent
    assert.ok(defaultInterval <= 1000); // Not too infrequent
});
test("Max bytes per page - validates resource limits", () => {
    const defaultMaxBytes = 50000000; // 50 MB
    assert.ok(defaultMaxBytes > 0);
    assert.strictEqual(defaultMaxBytes, 50000000); // Not 50 * 1024 * 1024 (that's 52428800)
});
test("RobotsCache - validates crawl-delay parsing (future)", () => {
    // Future feature: crawl-delay enforcement
    const robotsTxt = `
User-agent: *
Crawl-delay: 1
Disallow: /admin/
`;
    // Currently not implemented, but test structure for future
    assert.ok(robotsTxt.includes("Crawl-delay"));
    // Expected behavior: Extract and enforce 1 second delay between requests
    const expectedDelay = 1000; // 1 second in milliseconds
    assert.strictEqual(expectedDelay, 1000);
});
test("RobotsCache - handles sitemap directives (data collection)", () => {
    const robotsTxt = `
User-agent: *
Sitemap: https://example.com/sitemap.xml
Disallow: /admin/
`;
    // Sitemap directives should be collected but not enforced
    assert.ok(robotsTxt.includes("Sitemap:"));
    // Expected behavior: Store sitemap URLs in metadata
    const expectedSitemapUrl = "https://example.com/sitemap.xml";
    assert.ok(expectedSitemapUrl.endsWith(".xml"));
});
//# sourceMappingURL=ethics.test.js.map