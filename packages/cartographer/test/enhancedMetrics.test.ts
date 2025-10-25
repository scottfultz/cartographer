/**
 * Enhanced Metrics Extractor Tests
 * 
 * Tests for resource counting, encoding detection, compression analysis,
 * viewport meta extraction, mixed content detection, and SRI checking
 */

import { describe, test , expect } from "vitest";
import assert from "node:assert/strict";
import {
  extractEncoding,
  countResources,
  extractCompression,
  extractViewportMeta,
  detectMixedContent,
  checkSubresourceIntegrity,
  countBrokenLinks,
  extractOutboundDomains
} from "../src/core/extractors/enhancedMetrics.js";

describe("extractEncoding", () => {
  test("extracts encoding from Content-Type header", () => {
    const result = extractEncoding({
      html: "<html><body>Content</body></html>",
      contentTypeHeader: "text/html; charset=UTF-8"
    });
    
    expect(result).toBeTruthy();
    expect(result.encoding).toBe("UTF-8");
    expect(result.source).toBe("header");
  });

  test("extracts encoding from meta charset tag", () => {
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
      </html>
    `;
    
    const result = extractEncoding({ html });
    
    expect(result).toBeTruthy();
    expect(result.encoding).toBe("UTF-8");
    expect(result.source).toBe("meta");
  });

  test("extracts encoding from meta http-equiv tag", () => {
    const html = `
      <html>
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1" />
        </head>
      </html>
    `;
    
    const result = extractEncoding({ html });
    
    expect(result).toBeTruthy();
    expect(result.encoding).toBe("ISO-8859-1");
    expect(result.source).toBe("meta");
  });

  test("prefers header over meta tag", () => {
    const html = `
      <html>
        <head>
          <meta charset="ISO-8859-1" />
        </head>
      </html>
    `;
    
    const result = extractEncoding({
      html,
      contentTypeHeader: "text/html; charset=UTF-8"
    });
    
    expect(result).toBeTruthy();
    expect(result.encoding).toBe("UTF-8");
    expect(result.source).toBe("header");
  });

  test("returns undefined when no encoding found", () => {
    const html = "<html><body>No encoding</body></html>";
    
    const result = extractEncoding({ html });
    
    expect(result, undefined);
  });

  test("handles various charset formats", () => {
    const testCases = [
      { header: "text/html;charset=utf-8", expected: "UTF-8" },
      { header: "text/html; charset=utf-8", expected: "UTF-8" },
      { header: "text/html;charset=UTF-8", expected: "UTF-8" }
    ];
    
    testCases.forEach(tc => {
      const result = extractEncoding({
        html: "",
        contentTypeHeader: tc.header
      });
      expect(result, `Should extract encoding from: ${tc.header}`).toBeTruthy();
      expect(result.encoding.toUpperCase(), tc.expected);
    });
  });
});

describe("countResources", () => {
  test("counts external stylesheets", () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="styles1.css" />
          <link rel="stylesheet" href="styles2.css" />
          <link rel="stylesheet" href="styles3.css" />
        </head>
      </html>
    `;
    
    const result = countResources(html);
    
    expect(result.cssCount).toBe(3);
  });

  test("counts inline styles", () => {
    const html = `
      <html>
        <head>
          <style>.class1 { color: red; }</style>
          <style>.class2 { color: blue; }</style>
        </head>
        <body>
          <style>.class3 { color: green; }</style>
        </body>
      </html>
    `;
    
    const result = countResources(html);
    
    expect(result.inlineStyles).toBe(3);
  });

  test("counts external scripts", () => {
    const html = `
      <html>
        <head>
          <script src="script1.js"></script>
          <script src="script2.js"></script>
        </head>
        <body>
          <script src="script3.js"></script>
        </body>
      </html>
    `;
    
    const result = countResources(html);
    
    expect(result.jsCount).toBe(3);
  });

  test("counts inline scripts", () => {
    const html = `
      <html>
        <head>
          <script>console.log('inline1');</script>
        </head>
        <body>
          <script>console.log('inline2');</script>
        </body>
      </html>
    `;
    
    const result = countResources(html);
    
    expect(result.inlineScripts).toBe(2);
  });

  test("counts font preloads", () => {
    const html = `
      <html>
        <head>
          <link rel="preload" as="font" href="font1.woff2" crossorigin />
          <link rel="preload" as="font" href="font2.woff2" crossorigin />
        </head>
      </html>
    `;
    
    const result = countResources(html);
    
    expect(result.fontCount).toBe(2);
  });

  test("counts @font-face declarations", () => {
    const html = `
      <html>
        <head>
          <style>
            @font-face {
              font-family: 'MyFont1';
              src: url('font1.woff2');
            }
            @font-face {
              font-family: 'MyFont2';
              src: url('font2.woff2');
            }
          </style>
        </head>
      </html>
    `;
    
    const result = countResources(html);
    
    expect(result.fontCount >= 2, `Expected at least 2 fonts, got ${result.fontCount}`).toBeTruthy();
  });

  test("returns zero for empty HTML", () => {
    const html = "<html><body></body></html>";
    
    const result = countResources(html);
    
    expect(result.cssCount).toBe(0);
    expect(result.jsCount).toBe(0);
    expect(result.fontCount).toBe(0);
    expect(result.inlineStyles).toBe(0);
    expect(result.inlineScripts).toBe(0);
  });

  test("real-world example: typical page", () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="main.css" />
          <link rel="stylesheet" href="vendor.css" />
          <style>.hero { background: blue; }</style>
          <script src="vendor.js"></script>
          <script src="main.js"></script>
          <link rel="preload" as="font" href="font.woff2" crossorigin />
        </head>
        <body>
          <script>console.log('analytics');</script>
        </body>
      </html>
    `;
    
    const result = countResources(html);
    
    expect(result.cssCount).toBe(2);
    expect(result.jsCount).toBe(2);
    expect(result.inlineStyles).toBe(1);
    expect(result.inlineScripts).toBe(1);
    expect(result.fontCount).toBe(1);
  });
});

describe("extractCompression", () => {
  test("detects gzip compression", () => {
    const headers = {
      "content-encoding": "gzip"
    };
    
    const result = extractCompression(headers);
    
    expect(result.compression).toBe("gzip");
    expect(result.contentEncoding).toBe("gzip");
  });

  test("detects br (Brotli) compression", () => {
    const headers = {
      "content-encoding": "br"
    };
    
    const result = extractCompression(headers);
    
    expect(result.compression).toBe("brotli");
  });

  test("detects deflate compression", () => {
    const headers = {
      "content-encoding": "deflate"
    };
    
    const result = extractCompression(headers);
    
    expect(result.compression).toBe("deflate");
  });

  test("handles no compression", () => {
    const headers = {
      "content-type": "text/html"
    };
    
    const result = extractCompression(headers);
    
    expect(result.compression).toBe("none");
  });

  test("handles multiple encodings", () => {
    const headers = {
      "content-encoding": "gzip, deflate"
    };
    
    const result = extractCompression(headers);
    
    // Should detect first or primary encoding
    expect(result.compression === "gzip" || result.compression === "deflate").toBeTruthy();
  });
});

describe("extractViewportMeta", () => {
  test("extracts viewport meta tag", () => {
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
      </html>
    `;
    
    const result = extractViewportMeta(html);
    
    expect(result).toBeTruthy();
    expect(result.hasViewport).toBeTruthy();
    expect(result.content).toBe("width=device-width, initial-scale=1.0");
  });

  test("detects mobile-friendly viewport", () => {
    const html = `
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    `;
    
    const result = extractViewportMeta(html);
    
    expect(result).toBeTruthy();
    expect(result.hasViewport).toBeTruthy();
    expect(result.width).toBe("device-width");
    expect(result.initialScale).toBe(1);
  });

  test("returns undefined when missing", () => {
    const html = "<html><head></head></html>";
    
    const result = extractViewportMeta(html);
    
    expect(result, undefined);
  });

  test("handles various viewport values", () => {
    const testCases = [
      "width=device-width",
      "width=device-width, initial-scale=1",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0",
      "width=1024"
    ];
    
    testCases.forEach(content => {
      const html = `<meta name="viewport" content="${content}" />`;
      const result = extractViewportMeta(html);
      expect(result).toBeTruthy();
      expect(result.hasViewport).toBeTruthy();
      expect(result.content, content);
    });
  });
});

describe("detectMixedContent", () => {
  test("detects mixed content (HTTP in HTTPS page)", () => {
    const html = `
      <html>
        <body>
          <img src="http://example.com/image.jpg" />
          <script src="http://example.com/script.js"></script>
        </body>
      </html>
    `;
    
    const result = detectMixedContent({
      html,
      pageUrl: "https://secure.example.com/page"
    });
    
    expect(result.length > 0).toBeTruthy();
    expect(result.some(item => item.type === "image")).toBeTruthy();
    expect(result.some(item => item.type === "script")).toBeTruthy();
  });

  test("no mixed content on HTTP page", () => {
    const html = `
      <html>
        <body>
          <img src="http://example.com/image.jpg" />
        </body>
      </html>
    `;
    
    const result = detectMixedContent({
      html,
      pageUrl: "http://example.com/page"
    });
    
    expect(result.length).toBe(0);
  });

  test("no mixed content when all resources are HTTPS", () => {
    const html = `
      <html>
        <body>
          <img src="https://example.com/image.jpg" />
          <script src="https://example.com/script.js"></script>
        </body>
      </html>
    `;
    
    const result = detectMixedContent({
      html,
      pageUrl: "https://example.com/page"
    });
    
    expect(result.length).toBe(0);
  });
});

describe("checkSubresourceIntegrity", () => {
  test("detects SRI on external scripts", () => {
    const html = `
      <html>
        <head>
          <script src="https://cdn.example.com/lib.js" 
                  integrity="sha384-abc123" 
                  crossorigin="anonymous"></script>
        </head>
      </html>
    `;
    
    const result = checkSubresourceIntegrity(html);
    
    expect(result.totalScripts).toBe(1);
    expect(result.scriptsWithSRI).toBe(1);
  });

  test("counts scripts without SRI", () => {
    const html = `
      <html>
        <head>
          <script src="https://cdn.example.com/lib.js"></script>
          <script src="https://cdn.example.com/lib2.js"></script>
        </head>
      </html>
    `;
    
    const result = checkSubresourceIntegrity(html);
    
    expect(result.totalScripts).toBe(2);
    expect(result.scriptsWithSRI).toBe(0);
    expect(result.missingResources).toBeTruthy();
    expect(result.missingResources.length).toBe(2);
  });
});

describe("countBrokenLinks", () => {
  test("counts 404 responses", () => {
    const edges = [
      { httpStatusAtTo: 200, isExternal: false },
      { httpStatusAtTo: 404, isExternal: false },
      { httpStatusAtTo: 404, isExternal: false },
      { httpStatusAtTo: 200, isExternal: false }
    ];
    
    const result = countBrokenLinks(edges);
    
    expect(result).toBe(2);
  });

  test("counts 5xx server errors", () => {
    const edges = [
      { httpStatusAtTo: 200, isExternal: false },
      { httpStatusAtTo: 500, isExternal: false },
      { httpStatusAtTo: 503, isExternal: false }
    ];
    
    const result = countBrokenLinks(edges);
    
    expect(result).toBe(2);
  });

  test("returns zero for all successful links", () => {
    const edges = [
      { httpStatusAtTo: 200, isExternal: false },
      { httpStatusAtTo: 200, isExternal: false },
      { httpStatusAtTo: 301, isExternal: false }
    ];
    
    const result = countBrokenLinks(edges);
    
    expect(result).toBe(0);
  });

  test("handles empty edges array", () => {
    const result = countBrokenLinks([]);
    
    expect(result).toBe(0);
  });
});

describe("extractOutboundDomains", () => {
  test("extracts unique external domains", () => {
    const edges = [
      { targetUrl: "https://example.com/page", isExternal: true },
      { targetUrl: "https://google.com/search", isExternal: true },
      { targetUrl: "https://example.com/other", isExternal: true },
      { targetUrl: "https://internal.site/page", isExternal: false }
    ];
    
    const result = extractOutboundDomains(edges);
    
    expect(result.length).toBe(2);
    expect(result.includes("example.com")).toBeTruthy();
    expect(result.includes("google.com")).toBeTruthy();
  });

  test("deduplicates domains", () => {
    const edges = [
      { targetUrl: "https://example.com/page1", isExternal: true },
      { targetUrl: "https://example.com/page2", isExternal: true },
      { targetUrl: "https://example.com/page3", isExternal: true }
    ];
    
    const result = extractOutboundDomains(edges);
    
    expect(result.length).toBe(1);
    expect(result[0]).toBe("example.com");
  });

  test("ignores internal links", () => {
    const edges = [
      { targetUrl: "https://mysite.com/page1", isExternal: false },
      { targetUrl: "https://mysite.com/page2", isExternal: false }
    ];
    
    const result = extractOutboundDomains(edges);
    
    expect(result.length).toBe(0);
  });

  test("handles empty edges array", () => {
    const result = extractOutboundDomains([]);
    
    expect(result.length).toBe(0);
  });

  test("handles mixed internal and external", () => {
    const edges = [
      { targetUrl: "https://site.com/internal", isExternal: false },
      { targetUrl: "https://external1.com/page", isExternal: true },
      { targetUrl: "https://site.com/internal2", isExternal: false },
      { targetUrl: "https://external2.com/page", isExternal: true }
    ];
    
    const result = extractOutboundDomains(edges);
    
    expect(result.length).toBe(2);
    expect(result.includes("external1.com")).toBeTruthy();
    expect(result.includes("external2.com")).toBeTruthy();
  });
});
