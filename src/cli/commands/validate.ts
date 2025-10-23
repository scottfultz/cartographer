/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { CommandModule } from "yargs";
import { z } from "zod";
import { validateAtlas, validateStaging } from "../../io/validate/validator.js";
import { EXIT_OK, EXIT_ERR_VALIDATE } from "../../utils/exitCodes.js";

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
      console.log(`\n=== Validating .atls archive: ${cfg.atls} ===\n`);
      const result = await validateAtlas(cfg.atls);
      
      console.log(JSON.stringify(result, null, 2));
      
      if (result.status === "clean") {
        console.log("\n✓ Archive is valid\n");
        process.exit(EXIT_OK);
      } else {
        console.log("\n✗ Archive has errors\n");
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
