# Cartographer Engine – Known Issues

## 2025-10-23: Resume Integration Test Hangs

### Summary
The `resume avoids duplicates and flips incomplete correctly` integration test intermittently hangs during execution. The test runs two crawl phases, waiting for checkpoint and crawl.finished events before canceling. Despite correct event emission and diagnostic logs, the process does not exit cleanly after test completion.

### Reproduction Steps
1. Run: `npm run build && npm run build:test && node --test dist/test/**/*.test.js`
2. Observe: All tests pass except the resume integration test, which hangs after emitting crawl.finished.

### Observed Output
- All expected events and logs are emitted.
- The process does not exit; terminal remains blocked.
- No uncaught exceptions or error logs.

### Diagnostic Logs
- Checkpoint and crawl.finished events are emitted as expected.
- Browser lifecycle and graceful shutdown appear correct.
- No resource leaks or unhandled promises detected in logs.

### Potential Causes
- Event listeners or async resources not cleaned up after test.
- Playwright browser or Node.js handles remain open.
- Test runner does not detect test completion due to lingering async operations.

### Impact
- Affects resume integration test reliability.
- May impact other features that rely on browser lifecycle, event bus, or checkpointing.

### Next Steps
- Analyze if other features/tests are affected.
- Investigate resource cleanup and test teardown logic.
- Track further findings and fixes in this file.

---

## 2025-10-23: Max Requests Per Page Default Increased

### Summary
The default value for `maxRequestsPerPage` in the crawl config has been increased from 100 to 250 to improve data completeness for pages with many assets or requests (e.g., https://drancich.com/services/).

### Impact
- More requests per page are captured by default.
- Reduces likelihood of incomplete page data due to request limits.
- May increase crawl duration and resource usage for large sites.

### Next Steps
- Monitor crawl performance and data completeness.
- Consider exposing this option as a CLI argument for advanced users.
