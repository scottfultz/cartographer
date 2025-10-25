/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
/**
 * Create a network performance collector for a Playwright page.
 * Returns an object with methods to start/stop collection and get results.
 *
 * @param page - Playwright page instance
 * @returns NetworkPerformanceCollector object
 */
export function createNetworkPerformanceCollector(page) {
    const resources = [];
    let startTime = null;
    let endTime = null;
    const responseHandler = async (response) => {
        try {
            const request = response.request();
            const url = response.url();
            const status = response.status();
            // Determine resource type
            const resourceType = request.resourceType();
            let type = "other";
            switch (resourceType) {
                case "document":
                    type = "document";
                    break;
                case "stylesheet":
                    type = "stylesheet";
                    break;
                case "script":
                    type = "script";
                    break;
                case "image":
                    type = "image";
                    break;
                case "font":
                    type = "font";
                    break;
                case "media":
                    type = "media";
                    break;
                case "xhr":
                    type = "xhr";
                    break;
                case "fetch":
                    type = "fetch";
                    break;
                case "websocket":
                    type = "websocket";
                    break;
                default:
                    type = "other";
            }
            // Get headers
            const headers = response.headers();
            const contentEncoding = headers["content-encoding"];
            const mimeType = headers["content-type"];
            // Determine compression
            let compression = "none";
            if (contentEncoding) {
                if (contentEncoding.includes("gzip")) {
                    compression = "gzip";
                }
                else if (contentEncoding.includes("br")) {
                    compression = "brotli";
                }
                else if (contentEncoding.includes("deflate")) {
                    compression = "deflate";
                }
            }
            // Determine if from cache
            const fromCache = response.fromServiceWorker() ||
                status === 304 ||
                headers["x-cache"] === "HIT";
            // Get size (approximate if body not available)
            let size = 0;
            try {
                const body = await response.body();
                size = body.length;
            }
            catch (e) {
                // Body not available, estimate from content-length header
                const contentLength = headers["content-length"];
                if (contentLength) {
                    size = parseInt(contentLength, 10);
                }
            }
            // Get timing (if available)
            let duration;
            try {
                const timing = response.timing?.();
                if (timing) {
                    duration = Math.round(timing.responseEnd - timing.requestStart);
                }
            }
            catch (e) {
                // Timing not available
            }
            resources.push({
                url,
                type,
                status,
                size,
                compression,
                mimeType,
                fromCache,
                duration,
            });
        }
        catch (error) {
            // Silently ignore errors in response handler
            console.error("Error collecting network resource:", error);
        }
    };
    return {
        /**
         * Start collecting network performance data
         */
        start() {
            startTime = Date.now();
            page.on("response", responseHandler);
        },
        /**
         * Stop collecting network performance data
         */
        stop() {
            endTime = Date.now();
            page.off("response", responseHandler);
        },
        /**
         * Get collected network performance metrics
         */
        getMetrics() {
            // Initialize breakdown
            const breakdown = {
                document: { count: 0, bytes: 0 },
                stylesheet: { count: 0, bytes: 0 },
                script: { count: 0, bytes: 0 },
                image: { count: 0, bytes: 0 },
                font: { count: 0, bytes: 0 },
                media: { count: 0, bytes: 0 },
                xhr: { count: 0, bytes: 0 },
                fetch: { count: 0, bytes: 0 },
                other: { count: 0, bytes: 0 },
            };
            // Initialize compression stats
            const compression = {
                gzip: 0,
                brotli: 0,
                deflate: 0,
                none: 0,
                uncompressibleTypes: 0,
            };
            // Initialize status codes
            const statusCodes = {};
            let totalBytes = 0;
            let cachedRequests = 0;
            let uncachedRequests = 0;
            // Process all resources
            for (const resource of resources) {
                // Update breakdown (map websocket to other)
                const breakdownType = resource.type === "websocket" ? "other" : resource.type;
                breakdown[breakdownType].count++;
                breakdown[breakdownType].bytes += resource.size;
                totalBytes += resource.size;
                // Update compression stats
                const isUncompressibleType = resource.type === "image" ||
                    resource.type === "font" ||
                    resource.type === "media";
                if (isUncompressibleType) {
                    compression.uncompressibleTypes++;
                }
                else if (resource.compression === "gzip") {
                    compression.gzip++;
                }
                else if (resource.compression === "brotli") {
                    compression.brotli++;
                }
                else if (resource.compression === "deflate") {
                    compression.deflate++;
                }
                else {
                    compression.none++;
                }
                // Update status codes
                statusCodes[resource.status] = (statusCodes[resource.status] || 0) + 1;
                // Update cache stats
                if (resource.fromCache) {
                    cachedRequests++;
                }
                else {
                    uncachedRequests++;
                }
            }
            // Calculate total duration
            const totalDuration = startTime && endTime ? endTime - startTime : undefined;
            return {
                totalRequests: resources.length,
                totalBytes,
                totalDuration,
                breakdown,
                compression,
                statusCodes,
                cachedRequests,
                uncachedRequests,
                resources: [...resources], // Return a copy
            };
        },
        /**
         * Clear collected data and reset
         */
        reset() {
            resources.length = 0;
            startTime = null;
            endTime = null;
        },
    };
}
/**
 * Helper to format bytes as human-readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0)
        return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
/**
 * Helper to calculate compression savings
 */
export function calculateCompressionSavings(uncompressedSize, compressedSize) {
    const savings = uncompressedSize - compressedSize;
    const percentage = (savings / uncompressedSize) * 100;
    return { savings, percentage };
}
//# sourceMappingURL=networkPerformance.js.map