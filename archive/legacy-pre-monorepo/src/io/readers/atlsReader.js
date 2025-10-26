/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { open } from "yauzl";
import { decompress } from "@mongodb-js/zstd";
/**
 * Read manifest.json from .atls archive
 */
export async function readManifest(atlsPath) {
    return new Promise((resolve, reject) => {
        open(atlsPath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile)
                return reject(err || new Error("Failed to open ZIP"));
            zipfile.readEntry();
            zipfile.on("entry", (entry) => {
                if (entry.fileName === "manifest.json") {
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err || !readStream)
                            return reject(err || new Error("Failed to open stream"));
                        const chunks = [];
                        readStream.on("data", (chunk) => chunks.push(chunk));
                        readStream.on("end", () => {
                            try {
                                const manifest = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
                                zipfile.close();
                                resolve(manifest);
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
                reject(new Error("manifest.json not found in archive"));
            });
            zipfile.on("error", reject);
        });
    });
}
/**
 * Iterate over all JSONL parts in a subdirectory
 * @param atlsPath Path to .atls archive
 * @param subdir One of: "pages", "edges", "assets", "errors", "accessibility"
 * @yields Individual JSONL lines (as strings)
 */
export async function* iterateParts(atlsPath, subdir) {
    // Collect all part files for this subdir
    const partFiles = await getPartFiles(atlsPath, subdir);
    // Sort lexicographically to ensure consistent order
    partFiles.sort();
    // Stream each part file
    for (const fileName of partFiles) {
        yield* iterateSinglePart(atlsPath, fileName);
    }
}
/**
 * Get list of part files for a specific subdirectory
 */
async function getPartFiles(atlsPath, subdir) {
    return new Promise((resolve, reject) => {
        const parts = [];
        open(atlsPath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile)
                return reject(err || new Error("Failed to open ZIP"));
            zipfile.readEntry();
            zipfile.on("entry", (entry) => {
                const prefix = `${subdir}/`;
                if (entry.fileName.startsWith(prefix) && entry.fileName.endsWith(".jsonl.zst")) {
                    parts.push(entry.fileName);
                }
                zipfile.readEntry();
            });
            zipfile.on("end", () => {
                zipfile.close();
                resolve(parts);
            });
            zipfile.on("error", reject);
        });
    });
}
/**
 * Stream lines from a single compressed part file
 */
async function* iterateSinglePart(atlsPath, fileName) {
    // Read compressed data from ZIP
    const compressedData = await readZipEntry(atlsPath, fileName);
    // Decompress with zstd
    const decompressed = await decompress(compressedData);
    const text = decompressed.toString("utf-8");
    // Split into lines and emit each non-empty line
    const lines = text.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
            yield trimmed;
        }
    }
}
/**
 * Read a single file entry from ZIP
 */
async function readZipEntry(atlsPath, fileName) {
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
                            zipfile.close();
                            resolve(Buffer.concat(chunks));
                        });
                        readStream.on("error", reject);
                    });
                }
                else {
                    zipfile.readEntry();
                }
            });
            zipfile.on("end", () => {
                reject(new Error(`Entry not found: ${fileName}`));
            });
            zipfile.on("error", reject);
        });
    });
}
//# sourceMappingURL=atlsReader.js.map