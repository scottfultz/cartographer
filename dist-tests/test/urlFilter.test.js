/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { URLFilter } from '../src/utils/urlFilter.js';
describe('URLFilter - Glob Pattern Matching', () => {
    it('should allow all URLs when no patterns provided', () => {
        const filter = new URLFilter();
        assert.equal(filter.shouldAllow('https://example.com/page'), true);
        assert.equal(filter.shouldAllow('https://other.com/page'), true);
    });
    it('should match simple glob patterns', () => {
        const filter = new URLFilter(undefined, ['https://example.com/admin/**']);
        assert.equal(filter.shouldAllow('https://example.com/admin/users'), false);
        assert.equal(filter.shouldAllow('https://example.com/admin/settings/page'), false);
        assert.equal(filter.shouldAllow('https://example.com/public/page'), true);
    });
    it('should match wildcard patterns', () => {
        const filter = new URLFilter(undefined, ['**/private/**']);
        assert.equal(filter.shouldAllow('https://example.com/private/data'), false);
        assert.equal(filter.shouldAllow('https://other.com/app/private/page'), false);
        assert.equal(filter.shouldAllow('https://example.com/public/data'), true);
    });
    it('should match file extension patterns', () => {
        const filter = new URLFilter(undefined, ['**/*.pdf', '**/*.zip']);
        assert.equal(filter.shouldAllow('https://example.com/docs/file.pdf'), false);
        assert.equal(filter.shouldAllow('https://example.com/downloads/archive.zip'), false);
        assert.equal(filter.shouldAllow('https://example.com/docs/file.html'), true);
    });
    it('should match query string patterns', () => {
        // Use regex for query string matching
        const filter = new URLFilter(undefined, ['/\\?action=delete/']);
        assert.equal(filter.shouldAllow('https://example.com/page?action=delete'), false);
        assert.equal(filter.shouldAllow('https://example.com/page?action=delete&id=5'), false);
        assert.equal(filter.shouldAllow('https://example.com/page?action=view'), true);
    });
});
describe('URLFilter - Regex Pattern Matching', () => {
    it('should match regex patterns wrapped in slashes', () => {
        const filter = new URLFilter(undefined, ['/\\.pdf$/']);
        assert.equal(filter.shouldAllow('https://example.com/file.pdf'), false);
        assert.equal(filter.shouldAllow('https://example.com/file.html'), true);
    });
    it('should match case-insensitive regex with flags', () => {
        const filter = new URLFilter(undefined, ['/admin/i']);
        assert.equal(filter.shouldAllow('https://example.com/ADMIN/page'), false);
        assert.equal(filter.shouldAllow('https://example.com/Admin/page'), false);
        assert.equal(filter.shouldAllow('https://example.com/public/page'), true);
    });
    it('should match complex regex patterns', () => {
        const filter = new URLFilter(undefined, ['/\\/(login|logout|signup)$/']);
        assert.equal(filter.shouldAllow('https://example.com/login'), false);
        assert.equal(filter.shouldAllow('https://example.com/logout'), false);
        assert.equal(filter.shouldAllow('https://example.com/signup'), false);
        assert.equal(filter.shouldAllow('https://example.com/login/page'), true);
    });
});
describe('URLFilter - Allow List Logic', () => {
    it('should deny URLs not matching allow list', () => {
        const filter = new URLFilter(['https://example.com/**']);
        assert.equal(filter.shouldAllow('https://example.com/page'), true);
        assert.equal(filter.shouldAllow('https://other.com/page'), false);
    });
    it('should allow URLs matching allow list patterns', () => {
        const filter = new URLFilter(['https://example.com/blog/**', 'https://example.com/docs/**']);
        assert.equal(filter.shouldAllow('https://example.com/blog/post'), true);
        assert.equal(filter.shouldAllow('https://example.com/docs/guide'), true);
        assert.equal(filter.shouldAllow('https://example.com/admin/page'), false);
    });
    it('should support regex in allow list', () => {
        const filter = new URLFilter(['/^https:\\/\\/[^/]+\\/api\\//']);
        assert.equal(filter.shouldAllow('https://example.com/api/users'), true);
        assert.equal(filter.shouldAllow('https://other.com/api/posts'), true);
        assert.equal(filter.shouldAllow('https://example.com/web/page'), false);
    });
});
describe('URLFilter - Deny List Priority', () => {
    it('should deny URL even if it matches allow list', () => {
        const filter = new URLFilter(['https://example.com/**'], ['**/admin/**']);
        assert.equal(filter.shouldAllow('https://example.com/blog/post'), true);
        assert.equal(filter.shouldAllow('https://example.com/admin/users'), false);
    });
    it('should check deny list before allow list', () => {
        const filter = new URLFilter(['https://example.com/**'], ['**/*.pdf']);
        assert.equal(filter.shouldAllow('https://example.com/docs/file.pdf'), false);
        assert.equal(filter.shouldAllow('https://example.com/docs/file.html'), true);
    });
});
describe('URLFilter - Helper Methods', () => {
    it('hasAllowList should return correct value', () => {
        const filter1 = new URLFilter(['https://example.com/**']);
        const filter2 = new URLFilter(undefined, ['**/admin/**']);
        const filter3 = new URLFilter();
        assert.equal(filter1.hasAllowList(), true);
        assert.equal(filter2.hasAllowList(), false);
        assert.equal(filter3.hasAllowList(), false);
    });
    it('hasDenyList should return correct value', () => {
        const filter1 = new URLFilter(['https://example.com/**']);
        const filter2 = new URLFilter(undefined, ['**/admin/**']);
        const filter3 = new URLFilter();
        assert.equal(filter1.hasDenyList(), false);
        assert.equal(filter2.hasDenyList(), true);
        assert.equal(filter3.hasDenyList(), false);
    });
    it('getDenyReason should return correct message for deny pattern', () => {
        const filter = new URLFilter(undefined, ['**/admin/**']);
        const reason = filter.getDenyReason('https://example.com/admin/users');
        assert.match(reason || '', /Matched deny pattern/);
    });
    it('getDenyReason should return correct message for missing allow pattern', () => {
        const filter = new URLFilter(['https://example.com/**']);
        const reason = filter.getDenyReason('https://other.com/page');
        assert.equal(reason, 'Not in allow list');
    });
    it('getDenyReason should return null for allowed URL', () => {
        const filter = new URLFilter(['https://example.com/**']);
        const reason = filter.getDenyReason('https://example.com/page');
        assert.equal(reason, null);
    });
});
describe('URLFilter - Edge Cases', () => {
    it('should handle URLs with special characters', () => {
        const filter = new URLFilter(undefined, ['**/file%20name.pdf']);
        assert.equal(filter.shouldAllow('https://example.com/file%20name.pdf'), false);
        assert.equal(filter.shouldAllow('https://example.com/other.pdf'), true);
    });
    it('should handle URLs with fragments', () => {
        // Use regex for fragment matching
        const filter = new URLFilter(undefined, ['/#section$/']);
        assert.equal(filter.shouldAllow('https://example.com/page#section'), false);
        assert.equal(filter.shouldAllow('https://example.com/page'), true);
    });
    it('should handle multiple deny patterns', () => {
        const filter = new URLFilter(undefined, [
            '**/*.pdf',
            '**/*.zip',
            '**/admin/**',
            '/\\.(jpg|png|gif)$/i'
        ]);
        assert.equal(filter.shouldAllow('https://example.com/file.pdf'), false);
        assert.equal(filter.shouldAllow('https://example.com/archive.zip'), false);
        assert.equal(filter.shouldAllow('https://example.com/admin/page'), false);
        assert.equal(filter.shouldAllow('https://example.com/image.PNG'), false);
        assert.equal(filter.shouldAllow('https://example.com/page.html'), true);
    });
    it('should handle empty pattern arrays', () => {
        const filter = new URLFilter([], []);
        assert.equal(filter.shouldAllow('https://example.com/page'), true);
    });
    it('should handle invalid regex patterns gracefully', () => {
        // Invalid regex should be treated as literal glob pattern (won't match URLs)
        const filter = new URLFilter(undefined, ['/(invalid[regex/']);
        // Should not throw
        assert.doesNotThrow(() => filter.shouldAllow('https://example.com/page'));
        // The invalid regex becomes a glob that won't match typical URLs
        assert.equal(filter.shouldAllow('https://example.com/page'), true);
    });
});
//# sourceMappingURL=urlFilter.test.js.map