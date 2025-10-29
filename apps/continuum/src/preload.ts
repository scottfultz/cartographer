// Copyright © 2025 Cai Frazier.

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Exposes safe IPC API to renderer
 */

export interface AtlasAPI {
  importAtlas: () => Promise<{
    success: boolean;
    data?: {
      filePath: string;
      manifest: {
        owner: string;
        atlasVersion: string;
        formatVersion: string;
        createdAt: string;
        generator: string;
      };
      datasets: string[];
    };
    error?: string;
  }>;
  
  loadPages: (filePath: string, limit?: number, offset?: number) => Promise<{
    success: boolean;
    data?: {
      pages: Array<{
        url: string;
        title?: string;
        statusCode: number;
        metaDescription?: string;
        h1?: string;
        depth: number;
        renderMs?: number;
        rawHtmlHash: string;
      }>;
      totalCount: number;
      hasMore: boolean;
    };
    error?: string;
  }>;
  
  getPageDetails: (filePath: string, url: string) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;
  
  getStats: (filePath: string) => Promise<{
    success: boolean;
    data?: {
      pages: number;
      edges: number;
      assets: number;
      errors: number;
      accessibility: number;
    };
    error?: string;
  }>;

  loadAccessibility: (filePath: string, limit?: number) => Promise<{
    success: boolean;
    data?: {
      records: Array<{
        url: string;
        missingAltCount: number;
        missingAltSources: string[];
        wcagViolations: any[];
        colorContrastIssues: number;
      }>;
    };
    error?: string;
  }>;

  loadErrors: (filePath: string) => Promise<{
    success: boolean;
    data?: {
      errors: Array<{
        url: string;
        type: string;
        message: string;
        timestamp: string;
        statusCode?: number;
      }>;
    };
    error?: string;
  }>;
}

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('atlasAPI', {
  importAtlas: () => ipcRenderer.invoke('import-atlas'),
  loadPages: (filePath: string, limit?: number, offset?: number) =>
    ipcRenderer.invoke('load-pages', filePath, limit, offset),
  getPageDetails: (filePath: string, url: string) =>
    ipcRenderer.invoke('get-page-details', filePath, url),
  getStats: (filePath: string) =>
    ipcRenderer.invoke('get-stats', filePath),
  loadAccessibility: (filePath: string, limit?: number) =>
    ipcRenderer.invoke('load-accessibility', filePath, limit),
  loadErrors: (filePath: string) =>
    ipcRenderer.invoke('load-errors', filePath),
} as AtlasAPI);

// Type declaration for window.atlasAPI
declare global {
  interface Window {
    atlasAPI: AtlasAPI;
  }
}
