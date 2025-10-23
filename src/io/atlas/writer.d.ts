import type { EngineConfig, PageRecord, EdgeRecord, AssetRecord, ErrorRecord, AtlasSummary } from "../../core/types.js";
import type { AccessibilityRecord } from "../../core/extractors/accessibility.js";
/**
 * Streaming Atlas writer
 * Writes JSONL parts to staging directory, then compresses and packages into .atls ZIP
 */
export declare class AtlasWriter {
    private outPath;
    private config;
    private stagingDir;
    private uuid;
    private recordsSinceFlush;
    private readonly FLUSH_INTERVAL;
    private provenance;
    private pagesPart;
    private edgesPart;
    private assetsPart;
    private errorsPart;
    private accessibilityPart;
    private pagesStream;
    private edgesStream;
    private assetsStream;
    private errorsStream;
    private accessibilityStream;
    private pagesBytes;
    private edgesBytes;
    private assetsBytes;
    private errorsBytes;
    private accessibilityBytes;
    private stats;
    constructor(outPath: string, config: EngineConfig, crawlId?: string);
    init(): Promise<void>;
    writePage(page: PageRecord): Promise<void>;
    writeEdge(edge: EdgeRecord): Promise<void>;
    writeAsset(asset: AssetRecord): Promise<void>;
    writeError(error: ErrorRecord): Promise<void>;
    writeAccessibility(record: AccessibilityRecord): Promise<void>;
    /**
     * Get total bytes written (uncompressed JSONL)
     */
    getBytesWritten(): number;
    /**
     * Get crawl ID (UUID)
     */
    getCrawlId(): string;
    /**
     * Get staging directory path
     */
    getStagingDir(): string;
    /**
     * Get current summary statistics
     */
    getSummary(): AtlasSummary;
    /**
     * Get manifest.json path for this crawl
     */
    getManifestPath(): string;
    /**
     * Set provenance information for manifest
     */
    setProvenance(provenance: {
        resumeOf?: string;
        checkpointInterval?: number;
        gracefulShutdown?: boolean;
    }): void;
    /**
     * Get current part pointers for checkpoint
     */
    getPartPointers(): {
        pages: [string, number];
        edges: [string, number];
        assets: [string, number];
        errors: [string, number];
        accessibility: [string, number];
    };
    /**
     * Flush and fsync all streams
     */
    flushAndSync(): Promise<void>;
    private rotatePagesPart;
    private rotateEdgesPart;
    private rotateAssetsPart;
    private rotateErrorsPart;
    private rotateAccessibilityPart;
    finalize(): Promise<void>;
    private compressParts;
    /**
     * Create final .atls ZIP archive from staging directory
     */
    private createZipArchive;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=writer.d.ts.map