/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, it } from "node:test";
// Migrated to vitest expect()
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

describe("NDJSON Structured Logs", () => {
  const atlsPath = "./tmp/ndjson-test.atls";
  const logFile = "./tmp/ndjson-logs/test.jsonl";
  const cliPath = "./dist/cli/index.js";
  
  it("should create NDJSON log file with valid JSON events", async () => {
    // Clean up from previous runs
    if (fs.existsSync(atlsPath)) {
      fs.unlinkSync(atlsPath);
    }
    if (fs.existsSync(atlsPath + ".staging")) {
      fs.rmSync(atlsPath + ".staging", { recursive: true, force: true });
    }
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Run a small crawl with custom log file
    const cmd = `node ${cliPath} crawl --seeds https://example.com --out ${atlsPath} --mode raw --maxPages 3 --logFile ${logFile}`;
    
    try {
      await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      // May fail but that's ok for this test
    }
    
    // Verify log file exists
    expect(fs.existsSync(logFile).toBeTruthy()).toBe("Log file should exist");
    
    // Read log file
    const logContent = fs.readFileSync(logFile, "utf-8");
    const lines = logContent.trim().split("\n").filter(l => l.trim().length > 0);
    
    expect(lines.length >= 3, "Should have at least 3 log lines").toBeTruthy();
    
    // Parse first 10 lines (or all if fewer)
    const parsed = lines.slice(0, 10).map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        expect.fail(`Invalid JSON in log line: ${line}`);
      }
    });
    
    // Verify each line has required fields
    parsed.forEach((event, idx) => {
      expect(event.ts, `Event ${idx} should have 'ts' timestamp`).toBeTruthy();
      expect(event.level, `Event ${idx} should have 'level'`).toBeTruthy();
      expect(event.event, `Event ${idx} should have 'event' type`).toBeTruthy();
      
      // Verify timestamp is ISO 8601
      const tsDate = new Date(event.ts);
      expect(!isNaN(tsDate.getTime().toBeTruthy())).toBe(`Event ${idx} timestamp should be valid ISO 8601`);
    });
    
    // Check for specific events
    const events = parsed.map(e => e.event);
    const hasCrawlStarted = events.includes("crawl.started");
    const hasCrawlFinished = events.includes("crawl.finished");
    const hasPageProcessed = events.some(e => e === "crawl.pageProcessed");
    
    expect(hasCrawlStarted, "Should have crawl.started event").toBeTruthy();
    expect(hasCrawlFinished, "Should have crawl.finished event").toBeTruthy();
    // Note: pageProcessed may not be present if maxPages=0 or crawl failed early
    
    // Verify crawl.started has expected fields
    const startedEvent = parsed.find(e => e.event === "crawl.started");
    if (startedEvent) {
      expect(startedEvent.crawlId, "crawl.started should have crawlId").toBeTruthy();
      expect(startedEvent.seeds, "crawl.started should have seeds").toBeTruthy();
      expect(startedEvent.mode, "crawl.started should have mode").toBeTruthy();
    }
    
    // Verify crawl.finished has expected fields
    const finishedEvent = parsed.find(e => e.event === "crawl.finished");
    if (finishedEvent) {
      expect(finishedEvent.crawlId, "crawl.finished should have crawlId").toBeTruthy();
      expect(finishedEvent.durationMs !== undefined, "crawl.finished should have durationMs").toBeTruthy();
      expect(finishedEvent.pages !== undefined, "crawl.finished should have pages count").toBeTruthy();
      expect(finishedEvent.atls, "crawl.finished should have atls path").toBeTruthy();
    }
    
    console.log(`✓ NDJSON log test passed: ${lines.length} events logged`);
    console.log(`  Events found: ${events.slice(0, 5).join(", ")}`);
  });
  
  it("should include crawlId placeholder replacement in log file path", async () => {
    const customAtlsPath = "./tmp/ndjson-crawlid-test.atls";
    const customLogPattern = "./tmp/logs/crawl-<crawlId>.jsonl";
    
    // Clean up from previous runs
    if (fs.existsSync(customAtlsPath)) {
      fs.unlinkSync(customAtlsPath);
    }
    if (fs.existsSync(customAtlsPath + ".staging")) {
      fs.rmSync(customAtlsPath + ".staging", { recursive: true, force: true });
    }
    
    // Clean up any existing log files matching pattern
    const logDir = "./tmp/logs";
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir);
      files.forEach(file => {
        if (file.startsWith("crawl-") && file.endsWith(".jsonl")) {
          fs.unlinkSync(path.join(logDir, file));
        }
      });
    }
    
    // Run crawl with <crawlId> placeholder
    const cmd = `node ${cliPath} crawl --seeds https://example.com --out ${customAtlsPath} --mode raw --maxPages 1 --logFile "${customLogPattern}" --quiet`;
    
    try {
      await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      // May fail but that's ok
    }
    
    // Find the generated log file
    const logFiles = fs.readdirSync(logDir).filter(f => f.startsWith("crawl-") && f.endsWith(".jsonl"));
    
    expect(logFiles.length > 0, "Should have created a log file with crawlId in name").toBeTruthy();
    
    // Verify the log file has valid content
    const logPath = path.join(logDir, logFiles[0]);
    const content = fs.readFileSync(logPath, "utf-8");
    
    expect(content.trim().toBeTruthy().length > 0).toBe("Log file should have content");
    
    // Parse first line
    const firstLine = content.trim().split("\n")[0];
    const event = JSON.parse(firstLine);
    
    expect(event.crawlId, "First event should have crawlId").toBeTruthy();
    expect(logFiles[0].includes(event.crawlId).toBeTruthy()).toBe("Log filename should contain the actual crawlId");
    
    console.log(`✓ CrawlId replacement test passed: log file = ${logFiles[0]}`);
  });
});
