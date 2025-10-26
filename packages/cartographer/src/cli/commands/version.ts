/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { CommandModule } from "yargs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json files for version information
function getPackageVersion(packageName: string): string {
  try {
    const packagePath = join(__dirname, "../../../", packageName, "package.json");
    const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

export const versionCommand: CommandModule = {
  command: "version",
  describe: "Show version information",
  handler: async () => {
    const cartographerVersion = getPackageVersion(".");
    const atlasSpecVersion = getPackageVersion("../atlas-spec");
    const nodeVersion = process.version;
    
    // Get Playwright version from package.json dependencies
    let playwrightVersion = "unknown";
    try {
      const pkgPath = join(__dirname, "../../../package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      playwrightVersion = pkg.dependencies?.playwright || pkg.devDependencies?.playwright || "unknown";
    } catch {
      // ignore
    }

    console.log(`Cartographer: ${cartographerVersion}`);
    console.log(`Atlas Spec:   ${atlasSpecVersion}`);
    console.log(`Node.js:      ${nodeVersion}`);
    console.log(`Playwright:   ${playwrightVersion}`);
  },
};
