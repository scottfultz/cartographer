/*
 * Structured Data Extractor for Cartographer
 * Copyright © 2025 Cai Frazier
 *
 * Extracts JSON-LD structured data from HTML using regex-based parsing
 */
/**
 * Extract JSON-LD structured data from HTML
 * Uses regex-based parsing to avoid DOM library dependency
 */
export function extractStructuredData(input) {
    const { html } = input;
    const results = [];
    try {
        // Find all JSON-LD script tags using regex
        // Match: <script type="application/ld+json">...</script>
        const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = jsonLdRegex.exec(html)) !== null) {
            const jsonText = match[1].trim();
            if (!jsonText)
                continue;
            try {
                const data = JSON.parse(jsonText);
                // Handle both single objects and arrays
                const items = Array.isArray(data) ? data : [data];
                items.forEach((item) => {
                    if (item && typeof item === 'object') {
                        // Extract @type or type field for schemaType
                        const schemaType = item['@type'] || item.type;
                        // Store the raw object (limit size to prevent bloat)
                        const jsonStr = JSON.stringify(item);
                        if (jsonStr.length < 50000) { // Max 50KB per item
                            results.push({
                                type: "json-ld",
                                schemaType: Array.isArray(schemaType) ? schemaType[0] : schemaType,
                                data: item
                            });
                        }
                    }
                });
            }
            catch (parseError) {
                // Invalid JSON-LD, skip this script tag
            }
        }
        // Extract Microdata using simpler regex approach
        const microdataItems = extractMicrodataBasic(html);
        results.push(...microdataItems);
    }
    catch (error) {
        // Parsing failed, return what we have
    }
    return results;
}
/**
 * Extract basic Microdata info from itemtype attributes
 * Simplified extraction without full DOM parsing
 */
function extractMicrodataBasic(html) {
    const results = [];
    try {
        // Find itemtype attributes: itemtype="http://schema.org/Product"
        const itemTypeRegex = /itemtype=["'](https?:\/\/schema\.org\/([^"'\/\?#]+))["']/gi;
        let match;
        const seen = new Set();
        while ((match = itemTypeRegex.exec(html)) !== null) {
            const fullUrl = match[1];
            const schemaType = match[2];
            // Avoid duplicates
            if (seen.has(schemaType))
                continue;
            seen.add(schemaType);
            // Create minimal structured data object
            results.push({
                type: "microdata",
                schemaType,
                data: {
                    '@type': schemaType,
                    '@context': 'https://schema.org',
                    _source: 'microdata'
                }
            });
        }
    }
    catch (error) {
        // Microdata extraction failed
    }
    return results;
}
/**
 * Filter structured data to only common/useful types
 * Reduces noise from generic Schema.org items
 */
export function filterRelevantStructuredData(items) {
    const relevantTypes = new Set([
        // Content types
        'Article', 'NewsArticle', 'BlogPosting', 'WebPage', 'WebSite', 'TechArticle', 'ScholarlyArticle',
        // E-commerce
        'Product', 'Offer', 'AggregateOffer', 'Review', 'AggregateRating', 'ProductCollection',
        // Organization (general)
        'Organization', 'Corporation', 'LocalBusiness', 'Store',
        // Organization (domain-specific)
        'GovernmentOrganization', 'EducationalOrganization', 'MedicalOrganization',
        'NGO', 'PerformingGroup', 'SportsOrganization',
        // Local business types
        'Restaurant', 'Hotel', 'Hospital', 'School', 'Library', 'Museum',
        'ShoppingCenter', 'TouristAttraction', 'FoodEstablishment', 'LodgingBusiness',
        // People
        'Person', 'ProfilePage',
        // Events
        'Event', 'EventSeries', 'SportsEvent', 'MusicEvent', 'BusinessEvent',
        // Creative work
        'Book', 'Movie', 'VideoObject', 'ImageObject', 'Recipe', 'MusicRecording', 'Podcast',
        'TVSeries', 'TVEpisode', 'SoftwareApplication', 'MobileApplication', 'WebApplication',
        // Medical/Health
        'MedicalCondition', 'Drug', 'MedicalWebPage', 'HealthTopicContent',
        // Educational
        'Course', 'LearningResource', 'Quiz', 'EducationalOccupationalProgram',
        // Other useful
        'FAQPage', 'HowTo', 'JobPosting', 'BreadcrumbList', 'SearchAction', 'WebSite',
        'ContactPage', 'AboutPage', 'CheckoutPage', 'CollectionPage',
        // Social media
        'OpenGraph', 'TwitterCard', 'SocialMediaPosting',
        // Real estate
        'RealEstateListing', 'Residence', 'Apartment',
        // Vehicle
        'Vehicle', 'Car', 'Motorcycle'
    ]);
    return items.filter(item => {
        if (!item.schemaType)
            return false;
        // Check if type matches any relevant type (case-insensitive)
        const schemaType = item.schemaType.toLowerCase();
        return Array.from(relevantTypes).some(t => schemaType.includes(t.toLowerCase()));
    });
}
//# sourceMappingURL=structuredData.js.map