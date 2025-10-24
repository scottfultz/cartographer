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
test("export edges CSV", async () => {
    // Ensure example.atls exists
    assert.ok(existsSync("./tmp/example.atls"), "example.atls should exist from crawl test");
    // Remove old CSV if exists
    if (existsSync("./tmp/edges.csv")) {
        await rm("./tmp/edges.csv");
    }
    // Run export
    const cmd = "node dist/cli/index.js export --atls ./tmp/example.atls --report edges --out ./tmp/edges.csv";
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
    // Verify CSV exists
    assert.ok(existsSync("./tmp/edges.csv"), "edges.csv should exist");
    // Read CSV
    const csvContent = await readFile("./tmp/edges.csv", "utf-8");
    const lines = csvContent.trim().split("\n");
    assert.ok(lines.length >= 2, "Should have at least header + 1 data row");
    // Verify exact header order
    const expectedHeader = "sourceUrl,targetUrl,isExternal,anchorText,rel,nofollow,location,selectorHint,discoveredInMode";
    const actualHeader = lines[0];
    assert.strictEqual(actualHeader, expectedHeader, "Header should match expected order exactly");
    // Check for external link (iana.org for example.com)
    const hasExternalLink = lines.some(line => line.includes("iana.org") && line.includes("true"));
    assert.ok(hasExternalLink, "Should have at least one external link with isExternal=true");
    console.log(`✓ Exported ${lines.length - 1} edges with correct header order`);
    console.log(`✓ Found external link`);
});
//# sourceMappingURL=export-edges-csv.test.js.map