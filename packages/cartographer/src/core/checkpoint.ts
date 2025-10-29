/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import * as fs from "fs";
import { join } from "path";
import { log } from "../utils/logging.js";

/**
 * Checkpoint state for resume capability
 */
export interface CheckpointState {
  crawlId: string;
  visitedCount: number;
  enqueuedCount: number;
  queueDepth: number;
  visitedUrlKeysFile: string;
  frontierSnapshot: string;
  lastPartPointers: {
    pages: [string, number]; // [filename, byte offset]
    edges: [string, number];
    assets: [string, number];
    errors: [string, number];
  };
  rssMB: number;
  timestamp: string;
  gracefulShutdown?: boolean;
  resumeOf?: string; // Previous crawl ID if this is a resumed crawl
}

/**
 * Write checkpoint state to disk
 */
export function writeCheckpoint(
  stagingDir: string,
  state: CheckpointState
): void {
  const statePath = join(stagingDir, "state.json");
  const stateJson = JSON.stringify(state, null, 2);
  
  // Write atomically via temp file + rename
  const tempPath = statePath + ".tmp";
  fs.writeFileSync(tempPath, stateJson);
  fs.renameSync(tempPath, statePath);
  
  log("debug", `[Checkpoint] Wrote state: ${state.visitedCount} pages, ${state.queueDepth} in queue`);
}

/**
 * Read checkpoint state from disk
 */
export function readCheckpoint(stagingDir: string): CheckpointState | null {
  const statePath = join(stagingDir, "state.json");
  
  if (!fs.existsSync(statePath)) {
    return null;
  }
  
  try {
    const stateJson = fs.readFileSync(statePath, "utf-8");
    const state: CheckpointState = JSON.parse(stateJson);
    log("info", `[Resume] Found checkpoint: ${state.visitedCount} pages visited, ${state.queueDepth} in queue`);
    return state;
  } catch (error) {
    log("error", `[Resume] Failed to read checkpoint: ${error}`);
    return null;
  }
}

/**
 * Write visited URL keys to disk (compact binary format)
 */
export function writeVisitedIndex(
  stagingDir: string,
  visited: Set<string>
): void {
  const indexPath = join(stagingDir, "visited.idx");
  const urlKeys = Array.from(visited).join("\n") + "\n";
  fs.writeFileSync(indexPath, urlKeys);
  log("debug", `[Checkpoint] Wrote ${visited.size} visited URLs`);
}

/**
 * Read visited URL keys from disk
 */
export function readVisitedIndex(stagingDir: string): Set<string> {
  const indexPath = join(stagingDir, "visited.idx");
  
  if (!fs.existsSync(indexPath)) {
    return new Set();
  }
  
  const content = fs.readFileSync(indexPath, "utf-8");
  const urlKeys = content.split("\n").filter(line => line.length > 0);
  log("info", `[Resume] Loaded ${urlKeys.length} visited URLs`);
  return new Set(urlKeys);
}

/**
 * Write queue frontier snapshot to disk
 */
export function writeFrontier(
  stagingDir: string,
  queue: Array<{ url: string; depth: number; discoveredFrom?: string; page_id: string }>
): void {
  const frontierPath = join(stagingDir, "frontier.json");
  const frontierJson = JSON.stringify(queue, null, 2);
  fs.writeFileSync(frontierPath, frontierJson);
  log("debug", `[Checkpoint] Wrote frontier with ${queue.length} URLs`);
}

/**
 * Read queue frontier snapshot from disk
 * Note: Legacy checkpoints won't have page_id, caller must generate new ones
 */
export function readFrontier(
  stagingDir: string
): Array<{ url: string; depth: number; discoveredFrom?: string; page_id?: string }> {
  const frontierPath = join(stagingDir, "frontier.json");
  
  if (!fs.existsSync(frontierPath)) {
    return [];
  }
  
  const frontierJson = fs.readFileSync(frontierPath, "utf-8");
  const queue = JSON.parse(frontierJson);
  log("info", `[Resume] Loaded frontier with ${queue.length} URLs`);
  return queue;
}
