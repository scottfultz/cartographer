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
export declare function extractOpenGraph(html: string): StructuredDataItem | null;
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
export declare function extractOpenGraphExtensions(html: string): StructuredDataItem[];
/**
 * Extract all Open Graph metadata (base + extensions)
 *
 * Convenience function that extracts both base OG tags and namespace extensions.
 *
 * @param html - The HTML content to extract from
 * @returns Array of structured data objects (may be empty)
 */
export declare function extractAllOpenGraph(html: string): StructuredDataItem[];
//# sourceMappingURL=openGraph.d.ts.map