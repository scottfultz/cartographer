export declare const baseTestConfig: {
    render: {
        mode: string;
        concurrency: number;
        timeoutMs: number;
    };
    checkpoint: {
        enabled: boolean;
        interval: number;
        everySeconds: number;
    };
    http: {
        rps: number;
        userAgent: string;
    };
    discovery: {
        followExternal: boolean;
        blockList: never[];
        paramPolicy: any;
    };
    cli: {
        quiet: boolean;
    };
};
//# sourceMappingURL=testConfig.d.ts.map