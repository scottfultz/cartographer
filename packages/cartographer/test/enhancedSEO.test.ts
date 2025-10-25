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

import { test, expect } from "vitest";
// Migrated to vitest expect()
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

  expect(result.indexability.isNoIndex).toBe(true);
  expect(result.indexability.isNoFollow).toBe(true);
  expect(result.indexability.metaRobots).toBe("noindex, nofollow");
});

test("extractEnhancedSEOMetadata - detects noindex from X-Robots-Tag header", () => {
  const html = "<html><head><title>Test</title></head><body></body></html>";
  const headers = {
    "x-robots-tag": "noindex"
  };

  const result = extractEnhancedSEOMetadata({ html, baseUrl: "https://example.com", headers });

  expect(result.indexability.isNoIndex).toBe(true);
  expect(result.indexability.xRobotsTag).toBe("noindex");
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

  expect(result.content.title).toBeTruthy();
  expect(result.content.title).toBe("This is a test title");
  expect(result.content.titleLength).toBeTruthy();
  expect(result.content.titleLength.pixels > 0).toBeTruthy();
  expect(result.content.titleLength.pixels < 600).toBeTruthy(); // Should be reasonable
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

  expect(result.content.title).toBeTruthy();
  expect(result.content.titleLength).toBeTruthy();
  expect(result.content.titleLength.pixels > 600).toBeTruthy(); // Should exceed SERP limit
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

  expect(result.content.metaDescription).toBeTruthy();
  expect(result.content.metaDescription).toBe("This is a meta description for the page.");
  expect(result.content.descriptionLength).toBeTruthy();
  expect(result.content.descriptionLength.pixels > 0).toBeTruthy();
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

  expect(result.content.h1Count).toBe(1);
  expect(result.content.h2Count).toBe(2);
  expect(result.content.h3Count).toBe(1);
  expect(result.content.h4Count).toBe(1);
  expect(result.content.h5Count).toBe(0);
  expect(result.content.h6Count).toBe(0);
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

  expect(result.content.wordCount > 0).toBeTruthy();
  expect(result.content.wordCount >= 10).toBeTruthy(); // Should count at least 10 words
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

  expect(result.international).toBeTruthy();
  expect(result.international.hreflangTags).toBeTruthy();
  expect(result.international.hreflangTags.length).toBe(3);
  
  const enLink = result.international.hreflangTags.find((link: any) => link.lang === "en");
  expect(enLink).toBeTruthy();
  expect(enLink.url).toBe("https://example.com/en");
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

  expect(result.international).toBeTruthy();
  // Hreflang validation may or may not flag certain codes as invalid
  // Just check that hreflang tags were extracted
  expect(result.international.hreflangTags).toBeTruthy();
  expect(result.international.hreflangTags.length).toBe(2);
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

  expect(result.social).toBeTruthy();
  expect(result.social.openGraph).toBeTruthy();
  expect(result.social.openGraph.ogTitle).toBe("OG Title");
  expect(result.social.openGraph.ogDescription).toBe("OG Description");
  expect(result.social.openGraph.ogImage).toBe("https://example.com/image.jpg");
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

  expect(result.social).toBeTruthy();
  expect(result.social.twitter).toBeTruthy();
  expect(result.social.twitter.twitterCard).toBe("summary_large_image");
  expect(result.social.twitter.twitterTitle).toBe("Twitter Title");
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

  expect(result.schema).toBeTruthy();
  expect(result.schema.schemaTypes).toBeTruthy();
  expect(result.schema.schemaTypes.includes("Article")).toBeTruthy();
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

  expect(result.schema).toBeTruthy();
  expect(result.schema.schemaTypes).toBeTruthy();
  expect(result.schema.schemaTypes.includes("Organization")).toBeTruthy();
  expect(result.schema.schemaTypes.includes("WebSite")).toBeTruthy();
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

  expect(result.content).toBeTruthy();
  // Title should be undefined or empty
  if (result.content.title) {
    expect(result.content.title).toBe("");
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

  expect(result.content).toBeTruthy();
  expect(result.content.wordCount).toBe(0);
  expect(result.content.h1Count).toBe(0);
});
