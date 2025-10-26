/**
 * Copyright © 2025 Cai Frazier.
 * Schema Validation Tests
 */

import { describe, test, expect } from 'vitest';
import {
  PageRecordV1Schema,
  AtlasManifestV1Schema,
  AtlasCapabilitiesV1Schema,
  ProvenanceRecordV1Schema,
} from '../src/schemas/index.js';

describe('Atlas v1.0 Schema Validation', () => {
  describe('PageRecordV1Schema', () => {
    test('validates a complete page record', () => {
      const validPage = {
        page_id: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://example.com/page',
        normalized_url: 'https://example.com/page',
        final_url: 'https://example.com/page',
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

      const result = PageRecordV1Schema.safeParse(validPage);
      expect(result.success).toBe(true);
    });

    test('rejects invalid page_id format', () => {
      const invalidPage = {
        page_id: 'not-a-uuid',
        url: 'https://example.com/page',
        normalized_url: 'https://example.com/page',
        final_url: 'https://example.com/page',
        http_status: 200,
        response_time_ms: 150,
        size_bytes: 5000,
        content_type: 'text/html',
        hash_body_sha256: 'a'.repeat(64),
        group_key: 'example.com',
        discovery_source: 'seed',
        depth: 0,
        robots_decision: 'allow',
        noindex_hint: false,
        timestamp_captured: '2025-10-26T14:00:00Z',
      };

      const result = PageRecordV1Schema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    test('rejects invalid discovery_source', () => {
      const invalidPage = {
        page_id: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://example.com/page',
        normalized_url: 'https://example.com/page',
        final_url: 'https://example.com/page',
        http_status: 200,
        response_time_ms: 150,
        size_bytes: 5000,
        content_type: 'text/html',
        hash_body_sha256: 'a'.repeat(64),
        group_key: 'example.com',
        discovery_source: 'invalid',
        depth: 0,
        robots_decision: 'allow',
        noindex_hint: false,
        timestamp_captured: '2025-10-26T14:00:00Z',
      };

      const result = PageRecordV1Schema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });
  });

  describe('AtlasManifestV1Schema', () => {
    test('validates a complete manifest', () => {
      const validManifest = {
        atlas_semver: '1.0.0',
        owner: 'Cai Frazier',
        created_at: '2025-10-26T14:00:00Z',
        created_by: {
          app: 'cartographer',
          version: '1.0.0',
        },
        mode: 'full',
        seeds: ['https://example.com'],
        datasets: {
          'pages.v1': {
            name: 'pages',
            version: 'v1',
            record_count: 100,
            bytes_compressed: 50000,
            hash_sha256: 'a'.repeat(64),
            schema_uri: 'schemas/pages.v1.schema.json',
          },
        },
        storage: {
          blob_format: 'individual',
          blob_stats: {
            total_blobs: 50,
            total_bytes_compressed: 100000,
            deduplication_rate: 0.5,
          },
        },
        privacy_policy: {
          strip_cookies: true,
          strip_auth_headers: true,
          redact_inputs: true,
          redact_pii: false,
        },
        robots_policy: {
          respect: true,
          overrides_used: false,
        },
      };

      const result = AtlasManifestV1Schema.safeParse(validManifest);
      expect(result.success).toBe(true);
    });

    test('rejects invalid mode', () => {
      const invalidManifest = {
        atlas_semver: '1.0.0',
        owner: 'Cai Frazier',
        created_at: '2025-10-26T14:00:00Z',
        created_by: {
          app: 'cartographer',
          version: '1.0.0',
        },
        mode: 'invalid_mode',
        seeds: ['https://example.com'],
        datasets: {},
        storage: {
          blob_format: 'individual',
          blob_stats: {
            total_blobs: 0,
            total_bytes_compressed: 0,
            deduplication_rate: 0,
          },
        },
        privacy_policy: {
          strip_cookies: true,
          strip_auth_headers: true,
          redact_inputs: true,
          redact_pii: false,
        },
        robots_policy: {
          respect: true,
          overrides_used: false,
        },
      };

      const result = AtlasManifestV1Schema.safeParse(invalidManifest);
      expect(result.success).toBe(false);
    });
  });

  describe('AtlasCapabilitiesV1Schema', () => {
    test('validates capabilities', () => {
      const validCapabilities = {
        version: 'v1',
        capabilities: ['seo.core', 'a11y.core', 'replay.html'],
        compatibility: {
          min_sdk_version: '1.0.0',
          breaking_changes: [],
        },
      };

      const result = AtlasCapabilitiesV1Schema.safeParse(validCapabilities);
      expect(result.success).toBe(true);
    });

    test('rejects invalid version', () => {
      const invalidCapabilities = {
        version: 'v2',
        capabilities: ['seo.core'],
        compatibility: {
          min_sdk_version: '1.0.0',
          breaking_changes: [],
        },
      };

      const result = AtlasCapabilitiesV1Schema.safeParse(invalidCapabilities);
      expect(result.success).toBe(false);
    });
  });

  describe('ProvenanceRecordV1Schema', () => {
    test('validates provenance record', () => {
      const validProvenance = {
        dataset_name: 'pages.v1',
        producer: {
          app: 'cartographer',
          version: '1.0.0',
          module: 'extractor-pages',
        },
        created_at: '2025-10-26T14:00:00Z',
        inputs: [],
        parameters: {
          mode: 'full',
        },
        output: {
          record_count: 100,
          hash_sha256: 'a'.repeat(64),
        },
      };

      const result = ProvenanceRecordV1Schema.safeParse(validProvenance);
      expect(result.success).toBe(true);
    });

    test('validates provenance with inputs', () => {
      const validProvenance = {
        dataset_name: 'seo_signals.v1',
        producer: {
          app: 'cartographer',
          version: '1.0.0',
          module: 'extractor-seo',
        },
        created_at: '2025-10-26T14:00:00Z',
        inputs: [
          {
            dataset: 'pages.v1',
            hash_sha256: 'a'.repeat(64),
          },
        ],
        parameters: {
          mode: 'full',
        },
        output: {
          record_count: 100,
          hash_sha256: 'b'.repeat(64),
        },
      };

      const result = ProvenanceRecordV1Schema.safeParse(validProvenance);
      expect(result.success).toBe(true);
    });
  });
});
