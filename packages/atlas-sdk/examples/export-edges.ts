/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Example: Export edges (links) from an Atlas archive to CSV
 * 
 * This example demonstrates how to:
 * - Iterate through edges (links between pages)
 * - Build a link graph
 * - Export to CSV format
 * - Calculate link statistics
 * 
 * Usage:
 *   npx tsx examples/export-edges.ts <path-to.atls> [output.csv]
 */

import { openAtlas } from "../src/index.js";
import { writeFileSync } from "node:fs";

async function main() {
  const atlsPath = process.argv[2];
  const outputPath = process.argv[3] || "edges-export.csv";
  
  if (!atlsPath) {
    console.error("Usage: npx tsx examples/export-edges.ts <path-to.atls> [output.csv]");
    process.exit(1);
  }
  
  console.log(`Opening: ${atlsPath}\n`);
  
  // Open the archive
  const atlas = await openAtlas(atlsPath);
  
  console.log("Archive Information:");
  console.log("===================");
  console.log(`Atlas Version:   ${atlas.manifest.atlasVersion}`);
  console.log(`Owner:           ${atlas.manifest.owner.name}`);
  
  if (atlas.summary) {
    console.log(`Total Edges:     ${atlas.summary.stats.totalEdges}`);
  }
  
  console.log("\nExporting edges to CSV...\n");
  
  // CSV header
  const csvRows: string[] = [
    "source_url,target_url,anchor_text,location,link_type"
  ];
  
  let edgeCount = 0;
  const locationCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  
  // Iterate through all edges
  for await (const edge of atlas.readers.edges()) {
    edgeCount++;
    
    // Track statistics
    locationCounts[edge.location] = (locationCounts[edge.location] || 0) + 1;
    const linkType = edge.isExternal ? "external" : "internal";
    typeCounts[linkType] = (typeCounts[linkType] || 0) + 1;
    
    // Escape CSV fields (handle commas and quotes)
    const escapeCSV = (str: string | undefined): string => {
      if (!str) return "";
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    // Build CSV row
    const row = [
      escapeCSV(edge.sourceUrl),
      escapeCSV(edge.targetUrl),
      escapeCSV(edge.anchorText),
      escapeCSV(edge.location),
      linkType
    ].join(",");
    
    csvRows.push(row);
    
    // Show progress
    if (edgeCount % 1000 === 0) {
      console.log(`  Processed ${edgeCount.toLocaleString()} edges...`);
    }
  }
  
  // Write CSV file
  const csvContent = csvRows.join("\n");
  writeFileSync(outputPath, csvContent, "utf-8");
  
  console.log(`\n✅ Exported ${edgeCount.toLocaleString()} edges to: ${outputPath}`);
  
  // Display statistics
  console.log("\nEdge Statistics:");
  console.log("================");
  console.log(`Total Edges:     ${edgeCount.toLocaleString()}`);
  console.log(`File Size:       ${(csvContent.length / 1024).toFixed(2)} KB`);
  
  console.log("\nLink Types:");
  Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      const pct = ((count / edgeCount) * 100).toFixed(1);
      console.log(`  ${type.padEnd(10)}: ${count.toLocaleString().padStart(8)} (${pct}%)`);
    });
  
  console.log("\nLink Locations:");
  Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([location, count]) => {
      const pct = ((count / edgeCount) * 100).toFixed(1);
      console.log(`  ${location.padEnd(10)}: ${count.toLocaleString().padStart(8)} (${pct}%)`);
    });
  
  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
