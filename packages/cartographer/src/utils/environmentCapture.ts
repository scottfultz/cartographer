/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EngineConfig } from '../core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ProducerMetadata {
  name: string;
  version: string;
  build: string;
  git_hash?: string;
  command_line?: string;
}

export interface EnvironmentSnapshot {
  // Device & Platform
  device: "desktop" | "mobile";
  viewport: {
    width: number;
    height: number;
  };
  user_agent: string;
  
  // Localization
  locale: string;
  timezone: string;
  accept_language: string;
  
  // Performance Profiles
  cpu_throttling?: number;
  network_profile?: {
    name: string;
    download_kbps: number;
    upload_kbps: number;
    latency_ms: number;
  };
  
  // Privacy & Compliance
  consent_state?: {
    cookies_enabled: boolean;
    do_not_track: boolean;
    gdpr_mode?: boolean;
  };
  
  // Browser Details
  browser: {
    name: string;
    version: string;
    headless: boolean;
  };
  
  // Platform
  platform: {
    os: string;
    arch: string;
    node_version: string;
  };
}

/**
 * Capture producer metadata (version, build, git hash)
 */
export function captureProducerMetadata(commandLineArgs?: string[]): ProducerMetadata {
  // Read package.json for version
  let version = '1.0.0-beta.1';
  try {
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    version = packageJson.version;
  } catch (e) {
    // Fallback to hardcoded version
  }
  
  // Generate build timestamp
  const build = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13); // YYYYMMDDHHmm
  
  // Try to get git hash
  let git_hash: string | undefined;
  try {
    const fullHash = execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    git_hash = fullHash.substring(0, 8); // Short hash
  } catch (e) {
    // Git not available or not in a repository
  }
  
  // Capture command line (redact sensitive info)
  let command_line: string | undefined;
  if (commandLineArgs && commandLineArgs.length > 0) {
    command_line = `cartographer ${commandLineArgs.join(' ')}`;
  } else if (process.argv.length > 2) {
    // Remove node and script path, keep only arguments
    const args = process.argv.slice(2);
    command_line = `cartographer ${args.join(' ')}`;
  }
  
  return {
    name: 'cartographer-engine',
    version,
    build,
    git_hash,
    command_line
  };
}

/**
 * Capture complete environment snapshot for reproducibility
 */
export function captureEnvironmentSnapshot(config: EngineConfig): EnvironmentSnapshot {
  // Determine device type based on render mode or config
  // For now, default to desktop unless we add mobile emulation config
  const device: "desktop" | "mobile" = "desktop";
  
  // Default viewport (desktop)
  const viewport = {
    width: 1280,
    height: 720
  };
  
  // User agent from config
  const user_agent = config.http.userAgent;
  
  // Localization (defaults for now - could be made configurable)
  const locale = process.env.LANG?.split('.')[0]?.replace('_', '-') || 'en-US';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const accept_language = 'en-US,en;q=0.9';
  
  // Browser details (Playwright/Chromium)
  const browser = {
    name: 'chromium',
    version: 'latest', // Could be extracted from Playwright version
    headless: config.render.mode !== 'raw'
  };
  
  // Platform details
  const platform = {
    os: process.platform,
    arch: process.arch,
    node_version: process.version
  };
  
  // Cookies enabled (default true unless we implement cookie blocking)
  const consent_state = {
    cookies_enabled: true,
    do_not_track: false,
    gdpr_mode: false
  };
  
  return {
    device,
    viewport,
    user_agent,
    locale,
    timezone,
    accept_language,
    browser,
    platform,
    consent_state
  };
}
