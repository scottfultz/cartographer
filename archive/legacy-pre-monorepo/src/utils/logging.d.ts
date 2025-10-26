type LogLevel = "debug" | "info" | "warn" | "error";
/**
 * Configuration for logging behavior
 */
export interface LogConfig {
    level?: LogLevel;
    quiet?: boolean;
    json?: boolean;
    logFile?: string;
    crawlId?: string;
}
/**
 * Initialize logging system with configuration
 */
export declare function initLogging(config: LogConfig): void;
/**
 * Close the log file stream
 */
export declare function closeLogFile(): void;
/**
 * Get the current log file path
 */
export declare function getLogFilePath(): string | null;
export declare function setLogLevel(level: LogLevel): void;
export declare function setQuietMode(quiet: boolean): void;
export declare function setJsonMode(json: boolean): void;
export declare function log(level: LogLevel, message: string): void;
/**
 * Structured event log - writes NDJSON to file
 */
export interface LogEvent {
    ts: string;
    level: LogLevel;
    event: string;
    crawlId?: string;
    url?: string;
    depth?: number;
    status?: number;
    fetchMs?: number;
    renderMs?: number;
    extractMs?: number;
    writeMs?: number;
    rssMB?: number;
    [key: string]: any;
}
/**
 * Write a structured event to the log file
 */
export declare function logEvent(event: LogEvent): void;
export {};
//# sourceMappingURL=logging.d.ts.map