/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { Browser, BrowserContext } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { log } from "../utils/logging.js";
import type { EngineConfig } from "./types.js";

/**
 * Browser Context Pool Manager
 * 
 * Manages persistent browser contexts per domain/origin to preserve session state
 * (cookies, localStorage, etc.) across pages in a crawl.
 * 
 * This enables bypassing Cloudflare/bot detection after the first challenge is solved,
 * either manually or automatically. Once a session is established, subsequent pages
 * reuse the same context and avoid re-triggering challenges.
 * 
 * Storage format: JSON files in <storageDir>/<origin-hash>.json
 * Contains: cookies, localStorage, sessionStorage, origins
 */
export class BrowserContextPool {
  private browser: Browser;
  private cfg: EngineConfig;
  private storageDir: string;
  private contexts: Map<string, BrowserContext> = new Map();
  private contextUsageCounts: Map<string, number> = new Map();
  
  // Context recycling thresholds
  private readonly CONTEXT_RECYCLE_THRESHOLD = 50;
  private readonly MAX_RSS_MULTIPLIER = 0.7; // Recycle at 70% of max RSS

  constructor(browser: Browser, cfg: EngineConfig, storageDir?: string) {
    this.browser = browser;
    this.cfg = cfg;
    this.storageDir = storageDir || join(process.cwd(), '.cartographer', 'sessions');
    
    // Ensure storage directory exists
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
      log('info', `[BrowserContextPool] Created session storage directory: ${this.storageDir}`);
    }
    
    log('info', `[BrowserContextPool] Initialized with storage: ${this.storageDir}`);
  }

  /**
   * Get or create a browser context for the given origin
   * Loads persistent state if available
   */
  async getContext(origin: string): Promise<BrowserContext> {
    // Return existing context if already loaded
    if (this.contexts.has(origin)) {
      const context = this.contexts.get(origin)!;
      this.contextUsageCounts.set(origin, (this.contextUsageCounts.get(origin) || 0) + 1);
      
      // Check if we should recycle due to usage count or memory
      const usageCount = this.contextUsageCounts.get(origin) || 0;
      const currentRssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
      const maxRssMB = this.cfg.memory?.maxRssMB || 2048;
      const rssThreshold = maxRssMB * this.MAX_RSS_MULTIPLIER;
      
      if (usageCount >= this.CONTEXT_RECYCLE_THRESHOLD || currentRssMB > rssThreshold) {
        const reason = usageCount >= this.CONTEXT_RECYCLE_THRESHOLD 
          ? `${usageCount} pages` 
          : `RSS ${currentRssMB}MB`;
        log('info', `[BrowserContextPool] Recycling context for ${origin} (${reason})`);
        
        // Save state before recycling
        await this.saveContext(origin, context);
        
        // Close and remove old context
        await context.close();
        this.contexts.delete(origin);
        this.contextUsageCounts.delete(origin);
        
        // Create fresh context with saved state (recursive call)
        return this.getContext(origin);
      }
      
      return context;
    }

    // Create new context with persistent state if available
    const storageStatePath = this.getStorageStatePath(origin);
    const contextOptions: any = {
      userAgent: this.cfg.http.userAgent,
      viewport: { width: 1280, height: 720 }
    };

    if (existsSync(storageStatePath)) {
      try {
        const storageState = JSON.parse(readFileSync(storageStatePath, 'utf-8'));
        contextOptions.storageState = storageState;
        log('info', `[BrowserContextPool] Loading session state for ${origin} (${storageState.cookies?.length || 0} cookies)`);
      } catch (error: any) {
        log('warn', `[BrowserContextPool] Failed to load session state for ${origin}: ${error.message}`);
      }
    } else {
      log('debug', `[BrowserContextPool] No existing session for ${origin}, creating fresh context`);
    }

    const context = await this.browser.newContext(contextOptions);
    this.contexts.set(origin, context);
    this.contextUsageCounts.set(origin, 1);

    return context;
  }

  /**
   * Save browser context state to disk
   */
  async saveContext(origin: string, context?: BrowserContext): Promise<void> {
    const ctx = context || this.contexts.get(origin);
    if (!ctx) {
      log('warn', `[BrowserContextPool] No context found for ${origin}, cannot save`);
      return;
    }

    try {
      const storageStatePath = this.getStorageStatePath(origin);
      const storageState = await ctx.storageState();
      writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2), 'utf-8');
      log('info', `[BrowserContextPool] Saved session state for ${origin} (${storageState.cookies?.length || 0} cookies)`);
    } catch (error: any) {
      log('error', `[BrowserContextPool] Failed to save session state for ${origin}: ${error.message}`);
    }
  }

  /**
   * Save all active contexts
   */
  async saveAllContexts(): Promise<void> {
    log('info', `[BrowserContextPool] Saving ${this.contexts.size} context(s)...`);
    const promises = Array.from(this.contexts.entries()).map(([origin, context]) =>
      this.saveContext(origin, context)
    );
    await Promise.all(promises);
  }

  /**
   * Close a specific context
   */
  async closeContext(origin: string): Promise<void> {
    const context = this.contexts.get(origin);
    if (!context) {
      return;
    }

    await this.saveContext(origin, context);
    await context.close();
    this.contexts.delete(origin);
    this.contextUsageCounts.delete(origin);
    log('info', `[BrowserContextPool] Closed context for ${origin}`);
  }

  /**
   * Close all contexts and save their states
   */
  async closeAllContexts(): Promise<void> {
    await this.saveAllContexts();
    
    const closePromises = Array.from(this.contexts.values()).map(ctx => ctx.close());
    await Promise.all(closePromises);
    
    this.contexts.clear();
    this.contextUsageCounts.clear();
    log('info', '[BrowserContextPool] Closed all contexts');
  }

  /**
   * Get the storage state file path for an origin
   */
  private getStorageStatePath(origin: string): string {
    // Use simple origin string (e.g., "https-example-com")
    const sanitized = origin
      .replace(/[^a-z0-9-_.]/gi, '-')
      .replace(/--+/g, '-')
      .toLowerCase();
    return join(this.storageDir, `${sanitized}.json`);
  }

  /**
   * Get statistics about the pool
   */
  getStats(): { contexts: number; totalUsage: number } {
    const totalUsage = Array.from(this.contextUsageCounts.values()).reduce((sum, count) => sum + count, 0);
    return {
      contexts: this.contexts.size,
      totalUsage
    };
  }

  /**
   * Clear all saved sessions (delete storage files)
   */
  clearAllSessions(): void {
    const { readdirSync, unlinkSync } = require('fs');
    try {
      const files = readdirSync(this.storageDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          unlinkSync(join(this.storageDir, file));
        }
      }
      log('info', `[BrowserContextPool] Cleared ${files.length} session file(s)`);
    } catch (error: any) {
      log('warn', `[BrowserContextPool] Failed to clear sessions: ${error.message}`);
    }
  }
}
