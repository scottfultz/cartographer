/**
 * Copyright © 2025 Cai Frazier.
 * Versioned Dataset Writer
 * 
 * Writes Atlas v1.0 datasets with schema validation, versioning, compression,
 * and automatic part rotation.
 */

import { createWriteStream, WriteStream } from 'fs';
import { mkdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { z } from 'zod';

/**
 * Dataset metadata for manifest
 */
export interface DatasetMetadata {
  name: string;
  version: string;
  record_count: number;
  bytes_compressed: number;
  hash_sha256: string;
  schema_uri: string;
  parts: string[];
}

/**
 * Configuration for dataset writer
 */
export interface DatasetWriterConfig<T> {
  /** Dataset name (e.g., "pages") */
  name: string;
  
  /** Dataset version (e.g., "v1") */
  version: string;
  
  /** Schema URI for manifest (e.g., "schemas/pages.v1.schema.json") */
  schemaUri: string;
  
  /** Staging directory for output */
  stagingDir: string;
  
  /** Zod schema for validation */
  schema: z.ZodSchema<T>;
  
  /** Maximum uncompressed bytes per part (default: 150MB) */
  maxPartBytes?: number;
}

/**
 * Versioned dataset writer with schema validation
 * 
 * Writes JSONL datasets with:
 * - Schema validation using Zod
 * - Versioned filenames (e.g., pages.v1_part_001.jsonl.zst)
 * - Automatic part rotation at size threshold
 * - Zstandard compression
 * - SHA-256 integrity hashing
 */
export class DatasetWriter<T> {
  private config: DatasetWriterConfig<T>;
  private currentPart = 1;
  private stream: WriteStream | null = null;
  private recordCount = 0;
  private bytesUncompressed = 0;
  private parts: string[] = [];
  private dataDir: string;
  
  constructor(config: DatasetWriterConfig<T>) {
    this.config = {
      maxPartBytes: 150 * 1024 * 1024, // 150MB default
      ...config,
    };
    this.dataDir = join(this.config.stagingDir, 'data');
  }
  
  /**
   * Initialize writer and open first part
   */
  async init(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await this.openPart(1);
  }
  
  /**
   * Write a record to the dataset
   * 
   * @param record - Record to write (will be validated against schema)
   */
  async write(record: T): Promise<void> {
    // Validate against schema
    const validated = this.config.schema.parse(record);
    
    // Serialize to JSONL
    const line = JSON.stringify(validated) + '\n';
    const bytes = Buffer.byteLength(line, 'utf8');
    
    // Write to current part
    if (!this.stream) {
      throw new Error('DatasetWriter not initialized or already finalized');
    }
    
    this.stream.write(line);
    this.recordCount++;
    this.bytesUncompressed += bytes;
    
    // Check if we need to rotate to next part
    if (this.bytesUncompressed >= this.config.maxPartBytes!) {
      await this.closePart();
      await this.openPart(++this.currentPart);
    }
  }
  
  /**
   * Open a new part file
   */
  private async openPart(partNum: number): Promise<void> {
    const filename = this.getPartFilename(partNum);
    const filePath = join(this.dataDir, filename);
    
    this.stream = createWriteStream(filePath, { encoding: 'utf8' });
    this.parts.push(filePath);
    this.bytesUncompressed = 0;
  }
  
  /**
   * Close the current part
   */
  private async closePart(): Promise<void> {
    if (this.stream) {
      this.stream.end();
      await new Promise<void>((resolve, reject) => {
        this.stream!.once('finish', resolve);
        this.stream!.once('error', reject);
      });
      this.stream = null;
    }
  }
  
  /**
   * Generate part filename with version
   */
  private getPartFilename(partNum: number): string {
    const paddedNum = String(partNum).padStart(3, '0');
    return `${this.config.name}.${this.config.version}_part_${paddedNum}.jsonl`;
  }
  
  /**
   * Finalize dataset: compress parts, compute hash, return metadata
   */
  async finalize(): Promise<DatasetMetadata> {
    // Close current part if open
    await this.closePart();
    
    // Compress all parts and compute hashes
    const { compress } = await import('@mongodb-js/zstd');
    const { readFile, writeFile } = await import('fs/promises');
    
    const partHashes: string[] = [];
    const compressedParts: string[] = [];
    let totalBytesCompressed = 0;
    
    for (const partPath of this.parts) {
      // Read uncompressed JSONL
      const content = await readFile(partPath);
      
      // Compress with Zstandard
      const compressed = await compress(content);
      const compressedPath = `${partPath}.zst`;
      await writeFile(compressedPath, Buffer.from(compressed));
      
      // Compute hash of compressed part
      const hash = createHash('sha256').update(Buffer.from(compressed)).digest('hex');
      partHashes.push(hash);
      
      // Track compressed part
      compressedParts.push(compressedPath);
      const stats = await stat(compressedPath);
      totalBytesCompressed += stats.size;
      
      // Delete uncompressed JSONL
      await unlink(partPath);
    }
    
    // Compute dataset hash (hash of concatenated part hashes)
    const datasetHash = createHash('sha256')
      .update(partHashes.join(''))
      .digest('hex');
    
    // Convert absolute paths to relative paths for manifest
    const relativeParts = compressedParts.map(p => {
      const relative = p.replace(this.config.stagingDir + '/', '');
      return relative;
    });
    
    return {
      name: this.config.name,
      version: this.config.version,
      record_count: this.recordCount,
      bytes_compressed: totalBytesCompressed,
      hash_sha256: datasetHash,
      schema_uri: this.config.schemaUri,
      parts: relativeParts,
    };
  }
  
  /**
   * Get current record count
   */
  getRecordCount(): number {
    return this.recordCount;
  }
  
  /**
   * Get number of parts created so far
   */
  getPartCount(): number {
    return this.parts.length;
  }
}
