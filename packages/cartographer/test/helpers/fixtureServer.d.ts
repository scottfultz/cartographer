import { Server } from "http";
/**
 * Start a simple HTTP server for fixture files
 * @param fixtureDir Path to fixture directory relative to test/fixtures
 * @returns Promise<{url: string, server: Server, close: () => Promise<void>}>
 */
export declare function startFixtureServer(fixtureDir?: string): Promise<{
    url: string;
    server: Server;
    close: () => Promise<void>;
}>;
//# sourceMappingURL=fixtureServer.d.ts.map