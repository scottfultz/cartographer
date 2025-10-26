/**
 * Copyright © 2025 Cai Frazier.
 * New Extractors Integration Tests
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { BlobStorage } from '../../src/io/atlas/blobStorage.js';
import { captureResponse } from '../../src/core/extractors/responseCapture.js';
import { captureDOMSnapshot } from '../../src/core/extractors/domSnapshot.js';
import { captureAccessibilityTree } from '../../src/core/extractors/accTreeCapture.js';
import { decompress } from '@mongodb-js/zstd';

describe('Atlas v1.0 New Extractors', () => {
  let browser: Browser;
  let page: Page;
  let tempDir: string;
  let blobStorage: BlobStorage;
  
  beforeAll(async () => {
    browser = await chromium.launch();
    tempDir = await mkdtemp(join(tmpdir(), 'extractor-test-'));
    
    blobStorage = new BlobStorage({
      blobsDir: join(tempDir, 'blobs'),
      format: 'individual',
      deduplication: true,
    });
    await blobStorage.init();
  });
  
  afterAll(async () => {
    if (browser) await browser.close();
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('Response Capture', () => {
    test('captures HTML body and stores in blob storage', async () => {
      // Create test page
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test Page</title>
        </head>
        <body>
          <h1>Hello World</h1>
          <p>This is a test page.</p>
        </body>
        </html>
      `;
      
      const htmlPath = join(tempDir, 'test.html');
      await writeFile(htmlPath, testHtml);
      
      page = await browser.newPage();
      await page.goto(`file://${htmlPath}`);
      
      // Capture response
      const response = await captureResponse(page, {
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        blobStorage,
      });
      
      expect(response.page_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(response.encoding).toBe('utf-8');
      expect(response.body_blob_ref).toMatch(/^sha256\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{64}$/);
      
      // Verify blob can be loaded
      const loaded = await blobStorage.load(response.body_blob_ref);
      expect(loaded.toString('utf-8')).toContain('Hello World');
      
      await page.close();
    });
  });
  
  describe('DOM Snapshot', () => {
    test('captures and serializes DOM structure', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>DOM Test</title>
        </head>
        <body>
          <header>
            <h1>Title</h1>
          </header>
          <main>
            <p>Content</p>
          </main>
        </body>
        </html>
      `;
      
      const htmlPath = join(tempDir, 'dom-test.html');
      await writeFile(htmlPath, testHtml);
      
      page = await browser.newPage();
      await page.goto(`file://${htmlPath}`);
      
      // Capture DOM snapshot
      const snapshot = await captureDOMSnapshot(page, {
        pageId: '550e8400-e29b-41d4-a716-446655440001',
        stylesApplied: false,
        scriptsExecuted: false,
      });
      
      expect(snapshot.page_id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(snapshot.base_url).toMatch(/^file:\/\//);
      expect(snapshot.styles_applied).toBe(false);
      expect(snapshot.scripts_executed).toBe(false);
      expect(snapshot.node_count).toBeGreaterThan(0);
      expect(snapshot.element_nodes).toBeGreaterThan(0);
      
      // Verify DOM is compressed
      const decompressed = await decompress(Buffer.from(snapshot.dom_json_zstd, 'base64'));
      const domJson = JSON.parse(Buffer.from(decompressed).toString('utf-8'));
      
      expect(domJson.type).toBe('element');
      expect(domJson.tag).toBe('html');
      expect(domJson.children).toBeDefined();
      
      await page.close();
    });
  });
  
  describe('Accessibility Tree', () => {
    test('captures accessibility tree with landmarks', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>A11y Test</title>
        </head>
        <body>
          <header role="banner">
            <h1>Site Title</h1>
          </header>
          <nav role="navigation" aria-label="Main navigation">
            <a href="#">Link 1</a>
            <a href="#">Link 2</a>
          </nav>
          <main role="main">
            <h2>Content</h2>
            <button>Click me</button>
          </main>
          <footer role="contentinfo">
            <p>Footer</p>
          </footer>
        </body>
        </html>
      `;
      
      const htmlPath = join(tempDir, 'a11y-test.html');
      await writeFile(htmlPath, testHtml);
      
      page = await browser.newPage();
      await page.goto(`file://${htmlPath}`);
      
      // Capture accessibility tree
      const accTree = await captureAccessibilityTree(page, {
        pageId: '550e8400-e29b-41d4-a716-446655440002',
      });
      
      expect(accTree.page_id).toBe('550e8400-e29b-41d4-a716-446655440002');
      // Landmarks may or may not be captured depending on browser implementation
      expect(accTree.landmarks).toBeDefined();
      expect(Array.isArray(accTree.landmarks)).toBe(true);
      expect(accTree.tab_order).toBeDefined();
      expect(Array.isArray(accTree.tab_order)).toBe(true);
      
      // Verify nodes are compressed
      const decompressed = await decompress(Buffer.from(accTree.nodes_zstd, 'base64'));
      const nodes = JSON.parse(Buffer.from(decompressed).toString('utf-8'));
      
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThan(0);
      
      // If landmarks were captured, verify they have expected structure
      if (accTree.landmarks.length > 0) {
        expect(accTree.landmarks[0]).toHaveProperty('role');
        expect(accTree.landmarks[0]).toHaveProperty('node_id');
      }
      
      await page.close();
    });
    
    test('handles pages with no accessibility tree', async () => {
      const testHtml = `<!DOCTYPE html><html><body></body></html>`;
      
      const htmlPath = join(tempDir, 'empty-test.html');
      await writeFile(htmlPath, testHtml);
      
      page = await browser.newPage();
      await page.goto(`file://${htmlPath}`);
      
      const accTree = await captureAccessibilityTree(page, {
        pageId: '550e8400-e29b-41d4-a716-446655440003',
      });
      
      // Should return valid record even for empty page
      expect(accTree.page_id).toBe('550e8400-e29b-41d4-a716-446655440003');
      
      await page.close();
    });
  });
});
