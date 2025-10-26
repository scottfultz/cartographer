/**
 * Copyright © 2025 Cai Frazier.
 * Dataset Writer Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { z } from 'zod';
import { decompress } from '@mongodb-js/zstd';
import { DatasetWriter } from '../../src/io/atlas/datasetWriter.js';

// Test schema
const TestRecordSchema = z.object({
  id: z.string(),
  value: z.number(),
  name: z.string(),
});

type TestRecord = z.infer<typeof TestRecordSchema>;

describe('DatasetWriter', () => {
  let tempDir: string;
  let writer: DatasetWriter<TestRecord>;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dataset-writer-test-'));
  });
  
  afterEach(async () => {
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('Basic Writing', () => {
    test('writes records with versioned filename', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
      });
      
      await writer.init();
      
      await writer.write({ id: '1', value: 100, name: 'Test' });
      await writer.write({ id: '2', value: 200, name: 'Test2' });
      
      const metadata = await writer.finalize();
      
      expect(metadata.name).toBe('test');
      expect(metadata.version).toBe('v1');
      expect(metadata.record_count).toBe(2);
      expect(metadata.schema_uri).toBe('schemas/test.v1.schema.json');
      expect(metadata.hash_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata.parts.length).toBe(1);
      expect(metadata.parts[0]).toMatch(/^data\/test\.v1_part_001\.jsonl\.zst$/);
    });
    
    test('validates records against schema', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
      });
      
      await writer.init();
      
      // Valid record should work
      await expect(writer.write({ id: '1', value: 100, name: 'Test' })).resolves.not.toThrow();
      
      // Invalid record should throw
      await expect(
        writer.write({ id: '1', value: 'not a number', name: 'Test' } as any)
      ).rejects.toThrow();
    });
    
    test('compresses output with Zstandard', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
      });
      
      await writer.init();
      
      // Write 100 records with repetitive data
      for (let i = 0; i < 100; i++) {
        await writer.write({ id: String(i), value: 100, name: 'Repeated' });
      }
      
      const metadata = await writer.finalize();
      
      // Read compressed file
      const compressedPath = join(tempDir, metadata.parts[0]);
      const compressed = await readFile(compressedPath);
      
      // Decompress to verify
      const decompressed = await decompress(compressed);
      const lines = Buffer.from(decompressed).toString('utf-8').trim().split('\n');
      
      expect(lines.length).toBe(100);
      expect(JSON.parse(lines[0])).toEqual({ id: '0', value: 100, name: 'Repeated' });
      
      // Compression should be effective (at least 50% for repetitive data)
      expect(compressed.length).toBeLessThan(decompressed.length * 0.5);
    });
  });
  
  describe('Part Rotation', () => {
    test('rotates to new part at size threshold', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
        maxPartBytes: 1024, // 1KB threshold for testing
      });
      
      await writer.init();
      
      // Write records until we exceed threshold
      // Each record is ~40 bytes, so 30 records = ~1200 bytes
      for (let i = 0; i < 30; i++) {
        await writer.write({ 
          id: String(i), 
          value: i * 1000, 
          name: 'Test record with some content' 
        });
      }
      
      expect(writer.getPartCount()).toBeGreaterThan(1);
      
      const metadata = await writer.finalize();
      
      // Should have multiple parts
      expect(metadata.parts.length).toBeGreaterThan(1);
      expect(metadata.parts[0]).toMatch(/test\.v1_part_001\.jsonl\.zst$/);
      expect(metadata.parts[1]).toMatch(/test\.v1_part_002\.jsonl\.zst$/);
      
      // Total record count should still be 30
      expect(metadata.record_count).toBe(30);
    });
    
    test('part filenames use zero-padded numbers', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
        maxPartBytes: 500, // Small threshold
      });
      
      await writer.init();
      
      // Force creation of multiple parts
      for (let i = 0; i < 50; i++) {
        await writer.write({ 
          id: String(i), 
          value: i, 
          name: 'x'.repeat(50) 
        });
      }
      
      const metadata = await writer.finalize();
      
      // Check that all parts use 3-digit padding
      for (const part of metadata.parts) {
        expect(part).toMatch(/test\.v1_part_\d{3}\.jsonl\.zst$/);
      }
    });
  });
  
  describe('Data Integrity', () => {
    test('computes correct SHA-256 hash', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
      });
      
      await writer.init();
      
      await writer.write({ id: '1', value: 100, name: 'Test' });
      
      const metadata = await writer.finalize();
      
      // Hash should be deterministic
      expect(metadata.hash_sha256).toMatch(/^[a-f0-9]{64}$/);
      
      // Same data should produce same hash
      const writer2 = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: await mkdtemp(join(tmpdir(), 'dataset-writer-test2-')),
        schema: TestRecordSchema,
      });
      
      await writer2.init();
      await writer2.write({ id: '1', value: 100, name: 'Test' });
      const metadata2 = await writer2.finalize();
      
      expect(metadata2.hash_sha256).toBe(metadata.hash_sha256);
    });
    
    test('deletes uncompressed JSONL after compression', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
      });
      
      await writer.init();
      await writer.write({ id: '1', value: 100, name: 'Test' });
      await writer.finalize();
      
      // Check data directory
      const dataDir = join(tempDir, 'data');
      const files = await readdir(dataDir);
      
      // Should only have .zst files, no .jsonl
      expect(files.every(f => f.endsWith('.zst'))).toBe(true);
      expect(files.some(f => f.endsWith('.jsonl') && !f.endsWith('.jsonl.zst'))).toBe(false);
    });
  });
  
  describe('Record Counting', () => {
    test('tracks record count correctly', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
      });
      
      await writer.init();
      
      expect(writer.getRecordCount()).toBe(0);
      
      for (let i = 0; i < 100; i++) {
        await writer.write({ id: String(i), value: i, name: `Record ${i}` });
      }
      
      expect(writer.getRecordCount()).toBe(100);
      
      const metadata = await writer.finalize();
      expect(metadata.record_count).toBe(100);
    });
  });
  
  describe('Large Dataset Handling', () => {
    test('handles 1000 records efficiently', async () => {
      writer = new DatasetWriter({
        name: 'test',
        version: 'v1',
        schemaUri: 'schemas/test.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
      });
      
      await writer.init();
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        await writer.write({ 
          id: String(i), 
          value: i * 1000, 
          name: `Test record ${i}` 
        });
      }
      
      const metadata = await writer.finalize();
      const duration = Date.now() - startTime;
      
      expect(metadata.record_count).toBe(1000);
      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
    });
  });
  
  describe('Metadata Output', () => {
    test('returns complete metadata structure', async () => {
      writer = new DatasetWriter({
        name: 'pages',
        version: 'v1',
        schemaUri: 'schemas/pages.v1.schema.json',
        stagingDir: tempDir,
        schema: TestRecordSchema,
      });
      
      await writer.init();
      await writer.write({ id: '1', value: 100, name: 'Test' });
      
      const metadata = await writer.finalize();
      
      // Check all required fields
      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('record_count');
      expect(metadata).toHaveProperty('bytes_compressed');
      expect(metadata).toHaveProperty('hash_sha256');
      expect(metadata).toHaveProperty('schema_uri');
      expect(metadata).toHaveProperty('parts');
      
      // Check types
      expect(typeof metadata.name).toBe('string');
      expect(typeof metadata.version).toBe('string');
      expect(typeof metadata.record_count).toBe('number');
      expect(typeof metadata.bytes_compressed).toBe('number');
      expect(typeof metadata.hash_sha256).toBe('string');
      expect(typeof metadata.schema_uri).toBe('string');
      expect(Array.isArray(metadata.parts)).toBe(true);
    });
  });
});
