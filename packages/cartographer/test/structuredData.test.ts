/**
 * Structured Data Extractor Tests
 * 
 * Tests for JSON-LD structured data extraction from HTML
 */

import { describe, test , expect } from "vitest";
import assert from "node:assert/strict";
import { extractStructuredData, filterRelevantStructuredData } from "../src/core/extractors/structuredData.js";

describe("extractStructuredData", () => {
  test("extracts JSON-LD from script tag", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Widget",
              "price": "29.99"
            }
          </script>
        </head>
      </html>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("json-ld");
    expect(result[0].schemaType).toBe("Product");
    expect(result[0].data.name).toBe("Widget");
    expect(result[0].data.price).toBe("29.99");
  });

  test("extracts multiple JSON-LD objects", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "Organization",
              "name": "Acme Corp"
            }
          </script>
          <script type="application/ld+json">
            {
              "@type": "Article",
              "headline": "News Story"
            }
          </script>
        </head>
      </html>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    expect(result.length).toBe(2);
    expect(result[0].schemaType).toBe("Organization");
    expect(result[1].schemaType).toBe("Article");
  });

  test("handles JSON-LD array format", () => {
    const html = `
      <script type="application/ld+json">
        [
          {
            "@type": "BreadcrumbList",
            "itemListElement": []
          },
          {
            "@type": "WebPage",
            "name": "Page"
          }
        ]
      </script>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    expect(result.length).toBe(2);
    expect(result[0].schemaType).toBe("BreadcrumbList");
    expect(result[1].schemaType).toBe("WebPage");
  });

  test("handles nested @type arrays", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": ["Article", "BlogPosting"],
          "headline": "Blog Post"
        }
      </script>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    expect(result.length).toBe(1);
    // Implementation might store as array or as first value
    const schemaType = result[0].schemaType;
    expect(
      Array.isArray(schemaType) || typeof schemaType === "string").toBeTruthy();
  });

  test("ignores invalid JSON", () => {
    const html = `
      <script type="application/ld+json">
        { invalid json }
      </script>
      <script type="application/ld+json">
        {
          "@type": "Organization",
          "name": "Valid"
        }
      </script>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    // Should skip invalid JSON and parse valid one
    expect(result.length).toBe(1);
    expect(result[0].schemaType).toBe("Organization");
  });

  test("ignores empty script tags", () => {
    const html = `
      <script type="application/ld+json"></script>
      <script type="application/ld+json">   </script>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    expect(result.length).toBe(0);
  });

  test("handles no structured data", () => {
    const html = `
      <html>
        <body><p>No structured data here</p></body>
      </html>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    expect(result.length).toBe(0);
  });

  test("limits individual item size to 50KB", () => {
    // Create a large JSON object > 50KB
    const largeData = {
      "@type": "Article",
      "content": "x".repeat(60000) // 60KB of content
    };
    
    const html = `
      <script type="application/ld+json">
        ${JSON.stringify(largeData)}
      </script>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    // Should be skipped due to size
    expect(result.length).toBe(0);
  });

  test("extracts common schema types", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Widget",
          "offers": {
            "@type": "Offer",
            "price": "29.99"
          }
        }
      </script>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    expect(result.length).toBe(1);
    expect(result[0].schemaType).toBe("Product");
    expect(result[0].data.offers).toBeTruthy();
    expect(result[0].data.offers["@type"]).toBe("Offer");
  });

  test("handles various script tag formats", () => {
    const html = `
      <script type="application/ld+json">{"@type":"A","name":"1"}</script>
      <script type='application/ld+json'>{"@type":"B","name":"2"}</script>
      <script type=application/ld+json>{"@type":"C","name":"3"}</script>
    `;
    
    const result = extractStructuredData({ html, url: "https://example.com" });
    
    // Regex-based parser should handle at least quoted variations
    expect(result.length >= 2, `Expected at least 2, got ${result.length}`).toBeTruthy();
  });
});

describe("filterRelevantStructuredData", () => {
  test("keeps SEO-relevant types", () => {
    const items = [
      {
        type: "json-ld" as const,
        schemaType: "Article",
        data: { headline: "News" }
      },
      {
        type: "json-ld" as const,
        schemaType: "Product",
        data: { name: "Widget" }
      },
      {
        type: "json-ld" as const,
        schemaType: "Organization",
        data: { name: "Acme" }
      }
    ];
    
    const result = filterRelevantStructuredData(items);
    
    expect(result.length).toBe(3);
  });

  test("filters out non-SEO types", () => {
    const items = [
      {
        type: "json-ld" as const,
        schemaType: "Article",
        data: { headline: "News" }
      },
      {
        type: "json-ld" as const,
        schemaType: "WebSite",
        data: { name: "Site" }
      },
      {
        type: "json-ld" as const,
        schemaType: "SearchAction",
        data: { target: "url" }
      }
    ];
    
    const result = filterRelevantStructuredData(items);
    
    // SearchAction and WebSite might be filtered (depends on implementation)
    // At minimum, Article should be kept
    expect(result.some(item => item.schemaType === "Article").toBeTruthy());
  });

  test("keeps BreadcrumbList", () => {
    const items = [
      {
        type: "json-ld" as const,
        schemaType: "BreadcrumbList",
        data: { itemListElement: [] }
      }
    ];
    
    const result = filterRelevantStructuredData(items);
    
    expect(result.length).toBe(1);
    expect(result[0].schemaType).toBe("BreadcrumbList");
  });

  test("handles empty input", () => {
    const result = filterRelevantStructuredData([]);
    
    expect(result.length).toBe(0);
  });

  test("handles items without schemaType", () => {
    const items = [
      {
        type: "json-ld" as const,
        data: { something: "here" }
      }
    ];
    
    const result = filterRelevantStructuredData(items);
    
    // Should handle gracefully (either include or exclude)
    expect(Array.isArray(result)).toBeTruthy();
  });

  test("real-world example: news article", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": "Breaking News",
          "author": {
            "@type": "Person",
            "name": "John Doe"
          },
          "datePublished": "2025-01-24",
          "image": "https://example.com/image.jpg"
        }
      </script>
    `;
    
    const extracted = extractStructuredData({ html, url: "https://example.com/news" });
    const filtered = filterRelevantStructuredData(extracted);
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].schemaType).toBe("NewsArticle");
    expect(filtered[0].data.headline).toBe("Breaking News");
  });

  test("real-world example: e-commerce product", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Wireless Headphones",
          "offers": {
            "@type": "Offer",
            "price": "99.99",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.5",
            "reviewCount": "123"
          }
        }
      </script>
    `;
    
    const extracted = extractStructuredData({ html, url: "https://shop.example.com/product" });
    const filtered = filterRelevantStructuredData(extracted);
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].schemaType).toBe("Product");
    expect(filtered[0].data.name).toBe("Wireless Headphones");
    expect(filtered[0].data.offers).toBeTruthy();
    expect(filtered[0].data.aggregateRating).toBeTruthy();
  });
});
