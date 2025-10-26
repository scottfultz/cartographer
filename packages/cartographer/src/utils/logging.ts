/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import pc from "picocolors";
import * as fs from "fs";
import * as path from "path";

type LogLevel = "debug" | "info" | "warn" | "error";

let currentLevel: LogLevel = "info";
let quietMode = false;
let jsonMode = false;
let logFileStream: fs.WriteStream | null = null;
let logFilePath: string | null = null;

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

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
export function initLogging(config: LogConfig): void {
  if (config.level) {
    currentLevel = config.level;
  }
  
  if (config.quiet !== undefined) {
    quietMode = config.quiet;
  }
  
  if (config.json !== undefined) {
    jsonMode = config.json;
  }
  
  // Setup file logging
  if (config.logFile) {
    const resolvedPath = config.logFile.replace('<crawlId>', config.crawlId || 'unknown');
    logFilePath = resolvedPath;
    
    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create write stream with autoClose
    logFileStream = fs.createWriteStream(resolvedPath, { flags: 'a' });
  }
}

/**
 * Close the log file stream and reset logging state
 */
export function closeLogFile(): void {
  if (logFileStream) {
    // Suppress errors during close (e.g., file deleted by test cleanup)
    logFileStream.on('error', () => {});
    logFileStream.end();
    logFileStream = null;
  }
  logFilePath = null;
  // Reset to defaults
  currentLevel = "info";
  quietMode = false;
  jsonMode = false;
}

/**
 * Get the current log file path
 */
export function getLogFilePath(): string | null {
  return logFilePath;
}

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function setQuietMode(quiet: boolean): void {
  quietMode = quiet;
}

export function setJsonMode(json: boolean): void {
  jsonMode = json;
}

export function log(level: LogLevel, message: string): void {
  if (levels[level] >= levels[currentLevel]) {
    // In quiet mode, only show errors on console
    if (!quietMode || level === "error") {
      // Format timestamp as HH:MM:SS (24-hour)
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${hours}:${minutes}:${seconds}`;
      
      // Traffic light color scheme: green (debug/info), yellow (warn), red (error)
      const prefix = {
        debug: pc.green("[DEBUG]"),
        info: pc.green("[INFO]"),
        warn: pc.yellow("[WARN]"),
        error: pc.red("[ERROR]")
      }[level];
      
      // NEW FORMAT: [LEVEL] [timestamp] message
      // HIGH IMPORTANCE (warn/error): No indent, wrapped by empty lines
      // ORDINARY (debug/info): Indent by 4 spaces
      let output = `${prefix} [${timestamp}] ${message}`;
      
      if (level === "warn" || level === "error") {
        // High importance: no indent, wrapped by empty lines
        console.error("");
        console.error(output);
        console.error("");
      } else {
        // Ordinary: indent by 4 spaces
        output = '    ' + output;
        console.error(output);
      }
    }
  }
}

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
  [key: string]: any; // Allow extensions
}

/**
 * Write a structured event to the log file
 */
export function logEvent(event: LogEvent): void {
  if (!logFileStream) {
    return;
  }
  
  // Ensure timestamp
  if (!event.ts) {
    event.ts = new Date().toISOString();
  }
  
  // Filter by log level
  if (levels[event.level] >= levels[currentLevel]) {
    const line = JSON.stringify(event) + '\n';
    logFileStream.write(line);
  }
}
