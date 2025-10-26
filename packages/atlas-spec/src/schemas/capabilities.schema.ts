/**
 * Copyright © 2025 Cai Frazier.
 * Atlas v1.0 Capabilities Schema
 */

import { z } from 'zod';

/**
 * Compatibility information
 */
export const CompatibilitySchema = z.object({
  min_sdk_version: z.string().describe('Minimum SDK version required to read this archive'),
  breaking_changes: z.array(z.string()).describe('List of breaking changes from previous versions'),
});

/**
 * Atlas Capabilities v1.0 Schema
 * 
 * Declares what operations are supported by this archive. Consumers can
 * check capabilities before attempting operations to fail fast.
 * 
 * Standard capabilities:
 * - seo.core: Basic SEO signals (title, meta, headers)
 * - seo.enhanced: Advanced SEO (structured data, OG, Twitter Card)
 * - a11y.core: Accessibility data (WCAG violations, color contrast)
 * - render.dom: Post-render DOM snapshots
 * - render.netlog: Network performance logs
 * - replay.html: HTML bodies stored for offline replay
 * - replay.css: CSS files stored for offline replay
 * - replay.js: JavaScript files stored for offline replay
 * - replay.fonts: Web fonts stored for offline replay
 * - replay.images: Images stored for offline replay
 */
export const AtlasCapabilitiesV1Schema = z.object({
  version: z.literal('v1').describe('Capabilities schema version'),
  capabilities: z.array(z.string()).describe('List of capability strings (e.g., ["seo.core", "a11y.core"])'),
  compatibility: CompatibilitySchema.describe('SDK compatibility requirements'),
});

export type AtlasCapabilitiesV1 = z.infer<typeof AtlasCapabilitiesV1Schema>;
