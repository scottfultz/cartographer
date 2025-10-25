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
export function extractTwitterCard(html) {
    // Match all meta tags with name="twitter:*"
    const twitterTagPattern = /<meta\s+(?:[^>]*?\s+)?name=["']twitter:([^"']+)["'](?:[^>]*?\s+)?content=["']([^"']*)["'][^>]*>/gi;
    const twitterData = {};
    let match;
    while ((match = twitterTagPattern.exec(html)) !== null) {
        const property = match[1]; // e.g., "card", "title", "image"
        const content = match[2];
        // Some properties can have multiple values (e.g., multiple images)
        if (property in twitterData) {
            const existing = twitterData[property];
            if (Array.isArray(existing)) {
                existing.push(content);
            }
            else {
                twitterData[property] = [existing, content];
            }
        }
        else {
            twitterData[property] = content;
        }
    }
    // Also check for alternate syntax: name='twitter:*' (single quotes)
    const twitterTagPatternSingle = /<meta\s+(?:[^>]*?\s+)?name='twitter:([^']+)'(?:[^>]*?\s+)?content='([^']*)'[^>]*>/gi;
    while ((match = twitterTagPatternSingle.exec(html)) !== null) {
        const property = match[1];
        const content = match[2];
        if (!(property in twitterData)) {
            twitterData[property] = content;
        }
    }
    // Check for reversed attribute order: content before name
    const twitterTagPatternReversed = /<meta\s+(?:[^>]*?\s+)?content=["']([^"']*)["'](?:[^>]*?\s+)?name=["']twitter:([^"']+)["'][^>]*>/gi;
    while ((match = twitterTagPatternReversed.exec(html)) !== null) {
        const content = match[1];
        const property = match[2];
        if (!(property in twitterData)) {
            twitterData[property] = content;
        }
    }
    // Return null if no Twitter Card tags found
    if (Object.keys(twitterData).length === 0) {
        return null;
    }
    // Convert to StructuredDataItem format
    return {
        type: 'twittercard',
        schemaType: 'TwitterCard',
        data: {
            '@type': 'TwitterCard',
            ...twitterData,
            _source: 'twittercard'
        }
    };
}
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
export function extractTwitterAppCard(html) {
    const appPattern = /<meta\s+(?:[^>]*?\s+)?name=["']twitter:app:([^"']+)["'](?:[^>]*?\s+)?content=["']([^"']*)["'][^>]*>/gi;
    const appData = {};
    let match;
    while ((match = appPattern.exec(html)) !== null) {
        const property = match[1]; // e.g., "name:iphone", "id:googleplay"
        const content = match[2];
        appData[property] = content;
    }
    if (Object.keys(appData).length === 0) {
        return null;
    }
    return {
        type: 'twittercard',
        schemaType: 'TwitterCard:App',
        data: {
            '@type': 'TwitterCard:App',
            ...appData,
            _source: 'twittercard'
        }
    };
}
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
export function extractTwitterPlayerCard(html) {
    const playerPattern = /<meta\s+(?:[^>]*?\s+)?name=["']twitter:player(?::([^"']+))?["'](?:[^>]*?\s+)?content=["']([^"']*)["'][^>]*>/gi;
    const playerData = {};
    let match;
    while ((match = playerPattern.exec(html)) !== null) {
        const subProperty = match[1] || 'url'; // "width", "height", "stream", or default to "url"
        const content = match[2];
        playerData[subProperty] = content;
    }
    if (Object.keys(playerData).length === 0) {
        return null;
    }
    return {
        type: 'twittercard',
        schemaType: 'TwitterCard:Player',
        data: {
            '@type': 'TwitterCard:Player',
            ...playerData,
            _source: 'twittercard'
        }
    };
}
/**
 * Extract all Twitter Card metadata
 *
 * Convenience function that extracts base Twitter Card tags and specialized cards.
 *
 * @param html - The HTML content to extract from
 * @returns Array of structured data objects (may be empty)
 */
export function extractAllTwitterCards(html) {
    const results = [];
    // Extract base Twitter Card tags
    const baseCard = extractTwitterCard(html);
    if (baseCard) {
        results.push(baseCard);
    }
    // Extract app-specific metadata if present
    const appCard = extractTwitterAppCard(html);
    if (appCard) {
        results.push(appCard);
    }
    // Extract player-specific metadata if present
    const playerCard = extractTwitterPlayerCard(html);
    if (playerCard) {
        results.push(playerCard);
    }
    return results;
}
//# sourceMappingURL=twitterCard.js.map