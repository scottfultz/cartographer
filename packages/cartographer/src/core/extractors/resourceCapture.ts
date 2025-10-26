/**
 * Copyright © 2025 Cai Frazier.
 * 
 * Resource Capture Extractor
 * Captures CSS, JS, fonts, and images based on replay tier
 */

import type { Page } from 'playwright';
import type { ResourceRecordV1 } from '@atlas/spec';
import type { BlobStorage } from '../../io/atlas/blobStorage.js';
import { randomUUID } from 'crypto';

export interface ResourceCaptureOptions {
  replayTier: 'html' | 'html+css' | 'full';
  imagePolicy?: 'none' | 'dimensions' | 'full';
  maxImageBytes?: number;
}

/**
 * Capture subresources (CSS, JS, fonts, images) based on replay tier
 */
export async function captureResources(
  page: Page,
  pageId: string,
  blobStorage: BlobStorage,
  options: ResourceCaptureOptions
): Promise<ResourceRecordV1[]> {
  const resources: ResourceRecordV1[] = [];
  
  // HTML-only tier captures no resources
  if (options.replayTier === 'html') {
    return resources;
  }
  
  // Capture CSS and fonts (for html+css and full tiers)
  if (options.replayTier === 'html+css' || options.replayTier === 'full') {
    const cssResources = await captureStylesheets(page, pageId, blobStorage);
    resources.push(...cssResources);
    
    const fontResources = await captureFonts(page, pageId, blobStorage);
    resources.push(...fontResources);
  }
  
  // Capture JavaScript (full tier only)
  if (options.replayTier === 'full') {
    const jsResources = await captureScripts(page, pageId, blobStorage);
    resources.push(...jsResources);
  }
  
  // Capture images (based on image policy)
  if (options.imagePolicy && options.imagePolicy !== 'none') {
    const imageResources = await captureImages(
      page,
      pageId,
      blobStorage,
      options.imagePolicy,
      options.maxImageBytes
    );
    resources.push(...imageResources);
  }
  
  return resources;
}

/**
 * Capture stylesheet resources
 */
async function captureStylesheets(
  page: Page,
  pageId: string,
  blobStorage: BlobStorage
): Promise<ResourceRecordV1[]> {
  const resources: ResourceRecordV1[] = [];
  
  try {
    // Get all stylesheets from DOM
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', (links) =>
      links.map((link: any) => {
        return {
          url: link.href,
          media: link.media || 'all',
        };
      })
    );
    
    // Fetch and store each stylesheet
    for (const sheet of stylesheets) {
      try {
        const response = await page.context().request.get(sheet.url);
        
        if (response.ok()) {
          const body = await response.body();
          const { hash, blob_ref } = await blobStorage.store(body.toString('utf-8'));
          
          resources.push({
            res_id: randomUUID(),
            owner_page_id: pageId,
            url: sheet.url,
            type: 'css',
            status: response.status(),
            content_type: response.headers()['content-type'] || 'text/css',
            hash_body_sha256: hash,
            body_blob_ref: blob_ref,
            size_bytes: body.length,
            critical: true, // CSS is critical for rendering
          });
        }
      } catch (err) {
        // Log but continue - some stylesheets may fail to load
        console.warn(`Failed to capture stylesheet ${sheet.url}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to capture stylesheets:', err);
  }
  
  return resources;
}

/**
 * Capture web font resources
 */
async function captureFonts(
  page: Page,
  pageId: string,
  blobStorage: BlobStorage
): Promise<ResourceRecordV1[]> {
  const resources: ResourceRecordV1[] = [];
  
  try {
    // Extract font URLs from @font-face rules
    // @ts-ignore - document exists in browser context
    const fontUrls = await page.evaluate(() => {
      const fonts: string[] = [];
      
      // @ts-ignore - document exists in browser context
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          // @ts-ignore - cssRules exists on stylesheets
          const rules = Array.from(sheet.cssRules || []);
          
          for (const rule of rules) {
            // @ts-ignore - CSSFontFaceRule exists
            if (rule.constructor.name === 'CSSFontFaceRule') {
              // @ts-ignore - style property exists
              const src = rule.style.getPropertyValue('src');
              const urlMatch = src.match(/url\(['"]?([^'"]+)['"]?\)/);
              
              if (urlMatch && urlMatch[1]) {
                fonts.push(urlMatch[1]);
              }
            }
          }
        } catch (e) {
          // CORS may prevent reading stylesheet rules
        }
      }
      
      return fonts;
    });
    
    // Fetch and store each font
    for (const fontUrl of fontUrls) {
      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(fontUrl, page.url()).href;
        const response = await page.context().request.get(absoluteUrl);
        
        if (response.ok()) {
          const body = await response.body();
          const { hash, blob_ref } = await blobStorage.store(body);
          
          resources.push({
            res_id: randomUUID(),
            owner_page_id: pageId,
            url: absoluteUrl,
            type: 'font',
            status: response.status(),
            content_type: response.headers()['content-type'] || 'font/woff2',
            hash_body_sha256: hash,
            body_blob_ref: blob_ref,
            size_bytes: body.length,
            critical: true, // Fonts are critical for styling
          });
        }
      } catch (err) {
        console.warn(`Failed to capture font ${fontUrl}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to capture fonts:', err);
  }
  
  return resources;
}

/**
 * Capture JavaScript resources
 */
async function captureScripts(
  page: Page,
  pageId: string,
  blobStorage: BlobStorage
): Promise<ResourceRecordV1[]> {
  const resources: ResourceRecordV1[] = [];
  
  try {
    // Get all script tags with src
    const scripts = await page.$$eval('script[src]', (elements) =>
      elements.map((el: any) => {
        return {
          url: el.src,
          async: el.async,
          defer: el.defer,
        };
      })
    );
    
    // Fetch and store each script
    for (const script of scripts) {
      try {
        const response = await page.context().request.get(script.url);
        
        if (response.ok()) {
          const body = await response.body();
          const { hash, blob_ref } = await blobStorage.store(body.toString('utf-8'));
          
          resources.push({
            res_id: randomUUID(),
            owner_page_id: pageId,
            url: script.url,
            type: 'js',
            status: response.status(),
            content_type: response.headers()['content-type'] || 'application/javascript',
            hash_body_sha256: hash,
            body_blob_ref: blob_ref,
            size_bytes: body.length,
            critical: !script.async && !script.defer,
          });
        }
      } catch (err) {
        console.warn(`Failed to capture script ${script.url}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to capture scripts:', err);
  }
  
  return resources;
}

/**
 * Capture image resources
 */
async function captureImages(
  page: Page,
  pageId: string,
  blobStorage: BlobStorage,
  imagePolicy: 'dimensions' | 'full',
  maxImageBytes?: number
): Promise<ResourceRecordV1[]> {
  const resources: ResourceRecordV1[] = [];
  
  try {
    // Get all images from DOM
    const images = await page.$$eval('img', (elements) =>
      elements.map((el: any) => {
        return {
          url: el.src,
          alt: el.alt,
          width: el.naturalWidth,
          height: el.naturalHeight,
        };
      })
    );
    
    // Fetch and store each image
    for (const image of images) {
      try {
        const response = await page.context().request.get(image.url);
        
        if (response.ok()) {
          const body = await response.body();
          
          // Check size limit if specified
          if (maxImageBytes && body.length > maxImageBytes) {
            continue; // Skip images larger than limit
          }
          
          // For 'dimensions' policy, we don't store the body, just metadata
          const shouldStoreBody = imagePolicy === 'full';
          
          let blobRef = undefined;
          let hash = '';
          
          if (shouldStoreBody) {
            const stored = await blobStorage.store(body);
            blobRef = stored.blob_ref;
            hash = stored.hash;
          }
          
          resources.push({
            res_id: randomUUID(),
            owner_page_id: pageId,
            url: image.url,
            type: 'image',
            status: response.status(),
            content_type: response.headers()['content-type'] || 'image/jpeg',
            hash_body_sha256: hash,
            body_blob_ref: blobRef,
            size_bytes: body.length,
            critical: false, // Images generally not critical for a11y
          });
        }
      } catch (err) {
        console.warn(`Failed to capture image ${image.url}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to capture images:', err);
  }
  
  return resources;
}
