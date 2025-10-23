/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { createWriteStream } from "fs";
import { format } from "@fast-csv/format";
import { iterateParts } from "../readers/atlsReader.js";
/**
 * Fixed-order field mappings for each report type
 */
const FIELD_MAPS = {
    pages: [
        "url", "finalUrl", "normalizedUrl", "statusCode", "contentType",
        "rawHtmlHash", "domHash", "renderMode", "navEndReason", "depth",
        "discoveredFrom", "section", "title", "metaDescription", "h1",
        "internalLinksCount", "externalLinksCount", "mediaAssetsCount",
        "canonicalHref", "canonicalResolved", "noindexSurface", "fetchMs", "renderMs"
    ],
    edges: [
        "sourceUrl", "targetUrl", "isExternal", "anchorText", "rel",
        "nofollow", "location", "selectorHint", "discoveredInMode"
    ],
    assets: [
        "pageUrl", "src", "type", "alt", "hasAlt",
        "naturalWidth", "naturalHeight", "displayWidth", "displayHeight",
        "loadingAttr", "wasLazyLoaded", "visible", "inViewport"
    ],
    errors: [
        "url", "origin", "hostname", "phase", "code",
        "message", "occurredAt"
    ]
};
/**
 * Export CSV from an .atls archive
 */
export async function exportCsv(options) {
    // Log to stderr to avoid mixing with CSV stdout
    const logToStderr = (level, msg) => {
        console.error(`[${level.toUpperCase()}] ${msg}`);
    };
    logToStderr("info", `Exporting ${options.report} from ${options.atlsPath}...`);
    const fields = FIELD_MAPS[options.report];
    // Create CSV stream with fixed headers
    const csvStream = format({
        headers: fields,
        writeHeaders: true,
        includeEndRowDelimiter: true
    });
    // Pipe to output
    if (options.outPath) {
        const output = createWriteStream(options.outPath);
        csvStream.pipe(output);
    }
    else {
        csvStream.pipe(process.stdout);
    }
    let count = 0;
    try {
        // Stream JSONL lines from compressed parts
        for await (const line of iterateParts(options.atlsPath, options.report)) {
            const record = JSON.parse(line);
            // Map record to CSV row with fixed field order
            const row = mapRecordToRow(record, options.report);
            csvStream.write(row);
            count++;
        }
        csvStream.end();
        // Wait for stream to finish
        await new Promise((resolve, reject) => {
            csvStream.on("finish", resolve);
            csvStream.on("error", reject);
        });
        // If no records were written, fast-csv won't have written headers
        // Write them manually for header-only files
        if (count === 0 && options.outPath) {
            const output = createWriteStream(options.outPath);
            output.write(fields.join(",") + "\n");
            output.end();
            await new Promise((resolve) => output.on("finish", () => resolve()));
        }
        logToStderr("info", `Export complete: ${count} records`);
    }
    catch (error) {
        csvStream.end();
        logToStderr("error", `Export failed: ${error}`);
        process.exit(1);
    }
}
/**
 * Map a JSONL record to a CSV row array with fixed field order
 */
function mapRecordToRow(record, report) {
    const fields = FIELD_MAPS[report];
    return fields.map(field => {
        // Handle nested fields for assets
        if (report === "assets" && field !== "pageUrl") {
            return record[field] ?? "";
        }
        // Get value from record, return empty string if missing
        const value = record[field];
        // Handle null/undefined
        if (value == null)
            return "";
        // Convert objects/arrays to JSON strings
        if (typeof value === "object")
            return JSON.stringify(value);
        return value;
    });
}
//# sourceMappingURL=exportCsv.js.map