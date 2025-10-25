interface ExportOptions {
    atlsPath: string;
    report: "pages" | "edges" | "assets" | "errors";
    outPath?: string;
}
/**
 * Export CSV from an .atls archive
 */
export declare function exportCsv(options: ExportOptions): Promise<void>;
export {};
//# sourceMappingURL=exportCsv.d.ts.map