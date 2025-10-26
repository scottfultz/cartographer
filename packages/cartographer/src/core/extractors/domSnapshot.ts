/**
 * Copyright © 2025 Cai Frazier.
 * DOM Snapshot Capture Extractor
 * 
 * Captures post-render DOM snapshots for offline accessibility audits.
 */

import type { Page } from 'playwright';
import type { DOMSnapshotRecordV1 } from '@atlas/spec';
import { compress } from '@mongodb-js/zstd';

export interface DOMSnapshotOptions {
  /** Page ID from pages dataset */
  pageId: string;
  
  /** Whether styles were applied during render */
  stylesApplied: boolean;
  
  /** Whether scripts were executed during render */
  scriptsExecuted: boolean;
}

interface SerializedNode {
  type: 'text' | 'element';
  text?: string;
  tag?: string;
  attributes?: Record<string, string>;
  children?: SerializedNode[];
}

/**
 * Capture DOM snapshot after rendering
 * 
 * @param page - Playwright page instance
 * @param options - Snapshot options
 * @returns DOM snapshot record for dom_snapshot.v1 dataset
 */
export async function captureDOMSnapshot(
  page: Page,
  options: DOMSnapshotOptions
): Promise<DOMSnapshotRecordV1> {
  const baseUrl = page.url();
  
  // Serialize DOM to JSON structure
  const domJson = await page.evaluate(() => {
    function serializeNode(node: any): any {
      if (node.nodeType === 3) { // TEXT_NODE
        const text = node.textContent || '';
        // Skip empty text nodes
        if (text.trim().length === 0) {
          return null;
        }
        return {
          type: 'text',
          text,
        };
      }
      
      if (node.nodeType === 1) { // ELEMENT_NODE
        const el = node;
        const serialized: any = {
          type: 'element',
          tag: el.tagName.toLowerCase(),
          attributes: {} as Record<string, string>,
          children: [] as any[],
        };
        
        // Serialize attributes
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          serialized.attributes[attr.name] = attr.value;
        }
        
        // Serialize children
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = serializeNode(el.childNodes[i]);
          if (child !== null) {
            serialized.children.push(child);
          }
        }
        
        return serialized;
      }
      
      return null;
    }
    
    return serializeNode(document.documentElement);
  });
  
  // Compress DOM JSON with Zstandard
  const domJsonStr = JSON.stringify(domJson);
  const compressed = await compress(Buffer.from(domJsonStr, 'utf-8'));
  const domJsonZstd = Buffer.from(compressed).toString('base64');
  
  // Count nodes
  const counts = countNodes(domJson);
  
  return {
    page_id: options.pageId,
    base_url: baseUrl,
    dom_json_zstd: domJsonZstd,
    styles_applied: options.stylesApplied,
    scripts_executed: options.scriptsExecuted,
    node_count: counts.total,
    text_nodes: counts.text,
    element_nodes: counts.element,
  };
}

/**
 * Count nodes in serialized DOM
 */
function countNodes(node: any): { total: number; text: number; element: number } {
  if (!node) {
    return { total: 0, text: 0, element: 0 };
  }
  
  if (node.type === 'text') {
    return { total: 1, text: 1, element: 0 };
  }
  
  if (node.type === 'element') {
    const childCounts = (node.children || []).reduce((acc: any, child: any) => {
      const c = countNodes(child);
      return {
        total: acc.total + c.total,
        text: acc.text + c.text,
        element: acc.element + c.element,
      };
    }, { total: 1, text: 0, element: 1 });
    
    return childCounts;
  }
  
  return { total: 0, text: 0, element: 0 };
}
