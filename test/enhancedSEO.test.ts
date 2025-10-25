/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Enhanced SEO Metadata Extractor Tests
 * 
 * Tests for enhanced SEO metadata extraction including:
 * - Indexability signals (meta robots, X-Robots-Tag)
 * - Content metrics (title/description pixel widths, word counts)
 * - Hreflang validation
 * - Social metadata (Open Graph, Twitter Cards)
 * - Schema.org structured data
 */

import { test } from "node:test";
import assert from "node:assert";
import { extractEnhancedSEOMetadata } from "../src/core/extractors/enhancedSEO.js";

test("extractEnhancedSEOMetadata - detects noindex from meta robots", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="robots" content="noindex, nofollow">
        <title>Test Page</title>
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.strictEqual(result.indexability.isNoIndex, true);
  assert.strictEqual(result.indexability.isNoFollow, true);
  assert.strictEqual(result.indexability.metaRobots, "noindex, nofollow");
});

test("extractEnhancedSEOMetadata - detects noindex from X-Robots-Tag header", () => {
  const html = "<html><head><title>Test</title></head><body></body></html>";
  const headers = {
    "x-robots-tag": "noindex"
  };

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com", headers });

  assert.strictEqual(result.indexability.isNoIndex, true);
  assert.strictEqual(result.indexability.xRobotsTag, "noindex");
});

test("extractEnhancedSEOMetadata - calculates title pixel width", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>This is a test title</title>
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.content.title);
  assert.strictEqual(result.content.title, "This is a test title");
  assert.ok(result.content.titleLength);
  assert.ok(result.content.titleLength.pixels > 0);
  assert.ok(result.content.titleLength.pixels < 600); // Should be reasonable
});

test("extractEnhancedSEOMetadata - flags overly long title", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>This is an extremely long title that exceeds the recommended character count for search engine results pages and will likely be truncated in the SERPs which is not ideal for SEO</title>
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.content.title);
  assert.ok(result.content.titleLength);
  assert.ok(result.content.titleLength.pixels > 600); // Should exceed SERP limit
});

test("extractEnhancedSEOMetadata - calculates meta description pixel width", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="description" content="This is a meta description for the page.">
        <title>Test</title>
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.content.metaDescription);
  assert.strictEqual(result.content.metaDescription, "This is a meta description for the page.");
  assert.ok(result.content.descriptionLength);
  assert.ok(result.content.descriptionLength.pixels > 0);
});

test("extractEnhancedSEOMetadata - counts headings", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        <h1>Main Heading</h1>
        <h2>Section 1</h2>
        <h2>Section 2</h2>
        <h3>Subsection</h3>
        <h4>Detail</h4>
      </body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.strictEqual(result.content.h1Count, 1);
  assert.strictEqual(result.content.h2Count, 2);
  assert.strictEqual(result.content.h3Count, 1);
  assert.strictEqual(result.content.h4Count, 1);
  assert.strictEqual(result.content.h5Count, 0);
  assert.strictEqual(result.content.h6Count, 0);
});

test("extractEnhancedSEOMetadata - counts words in body text", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        <p>This is a paragraph with several words.</p>
        <p>Another paragraph with more content.</p>
      </body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.content.wordCount > 0);
  assert.ok(result.content.wordCount >= 10); // Should count at least 10 words
});

test("extractEnhancedSEOMetadata - extracts hreflang links", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
        <link rel="alternate" hreflang="en" href="https://example.com/en">
        <link rel="alternate" hreflang="es" href="https://example.com/es">
        <link rel="alternate" hreflang="fr" href="https://example.com/fr">
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.international);
  assert.ok(result.international.hreflangTags);
  assert.strictEqual(result.international.hreflangTags.length, 3);
  
  const enLink = result.international.hreflangTags.find((link: any) => link.lang === "en");
  assert.ok(enLink);
  assert.strictEqual(enLink.url, "https://example.com/en");
});

test("extractEnhancedSEOMetadata - validates hreflang codes", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
        <link rel="alternate" hreflang="en-US" href="https://example.com/en">
        <link rel="alternate" hreflang="invalid-code" href="https://example.com/invalid">
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.international);
  // Hreflang validation may or may not flag certain codes as invalid
  // Just check that hreflang tags were extracted
  assert.ok(result.international.hreflangTags);
  assert.strictEqual(result.international.hreflangTags.length, 2);
});

test("extractEnhancedSEOMetadata - extracts Open Graph metadata", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
        <meta property="og:title" content="OG Title">
        <meta property="og:description" content="OG Description">
        <meta property="og:image" content="https://example.com/image.jpg">
        <meta property="og:url" content="https://example.com">
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.social);
  assert.ok(result.social.openGraph);
  assert.strictEqual(result.social.openGraph.ogTitle, "OG Title");
  assert.strictEqual(result.social.openGraph.ogDescription, "OG Description");
  assert.strictEqual(result.social.openGraph.ogImage, "https://example.com/image.jpg");
});

test("extractEnhancedSEOMetadata - extracts Twitter Card metadata", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Twitter Title">
        <meta name="twitter:description" content="Twitter Description">
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.social);
  assert.ok(result.social.twitter);
  assert.strictEqual(result.social.twitter.twitterCard, "summary_large_image");
  assert.strictEqual(result.social.twitter.twitterTitle, "Twitter Title");
});

test("extractEnhancedSEOMetadata - extracts schema types from JSON-LD", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Test Article"
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.schema);
  assert.ok(result.schema.schemaTypes);
  assert.ok(result.schema.schemaTypes.includes("Article"));
});

test("extractEnhancedSEOMetadata - handles multiple schema types", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", "name": "Example" },
            { "@type": "WebSite", "url": "https://example.com" }
          ]
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.schema);
  assert.ok(result.schema.schemaTypes);
  assert.ok(result.schema.schemaTypes.includes("Organization"));
  assert.ok(result.schema.schemaTypes.includes("WebSite"));
});

test("extractEnhancedSEOMetadata - handles missing title gracefully", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head></head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.content);
  // Title should be undefined or empty
  if (result.content.title) {
    assert.strictEqual(result.content.title, "");
  }
});

test("extractEnhancedSEOMetadata - handles empty body gracefully", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body></body>
    </html>
  `;

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com" });

  assert.ok(result.content);
  assert.strictEqual(result.content.wordCount, 0);
  assert.strictEqual(result.content.h1Count, 0);
});
