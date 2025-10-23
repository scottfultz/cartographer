/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import Ajv from "ajv";
import type { EdgeRecord, AssetRecord } from "../core/types.js";
import edgeSchema from "./atlas/schemas/edges.schema.json" with { type: "json" };
import assetSchema from "./atlas/schemas/assets.schema.json" with { type: "json" };
import { log } from "../utils/logging.js";

const ajv = new Ajv.default({ strict: false });

const validateEdge = ajv.compile(edgeSchema);
const validateAsset = ajv.compile(assetSchema);

/**
 * Validate EdgeRecord against JSON Schema
 * Only runs if VALIDATE_SCHEMAS env var is set
 */
export function validateEdgeRecord(edge: EdgeRecord): boolean {
  if (!process.env.VALIDATE_SCHEMAS) {
    return true;
  }

  const valid = validateEdge(edge);
  if (!valid) {
    log("warn", `EdgeRecord validation failed: ${JSON.stringify(validateEdge.errors)}`);
    log("debug", `Invalid edge: ${JSON.stringify(edge)}`);
  }
  return valid;
}

/**
 * Validate AssetRecord against JSON Schema
 * Only runs if VALIDATE_SCHEMAS env var is set
 */
export function validateAssetRecord(asset: AssetRecord): boolean {
  if (!process.env.VALIDATE_SCHEMAS) {
    return true;
  }

  const valid = validateAsset(asset);
  if (!valid) {
    log("warn", `AssetRecord validation failed: ${JSON.stringify(validateAsset.errors)}`);
    log("debug", `Invalid asset: ${JSON.stringify(asset)}`);
  }
  return valid;
}
