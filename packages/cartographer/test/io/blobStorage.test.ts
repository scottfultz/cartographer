/**
 * Copyright © 2025 Cai Frazier.
 * Blob Storage Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { BlobStorage } from '../../src/io/atlas/blobStorage.js';

describe('BlobStorage', () => {
  let tempDir: string;
  let blobStorage: BlobStorage;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await mkdtemp(join(tmpdir(), 'blob-storage-test-'));
    
    blobStorage = new BlobStorage({
      blobsDir: join(tempDir, 'blobs'),
      format: 'individual',
      deduplication: true,
    });
    
    await blobStorage.init();
  });
  
  afterEach(async () => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('Basic Storage', () => {
    test('stores HTML content and returns hash', async () => {
      const html = '<html><body>Test page</body></html>';
      
      const result = await blobStorage.store(html);
      
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.blob_ref).toMatch(/^sha256\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{64}$/);
      expect(result.deduplicated).toBe(false);
      expect(result.size_compressed).toBeGreaterThan(0);
      // Note: Very short content may not compress smaller due to overhead
    });
    
    test('stores Buffer content', async () => {
      const buffer = Buffer.from('Test content', 'utf-8');
      
      const result = await blobStorage.store(buffer);
      
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.deduplicated).toBe(false);
    });
    
    test('creates correct directory structure', async () => {
      const html = '<html><body>Test</body></html>';
      const result = await blobStorage.store(html);
      
      // Extract hash components
      const hash = result.hash;
      const first = hash.substring(0, 2);
      const second = hash.substring(2, 4);
      
      // Verify directory structure
      const expectedPath = join(tempDir, 'blobs', 'sha256', first, second, `${hash}.zst`);
      expect(existsSync(expectedPath)).toBe(true);
    });
  });
  
  describe('Deduplication', () => {
    test('stores identical HTML only once', async () => {
      const html = '<html><body>Identical content</body></html>';
      
      // Store same content twice
      const result1 = await blobStorage.store(html);
      const result2 = await blobStorage.store(html);
      
      expect(result1.hash).toBe(result2.hash);
      expect(result1.deduplicated).toBe(false);
      expect(result2.deduplicated).toBe(true);
      
      // Stats should show 1 unique blob, 1 dedup hit
      const stats = blobStorage.getStats();
      expect(stats.totalBlobs).toBe(1);
      expect(stats.deduplicationHits).toBe(1);
      expect(stats.totalStoreOperations).toBe(2);
      expect(stats.deduplicationRate).toBe(0.5); // 1 hit out of 2 operations
    });
    
    test('deduplicates 100 identical HTML bodies', async () => {
      const html = '<html><body>Repeated page</body></html>';
      
      // Store same content 100 times
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(await blobStorage.store(html));
      }
      
      // All should have same hash
      const hashes = new Set(results.map(r => r.hash));
      expect(hashes.size).toBe(1);
      
      // Only first should be non-deduplicated
      expect(results[0].deduplicated).toBe(false);
      expect(results.slice(1).every(r => r.deduplicated)).toBe(true);
      
      // Stats should show high deduplication
      const stats = blobStorage.getStats();
      expect(stats.totalBlobs).toBe(1);
      expect(stats.deduplicationHits).toBe(99);
      expect(stats.totalStoreOperations).toBe(100);
      expect(stats.deduplicationRate).toBe(0.99);
    });
    
    test('stores 100 unique HTML bodies', async () => {
      // Store 100 different pages
      const results = [];
      for (let i = 0; i < 100; i++) {
        const html = `<html><body>Unique page ${i}</body></html>`;
        results.push(await blobStorage.store(html));
      }
      
      // All should have different hashes
      const hashes = new Set(results.map(r => r.hash));
      expect(hashes.size).toBe(100);
      
      // None should be deduplicated
      expect(results.every(r => !r.deduplicated)).toBe(true);
      
      // Stats should show no deduplication
      const stats = blobStorage.getStats();
      expect(stats.totalBlobs).toBe(100);
      expect(stats.deduplicationHits).toBe(0);
      expect(stats.totalStoreOperations).toBe(100);
      expect(stats.deduplicationRate).toBe(0);
    });
    
    test('has() method works correctly', async () => {
      const html = '<html><body>Test</body></html>';
      const result = await blobStorage.store(html);
      
      expect(blobStorage.has(result.hash)).toBe(true);
      expect(blobStorage.has('0'.repeat(64))).toBe(false);
    });
  });
  
  describe('Blob Loading', () => {
    test('loads stored blob correctly', async () => {
      const html = '<html><body>Test page</body></html>';
      
      const result = await blobStorage.store(html);
      const loaded = await blobStorage.load(result.blob_ref);
      
      expect(loaded.toString('utf-8')).toBe(html);
    });
    
    test('loads large HTML correctly', async () => {
      // Create 1MB HTML
      const html = '<html><body>' + 'x'.repeat(1024 * 1024) + '</body></html>';
      
      const result = await blobStorage.store(html);
      const loaded = await blobStorage.load(result.blob_ref);
      
      expect(loaded.toString('utf-8')).toBe(html);
    });
    
    test('throws error for non-existent blob', async () => {
      await expect(
        blobStorage.load('sha256/00/00/0000000000000000000000000000000000000000000000000000000000000000')
      ).rejects.toThrow('Blob not found');
    });
  });
  
  describe('Compression', () => {
    test('compresses content effectively', async () => {
      // Create highly compressible content
      const html = '<html><body>' + 'a'.repeat(10000) + '</body></html>';
      
      const result = await blobStorage.store(html);
      
      // Compressed size should be much smaller
      const compressionRatio = result.size_compressed / html.length;
      expect(compressionRatio).toBeLessThan(0.1); // At least 90% compression for repetitive data
    });
  });
  
  describe('Statistics', () => {
    test('tracks statistics correctly', async () => {
      // Store 10 unique blobs
      for (let i = 0; i < 10; i++) {
        await blobStorage.store(`Content ${i}`);
      }
      
      // Store 5 duplicates
      await blobStorage.store('Content 0');
      await blobStorage.store('Content 0');
      await blobStorage.store('Content 1');
      await blobStorage.store('Content 1');
      await blobStorage.store('Content 2');
      
      const stats = blobStorage.getStats();
      expect(stats.totalBlobs).toBe(10);
      expect(stats.deduplicationHits).toBe(5);
      expect(stats.totalStoreOperations).toBe(15);
      expect(stats.deduplicationRate).toBeCloseTo(5 / 15, 2);
      expect(stats.totalBytesCompressed).toBeGreaterThan(0);
    });
  });
  
  describe('Directory Sharding', () => {
    test('distributes blobs across sharded directories', async () => {
      // Store 50 unique blobs (should spread across multiple directories)
      for (let i = 0; i < 50; i++) {
        await blobStorage.store(`Content ${i}`);
      }
      
      // Check that multiple shard directories were created
      const sha256Dir = join(tempDir, 'blobs', 'sha256');
      const firstLevel = await readdir(sha256Dir);
      
      // Should have at least 2 different first-level shards (statistically likely)
      expect(firstLevel.length).toBeGreaterThanOrEqual(2);
    });
  });
});
