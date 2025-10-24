/*
 * Atlas archive validator for Cartographer
 * Copyright © 2025 Cai Frazier
 */
import * as fs from 'fs';
import { join } from 'path';
import * as readline from 'readline';
export async function validateAtlas(atlsPath, opts) {
    const errors = [];
    const summary = {
        manifestPresent: false,
        incomplete: true,
        partCounts: {},
        manifestCounts: {},
        checkedFiles: [],
    };
    const manifestPath = join(atlsPath + '.staging', 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        errors.push('Manifest file missing');
        return { ok: false, errors, summary };
    }
    summary.manifestPresent = true;
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }
    catch (e) {
        errors.push('Manifest file unreadable or corrupt');
        return { ok: false, errors, summary };
    }
    summary.incomplete = !!manifest.incomplete;
    summary.manifestCounts = manifest.partCounts || {};
    // Check each part directory
    const parts = ['pages', 'edges', 'assets', 'errors', 'accessibility'];
    for (const part of parts) {
        const partDir = join(atlsPath + '.staging', part);
        if (!fs.existsSync(partDir)) {
            errors.push(`Missing part directory: ${part}`);
            continue;
        }
        let count = 0;
        for (const file of fs.readdirSync(partDir)) {
            if (file.endsWith('.jsonl') || file.endsWith('.zst')) {
                summary.checkedFiles.push(join(partDir, file));
                try {
                    const stat = fs.statSync(join(partDir, file));
                    if (stat.size === 0) {
                        errors.push(`Empty part file: ${file}`);
                        continue;
                    }
                    // Spot-check: try to read first line if .jsonl
                    if (file.endsWith('.jsonl')) {
                        const fd = fs.openSync(join(partDir, file), 'r');
                        const buf = Buffer.alloc(256);
                        const bytes = fs.readSync(fd, buf, 0, 256, 0);
                        fs.closeSync(fd);
                        if (bytes === 0)
                            errors.push(`Unreadable part file: ${file}`);
                    }
                }
                catch (e) {
                    errors.push(`Error reading part file: ${file}`);
                }
                count++;
            }
        }
        summary.partCounts[part] = count;
        if (manifest.partCounts && manifest.partCounts[part] !== count) {
            errors.push(`Part count mismatch for ${part}: manifest=${manifest.partCounts[part]} actual=${count}`);
        }
    }
    // Duplicate urlKey detection
    if (opts?.checkDuplicates) {
        const pagesDir = join(atlsPath + '.staging', 'pages');
        const urlKeyCounts = {};
        for (const file of fs.readdirSync(pagesDir)) {
            if (file.endsWith('.jsonl')) {
                const rl = readline.createInterface({ input: fs.createReadStream(join(pagesDir, file)) });
                for await (const line of rl) {
                    if (!line.trim())
                        continue;
                    try {
                        const obj = JSON.parse(line);
                        const key = obj.urlKey;
                        if (key)
                            urlKeyCounts[key] = (urlKeyCounts[key] || 0) + 1;
                    }
                    catch { }
                }
            }
        }
        const dups = Object.entries(urlKeyCounts).filter(([_, count]) => count > 1);
        if (dups.length) {
            errors.push(`Duplicate urlKeys detected: ${dups.slice(0, 5).map(([k, c]) => `${k} (x${c})`).join(', ')} ...`);
        }
    }
    // Health summary
    if (opts?.summary) {
        const health = {};
        // Use manifest summary if present
        if (manifest.summary) {
            health.errorsPerPage = (manifest.summary.errors ?? 0) / Math.max(1, manifest.summary.pages ?? 1);
            health.altCoverage = (manifest.summary.imagesWithAlt ?? 0) / Math.max(1, manifest.summary.images ?? 1);
            health.status2xx = manifest.summary.status2xx ?? 0;
            health.status3xx = manifest.summary.status3xx ?? 0;
            health.status4xx = manifest.summary.status4xx ?? 0;
            health.status5xx = manifest.summary.status5xx ?? 0;
        }
        summary.health = health;
    }
    return { ok: errors.length === 0, errors, summary };
}
//# sourceMappingURL=validate.js.map