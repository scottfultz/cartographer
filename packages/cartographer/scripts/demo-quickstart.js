#!/usr/bin/env node
/*
 * Copyright © 2025 Cai Frazier.
 * Quickstart Demo Script - Validates Cartographer Engine with fixture site
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { startFixtureServer } from '../test/helpers/fixtureServer.js';
import { startJob } from '../dist/core/startJob.js';
import { openAtlas } from '@atlas/sdk';
import { DEFAULT_CONFIG } from '../dist/core/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Expected results for validation
const EXPECTED = {
  pages: { min: 3, max: 4 }, // index, about, products (+ maybe favicon fetches)
  edges: { min: 4, max: 10 }, // Links between pages + assets
  assets: { min: 3, max: 8 }, // Images in img/
};

console.log('🚀 Cartographer Engine - 10-Minute Quickstart Demo\n');
console.log('This demo will:');
console.log('  1. Start a local HTTP server serving test fixtures');
console.log('  2. Crawl the fixture site in prerender mode');
console.log('  3. Validate the generated .atls archive');
console.log('  4. Display dataset counts and statistics\n');

// Ensure tmp directory exists
const tmpDir = join(projectRoot, 'tmp');
if (!existsSync(tmpDir)) {
  mkdirSync(tmpDir, { recursive: true });
}

// Output file
const outFile = join(tmpDir, 'demo-quickstart.atls');

// Clean up previous run
if (existsSync(outFile)) {
  console.log('🧹 Cleaning up previous demo output...');
  unlinkSync(outFile);
}

async function runDemo() {
  let fixtureServer = null;

  try {
    // Start fixture server
    console.log('🌐 Starting fixture server...');
    fixtureServer = await startFixtureServer('static-site');
    console.log(`   Server running at ${fixtureServer.url}\n`);

    console.log('📦 Starting crawl...\n');

    // Configure crawl
    const config = {
      ...DEFAULT_CONFIG,
      seeds: [fixtureServer.url + '/'],
      outAtls: outFile,
      render: {
        ...DEFAULT_CONFIG.render,
        mode: 'prerender',
        concurrency: 4
      },
      limits: {
        ...DEFAULT_CONFIG.limits,
        maxPages: 10,
        maxDepth: 2
      },
      http: {
        ...DEFAULT_CONFIG.http,
        rps: 10
      }
    };

    // Run the crawl
    await startJob(config);

    console.log('\n✅ Crawl completed successfully!\n');

    // Validate the archive
    if (!existsSync(outFile)) {
      console.error('❌ Output file not found:', outFile);
      process.exit(1);
    }

    console.log('📊 Validating archive...\n');

    // Open and read the archive
    const atlas = await openAtlas(outFile);

    // Count datasets
    const counts = {
      pages: 0,
      edges: 0,
      assets: 0,
      errors: 0
    };

    for await (const page of atlas.readers.pages()) {
      counts.pages++;
    }

    for await (const edge of atlas.readers.edges()) {
      counts.edges++;
    }

    for await (const asset of atlas.readers.assets()) {
      counts.assets++;
    }

    for await (const error of atlas.readers.errors()) {
      counts.errors++;
    }

    // Display results
    console.log('📈 Archive Statistics:');
    console.log(`   Pages:  ${counts.pages} (expected: ${EXPECTED.pages.min}-${EXPECTED.pages.max})`);
    console.log(`   Edges:  ${counts.edges} (expected: ${EXPECTED.edges.min}-${EXPECTED.edges.max})`);
    console.log(`   Assets: ${counts.assets} (expected: ${EXPECTED.assets.min}-${EXPECTED.assets.max})`);
    console.log(`   Errors: ${counts.errors}\n`);

    // Validate counts
    const validations = [
      { name: 'Pages', value: counts.pages, min: EXPECTED.pages.min, max: EXPECTED.pages.max },
      { name: 'Edges', value: counts.edges, min: EXPECTED.edges.min, max: EXPECTED.edges.max },
      { name: 'Assets', value: counts.assets, min: EXPECTED.assets.min, max: EXPECTED.assets.max }
    ];

    let allValid = true;
    for (const val of validations) {
      const valid = val.value >= val.min && val.value <= val.max;
      if (!valid) {
        console.error(`❌ ${val.name} count out of range: ${val.value} (expected: ${val.min}-${val.max})`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log('✅ All validations passed!');
      console.log(`\n🎉 Demo completed successfully! Archive: ${outFile}\n`);
      console.log('Next steps:');
      console.log('  • View archive: node dist/cli/index.js validate ' + outFile);
      console.log('  • Export CSV: node dist/cli/index.js export --atls ' + outFile + ' --report pages --out pages.csv');
      console.log('  • Read docs: https://github.com/scottfultz/cartographer#readme\n');
      
      // Clean up
      if (fixtureServer) await fixtureServer.close();
      process.exit(0);
    } else {
      console.error('\n❌ Validation failed - see errors above');
      if (fixtureServer) await fixtureServer.close();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
    
    // Clean up
    if (fixtureServer) {
      try {
        await fixtureServer.close();
      } catch (err) {
        console.error('Failed to close fixture server:', err);
      }
    }
    
    process.exit(1);
  }
}

// Run the demo
runDemo();
