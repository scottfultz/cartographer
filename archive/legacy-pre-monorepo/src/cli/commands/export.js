/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { exportCsv } from "../../io/export/exportCsv.js";
export const exportCommand = {
    command: "export",
    describe: "Export CSV from an .atls file",
    builder: (y) => y
        .option("atls", { type: "string", demandOption: true })
        .option("report", { type: "string", choices: ["pages", "edges", "assets", "errors"], demandOption: true })
        .option("out", { type: "string", demandOption: false }),
    handler: async (argv) => {
        await exportCsv({
            atlsPath: argv.atls,
            report: argv.report,
            outPath: argv.out
        });
    }
};
//# sourceMappingURL=export.js.map