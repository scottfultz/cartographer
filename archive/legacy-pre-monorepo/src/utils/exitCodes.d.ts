/**
 * Exit code constants for Cartographer CLI
 */
export declare const EXIT_OK = 0;
export declare const EXIT_ERR_BUDGET = 2;
export declare const EXIT_ERR_RENDER = 3;
export declare const EXIT_ERR_WRITE = 4;
export declare const EXIT_ERR_VALIDATE = 5;
export declare const EXIT_ERR_UNKNOWN = 10;
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
export declare function decideExitCode(result: CrawlResult): number;
//# sourceMappingURL=exitCodes.d.ts.map