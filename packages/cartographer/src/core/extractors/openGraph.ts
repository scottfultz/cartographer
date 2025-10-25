/**
 * Open Graph (OG) metadata extractor
 * 
 * Extracts Open Graph protocol tags from HTML meta elements.
 * OG tags are used by social media platforms (Facebook, LinkedIn, Slack, etc.)
 * to create rich preview cards when URLs are shared.
 * 
 * Specification: https://ogp.me/
 * 
 * @author Cai Frazier
 * @copyright 2025 Cai Frazier
 */

import type { StructuredDataItem } from './structuredData.js';

/**
 * Extract Open Graph metadata from HTML
 * 
 * Extracts all meta tags with property starting with "og:" and returns
 * as a structured data object compatible with the Atlas format.
 * 
 * Common OG properties:
 * - og:title - The title of the content
 * - og:type - The type of content (article, website, video, etc.)
 * - og:image - An image URL that represents the content
 * - og:url - The canonical URL of the content
 * - og:description - A brief description of the content
 * - og:site_name - The name of the overall site
 * - og:locale - The locale of the content (e.g., "en_US")
 * 
 * @param html - The HTML content to extract from
 * @returns Structured data object with OG metadata, or null if no OG tags found
 */
export function extractOpenGraph(html: string): StructuredDataItem | null {
  // Match all meta tags with property="og:*"
  const ogTagPattern = /<meta\s+(?:[^>]*?\s+)?property=["']og:([^"']+)["'](?:[^>]*?\s+)?content=["']([^"']*)["'][^>]*>/gi;
  
  const ogData: Record<string, string | string[]> = {};
  let match: RegExpExecArray | null;
  
  while ((match = ogTagPattern.exec(html)) !== null) {
    const property = match[1]; // e.g., "title", "image", "type"
    const content = match[2];
    
    // Some OG properties can have multiple values (especially og:image)
    // Store as array if we've seen this property before
    if (property in ogData) {
      const existing = ogData[property];
      if (Array.isArray(existing)) {
        existing.push(content);
      } else {
        ogData[property] = [existing, content];
      }
    } else {
      ogData[property] = content;
    }
  }
  
  // Also check for alternate syntax: property='og:*' (single quotes)
  const ogTagPatternSingle = /<meta\s+(?:[^>]*?\s+)?property='og:([^']+)'(?:[^>]*?\s+)?content='([^']*)'[^>]*>/gi;
  
  while ((match = ogTagPatternSingle.exec(html)) !== null) {
    const property = match[1];
    const content = match[2];
    
    if (!(property in ogData)) {
      ogData[property] = content;
    }
  }
  
  // Return null if no OG tags found
  if (Object.keys(ogData).length === 0) {
    return null;
  }
  
  // Convert to StructuredData format
  return {
    type: 'opengraph',
    schemaType: 'OpenGraph',
    data: {
      '@type': 'OpenGraph',
      ...ogData,
      _source: 'opengraph'
    }
  };
}

/**
 * Extract extended Open Graph metadata (article, video, etc.)
 * 
 * OG has namespace extensions for specific content types:
 * - article:* - News articles, blog posts
 * - video:* - Video content
 * - music:* - Music content
 * - book:* - Books
 * - profile:* - User profiles
 * 
 * @param html - The HTML content to extract from
 * @returns Array of structured data objects for each namespace, or empty array
 */
export function extractOpenGraphExtensions(html: string): StructuredDataItem[] {
  const extensions: StructuredDataItem[] = [];
  const namespaces = ['article', 'video', 'music', 'book', 'profile'];
  
  for (const namespace of namespaces) {
    const pattern = new RegExp(
      `<meta\\s+(?:[^>]*?\\s+)?property=["']${namespace}:([^"']+)["'](?:[^>]*?\\s+)?content=["']([^"']*)["'][^>]*>`,
      'gi'
    );
    
    const namespaceData: Record<string, string | string[]> = {};
    let match: RegExpExecArray | null;
    
    while ((match = pattern.exec(html)) !== null) {
      const property = match[1];
      const content = match[2];
      
      if (property in namespaceData) {
        const existing = namespaceData[property];
        if (Array.isArray(existing)) {
          existing.push(content);
        } else {
          namespaceData[property] = [existing, content];
        }
      } else {
        namespaceData[property] = content;
      }
    }
    
    if (Object.keys(namespaceData).length > 0) {
      extensions.push({
        type: 'opengraph',
        schemaType: `OpenGraph:${namespace}`,
        data: {
          '@type': `OpenGraph:${namespace}`,
          ...namespaceData,
          _source: 'opengraph'
        }
      });
    }
  }
  
  return extensions;
}

/**
 * Extract all Open Graph metadata (base + extensions)
 * 
 * Convenience function that extracts both base OG tags and namespace extensions.
 * 
 * @param html - The HTML content to extract from
 * @returns Array of structured data objects (may be empty)
 */
export function extractAllOpenGraph(html: string): StructuredDataItem[] {
  const results: StructuredDataItem[] = [];
  
  // Extract base OG tags
  const baseOG = extractOpenGraph(html);
  if (baseOG) {
    results.push(baseOG);
  }
  
  // Extract namespace extensions
  const extensions = extractOpenGraphExtensions(html);
  results.push(...extensions);
  
  return results;
}
