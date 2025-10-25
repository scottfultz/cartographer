/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { extractLinks } from "../src/core/extractors/links.js";
import { extractAssets } from "../src/core/extractors/assets.js";
import { extractPageFacts } from "../src/core/extractors/pageFacts.js";
import { extractTextSample } from "../src/core/extractors/textSample.js";
import { baseTestConfig } from './helpers/testConfig.js';

test("extractLinks - raw mode uses location: unknown", () => {
  const html = `
    <html>
      <body>
        <nav><a href="/page1">Nav Link</a></nav>
        <a href="/page2">Body Link</a>
        <a href="https://external.com">External</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    ...baseTestConfig,
    domSource: "raw",
    html,
    baseUrl: "https://caifrazier.com",
    discoveredInMode: "raw"
  });

  expect(edges.length, 3);
  
  // All raw mode links should have location: unknown
  for (const edge of edges) {
    expect(edge.location).toBe("unknown");
  }
});

test("extractLinks - playwright mode detects location", () => {
  const html = `
    <html>
      <body>
        <nav><a href="/nav-page">Nav Link</a></nav>
        <header><a href="/header-page">Header Link</a></header>
        <main><a href="/main-page">Main Link</a></main>
        <footer><a href="/footer-page">Footer Link</a></footer>
        <a href="/other-page">Other Link</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    ...baseTestConfig,
    domSource: "playwright",
    html,
    baseUrl: "https://caifrazier.com",
    discoveredInMode: "prerender"
  });

  const navLink = edges.find(e => e.targetUrl.includes("/nav-page"));
  const headerLink = edges.find(e => e.targetUrl.includes("/header-page"));
  const mainLink = edges.find(e => e.targetUrl.includes("/main-page"));
  const footerLink = edges.find(e => e.targetUrl.includes("/footer-page"));
  const otherLink = edges.find(e => e.targetUrl.includes("/other-page"));

  expect(navLink?.location).toBe("nav");
  expect(headerLink?.location).toBe("header");
  expect(mainLink?.location).toBe("main");
  expect(footerLink?.location).toBe("footer");
  expect(otherLink?.location).toBe("other");
});

test("extractLinks - separates internal and external", () => {
  const html = `
    <html>
      <body>
        <a href="/internal1">Internal 1</a>
  <a href="https://caifrazier.com/internal2">Internal 2</a>
        <a href="https://external.com">External</a>
      </body>
    </html>
  `;

  const edges = extractLinks({
    domSource: "raw",
    html,
  baseUrl: "https://caifrazier.com",
    discoveredInMode: "raw"
  });

  const internalEdges = edges.filter(e => !e.isExternal);
  const externalEdges = edges.filter(e => e.isExternal);

  expect(internalEdges.length).toBe(2);
  expect(externalEdges.length, 1);
  expect(externalEdges[0].targetUrl.startsWith("https://external.com").toBeTruthy());
});

test("extractAssets - enforces 1000 cap", () => {
  // Create HTML with 1500 images
  let html = "<html><body>";
  for (let i = 0; i < 1500; i++) {
    html += `<img src="/image${i}.jpg" alt="Image ${i}">`;
  }
  html += "</body></html>";

  const result = extractAssets({
    domSource: "raw",
    html,
  baseUrl: "https://caifrazier.com"
  });

  expect(result.assets.length).toBe(1000);
  expect(result.truncated, true);
});

test("extractAssets - no truncation under cap", () => {
  const html = `
    <html>
      <body>
        <img src="/img1.jpg" alt="Image 1">
        <img src="/img2.jpg" alt="Image 2">
        <video src="/video.mp4"></video>
      </body>
    </html>
  `;

  const result = extractAssets({
    domSource: "raw",
    html,
  baseUrl: "https://caifrazier.com"
  });

  expect(result.assets.length).toBe(3);
  expect(result.truncated, false);
});

test("extractPageFacts - extracts metadata", () => {
  const html = `
    <html>
      <head>
        <title>Test Page</title>
        <meta name="description" content="Test description">
        <link rel="canonical" href="/canonical">
        <meta name="robots" content="index, follow">
        <link rel="alternate" hreflang="es" href="/es">
      </head>
      <body>
        <h1>Main Heading</h1>
        <h2>Sub Heading</h2>
        <a href="/link1">Link 1</a>
        <img src="/img1.jpg" alt="Image">
      </body>
    </html>
  `;

  const facts = extractPageFacts({
    domSource: "raw",
    html,
    fetchHeaders: {},
  baseUrl: "https://caifrazier.com"
  });

  expect(facts.title).toBe("Test Page");
  expect(facts.metaDescription).toBe("Test description");
  expect(facts.h1).toBe("Main Heading");
  expect(facts.canonicalHref).toBe("/canonical");
  expect(facts.canonicalResolved).toBe("https://caifrazier.com/canonical");
  expect(facts.robotsMeta).toBe("index, follow");
  expect(facts.linksOutCount).toBe(1);
  expect(facts.mediaCount).toBe(1);
  expect(facts.hreflang.length).toBe(1);
  expect(facts.hreflang[0].lang).toBe("es");
});

test("extractTextSample - collapses whitespace and truncates", () => {
  const html = `
    <html>
      <body>
        <p>This   has     multiple     spaces</p>
        <p>And
        newlines
        everywhere</p>
      </body>
    </html>
  `;

  const sample = extractTextSample({
    domSource: "raw",
    html
  });

  // Should collapse all whitespace to single spaces
  expect(!sample.includes("  ")).toBeTruthy();
  expect(!sample.includes("\n")).toBeTruthy();
  
  // Should be trimmed
  expect(sample, sample.trim());
});

test("extractTextSample - enforces 1500 byte limit", () => {
  // Create text > 1500 bytes
  const longText = "a".repeat(2000);
  const html = `<html><body>${longText}</body></html>`;

  const sample = extractTextSample({
    domSource: "raw",
    html
  });

  const byteLength = Buffer.from(sample, "utf-8").length;
  expect(byteLength <= 1500, `Should be <= 1500 bytes, got ${byteLength}`).toBeTruthy();
});
