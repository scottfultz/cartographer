/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Load schema from source to ensure generator copies match
const schemaPath = join(__dirname, '../../src/io/atlas/schemas/pages.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

// Minimal valid page with new fields
const pageSample = {
  url: 'https://example.com/',
  finalUrl: 'https://example.com/',
  normalizedUrl: 'https://example.com/',
  urlKey: 'abc123',
  origin: 'https://example.com',
  pathname: '/',
  statusCode: 200,
  fetchedAt: new Date().toISOString(),
  rawHtmlHash: 'sha256:deadbeef',
  title: 'Example Domain',
  renderMode: 'prerender',
  depth: 0,
  discoveredInMode: 'prerender',

  // New fields
  wait_condition: 'networkidle2',
  timings: {
    nav_start: 0,
    dom_content_loaded: 12.3,
    load_event_end: 45.6,
    network_idle_reached: 50.0,
    first_paint: 20.1,
    first_contentful_paint: 25.4
  },
  encoding: {
    encoding: 'UTF-8',
    source: 'header'
  },

  // Common fields used elsewhere
  navEndReason: 'networkidle',
  internalLinksCount: 1,
  externalLinksCount: 0,
  mediaAssetsCount: 0,
  mediaAssetsTruncated: false,
  hreflangLinks: [{ lang: 'en', url: 'https://example.com/' }],
  headings: [{ level: 1, text: 'Heading' }],
  textSample: 'Sample text'
};

describe('pages.schema.json', () => {
  test('accepts PageRecord with timings, wait_condition, encoding, and hreflangLinks.url', () => {
    const ajv = new (Ajv as any)({ allErrors: true, strictSchema: false });
    (addFormats as any)(ajv);
    const validate = ajv.compile(schema);
    const ok = validate(pageSample);
    if (!ok) {
      // Helpful error for debugging
      // eslint-disable-next-line no-console
      console.error('Validation errors:', validate.errors);
    }
    expect(ok).toBe(true);
  });
});
