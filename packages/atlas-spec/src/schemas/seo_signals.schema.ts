/**
 * Copyright © 2025 Cai Frazier.
 * 
 * SEO Signals Schema - Atlas v1.0
 * Consolidates SEO metadata for Continuum
 */

import { z } from 'zod';

export const SEOSignalsRecordV1Schema = z.object({
  page_id: z.string().uuid(),
  
  // Basic metadata
  title: z.string().optional(),
  title_length: z.number().int().nonnegative().optional(),
  
  meta_description: z.string().optional(),
  meta_description_length: z.number().int().nonnegative().optional(),
  
  // Canonical
  canonical_url: z.string().url().optional(),
  canonical_self: z.boolean().optional(),
  
  // Robots meta
  robots_index: z.boolean().optional(),
  robots_follow: z.boolean().optional(),
  
  // Headings
  h1_count: z.number().int().nonnegative(),
  h1_text: z.array(z.string()).default([]),
  heading_hierarchy_valid: z.boolean(),
  
  // Content analysis
  word_count: z.number().int().nonnegative(),
  text_to_html_ratio: z.number().min(0).max(1).optional(),
  
  // Images
  image_count: z.number().int().nonnegative(),
  images_with_alt: z.number().int().nonnegative(),
  images_missing_alt: z.number().int().nonnegative(),
  
  // Links
  internal_links: z.number().int().nonnegative(),
  external_links: z.number().int().nonnegative(),
  broken_links: z.number().int().nonnegative(),
  
  // Open Graph
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().url().optional(),
  og_type: z.string().optional(),
  
  // Twitter Card
  twitter_card: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().url().optional(),
  
  // Structured data
  structured_data_count: z.number().int().nonnegative(),
  structured_data_types: z.array(z.string()).default([]),
  
  // Hreflang
  hreflang_tags: z.array(z.object({
    lang: z.string(),
    url: z.string().url()
  })).default([]),
  
  // Technical SEO
  lang_attribute: z.string().optional(),
  viewport_meta: z.string().optional(),
  charset: z.string().optional(),
  
  // Performance signals
  page_size_bytes: z.number().int().nonnegative().optional(),
  load_time_ms: z.number().int().nonnegative().optional(),
  
  // Mobile friendliness
  is_mobile_friendly: z.boolean().optional(),
  has_viewport_meta: z.boolean()
});

export type SEOSignalsRecordV1 = z.infer<typeof SEOSignalsRecordV1Schema>;
