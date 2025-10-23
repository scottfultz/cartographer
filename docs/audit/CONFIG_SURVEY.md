# Cartographer Engine – CONFIG_SURVEY

## Config Fields & Defaults
- seeds: array of URLs (required)
- out: output .atls file (required)
- mode: raw/prerender/full (default: prerender)
- rps: requests per second (default: 3)
- concurrency: browser concurrency (default: 8)
- respectRobots: boolean (default: true)
- overrideRobots: boolean (default: false)
- userAgent: string (default: CartographerBot/1.0)
- maxPages: number (default: 0 = unlimited)
- resume: staging dir (optional)
- checkpointInterval: number (default: 500)
- quiet: boolean (default: false)
- json: boolean (default: false)
- errorBudget: number (default: 0 = unlimited)
- logFile: string (default: logs/crawl-<crawlId>.jsonl)
- logLevel: string (default: info)
- accessibility.enabled: boolean (default: false)

## Env Vars & Feature Flags
- None required; all config via CLI or config file

## Inputs Affecting Determinism
- viewport, render wait, concurrency, param policy, blocklist

## CLI Flags
- See `src/cli/commands/crawl.ts` for full option list

---
See `src/core/config.ts`, `src/cli/commands/`, and `README.md` for details.
