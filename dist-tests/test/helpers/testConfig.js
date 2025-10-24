export const baseTestConfig = {
    render: { mode: process.env.CARTO_TEST_RENDER ?? 'raw', concurrency: 1, timeoutMs: 5000 },
    checkpoint: { enabled: true, interval: 2, everySeconds: 1 },
    http: { rps: 5, userAgent: 'CartographerTest' },
    discovery: { followExternal: false, blockList: [], paramPolicy: 'keep' },
    cli: { quiet: true }
};
//# sourceMappingURL=testConfig.js.map