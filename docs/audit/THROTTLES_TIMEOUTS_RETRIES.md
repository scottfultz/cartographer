# Cartographer Engine – Throttles, Timeouts, and Retries

| Mechanism                | Default Value         | Metric to Watch                | Where Detected/Fires                |
|--------------------------|----------------------|-------------------------------|-------------------------------------|
| Request Per Second (RPS) | 3                    | metrics: pagesPerSec, queueSize| Scheduler, metrics logs             |
| Concurrency              | 8                    | metrics: queueSize, RSS        | Scheduler, metrics logs             |
| Checkpoint Interval      | 500 pages            | metrics: totalPages, checkpoint| Scheduler, logs: [Checkpoint]       |
| Error Budget             | 0 (unlimited)        | metrics: errorCount            | Scheduler, summary, exit code 2     |
| Browser Memory Plateau   | RSS threshold (config)| metrics: RSS                   | Renderer, logs: [RSS dropped]       |
| Render Timeout           | 30,000 ms            | metrics: renderDurationMs      | Renderer, logs: [Timeout]           |
| Max Requests Per Page    | 100                  | metrics: requestsPerPage       | Renderer, logs: [MaxRequests]       |
| Max Bytes Per Page       | 10,000,000           | metrics: bytesPerPage          | Renderer, logs: [MaxBytes]          |
| Accessibility Contrast Cap| 500 samples          | metrics: contrastSampleCount   | Extractors/accessibility, logs      |
| Graceful Shutdown Timeout| 60,000 ms            | metrics: shutdownDuration      | Scheduler, logs: [Shutdown]         |
| Retry on fsync failure   | 3 attempts           | metrics: writeErrors           | Writer, logs: [fsync fail]          |
| Retry on browser launch  | 2 attempts           | metrics: browserLaunchErrors   | Renderer, logs: [Failed to initialize browser] |

---
See `src/core/scheduler.ts`, `src/core/renderer.ts`, `src/io/atlas/writer.ts`, and `src/utils/metrics.ts` for implementation and logging details.
