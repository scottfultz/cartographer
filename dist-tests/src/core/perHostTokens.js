// Per-host token bucket rate limiter for Cartographer
// Copyright © 2025 Cai Frazier
const buckets = new Map();
let config = { perHostRps: 2, burst: 2 };
export function init(cfg) {
    config = { ...cfg, burst: Math.max(2, cfg.burst ?? cfg.perHostRps) };
    buckets.clear();
}
export function tryConsume(host, nowMs) {
    let bucket = buckets.get(host);
    if (!bucket) {
        bucket = { tokens: config.burst, lastRefill: nowMs };
        buckets.set(host, bucket);
    }
    // Refill tokens
    const elapsed = nowMs - bucket.lastRefill;
    const refillRate = config.perHostRps / 1000; // tokens/ms
    const refill = elapsed * refillRate;
    if (refill > 0) {
        bucket.tokens = Math.min(config.burst, bucket.tokens + refill);
        bucket.lastRefill = nowMs;
    }
    // Clamp tokens to burst
    bucket.tokens = Math.min(config.burst, bucket.tokens);
    // Only consume if tokens >= 1
    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return true;
    }
    return false;
}
export function getTokens(host) {
    const bucket = buckets.get(host);
    return bucket ? bucket.tokens : config.burst;
}
export function _reset() {
    buckets.clear();
}
//# sourceMappingURL=perHostTokens.js.map