/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { request } from "undici";
import type { EngineConfig } from "./types.js";
import { log } from "../utils/logging.js";

interface RobotsCacheEntry {
  origin: string;
  rules: string;
  etag?: string;
  lastModified?: string;
  fetchedAt: number;
  expiresAt: number;
}

interface RobotsCheckResult {
  allow: boolean;
  matchedRule?: string;
  ua: string;
}

/**
 * In-memory robots.txt cache with ETag revalidation and LRU eviction
 */
export class RobotsCache {
  private cache = new Map<string, RobotsCacheEntry>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_ENTRIES = 1000;

  /**
   * Check if URL should be fetched according to robots.txt
   */
  async shouldFetch(cfg: EngineConfig, url: string): Promise<RobotsCheckResult> {
    // If robots override is enabled, always allow
    if (cfg.robots.overrideUsed) {
      log("warn", `Robots override: allowing ${url}`);
      log("info", JSON.stringify({
        event: "robots_decision",
        url,
        decision: "allowed",
        reason: "robots_override_enabled",
        userAgent: cfg.http.userAgent
      }));
      return { allow: true, ua: cfg.http.userAgent };
    }

    // If respect is disabled, allow
    if (!cfg.robots.respect) {
      log("info", JSON.stringify({
        event: "robots_decision",
        url,
        decision: "allowed",
        reason: "robots_respect_disabled",
        userAgent: cfg.http.userAgent
      }));
      return { allow: true, ua: cfg.http.userAgent };
    }

    const parsedUrl = new URL(url);
    const origin = parsedUrl.origin;
    const path = parsedUrl.pathname;

    // Get or fetch robots.txt
    const robotsTxt = await this.getRobotsTxt(origin, cfg.http.userAgent);
    
    if (!robotsTxt) {
      // No robots.txt found, allow by default
      log("info", JSON.stringify({
        event: "robots_decision",
        url,
        origin,
        decision: "allowed",
        reason: "no_robots_txt",
        userAgent: cfg.http.userAgent
      }));
      return { allow: true, ua: cfg.http.userAgent };
    }

    // Parse and check rules
    const result = this.checkRules(robotsTxt, path, cfg.http.userAgent);
    
    // Log the robots.txt decision for compliance auditing
    log("info", JSON.stringify({
      event: "robots_decision",
      url,
      origin,
      decision: result.allow ? "allowed" : "denied",
      reason: result.allow ? "robots_allowed" : "robots_denied",
      userAgent: result.ua,
      path
    }));
    
    return result;
  }

  /**
   * Get cached robots.txt content for an origin (data collection only)
   */
  getCachedRobotsTxt(origin: string): string | null {
    const cached = this.cache.get(origin);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rules;
    }
    return null;
  }

  /**
   * Get robots.txt for origin (from cache or fetch)
   */
  private async getRobotsTxt(origin: string, userAgent: string): Promise<string | null> {
    const now = Date.now();
    const cached = this.cache.get(origin);

    // Check if cached and not expired
    if (cached && cached.expiresAt > now) {
      // Try revalidation with ETag/Last-Modified
      if (cached.etag || cached.lastModified) {
        const revalidated = await this.revalidate(origin, cached, userAgent);
        if (revalidated !== null) {
          return revalidated;
        }
      }
      return cached.rules;
    }

    // Fetch fresh robots.txt
    return await this.fetchRobotsTxt(origin, userAgent);
  }

  /**
   * Revalidate cached robots.txt using ETag/Last-Modified
   */
  private async revalidate(
    origin: string,
    cached: RobotsCacheEntry,
    userAgent: string
  ): Promise<string | null> {
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const headers: Record<string, string> = {
        "User-Agent": userAgent
      };

      if (cached.etag) {
        headers["If-None-Match"] = cached.etag;
      }
      if (cached.lastModified) {
        headers["If-Modified-Since"] = cached.lastModified;
      }

      const response = await request(robotsUrl, {
        method: "GET",
        headers,
        headersTimeout: 5000,
        bodyTimeout: 5000
      });

      if (response.statusCode === 304) {
        // Not modified, extend TTL
        cached.expiresAt = Date.now() + this.TTL_MS;
        this.cache.set(origin, cached);
        return cached.rules;
      }

      if (response.statusCode === 200) {
        // Updated, store new version
        const body = await response.body.text();
        const etag = response.headers.etag as string | undefined;
        const lastModified = response.headers["last-modified"] as string | undefined;

        const entry: RobotsCacheEntry = {
          origin,
          rules: body,
          etag,
          lastModified,
          fetchedAt: Date.now(),
          expiresAt: Date.now() + this.TTL_MS
        };

        this.cache.set(origin, entry);
        this.evictIfNeeded();
        return body;
      }

      // Other status, use cached version
      return cached.rules;

    } catch (error) {
      log("warn", `Robots revalidation failed for ${origin}: ${error}`);
      // On error, use cached version
      return cached.rules;
    }
  }

  /**
   * Fetch robots.txt from origin
   */
  private async fetchRobotsTxt(origin: string, userAgent: string): Promise<string | null> {
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const response = await request(robotsUrl, {
        method: "GET",
        headers: { "User-Agent": userAgent },
        headersTimeout: 5000,
        bodyTimeout: 5000
      });

      if (response.statusCode === 200) {
        const body = await response.body.text();
        const etag = response.headers.etag as string | undefined;
        const lastModified = response.headers["last-modified"] as string | undefined;

        const entry: RobotsCacheEntry = {
          origin,
          rules: body,
          etag,
          lastModified,
          fetchedAt: Date.now(),
          expiresAt: Date.now() + this.TTL_MS
        };

        this.cache.set(origin, entry);
        this.evictIfNeeded();
        return body;
      }

      if (response.statusCode === 404) {
        // No robots.txt, cache empty result
        const entry: RobotsCacheEntry = {
          origin,
          rules: "",
          fetchedAt: Date.now(),
          expiresAt: Date.now() + this.TTL_MS
        };
        this.cache.set(origin, entry);
        return null;
      }

      log("warn", `Unexpected robots.txt status ${response.statusCode} for ${origin}`);
      return null;

    } catch (error) {
      log("warn", `Failed to fetch robots.txt for ${origin}: ${error}`);
      return null;
    }
  }

  /**
   * Parse robots.txt and check if path is allowed for user agent
   */
  private checkRules(robotsTxt: string, path: string, userAgent: string): RobotsCheckResult {
    const lines = robotsTxt.split('\n');
    let currentUA = '';
    let isRelevantSection = false;
    const disallowRules: string[] = [];
    const allowRules: string[] = [];

    // Extract user agent name (e.g., "CartographerBot" from "CartographerBot/1.0")
    const uaName = userAgent.split('/')[0].toLowerCase();

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = trimmed.substring(0, colonIndex).trim().toLowerCase();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (directive === 'user-agent') {
        const targetUA = value.toLowerCase();
        currentUA = targetUA;
        isRelevantSection = targetUA === '*' || targetUA === uaName || uaName.includes(targetUA);
      } else if (isRelevantSection) {
        if (directive === 'disallow') {
          if (value) {
            disallowRules.push(value);
          }
        } else if (directive === 'allow') {
          if (value) {
            allowRules.push(value);
          }
        }
      }
    }

    // Check allow rules first (more specific)
    for (const rule of allowRules) {
      if (this.matchesRule(path, rule)) {
        return { allow: true, matchedRule: `Allow: ${rule}`, ua: userAgent };
      }
    }

    // Check disallow rules
    for (const rule of disallowRules) {
      if (this.matchesRule(path, rule)) {
        return { allow: false, matchedRule: `Disallow: ${rule}`, ua: userAgent };
      }
    }

    // Default allow if no matching rules
    return { allow: true, ua: userAgent };
  }

  /**
   * Check if path matches robots.txt rule pattern
   */
  private matchesRule(path: string, pattern: string): boolean {
    // Simple prefix matching (robots.txt spec)
    // TODO: Could enhance with wildcards (*) and $ (end-of-path)
    if (pattern === '/') {
      return true; // Disallow: / matches everything
    }
    return path.startsWith(pattern);
  }

  /**
   * LRU eviction when cache exceeds max size
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.MAX_ENTRIES) return;

    // Find oldest entry
    let oldestOrigin = '';
    let oldestTime = Infinity;

    for (const [origin, entry] of this.cache.entries()) {
      if (entry.fetchedAt < oldestTime) {
        oldestTime = entry.fetchedAt;
        oldestOrigin = origin;
      }
    }

    if (oldestOrigin) {
      this.cache.delete(oldestOrigin);
      log("debug", `Evicted robots.txt cache for ${oldestOrigin}`);
    }
  }

  /**
   * Clear the cache (for testing)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Global singleton instance
export const robotsCache = new RobotsCache();
