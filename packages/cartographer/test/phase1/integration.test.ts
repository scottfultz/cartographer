/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Phase 1 Integration Test Suite
 * 
 * End-to-end tests that validate Phase 1 features work correctly:
 * - collectWCAGData() includes static Phase 1 data
 * - Runtime functions can be called successfully
 * - Data structures match expected interfaces
 */

import { test, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { strict as assert } from "node:assert";
import * as cheerio from "cheerio";
import { chromium, type Browser, type Page } from "playwright";
import { collectWCAGData } from "../../src/core/extractors/wcagData.js";
import {
  detectKeyboardTraps,
  detectSkipLinks,
  analyzeMediaElements,
} from "../../src/core/extractors/runtimeAccessibility.js";

let browser: Browser | null = null;
let page: Page | null = null;

// =============================================================================
// TEST LIFECYCLE
// =============================================================================

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  if (browser) {
    await browser.close();
  }
});

beforeEach(async () => {
  if (browser) {
    page = await browser.newPage();
  }
});

afterEach(async () => {
  if (page) {
    await page.close();
  }
});

// =============================================================================
// TEST FIXTURES
// =============================================================================

const COMPREHENSIVE_TEST_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Phase 1 Comprehensive Test</title>
</head>
<body>
  <!-- Skip Links -->
  <a href="#main">Skip to main content</a>
  <a href="#nav">Skip to navigation</a>
  
  <!-- ARIA Live Regions -->
  <div aria-live="polite" aria-atomic="true">Polite updates</div>
  <div role="alert">Alert message</div>
  <div role="status">Status message</div>
  
  <!-- Focus Order -->
  <div tabindex="-1">Skip target</div>
  <button tabindex="0">Normal button</button>
  <div tabindex="1">Positive tabindex</div>
  
  <!-- Forms -->
  <form autocomplete="on">
    <input type="text" name="name" autocomplete="name" />
    <input type="email" name="email" autocomplete="email" />
    <input type="tel" name="phone" autocomplete="tel" />
    <input type="text" name="address" autocomplete="street-address" />
  </form>
  
  <!-- Media -->
  <video src="video.mp4" controls>
    <track kind="captions" src="captions.vtt" />
    <track kind="subtitles" src="subtitles.vtt" />
  </video>
  <audio src="audio.mp3" controls></audio>
  
  <nav id="nav"><a href="/page">Link</a></nav>
  <main id="main"><h1>Content</h1></main>
</body>
</html>
`;

// =============================================================================
// STATIC ANALYSIS INTEGRATION
// =============================================================================

test("Integration - collectWCAGData includes Phase 1 static data", () => {
  const $ = cheerio.load(COMPREHENSIVE_TEST_PAGE);
  const result = collectWCAGData($, "https://example.com");
  
  // Phase 1 static features
  expect(result.ariaLiveRegions).toBeTruthy();
  expect(result.ariaLiveRegions.count).toBe(3);
  
  expect(result.focusOrderAnalysis).toBeTruthy();
  expect(result.focusOrderAnalysis.customTabIndexCount).toBe(3);
  expect(result.focusOrderAnalysis.positiveTabIndexElements.length).toBe(1);
  
  expect(result.formAutocomplete).toBeTruthy();
  expect(result.formAutocomplete.totalForms).toBe(1);
  expect(result.formAutocomplete.personalDataInputs.length).toBe(4);
});

test("Integration - static analysis works with empty page", () => {
  const $ = cheerio.load('<html><body></body></html>');
  const result = collectWCAGData($, "https://example.com");
  
  expect(result.ariaLiveRegions).toBeTruthy();
  expect(result.ariaLiveRegions.count).toBe(0);
  
  expect(result.focusOrderAnalysis).toBeTruthy();
  expect(result.focusOrderAnalysis.customTabIndexCount).toBe(0);
  
  expect(result.formAutocomplete).toBeTruthy();
  expect(result.formAutocomplete.totalForms).toBe(0);
});

// =============================================================================
// RUNTIME ANALYSIS INTEGRATION
// =============================================================================

test("Integration - runtime functions work together", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(COMPREHENSIVE_TEST_PAGE);
  
  // All runtime functions should execute without error
  const keyboardTraps = await detectKeyboardTraps(page);
  const skipLinks = await detectSkipLinks(page);
  const mediaElements = await analyzeMediaElements(page);
  
  expect(keyboardTraps).toBeTruthy();
  expect(typeof keyboardTraps.hasPotentialTraps === 'boolean').toBeTruthy();
  
  expect(skipLinks).toBeTruthy();
  expect(skipLinks.hasSkipLinks).toBeTruthy();
  expect(skipLinks.links.length >= 2).toBeTruthy();
  
  expect(mediaElements).toBeTruthy();
  expect(mediaElements.videos.length).toBe(1);
  expect(mediaElements.audios.length).toBe(1);
});

test("Integration - runtime functions handle empty page", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent('<html><body></body></html>');
  
  const keyboardTraps = await detectKeyboardTraps(page);
  const skipLinks = await detectSkipLinks(page);
  const mediaElements = await analyzeMediaElements(page);
  
  expect(keyboardTraps.hasPotentialTraps).toBe(false);
  expect(skipLinks.hasSkipLinks).toBe(false);
  expect(mediaElements.videos.length).toBe(0);
  expect(mediaElements.audios.length).toBe(0);
});

// =============================================================================
// DATA STRUCTURE VALIDATION
// =============================================================================

test("Integration - Phase 1 data structures are consistent", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(COMPREHENSIVE_TEST_PAGE);
  
  // Static analysis
  const $ = cheerio.load(COMPREHENSIVE_TEST_PAGE);
  const staticData = collectWCAGData($, "https://example.com");
  
  // Runtime analysis
  const keyboardTraps = await detectKeyboardTraps(page);
  const skipLinks = await detectSkipLinks(page);
  const mediaElements = await analyzeMediaElements(page);
  
  // All Phase 1 features should have data
  expect(staticData.ariaLiveRegions).toBeTruthy();
  expect(staticData.focusOrderAnalysis).toBeTruthy();
  expect(staticData.formAutocomplete).toBeTruthy();
  expect(keyboardTraps).toBeTruthy();
  expect(skipLinks).toBeTruthy();
  expect(mediaElements).toBeTruthy();
  
  // Data types should be correct
  expect(typeof staticData.ariaLiveRegions.count).toBe('number');
  expect(Array.isArray(staticData.ariaLiveRegions.regions)).toBeTruthy();
  
  expect(typeof staticData.focusOrderAnalysis.customTabIndexCount).toBe('number');
  expect(Array.isArray(staticData.focusOrderAnalysis.positiveTabIndexElements)).toBeTruthy();
  
  expect(typeof staticData.formAutocomplete.totalForms).toBe('number');
  expect(Array.isArray(staticData.formAutocomplete.personalDataInputs)).toBeTruthy();
  
  expect(typeof keyboardTraps.hasPotentialTraps).toBe('boolean');
  expect(Array.isArray(keyboardTraps.suspiciousElements)).toBeTruthy();
  
  expect(typeof skipLinks.hasSkipLinks).toBe('boolean');
  expect(Array.isArray(skipLinks.links)).toBeTruthy();
  
  expect(Array.isArray(mediaElements.videos)).toBeTruthy();
  expect(Array.isArray(mediaElements.audios)).toBeTruthy();
});

// =============================================================================
// CROSS-FEATURE VALIDATION
// =============================================================================

test("Integration - skip links static vs runtime comparison", async () => {
  if (!page) throw new Error("Page not initialized");
  
  const html = `
    <html>
      <body>
        <a href="#main">Skip to main</a>
        <a href="#nav">Skip to nav</a>
        <main id="main">Main</main>
        <nav id="nav">Nav</nav>
      </body>
    </html>
  `;
  
  await page.setContent(html);
  
  // Runtime can detect skip links
  const skipLinks = await detectSkipLinks(page);
  
  expect(skipLinks.hasSkipLinks).toBe(true);
  expect(skipLinks.links.length).toBe(2);
  expect(skipLinks.links.every(l => l.targetExists)).toBeTruthy();
});

test("Integration - form autocomplete identifies all expected patterns", async () => {
  const $ = cheerio.load(`
    <html>
      <body>
        <form>
          <input type="email" name="email" />
          <input type="tel" name="phone" />
          <input type="text" name="first_name" />
          <input type="text" name="address" />
          <input type="text" name="postal_code" />
          <input type="text" name="city" />
          <input type="text" name="country" />
        </form>
      </body>
    </html>
  `);
  
  const result = collectWCAGData($, "https://example.com");
  
  expect(result.formAutocomplete).toBeTruthy();
  expect(result.formAutocomplete.personalDataInputs.length).toBe(7);
  
  const types = result.formAutocomplete.personalDataInputs.map(i => i.type);
  expect(types.includes("email")).toBeTruthy();
  expect(types.includes("tel")).toBeTruthy();
  expect(types.includes("name")).toBeTruthy();
  expect(types.includes("address")).toBeTruthy();
  expect(types.includes("postal")).toBeTruthy();
  expect(types.includes("city")).toBeTruthy();
  expect(types.includes("country")).toBeTruthy();
});

test("Integration - media analysis matches fixture expectations", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video1.mp4" controls>
          <track kind="captions" src="captions.vtt" />
        </video>
        <video src="video2.mp4" autoplay></video>
        <audio src="audio.mp3" controls></audio>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(2);
  expect(result.audios.length).toBe(1);
  
  // First video has captions and controls
  expect(result.videos[0].hasCaptions).toBe(true);
  expect(result.videos[0].controls).toBe(true);
  expect(result.videos[0].autoplay).toBe(false);
  
  // Second video has autoplay, no captions
  expect(result.videos[1].hasCaptions).toBe(false);
  expect(result.videos[1].autoplay).toBe(true);
  
  // Audio has controls
  expect(result.audios[0].controls).toBe(true);
});

test("Integration - ARIA live regions with various configurations", () => {
  const $ = cheerio.load(`
    <html>
      <body>
        <div aria-live="polite">Polite</div>
        <div aria-live="assertive" aria-atomic="true">Assertive</div>
        <div aria-live="off">Off</div>
        <div role="status">Status</div>
        <div role="alert">Alert</div>
        <div role="log">Log</div>
      </body>
    </html>
  `);
  
  const result = collectWCAGData($, "https://example.com");
  
  expect(result.ariaLiveRegions).toBeTruthy();
  expect(result.ariaLiveRegions.count).toBe(6);
  
  // Check explicit regions
  const polite = result.ariaLiveRegions.regions.find(r => r.live === 'polite' && !r.atomic);
  expect(polite).toBeTruthy();
  
  const assertive = result.ariaLiveRegions.regions.find(r => r.live === 'assertive' && r.atomic);
  expect(assertive).toBeTruthy();
  
  const off = result.ariaLiveRegions.regions.find(r => r.live === 'off');
  expect(off).toBeTruthy();
});


// =============================================================================
// CROSS-FEATURE VALIDATION
// =============================================================================

test("Integration - skip links static vs runtime comparison", async () => {
  if (!page) throw new Error("Page not initialized");
  
  const html = `
    <html>
      <body>
        <a href="#main">Skip to main</a>
        <a href="#nav">Skip to nav</a>
        <main id="main">Main</main>
        <nav id="nav">Nav</nav>
      </body>
    </html>
  `;
  
  await page.setContent(html);
  
  // Runtime can detect skip links
  const skipLinks = await detectSkipLinks(page);
  
  expect(skipLinks.hasSkipLinks).toBe(true);
  expect(skipLinks.links.length).toBe(2);
  expect(skipLinks.links.every(l => l.targetExists)).toBeTruthy();
});

test("Integration - form autocomplete identifies all expected patterns", async () => {
  const $ = cheerio.load(`
    <html>
      <body>
        <form>
          <input type="email" name="email" />
          <input type="tel" name="phone" />
          <input type="text" name="first_name" />
          <input type="text" name="address" />
          <input type="text" name="postal_code" />
          <input type="text" name="city" />
          <input type="text" name="country" />
        </form>
      </body>
    </html>
  `);
  
  const result = collectWCAGData($, "https://example.com");
  
  expect(result.formAutocomplete).toBeTruthy();
  expect(result.formAutocomplete.personalDataInputs.length).toBe(7);
  
  const types = result.formAutocomplete.personalDataInputs.map(i => i.type);
  expect(types.includes("email")).toBeTruthy();
  expect(types.includes("tel")).toBeTruthy();
  expect(types.includes("name")).toBeTruthy();
  expect(types.includes("address")).toBeTruthy();
  expect(types.includes("postal")).toBeTruthy();
  expect(types.includes("city")).toBeTruthy();
  expect(types.includes("country")).toBeTruthy();
});

test("Integration - media analysis matches fixture expectations", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video1.mp4" controls>
          <track kind="captions" src="captions.vtt" />
        </video>
        <video src="video2.mp4" autoplay></video>
        <audio src="audio.mp3" controls></audio>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(2);
  expect(result.audios.length).toBe(1);
  
  // First video has captions and controls
  expect(result.videos[0].hasCaptions).toBe(true);
  expect(result.videos[0].controls).toBe(true);
  expect(result.videos[0].autoplay).toBe(false);
  
  // Second video has autoplay, no captions
  expect(result.videos[1].hasCaptions).toBe(false);
  expect(result.videos[1].autoplay).toBe(true);
  
  // Audio has controls
  expect(result.audios[0].controls).toBe(true);
});

test("Integration - ARIA live regions with various configurations", () => {
  const $ = cheerio.load(`
    <html>
      <body>
        <div aria-live="polite">Polite</div>
        <div aria-live="assertive" aria-atomic="true">Assertive</div>
        <div aria-live="off">Off</div>
        <div role="status">Status</div>
        <div role="alert">Alert</div>
        <div role="log">Log</div>
      </body>
    </html>
  `);
  
  const result = collectWCAGData($, "https://example.com");
  
  expect(result.ariaLiveRegions).toBeTruthy();
  expect(result.ariaLiveRegions.count).toBe(6);
  
  // Check explicit regions
  const polite = result.ariaLiveRegions.regions.find(r => r.live === 'polite' && !r.atomic);
  expect(polite).toBeTruthy();
  
  const assertive = result.ariaLiveRegions.regions.find(r => r.live === 'assertive' && r.atomic);
  expect(assertive).toBeTruthy();
  
  const off = result.ariaLiveRegions.regions.find(r => r.live === 'off');
  expect(off).toBeTruthy();
});
