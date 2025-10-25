import type { EdgeRecord, AssetRecord } from "../core/types.js";
/**
 * Validate EdgeRecord against JSON Schema
 * Only runs if VALIDATE_SCHEMAS env var is set
 */
export declare function validateEdgeRecord(edge: EdgeRecord): boolean;
/**
 * Validate AssetRecord against JSON Schema
 * Only runs if VALIDATE_SCHEMAS env var is set
 */
export declare function validateAssetRecord(asset: AssetRecord): boolean;
//# sourceMappingURL=validator.d.ts.map