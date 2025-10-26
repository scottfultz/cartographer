/**
 * Copyright © 2025 Cai Frazier.
 * DatasetWriter Integration Test with Atlas v1.0 Schemas
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { DatasetWriter } from '../../src/io/atlas/datasetWriter.js';
import { PageRecordV1Schema, type PageRecordV1 } from '@atlas/spec';

describe('DatasetWriter with Atlas v1.0 Schemas', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dataset-integration-test-'));
  });
  
  afterEach(async () => {
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  
  test('writes PageRecordV1 with schema validation', async () => {
    const writer = new DatasetWriter<PageRecordV1>({
      name: 'pages',
      version: 'v1',
      schemaUri: 'schemas/pages.v1.schema.json',
      stagingDir: tempDir,
      schema: PageRecordV1Schema,
    });
    
    await writer.init();
    
    // Write valid page records
    const page1: PageRecordV1 = {
      page_id: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com/page1',
      normalized_url: 'https://example.com/page1',
      final_url: 'https://example.com/page1',
      http_status: 200,
      response_time_ms: 150,
      size_bytes: 5000,
      content_type: 'text/html',
      hash_body_sha256: 'a'.repeat(64),
      body_blob_ref: 'sha256/aa/aa/aaaa',
      group_key: 'example.com',
      discovery_source: 'seed',
      depth: 0,
      robots_decision: 'allow',
      noindex_hint: false,
      timestamp_captured: '2025-10-26T14:00:00Z',
    };
    
    const page2: PageRecordV1 = {
      page_id: '550e8400-e29b-41d4-a716-446655440001',
      url: 'https://example.com/page2',
      normalized_url: 'https://example.com/page2',
      final_url: 'https://example.com/page2',
      http_status: 200,
      response_time_ms: 200,
      size_bytes: 6000,
      content_type: 'text/html',
      hash_body_sha256: 'b'.repeat(64),
      group_key: 'example.com',
      discovery_source: 'page',
      discovered_from: 'https://example.com/page1',
      depth: 1,
      robots_decision: 'allow',
      noindex_hint: false,
      timestamp_captured: '2025-10-26T14:01:00Z',
    };
    
    await writer.write(page1);
    await writer.write(page2);
    
    const metadata = await writer.finalize();
    
    expect(metadata.name).toBe('pages');
    expect(metadata.version).toBe('v1');
    expect(metadata.record_count).toBe(2);
    expect(metadata.parts[0]).toMatch(/pages\.v1_part_001\.jsonl\.zst$/);
  });
  
  test('rejects invalid PageRecordV1', async () => {
    const writer = new DatasetWriter<PageRecordV1>({
      name: 'pages',
      version: 'v1',
      schemaUri: 'schemas/pages.v1.schema.json',
      stagingDir: tempDir,
      schema: PageRecordV1Schema,
    });
    
    await writer.init();
    
    // Invalid: missing required field
    const invalidPage = {
      page_id: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com/page1',
      // Missing many required fields
    } as any;
    
    await expect(writer.write(invalidPage)).rejects.toThrow();
  });
  
  test('rejects invalid discovery_source enum', async () => {
    const writer = new DatasetWriter<PageRecordV1>({
      name: 'pages',
      version: 'v1',
      schemaUri: 'schemas/pages.v1.schema.json',
      stagingDir: tempDir,
      schema: PageRecordV1Schema,
    });
    
    await writer.init();
    
    const invalidPage: any = {
      page_id: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com/page1',
      normalized_url: 'https://example.com/page1',
      final_url: 'https://example.com/page1',
      http_status: 200,
      response_time_ms: 150,
      size_bytes: 5000,
      content_type: 'text/html',
      hash_body_sha256: 'a'.repeat(64),
      group_key: 'example.com',
      discovery_source: 'invalid_source', // Invalid enum value
      depth: 0,
      robots_decision: 'allow',
      noindex_hint: false,
      timestamp_captured: '2025-10-26T14:00:00Z',
    };
    
    await expect(writer.write(invalidPage)).rejects.toThrow();
  });
  
  test('validates SHA-256 hash format', async () => {
    const writer = new DatasetWriter<PageRecordV1>({
      name: 'pages',
      version: 'v1',
      schemaUri: 'schemas/pages.v1.schema.json',
      stagingDir: tempDir,
      schema: PageRecordV1Schema,
    });
    
    await writer.init();
    
    const invalidPage: any = {
      page_id: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com/page1',
      normalized_url: 'https://example.com/page1',
      final_url: 'https://example.com/page1',
      http_status: 200,
      response_time_ms: 150,
      size_bytes: 5000,
      content_type: 'text/html',
      hash_body_sha256: 'not-a-valid-sha256', // Invalid hash format
      group_key: 'example.com',
      discovery_source: 'seed',
      depth: 0,
      robots_decision: 'allow',
      noindex_hint: false,
      timestamp_captured: '2025-10-26T14:00:00Z',
    };
    
    await expect(writer.write(invalidPage)).rejects.toThrow();
  });
});
