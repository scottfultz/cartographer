// Copyright © 2025 Cai Frazier.

import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

// Dynamic import for ES module
let openAtlas: any;

async function loadAtlasSDK() {
  // Use Function constructor to avoid TypeScript transformation
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const sdk = await dynamicImport('@atlas/sdk');
  openAtlas = sdk.openAtlas;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Continuum - SEO Analysis',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'default',
    show: false,
  });

  // Load the HTML file
  const rendererPath = path.join(__dirname, '../src/renderer/index.html');
  mainWindow.loadFile(rendererPath);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers

/**
 * Handle file import dialog
 */
ipcMain.handle('import-atlas', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Atlas Archives', extensions: ['atls'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    title: 'Select Atlas Archive',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'No file selected' };
  }

  const filePath = result.filePaths[0];

  try {
    // Open the Atlas archive
    const atlas = await openAtlas(filePath);

    // Extract manifest info
    const manifest = atlas.manifest;
    const datasets = [...atlas.datasets];

    return {
      success: true,
      data: {
        filePath,
        manifest: {
          owner: manifest.owner.name,
          atlasVersion: manifest.atlasVersion,
          formatVersion: manifest.formatVersion,
          createdAt: manifest.createdAt,
          generator: manifest.generator,
        },
        datasets,
      },
    };
  } catch (error) {
    console.error('Failed to open Atlas archive:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Load pages from Atlas archive
 */
ipcMain.handle('load-pages', async (_event: IpcMainInvokeEvent, filePath: string, limit = 100, offset = 0) => {
  try {
    const atlas = await openAtlas(filePath);
    const pages = [];

    let index = 0;
    for await (const page of atlas.readers.pages()) {
      // Skip to offset
      if (index < offset) {
        index++;
        continue;
      }

      // Stop at limit
      if (pages.length >= limit) {
        break;
      }

      pages.push({
        url: page.url,
        finalUrl: page.finalUrl,
        title: page.title,
        statusCode: page.statusCode,
        metaDescription: page.metaDescription,
        h1: page.h1,
        depth: page.depth,
        renderMs: page.renderMs,
        rawHtmlHash: page.rawHtmlHash,
        canonicalResolved: page.canonicalResolved,
        noindexSurface: page.noindexSurface,
        robotsMeta: page.robotsMeta,
        redirectChain: page.redirectChain,
        openGraph: page.openGraph,
        twitterCard: page.twitterCard,
      });

      index++;
    }

    // Get total count
    let totalCount = 0;
    for await (const _page of atlas.readers.pages()) {
      totalCount++;
    }

    return {
      success: true,
      data: {
        pages,
        totalCount,
        hasMore: totalCount > offset + pages.length,
      },
    };
  } catch (error) {
    console.error('Failed to load pages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Get page details
 */
ipcMain.handle('get-page-details', async (_event: IpcMainInvokeEvent, filePath: string, url: string) => {
  try {
    const atlas = await openAtlas(filePath);

    // Find the specific page
    for await (const page of atlas.readers.pages()) {
      if (page.url === url) {
        return {
          success: true,
          data: page,
        };
      }
    }

    return {
      success: false,
      error: 'Page not found',
    };
  } catch (error) {
    console.error('Failed to get page details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Get archive statistics
 */
ipcMain.handle('get-stats', async (_event: IpcMainInvokeEvent, filePath: string) => {
  try {
    const atlas = await openAtlas(filePath);

    // Count all datasets
    const stats = {
      pages: 0,
      edges: 0,
      assets: 0,
      errors: 0,
      accessibility: 0,
    };

    for await (const _page of atlas.readers.pages()) {
      stats.pages++;
    }

    if (atlas.datasets.has('edges')) {
      for await (const _edge of atlas.readers.edges()) {
        stats.edges++;
      }
    }

    if (atlas.datasets.has('assets')) {
      for await (const _asset of atlas.readers.assets()) {
        stats.assets++;
      }
    }

    if (atlas.datasets.has('errors')) {
      for await (const _error of atlas.readers.errors()) {
        stats.errors++;
      }
    }

    if (atlas.datasets.has('accessibility')) {
      for await (const _a11y of atlas.readers.accessibility()) {
        stats.accessibility++;
      }
    }

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error('Failed to get stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Load accessibility records
 */
ipcMain.handle('load-accessibility', async (_event: IpcMainInvokeEvent, filePath: string, limit = 200) => {
  try {
    const atlas = await openAtlas(filePath);
    
    if (!atlas.datasets.has('accessibility')) {
      return {
        success: true,
        data: { records: [] },
      };
    }

    const records = [];
    for await (const a11y of atlas.readers.accessibility()) {
      if (records.length >= limit) break;
      records.push({
        pageUrl: a11y.pageUrl,
        url: a11y.pageUrl, // Add alias for compatibility
        missingAltCount: a11y.missingAltCount || 0,
        missingAltSources: a11y.missingAltSources || [],
        headingOrder: a11y.headingOrder || [],
        landmarks: a11y.landmarks || {},
        roles: a11y.roles || {},
        lang: a11y.lang,
        formControls: a11y.formControls,
        focusOrder: a11y.focusOrder,
        contrastViolations: a11y.contrastViolations || [],
        ariaIssues: a11y.ariaIssues || [],
        wcagData: a11y.wcagData,
      });
    }

    return {
      success: true,
      data: { records },
    };
  } catch (error) {
    console.error('Failed to load accessibility data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Load error records
 */
ipcMain.handle('load-errors', async (_event: IpcMainInvokeEvent, filePath: string) => {
  try {
    const atlas = await openAtlas(filePath);
    
    if (!atlas.datasets.has('errors')) {
      return {
        success: true,
        data: { errors: [] },
      };
    }

    const errors = [];
    for await (const error of atlas.readers.errors()) {
      errors.push({
        url: error.url,
        type: error.type,
        message: error.message,
        timestamp: error.timestamp,
        statusCode: error.statusCode,
      });
    }

    return {
      success: true,
      data: { errors },
    };
  } catch (error) {
    console.error('Failed to load errors:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// App lifecycle

app.whenReady().then(async () => {
  // Load Atlas SDK before creating window
  await loadAtlasSDK();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
