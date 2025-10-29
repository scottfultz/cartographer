import { describe, expect, test } from 'vitest';
import type { AtlasManifest, AtlasPack } from '@atlas/spec';
import { validatePackPlan } from '../../../src/io/validate/packPlanValidator.js';

function buildManifest(partial: Partial<AtlasManifest>): AtlasManifest {
  return {
    atlasVersion: '1.0',
    schemaVersion: '2025-10-22',
    identity: { primaryOrigin: 'https://example.com', domain: 'example.com', publicSuffix: 'com' },
    crawlContext: { mode: 'prerender', robots: true, urlNormalization: 'policy-1.0', urlNormalizationRules: [] },
    packs: [],
    parts: { pages: [], edges: [], assets: [], responses: [], errors: [] },
    schemas: { pages: '', edges: '', assets: '', responses: '', errors: '' },
    datasets: {},
    coverage: { matrix: [] as any },
    storage: { compression: { algorithm: 'zstd', level: 3 } } as any,
    consumers: [],
    capabilities: {} as any,
    notes: [],
    integrity: { files: {} },
    createdAt: new Date().toISOString(),
    generator: 'test',
    ...partial
  } as AtlasManifest;
}

function pack(name: string, state: 'embedded' | 'sidecar' | 'missing', extras: Partial<AtlasPack> = {}): AtlasPack {
  return { name: name as AtlasPack['name'], state, version: '1.0.0', ...extras };
}

describe('validatePackPlan', () => {
  test('passes when pack states align with datasets', () => {
    const manifest = buildManifest({
      crawlContext: { mode: 'full', robots: true, urlNormalization: 'policy-1.0', urlNormalizationRules: [] },
      packs: [
        pack('Core', 'embedded'),
        pack('A11y-Light', 'embedded'),
        pack('A11y-Full', 'embedded'),
        pack('Perf', 'embedded'),
        pack('Visual', 'embedded')
      ],
      datasets: {
        accessibility: { name: 'accessibility', recordCount: 5, present: true } as any,
        dom_snapshots: { name: 'dom_snapshots', recordCount: 1, present: true } as any,
        forms: { name: 'forms', recordCount: 1, present: true } as any,
        images: { name: 'images', recordCount: 1, present: true } as any,
        perf: { name: 'perf', recordCount: 2, present: true } as any
      },
      parts: {
        pages: ['pages/part.jsonl.zst'],
        edges: [],
        assets: [],
        responses: [],
        errors: [],
        accessibility: ['accessibility/part.jsonl.zst'],
        dom_snapshots: ['dom_snapshots/part.jsonl.zst'],
        styles: []
      } as any,
      storage: {
        compression: { algorithm: 'zstd', level: 3 },
        media: {
          location: 'media/',
          formats: ['jpeg'],
          screenshots: { enabled: true, quality: 80, viewports: ['desktop'] }
        }
      } as any
    });

    const result = validatePackPlan(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.summary).toHaveLength(5);
  });

  test('flags mismatched accessibility packs', () => {
    const manifest = buildManifest({
      packs: [
        pack('Core', 'embedded'),
        pack('A11y-Light', 'embedded'),
        pack('A11y-Full', 'missing'),
        pack('Perf', 'missing'),
        pack('Visual', 'missing')
      ],
      datasets: {},
      storage: { compression: { algorithm: 'zstd', level: 3 } } as any
    });

    const result = validatePackPlan(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('A11y-Light pack marked embedded but accessibility dataset is missing or empty');
  });

  test('requires full pack when dom snapshots are present outside raw mode', () => {
    const manifest = buildManifest({
      crawlContext: { mode: 'full', robots: true, urlNormalization: 'policy-1.0', urlNormalizationRules: [] },
      packs: [
        pack('Core', 'embedded'),
        pack('A11y-Light', 'embedded'),
        pack('A11y-Full', 'missing'),
        pack('Perf', 'missing'),
        pack('Visual', 'missing')
      ],
      datasets: {
        dom_snapshots: { name: 'dom_snapshots', recordCount: 1 } as any
      },
      parts: { pages: [], edges: [], assets: [], responses: [], errors: [], dom_snapshots: ['dom_snapshots/part.jsonl.zst'] } as any,
      storage: { compression: { algorithm: 'zstd', level: 3 } } as any
    });

    const result = validatePackPlan(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('A11y-Full pack marked missing despite accessibility sidecar datasets being present');
  });

  test('requires visual sidecar uri when marked as sidecar', () => {
    const manifest = buildManifest({
      packs: [
        pack('Core', 'embedded'),
        pack('A11y-Light', 'missing'),
        pack('A11y-Full', 'missing'),
        pack('Perf', 'missing'),
        pack('Visual', 'sidecar')
      ],
      storage: { compression: { algorithm: 'zstd', level: 3 } } as any
    });

    const result = validatePackPlan(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Visual pack declared as sidecar but uri is missing');
  });

  test('flags visual pack missing while screenshots embedded', () => {
    const manifest = buildManifest({
      packs: [
        pack('Core', 'embedded'),
        pack('A11y-Light', 'missing'),
        pack('A11y-Full', 'missing'),
        pack('Perf', 'missing'),
        pack('Visual', 'missing')
      ],
      storage: {
        compression: { algorithm: 'zstd', level: 3 },
        media: {
          location: 'media/',
          formats: ['jpeg'],
          screenshots: { enabled: true, quality: 80, viewports: ['desktop'] }
        }
      } as any
    });

    const result = validatePackPlan(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Visual pack marked missing but screenshots are embedded in archive');
  });
});
