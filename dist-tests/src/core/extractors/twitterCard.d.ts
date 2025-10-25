/**
 * Twitter Card metadata extractor
 *
 * Extracts Twitter Card meta tags from HTML.
 * Twitter Cards are used by Twitter (X) and other platforms to create
 * rich preview cards when URLs are shared.
 *
 * Specification: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
 *
 * Card Types:
 * - summary: Title, description, and thumbnail
 * - summary_large_image: Similar to summary, but with large image
 * - app: Mobile app information
 * - player: Video/audio player
 *
 * @author Cai Frazier
 * @copyright 2025 Cai Frazier
 */
import type { StructuredDataItem } from './structuredData.js';
/**
 * Extract Twitter Card metadata from HTML
 *
 * Extracts all meta tags with name starting with "twitter:" and returns
 * as a structured data object compatible with the Atlas format.
 *
 * Common Twitter Card properties:
 * - twitter:card - The card type (summary, summary_large_image, app, player)
 * - twitter:site - @username of website (e.g., @nytimes)
 * - twitter:creator - @username of content creator
 * - twitter:title - Title of content
 * - twitter:description - Description of content
 * - twitter:image - URL of image to display
 * - twitter:image:alt - Alt text for image
 *
 * @param html - The HTML content to extract from
 * @returns Structured data object with Twitter Card metadata, or null if no Twitter tags found
 */
export declare function extractTwitterCard(html: string): StructuredDataItem | null;
/**
 * Extract Twitter App Card metadata
 *
 * Twitter App Cards have additional properties for mobile apps:
 * - twitter:app:name:iphone
 * - twitter:app:id:iphone
 * - twitter:app:url:iphone
 * - twitter:app:name:ipad
 * - twitter:app:id:ipad
 * - twitter:app:url:ipad
 * - twitter:app:name:googleplay
 * - twitter:app:id:googleplay
 * - twitter:app:url:googleplay
 *
 * @param html - The HTML content to extract from
 * @returns Structured data object with app metadata, or null if no app tags found
 */
export declare function extractTwitterAppCard(html: string): StructuredDataItem | null;
/**
 * Extract Twitter Player Card metadata
 *
 * Twitter Player Cards are used for video/audio content:
 * - twitter:player - HTTPS URL of player iframe
 * - twitter:player:width - Width of player in pixels
 * - twitter:player:height - Height of player in pixels
 * - twitter:player:stream - URL to raw video/audio stream
 *
 * @param html - The HTML content to extract from
 * @returns Structured data object with player metadata, or null if no player tags found
 */
export declare function extractTwitterPlayerCard(html: string): StructuredDataItem | null;
/**
 * Extract all Twitter Card metadata
 *
 * Convenience function that extracts base Twitter Card tags and specialized cards.
 *
 * @param html - The HTML content to extract from
 * @returns Array of structured data objects (may be empty)
 */
export declare function extractAllTwitterCards(html: string): StructuredDataItem[];
//# sourceMappingURL=twitterCard.d.ts.map