#!/usr/bin/env node
// Copyright © 2025 Cai Frazier.
// Audit consistency of Atlas definitions across touchpoints: engine-embedded schemas, atlas-spec generated schemas, and archive manifest.
// Usage: node scripts/audit-atlas-definitions.mjs <archive.atls>

import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');

async function loadJSON(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

function extractPropsFromSpec(specSchema) {
  // pages.v1 schema has { $ref: '#/definitions/pages.v1', definitions: { 'pages.v1': { properties: {..} } } }
  const def = specSchema.definitions?.['pages.v1'];
  const props = def?.properties ? Object.keys(def.properties) : [];
  return { $schema: specSchema.$schema, $ref: specSchema.$ref, props };
}

function extractPropsFromEngine(engineSchema) {
  const props = engineSchema.properties ? Object.keys(engineSchema.properties) : [];
  return { $schema: engineSchema.$schema, $id: engineSchema.$id, props };
}

function diffKeys(a, b) {
  const onlyA = a.filter(k => !b.includes(k));
  const onlyB = b.filter(k => !a.includes(k));
  const common = a.filter(k => b.includes(k));
  return { onlyA, onlyB, commonCount: common.length };
}

function unzipPathEntry(archivePath, entryPath) {
  const proc = spawnSync('unzip', ['-p', archivePath, entryPath], { encoding: 'utf8' });
  if (proc.status !== 0) return null;
  return proc.stdout;
}

async function main() {
  const archivePath = process.argv[2];

  const enginePagesPath = path.join(repoRoot, 'packages', 'cartographer', 'src', 'io', 'atlas', 'schemas', 'pages.schema.json');
  const specPagesPath = path.join(repoRoot, 'packages', 'atlas-spec', 'dist', 'schemas', 'pages.v1.schema.json');

  const enginePages = await loadJSON(enginePagesPath);
  const specPages = await loadJSON(specPagesPath);

  const engineInfo = extractPropsFromEngine(enginePages);
  const specInfo = extractPropsFromSpec(specPages);

  const keyDiff = diffKeys(engineInfo.props, specInfo.props);

  const output = {
    repoRoot,
    engineSchemas: {
      pages: {
        path: enginePagesPath,
        $id: engineInfo.$id,
        $schema: engineInfo.$schema,
        propertyCount: engineInfo.props.length
      }
    },
    specSchemas: {
      pagesV1: {
        path: specPagesPath,
        $ref: specInfo.$ref,
        $schema: specInfo.$schema,
        propertyCount: specInfo.props.length
      }
    },
    propertyDiff_pages_vs_pagesV1: keyDiff,
  };

  if (archivePath) {
    const manifestStr = unzipPathEntry(archivePath, 'manifest.json');
    const pagesSchemaStr = unzipPathEntry(archivePath, 'schemas/pages.schema.json');
    if (manifestStr) {
      try {
        const manifest = JSON.parse(manifestStr);
        output.archive = {
          path: archivePath,
          manifestSchemas: manifest.schemas,
          partsIndex: manifest.parts_index?.map(p => ({ name: p.name, schemaRef: p.schemaRef })),
        };
      } catch {}
    }
    if (pagesSchemaStr) {
      try {
        const embedded = JSON.parse(pagesSchemaStr);
        output.archive = output.archive || { path: archivePath };
        output.archive.embeddedPagesSchema = { $id: embedded.$id, $schema: embedded.$schema, propertyCount: Object.keys(embedded.properties || {}).length };
      } catch {}
    }
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
