/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { open, Entry, ZipFile } from "yauzl";
import { Readable } from "stream";
import { decompress } from "@mongodb-js/zstd";
import type { DatasetName } from "./types.js";

/**
 * Iterate over all JSONL records in a subdir (pages, edges, etc)
 */
export async function* iterateParts(
  atlsPath: string,
  subdir: DatasetName
): AsyncIterable<string> {
  const partFiles = await getPartFiles(atlsPath, subdir);
  for (const partFile of partFiles) {
    yield* streamPartFile(atlsPath, partFile);
  }
}

/**
 * Read manifest.json from .atls archive
 */
export async function readManifest(atlsPath: string): Promise<any> {
  return readJsonFile(atlsPath, "manifest.json");
}

/**
 * Read summary.json from .atls archive
 */
export async function readSummary(atlsPath: string): Promise<any> {
  return readJsonFile(atlsPath, "summary.json");
}

/**
 * Read a JSON file from the archive
 */
async function readJsonFile(atlsPath: string, fileName: string): Promise<any> {
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
                const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
                zipfile.close();
                resolve(data);
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
        reject(new Error(`${fileName} not found in archive`));
      });
      
      zipfile.on("error", reject);
    });
  });
}

/**
 * Stream JSONL lines from a compressed part file
 */
async function* streamPartFile(atlsPath: string, fileName: string): AsyncIterable<string> {
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
function readPartFile(atlsPath: string, fileName: string): Promise<Buffer> {
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
async function getPartFiles(atlsPath: string, subdir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const parts: string[] = [];
    
    open(atlsPath, { lazyEntries: true }, (err: Error | null, zipfile?: ZipFile) => {
      if (err || !zipfile) return reject(err || new Error("Failed to open ZIP"));
      
      zipfile.readEntry();
      
      zipfile.on("entry", (entry: Entry) => {
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
export async function* iterateDataset(
  atlsPath: string,
  dataset: DatasetName
): AsyncIterable<string> {
  const partFiles = await getPartFiles(atlsPath, dataset);
  
  for (const partFile of partFiles) {
    yield* streamPartFile(atlsPath, partFile);
  }
}
