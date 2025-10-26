/**
 * Copyright © 2025 Cai Frazier.
 * Atlas v1.0 Manifest Schema
 */

import { z } from 'zod';

/**
 * Dataset metadata within manifest
 */
export const DatasetMetadataSchema = z.object({
  name: z.string().describe('Dataset name (e.g., "pages")'),
  version: z.string().describe('Dataset version (e.g., "v1")'),
  record_count: z.number().int().nonnegative().describe('Total number of records'),
  bytes_compressed: z.number().int().nonnegative().describe('Total compressed size in bytes'),
  hash_sha256: z.string().regex(/^[a-f0-9]{64}$/).describe('SHA-256 hash of all parts concatenated'),
  schema_uri: z.string().describe('Relative path to JSON Schema (e.g., "schemas/pages.v1.schema.json")'),
});

/**
 * Blob storage metadata
 */
export const BlobStorageMetadataSchema = z.object({
  blob_format: z.enum(['individual', 'packed']).describe('Blob storage format'),
  blob_stats: z.object({
    total_blobs: z.number().int().nonnegative().describe('Total number of unique blobs'),
    total_bytes_compressed: z.number().int().nonnegative().describe('Total compressed blob storage size'),
    deduplication_rate: z.number().min(0).max(1).describe('Deduplication rate (0.0 to 1.0)'),
  }),
});

/**
 * Privacy policy metadata
 */
export const PrivacyPolicySchema = z.object({
  strip_cookies: z.boolean().describe('Whether cookies were stripped from requests'),
  strip_auth_headers: z.boolean().describe('Whether Authorization headers were stripped'),
  redact_inputs: z.boolean().describe('Whether password/sensitive inputs were redacted'),
  redact_pii: z.boolean().describe('Whether PII was redacted from content'),
});

/**
 * Robots policy metadata
 */
export const RobotsPolicySchema = z.object({
  respect: z.boolean().describe('Whether robots.txt was respected'),
  overrides_used: z.boolean().describe('Whether any robots.txt overrides were used'),
});

/**
 * Atlas Manifest v1.0 Schema
 * 
 * Top-level metadata for Atlas archives including versioning, ownership,
 * dataset inventory, storage statistics, and compliance policies.
 */
export const AtlasManifestV1Schema = z.object({
  // ===== Atlas Version =====
  atlas_semver: z.string().regex(/^\d+\.\d+\.\d+$/).describe('Atlas specification version (e.g., "1.0.0")'),
  
  // ===== Ownership & Attribution =====
  owner: z.string().describe('Owner/creator of this archive (e.g., "Cai Frazier")'),
  created_at: z.string().datetime().describe('ISO 8601 timestamp of archive creation'),
  created_by: z.object({
    app: z.string().describe('Application name (e.g., "cartographer")'),
    version: z.string().describe('Application version (e.g., "1.0.0")'),
  }),
  
  // ===== Crawl Configuration =====
  mode: z.enum(['raw', 'prerender', 'full']).describe('Crawl mode used'),
  seeds: z.array(z.string().url()).describe('Seed URLs for this crawl'),
  
  // ===== Dataset Inventory =====
  datasets: z.record(z.string(), DatasetMetadataSchema).describe('Map of dataset names to metadata'),
  
  // ===== Storage =====
  storage: BlobStorageMetadataSchema,
  
  // ===== Compliance & Privacy =====
  privacy_policy: PrivacyPolicySchema,
  robots_policy: RobotsPolicySchema,
  
  // ===== Summary Statistics =====
  summary: z.object({
    total_pages: z.number().int().nonnegative(),
    total_links: z.number().int().nonnegative(),
    total_assets: z.number().int().nonnegative(),
    total_errors: z.number().int().nonnegative(),
  }).optional().describe('High-level crawl statistics'),
});

export type AtlasManifestV1 = z.infer<typeof AtlasManifestV1Schema>;
export type DatasetMetadata = z.infer<typeof DatasetMetadataSchema>;
