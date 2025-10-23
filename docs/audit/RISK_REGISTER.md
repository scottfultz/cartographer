# Cartographer Engine – RISK_REGISTER

| Risk/Issue                        | Severity | Likelihood | File/Line Reference                | Mitigation/Follow-up           |
|------------------------------------|----------|------------|------------------------------------|-------------------------------|
| Partial line truncation in streams | High     | Medium     | src/io/readers/atlsReader.ts       | Add chunk boundary checks      |
| fsync failure handling             | High     | Low        | src/io/atlas/writer.ts             | Retry logic, error reporting   |
| Schema drift (field mismatch)      | High     | Medium     | schemas/, extractors/              | Automated schema tests         |
| Robots override misuse             | Medium   | Medium     | src/cli/commands/crawl.ts          | Manifest notes, CLI warning    |
| Contrast sampling cost             | Medium   | Medium     | extractors/accessibility.js        | Cap sample size, log perf      |
| Large asset/DOM truncation         | Medium   | Low        | extractors/assets.js, renderer.ts  | Truncate, skip, log            |
| Error budget not enforced          | Medium   | Low        | scheduler.ts, startJob.ts          | Test coverage, summary note    |
| Browser sandboxing risk            | Medium   | Low        | renderer.ts                        | Playwright config, update docs |
| Zip decompression safety           | Medium   | Low        | atlsReader.ts, SDK                 | Streamed, never full load      |
| Blocklist hygiene                  | Low      | Medium     | utils/url.ts, scheduler.ts         | Test coverage, config review   |

---
See referenced files for details. Address with targeted tests, logging, and config hygiene.
