# Cartographer Engine – Uncovered Branches That Could Drop Records Silently

| Area/Branch                        | Risk Description                        | Minimal Test to Catch It                |
|-------------------------------------|-----------------------------------------|-----------------------------------------|
| Extractors: links/assets/facts      | DOM parse failure, selector returns null| Feed fixture HTML missing expected tags; assert record count matches DOM elements |
| Renderer: browser crash/memory      | Page fails to render, no record emitted | Simulate browser crash; assert error record and page count consistency           |
| Writer: stream/fsync error          | Write fails, record not flushed         | Mock fsync failure; assert error record and part file size                      |
| Scheduler: queue overflow           | URLs dropped if queue exceeds limit     | Seed with excessive URLs; assert all seeds processed or error emitted           |
| Accessibility: contrast sample cap  | Excessive samples silently truncated    | Feed page with >500 contrast elements; assert sample count capped, warning logged|
| Error handling: rare error codes    | Error phase not mapped, record skipped  | Inject unknown error phase; assert error record written                         |
| Schema drift: new/extra fields      | Field not mapped, record omitted        | Add extra field to fixture; assert schema validation error                      |

---
For each, add a test that feeds a controlled fixture or mocks the failure, then asserts that the expected record count, error, or log is present. See `test/fixtures/`, `test/extractors.test.ts`, and `test/smoke/crawl-fixture.test.ts` for patterns.
