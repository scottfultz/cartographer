/**
 * Copyright © 2025 Cai Frazier.
 * 
 * Sitemaps Schema - Atlas v1.0
 * Captures parsed sitemap data
 */

import { z } from 'zod';

export const SitemapRecordV1Schema = z.object({
  sitemap_id: z.string().uuid(),
  
  // Sitemap metadata
  sitemap_url: z.string().url(),
  discovered_at: z.string().datetime(),
  discovery_method: z.enum(['robots_txt', 'well_known', 'manual', 'linked']),
  
  // Sitemap type
  type: z.enum(['urlset', 'sitemapindex']),
  
  // Entry data (for urlset type)
  url: z.string().url().optional(),
  lastmod: z.string().optional(),
  changefreq: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).optional(),
  priority: z.number().min(0).max(1).optional(),
  
  // Images (if present)
  images: z.array(z.object({
    loc: z.string().url(),
    caption: z.string().optional(),
    title: z.string().optional()
  })).optional(),
  
  // Video (if present)
  videos: z.array(z.object({
    thumbnail_loc: z.string().url(),
    title: z.string(),
    description: z.string().optional()
  })).optional(),
  
  // Child sitemap reference (for sitemapindex type)
  child_sitemap_url: z.string().url().optional(),
  
  // Validation
  is_valid: z.boolean(),
  validation_errors: z.array(z.string()).default([])
});

export type SitemapRecordV1 = z.infer<typeof SitemapRecordV1Schema>;
