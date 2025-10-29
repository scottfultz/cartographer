/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { AtlasCapabilitiesV1 } from '@atlas/spec';
import type { RenderMode } from '../../core/types.js';

/**
 * Configuration for building capabilities
 */
export interface CapabilitiesConfig {
  renderMode: RenderMode;
  replayTier?: 'html' | 'html+css' | 'full';
  accessibility?: boolean;
  performance?: boolean;
  seoEnhanced?: boolean;
}

/**
 * Build Atlas v1.0 capabilities declaration from crawl configuration
 * 
 * Capabilities are declared based on what data was actually collected,
 * not just what was configured. This allows consumers to check capabilities
 * before attempting operations.
 * 
 * Standard capability strings:
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
export function buildCapabilities(config: CapabilitiesConfig): AtlasCapabilitiesV1 {
  const capabilities: string[] = [];
  
  // SEO capabilities (always present for any mode)
  capabilities.push('seo.core');
  
  // Enhanced SEO (structured data, OG, Twitter Card)
  if (config.seoEnhanced !== false) {
    capabilities.push('seo.enhanced');
  }
  
  // Render-based capabilities
  if (config.renderMode !== 'raw') {
    capabilities.push('render.dom');
  }
  
  // Accessibility (enabled unless explicitly disabled)
  if (config.accessibility !== false) {
    capabilities.push('a11y.core');
  }
  
  // Performance/network logs
  if (config.performance === true) {
    capabilities.push('render.netlog');
  }
  
  // Replay capabilities based on tier
  const replayTier = config.replayTier || 'html+css';
  
  if (replayTier === 'html') {
    capabilities.push('replay.html');
  } else if (replayTier === 'html+css') {
    capabilities.push('replay.html');
    capabilities.push('replay.css');
    capabilities.push('replay.fonts');
  } else if (replayTier === 'full') {
    capabilities.push('replay.html');
    capabilities.push('replay.css');
    capabilities.push('replay.js');
    capabilities.push('replay.fonts');
    capabilities.push('replay.images');
  }
  
  return {
    version: 'v1',
    capabilities,
    compatibility: {
      min_sdk_version: '1.0.0',
      breaking_changes: []
    }
  };
}

/**
 * Check if a specific capability is present in the capabilities object
 */
export function hasCapability(capabilities: AtlasCapabilitiesV1, capability: string): boolean {
  return capabilities.capabilities.includes(capability);
}

/**
 * Get all replay capabilities from a capabilities object
 */
export function getReplayCapabilities(capabilities: AtlasCapabilitiesV1): string[] {
  return capabilities.capabilities.filter(cap => cap.startsWith('replay.'));
}

/**
 * Determine replay tier from capabilities
 */
export function getReplayTier(capabilities: AtlasCapabilitiesV1): 'none' | 'html' | 'html+css' | 'full' {
  const replayCaps = getReplayCapabilities(capabilities);
  
  if (replayCaps.length === 0) return 'none';
  
  const hasHtml = replayCaps.includes('replay.html');
  const hasCss = replayCaps.includes('replay.css');
  const hasJs = replayCaps.includes('replay.js');
  const hasFonts = replayCaps.includes('replay.fonts');
  const hasImages = replayCaps.includes('replay.images');
  
  if (hasHtml && hasCss && hasJs && hasFonts && hasImages) return 'full';
  if (hasHtml && hasCss && hasFonts) return 'html+css';
  if (hasHtml) return 'html';
  
  return 'none';
}
