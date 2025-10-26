// Basic Node.js HTTP server to run Cartographer and provide a debug UI.
// Run this script using: node cartographer-ui-server.js

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'querystring';
import { Cartographer } from './dist/src/engine/cartographer.js'; // Adjust path if needed
import bus from './dist/src/core/events.js'; // Adjust path if needed
import { log } from './dist/src/utils/logging.js'; // Adjust path if needed
// Type hints for CrawlConfig, RenderMode, ParamPolicy (see src/core/types.js)
/**
 * @typedef {import('./dist/src/core/types.js').CrawlConfig} CrawlConfig
 */
import { DEFAULT_CONFIG } from './dist/src/core/config.js'; // Import defaults

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let currentCartographer = null;
let currentCrawlId = null;
let crawlStatus = { state: 'idle', progress: { completed: 0, queued: 0, errors: 0 } };
const sseClients = [];

function safeParseInt(value, defaultValue) {
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
}
const PARAM_POLICIES = new Set(['keep', 'sample', 'strip']);
function parseParamPolicy(input, fallback = 'keep') {
  if (typeof input === 'string' && PARAM_POLICIES.has(input)) return input;
  log('warn',`[UI Server] Invalid paramPolicy: ${input}, falling back to '${fallback}'`);
  return fallback;
}

const forwardEvent = (event) => {
    if (event.type === 'crawl.heartbeat' && event.progress) {
         const rssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
         event.progress.rssMB = rssMB;
     }
    const message = `data: ${JSON.stringify(event)}\n\n`;
    sseClients.forEach(client => client.write(message));
    if (event.type === 'crawl.started') {
        currentCrawlId = event.crawlId;
        crawlStatus = {
             state: 'running',
             crawlId: event.crawlId,
             progress: { completed: 0, queued: event.config?.seeds?.length || 0, errors: 0, rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024) }
        };
    } else if (event.type === 'crawl.heartbeat') {
        crawlStatus.progress = event.progress;
        crawlStatus.state = 'running';
    } else if (event.type === 'crawl.finished') {
        crawlStatus.state = 'done';
        crawlStatus.incomplete = event.incomplete;
    } else if (event.type === 'crawl.shutdown') {
        crawlStatus.state = 'canceling';
    } else if (event.type === 'error.occurred') {
        crawlStatus.progress.errors = (crawlStatus.progress.errors || 0) + 1;
    }
};
// Listen to all events using wildcard
bus.on('*', forwardEvent);

const server = http.createServer((req, res) => {
    log('debug', `[UI Server] Request: ${req.method} ${req.url}`);
    if (req.method === 'GET' && req.url === '/') {
        const uiPath = path.join(__dirname, 'cartographer-ui.html');
        fs.readFile(uiPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading UI HTML');
                log('error', '[UI Server] Error reading cartographer-ui.html:', err);
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
    else if (req.method === 'GET' && req.url === '/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
        res.write('\n');
        sseClients.push(res);
        log('info', `[UI Server] SSE Client connected. Total clients: ${sseClients.length}`);
        res.write(`data: ${JSON.stringify({ type: 'status.update', ...crawlStatus })}\n\n`);
        req.on('close', () => {
            const index = sseClients.indexOf(res);
            if (index !== -1) {
                sseClients.splice(index, 1);
            }
            log('info', `[UI Server] SSE Client disconnected. Total clients: ${sseClients.length}`);
        });
    }
    else if (req.method === 'POST' && req.url === '/crawl') {
        if (currentCartographer && (crawlStatus.state === 'running' || crawlStatus.state === 'starting' || crawlStatus.state === 'canceling')) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `A crawl (${crawlStatus.state}) is already in progress.` }));
            return;
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const params = parse(body);
                log('info', '[UI Server] Received crawl request:', params);
                // Normalize seed URLs: auto-resolve plain domains to https://...
                const seeds = (params.seeds || '').split(',').map(s => {
                    const trimmed = s.trim();
                    if (!trimmed) return '';
                    // If it looks like a domain (no scheme, no spaces, no /), add https://
                    if (!/^https?:\/\//i.test(trimmed) && /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
                        return 'https://' + trimmed.replace(/\/$/, '') + '/';
                    }
                    return trimmed;
                }).filter(Boolean);
                const outPath = params.outPath || `tmp/cartographer-ui-crawl-${Date.now()}.atls`;
                const mode = (params.mode || 'prerender');
                if (seeds.length === 0) {
                    throw new Error('No valid seed URLs provided.');
                }
                const crawlConfig = {
                    seeds: seeds,
                    outAtls: outPath,
                    render: {
                        mode: mode,
                        concurrency: safeParseInt(params.concurrency, DEFAULT_CONFIG.render.concurrency),
                        timeoutMs: safeParseInt(params.timeoutMs, DEFAULT_CONFIG.render.timeoutMs),
                        maxRequestsPerPage: safeParseInt(params.maxRequestsPerPage, DEFAULT_CONFIG.render.maxRequestsPerPage),
                        maxBytesPerPage: safeParseInt(params.maxBytesPerPage, DEFAULT_CONFIG.render.maxBytesPerPage),
                    },
                    http: {
                        rps: safeParseInt(params.rps, DEFAULT_CONFIG.http.rps),
                        userAgent: (params.userAgent || DEFAULT_CONFIG.http.userAgent)
                    },
                    discovery: {
                        followExternal: params.followExternal === 'on',
                        paramPolicy: parseParamPolicy(params.paramPolicy, DEFAULT_CONFIG.discovery.paramPolicy),
                        blockList: (params.blockList || DEFAULT_CONFIG.discovery.blockList.join(',')).split(',').map(s => s.trim()).filter(Boolean),
                    },
                    robots: {
                        respect: params.respectRobots !== 'off',
                        overrideUsed: params.overrideRobots === 'on'
                    },
                    maxPages: safeParseInt(params.maxPages, DEFAULT_CONFIG.maxPages),
                    checkpoint: {
                        enabled: params.checkpointEnabled === 'on',
                        interval: safeParseInt(params.checkpointInterval, DEFAULT_CONFIG.checkpoint.interval),
                        everySeconds: safeParseInt(params.checkpointEverySeconds, DEFAULT_CONFIG.checkpoint.everySeconds || 0)
                    },
                    cli: {
                         quiet: true,
                         json: false,
                         maxErrors: safeParseInt(params.maxErrors, DEFAULT_CONFIG.cli?.maxErrors || -1),
                         logLevel: 'debug',
                         logFile: params.logFile || DEFAULT_CONFIG.cli?.logFile || `logs/crawl-<crawlId>.jsonl`
                    },
                    memory: DEFAULT_CONFIG.memory,
                    shutdown: DEFAULT_CONFIG.shutdown,
                    accessibility: DEFAULT_CONFIG.accessibility,
                    perHostRps: safeParseInt(params.perHostRps, DEFAULT_CONFIG.perHostRps || 0)
                };
                if (!crawlConfig.perHostRps) delete crawlConfig.perHostRps;
                if (!crawlConfig.checkpoint.everySeconds) delete crawlConfig.checkpoint.everySeconds;
                log('info', '[UI Server] Constructed crawl config:', crawlConfig);
                currentCartographer = new Cartographer();
                crawlStatus = { state: 'starting', progress: {} };
                forwardEvent({ type: 'status.update', state: 'starting', progress: {}});
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Crawl starting...' }));
                await currentCartographer.start(crawlConfig);
                bus.once('crawl.finished', async () => {
                   log('info', '[UI Server] Crawl finished. Cleaning up...');
                   forwardEvent({ type: 'status.update', state: 'finalizing', progress: crawlStatus.progress });
                   if(currentCartographer) {
                       try {
                           await currentCartographer.close();
                           log('info', '[UI Server] Cartographer closed successfully.');
                       } catch (closeErr) {
                           log('error', '[UI Server] Error during Cartographer close:', closeErr);
                           forwardEvent({ type: 'status.update', state: 'failed', error: 'Cleanup failed' });
                       } finally {
                           currentCartographer = null;
                           currentCrawlId = null;
                       }
                   }
                });
            } catch (error) {
                log('error', '[UI Server] Error starting crawl:', error);
                crawlStatus = { state: 'failed', error: error.message, progress: {} };
                forwardEvent({ type: 'status.update', ...crawlStatus });
                currentCartographer = null;
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message || 'Failed to start crawl.' }));
                }
            }
        });
    }
    else if (req.method === 'POST' && req.url === '/cancel') {
         if (!currentCartographer || !(crawlStatus.state === 'running' || crawlStatus.state === 'starting')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No crawl is currently running or starting.' }));
            return;
        }
        log('info', '[UI Server] Received cancel request.');
        crawlStatus.state = 'canceling';
        forwardEvent({ type: 'status.update', ...crawlStatus });
        (async () => {
            try {
                await currentCartographer.cancel();
            } catch (err) {
                log('error', '[UI Server] Error during cancel:', err);
            }
        })();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Cancel request sent.' }));
    }
     else if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(crawlStatus));
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    log('info', `[UI Server] Cartographer UI server running at http://localhost:${PORT}`);
    log('info', `[UI Server] Ensure Cartographer dist files exist relative to this script.`);
});

process.on('SIGINT', () => {
  log('info', '[UI Server] SIGINT received. Shutting down server...');
  sseClients.forEach(client => client.end());
  server.close(async () => {
    log('info', '[UI Server] HTTP server closed.');
    if (currentCartographer) {
        log('info', '[UI Server] Attempting to cancel and close active crawl during server shutdown...');
        try {
            await currentCartographer.cancel();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await currentCartographer.close();
            log('info', '[UI Server] Active crawl resources closed.');
        } catch (crawlErr) {
            log('error', '[UI Server] Error during crawl shutdown:', crawlErr);
        }
    }
    process.exit(0);
  });
});
