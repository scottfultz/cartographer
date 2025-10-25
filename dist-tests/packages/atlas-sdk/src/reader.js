/**
 * Iterate over all JSONL records in a subdir (pages, edges, etc)
 */
export async function* iterateParts(atlsPath, subdir) {
    const partFiles = await getPartFiles(atlsPath, subdir);
    for (const partFile of partFiles) {
        yield* streamPartFile(atlsPath, partFile);
    }
}
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
    return readJsonFile(atlsPath, "manifest.json");
}
/**
 * Read summary.json from .atls archive
 */
export async function readSummary(atlsPath) {
    return readJsonFile(atlsPath, "summary.json");
}
/**
 * Read a JSON file from the archive
 */
async function readJsonFile(atlsPath, fileName) {
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
                                const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
                                zipfile.close();
                                resolve(data);
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
                reject(new Error(`${fileName} not found in archive`));
            });
            zipfile.on("error", reject);
        });
    });
}
/**
 * Stream JSONL lines from a compressed part file
 */
async function* streamPartFile(atlsPath, fileName) {
    const buffer = await readPartFile(atlsPath, fileName);
    const decompressed = await decompress(buffer);
    const text = Buffer.from(decompressed).toString("utf-8");
    const lines = text.split("\n").filter(line => line.trim().length > 0);
    for (const line of lines) {
        yield line;
    }
}
/**
 * Read a part file as buffer
 */
function readPartFile(atlsPath, fileName) {
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
                reject(new Error(`${fileName} not found in archive`));
            });
            zipfile.on("error", reject);
        });
    });
}
/**
 * Get list of part files for a dataset
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
                resolve(parts.sort());
            });
            zipfile.on("error", reject);
        });
    });
}
/**
 * Iterate over all records in a dataset
 */
export async function* iterateDataset(atlsPath, dataset) {
    const partFiles = await getPartFiles(atlsPath, dataset);
    for (const partFile of partFiles) {
        yield* streamPartFile(atlsPath, partFile);
    }
}
//# sourceMappingURL=reader.js.map