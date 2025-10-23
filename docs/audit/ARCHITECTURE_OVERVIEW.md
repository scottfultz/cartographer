# Cartographer Engine – Architecture Overview

## System Context Diagram

```mermaid
flowchart TD
    CLI[CLI Entrypoint]
    Scheduler[Scheduler]
    Fetcher[Fetcher]
    Renderer[Renderer (Playwright)]
    Extractors[Extractors]
    Writer[Atlas Writer]
    Finalizer[Finalizer]
    ATLS[.atls Archive]
    Validator[Validator]
    Exporter[CSV Exporter]
    SDK[Atlas SDK Consumers]

    CLI --> Scheduler
    Scheduler -->|stream| Fetcher
    Scheduler -->|stream| Renderer
    Renderer --> Extractors
    Extractors --> Writer
    Writer --> Finalizer
    Finalizer --> ATLS
    ATLS --> Validator
    ATLS --> Exporter
    ATLS --> SDK
```

## Process Boundaries
- **Node.js Context:** CLI, Scheduler, Writer, Finalizer, Validator, Exporter, SDK
- **Playwright Context:** Renderer (browser automation)
- **Streaming:** Scheduler, Extractors, Writer, SDK (never loads full archive in memory)
- **Buffered:** Finalizer, Validator (integrity checks, summary)

## Dataflow
- **Fields originate** from HTTP fetch, DOM evaluation, browser context, computed values, and extraction modules.
- **Flow:**
    1. Scheduler selects URLs and manages queue
    2. Fetcher/Renderer loads pages (raw/prerender/full)
    3. Extractors parse facts, links, assets, text, accessibility
    4. Writer streams JSONL records to staging
    5. Finalizer compresses, hashes, and writes manifest/summary
    6. Validator checks schema and integrity
    7. Exporter/SDK reads .atls for downstream use

## Threading & Concurrency Model
- **Concurrency:** Configurable via CLI (`--concurrency`, default 8)
- **Backpressure:** RSS memory checks, queue hygiene, Playwright browser recycling
- **Checkpoints:** Written every N pages (default 500), supports resume

## Key Backpressure Points
- Scheduler pauses enqueueing if RSS exceeds threshold
- Renderer recycles browser context after memory plateau
- Writer flushes and fsyncs streams periodically

---
See `src/core/scheduler.ts`, `src/core/renderer.ts`, `src/io/atlas/writer.ts`, and `README.md` for implementation details.
