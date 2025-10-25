/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, it , expect } from "vitest";
import assert from 'node:assert/strict';
import { URLFilter } from '../src/utils/urlFilter.js';

describe('URLFilter - Glob Pattern Matching', () => {
  it('should allow all URLs when no patterns provided', () => {
    const filter = new URLFilter();
    expect(filter.shouldAllow('https://example.com/page')).toBe(true);
    expect(filter.shouldAllow('https://other.com/page')).toBe(true);
  });

  it('should match simple glob patterns', () => {
    const filter = new URLFilter(undefined, ['https://example.com/admin/**']);
    expect(filter.shouldAllow('https://example.com/admin/users')).toBe(false);
    expect(filter.shouldAllow('https://example.com/admin/settings/page')).toBe(false);
    expect(filter.shouldAllow('https://example.com/public/page')).toBe(true);
  });

  it('should match wildcard patterns', () => {
    const filter = new URLFilter(undefined, ['**/private/**']);
    expect(filter.shouldAllow('https://example.com/private/data')).toBe(false);
    expect(filter.shouldAllow('https://other.com/app/private/page')).toBe(false);
    expect(filter.shouldAllow('https://example.com/public/data')).toBe(true);
  });

  it('should match file extension patterns', () => {
    const filter = new URLFilter(undefined, ['**/*.pdf', '**/*.zip']);
    expect(filter.shouldAllow('https://example.com/docs/file.pdf')).toBe(false);
    expect(filter.shouldAllow('https://example.com/downloads/archive.zip')).toBe(false);
    expect(filter.shouldAllow('https://example.com/docs/file.html')).toBe(true);
  });

  it('should match query string patterns', () => {
    // Use regex for query string matching
    const filter = new URLFilter(undefined, ['/\\?action=delete/']);
    expect(filter.shouldAllow('https://example.com/page?action=delete')).toBe(false);
    expect(filter.shouldAllow('https://example.com/page?action=delete&id=5')).toBe(false);
    expect(filter.shouldAllow('https://example.com/page?action=view')).toBe(true);
  });
});

describe('URLFilter - Regex Pattern Matching', () => {
  it('should match regex patterns wrapped in slashes', () => {
    const filter = new URLFilter(undefined, ['/\\.pdf$/']);
    expect(filter.shouldAllow('https://example.com/file.pdf')).toBe(false);
    expect(filter.shouldAllow('https://example.com/file.html')).toBe(true);
  });

  it('should match case-insensitive regex with flags', () => {
    const filter = new URLFilter(undefined, ['/admin/i']);
    expect(filter.shouldAllow('https://example.com/ADMIN/page')).toBe(false);
    expect(filter.shouldAllow('https://example.com/Admin/page')).toBe(false);
    expect(filter.shouldAllow('https://example.com/public/page')).toBe(true);
  });

  it('should match complex regex patterns', () => {
    const filter = new URLFilter(undefined, ['/\\/(login|logout|signup)$/']);
    expect(filter.shouldAllow('https://example.com/login')).toBe(false);
    expect(filter.shouldAllow('https://example.com/logout')).toBe(false);
    expect(filter.shouldAllow('https://example.com/signup')).toBe(false);
    expect(filter.shouldAllow('https://example.com/login/page')).toBe(true);
  });
});

describe('URLFilter - Allow List Logic', () => {
  it('should deny URLs not matching allow list', () => {
    const filter = new URLFilter(['https://example.com/**']);
    expect(filter.shouldAllow('https://example.com/page')).toBe(true);
    expect(filter.shouldAllow('https://other.com/page')).toBe(false);
  });

  it('should allow URLs matching allow list patterns', () => {
    const filter = new URLFilter(['https://example.com/blog/**', 'https://example.com/docs/**']);
    expect(filter.shouldAllow('https://example.com/blog/post')).toBe(true);
    expect(filter.shouldAllow('https://example.com/docs/guide')).toBe(true);
    expect(filter.shouldAllow('https://example.com/admin/page')).toBe(false);
  });

  it('should support regex in allow list', () => {
    const filter = new URLFilter(['/^https:\\/\\/[^/]+\\/api\\//']);
    expect(filter.shouldAllow('https://example.com/api/users')).toBe(true);
    expect(filter.shouldAllow('https://other.com/api/posts')).toBe(true);
    expect(filter.shouldAllow('https://example.com/web/page')).toBe(false);
  });
});

describe('URLFilter - Deny List Priority', () => {
  it('should deny URL even if it matches allow list', () => {
    const filter = new URLFilter(
      ['https://example.com/**'],
      ['**/admin/**']
    );
    expect(filter.shouldAllow('https://example.com/blog/post')).toBe(true);
    expect(filter.shouldAllow('https://example.com/admin/users')).toBe(false);
  });

  it('should check deny list before allow list', () => {
    const filter = new URLFilter(
      ['https://example.com/**'],
      ['**/*.pdf']
    );
    expect(filter.shouldAllow('https://example.com/docs/file.pdf')).toBe(false);
    expect(filter.shouldAllow('https://example.com/docs/file.html')).toBe(true);
  });
});

describe('URLFilter - Helper Methods', () => {
  it('hasAllowList should return correct value', () => {
    const filter1 = new URLFilter(['https://example.com/**']);
    const filter2 = new URLFilter(undefined, ['**/admin/**']);
    const filter3 = new URLFilter();
    
    expect(filter1.hasAllowList()).toBe(true);
    expect(filter2.hasAllowList()).toBe(false);
    expect(filter3.hasAllowList()).toBe(false);
  });

  it('hasDenyList should return correct value', () => {
    const filter1 = new URLFilter(['https://example.com/**']);
    const filter2 = new URLFilter(undefined, ['**/admin/**']);
    const filter3 = new URLFilter();
    
    expect(filter1.hasDenyList()).toBe(false);
    expect(filter2.hasDenyList()).toBe(true);
    expect(filter3.hasDenyList()).toBe(false);
  });

  it('getDenyReason should return correct message for deny pattern', () => {
    const filter = new URLFilter(undefined, ['**/admin/**']);
    const reason = filter.getDenyReason('https://example.com/admin/users');
    expect(reason || '').toMatch(/Matched deny pattern/);
  });

  it('getDenyReason should return correct message for missing allow pattern', () => {
    const filter = new URLFilter(['https://example.com/**']);
    const reason = filter.getDenyReason('https://other.com/page');
    expect(reason).toBe('Not in allow list');
  });

  it('getDenyReason should return null for allowed URL', () => {
    const filter = new URLFilter(['https://example.com/**']);
    const reason = filter.getDenyReason('https://example.com/page');
    expect(reason).toBe(null);
  });
});

describe('URLFilter - Edge Cases', () => {
  it('should handle URLs with special characters', () => {
    const filter = new URLFilter(undefined, ['**/file%20name.pdf']);
    expect(filter.shouldAllow('https://example.com/file%20name.pdf')).toBe(false);
    expect(filter.shouldAllow('https://example.com/other.pdf')).toBe(true);
  });

  it('should handle URLs with fragments', () => {
    // Use regex for fragment matching
    const filter = new URLFilter(undefined, ['/#section$/']);
    expect(filter.shouldAllow('https://example.com/page#section')).toBe(false);
    expect(filter.shouldAllow('https://example.com/page')).toBe(true);
  });

  it('should handle multiple deny patterns', () => {
    const filter = new URLFilter(undefined, [
      '**/*.pdf',
      '**/*.zip',
      '**/admin/**',
      '/\\.(jpg|png|gif)$/i'
    ]);
    expect(filter.shouldAllow('https://example.com/file.pdf')).toBe(false);
    expect(filter.shouldAllow('https://example.com/archive.zip')).toBe(false);
    expect(filter.shouldAllow('https://example.com/admin/page')).toBe(false);
    expect(filter.shouldAllow('https://example.com/image.PNG')).toBe(false);
    expect(filter.shouldAllow('https://example.com/page.html')).toBe(true);
  });

  it('should handle empty pattern arrays', () => {
    const filter = new URLFilter([], []);
    expect(filter.shouldAllow('https://example.com/page')).toBe(true);
  });

  it('should handle invalid regex patterns gracefully', () => {
    // Invalid regex should be treated as literal glob pattern (won't match URLs)
    const filter = new URLFilter(undefined, ['/(invalid[regex/']);
    // Should not throw
    expect(() => filter.shouldAllow('https://example.com/page'));
    // The invalid regex becomes a glob that won't match typical URLs
    expect(filter.shouldAllow('https://example.com/page')).toBe(true);
  });
});
