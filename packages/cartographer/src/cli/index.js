/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { crawlCommand } from "./commands/crawl.js";
import { exportCommand } from "./commands/export.js";
import { stressCommand } from "./commands/stress.js";
import { validateCommand } from "./commands/validate.js";
yargs(hideBin(process.argv))
    .scriptName("cartographer")
    .command(crawlCommand)
    .command(exportCommand)
    .command(stressCommand)
    .command(validateCommand)
    .demandCommand(1)
    .strict()
    .help()
    .parse();
//# sourceMappingURL=index.js.map