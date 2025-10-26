/**
 * Copyright © 2025 Cai Frazier.
 * Accessibility Tree Capture Extractor
 * 
 * Captures accessibility tree snapshots for offline WCAG audits.
 */

import type { Page } from 'playwright';
import type { AccTreeRecordV1, Landmark, TabOrderEntry } from '@atlas/spec';
import { compress } from '@mongodb-js/zstd';

export interface AccTreeOptions {
  /** Page ID from pages dataset */
  pageId: string;
}

/**
 * Capture accessibility tree from page
 * 
 * @param page - Playwright page instance
 * @param options - Capture options
 * @returns Accessibility tree record for acc_tree.v1 dataset
 */
export async function captureAccessibilityTree(
  page: Page,
  options: AccTreeOptions
): Promise<AccTreeRecordV1> {
  // Get accessibility snapshot from Playwright
  const snapshot = await page.accessibility.snapshot();
  
  if (!snapshot) {
    // Return empty tree if no accessibility snapshot available
    return {
      page_id: options.pageId,
      nodes_zstd: await compressData([]),
      landmarks: [],
      tab_order: [],
    };
  }
  
  // Flatten accessibility tree to array of nodes
  const nodes = flattenAccTree(snapshot);
  
  // Compress nodes with Zstandard
  const nodesZstd = await compressData(nodes);
  
  // Extract landmarks
  const landmarks = extractLandmarks(nodes);
  
  // Extract tab order
  const tabOrder = extractTabOrder(nodes);
  
  return {
    page_id: options.pageId,
    nodes_zstd: nodesZstd,
    landmarks,
    tab_order: tabOrder,
  };
}

/**
 * Flatten accessibility tree to array
 */
function flattenAccTree(node: any, result: any[] = []): any[] {
  const flatNode: any = {
    role: node.role || 'unknown',
    name: node.name,
    node_id: generateNodeId(node),
  };
  
  // Add optional fields
  if (node.value !== undefined) flatNode.value = node.value;
  if (node.description) flatNode.description = node.description;
  if (node.keyshortcuts) flatNode.keyshortcuts = node.keyshortcuts;
  if (node.roledescription) flatNode.roledescription = node.roledescription;
  if (node.valuetext) flatNode.valuetext = node.valuetext;
  if (node.disabled !== undefined) flatNode.disabled = node.disabled;
  if (node.expanded !== undefined) flatNode.expanded = node.expanded;
  if (node.focused !== undefined) flatNode.focused = node.focused;
  if (node.modal !== undefined) flatNode.modal = node.modal;
  if (node.multiline !== undefined) flatNode.multiline = node.multiline;
  if (node.multiselectable !== undefined) flatNode.multiselectable = node.multiselectable;
  if (node.readonly !== undefined) flatNode.readonly = node.readonly;
  if (node.required !== undefined) flatNode.required = node.required;
  if (node.selected !== undefined) flatNode.selected = node.selected;
  if (node.checked !== undefined) flatNode.checked = node.checked;
  if (node.pressed !== undefined) flatNode.pressed = node.pressed;
  if (node.level !== undefined) flatNode.level = node.level;
  if (node.valuemin !== undefined) flatNode.valuemin = node.valuemin;
  if (node.valuemax !== undefined) flatNode.valuemax = node.valuemax;
  if (node.autocomplete) flatNode.autocomplete = node.autocomplete;
  if (node.haspopup) flatNode.haspopup = node.haspopup;
  if (node.invalid) flatNode.invalid = node.invalid;
  if (node.orientation) flatNode.orientation = node.orientation;
  
  // Track focusability
  flatNode.focusable = node.focusable || false;
  
  result.push(flatNode);
  
  // Recursively flatten children
  if (node.children) {
    for (const child of node.children) {
      flattenAccTree(child, result);
    }
  }
  
  return result;
}

/**
 * Generate stable node ID
 */
function generateNodeId(node: any): string {
  const parts = [node.role, node.name].filter(Boolean);
  const hash = hashString(parts.join(':'));
  return `node_${hash}`;
}

/**
 * Simple string hash
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract ARIA landmarks from nodes
 */
function extractLandmarks(nodes: any[]): Landmark[] {
  const landmarkRoles = new Set([
    'banner',
    'navigation',
    'main',
    'contentinfo',
    'search',
    'complementary',
    'region',
  ]);
  
  return nodes
    .filter(n => landmarkRoles.has(n.role))
    .map(n => ({
      role: n.role,
      name: n.name,
      node_id: n.node_id,
    }));
}

/**
 * Extract tab order from focusable nodes
 */
function extractTabOrder(nodes: any[]): TabOrderEntry[] {
  const focusableNodes = nodes.filter(n => n.focusable);
  
  return focusableNodes.map((n, index) => ({
    index,
    node_id: n.node_id,
    focusable: true,
  }));
}

/**
 * Compress data with Zstandard and return base64
 */
async function compressData(data: any): Promise<string> {
  const json = JSON.stringify(data);
  const compressed = await compress(Buffer.from(json, 'utf-8'));
  return Buffer.from(compressed).toString('base64');
}
