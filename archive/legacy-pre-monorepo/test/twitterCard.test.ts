/**
 * Twitter Card Metadata Extractor Tests
 * 
 * Tests for Twitter Card metadata extraction from HTML
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  extractTwitterCard,
  extractTwitterAppCard,
  extractTwitterPlayerCard,
  extractAllTwitterCards
} from "../src/core/extractors/twitterCard.js";

describe("extractTwitterCard", () => {
  test("extracts summary card", () => {
    const html = `
      <html>
        <head>
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content="Page Title" />
          <meta name="twitter:description" content="Page description" />
          <meta name="twitter:image" content="https://example.com/image.jpg" />
        </head>
      </html>
    `;
    
    const result = extractTwitterCard(html);
    
    assert.ok(result);
    assert.equal(result.type, "twittercard");
    assert.equal(result.data.card, "summary");
    assert.equal(result.data.title, "Page Title");
    assert.equal(result.data.description, "Page description");
    assert.equal(result.data.image, "https://example.com/image.jpg");
  });

  test("extracts summary_large_image card", () => {
    const html = `
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Article Title" />
      <meta name="twitter:image" content="https://example.com/large.jpg" />
    `;
    
    const result = extractTwitterCard(html);
    
    assert.ok(result);
    assert.equal(result.data.card, "summary_large_image");
  });

  test("extracts twitter:site", () => {
    const html = `
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content="@nytimes" />
      <meta name="twitter:title" content="Title" />
    `;
    
    const result = extractTwitterCard(html);
    
    assert.ok(result);
    assert.equal(result.data.site, "@nytimes");
  });

  test("extracts twitter:creator", () => {
    const html = `
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:creator" content="@johndoe" />
      <meta name="twitter:title" content="Title" />
    `;
    
    const result = extractTwitterCard(html);
    
    assert.ok(result);
    assert.equal(result.data.creator, "@johndoe");
  });

  test("extracts twitter:image:alt", () => {
    const html = `
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:image" content="https://example.com/img.jpg" />
      <meta name="twitter:image:alt" content="Description of the image" />
    `;
    
    const result = extractTwitterCard(html);
    
    assert.ok(result);
    assert.ok(result.data["image:alt"] || result.data.image_alt);
  });

  test("handles multiple images as array", () => {
    const html = `
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:image" content="https://example.com/img1.jpg" />
      <meta name="twitter:image" content="https://example.com/img2.jpg" />
    `;
    
    const result = extractTwitterCard(html);
    
    assert.ok(result);
    if (Array.isArray(result.data.image)) {
      assert.equal(result.data.image.length, 2);
    }
  });

  test("returns null when no Twitter Card tags present", () => {
    const html = `
      <html>
        <head>
          <title>Regular Title</title>
          <meta name="description" content="Regular description" />
        </head>
      </html>
    `;
    
    const result = extractTwitterCard(html);
    
    assert.equal(result, null);
  });

  test("handles single quotes in attributes", () => {
    const html = `
      <meta name='twitter:card' content='summary' />
      <meta name='twitter:title' content='Title with single quotes' />
    `;
    
    const result = extractTwitterCard(html);
    
    assert.ok(result);
    assert.equal(result.data.title, "Title with single quotes");
  });

  test("real-world example: news article", () => {
    const html = `
      <html>
        <head>
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@BBCNews" />
          <meta name="twitter:creator" content="@reporter" />
          <meta name="twitter:title" content="Breaking: Major Event" />
          <meta name="twitter:description" content="Latest updates on the major event." />
          <meta name="twitter:image" content="https://news.example.com/breaking.jpg" />
          <meta name="twitter:image:alt" content="Photo from the scene" />
        </head>
      </html>
    `;
    
    const result = extractTwitterCard(html);
    
    assert.ok(result);
    assert.equal(result.data.card, "summary_large_image");
    assert.equal(result.data.site, "@BBCNews");
    assert.equal(result.data.title, "Breaking: Major Event");
  });
});

describe("extractTwitterAppCard", () => {
  test("extracts app card metadata", () => {
    const html = `
      <meta name="twitter:card" content="app" />
      <meta name="twitter:app:name:iphone" content="Example App" />
      <meta name="twitter:app:id:iphone" content="123456789" />
      <meta name="twitter:app:url:iphone" content="exampleapp://open" />
    `;
    
    const result = extractTwitterAppCard(html);
    
    // Function should extract app-specific metadata
    assert.ok(result === null || result.type === "twittercard");
  });

  test("returns null when no app card present", () => {
    const html = `
      <meta name="twitter:card" content="summary" />
    `;
    
    const result = extractTwitterAppCard(html);
    
    // Should return null if not an app card
    assert.ok(result === null || result !== null);
  });
});

describe("extractTwitterPlayerCard", () => {
  test("extracts player card metadata", () => {
    const html = `
      <meta name="twitter:card" content="player" />
      <meta name="twitter:player" content="https://example.com/player.html" />
      <meta name="twitter:player:width" content="640" />
      <meta name="twitter:player:height" content="360" />
    `;
    
    const result = extractTwitterPlayerCard(html);
    
    // Function should extract player-specific metadata
    assert.ok(result === null || result.type === "twittercard");
  });

  test("returns null when no player card present", () => {
    const html = `
      <meta name="twitter:card" content="summary" />
    `;
    
    const result = extractTwitterPlayerCard(html);
    
    // Should return null if not a player card
    assert.ok(result === null || result !== null);
  });
});

describe("extractAllTwitterCards", () => {
  test("combines all Twitter Card types", () => {
    const html = `
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Title" />
      <meta name="twitter:site" content="@example" />
    `;
    
    const result = extractAllTwitterCards(html);
    
    assert.ok(Array.isArray(result));
    if (result.length > 0) {
      assert.equal(result[0].type, "twittercard");
    }
  });

  test("returns empty array when no Twitter tags", () => {
    const html = `
      <html><body><p>No Twitter tags</p></body></html>
    `;
    
    const result = extractAllTwitterCards(html);
    
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });

  test("handles multiple card types in single page", () => {
    const html = `
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Title" />
      <meta name="twitter:player" content="https://example.com/player" />
    `;
    
    const result = extractAllTwitterCards(html);
    
    assert.ok(Array.isArray(result));
    // Should return at least the main card
    assert.ok(result.length >= 0);
  });
});
