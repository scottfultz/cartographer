// Copyright © 2025 Cai Frazier.
import { contextBridge, ipcRenderer } from 'electron';
// Expose protected methods to renderer
contextBridge.exposeInMainWorld('atlasAPI', {
    importAtlas: () => ipcRenderer.invoke('import-atlas'),
    loadPages: (filePath, limit, offset) => ipcRenderer.invoke('load-pages', filePath, limit, offset),
    getPageDetails: (filePath, url) => ipcRenderer.invoke('get-page-details', filePath, url),
    getStats: (filePath) => ipcRenderer.invoke('get-stats', filePath),
    loadAccessibility: (filePath, limit) => ipcRenderer.invoke('load-accessibility', filePath, limit),
    loadErrors: (filePath) => ipcRenderer.invoke('load-errors', filePath),
});
//# sourceMappingURL=preload.js.map