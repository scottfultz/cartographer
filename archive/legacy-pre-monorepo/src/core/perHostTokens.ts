// Per-host token bucket rate limiter for Cartographer
// Copyright © 2025 Cai Frazier

export interface PerHostTokensConfig {
  perHostRps: number;
  burst?: number;
}

interface HostBucket {
  tokens: number;
  lastRefill: number;
}

const buckets: Map<string, HostBucket> = new Map();
let config: PerHostTokensConfig = { perHostRps: 2, burst: 2 };

export function init(cfg: PerHostTokensConfig) {
  config = { ...cfg, burst: Math.max(2, cfg.burst ?? cfg.perHostRps) };
  buckets.clear();
}

export function tryConsume(host: string, nowMs: number): boolean {
  let bucket = buckets.get(host);
  if (!bucket) {
    bucket = { tokens: config.burst!, lastRefill: nowMs };
    buckets.set(host, bucket);
  }
  // Refill tokens
  const elapsed = nowMs - bucket.lastRefill;
  const refillRate = config.perHostRps / 1000; // tokens/ms
  const refill = elapsed * refillRate;
  if (refill > 0) {
    bucket.tokens = Math.min(config.burst!, bucket.tokens + refill);
    bucket.lastRefill = nowMs;
  }
  // Clamp tokens to burst
  bucket.tokens = Math.min(config.burst!, bucket.tokens);
  // Only consume if tokens >= 1
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

export function getTokens(host: string): number {
  const bucket = buckets.get(host);
  return bucket ? bucket.tokens : config.burst!;
}

export function _reset() {
  buckets.clear();
}
