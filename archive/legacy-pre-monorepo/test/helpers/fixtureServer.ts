/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".css": "text/css",
  ".js": "application/javascript"
};

/**
 * Start a simple HTTP server for fixture files
 * @param fixtureDir Path to fixture directory relative to test/fixtures
 * @returns Promise<{url: string, server: Server, close: () => Promise<void>}>
 */
export async function startFixtureServer(fixtureDir: string = "static-site"): Promise<{
  url: string;
  server: Server;
  close: () => Promise<void>;
}> {
  const root = join(__dirname, "../fixtures", fixtureDir);
  
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      // Parse URL path
      let filePath = req.url || "/";
      
      // Handle robots.txt specially
      if (filePath === "/robots.txt") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("User-agent: *\nAllow: /\n");
        return;
      }
      
      if (filePath === "/") filePath = "/index.html";
      
      // Resolve file path
      const fullPath = join(root, filePath);
      
      // Read file
      const content = await readFile(fullPath);
      
      // Set content type
      const ext = extname(filePath);
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      
      res.writeHead(200, { "Content-Type": mimeType });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });
  
  // Listen on random port
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server address");
  }
  
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`[Fixture Server] Started at ${url}`);
  
  const close = () => new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else {
        console.log(`[Fixture Server] Stopped`);
        resolve();
      }
    });
  });
  
  return { url, server, close };
}
