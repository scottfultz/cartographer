#!/usr/bin/env node

/**
 * Test Counter and Reporter
 * 
 * Counts total tests in the test suite and generates a JSON report
 * for CI artifacts and badge generation.
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const outputDir = './tmp/test-reports';
const outputFile = join(outputDir, 'test-count.json');

console.log('📊 Counting tests in the suite...\n');

// Run test with --test-name-pattern to list all tests
const testProcess = spawn('node', [
  '--test',
  '--test-reporter=tap',
  ...process.argv.slice(2) // Pass through any additional args (test file patterns)
], {
  env: { ...process.env, NODE_OPTIONS: '--no-warnings' },
  shell: true
});

let output = '';
let passCount = 0;
let failCount = 0;
let skipCount = 0;
let totalCount = 0;
const testNames = [];

testProcess.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(data); // Stream output to console
});

testProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

testProcess.on('close', (code) => {
  // Parse TAP output
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (line.match(/^ok \d+/)) {
      passCount++;
      totalCount++;
      // Extract test name
      const match = line.match(/^ok \d+ (.+)/);
      if (match) {
        testNames.push({ name: match[1], status: 'pass' });
      }
    } else if (line.match(/^not ok \d+/)) {
      failCount++;
      totalCount++;
      const match = line.match(/^not ok \d+ (.+)/);
      if (match) {
        testNames.push({ name: match[1], status: 'fail' });
      }
    } else if (line.includes('# skip') || line.includes('# todo')) {
      skipCount++;
    }
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalCount,
      passed: passCount,
      failed: failCount,
      skipped: skipCount,
      passRate: totalCount > 0 ? ((passCount / totalCount) * 100).toFixed(1) + '%' : '0%'
    },
    tests: testNames,
    exitCode: code
  };
  
  // Create output directory
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
  
  // Write report
  writeFileSync(outputFile, JSON.stringify(report, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests:  ${totalCount}`);
  console.log(`✅ Passed:    ${passCount}`);
  console.log(`❌ Failed:    ${failCount}`);
  console.log(`⏭️  Skipped:   ${skipCount}`);
  console.log(`Pass Rate:    ${report.summary.passRate}`);
  console.log('='.repeat(60));
  console.log(`\n📄 Report saved to: ${outputFile}`);
  
  process.exit(code || 0);
});
