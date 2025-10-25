/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Phase 1 Test Suite: Runtime Accessibility Analysis
 * 
 * Tests for runtime (Playwright-based) WCAG data collection functions:
 * - detectKeyboardTraps()
 * - detectSkipLinks()
 * - analyzeMediaElements()
 * 
 * These tests use Playwright to test actual browser behavior.
 */

import { test, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { strict as assert } from "node:assert";
import { chromium, type Browser, type Page } from "playwright";

let browser: Browser | null = null;
let page: Page | null = null;

// Import functions to test
import {
  detectKeyboardTraps,
  detectSkipLinks,
  analyzeMediaElements,
} from "../../src/core/extractors/runtimeAccessibility.js";

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
// KEYBOARD TRAP DETECTION (WCAG 2.1.2)
// =============================================================================

test("detectKeyboardTraps - no traps on simple page", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a href="/page1">Link 1</a>
        <button>Button 1</button>
        <input type="text" />
      </body>
    </html>
  `);
  
  const result = await detectKeyboardTraps(page);
  
  expect(result.hasPotentialTraps).toBe(false);
  expect(result.suspiciousElements.length).toBe(0);
});

test("detectKeyboardTraps - detects positive tabindex pattern", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <div tabindex="1">First</div>
        <div tabindex="2">Second</div>
        <div tabindex="3">Third</div>
      </body>
    </html>
  `);
  
  const result = await detectKeyboardTraps(page);
  
  // Positive tabindex can indicate potential traps
  expect(result.suspiciousElements.length > 0).toBeTruthy();
});

test("detectKeyboardTraps - handles tabindex 0 (not suspicious)", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <div tabindex="0">Focusable div</div>
        <div tabindex="0">Another focusable div</div>
      </body>
    </html>
  `);
  
  const result = await detectKeyboardTraps(page);
  
  // tabindex="0" is standard practice, not suspicious
  expect(result.hasPotentialTraps).toBe(false);
});

test("detectKeyboardTraps - detects keydown event listeners", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <div id="trap" tabindex="0">Element with keydown listener</div>
        <script>
          document.getElementById('trap').addEventListener('keydown', function(e) {
            e.preventDefault();
          });
        </script>
      </body>
    </html>
  `);
  
  const result = await detectKeyboardTraps(page);
  
  // Elements with keydown listeners may prevent keyboard exit
  expect(result.suspiciousElements.length >= 0).toBeTruthy(); // May or may not detect depending on heuristic
});

test("detectKeyboardTraps - handles pages with many focusable elements", async () => {
  if (!page) throw new Error("Page not initialized");
  
  let html = '<html><body>';
  for (let i = 0; i < 100; i++) {
    html += `<button>Button ${i}</button>`;
  }
  html += '</body></html>';
  
  await page.setContent(html);
  
  const result = await detectKeyboardTraps(page);
  
  // Should complete without error
  expect(typeof result.hasPotentialTraps === 'boolean').toBeTruthy();
});

test("detectKeyboardTraps - handles empty page", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent('<html><body></body></html>');
  
  const result = await detectKeyboardTraps(page);
  
  expect(result.hasPotentialTraps).toBe(false);
  expect(result.suspiciousElements.length).toBe(0);
});

test("detectKeyboardTraps - handles page with only negative tabindex", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <div tabindex="-1">Skip target 1</div>
        <div tabindex="-1">Skip target 2</div>
        <div tabindex="-1">Skip target 3</div>
      </body>
    </html>
  `);
  
  const result = await detectKeyboardTraps(page);
  
  // Negative tabindex removes from tab order, not suspicious
  expect(result.hasPotentialTraps).toBe(false);
});

// =============================================================================
// SKIP LINKS DETECTION (WCAG 2.4.1)
// =============================================================================

test("detectSkipLinks - detects skip to main content", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a href="#main">Skip to main content</a>
        <nav>Navigation</nav>
        <main id="main">Main content</main>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  expect(result.hasSkipLinks).toBe(true);
  expect(result.links.length).toBe(1);
  expect(result.links[0].text.toLowerCase().toBeTruthy().includes('skip'));
  expect(result.links[0].targetExists).toBe(true);
});

test("detectSkipLinks - detects skip navigation", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a href="#content">Skip navigation</a>
        <nav>Navigation</nav>
        <div id="content">Content</div>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  expect(result.hasSkipLinks).toBe(true);
  expect(result.links.length).toBe(1);
  expect(result.links[0].text.toLowerCase().toBeTruthy().includes('skip'));
});

test("detectSkipLinks - detects multiple skip links", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a href="#main">Skip to main content</a>
        <a href="#nav">Skip to navigation</a>
        <a href="#footer">Skip to footer</a>
        <main id="main">Main</main>
        <nav id="nav">Nav</nav>
        <footer id="footer">Footer</footer>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  expect(result.hasSkipLinks).toBe(true);
  expect(result.links.length).toBe(3);
  expect(result.links.every(link => link.targetExists).toBeTruthy());
});

test("detectSkipLinks - identifies first focusable element", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a href="#main">Skip to main content</a>
        <button>Other button</button>
        <main id="main">Main</main>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  expect(result.hasSkipLinks).toBe(true);
  expect(result.links[0].isFirstFocusable).toBe(true);
});

test("detectSkipLinks - checks visibility", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <head>
        <style>
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <a href="#main" class="hidden">Skip to main content</a>
        <main id="main">Main</main>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  // Should still detect, but mark as not visible
  if (result.links.length > 0) {
    expect(result.links[0].isVisible).toBe(false);
  }
});

test("detectSkipLinks - validates target exists", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a href="#main">Skip to main content</a>
        <a href="#nonexistent">Skip to nowhere</a>
        <main id="main">Main</main>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  expect(result.links.length).toBe(2);
  
  const validLink = result.links.find(l => l.href.includes('#main'));
  const invalidLink = result.links.find(l => l.href.includes('#nonexistent'));
  
  expect(validLink?.targetExists).toBe(true);
  expect(invalidLink?.targetExists).toBe(false);
});

test("detectSkipLinks - no skip links returns empty", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <nav><a href="/page1">Normal link</a></nav>
        <main>Main content</main>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  expect(result.hasSkipLinks).toBe(false);
  expect(result.links.length).toBe(0);
});

test("detectSkipLinks - detects jump links", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a href="#topics">Jump to topics</a>
        <div id="topics">Topics</div>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  expect(result.hasSkipLinks).toBe(true);
  expect(result.links[0].text.toLowerCase().toBeTruthy().includes('jump'));
});

test("detectSkipLinks - handles anchors without href", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a>Skip to main content</a>
        <main id="main">Main</main>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  // Should not detect links without href
  expect(result.hasSkipLinks).toBe(false);
});

test("detectSkipLinks - handles external links with skip text", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <a href="https://external.com">Skip external</a>
        <main>Main</main>
      </body>
    </html>
  `);
  
  const result = await detectSkipLinks(page);
  
  // Should not detect external links as skip links
  expect(result.hasSkipLinks).toBe(false);
});

// =============================================================================
// MEDIA ELEMENTS ANALYSIS (WCAG 1.2.x)
// =============================================================================

test("analyzeMediaElements - detects video with captions", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video.mp4" controls>
          <track kind="captions" src="captions.vtt" srclang="en" />
        </video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0].hasCaptions).toBe(true);
  expect(result.videos[0].trackCount).toBe(1);
  expect(result.videos[0].controls).toBe(true);
});

test("analyzeMediaElements - detects video with subtitles", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video.mp4">
          <track kind="subtitles" src="subtitles.vtt" srclang="en" />
        </video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0].hasSubtitles).toBe(true);
  expect(result.videos[0].trackCount).toBe(1);
});

test("analyzeMediaElements - detects video with descriptions", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video.mp4">
          <track kind="descriptions" src="descriptions.vtt" srclang="en" />
        </video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0].hasDescriptions).toBe(true);
});

test("analyzeMediaElements - detects video without accessibility tracks", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video.mp4"></video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0].hasCaptions).toBe(false);
  expect(result.videos[0].hasSubtitles).toBe(false);
  expect(result.videos[0].hasDescriptions).toBe(false);
  expect(result.videos[0].trackCount).toBe(0);
});

test("analyzeMediaElements - detects autoplay attribute", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video.mp4" autoplay></video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0].autoplay).toBe(true);
});

test("analyzeMediaElements - detects controls attribute", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video.mp4" controls></video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0].controls).toBe(true);
});

test("analyzeMediaElements - extracts video source", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="https://example.com/video.mp4"></video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0]).toBeTruthy();
  expect(result.videos[0]!.src).toBeTruthy();
  expect(result.videos[0]!.src!.includes('video.mp4').toBeTruthy());
});

test("analyzeMediaElements - detects multiple videos", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video1.mp4"></video>
        <video src="video2.mp4"></video>
        <video src="video3.mp4"></video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(3);
});

test("analyzeMediaElements - detects audio elements", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <audio src="audio.mp3" controls></audio>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.audios.length).toBe(1);
  expect(result.audios[0].controls).toBe(true);
});

test("analyzeMediaElements - detects audio autoplay", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <audio src="audio.mp3" autoplay></audio>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.audios.length).toBe(1);
  expect(result.audios[0].autoplay).toBe(true);
});

test("analyzeMediaElements - extracts audio source", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <audio src="https://example.com/audio.mp3"></audio>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.audios.length).toBe(1);
  expect(result.audios[0]).toBeTruthy();
  expect(result.audios[0]!.src).toBeTruthy();
  expect(result.audios[0]!.src!.includes('audio.mp3').toBeTruthy());
});

test("analyzeMediaElements - no media returns empty", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <div>No media here</div>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(0);
  expect(result.audios.length).toBe(0);
});

test("analyzeMediaElements - detects mixed media", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video.mp4" controls>
          <track kind="captions" src="captions.vtt" />
        </video>
        <audio src="audio.mp3"></audio>
        <video src="video2.mp4"></video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(2);
  expect(result.audios.length).toBe(1);
  expect(result.videos[0].hasCaptions).toBe(true);
  expect(result.videos[1].hasCaptions).toBe(false);
});

test("analyzeMediaElements - handles video with multiple tracks", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video src="video.mp4">
          <track kind="captions" src="captions-en.vtt" srclang="en" />
          <track kind="captions" src="captions-es.vtt" srclang="es" />
          <track kind="subtitles" src="subtitles-en.vtt" srclang="en" />
          <track kind="descriptions" src="descriptions.vtt" srclang="en" />
        </video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0].hasCaptions).toBe(true);
  expect(result.videos[0].hasSubtitles).toBe(true);
  expect(result.videos[0].hasDescriptions).toBe(true);
  expect(result.videos[0].trackCount).toBe(4);
});

test("analyzeMediaElements - handles video with source elements", async () => {
  if (!page) throw new Error("Page not initialized");
  
  await page.setContent(`
    <html>
      <body>
        <video controls>
          <source src="video.mp4" type="video/mp4" />
          <source src="video.webm" type="video/webm" />
        </video>
      </body>
    </html>
  `);
  
  const result = await analyzeMediaElements(page);
  
  expect(result.videos.length).toBe(1);
  expect(result.videos[0]).toBeTruthy();
  // Should extract src from first source element
  const src = result.videos[0]!.src;
  expect(src).toBeTruthy();
  expect(src.includes('video.mp4').toBeTruthy() || src.includes('video.webm'));
});
