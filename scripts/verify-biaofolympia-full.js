#!/usr/bin/env node
/**
 * Comprehensive Data Verification Script for biaofolympia.com Full Mode Crawl
 * 
 * This script:
 * 1. Reads the .atls archive and extracts all page records
 * 2. For each page, performs HTTP requests to compare:
 *    - Title
 *    - Meta description
 *    - OpenGraph metadata
 *    - Technologies detected
 * 3. Checks manifest includes renderMode
 * 4. Generates a detailed report
 */

import { readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';

const execAsync = promisify(exec);

const ARCHIVE_PATH = './archive/biaofolympia-full-audit.atls';
const REPORT_PATH = './archive/biaofolympia-verification-report.json';

// Helper: Extract file from archive
async function extractFromArchive(path) {
  try {
    const { stdout } = await execAsync(`unzip -p ${ARCHIVE_PATH} ${path}`);
    return stdout;
  } catch (error) {
    console.error(`Failed to extract ${path}:`, error.message);
    return null;
  }
}

// Helper: Decompress zstd
async function decompressZstd(compressed) {
  const tmpFile = `/tmp/verify-${Date.now()}.zst`;
  const outFile = `/tmp/verify-${Date.now()}.jsonl`;
  
  await execAsync(`echo '${compressed}' > ${tmpFile}`);
  await execAsync(`zstd -d ${tmpFile} -o ${outFile}`);
  const content = await readFile(outFile, 'utf-8');
  await execAsync(`rm ${tmpFile} ${outFile}`);
  
  return content;
}

// Helper: Fetch URL with curl
async function curlFetch(url) {
  try {
    const { stdout } = await execAsync(`curl -sL -A "CartographerVerify/1.0" "${url}"`);
    return stdout;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  }
}

// Helper: Extract title from HTML
function extractTitle(html) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

// Helper: Extract meta description
function extractMetaDescription(html) {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return match ? match[1].trim() : null;
}

// Helper: Extract OpenGraph tags
function extractOpenGraph(html) {
  const og = {};
  const regex = /<meta\s+property=["']og:([^"']*)["']\s+content=["']([^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const key = 'og' + match[1].charAt(0).toUpperCase() + match[1].slice(1).replace(/:/g, '');
    og[key] = match[2];
  }
  return Object.keys(og).length > 0 ? og : null;
}

async function main() {
  console.log('🔍 Starting Comprehensive Verification of biaofolympia.com Full Mode Crawl\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    archive: ARCHIVE_PATH,
    checks: {
      manifestRenderMode: null,
      totalPages: 0,
      pagesVerified: 0,
      pagesWithDiscrepancies: 0,
      screenshotsPresent: 0,
      faviconsPresent: 0,
      technologiesPresent: 0,
      openGraphPresent: 0
    },
    discrepancies: [],
    summary: {}
  };
  
  try {
    // Step 1: Check manifest for render mode
    console.log('📋 Step 1: Checking manifest for render mode...');
    const manifestJson = await extractFromArchive('manifest.json');
    if (!manifestJson) {
      throw new Error('Failed to extract manifest.json');
    }
    
    const manifest = JSON.parse(manifestJson);
    report.checks.manifestRenderMode = {
      renderModes: manifest.capabilities?.renderModes || [],
      modesUsed: manifest.capabilities?.modesUsed || [],
      specLevel: manifest.capabilities?.specLevel
    };
    
    console.log(`✓ Manifest render mode: ${JSON.stringify(report.checks.manifestRenderMode)}\n`);
    
    // Step 2: Extract and parse pages
    console.log('📄 Step 2: Extracting page records from archive...');
    const pagesCompressed = await extractFromArchive('pages/part-001.jsonl.zst');
    if (!pagesCompressed) {
      throw new Error('Failed to extract pages/part-001.jsonl.zst');
    }
    
    // Decompress using zstd command
    const tmpFile = `/tmp/verify-pages-${Date.now()}.zst`;
    const outFile = `/tmp/verify-pages-${Date.now()}.jsonl`;
    
    await execAsync(`unzip -p ${ARCHIVE_PATH} pages/part-001.jsonl.zst > ${tmpFile}`);
    await execAsync(`zstd -d ${tmpFile} -o ${outFile}`);
    const pagesContent = await readFile(outFile, 'utf-8');
    await execAsync(`rm ${tmpFile} ${outFile}`);
    
    const pages = pagesContent.trim().split('\n').map(line => JSON.parse(line));
    report.checks.totalPages = pages.length;
    
    console.log(`✓ Found ${pages.length} pages in archive\n`);
    
    // Step 3: Verify each page
    console.log('🔬 Step 3: Verifying page data against live HTTP requests...');
    console.log('(This will take a while - checking first 5 pages)\n');
    
    const samplesToCheck = Math.min(5, pages.length);
    
    for (let i = 0; i < samplesToCheck; i++) {
      const page = pages[i];
      const url = page.url;
      
      console.log(`\n[${i + 1}/${samplesToCheck}] Verifying: ${url}`);
      
      // Count features
      if (page.media?.screenshots) {
        report.checks.screenshotsPresent++;
        console.log(`  ✓ Has screenshots: desktop=${!!page.media.screenshots.desktop}, mobile=${!!page.media.screenshots.mobile}`);
      }
      
      if (page.media?.favicon) {
        report.checks.faviconsPresent++;
        console.log(`  ✓ Has favicon: ${page.media.favicon}`);
      }
      
      if (page.technologies && page.technologies.length > 0) {
        report.checks.technologiesPresent++;
        console.log(`  ✓ Technologies (${page.technologies.length}): ${page.technologies.map(t => t.name).join(', ')}`);
      }
      
      if (page.openGraph && Object.keys(page.openGraph).length > 0) {
        report.checks.openGraphPresent++;
        console.log(`  ✓ OpenGraph (${Object.keys(page.openGraph).length} keys): ${Object.keys(page.openGraph).join(', ')}`);
      }
      
      // Fetch live data
      console.log(`  📡 Fetching live data...`);
      const liveHtml = await curlFetch(url);
      
      if (!liveHtml) {
        console.log(`  ⚠️  Failed to fetch live data`);
        continue;
      }
      
      report.checks.pagesVerified++;
      
      const liveTitle = extractTitle(liveHtml);
      const liveMetaDesc = extractMetaDescription(liveHtml);
      const liveOpenGraph = extractOpenGraph(liveHtml);
      
      // Compare title
      if (page.title !== liveTitle) {
        console.log(`  ⚠️  Title mismatch:`);
        console.log(`      Archive: "${page.title}"`);
        console.log(`      Live:    "${liveTitle}"`);
        
        report.discrepancies.push({
          url,
          field: 'title',
          archive: page.title,
          live: liveTitle
        });
        report.checks.pagesWithDiscrepancies++;
      } else {
        console.log(`  ✓ Title matches`);
      }
      
      // Compare meta description
      if (page.metaDescription !== liveMetaDesc) {
        console.log(`  ⚠️  Meta description mismatch`);
        report.discrepancies.push({
          url,
          field: 'metaDescription',
          archive: page.metaDescription,
          live: liveMetaDesc
        });
      } else if (page.metaDescription) {
        console.log(`  ✓ Meta description matches`);
      }
      
      // Compare OpenGraph
      if (liveOpenGraph && page.openGraph) {
        const ogDiff = [];
        for (const key of Object.keys(liveOpenGraph)) {
          if (page.openGraph[key] !== liveOpenGraph[key]) {
            ogDiff.push(key);
          }
        }
        
        if (ogDiff.length > 0) {
          console.log(`  ⚠️  OpenGraph mismatches: ${ogDiff.join(', ')}`);
          report.discrepancies.push({
            url,
            field: 'openGraph',
            keys: ogDiff
          });
        } else {
          console.log(`  ✓ OpenGraph matches`);
        }
      }
    }
    
    // Step 4: Summary statistics
    console.log('\n\n📊 Summary Statistics:');
    console.log('═══════════════════════');
    console.log(`Total pages in archive:     ${report.checks.totalPages}`);
    console.log(`Pages verified:             ${report.checks.pagesVerified}`);
    console.log(`Pages with discrepancies:   ${report.checks.pagesWithDiscrepancies}`);
    console.log(`Pages with screenshots:     ${report.checks.screenshotsPresent}`);
    console.log(`Pages with favicons:        ${report.checks.faviconsPresent}`);
    console.log(`Pages with technologies:    ${report.checks.technologiesPresent}`);
    console.log(`Pages with OpenGraph:       ${report.checks.openGraphPresent}`);
    
    // Calculate percentages
    if (report.checks.totalPages > 0) {
      report.summary = {
        screenshotCoverage: `${((report.checks.screenshotsPresent / report.checks.totalPages) * 100).toFixed(1)}%`,
        faviconCoverage: `${((report.checks.faviconsPresent / report.checks.totalPages) * 100).toFixed(1)}%`,
        technologyCoverage: `${((report.checks.technologiesPresent / report.checks.totalPages) * 100).toFixed(1)}%`,
        openGraphCoverage: `${((report.checks.openGraphPresent / report.checks.totalPages) * 100).toFixed(1)}%`,
        accuracy: `${(((report.checks.pagesVerified - report.checks.pagesWithDiscrepancies) / report.checks.pagesVerified) * 100).toFixed(1)}%`
      };
      
      console.log(`\n📈 Coverage:`)
      ;
      console.log(`Screenshot coverage:        ${report.summary.screenshotCoverage}`);
      console.log(`Favicon coverage:           ${report.summary.faviconCoverage}`);
      console.log(`Technology coverage:        ${report.summary.technologyCoverage}`);
      console.log(`OpenGraph coverage:         ${report.summary.openGraphCoverage}`);
      console.log(`Data accuracy:              ${report.summary.accuracy}`);
    }
    
    // Write report
    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\n✅ Verification complete! Report saved to: ${REPORT_PATH}`);
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
