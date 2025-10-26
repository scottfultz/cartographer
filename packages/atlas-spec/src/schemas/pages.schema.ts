/**
 * Copyright © 2025 Cai Frazier.
 * Atlas v1.0 Pages Dataset Schema
 */

import { z } from 'zod';

/**
 * Discovery source enumeration
 */
export const DiscoverySourceEnum = z.enum(['seed', 'sitemap', 'page', 'js']);

/**
 * Robots decision enumeration
 */
export const RobotsDecisionEnum = z.enum(['allow', 'disallow', 'override']);

/**
 * Page Record v1.0 Schema
 * 
 * Complete page metadata with identity, HTTP response, content addressing,
 * grouping, discovery, robots compliance, and timing information.
 */
export const PageRecordV1Schema = z.object({
  // ===== Identity =====
  page_id: z.string().uuid().describe('Unique identifier for this page (UUID v4)'),
  url: z.string().url().describe('Original URL as discovered'),
  normalized_url: z.string().url().describe('Normalized canonical URL'),
  final_url: z.string().url().describe('Final URL after redirects'),
  
  // ===== HTTP Response =====
  http_status: z.number().int().min(100).max(599).describe('HTTP status code'),
  response_time_ms: z.number().nonnegative().describe('Total response time in milliseconds'),
  size_bytes: z.number().int().nonnegative().describe('Response body size in bytes'),
  content_type: z.string().describe('Content-Type header value'),
  
  // ===== Content Addressing =====
  hash_body_sha256: z.string().regex(/^[a-f0-9]{64}$/).describe('SHA-256 hash of response body'),
  body_blob_ref: z.string().optional().describe('Reference to HTML body in blob storage (e.g., "sha256/ab/cd/abcd...")'),
  
  // ===== Grouping =====
  group_key: z.string().describe('Group key for batch organization (hostname or custom)'),
  
  // ===== Discovery =====
  discovery_source: DiscoverySourceEnum.describe('How this URL was discovered'),
  discovered_from: z.string().url().optional().describe('URL of the page that linked here (if applicable)'),
  depth: z.number().int().nonnegative().describe('Crawl depth from seed URLs'),
  
  // ===== Robots & Indexability =====
  robots_decision: RobotsDecisionEnum.describe('Robots.txt compliance decision'),
  noindex_hint: z.boolean().describe('Whether page has noindex meta tag or X-Robots-Tag'),
  
  // ===== Timing =====
  timestamp_captured: z.string().datetime().describe('ISO 8601 timestamp when page was captured'),
});

export type PageRecordV1 = z.infer<typeof PageRecordV1Schema>;
