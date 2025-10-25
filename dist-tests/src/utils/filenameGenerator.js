/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { mkdir } from "fs/promises";
import { dirname } from "path";
/**
 * Generate a standardized .atls filename from crawl parameters
 * Format: [domain]_[YYYYMMDD_HHMMSS]_[mode].atls
 *
 * Examples:
 * - drancich.com_20251024_100532_raw.atls
 * - example.org_20251024_143022_full.atls
 */
export function generateAtlsFilename(options) {
    const { seedUrl, mode, timestamp = new Date() } = options;
    // Extract domain from seed URL
    let domain;
    try {
        const url = new URL(seedUrl);
        domain = url.hostname;
    }
    catch {
        // If URL parsing fails, use a sanitized version of the input
        domain = seedUrl.replace(/[^a-zA-Z0-9.-]/g, '_');
    }
    // Format timestamp as YYYYMMDD_HHMMSS
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
    const timestampStr = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    return `${domain}_${timestampStr}_${mode}.atls`;
}
/**
 * Resolve output path with automatic filename generation
 *
 * @param userProvidedPath - Path from --out flag (optional)
 * @param options - Filename generation options
 * @param defaultDir - Default directory (default: "./export")
 * @returns Resolved absolute path
 */
export async function resolveOutputPath(userProvidedPath, options, defaultDir = "./export") {
    let outputPath;
    if (userProvidedPath) {
        // User provided explicit path - use as-is
        outputPath = userProvidedPath;
    }
    else {
        // Auto-generate filename in default directory
        const filename = generateAtlsFilename(options);
        outputPath = `${defaultDir}/${filename}`;
    }
    // Ensure parent directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    return outputPath;
}
//# sourceMappingURL=filenameGenerator.js.map