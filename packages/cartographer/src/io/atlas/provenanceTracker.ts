/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { ProvenanceRecordV1 } from '@atlas/spec';

/**
 * Producer information
 */
export interface Producer {
  app: string;
  version: string;
  module?: string;
}

/**
 * Input dataset reference
 */
export interface InputReference {
  dataset: string;
  hash_sha256: string;
}

/**
 * Output metadata
 */
export interface OutputMetadata {
  record_count: number;
  hash_sha256: string;
}

/**
 * Provenance Tracker
 * 
 * Tracks the lineage of each dataset: what produced it, from what inputs,
 * with what parameters, and when. Essential for reproducibility and auditing.
 * 
 * Each dataset gets a provenance record showing:
 * - Who produced it (app, version, module)
 * - When it was created
 * - What inputs were used (for derived datasets)
 * - What parameters were used
 * - Output metadata (record count, hash)
 */
export class ProvenanceTracker {
  private records: ProvenanceRecordV1[] = [];
  
  /**
   * Add a provenance record for a dataset
   */
  addDataset(
    datasetName: string,
    producer: Producer,
    inputs: InputReference[],
    parameters: Record<string, any>,
    output: OutputMetadata
  ): void {
    this.records.push({
      dataset_name: datasetName,
      producer,
      created_at: new Date().toISOString(),
      inputs,
      parameters,
      output
    });
  }
  
  /**
   * Add a provenance record for an initial extraction dataset
   * (no inputs, just raw extraction from crawl)
   */
  addExtraction(
    datasetName: string,
    module: string,
    version: string,
    parameters: Record<string, any>,
    output: OutputMetadata
  ): void {
    this.addDataset(
      datasetName,
      { app: 'cartographer', version, module },
      [], // No inputs for initial extraction
      parameters,
      output
    );
  }
  
  /**
   * Add a provenance record for a derived dataset
   * (created from processing other datasets)
   */
  addDerived(
    datasetName: string,
    module: string,
    version: string,
    inputs: InputReference[],
    parameters: Record<string, any>,
    output: OutputMetadata
  ): void {
    this.addDataset(
      datasetName,
      { app: 'cartographer', version, module },
      inputs,
      parameters,
      output
    );
  }
  
  /**
   * Get all provenance records
   */
  getRecords(): ProvenanceRecordV1[] {
    return this.records;
  }
  
  /**
   * Get provenance record for a specific dataset
   */
  getRecord(datasetName: string): ProvenanceRecordV1 | undefined {
    return this.records.find(r => r.dataset_name === datasetName);
  }
  
  /**
   * Get all datasets that were inputs to a specific dataset
   */
  getInputDatasets(datasetName: string): string[] {
    const record = this.getRecord(datasetName);
    return record ? record.inputs.map(i => i.dataset) : [];
  }
  
  /**
   * Get the full lineage chain for a dataset (recursive)
   */
  getLineage(datasetName: string): string[] {
    const lineage: string[] = [datasetName];
    const record = this.getRecord(datasetName);
    
    if (record && record.inputs.length > 0) {
      for (const input of record.inputs) {
        const inputLineage = this.getLineage(input.dataset);
        for (const ancestor of inputLineage) {
          if (!lineage.includes(ancestor)) {
            lineage.push(ancestor);
          }
        }
      }
    }
    
    return lineage;
  }
  
  /**
   * Get total number of records tracked
   */
  getRecordCount(): number {
    return this.records.length;
  }
  
  /**
   * Clear all records (for testing)
   */
  clear(): void {
    this.records = [];
  }
  
  /**
   * Write provenance records to archive as compressed JSONL
   * Atlas v1.0 Enhancement - Phase 3B
   */
  async writeToArchive(stagingDir: string): Promise<string> {
    const { writeFile, unlink } = await import('fs/promises');
    const { join } = await import('path');
    const { compressFile } = await import('./compressor.js');
    
    const provenancePath = join(stagingDir, 'provenance.v1.jsonl');
    const compressedPath = provenancePath + '.zst';
    
    // Write uncompressed JSONL
    const lines = this.records.map(record => JSON.stringify(record)).join('\n');
    await writeFile(provenancePath, lines + '\n', 'utf-8');
    
    // Compress with Zstandard
    await compressFile(provenancePath, compressedPath);
    
    // Delete uncompressed file
    await unlink(provenancePath);
    
    return compressedPath;
  }
}
