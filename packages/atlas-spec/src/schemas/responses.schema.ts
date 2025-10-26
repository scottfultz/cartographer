/**
 * Copyright © 2025 Cai Frazier.
 * Atlas v1.0 Responses Dataset Schema
 */

import { z } from 'zod';

/**
 * Response Record v1.0 Schema
 * 
 * Stores raw HTML response bodies in blob storage for offline replay.
 * Essential for recomputing SEO signals, accessibility audits, and diffs.
 */
export const ResponseRecordV1Schema = z.object({
  // ===== Identity =====
  page_id: z.string().uuid().describe('Foreign key to pages.v1 page_id'),
  
  // ===== Encoding =====
  encoding: z.string().describe('Character encoding (e.g., "utf-8", "iso-8859-1")'),
  
  // ===== Blob Reference =====
  body_blob_ref: z.string().describe('Reference to HTML body in blob storage (e.g., "sha256/ab/cd/abcd...")'),
});

export type ResponseRecordV1 = z.infer<typeof ResponseRecordV1Schema>;
