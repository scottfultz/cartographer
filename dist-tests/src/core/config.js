/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
    maxPages: 0, // unlimited
    maxDepth: -1, // unlimited
    render: {
        mode: "prerender",
        concurrency: 8,
        timeoutMs: 30000,
        maxRequestsPerPage: 100,
        maxBytesPerPage: 50_000_000 // 50 MB
    },
    http: {
        rps: 3,
        userAgent: "CartographerBot/1.0 (+contact:continuum)"
    },
    discovery: {
        followExternal: false,
        paramPolicy: "sample",
        blockList: [
            "gclid",
            "fbclid",
            "msclkid",
            "yclid",
            "irclickid",
            "utm_*",
            "mc_cid",
            "mc_eid",
            "ref",
            "ref_*"
        ]
    },
    robots: {
        respect: true,
        overrideUsed: false
    },
    accessibility: {
        enabled: true
    },
    checkpoint: {
        enabled: true,
        interval: 500,
        everySeconds: 0
    }
};
/**
 * Merge user config with defaults
 */
export function buildConfig(partial) {
    // Validate seeds
    if (!partial.seeds || !Array.isArray(partial.seeds) || partial.seeds.length === 0) {
        throw new Error("Config validation error: At least one seed URL is required (seeds[])");
    }
    // Validate outAtls
    if (!partial.outAtls || typeof partial.outAtls !== "string" || partial.outAtls.length < 5) {
        throw new Error("Config validation error: Output .atls path required and must be a string");
    }
    // Validate numeric limits
    const render = { ...DEFAULT_CONFIG.render, ...partial.render };
    if (render.concurrency <= 0)
        throw new Error("Config validation error: render.concurrency must be > 0");
    if (render.timeoutMs <= 0)
        throw new Error("Config validation error: render.timeoutMs must be > 0");
    if (render.maxRequestsPerPage <= 0)
        throw new Error("Config validation error: render.maxRequestsPerPage must be > 0");
    if (render.maxBytesPerPage <= 0)
        throw new Error("Config validation error: render.maxBytesPerPage must be > 0");
    const http = { ...DEFAULT_CONFIG.http, ...partial.http };
    if (http.rps <= 0)
        throw new Error("Config validation error: http.rps must be > 0");
    // perHostRps support
    let perHostRps = partial.perHostRps ?? 2;
    if (typeof perHostRps !== "number" || perHostRps <= 0)
        perHostRps = 2;
    // Validate maxPages
    const maxPages = partial.maxPages ?? DEFAULT_CONFIG.maxPages;
    if (typeof maxPages === "number" && maxPages < 0)
        throw new Error("Config validation error: maxPages must be >= 0");
    // Validate maxDepth
    const maxDepth = partial.maxDepth ?? DEFAULT_CONFIG.maxDepth;
    if (typeof maxDepth === "number" && maxDepth < -1)
        throw new Error("Config validation error: maxDepth must be >= -1 (-1 = unlimited)");
    // Validate discovery blockList
    const discovery = { ...DEFAULT_CONFIG.discovery, ...partial.discovery };
    if (!Array.isArray(discovery.blockList))
        discovery.blockList = DEFAULT_CONFIG.discovery.blockList;
    // Validate robots
    const robots = { ...DEFAULT_CONFIG.robots, ...partial.robots };
    // Validate accessibility
    const accessibility = { ...DEFAULT_CONFIG.accessibility, ...partial.accessibility };
    // Compose final config
    const finalConfig = {
        seeds: partial.seeds,
        outAtls: partial.outAtls,
        maxPages,
        maxDepth,
        perHostRps,
        render,
        http,
        discovery,
        robots,
        accessibility,
        resume: partial.resume,
        checkpoint: partial.checkpoint,
        cli: partial.cli,
        memory: partial.memory,
        shutdown: partial.shutdown
    };
    return finalConfig;
}
//# sourceMappingURL=config.js.map