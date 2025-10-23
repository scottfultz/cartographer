# Cartographer Engine – Config Key Reference

| Key                  | Type      | Default                        | Min   | Max      | Module/Function                | Restart Required |
|----------------------|-----------|--------------------------------|-------|----------|-------------------------------|------------------|
| seeds                | array     | (required)                     | 1     | ∞        | src/cli/commands/crawl.ts      | Yes              |
| out                  | string    | (required)                     | -     | -        | src/cli/commands/crawl.ts      | Yes              |
| mode                 | string    | "prerender"                    | raw   | full     | src/cli/commands/crawl.ts      | Yes              |
| rps                  | number    | 3                              | 1     | 1000     | src/core/config.ts             | Yes              |
| concurrency          | number    | 8                              | 1     | 64       | src/core/config.ts             | Yes              |
| respectRobots        | boolean   | true                           | -     | -        | src/core/config.ts             | Yes              |
| overrideRobots       | boolean   | false                          | -     | -        | src/core/config.ts             | Yes              |
| userAgent            | string    | "CartographerBot/1.0"          | -     | -        | src/core/config.ts             | Yes              |
| maxPages             | number    | 0 (unlimited)                  | 0     | ∞        | src/core/config.ts             | Yes              |
| resume               | string    | (optional)                     | -     | -        | src/core/config.ts             | Yes              |
| checkpointInterval   | number    | 500                            | 1     | ∞        | src/core/config.ts             | Yes              |
| quiet                | boolean   | false                          | -     | -        | src/cli/commands/crawl.ts      | No               |
| json                 | boolean   | false                          | -     | -        | src/cli/commands/crawl.ts      | No               |
| errorBudget          | number    | 0 (unlimited)                  | 0     | ∞        | src/core/config.ts             | Yes              |
| logFile              | string    | "logs/crawl-<crawlId>.jsonl"   | -     | -        | src/cli/commands/crawl.ts      | No               |
| logLevel             | string    | "info"                         | debug | error    | src/core/config.ts             | No               |
| accessibility.enabled| boolean   | false                          | -     | -        | src/core/config.ts             | Yes              |

---
All config keys are read at startup by CLI and config modules. Changes require restart unless noted. See `src/core/config.ts` and `src/cli/commands/crawl.ts` for parsing logic.
