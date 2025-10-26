/**
 * Copyright © 2025 Cai Frazier.
 * 
 * Links Schema - Atlas v1.0
 * Captures link relationships for graph analysis
 */

import { z } from 'zod';

export const LinkRecordV1Schema = z.object({
  link_id: z.string().uuid(),
  source_page_id: z.string().uuid(),
  
  // Target information
  target_url: z.string().url(),
  target_page_id: z.string().uuid().optional(), // Set if target was crawled
  
  // Link classification
  type: z.enum(['internal', 'external', 'mailto', 'tel', 'javascript', 'anchor']),
  
  // Discovery context
  discovered_at: z.string().datetime(),
  location: z.enum(['html_content', 'nav', 'footer', 'sidebar', 'main', 'header']),
  
  // Link attributes
  anchor_text: z.string().default(''),
  title: z.string().optional(),
  rel: z.string().optional(),
  
  // DOM context
  tag: z.enum(['a', 'area', 'link', 'form']),
  xpath: z.string().optional(),
  
  // Accessibility
  accessible_name: z.string().optional(),
  aria_label: z.string().optional(),
  
  // Navigation metadata
  is_navigation: z.boolean().default(false),
  is_footer: z.boolean().default(false),
  is_breadcrumb: z.boolean().default(false)
});

export type LinkRecordV1 = z.infer<typeof LinkRecordV1Schema>;
