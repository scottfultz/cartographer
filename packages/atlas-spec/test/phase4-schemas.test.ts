/**
 * Copyright © 2025 Cai Frazier.
 * Tests for Phase 4 schemas
 */

import { describe, test, expect } from 'vitest';
import {
  RenderRecordV1Schema,
  LinkRecordV1Schema,
  SitemapRecordV1Schema,
  RobotsRecordV1Schema,
  SEOSignalsRecordV1Schema,
  AuditResultRecordV1Schema,
} from '@atlas/spec';

describe('Render Record Schema', () => {
  test('validates a valid render record', () => {
    const validRecord = {
      page_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      mode: 'full' as const,
      viewport: { width: 1920, height: 1080 },
      user_agent: 'Mozilla/5.0...',
      render_started_at: '2025-01-01T00:00:00.000Z',
      render_completed_at: '2025-01-01T00:00:01.500Z',
      render_duration_ms: 1500,
      dom_content_loaded: true,
      load_event_fired: true,
      network_idle: true,
      scripts_enabled: true,
      styles_enabled: true,
      images_enabled: true,
      console_errors: [],
      request_count: 42,
      failed_requests: 2,
      first_paint_ms: 300,
      first_contentful_paint_ms: 350,
      dom_interactive_ms: 800,
    };
    
    const result = RenderRecordV1Schema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });
  
  test('rejects invalid mode', () => {
    const invalidRecord = {
      page_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      mode: 'invalid',
      viewport: { width: 1920, height: 1080 },
      user_agent: 'Mozilla/5.0...',
      render_started_at: '2025-01-01T00:00:00.000Z',
      render_completed_at: '2025-01-01T00:00:01.500Z',
      render_duration_ms: 1500,
      dom_content_loaded: true,
      load_event_fired: true,
      network_idle: true,
      scripts_enabled: true,
      styles_enabled: true,
      images_enabled: true,
      console_errors: [],
      request_count: 42,
      failed_requests: 2,
    };
    
    const result = RenderRecordV1Schema.safeParse(invalidRecord);
    expect(result.success).toBe(false);
  });
});

describe('Link Record Schema', () => {
  test('validates internal link', () => {
    const validLink = {
      link_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      source_page_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
      target_url: 'https://example.com/page2',
      target_page_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
      type: 'internal' as const,
      discovered_at: '2025-01-01T00:00:00.000Z',
      location: 'main' as const,
      anchor_text: 'Click here',
      tag: 'a' as const,
      is_navigation: false,
      is_footer: false,
      is_breadcrumb: false,
    };
    
    const result = LinkRecordV1Schema.safeParse(validLink);
    expect(result.success).toBe(true);
  });
  
  test('validates external link', () => {
    const externalLink = {
      link_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      source_page_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
      target_url: 'https://external.com',
      type: 'external' as const,
      discovered_at: '2025-01-01T00:00:00.000Z',
      location: 'html_content' as const,
      anchor_text: 'External Link',
      tag: 'a' as const,
      is_navigation: false,
      is_footer: false,
      is_breadcrumb: false,
    };
    
    const result = LinkRecordV1Schema.safeParse(externalLink);
    expect(result.success).toBe(true);
  });
});

describe('Sitemap Record Schema', () => {
  test('validates urlset sitemap entry', () => {
    const validEntry = {
      sitemap_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      sitemap_url: 'https://example.com/sitemap.xml',
      discovered_at: '2025-01-01T00:00:00.000Z',
      discovery_method: 'robots_txt' as const,
      type: 'urlset' as const,
      url: 'https://example.com/page1',
      lastmod: '2025-01-01',
      changefreq: 'weekly' as const,
      priority: 0.8,
      is_valid: true,
      validation_errors: [],
    };
    
    const result = SitemapRecordV1Schema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });
  
  test('validates sitemapindex entry', () => {
    const indexEntry = {
      sitemap_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      sitemap_url: 'https://example.com/sitemap_index.xml',
      discovered_at: '2025-01-01T00:00:00.000Z',
      discovery_method: 'well_known' as const,
      type: 'sitemapindex' as const,
      child_sitemap_url: 'https://example.com/sitemap1.xml',
      is_valid: true,
      validation_errors: [],
    };
    
    const result = SitemapRecordV1Schema.safeParse(indexEntry);
    expect(result.success).toBe(true);
  });
});

describe('Robots Record Schema', () => {
  test('validates robots.txt record', () => {
    const validRecord = {
      robots_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      robots_url: 'https://example.com/robots.txt',
      fetched_at: '2025-01-01T00:00:00.000Z',
      status_code: 200,
      body_blob_ref: 'blobs/sha256/ab/cd/abcd1234...ef.zst',
      parse_errors: [],
      user_agent: '*',
      allow_rules: ['/public/*'],
      disallow_rules: ['/admin/*', '/private/*'],
      crawl_delay: 1,
      sitemaps: ['https://example.com/sitemap.xml'],
      decisions: [
        {
          url: 'https://example.com/public/page1',
          page_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
          allowed: true,
          matched_rule: '/public/*',
          override_used: false,
        },
      ],
    };
    
    const result = RobotsRecordV1Schema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });
});

describe('SEO Signals Record Schema', () => {
  test('validates complete SEO signals', () => {
    const validRecord = {
      page_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: 'Example Page Title',
      title_length: 18,
      meta_description: 'This is a meta description',
      meta_description_length: 26,
      canonical_url: 'https://example.com/page',
      canonical_self: true,
      robots_index: true,
      robots_follow: true,
      h1_count: 1,
      h1_text: ['Main Heading'],
      heading_hierarchy_valid: true,
      word_count: 500,
      text_to_html_ratio: 0.6,
      image_count: 10,
      images_with_alt: 8,
      images_missing_alt: 2,
      internal_links: 15,
      external_links: 5,
      broken_links: 0,
      og_title: 'OG Title',
      og_description: 'OG Description',
      og_image: 'https://example.com/image.jpg',
      og_type: 'website',
      structured_data_count: 2,
      structured_data_types: ['Organization', 'WebPage'],
      hreflang_tags: [
        { lang: 'en', url: 'https://example.com/en/page' },
        { lang: 'fr', url: 'https://example.com/fr/page' },
      ],
      lang_attribute: 'en',
      viewport_meta: 'width=device-width, initial-scale=1',
      charset: 'utf-8',
      has_viewport_meta: true,
    };
    
    const result = SEOSignalsRecordV1Schema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });
});

describe('Audit Result Record Schema', () => {
  test('validates WCAG violation', () => {
    const validRecord = {
      audit_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      page_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
      audited_at: '2025-01-01T00:00:00.000Z',
      auditor_version: 'horizon-1.0.0',
      wcag_level: 'AA' as const,
      rule_id: '1.4.3',
      rule_name: 'Contrast (Minimum)',
      severity: 'serious' as const,
      selector: 'div.content > p',
      xpath: '/html/body/div[1]/p',
      html_snippet: '<p style="color: #777; background: #fff">Text</p>',
      description: 'Text has insufficient contrast ratio',
      impact: 'Users with low vision may struggle to read this text',
      remediation: 'Increase contrast ratio to at least 4.5:1',
      node_count: 5,
      related_rule_ids: ['1.4.6', '1.4.11'],
    };
    
    const result = AuditResultRecordV1Schema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });
});
