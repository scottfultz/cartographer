/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, test, expect } from 'vitest';
import { buildCapabilities, hasCapability, getReplayCapabilities, getReplayTier } from '../../src/io/atlas/capabilitiesBuilder.js';
import { ProvenanceTracker } from '../../src/io/atlas/provenanceTracker.js';

describe('CapabilitiesBuilder', () => {
  test('builds capabilities for raw mode', () => {
    const capabilities = buildCapabilities({
      renderMode: 'raw',
      accessibility: false,
      performance: false,
      seoEnhanced: true
    });
    
    expect(capabilities.version).toBe('v1');
    expect(capabilities.capabilities).toContain('seo.core');
    expect(capabilities.capabilities).toContain('seo.enhanced');
    expect(capabilities.capabilities).not.toContain('render.dom');
    expect(capabilities.capabilities).not.toContain('a11y.core');
    expect(capabilities.compatibility.min_sdk_version).toBe('1.0.0');
  });
  
  test('builds capabilities for prerender mode with accessibility', () => {
    const capabilities = buildCapabilities({
      renderMode: 'prerender',
      accessibility: true,
      performance: false,
      seoEnhanced: true
    });
    
    expect(capabilities.capabilities).toContain('seo.core');
    expect(capabilities.capabilities).toContain('seo.enhanced');
    expect(capabilities.capabilities).toContain('render.dom');
    expect(capabilities.capabilities).toContain('a11y.core');
    expect(capabilities.capabilities).not.toContain('render.netlog');
  });
  
  test('builds capabilities for full mode with all features', () => {
    const capabilities = buildCapabilities({
      renderMode: 'full',
      accessibility: true,
      performance: true,
      seoEnhanced: true,
      replayTier: 'full'
    });
    
    expect(capabilities.capabilities).toContain('seo.core');
    expect(capabilities.capabilities).toContain('seo.enhanced');
    expect(capabilities.capabilities).toContain('render.dom');
    expect(capabilities.capabilities).toContain('a11y.core');
    expect(capabilities.capabilities).toContain('render.netlog');
    expect(capabilities.capabilities).toContain('replay.html');
    expect(capabilities.capabilities).toContain('replay.css');
    expect(capabilities.capabilities).toContain('replay.js');
    expect(capabilities.capabilities).toContain('replay.fonts');
    expect(capabilities.capabilities).toContain('replay.images');
  });
  
  test('builds capabilities for html replay tier', () => {
    const capabilities = buildCapabilities({
      renderMode: 'full',
      replayTier: 'html'
    });
    
    expect(capabilities.capabilities).toContain('replay.html');
    expect(capabilities.capabilities).not.toContain('replay.css');
    expect(capabilities.capabilities).not.toContain('replay.js');
  });
  
  test('builds capabilities for html+css replay tier', () => {
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
  
  test('accessibility is enabled by default', () => {
    const capabilities = buildCapabilities({
      renderMode: 'full'
    });
    
    expect(capabilities.capabilities).toContain('a11y.core');
  });
  
  test('can disable accessibility explicitly', () => {
    const capabilities = buildCapabilities({
      renderMode: 'full',
      accessibility: false
    });
    
    expect(capabilities.capabilities).not.toContain('a11y.core');
  });
  
  test('hasCapability helper works correctly', () => {
    const capabilities = buildCapabilities({
      renderMode: 'full',
      replayTier: 'full'
    });
    
    expect(hasCapability(capabilities, 'seo.core')).toBe(true);
    expect(hasCapability(capabilities, 'replay.js')).toBe(true);
    expect(hasCapability(capabilities, 'nonexistent.capability')).toBe(false);
  });
  
  test('getReplayCapabilities filters replay capabilities', () => {
    const capabilities = buildCapabilities({
      renderMode: 'full',
      replayTier: 'html+css'
    });
    
    const replayCaps = getReplayCapabilities(capabilities);
    expect(replayCaps).toContain('replay.html');
    expect(replayCaps).toContain('replay.css');
    expect(replayCaps).toContain('replay.fonts');
    expect(replayCaps).not.toContain('seo.core');
  });
  
  test('getReplayTier determines tier from capabilities', () => {
    const fullCaps = buildCapabilities({
      renderMode: 'full',
      replayTier: 'full'
    });
    expect(getReplayTier(fullCaps)).toBe('full');
    
    const htmlCssCaps = buildCapabilities({
      renderMode: 'full',
      replayTier: 'html+css'
    });
    expect(getReplayTier(htmlCssCaps)).toBe('html+css');
    
    const htmlCaps = buildCapabilities({
      renderMode: 'full',
      replayTier: 'html'
    });
    expect(getReplayTier(htmlCaps)).toBe('html');
    
    const noCaps = buildCapabilities({
      renderMode: 'raw'
    });
    expect(getReplayTier(noCaps)).toBe('html+css'); // Default tier
  });
});

describe('ProvenanceTracker', () => {
  test('adds extraction provenance record', () => {
    const tracker = new ProvenanceTracker();
    
    tracker.addExtraction(
      'pages.v1',
      'extractor-pages',
      '1.0.0',
      { mode: 'full' },
      { record_count: 100, hash_sha256: 'a'.repeat(64) }
    );
    
    const records = tracker.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].dataset_name).toBe('pages.v1');
    expect(records[0].producer.app).toBe('cartographer');
    expect(records[0].producer.version).toBe('1.0.0');
    expect(records[0].producer.module).toBe('extractor-pages');
    expect(records[0].inputs).toHaveLength(0);
    expect(records[0].parameters).toEqual({ mode: 'full' });
    expect(records[0].output.record_count).toBe(100);
  });
  
  test('adds derived dataset provenance record', () => {
    const tracker = new ProvenanceTracker();
    
    tracker.addDerived(
      'seo_signals.v1',
      'consolidator-seo',
      '1.0.0',
      [
        { dataset: 'pages.v1', hash_sha256: 'a'.repeat(64) },
        { dataset: 'edges.v1', hash_sha256: 'b'.repeat(64) }
      ],
      { strategy: 'merge' },
      { record_count: 50, hash_sha256: 'c'.repeat(64) }
    );
    
    const records = tracker.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].dataset_name).toBe('seo_signals.v1');
    expect(records[0].inputs).toHaveLength(2);
    expect(records[0].inputs[0].dataset).toBe('pages.v1');
    expect(records[0].inputs[1].dataset).toBe('edges.v1');
  });
  
  test('retrieves specific record by dataset name', () => {
    const tracker = new ProvenanceTracker();
    
    tracker.addExtraction(
      'pages.v1',
      'extractor-pages',
      '1.0.0',
      { mode: 'full' },
      { record_count: 100, hash_sha256: 'a'.repeat(64) }
    );
    
    tracker.addExtraction(
      'edges.v1',
      'extractor-edges',
      '1.0.0',
      { mode: 'full' },
      { record_count: 200, hash_sha256: 'b'.repeat(64) }
    );
    
    const pagesRecord = tracker.getRecord('pages.v1');
    expect(pagesRecord).toBeDefined();
    expect(pagesRecord?.output.record_count).toBe(100);
    
    const edgesRecord = tracker.getRecord('edges.v1');
    expect(edgesRecord).toBeDefined();
    expect(edgesRecord?.output.record_count).toBe(200);
    
    const nonExistent = tracker.getRecord('nonexistent.v1');
    expect(nonExistent).toBeUndefined();
  });
  
  test('retrieves input datasets', () => {
    const tracker = new ProvenanceTracker();
    
    tracker.addExtraction(
      'pages.v1',
      'extractor-pages',
      '1.0.0',
      {},
      { record_count: 100, hash_sha256: 'a'.repeat(64) }
    );
    
    tracker.addDerived(
      'seo_signals.v1',
      'consolidator-seo',
      '1.0.0',
      [
        { dataset: 'pages.v1', hash_sha256: 'a'.repeat(64) },
        { dataset: 'edges.v1', hash_sha256: 'b'.repeat(64) }
      ],
      {},
      { record_count: 50, hash_sha256: 'c'.repeat(64) }
    );
    
    const inputs = tracker.getInputDatasets('seo_signals.v1');
    expect(inputs).toContain('pages.v1');
    expect(inputs).toContain('edges.v1');
    
    const noInputs = tracker.getInputDatasets('pages.v1');
    expect(noInputs).toHaveLength(0);
  });
  
  test('retrieves full lineage chain', () => {
    const tracker = new ProvenanceTracker();
    
    // Level 1: Initial extraction
    tracker.addExtraction(
      'pages.v1',
      'extractor-pages',
      '1.0.0',
      {},
      { record_count: 100, hash_sha256: 'a'.repeat(64) }
    );
    
    tracker.addExtraction(
      'edges.v1',
      'extractor-edges',
      '1.0.0',
      {},
      { record_count: 200, hash_sha256: 'b'.repeat(64) }
    );
    
    // Level 2: Derived from level 1
    tracker.addDerived(
      'seo_signals.v1',
      'consolidator-seo',
      '1.0.0',
      [
        { dataset: 'pages.v1', hash_sha256: 'a'.repeat(64) },
        { dataset: 'edges.v1', hash_sha256: 'b'.repeat(64) }
      ],
      {},
      { record_count: 50, hash_sha256: 'c'.repeat(64) }
    );
    
    // Level 3: Derived from level 2
    tracker.addDerived(
      'audit_results.v1',
      'auditor-horizon',
      '1.0.0',
      [
        { dataset: 'seo_signals.v1', hash_sha256: 'c'.repeat(64) }
      ],
      {},
      { record_count: 25, hash_sha256: 'd'.repeat(64) }
    );
    
    const lineage = tracker.getLineage('audit_results.v1');
    expect(lineage).toContain('audit_results.v1');
    expect(lineage).toContain('seo_signals.v1');
    expect(lineage).toContain('pages.v1');
    expect(lineage).toContain('edges.v1');
    expect(lineage).toHaveLength(4);
  });
  
  test('getRecordCount returns correct count', () => {
    const tracker = new ProvenanceTracker();
    
    expect(tracker.getRecordCount()).toBe(0);
    
    tracker.addExtraction(
      'pages.v1',
      'extractor-pages',
      '1.0.0',
      {},
      { record_count: 100, hash_sha256: 'a'.repeat(64) }
    );
    
    expect(tracker.getRecordCount()).toBe(1);
    
    tracker.addExtraction(
      'edges.v1',
      'extractor-edges',
      '1.0.0',
      {},
      { record_count: 200, hash_sha256: 'b'.repeat(64) }
    );
    
    expect(tracker.getRecordCount()).toBe(2);
  });
  
  test('clear removes all records', () => {
    const tracker = new ProvenanceTracker();
    
    tracker.addExtraction(
      'pages.v1',
      'extractor-pages',
      '1.0.0',
      {},
      { record_count: 100, hash_sha256: 'a'.repeat(64) }
    );
    
    expect(tracker.getRecordCount()).toBe(1);
    
    tracker.clear();
    
    expect(tracker.getRecordCount()).toBe(0);
    expect(tracker.getRecords()).toHaveLength(0);
  });
  
  test('created_at timestamp is ISO 8601 format', () => {
    const tracker = new ProvenanceTracker();
    
    tracker.addExtraction(
      'pages.v1',
      'extractor-pages',
      '1.0.0',
      {},
      { record_count: 100, hash_sha256: 'a'.repeat(64) }
    );
    
    const records = tracker.getRecords();
    const timestamp = records[0].created_at;
    
    // Should be valid ISO 8601 timestamp
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    // Should be parseable
    const date = new Date(timestamp);
    expect(date.toISOString()).toBe(timestamp);
  });
});
