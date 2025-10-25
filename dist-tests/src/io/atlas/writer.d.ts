import type { EngineConfig, PageRecord, EdgeRecord, AssetRecord, ErrorRecord, AtlasSummary, ConsoleRecord, ComputedTextNodeRecord } from "../../core/types.js";
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
    private consolePart;
    private stylesPart;
    private pagesStream;
    private edgesStream;
    private assetsStream;
    private errorsStream;
    private accessibilityStream;
    private consoleStream;
    private stylesStream;
    private pagesBytes;
    private edgesBytes;
    private assetsBytes;
    private errorsBytes;
    private accessibilityBytes;
    private consoleBytes;
    private stylesBytes;
    private stats;
    constructor(outPath: string, config: EngineConfig, crawlId?: string);
    init(): Promise<void>;
    writePage(page: PageRecord): Promise<void>;
    writeEdge(edge: EdgeRecord): Promise<void>;
    writeAsset(asset: AssetRecord): Promise<void>;
    writeError(error: ErrorRecord): Promise<void>;
    writeAccessibility(record: AccessibilityRecord): Promise<void>;
    writeConsole(record: ConsoleRecord): Promise<void>;
    writeStyle(record: ComputedTextNodeRecord): Promise<void>;
    writeScreenshot(viewport: 'desktop' | 'mobile', urlKey: string, buffer: Buffer): Promise<string>;
    writeFavicon(originKey: string, buffer: Buffer, mimeType: string): Promise<string>;
    writeLegacyScreenshot(urlKey: string, buffer: Buffer): Promise<void>;
    writeViewport(urlKey: string, buffer: Buffer): Promise<void>;
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
     * Set completion reason for crawl
     */
    setCompletionReason(reason: "finished" | "capped" | "error_budget" | "manual"): void;
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
    private rotateConsolePart;
    private rotateStylesPart;
    finalize(): Promise<void>;
    private compressParts;
    /**
     * Create final .atls ZIP archive from staging directory
     */
    private createZipArchive;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=writer.d.ts.map