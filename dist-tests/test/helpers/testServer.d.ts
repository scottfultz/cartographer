export type TestServer = {
    baseUrl: string;
    close: () => Promise<void>;
};
export declare function startTestServer(): Promise<TestServer>;
//# sourceMappingURL=testServer.d.ts.map