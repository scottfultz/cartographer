/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { AtlasManifest } from '@atlas/spec';

export type PackValidationSummary = {
  name: string;
  state: string;
  notes?: string[];
  issues?: string[];
};

function datasetHasRecords(manifest: AtlasManifest, datasetName: string): boolean {
  if (manifest.datasets && manifest.datasets[datasetName]) {
    const dataset = manifest.datasets[datasetName]!;
    if (typeof dataset.recordCount === 'number' && dataset.recordCount > 0) {
      return true;
    }
    if (typeof dataset.present === 'boolean') {
      return dataset.present;
    }
    const partCountValue = typeof dataset.partCount === 'number'
      ? dataset.partCount
      : typeof dataset.parts === 'number'
        ? dataset.parts
        : 0;
    if (partCountValue > 0) {
      return true;
    }
  }

  const coverageEntry = manifest.coverage?.matrix?.find(item => item.part === datasetName);
  if (coverageEntry) {
    if (coverageEntry.present && (coverageEntry.row_count ?? 0) > 0) {
      return true;
    }
  }

  const partsRecord = (manifest.parts as unknown as Record<string, string[]>) || {};
  const partList = partsRecord[datasetName];
  return Array.isArray(partList) && partList.length > 0;
}

function anyDatasetPresent(manifest: AtlasManifest, datasetNames: string[]): boolean {
  return datasetNames.some(name => datasetHasRecords(manifest, name));
}

function manifestHasScreenshots(manifest: AtlasManifest): boolean {
  return Boolean(manifest.storage?.media?.screenshots?.enabled);
}

export function validatePackPlan(manifest: AtlasManifest): {
  valid: boolean;
  errors?: string[];
  summary: PackValidationSummary[];
} {
  if (!manifest.packs || manifest.packs.length === 0) {
    return { valid: true, summary: [] };
  }

  const errors: string[] = [];
  const summary: PackValidationSummary[] = [];
  const renderMode = manifest.crawlContext?.mode;

  const packsByName = new Map(manifest.packs.map(pack => [pack.name, pack]));

  const ensurePackExists = (name: string) => {
    const pack = packsByName.get(name as any);
    if (!pack) {
      errors.push(`Missing pack declaration for ${name}`);
    }
    return pack;
  };

  const corePack = ensurePackExists('Core');
  if (corePack) {
    summary.push({ name: corePack.name, state: corePack.state, notes: corePack.notes });
    if (corePack.state !== 'embedded') {
      errors.push(`Core pack must be "embedded" (found ${corePack.state})`);
    }
  }

  const lightPack = ensurePackExists('A11y-Light');
  if (lightPack) {
    const hasLightDataset = anyDatasetPresent(manifest, ['accessibility', 'a11y.light']);
    summary.push({ name: lightPack.name, state: lightPack.state, notes: lightPack.notes });
    if (lightPack.state === 'embedded' && !hasLightDataset) {
      errors.push('A11y-Light pack marked embedded but accessibility dataset is missing or empty');
    }
    if (lightPack.state === 'missing' && hasLightDataset) {
      errors.push('A11y-Light pack marked missing but accessibility dataset is present');
    }
  }

  const fullPack = ensurePackExists('A11y-Full');
  if (fullPack) {
    const hasFullDataset = anyDatasetPresent(manifest, [
      'dom_snapshots',
      'a11y.tree',
      'aria.refs',
      'forms',
      'images'
    ]);
    summary.push({ name: fullPack.name, state: fullPack.state, notes: fullPack.notes });
    if (fullPack.state === 'embedded' && !hasFullDataset) {
      errors.push('A11y-Full pack marked embedded but no DOM snapshots or auxiliary datasets are present');
    }
    if (renderMode && renderMode !== 'raw' && hasFullDataset && fullPack.state === 'missing') {
      errors.push('A11y-Full pack marked missing despite accessibility sidecar datasets being present');
    }
  }

  const perfPack = ensurePackExists('Perf');
  if (perfPack) {
    const hasPerfDataset = anyDatasetPresent(manifest, ['perf', 'performance']);
    summary.push({ name: perfPack.name, state: perfPack.state, notes: perfPack.notes });
    if (perfPack.state === 'embedded' && !hasPerfDataset) {
      errors.push('Perf pack marked embedded but no performance dataset detected');
    }
    if (perfPack.state === 'missing' && hasPerfDataset) {
      errors.push('Perf pack marked missing but performance dataset is present');
    }
  }

  const visualPack = ensurePackExists('Visual');
  if (visualPack) {
    const screenshotsEmbedded = manifestHasScreenshots(manifest);
    const issues: string[] = [];

    if (visualPack.state === 'embedded' && !screenshotsEmbedded) {
      errors.push('Visual pack marked embedded but manifest.storage.media.screenshots.enabled is false');
      issues.push('screenshots missing');
    }

    if (visualPack.state === 'sidecar') {
      if (!visualPack.uri || visualPack.uri.trim().length === 0) {
        errors.push('Visual pack declared as sidecar but uri is missing');
        issues.push('uri missing');
      }
    }

    if (visualPack.state === 'missing' && screenshotsEmbedded) {
      errors.push('Visual pack marked missing but screenshots are embedded in archive');
      issues.push('screenshots present');
    }

    summary.push({ name: visualPack.name, state: visualPack.state, notes: visualPack.notes, issues: issues.length ? issues : undefined });
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    summary
  };
}
