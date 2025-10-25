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
import { test } from "node:test";
import { strict as assert } from "node:assert";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import { collectWCAGData } from "../../src/core/extractors/wcagData.js";
import { detectKeyboardTraps, detectSkipLinks, analyzeMediaElements, } from "../../src/core/extractors/runtimeAccessibility.js";
let browser = null;
let page = null;
// =============================================================================
// TEST LIFECYCLE
// =============================================================================
test.before(async () => {
    browser = await chromium.launch({ headless: true });
});
test.after(async () => {
    if (browser) {
        await browser.close();
    }
});
test.beforeEach(async () => {
    if (browser) {
        page = await browser.newPage();
    }
});
test.afterEach(async () => {
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
    assert.ok(result.ariaLiveRegions);
    assert.equal(result.ariaLiveRegions.count, 3);
    assert.ok(result.focusOrderAnalysis);
    assert.equal(result.focusOrderAnalysis.customTabIndexCount, 3);
    assert.equal(result.focusOrderAnalysis.positiveTabIndexElements.length, 1);
    assert.ok(result.formAutocomplete);
    assert.equal(result.formAutocomplete.totalForms, 1);
    assert.equal(result.formAutocomplete.personalDataInputs.length, 4);
});
test("Integration - static analysis works with empty page", () => {
    const $ = cheerio.load('<html><body></body></html>');
    const result = collectWCAGData($, "https://example.com");
    assert.ok(result.ariaLiveRegions);
    assert.equal(result.ariaLiveRegions.count, 0);
    assert.ok(result.focusOrderAnalysis);
    assert.equal(result.focusOrderAnalysis.customTabIndexCount, 0);
    assert.ok(result.formAutocomplete);
    assert.equal(result.formAutocomplete.totalForms, 0);
});
// =============================================================================
// RUNTIME ANALYSIS INTEGRATION
// =============================================================================
test("Integration - runtime functions work together", async () => {
    if (!page)
        throw new Error("Page not initialized");
    await page.setContent(COMPREHENSIVE_TEST_PAGE);
    // All runtime functions should execute without error
    const keyboardTraps = await detectKeyboardTraps(page);
    const skipLinks = await detectSkipLinks(page);
    const mediaElements = await analyzeMediaElements(page);
    assert.ok(keyboardTraps);
    assert.ok(typeof keyboardTraps.hasPotentialTraps === 'boolean');
    assert.ok(skipLinks);
    assert.ok(skipLinks.hasSkipLinks);
    assert.ok(skipLinks.links.length >= 2);
    assert.ok(mediaElements);
    assert.equal(mediaElements.videos.length, 1);
    assert.equal(mediaElements.audios.length, 1);
});
test("Integration - runtime functions handle empty page", async () => {
    if (!page)
        throw new Error("Page not initialized");
    await page.setContent('<html><body></body></html>');
    const keyboardTraps = await detectKeyboardTraps(page);
    const skipLinks = await detectSkipLinks(page);
    const mediaElements = await analyzeMediaElements(page);
    assert.equal(keyboardTraps.hasPotentialTraps, false);
    assert.equal(skipLinks.hasSkipLinks, false);
    assert.equal(mediaElements.videos.length, 0);
    assert.equal(mediaElements.audios.length, 0);
});
// =============================================================================
// DATA STRUCTURE VALIDATION
// =============================================================================
test("Integration - Phase 1 data structures are consistent", async () => {
    if (!page)
        throw new Error("Page not initialized");
    await page.setContent(COMPREHENSIVE_TEST_PAGE);
    // Static analysis
    const $ = cheerio.load(COMPREHENSIVE_TEST_PAGE);
    const staticData = collectWCAGData($, "https://example.com");
    // Runtime analysis
    const keyboardTraps = await detectKeyboardTraps(page);
    const skipLinks = await detectSkipLinks(page);
    const mediaElements = await analyzeMediaElements(page);
    // All Phase 1 features should have data
    assert.ok(staticData.ariaLiveRegions);
    assert.ok(staticData.focusOrderAnalysis);
    assert.ok(staticData.formAutocomplete);
    assert.ok(keyboardTraps);
    assert.ok(skipLinks);
    assert.ok(mediaElements);
    // Data types should be correct
    assert.equal(typeof staticData.ariaLiveRegions.count, 'number');
    assert.ok(Array.isArray(staticData.ariaLiveRegions.regions));
    assert.equal(typeof staticData.focusOrderAnalysis.customTabIndexCount, 'number');
    assert.ok(Array.isArray(staticData.focusOrderAnalysis.positiveTabIndexElements));
    assert.equal(typeof staticData.formAutocomplete.totalForms, 'number');
    assert.ok(Array.isArray(staticData.formAutocomplete.personalDataInputs));
    assert.equal(typeof keyboardTraps.hasPotentialTraps, 'boolean');
    assert.ok(Array.isArray(keyboardTraps.suspiciousElements));
    assert.equal(typeof skipLinks.hasSkipLinks, 'boolean');
    assert.ok(Array.isArray(skipLinks.links));
    assert.ok(Array.isArray(mediaElements.videos));
    assert.ok(Array.isArray(mediaElements.audios));
});
// =============================================================================
// CROSS-FEATURE VALIDATION
// =============================================================================
test("Integration - skip links static vs runtime comparison", async () => {
    if (!page)
        throw new Error("Page not initialized");
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
    assert.equal(skipLinks.hasSkipLinks, true);
    assert.equal(skipLinks.links.length, 2);
    assert.ok(skipLinks.links.every(l => l.targetExists));
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
    assert.ok(result.formAutocomplete);
    assert.equal(result.formAutocomplete.personalDataInputs.length, 7);
    const types = result.formAutocomplete.personalDataInputs.map(i => i.type);
    assert.ok(types.includes("email"));
    assert.ok(types.includes("tel"));
    assert.ok(types.includes("name"));
    assert.ok(types.includes("address"));
    assert.ok(types.includes("postal"));
    assert.ok(types.includes("city"));
    assert.ok(types.includes("country"));
});
test("Integration - media analysis matches fixture expectations", async () => {
    if (!page)
        throw new Error("Page not initialized");
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
    assert.equal(result.videos.length, 2);
    assert.equal(result.audios.length, 1);
    // First video has captions and controls
    assert.equal(result.videos[0].hasCaptions, true);
    assert.equal(result.videos[0].controls, true);
    assert.equal(result.videos[0].autoplay, false);
    // Second video has autoplay, no captions
    assert.equal(result.videos[1].hasCaptions, false);
    assert.equal(result.videos[1].autoplay, true);
    // Audio has controls
    assert.equal(result.audios[0].controls, true);
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
    assert.ok(result.ariaLiveRegions);
    assert.equal(result.ariaLiveRegions.count, 6);
    // Check explicit regions
    const polite = result.ariaLiveRegions.regions.find(r => r.live === 'polite' && !r.atomic);
    assert.ok(polite);
    const assertive = result.ariaLiveRegions.regions.find(r => r.live === 'assertive' && r.atomic);
    assert.ok(assertive);
    const off = result.ariaLiveRegions.regions.find(r => r.live === 'off');
    assert.ok(off);
});
// =============================================================================
// CROSS-FEATURE VALIDATION
// =============================================================================
test("Integration - skip links static vs runtime comparison", async () => {
    if (!page)
        throw new Error("Page not initialized");
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
    assert.equal(skipLinks.hasSkipLinks, true);
    assert.equal(skipLinks.links.length, 2);
    assert.ok(skipLinks.links.every(l => l.targetExists));
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
    assert.ok(result.formAutocomplete);
    assert.equal(result.formAutocomplete.personalDataInputs.length, 7);
    const types = result.formAutocomplete.personalDataInputs.map(i => i.type);
    assert.ok(types.includes("email"));
    assert.ok(types.includes("tel"));
    assert.ok(types.includes("name"));
    assert.ok(types.includes("address"));
    assert.ok(types.includes("postal"));
    assert.ok(types.includes("city"));
    assert.ok(types.includes("country"));
});
test("Integration - media analysis matches fixture expectations", async () => {
    if (!page)
        throw new Error("Page not initialized");
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
    assert.equal(result.videos.length, 2);
    assert.equal(result.audios.length, 1);
    // First video has captions and controls
    assert.equal(result.videos[0].hasCaptions, true);
    assert.equal(result.videos[0].controls, true);
    assert.equal(result.videos[0].autoplay, false);
    // Second video has autoplay, no captions
    assert.equal(result.videos[1].hasCaptions, false);
    assert.equal(result.videos[1].autoplay, true);
    // Audio has controls
    assert.equal(result.audios[0].controls, true);
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
    assert.ok(result.ariaLiveRegions);
    assert.equal(result.ariaLiveRegions.count, 6);
    // Check explicit regions
    const polite = result.ariaLiveRegions.regions.find(r => r.live === 'polite' && !r.atomic);
    assert.ok(polite);
    const assertive = result.ariaLiveRegions.regions.find(r => r.live === 'assertive' && r.atomic);
    assert.ok(assertive);
    const off = result.ariaLiveRegions.regions.find(r => r.live === 'off');
    assert.ok(off);
});
//# sourceMappingURL=integration.test.js.map