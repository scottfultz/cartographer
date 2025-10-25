/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { compress, decompress } from "@mongodb-js/zstd";
import { readFile, writeFile } from "fs/promises";

/**
 * Compress a file using Zstandard
 */
export async function compressFile(inPath: string, outPath: string): Promise<void> {
  const input = await readFile(inPath);
  const compressed = await compress(input);
  await writeFile(outPath, compressed);
}

/**
 * Decompress a Zstandard file
 */
export async function decompressFile(inPath: string, outPath: string): Promise<void> {
  const input = await readFile(inPath);
  const decompressed = await decompress(input);
  await writeFile(outPath, decompressed);
}
