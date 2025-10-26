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
        pages: [string, number];
        edges: [string, number];
        assets: [string, number];
        errors: [string, number];
    };
    rssMB: number;
    timestamp: string;
    gracefulShutdown?: boolean;
    resumeOf?: string;
}
/**
 * Write checkpoint state to disk
 */
export declare function writeCheckpoint(stagingDir: string, state: CheckpointState): void;
/**
 * Read checkpoint state from disk
 */
export declare function readCheckpoint(stagingDir: string): CheckpointState | null;
/**
 * Write visited URL keys to disk (compact binary format)
 */
export declare function writeVisitedIndex(stagingDir: string, visited: Set<string>): void;
/**
 * Read visited URL keys from disk
 */
export declare function readVisitedIndex(stagingDir: string): Set<string>;
/**
 * Write queue frontier snapshot to disk
 */
export declare function writeFrontier(stagingDir: string, queue: Array<{
    url: string;
    depth: number;
    discoveredFrom?: string;
}>): void;
/**
 * Read queue frontier snapshot from disk
 */
export declare function readFrontier(stagingDir: string): Array<{
    url: string;
    depth: number;
    discoveredFrom?: string;
}>;
//# sourceMappingURL=checkpoint.d.ts.map