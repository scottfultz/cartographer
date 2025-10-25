export interface ValidationResult {
    pages: {
        count: number;
        errors: number;
        sampleErrors?: string[];
    };
    edges: {
        count: number;
        errors: number;
        sampleErrors?: string[];
    };
    assets: {
        count: number;
        errors: number;
        sampleErrors?: string[];
    };
    errors: {
        count: number;
        errors: number;
        sampleErrors?: string[];
    };
    accessibility?: {
        count: number;
        errors: number;
        sampleErrors?: string[];
    };
    status: "clean" | "needs-truncate" | "corrupt";
    message?: string;
}
/**
 * Validate an .atls archive
 */
export declare function validateAtlas(atlsPath: string): Promise<ValidationResult>;
/**
 * Validate a staging directory
 */
export declare function validateStaging(stagingDir: string): Promise<ValidationResult>;
//# sourceMappingURL=validator.d.ts.map