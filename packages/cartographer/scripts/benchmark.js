#!/usr/bin/env node

/**
 * Reproducible Performance Benchmark
 * 
 * Measures crawl performance on a fixed test site to provide
 * comparable metrics across different environments.
 * 
 * Usage:
 *   node scripts/benchmark.js [--pages=1000] [--seeds=https://example.com]
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

// Parse CLI args
const args = process.argv.slice(2);
const maxPages = args.find(a => a.startsWith('--pages='))?.split('=')[1] || '100';
const seeds = args.find(a => a.startsWith('--seeds='))?.split('=')[1] || 'http://example.com';
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'prerender';

const outputDir = './tmp/benchmarks';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const benchmarkId = `bench_${timestamp}`;
const atlasFile = join(outputDir, `${benchmarkId}.atls`);
const reportFile = join(outputDir, `${benchmarkId}_report.json`);
const logFile = join(outputDir, `${benchmarkId}.jsonl`);

console.log('🏃 Cartographer Performance Benchmark');
console.log('='.repeat(60));
console.log(`Seeds:       ${seeds}`);
console.log(`Max Pages:   ${maxPages}`);
console.log(`Mode:        ${mode}`);
console.log(`Benchmark:   ${benchmarkId}`);
console.log('='.repeat(60) + '\n');

// Create output directory
mkdirSync(outputDir, { recursive: true });

// System info
const systemInfo = {
  platform: os.platform(),
  arch: os.arch(),
  cpus: os.cpus().length,
  cpuModel: os.cpus()[0]?.model || 'unknown',
  totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
  nodeVersion: process.version,
  hostname: os.hostname()
};

console.log('📊 System Information:');
console.log(`  Platform:  ${systemInfo.platform} ${systemInfo.arch}`);
console.log(`  CPU:       ${systemInfo.cpuModel} (${systemInfo.cpus} cores)`);
console.log(`  Memory:    ${systemInfo.totalMemory}`);
console.log(`  Node.js:   ${systemInfo.nodeVersion}`);
console.log(`  Hostname:  ${systemInfo.hostname}\n`);

const startTime = Date.now();

// Run crawl
const crawlProcess = spawn('node', [
  'dist/cli/index.js',
  'crawl',
  '--seeds', seeds,
  '--out', atlasFile,
  '--mode', mode,
  '--maxPages', maxPages,
  '--logFile', logFile,
  '--json',
  '--quiet'
], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env }
});

let jsonOutput = '';
let stderrOutput = '';

crawlProcess.stdout.on('data', (data) => {
  jsonOutput += data.toString();
  process.stdout.write(data);
});

crawlProcess.stderr.on('data', (data) => {
  stderrOutput += data.toString();
  process.stderr.write(data);
});

crawlProcess.on('close', (code) => {
  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Benchmark Complete');
  console.log('='.repeat(60));
  
  // Parse JSON output from crawl
  let crawlSummary = {};
  try {
    // Extract JSON from output (may have other log lines)
    const jsonMatch = jsonOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      crawlSummary = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.warn('Warning: Could not parse JSON summary from crawl output');
  }
  
  // Read log file to count events
  let logEventCount = 0;
  if (existsSync(logFile)) {
    const logContent = readFileSync(logFile, 'utf-8');
    logEventCount = logContent.split('\n').filter(line => line.trim()).length;
  }
  
  const pagesProcessed = crawlSummary.pagesProcessed || 0;
  const pagesPerSecond = pagesProcessed > 0 ? (pagesProcessed / (durationMs / 1000)).toFixed(2) : '0';
  
  const benchmark = {
    benchmarkId,
    timestamp: new Date().toISOString(),
    config: {
      seeds,
      maxPages: parseInt(maxPages),
      mode
    },
    system: systemInfo,
    results: {
      durationMs,
      durationSec: parseFloat(durationSec),
      pagesProcessed,
      pagesPerSecond: parseFloat(pagesPerSecond),
      exitCode: code,
      ...crawlSummary
    },
    logs: {
      logFile,
      eventCount: logEventCount
    },
    files: {
      atlas: atlasFile,
      report: reportFile
    }
  };
  
  // Write report
  writeFileSync(reportFile, JSON.stringify(benchmark, null, 2));
  
  console.log(`Duration:         ${durationSec}s`);
  console.log(`Pages Processed:  ${pagesProcessed}`);
  console.log(`Pages/Second:     ${pagesPerSecond}`);
  console.log(`Exit Code:        ${code}`);
  console.log(`Atlas File:       ${atlasFile}`);
  console.log(`Report:           ${reportFile}`);
  console.log(`Log Events:       ${logEventCount}`);
  console.log('='.repeat(60));
  
  // Generate summary for CI
  if (process.env.GITHUB_ACTIONS) {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      const markdown = `
## 🏃 Performance Benchmark Results

| Metric | Value |
|--------|-------|
| **Duration** | ${durationSec}s |
| **Pages Processed** | ${pagesProcessed} |
| **Pages/Second** | ${pagesPerSecond} |
| **Mode** | ${mode} |
| **System** | ${systemInfo.cpuModel} (${systemInfo.cpus} cores) |
| **Node.js** | ${systemInfo.nodeVersion} |
| **Exit Code** | ${code === 0 ? '✅' : '❌'} ${code} |

[Download Benchmark Report](../artifacts/${benchmarkId}_report.json)
`;
      try {
        writeFileSync(summaryPath, markdown, { flag: 'a' });
      } catch (err) {
        console.warn('Could not write to GITHUB_STEP_SUMMARY');
      }
    }
  }
  
  process.exit(code || 0);
});
