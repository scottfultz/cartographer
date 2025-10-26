/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { test } from "node:test";
import assert from "node:assert";
import { existsSync } from "fs";
import { readFile, rm } from "fs/promises";
import { execSync } from "child_process";
test("export pages CSV", async () => {
    // Ensure example.atls exists (from crawl test)
    assert.ok(existsSync("./tmp/example.atls"), "example.atls should exist from crawl test");
    // Remove old CSV if exists
    if (existsSync("./tmp/pages.csv")) {
        await rm("./tmp/pages.csv");
    }
    // Run export
    const cmd = "node dist/cli/index.js export --atls ./tmp/example.atls --report pages --out ./tmp/pages.csv";
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
    // Verify CSV exists
    assert.ok(existsSync("./tmp/pages.csv"), "pages.csv should exist");
    // Read CSV
    const csvContent = await readFile("./tmp/pages.csv", "utf-8");
    const lines = csvContent.trim().split("\n");
    assert.ok(lines.length >= 2, "Should have at least header + 1 data row");
    // Verify exact header order
    const expectedHeader = "url,finalUrl,normalizedUrl,statusCode,contentType,rawHtmlHash,domHash,renderMode,navEndReason,depth,discoveredFrom,section,title,metaDescription,h1,internalLinksCount,externalLinksCount,mediaAssetsCount,canonicalHref,canonicalResolved,noindexSurface,fetchMs,renderMs";
    const actualHeader = lines[0];
    assert.strictEqual(actualHeader, expectedHeader, "Header should match expected order exactly");
    // Parse all rows
    const rows = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        return {
            url: values[0],
            finalUrl: values[1],
            normalizedUrl: values[2],
            statusCode: values[3],
            contentType: values[4],
            rawHtmlHash: values[5],
            domHash: values[6],
            renderMode: values[7],
            navEndReason: values[8],
            depth: values[9],
            discoveredFrom: values[10],
            section: values[11],
            title: values[12],
            metaDescription: values[13],
            h1: values[14],
            internalLinksCount: values[15],
            externalLinksCount: values[16],
            mediaAssetsCount: values[17],
            canonicalHref: values[18],
            canonicalResolved: values[19],
            noindexSurface: values[20],
            fetchMs: values[21],
            renderMs: values[22]
        };
    });
    // Verify at least one page has externalLinksCount >= 1  
    const pageWithExternalLinks = rows.find(r => parseInt(r.externalLinksCount) >= 1);
    assert.ok(pageWithExternalLinks, "Should have at least one page with external links");
    // Verify rawHtmlHash and domHash are present
    const firstPage = rows[0];
    assert.ok(firstPage.rawHtmlHash && firstPage.rawHtmlHash.length > 0, "rawHtmlHash should be present");
    assert.ok(firstPage.domHash && firstPage.domHash.length > 0, "domHash should be present");
    console.log(`✓ Exported ${rows.length} pages with correct header order`);
    console.log(`✓ rawHtmlHash: ${firstPage.rawHtmlHash.substring(0, 16)}...`);
    console.log(`✓ domHash: ${firstPage.domHash.substring(0, 16)}...`);
    console.log(`✓ Found page with ${pageWithExternalLinks.externalLinksCount} external link(s)`);
});
/**
 * Simple CSV line parser (handles basic cases)
 */
function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
        }
        else {
            current += char;
        }
    }
    result.push(current);
    return result;
}
//# sourceMappingURL=export-pages-csv.test.js.map