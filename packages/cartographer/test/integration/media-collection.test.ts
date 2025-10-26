/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Integration test: Verify media collection (screenshots, favicons) in full mode
 * 
 * This test suite prevents regression of media capture functionality discovered
 * during biaofolympia.com crawl validation.
 * 
 * Issue History:
 * - Date: October 26, 2025
 * - Problem: Full mode crawl completed but media field was missing from all PageRecords
 * - Symptoms: 
 *   - Staging folders (media/screenshots/desktop, mobile, favicons) were empty
 *   - Page records missing the `media` field entirely
 *   - Manifest correctly showed renderModes: ["full"], specLevel: 3
 * - Expected: Screenshots (desktop + mobile) and favicons should be captured and stored
 * - Impact: Full mode was functionally equivalent to prerender mode
 * 
 * Test Coverage:
 * - Raw mode: No media field (expected)
 * - Prerender mode: No media field (expected)
 * - Full mode: Media field with screenshots and favicons (REQUIRED)
 */

import { describe, it, expect, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { openAtlas } from "@atlas/sdk";
import { Cartographer } from "../../src/engine/cartographer.js";
import { buildConfig } from "../../src/core/config.js";
import { baseTestConfig } from "../helpers/testConfig.js";

const testArchives = {
  raw: "./tmp/media-test-raw.atls",
  prerender: "./tmp/media-test-prerender.atls",
  full: "./tmp/media-test-full.atls",
};

afterAll(async () => {
  // Clean up test archives
  for (const archive of Object.values(testArchives)) {
    try {
      await fs.unlink(archive);
    } catch {
      // Ignore if file doesn't exist
    }
  }
});

describe("Media Collection - Raw Mode", { timeout: 60000 }, () => {
  
  it("should NOT have media field in raw mode (HTTP only, no rendering)", async () => {
    await fs.mkdir("./tmp", { recursive: true });

    const config = buildConfig({
      ...baseTestConfig,
      seeds: ["https://example.com"],
      outAtls: testArchives.raw,
      maxPages: 1,
      maxDepth: 0,
      checkpoint: { enabled: false, interval: 0 },
      render: { 
        mode: "raw", 
        concurrency: 1, 
        timeoutMs: 15000,
        maxRequestsPerPage: 100,
        maxBytesPerPage: 10485760
      },
      http: { rps: 2, userAgent: "CartographerTest/1.0" },
    });

    const cart = new Cartographer();
    await cart.start(config);

    // Verify manifest
    const atlas = await openAtlas(testArchives.raw);
    const manifest = atlas.manifest;
    
    expect(manifest.capabilities?.renderModes).toEqual(["raw"]);
    expect(manifest.capabilities?.modesUsed).toEqual(["raw"]);
    expect(manifest.capabilities?.specLevel).toBe(1);
    
    console.log("✓ Manifest: Raw mode (specLevel 1)");

    // Check page records
    let pageChecked = false;
    for await (const page of atlas.readers.pages()) {
      // Raw mode should NOT have media field
      expect(page.media).toBeUndefined();
      console.log("✓ No media field in raw mode (expected behavior)");
      
      pageChecked = true;
      break;
    }

    expect(pageChecked).toBe(true);
  });
});

describe("Media Collection - Prerender Mode", { timeout: 60000 }, () => {
  
  it("should NOT have media field in prerender mode (rendering but no screenshots)", async () => {
    await fs.mkdir("./tmp", { recursive: true });

    const config = buildConfig({
      ...baseTestConfig,
      seeds: ["https://example.com"],
      outAtls: testArchives.prerender,
      maxPages: 1,
      maxDepth: 0,
      checkpoint: { enabled: false, interval: 0 },
      render: { 
        mode: "prerender", 
        concurrency: 1, 
        timeoutMs: 15000,
        maxRequestsPerPage: 100,
        maxBytesPerPage: 10485760
      },
      http: { rps: 2, userAgent: "CartographerTest/1.0" },
    });

    const cart = new Cartographer();
    await cart.start(config);

    // Verify manifest
    const atlas = await openAtlas(testArchives.prerender);
    const manifest = atlas.manifest;
    
    expect(manifest.capabilities?.renderModes).toEqual(["prerender"]);
    expect(manifest.capabilities?.modesUsed).toEqual(["prerender"]);
    expect(manifest.capabilities?.specLevel).toBe(2);
    
    console.log("✓ Manifest: Prerender mode (specLevel 2)");

    // Check page records
    let pageChecked = false;
    for await (const page of atlas.readers.pages()) {
      // Prerender mode should NOT have media field
      expect(page.media).toBeUndefined();
      console.log("✓ No media field in prerender mode (expected behavior)");
      
      pageChecked = true;
      break;
    }

    expect(pageChecked).toBe(true);
  });
});

describe("Media Collection - Full Mode (CRITICAL)", { timeout: 60000 }, () => {
  
  it("should have media field with screenshots and favicon in full mode", async () => {
    await fs.mkdir("./tmp", { recursive: true });

    const config = buildConfig({
      ...baseTestConfig,
      seeds: ["https://example.com"],
      outAtls: testArchives.full,
      maxPages: 1,
      maxDepth: 0,
      checkpoint: { enabled: false, interval: 0 },
      render: { 
        mode: "full", 
        concurrency: 1, 
        timeoutMs: 15000,
        maxRequestsPerPage: 100,
        maxBytesPerPage: 10485760
      },
      http: { rps: 2, userAgent: "CartographerTest/1.0" },
    });

    const cart = new Cartographer();
    await cart.start(config);

    // Verify manifest
    const atlas = await openAtlas(testArchives.full);
    const manifest = atlas.manifest;
    
    expect(manifest.capabilities?.renderModes).toEqual(["full"]);
    expect(manifest.capabilities?.modesUsed).toEqual(["full"]);
    expect(manifest.capabilities?.specLevel).toBe(3);
    
    console.log("✓ Manifest: Full mode (specLevel 3)");

    // Check page records - THIS IS THE CRITICAL TEST
    let pageChecked = false;
    for await (const page of atlas.readers.pages()) {
      expect(page.url).toBe("https://example.com/");

      // ========== CRITICAL: MEDIA FIELD MUST BE PRESENT ==========
      expect(page.media, "media field MUST be defined in full mode").toBeDefined();
      expect(typeof page.media, "media must be an object").toBe("object");
      
      console.log("✓ Media field is present");

      // ========== SCREENSHOTS VALIDATION ==========
      expect(page.media!.screenshots, "screenshots object must be defined").toBeDefined();
      expect(typeof page.media!.screenshots, "screenshots must be an object").toBe("object");
      
      // Desktop screenshot
      expect(page.media!.screenshots!.desktop, "desktop screenshot must be defined").toBeDefined();
      expect(typeof page.media!.screenshots!.desktop, "desktop screenshot must be a string").toBe("string");
      expect(page.media!.screenshots!.desktop!.length, "desktop screenshot must not be empty").toBeGreaterThan(0);
      
      console.log(`  ✓ Desktop screenshot: ${page.media!.screenshots!.desktop!.substring(0, 50)}... (${page.media!.screenshots!.desktop!.length} chars)`);
      
      // Mobile screenshot
      expect(page.media!.screenshots!.mobile, "mobile screenshot must be defined").toBeDefined();
      expect(typeof page.media!.screenshots!.mobile, "mobile screenshot must be a string").toBe("string");
      expect(page.media!.screenshots!.mobile!.length, "mobile screenshot must not be empty").toBeGreaterThan(0);
      
      console.log(`  ✓ Mobile screenshot: ${page.media!.screenshots!.mobile!.substring(0, 50)}... (${page.media!.screenshots!.mobile!.length} chars)`);

      // Verify screenshots are base64-encoded PNGs or file paths
      const desktopIsBase64 = page.media!.screenshots!.desktop!.startsWith("data:image/png;base64,");
      const desktopIsPath = page.media!.screenshots!.desktop!.startsWith("screenshots/desktop/");
      expect(desktopIsBase64 || desktopIsPath, "desktop screenshot must be base64 PNG or file path").toBe(true);
      
      const mobileIsBase64 = page.media!.screenshots!.mobile!.startsWith("data:image/png;base64,");
      const mobileIsPath = page.media!.screenshots!.mobile!.startsWith("screenshots/mobile/");
      expect(mobileIsBase64 || mobileIsPath, "mobile screenshot must be base64 PNG or file path").toBe(true);
      
      console.log(`  ✓ Desktop format: ${desktopIsBase64 ? "base64" : "file path"}`);
      console.log(`  ✓ Mobile format: ${mobileIsBase64 ? "base64" : "file path"}`);

      // ========== FAVICON VALIDATION ==========
      expect(page.media!.favicon, "favicon must be defined").toBeDefined();
      expect(typeof page.media!.favicon, "favicon must be a string").toBe("string");
      expect(page.media!.favicon!.length, "favicon must not be empty").toBeGreaterThan(0);
      
      console.log(`  ✓ Favicon: ${page.media!.favicon!.substring(0, 50)}... (${page.media!.favicon!.length} chars)`);

      // Verify favicon is base64-encoded or file path
      const faviconIsBase64 = page.media!.favicon!.startsWith("data:image/");
      const faviconIsPath = page.media!.favicon!.startsWith("favicons/");
      expect(faviconIsBase64 || faviconIsPath, "favicon must be base64 or file path").toBe(true);
      
      console.log(`  ✓ Favicon format: ${faviconIsBase64 ? "base64" : "file path"}`);

      // ========== TEST PASSED ==========
      console.log("✅ All media fields present and valid in full mode");
      
      pageChecked = true;
      break;
    }

    expect(pageChecked, "At least one page should have been checked").toBe(true);
  });
});

describe("Media Collection - Multi-Page Full Mode", { timeout: 120000 }, () => {
  
  it("should collect media for all pages in full mode crawl", async () => {
    await fs.mkdir("./tmp", { recursive: true });

    const multiPageArchive = "./tmp/media-test-multipage.atls";

    const config = buildConfig({
      ...baseTestConfig,
      seeds: ["https://example.com"],
      outAtls: multiPageArchive,
      maxPages: 3, // Crawl 3 pages
      maxDepth: 1, // Homepage + linked pages
      checkpoint: { enabled: false, interval: 0 },
      render: { 
        mode: "full", 
        concurrency: 2, 
        timeoutMs: 15000,
        maxRequestsPerPage: 100,
        maxBytesPerPage: 10485760
      },
      http: { rps: 2, userAgent: "CartographerTest/1.0" },
    });

    const cart = new Cartographer();
    await cart.start(config);

    const atlas = await openAtlas(multiPageArchive);
    const manifest = atlas.manifest;
    
    expect(manifest.capabilities?.renderModes).toEqual(["full"]);
    
    let pagesChecked = 0;
    let pagesWithMedia = 0;

    for await (const page of atlas.readers.pages()) {
      pagesChecked++;
      
      // Every page in full mode must have media
      if (page.media) {
        pagesWithMedia++;
        
        // Quick validation
        expect(page.media.screenshots).toBeDefined();
        expect(page.media.screenshots!.desktop).toBeDefined();
        expect(page.media.screenshots!.mobile).toBeDefined();
        expect(page.media.favicon).toBeDefined();
        
        console.log(`✓ Page ${pagesChecked}: ${page.url} has complete media`);
      } else {
        console.error(`❌ Page ${pagesChecked}: ${page.url} MISSING media field!`);
      }
    }

    console.log(`\n📊 Media collection summary: ${pagesWithMedia}/${pagesChecked} pages with media`);
    
    expect(pagesChecked, "Should have crawled pages").toBeGreaterThan(0);
    expect(pagesWithMedia, "All pages must have media in full mode").toBe(pagesChecked);
    expect(pagesWithMedia / pagesChecked, "100% media coverage required").toBe(1);

    // Clean up
    try {
      await fs.unlink(multiPageArchive);
    } catch {
      // Ignore
    }
  });
});

describe("Media Collection - Size Validation", { timeout: 60000 }, () => {
  
  it("should have reasonable screenshot sizes (not empty, not excessive)", async () => {
    await fs.mkdir("./tmp", { recursive: true });

    const config = buildConfig({
      ...baseTestConfig,
      seeds: ["https://example.com"],
      outAtls: testArchives.full,
      maxPages: 1,
      maxDepth: 0,
      checkpoint: { enabled: false, interval: 0 },
      render: { 
        mode: "full", 
        concurrency: 1, 
        timeoutMs: 15000,
        maxRequestsPerPage: 100,
        maxBytesPerPage: 10485760
      },
      http: { rps: 2, userAgent: "CartographerTest/1.0" },
    });

    const cart = new Cartographer();
    await cart.start(config);

    const atlas = await openAtlas(testArchives.full);

    for await (const page of atlas.readers.pages()) {
      expect(page.media).toBeDefined();
      
      // Size checks for base64-encoded data
      if (page.media!.screenshots!.desktop!.startsWith("data:image/png;base64,")) {
        const desktopBase64 = page.media!.screenshots!.desktop!.split(",")[1];
        const desktopBytes = Buffer.from(desktopBase64, "base64").length;
        
        // Desktop screenshot should be between 10KB and 500KB
        expect(desktopBytes, "Desktop screenshot too small (likely corrupt)").toBeGreaterThan(10000);
        expect(desktopBytes, "Desktop screenshot too large (compression issue?)").toBeLessThan(500000);
        
        console.log(`✓ Desktop screenshot size: ${(desktopBytes / 1024).toFixed(1)} KB`);
      }
      
      if (page.media!.screenshots!.mobile!.startsWith("data:image/png;base64,")) {
        const mobileBase64 = page.media!.screenshots!.mobile!.split(",")[1];
        const mobileBytes = Buffer.from(mobileBase64, "base64").length;
        
        // Mobile screenshot should be between 5KB and 300KB
        expect(mobileBytes, "Mobile screenshot too small (likely corrupt)").toBeGreaterThan(5000);
        expect(mobileBytes, "Mobile screenshot too large (compression issue?)").toBeLessThan(300000);
        
        console.log(`✓ Mobile screenshot size: ${(mobileBytes / 1024).toFixed(1)} KB`);
      }
      
      if (page.media!.favicon!.startsWith("data:image/")) {
        const faviconBase64 = page.media!.favicon!.split(",")[1];
        const faviconBytes = Buffer.from(faviconBase64, "base64").length;
        
        // Favicon should be between 100 bytes and 50KB
        expect(faviconBytes, "Favicon too small (likely corrupt)").toBeGreaterThan(100);
        expect(faviconBytes, "Favicon too large (not optimized?)").toBeLessThan(50000);
        
        console.log(`✓ Favicon size: ${(faviconBytes / 1024).toFixed(1)} KB`);
      }
      
      break;
    }
  });
});

describe("Media Collection - Documentation", () => {
  it("should document expected media field structure", () => {
    const expectedFullModeStructure = {
      url: "https://example.com/",
      // ... other fields ...
      media: {
        screenshots: {
          // Base64 PNG or file path
          desktop: "data:image/png;base64,iVBORw0KGgoAAAANS...", // or "screenshots/desktop/abc123.png"
          mobile: "data:image/png;base64,iVBORw0KGgoAAAANS...", // or "screenshots/mobile/abc123.png"
        },
        // Base64 image or file path
        favicon: "data:image/png;base64,iVBORw0KGgoAAAANS...", // or "favicons/def456.png"
      },
    };

    expect(expectedFullModeStructure.media).toBeDefined();
    expect(expectedFullModeStructure.media.screenshots).toBeDefined();
    expect(expectedFullModeStructure.media.screenshots.desktop).toBeDefined();
    expect(expectedFullModeStructure.media.screenshots.mobile).toBeDefined();
    expect(expectedFullModeStructure.media.favicon).toBeDefined();

    console.log("📋 Full mode page record structure:");
    console.log("  ✓ media.screenshots.desktop (base64 PNG or file path)");
    console.log("  ✓ media.screenshots.mobile (base64 PNG or file path)");
    console.log("  ✓ media.favicon (base64 image or file path)");
    console.log("\n📋 Mode behavior:");
    console.log("  ✓ Raw mode (specLevel 1): No media field");
    console.log("  ✓ Prerender mode (specLevel 2): No media field");
    console.log("  ✓ Full mode (specLevel 3): media field REQUIRED");
  });
});
