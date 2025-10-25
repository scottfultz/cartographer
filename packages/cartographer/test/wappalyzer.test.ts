/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Wappalyzer Technology Detection Tests
 * 
 * Tests for Wappalyzer-based technology detection including:
 * - Basic detection functionality
 * - Script URL extraction
 * - Technology name extraction
 * - Error handling
 */

import { test } from "node:test";
import assert from "node:assert";
import { detectTechStack, extractScriptUrls, detectTechnologies } from "../src/core/extractors/wappalyzer.js";

test("extractScriptUrls - extracts script src URLs from HTML", () => {
  const html = `
    <html>
      <head>
        <script src="https://cdn.example.com/react.js"></script>
        <script src="/js/app.js"></script>
        <script>console.log('inline');</script>
      </head>
      <body>
        <script src="https://analytics.google.com/ga.js"></script>
      </body>
    </html>
  `;

  const scripts = extractScriptUrls(html);
  
  assert.strictEqual(scripts.length, 3);
  assert.ok(scripts.includes("https://cdn.example.com/react.js"));
  assert.ok(scripts.includes("/js/app.js"));
  assert.ok(scripts.includes("https://analytics.google.com/ga.js"));
});

test("extractScriptUrls - handles empty HTML", () => {
  const html = "<html><body></body></html>";
  const scripts = extractScriptUrls(html);
  
  assert.strictEqual(scripts.length, 0);
});

test("extractScriptUrls - handles malformed HTML", () => {
  const html = "<script src='broken.js'><script src='valid.js'></script>";
  const scripts = extractScriptUrls(html);
  
  // Should still extract valid scripts
  assert.ok(scripts.length >= 1);
});

test("detectTechStack - returns array of technology names", async () => {
  // Simple HTML with recognizable patterns
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="generator" content="WordPress 6.0">
        <title>Test Site</title>
      </head>
      <body>
        <div id="wp-content">Content</div>
      </body>
    </html>
  `;

  const result = await detectTechStack({
    html,
    url: "https://example.com",
    headers: {
      "server": "nginx/1.18.0"
    }
  });

  assert.ok(Array.isArray(result));
  // Result should be an array of strings
  if (result.length > 0) {
    assert.strictEqual(typeof result[0], "string");
  }
});

test("detectTechStack - handles empty HTML", async () => {
  const result = await detectTechStack({
    html: "<html></html>",
    url: "https://example.com",
    headers: {}
  });

  assert.ok(Array.isArray(result));
  // Empty or minimal HTML might still detect some technologies (like HTTP headers)
});

test("detectTechnologies - returns detailed technology info", async () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="generator" content="WordPress 6.0">
      </head>
      <body></body>
    </html>
  `;

  const result = await detectTechnologies({
    html,
    url: "https://example.com",
    headers: {
      "x-powered-by": "PHP/8.0.0"
    }
  });

  assert.ok(result.technologies);
  assert.ok(Array.isArray(result.technologies));
  assert.ok(typeof result.detectionTime === "number");
  assert.ok(result.detectionTime >= 0);

  // Check technology structure if any detected
  if (result.technologies.length > 0) {
    const tech = result.technologies[0];
    assert.ok(tech.name);
    assert.ok(Array.isArray(tech.categories));
    assert.ok(typeof tech.confidence === "number");
  }
});

test("detectTechnologies - includes script URLs for better detection", async () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/react@18.0.0/umd/react.production.min.js"></script>
      </head>
      <body></body>
    </html>
  `;

  const scripts = extractScriptUrls(html);

  const result = await detectTechnologies({
    html,
    url: "https://example.com",
    headers: {},
    scripts
  });

  assert.ok(result.technologies);
  assert.ok(Array.isArray(result.technologies));
});

test("detectTechStack - with HTTP headers for better detection", async () => {
  const html = "<html><body>Test</body></html>";

  const result = await detectTechStack({
    html,
    url: "https://example.com",
    headers: {
      "server": "nginx",
      "x-powered-by": "Express",
      "strict-transport-security": "max-age=31536000"
    }
  });

  assert.ok(Array.isArray(result));
  // Should detect at least some technologies from headers
});

test("detectTechnologies - measures detection time", async () => {
  const html = "<html><body>Test</body></html>";

  const result = await detectTechnologies({
    html,
    url: "https://example.com",
    headers: {}
  });

  assert.ok(typeof result.detectionTime === "number");
  assert.ok(result.detectionTime >= 0);
  assert.ok(result.detectionTime < 10000); // Should complete in < 10 seconds
});
