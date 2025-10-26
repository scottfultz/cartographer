/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { minimatch } from 'minimatch';

/**
 * URL filter for allow/deny lists
 * Supports both glob patterns and regex patterns
 */
export class URLFilter {
  private allowPatterns: Array<{ type: 'glob' | 'regex'; pattern: string | RegExp }> = [];
  private denyPatterns: Array<{ type: 'glob' | 'regex'; pattern: string | RegExp }> = [];

  constructor(allowUrls?: string[], denyUrls?: string[]) {
    if (allowUrls) {
      this.allowPatterns = allowUrls.map(pattern => this.parsePattern(pattern));
    }
    if (denyUrls) {
      this.denyPatterns = denyUrls.map(pattern => this.parsePattern(pattern));
    }
  }

  /**
   * Parse pattern string into glob or regex
   */
  private parsePattern(pattern: string): { type: 'glob' | 'regex'; pattern: string | RegExp } {
    // If pattern starts and ends with /, treat as regex
    if (pattern.startsWith('/')) {
      // Extract regex and flags: /pattern/flags
      const match = pattern.match(/^\/(.*)\/([gimuy]*)$/);
      if (match) {
        const [, regexStr, flags] = match;
        try {
          return { type: 'regex', pattern: new RegExp(regexStr, flags) };
        } catch (err) {
          // Invalid regex, treat as literal glob
          return { type: 'glob', pattern };
        }
      }
    }
    
    // Otherwise treat as glob
    return { type: 'glob', pattern };
  }

  /**
   * Check if URL should be allowed
   * 
   * Logic:
   * 1. If deny list matches, return false
   * 2. If allow list exists and doesn't match, return false
   * 3. Otherwise return true
   */
  shouldAllow(url: string): boolean {
    // Check deny list first
    for (const { type, pattern } of this.denyPatterns) {
      if (type === 'regex' && pattern instanceof RegExp) {
        if (pattern.test(url)) {
          return false;
        }
      } else if (type === 'glob' && typeof pattern === 'string') {
        if (minimatch(url, pattern)) {
          return false;
        }
      }
    }

    // If allow list is empty, allow everything (that wasn't denied)
    if (this.allowPatterns.length === 0) {
      return true;
    }

    // Check allow list
    for (const { type, pattern } of this.allowPatterns) {
      if (type === 'regex' && pattern instanceof RegExp) {
        if (pattern.test(url)) {
          return true;
        }
      } else if (type === 'glob' && typeof pattern === 'string') {
        if (minimatch(url, pattern)) {
          return true;
        }
      }
    }

    // Not in allow list
    return false;
  }

  /**
   * Check if allow list is defined
   */
  hasAllowList(): boolean {
    return this.allowPatterns.length > 0;
  }

  /**
   * Check if deny list is defined
   */
  hasDenyList(): boolean {
    return this.denyPatterns.length > 0;
  }

  /**
   * Get reason why URL was denied (for logging)
   */
  getDenyReason(url: string): string | null {
    // Check deny list
    for (const { type, pattern } of this.denyPatterns) {
      if (type === 'regex' && pattern instanceof RegExp) {
        if (pattern.test(url)) {
          return `Matched deny pattern (regex): ${pattern.source}`;
        }
      } else if (type === 'glob' && typeof pattern === 'string') {
        if (minimatch(url, pattern)) {
          return `Matched deny pattern (glob): ${pattern}`;
        }
      }
    }

    // Check if not in allow list
    if (this.allowPatterns.length > 0) {
      let matched = false;
      for (const { type, pattern } of this.allowPatterns) {
        if (type === 'regex' && pattern instanceof RegExp) {
          if (pattern.test(url)) {
            matched = true;
            break;
          }
        } else if (type === 'glob' && typeof pattern === 'string') {
          if (minimatch(url, pattern)) {
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        return 'Not in allow list';
      }
    }

    return null;
  }
}
