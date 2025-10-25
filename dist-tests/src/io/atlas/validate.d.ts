export interface AtlasValidationResult {
    ok: boolean;
    errors: string[];
    summary: {
        manifestPresent: boolean;
        incomplete: boolean;
        partCounts: Record<string, number>;
        manifestCounts: Record<string, number>;
        checkedFiles: string[];
        health?: Record<string, any>;
    };
}
export declare function validateAtlas(atlsPath: string, opts?: {
    checkDuplicates?: boolean;
    summary?: boolean;
}): Promise<AtlasValidationResult>;
//# sourceMappingURL=validate.d.ts.map