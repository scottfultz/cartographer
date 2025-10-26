/**
 * Copyright © 2025 Cai Frazier.
 * Content-Addressed Blob Storage
 * 
 * Stores HTML bodies and other large content with SHA-256 content addressing,
 * Zstandard compression, and automatic deduplication.
 */

import { writeFile, mkdir, readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { compress, decompress } from '@mongodb-js/zstd';

export interface BlobStorageConfig {
  /** Base directory for blob storage (e.g., "staging/blobs") */
  blobsDir: string;
  
  /** Storage format (only "individual" supported in Phase 2) */
  format: 'individual' | 'packed';
  
  /** Enable content-based deduplication (default: true) */
  deduplication: boolean;
}

export interface BlobStoreResult {
  /** SHA-256 hash of the content */
  hash: string;
  
  /** Blob reference path (e.g., "sha256/ab/cd/abcd...ef") */
  blob_ref: string;
  
  /** Whether this blob was deduplicated (already existed) */
  deduplicated: boolean;
  
  /** Size of compressed blob in bytes */
  size_compressed: number;
}

export interface BlobStorageStats {
  /** Total number of unique blobs stored */
  totalBlobs: number;
  
  /** Total compressed bytes across all blobs */
  totalBytesCompressed: number;
  
  /** Deduplication rate (0.0 to 1.0) */
  deduplicationRate: number;
  
  /** Number of deduplication hits */
  deduplicationHits: number;
  
  /** Total store operations attempted */
  totalStoreOperations: number;
}

/**
 * Content-addressed blob storage with SHA-256 hashing and deduplication
 */
export class BlobStorage {
  private config: BlobStorageConfig;
  private knownBlobs = new Set<string>(); // SHA-256 hashes of stored blobs
  private stats: BlobStorageStats = {
    totalBlobs: 0,
    totalBytesCompressed: 0,
    deduplicationRate: 0,
    deduplicationHits: 0,
    totalStoreOperations: 0,
  };
  
  constructor(config: BlobStorageConfig) {
    this.config = config;
  }
  
  /**
   * Initialize blob storage directory structure
   */
  async init(): Promise<void> {
    // Create base blobs directory
    await mkdir(this.config.blobsDir, { recursive: true });
    
    // Create SHA-256 directory
    const sha256Dir = join(this.config.blobsDir, 'sha256');
    await mkdir(sha256Dir, { recursive: true });
  }
  
  /**
   * Store content with content addressing and deduplication
   * 
   * @param content - Content to store (string or Buffer)
   * @returns Blob storage result with hash, reference, and deduplication status
   */
  async store(content: string | Buffer): Promise<BlobStoreResult> {
    this.stats.totalStoreOperations++;
    
    // Convert to Buffer if string
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    
    // Compute SHA-256 hash
    const hash = createHash('sha256').update(buffer).digest('hex');
    
    // Generate blob reference path
    const blobRef = this.getBlobPath(hash);
    const fullPath = join(this.config.blobsDir, `${blobRef}.zst`);
    
    // Check if already stored (deduplication)
    if (this.config.deduplication && this.knownBlobs.has(hash)) {
      this.stats.deduplicationHits++;
      this.updateDeduplicationRate();
      
      // Get size from existing file
      const stats = await stat(fullPath);
      
      return {
        hash,
        blob_ref: blobRef,
        deduplicated: true,
        size_compressed: stats.size,
      };
    }
    
    // Compress with Zstandard
    const compressed = await compress(buffer);
    const compressedBuffer = Buffer.from(compressed);
    
    // Determine storage path: sha256/ab/cd/abcd1234...ef.zst
    const first = hash.substring(0, 2);
    const second = hash.substring(2, 4);
    const dir = join(this.config.blobsDir, 'sha256', first, second);
    await mkdir(dir, { recursive: true });
    
    // Write compressed blob
    await writeFile(fullPath, compressedBuffer);
    
    // Track for deduplication
    this.knownBlobs.add(hash);
    this.stats.totalBlobs++;
    this.stats.totalBytesCompressed += compressedBuffer.length;
    this.updateDeduplicationRate();
    
    return {
      hash,
      blob_ref: blobRef,
      deduplicated: false,
      size_compressed: compressedBuffer.length,
    };
  }
  
  /**
   * Load blob by reference
   * 
   * @param blobRef - Blob reference path (e.g., "sha256/ab/cd/abcd...")
   * @returns Decompressed content as Buffer
   */
  async load(blobRef: string): Promise<Buffer> {
    const fullPath = join(this.config.blobsDir, `${blobRef}.zst`);
    
    if (!existsSync(fullPath)) {
      throw new Error(`Blob not found: ${blobRef}`);
    }
    
    const compressed = await readFile(fullPath);
    const decompressed = await decompress(compressed);
    return Buffer.from(decompressed);
  }
  
  /**
   * Get blob reference path for a hash
   * 
   * @param hash - SHA-256 hash (64 hex chars)
   * @returns Blob reference path (e.g., "sha256/ab/cd/abcd...")
   */
  private getBlobPath(hash: string): string {
    const first = hash.substring(0, 2);
    const second = hash.substring(2, 4);
    return `sha256/${first}/${second}/${hash}`;
  }
  
  /**
   * Update deduplication rate
   */
  private updateDeduplicationRate(): void {
    if (this.stats.totalStoreOperations === 0) {
      this.stats.deduplicationRate = 0;
    } else {
      this.stats.deduplicationRate = 
        this.stats.deduplicationHits / this.stats.totalStoreOperations;
    }
  }
  
  /**
   * Get storage statistics
   */
  getStats(): BlobStorageStats {
    return { ...this.stats };
  }
  
  /**
   * Check if a blob exists by hash
   */
  has(hash: string): boolean {
    return this.knownBlobs.has(hash);
  }
}
