import { describe, expect, test } from 'vitest';
import { planPacks, type DatasetPresence } from '../../../src/io/atlas/packPlanner.js';

const dataset = (name: string, recordCount = 1): DatasetPresence => ({ name, recordCount });

describe('planPacks', () => {
  test('raw mode marks A11y-Full as missing with explanatory note', () => {
    const packs = planPacks({
      renderMode: 'raw',
      datasets: [dataset('pages'), dataset('edges'), dataset('assets')],
      hasScreenshots: false
    });

    const full = packs.find(pack => pack.name === 'A11y-Full');
    expect(full).toBeDefined();
    expect(full?.state).toBe('missing');
    expect(full?.notes).toContain('Full accessibility extracts require prerender or full mode');

    const visual = packs.find(pack => pack.name === 'Visual');
    expect(visual?.state).toBe('missing');
  });

  test('full mode embeds full accessibility, perf, and visual packs when data is present', () => {
    const packs = planPacks({
      renderMode: 'full',
      datasets: [
        dataset('pages'),
        dataset('edges'),
        dataset('assets'),
        dataset('accessibility'),
        dataset('dom_snapshots'),
        dataset('forms'),
        dataset('images'),
        dataset('perf')
      ],
      hasScreenshots: true
    });

    const light = packs.find(pack => pack.name === 'A11y-Light');
    const full = packs.find(pack => pack.name === 'A11y-Full');
    const perf = packs.find(pack => pack.name === 'Perf');
    const visual = packs.find(pack => pack.name === 'Visual');

    expect(light?.state).toBe('embedded');
    expect(full?.state).toBe('embedded');
    expect(perf?.state).toBe('embedded');
    expect(visual?.state).toBe('embedded');
  });

  test('visual pack advertises sidecar when URI provided', () => {
    const packs = planPacks({
      renderMode: 'prerender',
      datasets: [dataset('pages'), dataset('edges'), dataset('assets')],
      hasScreenshots: false,
      visualSidecarUri: 'https://cdn.example.com/visual.zip',
      visualSidecarSha256: 'abc123'
    });

    const visual = packs.find(pack => pack.name === 'Visual');
    expect(visual?.state).toBe('sidecar');
    expect(visual?.uri).toBe('https://cdn.example.com/visual.zip');
    expect(visual?.sha256).toBe('abc123');
  });
});
