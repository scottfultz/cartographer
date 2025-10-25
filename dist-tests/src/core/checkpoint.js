/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import * as fs from "fs";
import { join } from "path";
import { log } from "../utils/logging.js";
/**
 * Write checkpoint state to disk
 */
export function writeCheckpoint(stagingDir, state) {
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
export function readCheckpoint(stagingDir) {
    const statePath = join(stagingDir, "state.json");
    if (!fs.existsSync(statePath)) {
        return null;
    }
    try {
        const stateJson = fs.readFileSync(statePath, "utf-8");
        const state = JSON.parse(stateJson);
        log("info", `[Resume] Found checkpoint: ${state.visitedCount} pages visited, ${state.queueDepth} in queue`);
        return state;
    }
    catch (error) {
        log("error", `[Resume] Failed to read checkpoint: ${error}`);
        return null;
    }
}
/**
 * Write visited URL keys to disk (compact binary format)
 */
export function writeVisitedIndex(stagingDir, visited) {
    const indexPath = join(stagingDir, "visited.idx");
    const urlKeys = Array.from(visited).join("\n") + "\n";
    fs.writeFileSync(indexPath, urlKeys);
    log("debug", `[Checkpoint] Wrote ${visited.size} visited URLs`);
}
/**
 * Read visited URL keys from disk
 */
export function readVisitedIndex(stagingDir) {
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
export function writeFrontier(stagingDir, queue) {
    const frontierPath = join(stagingDir, "frontier.json");
    const frontierJson = JSON.stringify(queue, null, 2);
    fs.writeFileSync(frontierPath, frontierJson);
    log("debug", `[Checkpoint] Wrote frontier with ${queue.length} URLs`);
}
/**
 * Read queue frontier snapshot from disk
 */
export function readFrontier(stagingDir) {
    const frontierPath = join(stagingDir, "frontier.json");
    if (!fs.existsSync(frontierPath)) {
        return [];
    }
    const frontierJson = fs.readFileSync(frontierPath, "utf-8");
    const queue = JSON.parse(frontierJson);
    log("info", `[Resume] Loaded frontier with ${queue.length} URLs`);
    return queue;
}
//# sourceMappingURL=checkpoint.js.map