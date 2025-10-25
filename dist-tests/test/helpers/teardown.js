import { after } from 'node:test';
import { closeBrowser } from '../../src/core/renderer.js';
// If AtlasWriter exposes a closeAll, import and use it here
// import { AtlasWriter } from '../../src/io/atlas/writer.js';
after(async () => {
    try {
        await closeBrowser();
    }
    catch { }
    // Remove all event handlers for known event types
    // No generic off-all; rely on test isolation and browser close
    // clean tmp artifacts so resume doesn’t stick around
    try {
        (await import('node:fs/promises')).rm('tmp', { recursive: true, force: true });
    }
    catch { }
    // If AtlasWriter.closeAll exists:
    // try { await AtlasWriter.closeAll?.(); } catch {}
});
//# sourceMappingURL=teardown.js.map