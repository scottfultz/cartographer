/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import * as fs from "fs";
import { join } from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { log } from "../../utils/logging.js";
import { iterateParts, readManifest } from "../readers/atlsReader.js";
import { readCheckpoint } from "../../core/checkpoint.js";
import { open, Entry, ZipFile } from "yauzl";
import { Readable } from "stream";
import { createHash } from "crypto";
import type { AtlasManifest } from "@atlas/spec";
import { decompress } from "@mongodb-js/zstd";
import { validatePackPlan, type PackValidationSummary } from "./packPlanValidator.js";

export interface ValidationResult {
  pages: { count: number; errors: number; sampleErrors?: string[] };
  edges: { count: number; errors: number; sampleErrors?: string[] };
  assets: { count: number; errors: number; sampleErrors?: string[] };
  errors: { count: number; errors: number; sampleErrors?: string[] };
  accessibility?: { count: number; errors: number; sampleErrors?: string[] };
  manifest?: { valid: boolean; errors?: string[] };
  capabilities?: { valid: boolean; errors?: string[] };
  provenance?: { valid: boolean; errors?: string[]; verified: number; total: number };
  integrity?: { valid: boolean; errors?: string[]; verified: number; total: number };
  packs?: { valid: boolean; errors?: string[]; summary: PackValidationSummary[] };
  status: "clean" | "needs-truncate" | "corrupt";
  message?: string;
}

/**
 * Validate manifest structure
 */
function validateManifestStructure(manifest: AtlasManifest, result: ValidationResult): void {
  const errors: string[] = [];
  
  if (!manifest.owner || !manifest.owner.name || manifest.owner.name.trim().length === 0) {
    errors.push("Missing or empty 'owner.name' field");
  }
  
  if (!manifest.atlasVersion || !["1.0", "v1"].includes(manifest.atlasVersion)) {
    errors.push(`Invalid atlasVersion: ${manifest.atlasVersion} (expected '1.0' or 'v1')`);
  }
  
  if (!manifest.formatVersion) {
    errors.push("Missing 'formatVersion' field");
  }
  
  if (!manifest.capabilities || !manifest.capabilities.renderModes || manifest.capabilities.renderModes.length === 0) {
    errors.push("Missing or empty 'capabilities.renderModes' array");
  }
  
  if (!manifest.createdAt) {
    errors.push("Missing 'createdAt' timestamp");
  }
  
  if (!manifest.generator) {
    errors.push("Missing 'generator' field");
  }
  
  if (errors.length > 0) {
    result.manifest = { valid: false, errors };
    result.status = "corrupt";
  }
}

/**
 * Validate capabilities file consistency
 */
async function validateCapabilities(
  atlsPath: string, 
  manifest: AtlasManifest, 
  result: ValidationResult
): Promise<void> {
  try {
    const capabilities = await readFileFromZip(atlsPath, "capabilities.v1.json");
    const capData = JSON.parse(capabilities);
    
    const errors: string[] = [];
    
    if (capData.version !== "v1") {
      errors.push(`Capabilities version mismatch: ${capData.version} (expected 'v1')`);
    }
    
    if (!Array.isArray(capData.capabilities)) {
      errors.push("Capabilities must be an array");
    } else {
      // Verify core capabilities are present
      const caps = capData.capabilities as string[];
      
      if (!caps.includes("seo.core")) {
        errors.push("Missing required capability: seo.core");
      }
      
      if (manifest.capabilities?.modesUsed?.includes("full") && !caps.includes("render.dom")) {
        errors.push("Full mode should include render.dom capability");
      }
      
      // Check consistency with manifest capabilities
      if (manifest.capabilities && manifest.capabilities.dataSets) {
        const dataSetNames = manifest.capabilities.dataSets;
        // Just verify dataSets is an array - full validation happens in dataset checks
        if (!Array.isArray(dataSetNames)) {
          errors.push("Manifest capabilities.dataSets must be an array");
        }
      }
    }
    
    if (errors.length > 0) {
      result.capabilities = { valid: false, errors };
    }
  } catch (error: any) {
    result.capabilities = { valid: false, errors: [`Failed to read capabilities.v1.json: ${error.message}`] };
  }
}

/**
 * Validate provenance dataset hashes
 */
async function validateProvenance(atlsPath: string, result: ValidationResult): Promise<void> {
  try {
    const provenanceFiles = await listFilesInZip(atlsPath, "provenance/");
    
    if (provenanceFiles.length === 0) {
      // Provenance is optional for older archives
      return;
    }
    
    const errors: string[] = [];
    let verified = 0;
    let total = 0;
    
    // Read provenance files directly (not using iterateParts since provenance not in SDK yet)
    for (const fileName of provenanceFiles) {
      if (!fileName.endsWith(".jsonl.zst") && !fileName.endsWith(".jsonl")) {
        continue;
      }
      
      try {
        const rawContent = await readFileFromZipBuffer(atlsPath, fileName);
        
        // Decompress if .zst
        let content: string;
        if (fileName.endsWith(".zst")) {
          const decompressed = await decompress(rawContent);
          content = Buffer.from(decompressed).toString("utf-8");
        } else {
          content = rawContent.toString("utf-8");
        }
        
        const lines = content.split("\n").filter(l => l.trim().length > 0);
        
        for (const line of lines) {
          total++;
          try {
            const record = JSON.parse(line);
            
            // Check required fields
            if (!record.dataset_name || !record.producer || !record.output) {
              errors.push(`Provenance record ${total} missing required fields (dataset_name, producer, or output)`);
              continue;
            }
            
            // Verify hash if present
            if (record.output.hash_sha256) {
              // Verify the hash format (64 hex chars)
              const hashPattern = /^[a-f0-9]{64}$/;
              if (!hashPattern.test(record.output.hash_sha256)) {
                errors.push(`Invalid SHA-256 hash format in record ${total}: ${record.output.hash_sha256}`);
              } else {
                verified++;
              }
            } else {
              errors.push(`Provenance record ${total} (${record.dataset_name}) missing hash_sha256`);
            }
          } catch (error: any) {
            errors.push(`Failed to parse provenance record ${total}: ${error.message}`);
          }
        }
      } catch (error: any) {
        errors.push(`Failed to read provenance file ${fileName}: ${error.message}`);
      }
    }
    
    result.provenance = {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      verified,
      total
    };
  } catch (error: any) {
    // Provenance validation is optional
    if (!error.message.includes("not found")) {
      result.provenance = { 
        valid: false, 
        errors: [`Provenance validation failed: ${error.message}`],
        verified: 0,
        total: 0
      };
    }
  }
}

/**
 * Validate integrity checksums for all parts
 */
async function validateIntegrity(
  atlsPath: string,
  manifest: AtlasManifest,
  result: ValidationResult
): Promise<void> {
  const errors: string[] = [];
  let verified = 0;
  let total = 0;

  try {
    // Check if manifest has integrity information
    if (!manifest.integrity || !manifest.integrity.files) {
      result.integrity = {
        valid: false,
        errors: ["Manifest missing integrity.files section"],
        verified: 0,
        total: 0
      };
      return;
    }

    if (manifest.integrity.algorithm && manifest.integrity.algorithm.toLowerCase() !== "sha256") {
      errors.push(`Unsupported integrity algorithm: ${manifest.integrity.algorithm}`);
    }

    // Check datasets for per-part checksums (Atlas v1.0 Enhancement)
    if (manifest.datasets) {
      for (const [datasetName, dataset] of Object.entries(manifest.datasets)) {
        if (dataset.integrity && dataset.integrity.checksums) {
          const checksums = dataset.integrity.checksums as Record<string, string>;
          
          for (const [fileName, expectedHash] of Object.entries(checksums)) {
            total++;
            
            try {
              // Read file from archive
              const fileContent = await readFileFromZipBuffer(atlsPath, fileName);
              
              // Compute SHA-256 hash
              const actualHash = createHash("sha256").update(fileContent).digest("hex");
              
              if (actualHash === expectedHash) {
                verified++;
              } else {
                errors.push(
                  `Checksum mismatch for ${fileName}: expected ${expectedHash.substring(0, 16)}..., got ${actualHash.substring(0, 16)}...`
                );
              }
            } catch (error: any) {
              errors.push(`Failed to verify ${fileName}: ${error.message}`);
            }
          }
        }
      }
    }

    // Fallback: check legacy integrity.files
    if (total === 0 && manifest.integrity.files) {
      for (const [fileName, expectedHash] of Object.entries(manifest.integrity.files)) {
        total++;
        
        try {
          const fileContent = await readFileFromZipBuffer(atlsPath, fileName);
          const actualHash = createHash("sha256").update(fileContent).digest("hex");
          
          if (actualHash === expectedHash) {
            verified++;
          } else {
            errors.push(
              `Checksum mismatch for ${fileName}: expected ${expectedHash.substring(0, 16)}..., got ${actualHash.substring(0, 16)}...`
            );
          }
        } catch (error: any) {
          errors.push(`Failed to verify ${fileName}: ${error.message}`);
        }
      }
    }

    if (manifest.integrity.archiveSha256) {
      const sortedHashes = Object.entries(manifest.integrity.files)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, hash]) => hash)
        .join("");
      const recalculated = createHash("sha256").update(sortedHashes).digest("hex");
      if (recalculated !== manifest.integrity.archiveSha256) {
        errors.push(
          `Archive hash mismatch: manifest integrity.archiveSha256=${manifest.integrity.archiveSha256.substring(0, 16)}..., recalculated=${recalculated.substring(0, 16)}...`
        );
      }
    } else {
      const schemaVersion = manifest.schemaVersion && !Number.isNaN(Date.parse(manifest.schemaVersion))
        ? Date.parse(manifest.schemaVersion)
        : undefined;
      const requiredThreshold = Date.parse("2025-10-22");
      if (schemaVersion && schemaVersion >= requiredThreshold) {
        errors.push("Manifest missing integrity.archiveSha256 field (required for schemaVersion >= 2025-10-22)");
      }
    }

    result.integrity = {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      verified,
      total
    };

    if (errors.length > 0) {
      result.status = "corrupt";
    }
  } catch (error: any) {
    result.integrity = {
      valid: false,
      errors: [`Integrity validation failed: ${error.message}`],
      verified: 0,
      total: 0
    };
    result.status = "corrupt";
  }
}

/**
 * Read a file from ZIP archive
 */
function readFileFromZip(atlsPath: string, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    open(atlsPath, { lazyEntries: true }, (err: Error | null, zipfile?: ZipFile) => {
      if (err || !zipfile) return reject(err || new Error("Failed to open ZIP"));
      
      zipfile.readEntry();
      
      zipfile.on("entry", (entry: Entry) => {
        if (entry.fileName === fileName) {
          zipfile.openReadStream(entry, (err: Error | null, readStream?: Readable) => {
            if (err || !readStream) return reject(err || new Error("Failed to open stream"));
            
            const chunks: Buffer[] = [];
            readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
            readStream.on("end", () => {
              zipfile.close();
              resolve(Buffer.concat(chunks).toString("utf-8"));
            });
            readStream.on("error", reject);
          });
        } else {
          zipfile.readEntry();
        }
      });
      
      zipfile.on("end", () => reject(new Error(`${fileName} not found in archive`)));
      zipfile.on("error", reject);
    });
  });
}

/**
 * Read a file from ZIP archive as Buffer
 */
function readFileFromZipBuffer(atlsPath: string, fileName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    open(atlsPath, { lazyEntries: true }, (err: Error | null, zipfile?: ZipFile) => {
      if (err || !zipfile) return reject(err || new Error("Failed to open ZIP"));
      
      zipfile.readEntry();
      
      zipfile.on("entry", (entry: Entry) => {
        if (entry.fileName === fileName) {
          zipfile.openReadStream(entry, (err: Error | null, readStream?: Readable) => {
            if (err || !readStream) return reject(err || new Error("Failed to open stream"));
            
            const chunks: Buffer[] = [];
            readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
            readStream.on("end", () => {
              zipfile.close();
              resolve(Buffer.concat(chunks));
            });
            readStream.on("error", reject);
          });
        } else {
          zipfile.readEntry();
        }
      });
      
      zipfile.on("end", () => reject(new Error(`${fileName} not found in archive`)));
      zipfile.on("error", reject);
    });
  });
}

/**
 * List files in ZIP archive matching prefix
 */
function listFilesInZip(atlsPath: string, prefix: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const files: string[] = [];
    
    open(atlsPath, { lazyEntries: true }, (err: Error | null, zipfile?: ZipFile) => {
      if (err || !zipfile) return reject(err || new Error("Failed to open ZIP"));
      
      zipfile.readEntry();
      
      zipfile.on("entry", (entry: Entry) => {
        if (entry.fileName.startsWith(prefix)) {
          files.push(entry.fileName);
        }
        zipfile.readEntry();
      });
      
      zipfile.on("end", () => {
        zipfile.close();
        resolve(files);
      });
      
      zipfile.on("error", reject);
    });
  });
}

/**
 * Validate an .atls archive
 */
export async function validateAtlas(atlsPath: string): Promise<ValidationResult> {
  if (!fs.existsSync(atlsPath)) {
    return {
      pages: { count: 0, errors: 0 },
      edges: { count: 0, errors: 0 },
      assets: { count: 0, errors: 0 },
      errors: { count: 0, errors: 0 },
      status: "corrupt",
      message: `File not found: ${atlsPath}`
    };
  }

  const result: ValidationResult = {
    pages: { count: 0, errors: 0, sampleErrors: [] },
    edges: { count: 0, errors: 0, sampleErrors: [] },
    assets: { count: 0, errors: 0, sampleErrors: [] },
    errors: { count: 0, errors: 0, sampleErrors: [] },
    manifest: { valid: true, errors: [] },
    capabilities: { valid: true, errors: [] },
    provenance: { valid: true, errors: [], verified: 0, total: 0 },
    integrity: { valid: true, errors: [], verified: 0, total: 0 },
    packs: { valid: true, errors: [], summary: [] },
    status: "clean"
  };

  try {
    // Read manifest to get schema info
    const manifest = await readManifest(atlsPath);
    
  // Validate manifest structure
  validateManifestStructure(manifest, result);

  // Validate pack plan alignment (Atlas v1.0 Pack spec)
  const packValidation = validatePackPlan(manifest);
  result.packs = packValidation;
  if (!packValidation.valid) {
    result.status = "corrupt";
  }
    
    // Validate capabilities file
    await validateCapabilities(atlsPath, manifest, result);
    
    // Validate provenance hashes
    await validateProvenance(atlsPath, result);
    
    // Validate integrity checksums (Atlas v1.0 Enhancement - Phase 2)
    await validateIntegrity(atlsPath, manifest, result);
    
  // Load schemas from archive (use manifest-declared schema paths)
  const schemas = await loadSchemas(atlsPath, manifest);
    
    const ajv = new Ajv.default({ allErrors: true, strictSchema: false });
    addFormats.default(ajv);
    
    const validatePage = ajv.compile(schemas.pages);
    const validateEdge = ajv.compile(schemas.edges);
    const validateAsset = ajv.compile(schemas.assets);
    const validateError = ajv.compile(schemas.errors);
    
    // Validate pages
    for await (const line of iterateParts(atlsPath, "pages")) {
      result.pages.count++;
      try {
        const page = JSON.parse(line);
        if (!validatePage(page)) {
          result.pages.errors++;
          if (result.pages.sampleErrors!.length < 10) {
            result.pages.sampleErrors!.push(
              `Page ${result.pages.count}: ${ajv.errorsText(validatePage.errors)}`
            );
          }
        }
      } catch (error: any) {
        result.pages.errors++;
        if (result.pages.sampleErrors!.length < 10) {
          result.pages.sampleErrors!.push(`Page ${result.pages.count}: ${error.message}`);
        }
      }
    }
    
    // Validate edges
    for await (const line of iterateParts(atlsPath, "edges")) {
      result.edges.count++;
      try {
        const edge = JSON.parse(line);
        if (!validateEdge(edge)) {
          result.edges.errors++;
          if (result.edges.sampleErrors!.length < 10) {
            result.edges.sampleErrors!.push(
              `Edge ${result.edges.count}: ${ajv.errorsText(validateEdge.errors)}`
            );
          }
        }
      } catch (error: any) {
        result.edges.errors++;
        if (result.edges.sampleErrors!.length < 10) {
          result.edges.sampleErrors!.push(`Edge ${result.edges.count}: ${error.message}`);
        }
      }
    }
    
    // Validate assets
    for await (const line of iterateParts(atlsPath, "assets")) {
      result.assets.count++;
      try {
        const asset = JSON.parse(line);
        if (!validateAsset(asset)) {
          result.assets.errors++;
          if (result.assets.sampleErrors!.length < 10) {
            result.assets.sampleErrors!.push(
              `Asset ${result.assets.count}: ${ajv.errorsText(validateAsset.errors)}`
            );
          }
        }
      } catch (error: any) {
        result.assets.errors++;
        if (result.assets.sampleErrors!.length < 10) {
          result.assets.sampleErrors!.push(`Asset ${result.assets.count}: ${error.message}`);
        }
      }
    }
    
    // Validate errors
    for await (const line of iterateParts(atlsPath, "errors")) {
      result.errors.count++;
      try {
        const error = JSON.parse(line);
        if (!validateError(error)) {
          result.errors.errors++;
          if (result.errors.sampleErrors!.length < 10) {
            result.errors.sampleErrors!.push(
              `Error ${result.errors.count}: ${ajv.errorsText(validateError.errors)}`
            );
          }
        }
      } catch (error: any) {
        result.errors.errors++;
        if (result.errors.sampleErrors!.length < 10) {
          result.errors.sampleErrors!.push(`Error ${result.errors.count}: ${error.message}`);
        }
      }
    }
    
    // Validate accessibility if present
    if (schemas.accessibility) {
      result.accessibility = { count: 0, errors: 0, sampleErrors: [] };
      const validateAccessibility = ajv.compile(schemas.accessibility);
      
      try {
        for await (const line of iterateParts(atlsPath, "accessibility")) {
          result.accessibility.count++;
          try {
            const record = JSON.parse(line);
            if (!validateAccessibility(record)) {
              result.accessibility.errors++;
              if (result.accessibility.sampleErrors!.length < 10) {
                result.accessibility.sampleErrors!.push(
                  `Accessibility ${result.accessibility.count}: ${ajv.errorsText(validateAccessibility.errors)}`
                );
              }
            }
          } catch (error: any) {
            result.accessibility.errors++;
            if (result.accessibility.sampleErrors!.length < 10) {
              result.accessibility.sampleErrors!.push(`Accessibility ${result.accessibility.count}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        // No accessibility stream found, that's ok
      }
    }
    
    // Determine overall status
    const totalErrors = result.pages.errors + result.edges.errors + 
                       result.assets.errors + result.errors.errors +
                       (result.accessibility?.errors || 0);
    
    if (totalErrors > 0) {
      result.status = "corrupt";
      result.message = `Found ${totalErrors} schema validation errors`;
    }
    
    // Clean up sample errors if none found
    if (result.pages.errors === 0) delete result.pages.sampleErrors;
    if (result.edges.errors === 0) delete result.edges.sampleErrors;
    if (result.assets.errors === 0) delete result.assets.sampleErrors;
    if (result.errors.errors === 0) delete result.errors.sampleErrors;
    if (result.accessibility && result.accessibility.errors === 0) delete result.accessibility.sampleErrors;
    
  } catch (error: any) {
    result.status = "corrupt";
    result.message = `Validation failed: ${error.message}`;
  }

  return result;
}

/**
 * Load JSON schemas from .atls archive
 */
async function loadSchemas(atlsPath: string, manifest: AtlasManifest): Promise<{
  pages: any;
  edges: any;
  assets: any;
  errors: any;
  accessibility?: any;
  perf?: any;
}> {
  const readSchema = (fileName: string, optional = false): Promise<any | null> => {
    return new Promise((resolve, reject) => {
      open(atlsPath, { lazyEntries: true }, (err: Error | null, zipfile?: ZipFile) => {
        if (err || !zipfile) return reject(err || new Error("Failed to open ZIP"));
        
        zipfile.readEntry();
        
        zipfile.on("entry", (entry: Entry) => {
          if (entry.fileName === fileName) {
            zipfile.openReadStream(entry, (err: Error | null, readStream?: Readable) => {
              if (err || !readStream) return reject(err || new Error("Failed to open stream"));
              
              const chunks: Buffer[] = [];
              readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
              readStream.on("end", () => {
                try {
                  const schema = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
                  zipfile.close();
                  resolve(schema);
                } catch (parseErr) {
                  reject(parseErr);
                }
              });
              readStream.on("error", reject);
            });
          } else {
            zipfile.readEntry();
          }
        });
        
        zipfile.on("end", () => {
          if (optional) {
            resolve(null);
          } else {
            reject(new Error(`${fileName} not found in archive`));
          }
        });
        
        zipfile.on("error", reject);
      });
    });
  };

  // Helper to extract schema file path (strip URL fragment if present)
  const getSchemaPath = (datasetName: string): string | null => {
    const ds: any = (manifest as any).datasets?.[datasetName];
    if (!ds || !ds.schema) return null;
    const schema: string = ds.schema;
    return schema.includes('#') ? schema.split('#')[0] : schema;
  };

  const pagesSchemaPath = getSchemaPath("pages") || "schemas/pages.schema.json";
  const edgesSchemaPath = getSchemaPath("edges") || "schemas/edges.schema.json";
  const assetsSchemaPath = getSchemaPath("assets") || "schemas/assets.schema.json";
  const errorsSchemaPath = getSchemaPath("errors") || "schemas/errors.schema.json";
  const accessibilitySchemaPath = getSchemaPath("accessibility");

  const [pages, edges, assets, errors, accessibility] = await Promise.all([
    readSchema(pagesSchemaPath),
    readSchema(edgesSchemaPath),
    readSchema(assetsSchemaPath),
    readSchema(errorsSchemaPath),
    accessibilitySchemaPath ? readSchema(accessibilitySchemaPath, true) : Promise.resolve(null)
  ]);

  return { pages, edges, assets, errors, accessibility: accessibility || undefined, perf: undefined };
}

/**
 * Validate a staging directory
 */
export async function validateStaging(stagingDir: string): Promise<ValidationResult> {
  if (!fs.existsSync(stagingDir)) {
    return {
      pages: { count: 0, errors: 0 },
      edges: { count: 0, errors: 0 },
      assets: { count: 0, errors: 0 },
      errors: { count: 0, errors: 0 },
      status: "corrupt",
      message: `Directory not found: ${stagingDir}`
    };
  }

  const result: ValidationResult = {
    pages: { count: 0, errors: 0, sampleErrors: [] },
    edges: { count: 0, errors: 0, sampleErrors: [] },
    assets: { count: 0, errors: 0, sampleErrors: [] },
    errors: { count: 0, errors: 0, sampleErrors: [] },
    status: "clean"
  };

  try {
    // Read checkpoint state
    const state = readCheckpoint(stagingDir);
    if (!state) {
      result.status = "corrupt";
      result.message = "No state.json found in staging directory";
      return result;
    }

    // Validate part files exist and check for truncation
    const partDirs = ["pages", "edges", "assets", "errors"];
    let needsTruncate = false;

    for (const partDir of partDirs) {
      const dirPath = join(stagingDir, partDir);
      if (!fs.existsSync(dirPath)) {
        result.status = "corrupt";
        result.message = `Missing ${partDir} directory`;
        return result;
      }

      // Check all part files in directory
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".jsonl"));
      
      for (const file of files) {
        const filePath = join(dirPath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        
        // Count complete lines
        const lines = content.split("\n");
        const completeLines = lines.filter(line => {
          if (line.length === 0) return false;
          try {
            JSON.parse(line);
            return true;
          } catch {
            return false;
          }
        });

        // Check if last line is incomplete (doesn't end with newline or isn't valid JSON)
        if (content.length > 0 && !content.endsWith("\n")) {
          needsTruncate = true;
          result.status = "needs-truncate";
          if (!result.message) {
            result.message = `Incomplete line detected in ${partDir}/${file}`;
          }
        }

        // Update counts
        const key = partDir as keyof Pick<ValidationResult, "pages" | "edges" | "assets" | "errors">;
        result[key].count += completeLines.length;
      }
    }

    // Verify checkpoint counts match
    if (state.visitedCount !== result.pages.count) {
      result.status = "corrupt";
      result.message = `Checkpoint mismatch: state says ${state.visitedCount} pages but found ${result.pages.count}`;
    }

  } catch (error: any) {
    result.status = "corrupt";
    result.message = `Validation failed: ${error.message}`;
  }

  // Clean up sample errors arrays
  delete result.pages.sampleErrors;
  delete result.edges.sampleErrors;
  delete result.assets.sampleErrors;
  delete result.errors.sampleErrors;

  return result;
}
