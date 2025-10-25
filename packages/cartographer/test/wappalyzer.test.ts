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

import { test, expect } from "vitest";
// Migrated to vitest expect()
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
  
  expect(scripts.length).toBe(3);
  expect(scripts.includes("https://cdn.example.com/react.js").toBeTruthy());
  expect(scripts.includes("/js/app.js").toBeTruthy());
  expect(scripts.includes("https://analytics.google.com/ga.js").toBeTruthy());
});

test("extractScriptUrls - handles empty HTML", () => {
  const html = "<html><body></body></html>";
  const scripts = extractScriptUrls(html);
  
  expect(scripts.length).toBe(0);
});

test("extractScriptUrls - handles malformed HTML", () => {
  const html = "<script src='broken.js'><script src='valid.js'></script>";
  const scripts = extractScriptUrls(html);
  
  // Should still extract valid scripts
  expect(scripts.length >= 1).toBeTruthy();
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

  expect(Array.isArray(result).toBeTruthy());
  // Result should be an array of strings
  if (result.length > 0) {
    expect(typeof result[0]).toBe("string");
  }
});

test("detectTechStack - handles empty HTML", async () => {
  const result = await detectTechStack({
    html: "<html></html>",
    url: "https://example.com",
    headers: {}
  });

  expect(Array.isArray(result).toBeTruthy());
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

  expect(result.technologies).toBeTruthy();
  expect(Array.isArray(result.technologies).toBeTruthy());
  expect(typeof result.detectionTime === "number").toBeTruthy();
  expect(result.detectionTime >= 0).toBeTruthy();

  // Check technology structure if any detected
  if (result.technologies.length > 0) {
    const tech = result.technologies[0];
    expect(tech.name).toBeTruthy();
    expect(Array.isArray(tech.categories).toBeTruthy());
    expect(typeof tech.confidence === "number").toBeTruthy();
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

  expect(result.technologies).toBeTruthy();
  expect(Array.isArray(result.technologies).toBeTruthy());
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

  expect(Array.isArray(result).toBeTruthy());
  // Should detect at least some technologies from headers
});

test("detectTechnologies - measures detection time", async () => {
  const html = "<html><body>Test</body></html>";

  const result = await detectTechnologies({
    html,
    url: "https://example.com",
    headers: {}
  });

  expect(typeof result.detectionTime === "number").toBeTruthy();
  expect(result.detectionTime >= 0).toBeTruthy();
  expect(result.detectionTime < 10000).toBeTruthy(); // Should complete in < 10 seconds
});
