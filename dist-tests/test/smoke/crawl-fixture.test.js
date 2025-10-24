/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { test } from "node:test";
import assert from "node:assert";
import { existsSync } from "fs";
import { mkdir, rm } from "fs/promises";
import { execSync } from "child_process";
import { open } from "yauzl";
import { readManifest, iterateParts } from "../../src/io/readers/atlsReader.js";
test("crawl small site", async () => {
    // Ensure tmp directory exists
    await mkdir("./tmp", { recursive: true });
    // Remove old test file if exists
    if (existsSync("./tmp/example.atls")) {
        await rm("./tmp/example.atls");
    }
    // Run crawl on example.com (simple, stable site)
    const cmd = `node dist/cli/index.js crawl --seeds https://example.com --out ./tmp/example.atls --mode prerender --maxPages 2`;
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
    // Verify .atls file exists
    assert.ok(existsSync("./tmp/example.atls"), ".atls file should exist");
    // Verify it's a valid ZIP
    await new Promise((resolve, reject) => {
        open("./tmp/example.atls", { lazyEntries: true }, (err, zipfile) => {
            if (err)
                return reject(err);
            zipfile.close();
            resolve();
        });
    });
    // Verify manifest.json exists and has correct structure
    const manifest = await readManifest("./tmp/example.atls");
    assert.strictEqual(manifest.atlasVersion, "1.0", "Atlas version should be 1.0");
    assert.strictEqual(manifest.owner.name, "Cai Frazier", "Owner name should be Cai Frazier");
    assert.ok(Array.isArray(manifest.consumers), "Consumers should be an array");
    assert.ok(manifest.consumers.length > 0, "Consumers should not be empty");
    assert.ok(manifest.hashing.urlKeyAlgo, "URL key algorithm should be present");
    // Verify parts exist
    assert.ok(manifest.parts.pages.length > 0, "Should have pages parts");
    assert.ok(manifest.parts.edges.length > 0, "Should have edges parts");
    // Verify schemas are referenced
    assert.ok(manifest.schemas.pages, "Pages schema should be referenced");
    assert.ok(manifest.schemas.edges, "Edges schema should be referenced");
    assert.ok(manifest.schemas.assets, "Assets schema should be referenced");
    assert.ok(manifest.schemas.errors, "Errors schema should be referenced");
    // Read first PageRecord
    let pageCount = 0;
    for await (const line of iterateParts("./tmp/example.atls", "pages")) {
        if (pageCount >= 1)
            break;
        const page = JSON.parse(line);
        // Verify required fields
        assert.ok(page.rawHtmlHash, "rawHtmlHash should be present");
        assert.ok(page.rawHtmlHash.length > 0, "rawHtmlHash should not be empty");
        assert.ok(page.domHash, "domHash should be present");
        assert.ok(page.domHash.length > 0, "domHash should not be empty");
        assert.strictEqual(page.renderMode, "prerender", "renderMode should be prerender");
        pageCount++;
    }
    assert.ok(pageCount >= 1, "Should have at least 1 page");
    // Verify summary has sensible counts
    const summaryData = await readZipEntry("./tmp/example.atls", "summary.json");
    const summary = JSON.parse(summaryData.toString("utf-8"));
    assert.ok(summary.totalPages >= 1, `Should have at least 1 page (got ${summary.totalPages})`);
    assert.ok(summary.totalEdges >= 1, `Should have at least 1 edge (got ${summary.totalEdges})`);
    console.log(`✓ Crawl produced: ${summary.totalPages} pages, ${summary.totalEdges} edges, ${summary.totalAssets} assets`);
});
/**
 * Helper to read a file from ZIP
 */
async function readZipEntry(atlsPath, fileName) {
    return new Promise((resolve, reject) => {
        open(atlsPath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile)
                return reject(err || new Error("Failed to open ZIP"));
            zipfile.readEntry();
            zipfile.on("entry", (entry) => {
                if (entry.fileName === fileName) {
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err || !readStream)
                            return reject(err || new Error("Failed to open stream"));
                        const chunks = [];
                        readStream.on("data", (chunk) => chunks.push(chunk));
                        readStream.on("end", () => {
                            zipfile.close();
                            resolve(Buffer.concat(chunks));
                        });
                        readStream.on("error", reject);
                    });
                }
                else {
                    zipfile.readEntry();
                }
            });
            zipfile.on("end", () => {
                reject(new Error(`Entry not found: ${fileName}`));
            });
            zipfile.on("error", reject);
        });
    });
}
//# sourceMappingURL=crawl-fixture.test.js.map