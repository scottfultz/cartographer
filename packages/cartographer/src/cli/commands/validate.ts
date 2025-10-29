/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { CommandModule } from "yargs";
import { z } from "zod";
import { validateAtlas, validateStaging } from "../../io/validate/validator.js";
import { EXIT_OK, EXIT_ERR_VALIDATE } from "../../utils/exitCodes.js";
import { readManifest } from "../../io/readers/atlsReader.js";

export const validateCommand: CommandModule = {
  command: "validate",
  describe: "Validate .atls archive or staging directory",
  builder: (y) => y
    .option("atls", { type: "string", describe: "Path to .atls file to validate" })
    .option("staging", { type: "string", describe: "Path to staging directory to validate" })
    .conflicts("atls", "staging")
    .check((argv) => {
      if (!argv.atls && !argv.staging) {
        throw new Error("Must provide either --atls or --staging");
      }
      return true;
    }),
  
  handler: async (argv) => {
    const schema = z.object({
      atls: z.string().optional(),
      staging: z.string().optional()
    });
    const cfg = schema.parse(argv);
    
    if (cfg.atls) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Atlas Archive Validation`);
      console.log(`  ${cfg.atls}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      const result = await validateAtlas(cfg.atls);
      
      // Print manifest validation
      if (result.manifest) {
        console.log(`📋 Manifest Validation:`);
        if (result.manifest.valid) {
          console.log(`   ✓ Manifest structure is valid`);
        } else {
          console.log(`   ✗ Manifest has errors:`);
          result.manifest.errors?.forEach(err => console.log(`     - ${err}`));
        }
        console.log();
      }

      if (result.packs) {
        console.log(`📦 Pack Validation:`);
        if (result.packs.valid) {
          console.log(`   ✓ Pack declarations match dataset coverage`);
        } else {
          console.log(`   ✗ Pack validation issues detected:`);
          result.packs.errors?.forEach(err => console.log(`     - ${err}`));
        }

        if (result.packs.summary.length > 0) {
          console.log();
          for (const pack of result.packs.summary) {
            const noteSuffix = pack.notes && pack.notes.length > 0 ? ` (notes: ${pack.notes.join("; ")})` : "";
            const issueSuffix = pack.issues && pack.issues.length > 0 ? ` [issues: ${pack.issues.join(", ")}]` : "";
            console.log(`     - ${pack.name.padEnd(10)} → ${pack.state}${noteSuffix}${issueSuffix}`);
          }
        }
        console.log();
      }
      
      // Print capabilities validation
      if (result.capabilities) {
        console.log(`🎯 Capabilities Validation:`);
        if (result.capabilities.valid) {
          console.log(`   ✓ Capabilities file is valid and consistent`);
        } else {
          console.log(`   ✗ Capabilities has errors:`);
          result.capabilities.errors?.forEach(err => console.log(`     - ${err}`));
        }
        console.log();
      }
      
      // Print provenance validation
      if (result.provenance && result.provenance.total > 0) {
        console.log(`🔍 Provenance Validation:`);
        if (result.provenance.valid) {
          console.log(`   ✓ Verified ${result.provenance.verified}/${result.provenance.total} dataset hashes`);
        } else {
          console.log(`   ✗ Provenance has errors:`);
          result.provenance.errors?.forEach(err => console.log(`     - ${err}`));
        }
        console.log();
      }
      
      // Print integrity validation (Atlas v1.0 Enhancement - Phase 2)
      if (result.integrity && result.integrity.total > 0) {
        console.log(`🔒 Integrity Validation:`);
        if (result.integrity.valid) {
          console.log(`   ✓ Verified ${result.integrity.verified}/${result.integrity.total} file checksums`);
        } else {
          console.log(`   ✗ Integrity has errors:`);
          result.integrity.errors?.forEach(err => console.log(`     - ${err}`));
        }
        console.log();
      }
      
      // Print coverage matrix (Atlas v1.0 Enhancement - Phase 2)
      try {
        const manifest = await readManifest(cfg.atls);
        if (manifest.coverage) {
          console.log(`📈 Coverage Matrix:`);
          console.log(`   Total Pages:       ${manifest.coverage.total_pages.toLocaleString()}`);
          console.log(`   Successful:        ${manifest.coverage.successful_pages.toLocaleString()}`);
          console.log(`   Failed:            ${manifest.coverage.failed_pages.toLocaleString()}`);
          console.log(`   Incomplete:        ${manifest.coverage.incomplete ? 'Yes' : 'No'}`);
          console.log();
          
          console.log(`   Parts Coverage:`);
          for (const item of manifest.coverage.matrix) {
            const status = item.present ? '✓' : '✗';
            const expected = item.expected ? 'expected' : 'optional';
            const reason = item.reason_if_absent ? ` (${item.reason_if_absent})` : '';
            console.log(`     ${status} ${item.part.padEnd(14)} ${item.row_count.toString().padStart(6)} records  [${expected}]${reason}`);
          }
          console.log();
        }
      } catch (err) {
        // Coverage matrix not available in older archives
      }
      
      // Print dataset validation
      console.log(`📊 Dataset Validation:`);
      console.log(`   Pages:         ${result.pages.count.toLocaleString()} records, ${result.pages.errors} errors`);
      console.log(`   Edges:         ${result.edges.count.toLocaleString()} records, ${result.edges.errors} errors`);
      console.log(`   Assets:        ${result.assets.count.toLocaleString()} records, ${result.assets.errors} errors`);
      console.log(`   Errors:        ${result.errors.count.toLocaleString()} records, ${result.errors.errors} errors`);
      if (result.accessibility) {
        console.log(`   Accessibility: ${result.accessibility.count.toLocaleString()} records, ${result.accessibility.errors} errors`);
      }
      console.log();
      
      // Show sample errors if any
      const allErrors = [
        ...(result.pages.sampleErrors || []),
        ...(result.edges.sampleErrors || []),
        ...(result.assets.sampleErrors || []),
        ...(result.errors.sampleErrors || []),
        ...(result.accessibility?.sampleErrors || [])
      ];
      
      if (allErrors.length > 0) {
        console.log(`⚠️  Sample Validation Errors (showing first 10):`);
        allErrors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
        console.log();
      }
      
      // Final status
      if (result.status === "clean") {
        console.log(`\n✓ Archive is valid and ready for use\n`);
        process.exit(EXIT_OK);
      } else {
        console.log(`\n✗ Archive validation failed\n`);
        process.exit(EXIT_ERR_VALIDATE);
      }
    }
    
    if (cfg.staging) {
      console.log(`\n=== Validating staging directory: ${cfg.staging} ===\n`);
      const result = await validateStaging(cfg.staging);
      
      console.log(JSON.stringify(result, null, 2));
      
      if (result.status === "clean") {
        console.log("\n✓ Safe to resume\n");
        process.exit(EXIT_OK);
      } else if (result.status === "needs-truncate") {
        console.log("\n⚠ Needs truncate - partial lines detected\n");
        process.exit(EXIT_ERR_VALIDATE);
      } else {
        console.log("\n✗ Staging directory has errors\n");
        process.exit(EXIT_ERR_VALIDATE);
      }
    }
  }
};
