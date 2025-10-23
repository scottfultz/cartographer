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
 * Close the log file stream
 */
export function closeLogFile(): void {
  if (logFileStream) {
    logFileStream.end();
    logFileStream = null;
  }
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
      const prefix = {
        debug: pc.gray("[DEBUG]"),
        info: pc.blue("[INFO]"),
        warn: pc.yellow("[WARN]"),
        error: pc.red("[ERROR]")
      }[level];
      
      // Always write to stderr (except in json mode for non-errors)
      const output = `${prefix} ${message}`;
      if (jsonMode && level !== "error") {
        process.stderr.write(output + '\n');
      } else {
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
