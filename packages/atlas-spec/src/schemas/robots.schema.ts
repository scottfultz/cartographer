/**
 * Copyright © 2025 Cai Frazier.
 * 
 * Robots.txt Schema - Atlas v1.0
 * Captures robots.txt parsing and crawl decisions
 */

import { z } from 'zod';

export const RobotsRecordV1Schema = z.object({
  robots_id: z.string().uuid(),
  
  // Robots.txt metadata
  robots_url: z.string().url(),
  fetched_at: z.string().datetime(),
  status_code: z.number().int(),
  
  // Content
  body_blob_ref: z.string().optional(), // Reference to blob storage
  parse_errors: z.array(z.string()).default([]),
  
  // Parsed rules
  user_agent: z.string(), // Which user-agent this rule applies to
  allow_rules: z.array(z.string()).default([]),
  disallow_rules: z.array(z.string()).default([]),
  crawl_delay: z.number().int().nonnegative().optional(),
  
  // Sitemap references
  sitemaps: z.array(z.string().url()).default([]),
  
  // Per-URL decisions
  decisions: z.array(z.object({
    url: z.string().url(),
    page_id: z.string().uuid().optional(),
    allowed: z.boolean(),
    matched_rule: z.string().optional(),
    override_used: z.boolean().default(false),
    override_reason: z.string().optional()
  })).default([])
});

export type RobotsRecordV1 = z.infer<typeof RobotsRecordV1Schema>;
