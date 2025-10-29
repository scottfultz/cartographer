#!/usr/bin/env node
/*
 * Copyright © 2025 Cai Frazier.
 */

import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverScript = path.join(rootDir, 'tools', 'labyrinth-server.mjs');
const cliEntry = path.join(rootDir, 'packages', 'cartographer', 'dist', 'cli', 'index.js');
const tmpDir = path.join(rootDir, 'tmp');
const outputAtls = path.join(tmpDir, 'labyrinth-stress-smoke.atls');

const port = Number(process.env.LABYRINTH_PORT ?? 31337);
const maxPages = Number(process.env.LABYRINTH_MAX_PAGES ?? 50000);
const slowDelayMs = Number(process.env.LABYRINTH_SLOW_DELAY_MS ?? 10_000);
const crawlMaxPages = Number(process.env.LABYRINTH_CRAWL_MAX_PAGES ?? 5000);
const concurrency = Number(process.env.LABYRINTH_CRAWL_CONCURRENCY ?? 16);

async function ensureBuildReady() {
  try {
    await access(cliEntry);
  } catch (err) {
    const error = new Error('Cartographer CLI build not found. Run "pnpm build --filter=@cf/cartographer" before launching the stress harness.');
    error.cause = err;
    throw error;
  }
}

async function prepareOutputDir() {
  await mkdir(tmpDir, { recursive: true });
}

function startServer() {
  const serverEnv = {
    ...process.env,
    LABYRINTH_PORT: String(port),
    LABYRINTH_MAX_PAGES: String(maxPages),
    LABYRINTH_SLOW_DELAY_MS: String(slowDelayMs)
  };

  const child = spawn(process.execPath, [serverScript], {
    cwd: rootDir,
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'inherit']
  });

  child.stdout.setEncoding('utf8');

  const readiness = new Promise((resolve, reject) => {
    let ready = false;

    const onData = (chunk) => {
      process.stdout.write(`[labyrinth-server] ${chunk}`);
      if (!ready && chunk.includes('Server running')) {
        ready = true;
        resolve(undefined);
      }
    };

    child.stdout.on('data', onData);
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (!ready) {
        reject(new Error(`Labyrinth server exited before readiness (code=${code ?? 'null'}, signal=${signal ?? 'null'})`));
      }
    });
  });

  const exited = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      resolve({ code, signal });
    });
  });

  return { child, readiness, exited };
}

async function runCrawl() {
  const args = [
    cliEntry,
    'crawl',
    '--seeds',
    `http://localhost:${port}/`,
    '--out',
    outputAtls,
    '--mode',
    'prerender',
    '--maxPages',
    String(crawlMaxPages),
    '--concurrency',
    String(concurrency),
    '--maxErrors',
    '750'
  ];

  console.log('[labyrinth-stress] Launching crawl with settings:', {
    port,
    crawlMaxPages,
    concurrency,
    outputAtls
  });

  const child = spawn(process.execPath, args, {
    cwd: rootDir,
    stdio: ['ignore', 'inherit', 'inherit']
  });

  const exitCode = await new Promise((resolve) => {
    child.once('exit', (code) => {
      resolve(code ?? 0);
    });
  });

  if (exitCode !== 0) {
    throw new Error(`Cartographer crawl exited with code ${exitCode}`);
  }
}

async function main() {
  await ensureBuildReady();
  await prepareOutputDir();

  console.log('[labyrinth-stress] Starting procedural server...');
  const { child: serverProcess, readiness, exited } = startServer();

  const shutdownServer = () => {
    if (!serverProcess.killed) {
      serverProcess.kill('SIGINT');
    }
  };

  process.on('SIGINT', () => {
    shutdownServer();
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    shutdownServer();
    process.exit(1);
  });

  try {
    await readiness;

    console.log('[labyrinth-stress] Server ready. Reminder: monitor CPU, memory, and disk IO while this runs.');
    console.log('  - macOS: open "Activity Monitor" or run "top" in another terminal.');
    console.log('  - Linux: use "htop" and "iotop" for resource profiles.');

    await runCrawl();
    console.log(`[labyrinth-stress] Crawl complete. Archive written to ${outputAtls}`);
  } finally {
    shutdownServer();
    await exited;
  }
}

main().catch((err) => {
  console.error('[labyrinth-stress] Failed:', err);
  process.exit(1);
});
