/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { crawlCommand } from "./commands/crawl.js";
import { exportCommand } from "./commands/export.js";
import { stressCommand } from "./commands/stress.js";
import { validateCommand } from "./commands/validate.js";
import { tailCommand } from "./commands/tail.js";
import { versionCommand } from "./commands/version.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read cartographer version
let version = "unknown";
try {
  const pkgPath = join(__dirname, "../../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  version = pkg.version;
} catch {
  // ignore
}

yargs(hideBin(process.argv))
  .scriptName("cartographer")
  .version(version)
  .command(crawlCommand)
  .command(exportCommand)
  .command(stressCommand)
  .command(validateCommand)
  .command(tailCommand)
  .command(versionCommand)
  .demandCommand(1)
  .strict()
  .help()
  .parse();
