import type { AtlasManifest } from "../../core/types.js";
/**
 * Build Atlas manifest with owner attribution and integrity hashes
 */
export declare function buildManifest(opts: {
    parts: {
        pages: string[];
        edges: string[];
        assets: string[];
        errors: string[];
        accessibility?: string[];
        console?: string[];
        styles?: string[];
    };
    notes: string[];
    stagingDir: string;
    renderMode: string;
    robotsRespect: boolean;
    robotsOverride: boolean;
    provenance?: {
        resumeOf?: string;
        checkpointInterval?: number;
        gracefulShutdown?: boolean;
    };
}): Promise<AtlasManifest>;
//# sourceMappingURL=manifest.d.ts.map