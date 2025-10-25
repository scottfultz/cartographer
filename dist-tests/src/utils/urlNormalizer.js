/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
// Use Node.js built-in punycode module with specific file
// @ts-ignore - punycode is a deprecated but still available Node.js built-in module
import punycode from 'punycode/punycode.js';
/**
 * Enhanced URL normalizer with security features
 *
 * Features:
 * - Punycode/IDN domain normalization
 * - Optional http→https upgrade
 * - Fragment removal
 * - Query parameter sorting
 * - Trailing slash normalization
 * - Lowercase normalization
 *
 * @param url - URL to normalize
 * @param options - Normalization options
 * @returns Normalized URL string
 */
export function normalizeUrlEnhanced(url, options = {}) {
    const { upgradeScheme = false, removeFragment = true, sortQueryParams = true, punycodeDomains = true, normalizeTrailingSlash = false, lowercaseDomain = true, lowercasePath = false } = options;
    try {
        let u = new URL(url);
        // 1. Scheme upgrade (http → https)
        if (upgradeScheme && u.protocol === 'http:') {
            u.protocol = 'https:';
        }
        // 2. Domain normalization with punycode
        if (punycodeDomains) {
            try {
                // Convert IDN to ASCII (punycode)
                const asciiDomain = punycode.toASCII(u.hostname);
                if (lowercaseDomain) {
                    u.hostname = asciiDomain.toLowerCase();
                }
                else {
                    u.hostname = asciiDomain;
                }
            }
            catch {
                // If punycode conversion fails, use original hostname
                if (lowercaseDomain) {
                    u.hostname = u.hostname.toLowerCase();
                }
            }
        }
        else if (lowercaseDomain) {
            u.hostname = u.hostname.toLowerCase();
        }
        // 3. Path normalization
        if (lowercasePath) {
            u.pathname = u.pathname.toLowerCase();
        }
        // 4. Trailing slash normalization
        if (normalizeTrailingSlash) {
            // Add trailing slash to directory-like paths
            if (u.pathname.length > 1 && !u.pathname.endsWith('/') && !u.pathname.includes('.')) {
                u.pathname += '/';
            }
            // Remove trailing slash from root
            if (u.pathname === '/' && u.search === '' && u.hash === '') {
                // Keep root as-is
            }
        }
        // 5. Fragment removal
        if (removeFragment) {
            u.hash = '';
        }
        // 6. Query parameter sorting
        if (sortQueryParams) {
            const params = Array.from(u.searchParams.entries())
                .sort((a, b) => a[0].localeCompare(b[0]));
            u.search = '';
            params.forEach(([key, val]) => u.searchParams.append(key, val));
        }
        return u.toString();
    }
    catch (error) {
        // If URL parsing fails, return lowercase original
        return url.toLowerCase();
    }
}
/**
 * Check if domain contains non-ASCII characters (IDN)
 */
export function isIDN(hostname) {
    return /[^\x00-\x7F]/.test(hostname);
}
/**
 * Convert punycode domain to Unicode (for display)
 */
export function punycodeToUnicode(hostname) {
    try {
        return punycode.toUnicode(hostname);
    }
    catch {
        return hostname;
    }
}
/**
 * Convert Unicode domain to punycode (for comparison)
 */
export function unicodeToPunycode(hostname) {
    try {
        return punycode.toASCII(hostname);
    }
    catch {
        return hostname;
    }
}
/**
 * Check if URL uses private IP address (RFC1918, loopback, link-local)
 *
 * @param url - URL to check
 * @returns true if URL hostname resolves to private IP range
 */
export function isPrivateIP(url) {
    try {
        // Handle IPv6 zone IDs which URL constructor doesn't support
        // Extract hostname manually if zone ID is present
        let hostname;
        const ipv6ZoneMatch = url.match(/\/\/\[([^\]]+%[^\]]+)\]/);
        if (ipv6ZoneMatch) {
            // Strip zone ID for pattern matching
            hostname = ipv6ZoneMatch[1].split('%')[0];
        }
        else {
            const u = new URL(url);
            hostname = u.hostname;
        }
        // IPv4 private ranges
        const privateIPv4Patterns = [
            /^127\./, // 127.0.0.0/8 - Loopback
            /^10\./, // 10.0.0.0/8 - Private Class A
            /^172\.(1[6-9]|2\d|3[0-1])\./, // 172.16.0.0/12 - Private Class B
            /^192\.168\./, // 192.168.0.0/16 - Private Class C
            /^169\.254\./, // 169.254.0.0/16 - Link-local
            /^0\.0\.0\.0$/, // 0.0.0.0 - Invalid/default
            /^255\.255\.255\.255$/, // 255.255.255.255 - Broadcast
        ];
        // IPv6 private ranges
        const privateIPv6Patterns = [
            /^::1$/, // ::1 - Loopback
            /^::/, // ::/128 - Unspecified
            /^fe80:/i, // fe80::/10 - Link-local
            /^fc00:/i, // fc00::/7 - Unique local
            /^fd00:/i, // fd00::/8 - Unique local
            /^ff00:/i, // ff00::/8 - Multicast
        ];
        // Check localhost
        if (hostname === 'localhost') {
            return true;
        }
        // Check IPv4
        for (const pattern of privateIPv4Patterns) {
            if (pattern.test(hostname)) {
                return true;
            }
        }
        // Check IPv6 (including IPv6 in square brackets)
        const ipv6Hostname = hostname.replace(/^\[|\]$/g, '');
        for (const pattern of privateIPv6Patterns) {
            if (pattern.test(ipv6Hostname)) {
                return true;
            }
        }
        return false;
    }
    catch {
        return false;
    }
}
/**
 * Detect potential homograph attacks using IDN lookalikes
 *
 * @param url - URL to check
 * @returns true if URL contains suspicious lookalike characters
 */
export function isHomographAttack(url) {
    try {
        // Check raw URL string before URL constructor converts to punycode
        // Extract hostname from URL string manually
        const hostnameMatch = url.match(/^[a-z]+:\/\/([^/:?#]+)/i);
        if (!hostnameMatch) {
            return false;
        }
        const hostname = hostnameMatch[1];
        // Common lookalike character sets
        const suspiciousPatterns = [
            // Cyrillic lookalikes for Latin
            /[аеорсухАВЕКМНОРСТХ]/, // Cyrillic: а е о р с у х А В Е К М Н О Р С Т Х
            // Greek lookalikes
            /[αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ]/,
            // Mixed scripts (suspicious)
            /(?=.*[a-zA-Z])(?=.*[\u0400-\u04FF])/, // Latin + Cyrillic mix
            /(?=.*[a-zA-Z])(?=.*[\u0370-\u03FF])/, // Latin + Greek mix
        ];
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(hostname)) {
                return true;
            }
        }
        return false;
    }
    catch {
        return false;
    }
}
/**
 * Legacy normalizeUrl function (backward compatible)
 * Delegates to normalizeUrlEnhanced with default options
 */
export function normalizeUrl(url) {
    return normalizeUrlEnhanced(url, {
        upgradeScheme: false,
        removeFragment: true,
        sortQueryParams: true,
        punycodeDomains: true,
        normalizeTrailingSlash: false,
        lowercaseDomain: true,
        lowercasePath: false
    });
}
//# sourceMappingURL=urlNormalizer.js.map