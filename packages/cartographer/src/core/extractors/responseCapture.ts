/**
 * Copyright © 2025 Cai Frazier.
 * Response Body Capture Extractor
 * 
 * Captures raw HTML response bodies and stores them in blob storage
 * for offline replay and reanalysis.
 */

import type { Page } from 'playwright';
import type { ResponseRecordV1 } from '@atlas/spec';
import type { BlobStorage } from '../../io/atlas/blobStorage.js';

export interface ResponseCaptureOptions {
  /** Page ID from pages dataset */
  pageId: string;
  
  /** Blob storage instance */
  blobStorage: BlobStorage;
}

/**
 * Capture HTML response body and store in blob storage
 * 
 * @param page - Playwright page instance
 * @param options - Capture options
 * @returns Response record for responses.v1 dataset
 */
export async function captureResponse(
  page: Page,
  options: ResponseCaptureOptions
): Promise<ResponseRecordV1> {
  // Get current page HTML content
  const html = await page.content();
  
  // Detect character encoding (default to utf-8)
  const encoding = await detectEncoding(page) || 'utf-8';
  
  // Store HTML in blob storage
  const { blob_ref } = await options.blobStorage.store(html);
  
  return {
    page_id: options.pageId,
    encoding,
    body_blob_ref: blob_ref,
  };
}

/**
 * Detect character encoding from page meta tags or headers
 * 
 * @param page - Playwright page instance
 * @returns Character encoding (e.g., "utf-8", "iso-8859-1")
 */
async function detectEncoding(page: Page): Promise<string | null> {
  try {
    // Try to get from meta charset tag
    const metaCharset = await page.$eval(
      'meta[charset]',
      (el) => el.getAttribute('charset')
    ).catch(() => null);
    
    if (metaCharset) {
      return metaCharset.toLowerCase();
    }
    
    // Try to get from meta http-equiv Content-Type
    const metaContentType = await page.$eval(
      'meta[http-equiv="Content-Type"]',
      (el) => el.getAttribute('content')
    ).catch(() => null);
    
    if (metaContentType) {
      const match = metaContentType.match(/charset=([^;]+)/i);
      if (match) {
        return match[1].toLowerCase().trim();
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
