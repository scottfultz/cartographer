// Copyright © 2025 Cai Frazier.

/**
 * Type declarations for renderer process
 */

import type { AtlasAPI } from '../preload';

declare global {
  interface Window {
    atlasAPI: AtlasAPI;
  }
}

export {};
