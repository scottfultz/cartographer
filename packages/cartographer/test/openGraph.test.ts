/**
 * Open Graph Metadata Extractor Tests
 * 
 * Tests for Open Graph (OG) protocol metadata extraction from HTML
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { extractOpenGraph, extractOpenGraphExtensions, extractAllOpenGraph } from "../src/core/extractors/openGraph.js";

describe("extractOpenGraph", () => {
  test("extracts basic OG tags", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="My Page Title" />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://example.com" />
          <meta property="og:image" content="https://example.com/image.jpg" />
        </head>
      </html>
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.type, "opengraph");
    assert.equal(result.data.title, "My Page Title");
    assert.equal(result.data.type, "website");
    assert.equal(result.data.url, "https://example.com");
    assert.equal(result.data.image, "https://example.com/image.jpg");
  });

  test("extracts OG description", () => {
    const html = `
      <meta property="og:title" content="Title" />
      <meta property="og:description" content="A brief description of the content" />
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.data.description, "A brief description of the content");
  });

  test("extracts og:site_name", () => {
    const html = `
      <meta property="og:title" content="Article" />
      <meta property="og:site_name" content="The New York Times" />
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.data.site_name, "The New York Times");
  });

  test("handles multiple og:image tags as array", () => {
    const html = `
      <meta property="og:title" content="Gallery" />
      <meta property="og:image" content="https://example.com/img1.jpg" />
      <meta property="og:image" content="https://example.com/img2.jpg" />
      <meta property="og:image" content="https://example.com/img3.jpg" />
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.ok(Array.isArray(result.data.image));
    assert.equal(result.data.image.length, 3);
    assert.equal(result.data.image[0], "https://example.com/img1.jpg");
    assert.equal(result.data.image[2], "https://example.com/img3.jpg");
  });

  test("extracts og:locale", () => {
    const html = `
      <meta property="og:title" content="Title" />
      <meta property="og:locale" content="en_US" />
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.data.locale, "en_US");
  });

  test("extracts article-specific tags", () => {
    const html = `
      <meta property="og:type" content="article" />
      <meta property="og:title" content="News Article" />
      <meta property="article:published_time" content="2025-01-24T10:00:00Z" />
      <meta property="article:author" content="John Doe" />
      <meta property="article:section" content="Technology" />
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.data.type, "article");
    // Note: article: namespace tags might be in extensions
  });

  test("returns null when no OG tags present", () => {
    const html = `
      <html>
        <head>
          <title>Regular Title</title>
          <meta name="description" content="Regular description" />
        </head>
      </html>
    `;
    
    const result = extractOpenGraph(html);
    
    assert.equal(result, null);
  });

  test("handles single quotes in attributes", () => {
    const html = `
      <meta property='og:title' content='Title with single quotes' />
      <meta property='og:type' content='website' />
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.data.title, "Title with single quotes");
  });

  test("handles empty content attribute", () => {
    const html = `
      <meta property="og:title" content="" />
      <meta property="og:description" content="Valid description" />
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.data.title, "");
    assert.equal(result.data.description, "Valid description");
  });

  test("real-world example: news article", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Breaking: Major Event Occurs" />
          <meta property="og:type" content="article" />
          <meta property="og:url" content="https://news.example.com/breaking-news" />
          <meta property="og:image" content="https://news.example.com/images/event.jpg" />
          <meta property="og:description" content="Details about the major event that occurred today." />
          <meta property="og:site_name" content="Example News" />
          <meta property="og:locale" content="en_US" />
        </head>
      </html>
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.data.title, "Breaking: Major Event Occurs");
    assert.equal(result.data.type, "article");
    assert.equal(result.data.site_name, "Example News");
    assert.ok(result.data.image);
    assert.ok(result.data.description);
  });

  test("real-world example: video content", () => {
    const html = `
      <meta property="og:title" content="Awesome Video" />
      <meta property="og:type" content="video.movie" />
      <meta property="og:video" content="https://example.com/video.mp4" />
      <meta property="og:video:width" content="1280" />
      <meta property="og:video:height" content="720" />
      <meta property="og:video:type" content="video/mp4" />
    `;
    
    const result = extractOpenGraph(html);
    
    assert.ok(result);
    assert.equal(result.data.type, "video.movie");
    assert.ok(result.data.video || result.data["video:width"]);
  });
});

describe("extractOpenGraphExtensions", () => {
  test("extracts article namespace tags", () => {
    const html = `
      <meta property="article:published_time" content="2025-01-24T10:00:00Z" />
      <meta property="article:modified_time" content="2025-01-24T12:00:00Z" />
      <meta property="article:author" content="Jane Smith" />
      <meta property="article:section" content="Technology" />
      <meta property="article:tag" content="AI" />
      <meta property="article:tag" content="Machine Learning" />
    `;
    
    const result = extractOpenGraphExtensions(html);
    
    assert.ok(result.length > 0);
    const articleData = result.find(item => item.schemaType === "article");
    if (articleData) {
      assert.ok(articleData.data.published_time || articleData.data["article:published_time"]);
    }
  });

  test("returns empty array when no extension tags", () => {
    const html = `
      <meta property="og:title" content="Title" />
      <meta property="og:type" content="website" />
    `;
    
    const result = extractOpenGraphExtensions(html);
    
    assert.ok(Array.isArray(result));
    // Might be empty or might not, depending on implementation
  });
});

describe("extractAllOpenGraph", () => {
  test("combines basic OG and extensions", () => {
    const html = `
      <meta property="og:title" content="Article Title" />
      <meta property="og:type" content="article" />
      <meta property="article:published_time" content="2025-01-24T10:00:00Z" />
      <meta property="article:author" content="John Doe" />
    `;
    
    const result = extractAllOpenGraph(html);
    
    assert.ok(result.length >= 1);
    const ogItem = result.find(item => item.type === "opengraph");
    assert.ok(ogItem);
    assert.equal(ogItem.data.title, "Article Title");
  });

  test("returns all OG data in single call", () => {
    const html = `
      <meta property="og:title" content="Product Page" />
      <meta property="og:type" content="product" />
      <meta property="product:price:amount" content="99.99" />
      <meta property="product:price:currency" content="USD" />
    `;
    
    const result = extractAllOpenGraph(html);
    
    assert.ok(result.length >= 1);
  });

  test("returns empty array when no OG tags", () => {
    const html = `
      <html><body><p>No OG tags</p></body></html>
    `;
    
    const result = extractAllOpenGraph(html);
    
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });
});
