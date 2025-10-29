/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { CommandModule } from "yargs";
import { exportCsv } from "../../io/export/exportCsv.js";
import { exportEnhancedReport, type EnhancedReportType } from "../../io/export/exportEnhanced.js";

type StandardReportType = "pages" | "edges" | "assets" | "errors" | "accessibility";
type ReportType = StandardReportType | EnhancedReportType;

export const exportCommand: CommandModule = {
  command: "export",
  describe: "Export CSV from an .atls file",
  builder: (y) => y
    .option("atls", { type: "string", demandOption: true, describe: "Path to .atls archive" })
    .option("report", {
      type: "string",
      choices: [
        "pages", "edges", "assets", "errors", "accessibility",  // Standard reports
        "redirects", "noindex", "canonicals", "sitemap", "social", "images"  // Enhanced reports
      ],
      demandOption: true,
      describe: "Report type to export"
    })
    .option("out", { type: "string", demandOption: false, describe: "Output CSV path (default: stdout)" }),
  handler: async (argv) => {
    const reportType = argv.report as ReportType;
    const enhancedReports: EnhancedReportType[] = ['redirects', 'noindex', 'canonicals', 'sitemap', 'social', 'images'];
    
    if (enhancedReports.includes(reportType as EnhancedReportType)) {
      // Use enhanced export for analysis reports
      await exportEnhancedReport({
        atlsPath: argv.atls as string,
        report: reportType as EnhancedReportType,
        outPath: argv.out as string | undefined
      });
    } else {
      // Use standard export for raw datasets
      await exportCsv({
        atlsPath: argv.atls as string,
        report: reportType as StandardReportType,
        outPath: argv.out as string | undefined
      });
    }
  }
};
