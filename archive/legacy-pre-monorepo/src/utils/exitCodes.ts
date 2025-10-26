/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Exit code constants for Cartographer CLI
 */
export const EXIT_OK = 0;
export const EXIT_ERR_BUDGET = 2;
export const EXIT_ERR_RENDER = 3;
export const EXIT_ERR_WRITE = 4;
export const EXIT_ERR_VALIDATE = 5;
export const EXIT_ERR_UNKNOWN = 10;

export type FatalErrorType = 'render' | 'write' | 'validate' | 'unknown';

export interface CrawlResult {
  success: boolean;
  errorCount: number;
  errorBudgetExceeded?: boolean;
  fatalError?: FatalErrorType;
  summary?: any;
}

/**
 * Determine exit code based on crawl result
 */
export function decideExitCode(result: CrawlResult): number {
  // Fatal errors take precedence
  if (result.fatalError) {
    switch (result.fatalError) {
      case 'render':
        return EXIT_ERR_RENDER;
      case 'write':
        return EXIT_ERR_WRITE;
      case 'validate':
        return EXIT_ERR_VALIDATE;
      case 'unknown':
      default:
        return EXIT_ERR_UNKNOWN;
    }
  }
  
  // Error budget exceeded
  if (result.errorBudgetExceeded) {
    return EXIT_ERR_BUDGET;
  }
  
  // Success
  if (result.success) {
    return EXIT_OK;
  }
  
  // Default unknown error
  return EXIT_ERR_UNKNOWN;
}
