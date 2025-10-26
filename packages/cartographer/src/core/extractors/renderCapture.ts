/**
 * Copyright © 2025 Cai Frazier.
 * 
 * Render Metadata Capture
 * Captures deterministic render metadata for reproducible audits
 */

import type { Page } from 'playwright';
import type { RenderRecordV1 } from '@atlas/spec';
import { randomUUID } from 'crypto';

export interface RenderCaptureConfig {
  mode: 'raw' | 'prerender' | 'full';
  viewport: { width: number; height: number };
  userAgent: string;
  scriptsEnabled: boolean;
  stylesEnabled: boolean;
  imagesEnabled: boolean;
}

/**
 * Capture render metadata from a page
 */
export async function captureRenderMetadata(
  page: Page,
  config: RenderCaptureConfig,
  startTime: Date
): Promise<RenderRecordV1> {
  const endTime = new Date();
  const pageId = randomUUID();
  
  // Collect console errors from page
  const consoleErrors: RenderRecordV1['console_errors'] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({
        type: msg.type() === 'error' ? 'error' : 'warning',
        message: msg.text(),
        location: {
          url: msg.location()?.url,
          line: msg.location()?.lineNumber,
          column: msg.location()?.columnNumber,
        },
      });
    }
  });
  
  // Get performance metrics
  // @ts-ignore - Performance API types in browser context
  const performanceMetrics = await page.evaluate(() => {
    // @ts-ignore
    const nav = performance.getEntriesByType('navigation')[0] as any;
    // @ts-ignore
    const paint = performance.getEntriesByType('paint');
    
    const firstPaint = paint.find((p: any) => p.name === 'first-paint');
    const fcp = paint.find((p: any) => p.name === 'first-contentful-paint');
    
    return {
      domInteractive: nav?.domInteractive || 0,
      firstPaint: firstPaint?.startTime || 0,
      firstContentfulPaint: fcp?.startTime || 0,
    };
  });
  
  // Check page lifecycle
  // @ts-ignore - document exists in browser context
  const domContentLoaded = await page.evaluate(() => {
    // @ts-ignore
    return document.readyState !== 'loading';
  });
  
  // @ts-ignore - document exists in browser context
  const loadEventFired = await page.evaluate(() => {
    // @ts-ignore
    return document.readyState === 'complete';
  });
  
  // Estimate network idle (simplified)
  const networkIdle = loadEventFired;
  
  return {
    page_id: pageId,
    mode: config.mode,
    viewport: config.viewport,
    user_agent: config.userAgent,
    render_started_at: startTime.toISOString(),
    render_completed_at: endTime.toISOString(),
    render_duration_ms: endTime.getTime() - startTime.getTime(),
    dom_content_loaded: domContentLoaded,
    load_event_fired: loadEventFired,
    network_idle: networkIdle,
    scripts_enabled: config.scriptsEnabled,
    styles_enabled: config.stylesEnabled,
    images_enabled: config.imagesEnabled,
    console_errors: consoleErrors,
    request_count: 0, // TODO: Track in interceptor
    failed_requests: 0, // TODO: Track in interceptor
    first_paint_ms: Math.round(performanceMetrics.firstPaint),
    first_contentful_paint_ms: Math.round(performanceMetrics.firstContentfulPaint),
    dom_interactive_ms: Math.round(performanceMetrics.domInteractive),
  };
}
