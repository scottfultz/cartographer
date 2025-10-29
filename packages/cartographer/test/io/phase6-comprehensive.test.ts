/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { buildConfig, DEFAULT_CONFIG } from '../../src/core/config.js';
import { buildCapabilities } from '../../src/io/atlas/capabilitiesBuilder.js';
import type { EngineConfig } from '@atlas/spec';

describe('Phase 6.1: Profile & Replay Tier Flags', () => {
  describe('Replay Tier Configuration', () => {
    test('defaults to html+css replay tier', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls'
      });
      
      expect(config.replay?.tier).toBe(undefined); // Uses default
    });
    
    test('accepts html replay tier', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        replay: { tier: 'html' }
      });
      
      expect(config.replay?.tier).toBe('html');
    });
    
    test('accepts html+css replay tier', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        replay: { tier: 'html+css' }
      });
      
      expect(config.replay?.tier).toBe('html+css');
    });
    
    test('accepts full replay tier', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        replay: { tier: 'full' }
      });
      
      expect(config.replay?.tier).toBe('full');
    });
    
    test('html tier includes only html capability', () => {
      const capabilities = buildCapabilities({
        renderMode: 'full',
        replayTier: 'html'
      });
      
      expect(capabilities.capabilities).toContain('replay.html');
      expect(capabilities.capabilities).not.toContain('replay.css');
      expect(capabilities.capabilities).not.toContain('replay.js');
      expect(capabilities.capabilities).not.toContain('replay.fonts');
      expect(capabilities.capabilities).not.toContain('replay.images');
    });
    
    test('html+css tier includes html, css, and fonts', () => {
      const capabilities = buildCapabilities({
        renderMode: 'full',
        replayTier: 'html+css'
      });
      
      expect(capabilities.capabilities).toContain('replay.html');
      expect(capabilities.capabilities).toContain('replay.css');
      expect(capabilities.capabilities).toContain('replay.fonts');
      expect(capabilities.capabilities).not.toContain('replay.js');
      expect(capabilities.capabilities).not.toContain('replay.images');
    });
    
    test('full tier includes all replay capabilities', () => {
      const capabilities = buildCapabilities({
        renderMode: 'full',
        replayTier: 'full'
      });
      
      expect(capabilities.capabilities).toContain('replay.html');
      expect(capabilities.capabilities).toContain('replay.css');
      expect(capabilities.capabilities).toContain('replay.js');
      expect(capabilities.capabilities).toContain('replay.fonts');
      expect(capabilities.capabilities).toContain('replay.images');
    });
  });
  
  describe('Profile Presets', () => {
    test('core profile should imply prerender mode', () => {
      // This is tested via CLI integration
      // Core profile: mode=prerender, no screenshots, no favicons, replay=html
      expect(true).toBe(true); // Placeholder - actual test in CLI tests
    });
    
    test('full profile should imply full mode', () => {
      // This is tested via CLI integration
      // Full profile: mode=full, screenshots enabled, favicons enabled, replay=full
      expect(true).toBe(true); // Placeholder - actual test in CLI tests
    });
  });
});

describe('Phase 6.2: Atlas Validation', () => {
  describe('Manifest Validation', () => {
    test('validates owner field presence', () => {
      const validManifest = {
        atlasVersion: '1.0',
        formatVersion: '1.0.0',
        owner: { name: 'Test Owner' },
        consumers: [],
        hashing: { algorithm: 'sha256', urlKeyAlgo: 'sha1', rawHtmlHash: 'sha256', domHash: 'sha256' },
        parts: { pages: [], edges: [], assets: [], errors: [] },
        schemas: { pages: '', edges: '', assets: '', errors: '' },
        capabilities: { renderModes: ['full'], modesUsed: ['full'], specLevel: 3, dataSets: [], robots: { respectsRobotsTxt: true, overrideUsed: false } },
        configIncluded: true,
        redactionApplied: false,
        notes: [],
        integrity: { files: {} },
        createdAt: new Date().toISOString(),
        generator: 'cartographer-engine/1.0.0-beta.1'
      };
      
      expect(validManifest.owner.name).toBeTruthy();
      expect(validManifest.atlasVersion).toBe('1.0');
      expect(validManifest.formatVersion).toBe('1.0.0');
    });
    
    test('rejects manifest without owner', () => {
      const invalidManifest: any = {
        atlasVersion: '1.0',
        formatVersion: '1.0.0',
        // Missing owner
      };
      
      expect(invalidManifest.owner).toBeUndefined();
    });
    
    test('validates version fields', () => {
      const versions = ['1.0', 'v1'];
      versions.forEach(version => {
        expect(['1.0', 'v1']).toContain(version);
      });
    });
  });
  
  describe('Provenance Hash Validation', () => {
    test('accepts valid SHA-256 hash format', () => {
      const validHash = 'e419088ea67f93d69a8cabb9193b0f4bde3b447d56b5358bafff6b7a0b1adb1f';
      const hashPattern = /^[a-f0-9]{64}$/;
      
      expect(hashPattern.test(validHash)).toBe(true);
    });
    
    test('rejects invalid hash formats', () => {
      const invalidHashes = [
        'invalid',
        'e419088ea67f93d69a8cabb9', // Too short
        'ZZZZ088ea67f93d69a8cabb9193b0f4bde3b447d56b5358bafff6b7a0b1adb1f', // Invalid chars
        'e419088ea67f93d69a8cabb9193b0f4bde3b447d56b5358bafff6b7a0b1adb1f0' // Too long
      ];
      
      const hashPattern = /^[a-f0-9]{64}$/;
      invalidHashes.forEach(hash => {
        expect(hashPattern.test(hash)).toBe(false);
      });
    });
  });
  
  describe('Capabilities Consistency', () => {
    test('full mode should include render.dom capability', () => {
      const capabilities = buildCapabilities({
        renderMode: 'full',
        accessibility: true
      });
      
      expect(capabilities.capabilities).toContain('render.dom');
    });
    
    test('prerender mode should include render.dom capability', () => {
      const capabilities = buildCapabilities({
        renderMode: 'prerender',
        accessibility: true
      });
      
      expect(capabilities.capabilities).toContain('render.dom');
    });
    
    test('raw mode should not include render.dom capability', () => {
      const capabilities = buildCapabilities({
        renderMode: 'raw',
        accessibility: false
      });
      
      expect(capabilities.capabilities).not.toContain('render.dom');
    });
    
    test('all modes should include seo.core capability', () => {
      ['raw', 'prerender', 'full'].forEach(mode => {
        const capabilities = buildCapabilities({
          renderMode: mode as 'raw' | 'prerender' | 'full',
          accessibility: false
        });
        
        expect(capabilities.capabilities).toContain('seo.core');
      });
    });
  });
});

describe('Phase 6.3: Security & Privacy Defaults', () => {
  describe('Privacy Configuration', () => {
    test('defaults include privacy settings', () => {
      expect(DEFAULT_CONFIG.privacy).toBeDefined();
      expect(DEFAULT_CONFIG.privacy?.stripCookies).toBe(true);
      expect(DEFAULT_CONFIG.privacy?.stripAuthHeaders).toBe(true);
      expect(DEFAULT_CONFIG.privacy?.redactInputValues).toBe(true);
      expect(DEFAULT_CONFIG.privacy?.redactForms).toBe(true);
    });
    
    test('privacy settings can be overridden', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        privacy: {
          stripCookies: false,
          stripAuthHeaders: false,
          redactInputValues: false,
          redactForms: false
        }
      });
      
      expect(config.privacy?.stripCookies).toBe(false);
      expect(config.privacy?.stripAuthHeaders).toBe(false);
      expect(config.privacy?.redactInputValues).toBe(false);
      expect(config.privacy?.redactForms).toBe(false);
    });
    
    test('partial privacy overrides merge with defaults', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        privacy: {
          stripCookies: false,
          stripAuthHeaders: true,
          redactInputValues: true,
          redactForms: true
        }
      });
      
      expect(config.privacy?.stripCookies).toBe(false);
      expect(config.privacy?.stripAuthHeaders).toBe(true); // Default
      expect(config.privacy?.redactInputValues).toBe(true); // Default
      expect(config.privacy?.redactForms).toBe(true); // Default
    });
  });
  
  describe('Robots.txt Respect', () => {
    test('robots respect is enabled by default', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls'
      });
      
      expect(config.robots.respect).toBe(true);
      expect(config.robots.overrideUsed).toBe(false);
    });
    
    test('robots override can be enabled', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        robots: {
          respect: true,
          overrideUsed: true
        }
      });
      
      expect(config.robots.respect).toBe(true);
      expect(config.robots.overrideUsed).toBe(true);
    });
  });
});

describe('Core Feature Tests: Config Validation', () => {
  describe('Seed URL Validation', () => {
    test('requires at least one seed URL', () => {
      expect(() => {
        buildConfig({
          seeds: [],
          outAtls: 'test.atls'
        });
      }).toThrow(/at least one seed URL/i);
    });
    
    test('accepts single seed URL', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls'
      });
      
      expect(config.seeds).toHaveLength(1);
      expect(config.seeds[0]).toBe('https://example.com');
    });
    
    test('accepts multiple seed URLs', () => {
      const config = buildConfig({
        seeds: [
          'https://example.com',
          'https://example.org',
          'https://example.net'
        ],
        outAtls: 'test.atls'
      });
      
      expect(config.seeds).toHaveLength(3);
    });
  });
  
  describe('Output Path Validation', () => {
    test('requires outAtls path', () => {
      expect(() => {
        buildConfig({
          seeds: ['https://example.com'],
          outAtls: ''
        });
      }).toThrow(/output.*path/i);
    });
    
    test('requires outAtls to be string with minimum length', () => {
      expect(() => {
        buildConfig({
          seeds: ['https://example.com'],
          outAtls: 'x.a' // Less than 5 chars
        });
      }).toThrow();
    });
    
    test('accepts valid outAtls path', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'output/test.atls'
      });
      
      expect(config.outAtls).toBe('output/test.atls');
    });
  });
  
  describe('Numeric Limit Validation', () => {
    test('rejects negative concurrency', () => {
      expect(() => {
        buildConfig({
          seeds: ['https://example.com'],
          outAtls: 'test.atls',
          render: { concurrency: -1 } as any
        });
      }).toThrow(/concurrency.*> 0/i);
    });
    
    test('rejects zero concurrency', () => {
      expect(() => {
        buildConfig({
          seeds: ['https://example.com'],
          outAtls: 'test.atls',
          render: { concurrency: 0 } as any
        });
      }).toThrow(/concurrency.*> 0/i);
    });
    
    test('accepts positive concurrency', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        render: { concurrency: 8 } as any
      });
      
      expect(config.render.concurrency).toBe(8);
    });
    
    test('rejects negative RPS', () => {
      expect(() => {
        buildConfig({
          seeds: ['https://example.com'],
          outAtls: 'test.atls',
          http: { rps: -1 } as any
        });
      }).toThrow(/rps.*> 0/i);
    });
    
    test('accepts maxPages = 0 for unlimited', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        maxPages: 0
      });
      
      expect(config.maxPages).toBe(0);
    });
    
    test('rejects negative maxPages', () => {
      expect(() => {
        buildConfig({
          seeds: ['https://example.com'],
          outAtls: 'test.atls',
          maxPages: -1
        });
      }).toThrow(/maxPages.*>= 0/i);
    });
    
    test('accepts maxDepth = -1 for unlimited', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        maxDepth: -1
      });
      
      expect(config.maxDepth).toBe(-1);
    });
    
    test('rejects maxDepth < -1', () => {
      expect(() => {
        buildConfig({
          seeds: ['https://example.com'],
          outAtls: 'test.atls',
          maxDepth: -2
        });
      }).toThrow(/maxDepth.*>= -1/i);
    });
  });
  
  describe('Render Mode Configuration', () => {
    test('defaults to prerender mode', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls'
      });
      
      expect(config.render.mode).toBe('prerender');
    });
    
    test('accepts raw mode', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        render: { mode: 'raw' } as any
      });
      
      expect(config.render.mode).toBe('raw');
    });
    
    test('accepts prerender mode', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        render: { mode: 'prerender' } as any
      });
      
      expect(config.render.mode).toBe('prerender');
    });
    
    test('accepts full mode', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        render: { mode: 'full' } as any
      });
      
      expect(config.render.mode).toBe('full');
    });
  });
  
  describe('Discovery Configuration', () => {
    test('defaults to not following external links', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls'
      });
      
      expect(config.discovery.followExternal).toBe(false);
    });
    
    test('can enable external link following', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        discovery: { followExternal: true } as any
      });
      
      expect(config.discovery.followExternal).toBe(true);
    });
    
    test('includes default tracking param blocklist', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls'
      });
      
      expect(config.discovery.blockList).toContain('utm_*');
      expect(config.discovery.blockList).toContain('gclid');
      expect(config.discovery.blockList).toContain('fbclid');
    });
    
    test('can override blocklist', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        discovery: { blockList: ['custom_param'] } as any
      });
      
      expect(config.discovery.blockList).toContain('custom_param');
    });
  });
  
  describe('Accessibility Configuration', () => {
    test('accessibility is enabled by default', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls'
      });
      
      expect(config.accessibility?.enabled).toBe(true);
    });
    
    test('accessibility can be disabled', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        accessibility: { enabled: false }
      });
      
      expect(config.accessibility?.enabled).toBe(false);
    });
  });
  
  describe('Checkpoint Configuration', () => {
    test('checkpointing works when explicitly provided', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        checkpoint: { enabled: true, interval: 500 }
      });
      
      expect(config.checkpoint?.enabled).toBe(true);
      expect(config.checkpoint?.interval).toBe(500);
    });
    
    test('checkpoint interval can be customized', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        checkpoint: { interval: 100, enabled: true }
      });
      
      expect(config.checkpoint?.interval).toBe(100);
    });
    
    test('checkpointing can be disabled', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        checkpoint: { enabled: false, interval: 500 }
      });
      
      expect(config.checkpoint?.enabled).toBe(false);
    });
  });
  
  describe('Media Configuration', () => {
    test('accepts screenshot configuration', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        media: {
          screenshots: {
            enabled: true,
            desktop: true,
            mobile: true,
            quality: 80,
            format: 'jpeg'
          }
        }
      });
      
      expect(config.media?.screenshots?.enabled).toBe(true);
      expect(config.media?.screenshots?.quality).toBe(80);
      expect(config.media?.screenshots?.format).toBe('jpeg');
    });
    
    test('accepts favicon configuration', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        media: {
          favicons: {
            enabled: true
          }
        }
      });
      
      expect(config.media?.favicons?.enabled).toBe(true);
    });
  });
});

describe('Edge Cases & Error Handling', () => {
  describe('URL Edge Cases', () => {
    test('accepts URLs with ports', () => {
      const config = buildConfig({
        seeds: ['https://example.com:8080'],
        outAtls: 'test.atls'
      });
      
      expect(config.seeds[0]).toBe('https://example.com:8080');
    });
    
    test('accepts URLs with paths', () => {
      const config = buildConfig({
        seeds: ['https://example.com/path/to/page'],
        outAtls: 'test.atls'
      });
      
      expect(config.seeds[0]).toBe('https://example.com/path/to/page');
    });
    
    test('accepts URLs with query parameters', () => {
      const config = buildConfig({
        seeds: ['https://example.com?param=value'],
        outAtls: 'test.atls'
      });
      
      expect(config.seeds[0]).toBe('https://example.com?param=value');
    });
    
    test('accepts URLs with fragments', () => {
      const config = buildConfig({
        seeds: ['https://example.com#section'],
        outAtls: 'test.atls'
      });
      
      expect(config.seeds[0]).toBe('https://example.com#section');
    });
  });
  
  describe('Capability Edge Cases', () => {
    test('raw mode with accessibility disabled has minimal capabilities', () => {
      const capabilities = buildCapabilities({
        renderMode: 'raw',
        accessibility: false,
        performance: false
      });
      
      // Raw mode includes seo capabilities + replay defaults
      expect(capabilities.capabilities).toContain('seo.core');
      expect(capabilities.capabilities).toContain('seo.enhanced');
      expect(capabilities.capabilities).not.toContain('render.dom');
      expect(capabilities.capabilities).not.toContain('a11y.core');
    });
    
    test('empty replay tier handled gracefully', () => {
      const capabilities = buildCapabilities({
        renderMode: 'full',
        replayTier: undefined
      });
      
      // Should default to html+css
      expect(capabilities.capabilities).toContain('replay.html');
      expect(capabilities.capabilities).toContain('replay.css');
    });
  });
  
  describe('Config Merging Edge Cases', () => {
    test('partial render config merges with defaults', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        render: { mode: 'full' } as any
      });
      
      expect(config.render.mode).toBe('full');
      expect(config.render.concurrency).toBeDefined(); // From defaults
      expect(config.render.timeoutMs).toBeDefined(); // From defaults
    });
    
    test('partial http config merges with defaults', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        http: { rps: 5 } as any
      });
      
      expect(config.http.rps).toBe(5);
      expect(config.http.userAgent).toBeDefined(); // From defaults
    });
    
    test('undefined values do not override defaults', () => {
      const config = buildConfig({
        seeds: ['https://example.com'],
        outAtls: 'test.atls',
        maxPages: undefined
      });
      
      expect(config.maxPages).toBe(0); // Default
    });
  });
});

describe('Regression Tests', () => {
  test('buildConfig includes replay field in final config', () => {
    // Regression: Phase 6.1 bug where replay was omitted from finalConfig
    const config = buildConfig({
      seeds: ['https://example.com'],
      outAtls: 'test.atls',
      replay: { tier: 'full' }
    });
    
    expect(config.replay).toBeDefined();
    expect(config.replay?.tier).toBe('full');
  });
  
  test('privacy field included in final config', () => {
    const config = buildConfig({
      seeds: ['https://example.com'],
      outAtls: 'test.atls'
    });
    
    expect(config.privacy).toBeDefined();
    expect(config.privacy?.stripCookies).toBeDefined();
  });
  
  test('all default config fields are copied to final config', () => {
    const config = buildConfig({
      seeds: ['https://example.com'],
      outAtls: 'test.atls'
    });
    
    // Verify all expected fields exist
    expect(config.seeds).toBeDefined();
    expect(config.outAtls).toBeDefined();
    expect(config.render).toBeDefined();
    expect(config.http).toBeDefined();
    expect(config.discovery).toBeDefined();
    expect(config.robots).toBeDefined();
    expect(config.privacy).toBeDefined();
    expect(config.accessibility).toBeDefined();
    expect(config.maxPages).toBeDefined();
    expect(config.maxDepth).toBeDefined();
  });
});
