/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import * as fs from "fs";
import { join } from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { iterateParts, readManifest } from "../readers/atlsReader.js";
import { readCheckpoint } from "../../core/checkpoint.js";
import { open } from "yauzl";
/**
 * Validate an .atls archive
 */
export async function validateAtlas(atlsPath) {
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
    const result = {
        pages: { count: 0, errors: 0, sampleErrors: [] },
        edges: { count: 0, errors: 0, sampleErrors: [] },
        assets: { count: 0, errors: 0, sampleErrors: [] },
        errors: { count: 0, errors: 0, sampleErrors: [] },
        status: "clean"
    };
    try {
        // Read manifest to get schema info
        const manifest = await readManifest(atlsPath);
        // Load schemas from archive
        const schemas = await loadSchemas(atlsPath);
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
                    if (result.pages.sampleErrors.length < 10) {
                        result.pages.sampleErrors.push(`Page ${result.pages.count}: ${ajv.errorsText(validatePage.errors)}`);
                    }
                }
            }
            catch (error) {
                result.pages.errors++;
                if (result.pages.sampleErrors.length < 10) {
                    result.pages.sampleErrors.push(`Page ${result.pages.count}: ${error.message}`);
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
                    if (result.edges.sampleErrors.length < 10) {
                        result.edges.sampleErrors.push(`Edge ${result.edges.count}: ${ajv.errorsText(validateEdge.errors)}`);
                    }
                }
            }
            catch (error) {
                result.edges.errors++;
                if (result.edges.sampleErrors.length < 10) {
                    result.edges.sampleErrors.push(`Edge ${result.edges.count}: ${error.message}`);
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
                    if (result.assets.sampleErrors.length < 10) {
                        result.assets.sampleErrors.push(`Asset ${result.assets.count}: ${ajv.errorsText(validateAsset.errors)}`);
                    }
                }
            }
            catch (error) {
                result.assets.errors++;
                if (result.assets.sampleErrors.length < 10) {
                    result.assets.sampleErrors.push(`Asset ${result.assets.count}: ${error.message}`);
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
                    if (result.errors.sampleErrors.length < 10) {
                        result.errors.sampleErrors.push(`Error ${result.errors.count}: ${ajv.errorsText(validateError.errors)}`);
                    }
                }
            }
            catch (error) {
                result.errors.errors++;
                if (result.errors.sampleErrors.length < 10) {
                    result.errors.sampleErrors.push(`Error ${result.errors.count}: ${error.message}`);
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
                            if (result.accessibility.sampleErrors.length < 10) {
                                result.accessibility.sampleErrors.push(`Accessibility ${result.accessibility.count}: ${ajv.errorsText(validateAccessibility.errors)}`);
                            }
                        }
                    }
                    catch (error) {
                        result.accessibility.errors++;
                        if (result.accessibility.sampleErrors.length < 10) {
                            result.accessibility.sampleErrors.push(`Accessibility ${result.accessibility.count}: ${error.message}`);
                        }
                    }
                }
            }
            catch (error) {
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
        if (result.pages.errors === 0)
            delete result.pages.sampleErrors;
        if (result.edges.errors === 0)
            delete result.edges.sampleErrors;
        if (result.assets.errors === 0)
            delete result.assets.sampleErrors;
        if (result.errors.errors === 0)
            delete result.errors.sampleErrors;
        if (result.accessibility && result.accessibility.errors === 0)
            delete result.accessibility.sampleErrors;
    }
    catch (error) {
        result.status = "corrupt";
        result.message = `Validation failed: ${error.message}`;
    }
    return result;
}
/**
 * Load JSON schemas from .atls archive
 */
async function loadSchemas(atlsPath) {
    const readSchema = (fileName, optional = false) => {
        return new Promise((resolve, reject) => {
            open(atlsPath, { lazyEntries: true }, (err, zipfile) => {
                if (err || !zipfile)
                    return reject(err || new Error("Failed to open ZIP"));
                zipfile.readEntry();
                zipfile.on("entry", (entry) => {
                    if (entry.fileName === fileName) {
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err || !readStream)
                                return reject(err || new Error("Failed to open stream"));
                            const chunks = [];
                            readStream.on("data", (chunk) => chunks.push(chunk));
                            readStream.on("end", () => {
                                try {
                                    const schema = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
                                    zipfile.close();
                                    resolve(schema);
                                }
                                catch (parseErr) {
                                    reject(parseErr);
                                }
                            });
                            readStream.on("error", reject);
                        });
                    }
                    else {
                        zipfile.readEntry();
                    }
                });
                zipfile.on("end", () => {
                    if (optional) {
                        resolve(null);
                    }
                    else {
                        reject(new Error(`${fileName} not found in archive`));
                    }
                });
                zipfile.on("error", reject);
            });
        });
    };
    const [pages, edges, assets, errors, accessibility, perf] = await Promise.all([
        readSchema("schemas/pages.schema.json"),
        readSchema("schemas/edges.schema.json"),
        readSchema("schemas/assets.schema.json"),
        readSchema("schemas/errors.schema.json"),
        readSchema("schemas/accessibility.schema.json", true),
        readSchema("schemas/perf.schema.json", true)
    ]);
    return { pages, edges, assets, errors, accessibility: accessibility || undefined, perf: perf || undefined };
}
/**
 * Validate a staging directory
 */
export async function validateStaging(stagingDir) {
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
    const result = {
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
                    if (line.length === 0)
                        return false;
                    try {
                        JSON.parse(line);
                        return true;
                    }
                    catch {
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
                const key = partDir;
                result[key].count += completeLines.length;
            }
        }
        // Verify checkpoint counts match
        if (state.visitedCount !== result.pages.count) {
            result.status = "corrupt";
            result.message = `Checkpoint mismatch: state says ${state.visitedCount} pages but found ${result.pages.count}`;
        }
    }
    catch (error) {
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
//# sourceMappingURL=validator.js.map