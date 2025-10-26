/**
 * Copyright © 2025 Cai Frazier.
 * JSON Schema Generator
 * 
 * Converts Zod schemas to JSON Schema format for validation and documentation.
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as schemas from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SchemaMapping {
  name: string;
  schema: any;
}

const schemaMap: SchemaMapping[] = [
  { name: 'manifest.v1', schema: schemas.AtlasManifestV1Schema },
  { name: 'capabilities.v1', schema: schemas.AtlasCapabilitiesV1Schema },
  { name: 'provenance.v1', schema: schemas.ProvenanceRecordV1Schema },
  { name: 'pages.v1', schema: schemas.PageRecordV1Schema },
  { name: 'responses.v1', schema: schemas.ResponseRecordV1Schema },
  { name: 'resources.v1', schema: schemas.ResourceRecordV1Schema },
  { name: 'dom_snapshot.v1', schema: schemas.DOMSnapshotRecordV1Schema },
  { name: 'acc_tree.v1', schema: schemas.AccTreeRecordV1Schema },
  { name: 'render.v1', schema: schemas.RenderRecordV1Schema },
  { name: 'links.v1', schema: schemas.LinkRecordV1Schema },
  { name: 'sitemaps.v1', schema: schemas.SitemapRecordV1Schema },
  { name: 'robots.v1', schema: schemas.RobotsRecordV1Schema },
  { name: 'seo_signals.v1', schema: schemas.SEOSignalsRecordV1Schema },
  { name: 'audit_results.v1', schema: schemas.AuditResultRecordV1Schema },
];

/**
 * Generate JSON Schema files from Zod schemas
 */
export async function generateJSONSchemas(): Promise<void> {
  const outputDir = join(__dirname, '../../dist/schemas');
  
  // Create output directory
  mkdirSync(outputDir, { recursive: true });
  
  console.log('Generating JSON Schemas...\n');
  
  for (const { name, schema } of schemaMap) {
    try {
      const jsonSchema = zodToJsonSchema(schema, {
        name,
        $refStrategy: 'none', // Inline all references
      });
      
      const outputPath = join(outputDir, `${name}.schema.json`);
      writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));
      
      console.log(`✓ Generated: ${name}.schema.json`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error);
      process.exit(1);
    }
  }
  
  console.log(`\nSuccessfully generated ${schemaMap.length} JSON Schemas`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateJSONSchemas().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
