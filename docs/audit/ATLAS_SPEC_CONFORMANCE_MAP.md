# Cartographer Engine – Atlas Spec Conformance Map

| Spec Item                        | Status   | Reproduction Steps (if yellow)                |
|-----------------------------------|----------|-----------------------------------------------|
| manifest.json present             | Green    |                                               |
| summary.json present              | Green    |                                               |
| schemas/ (all required)           | Green    |                                               |
| parts/pages/*.jsonl.zst           | Green    |                                               |
| parts/edges/*.jsonl.zst           | Green    |                                               |
| parts/assets/*.jsonl.zst          | Green    |                                               |
| parts/errors/*.jsonl.zst          | Green    |                                               |
| parts/accessibility/*.jsonl.zst   | Yellow   | Run crawl with accessibility.enabled=true; verify accessibility part exists |
| manifest: SHA-256 hashes          | Green    |                                               |
| manifest: urlKey SHA-1            | Green    |                                               |
| manifest: owner attribution       | Green    |                                               |
| manifest: datasets/capabilities   | Green    |                                               |
| summary: part counts match        | Green    |                                               |
| AJV schema validation (all parts) | Green    |                                               |
| Accessibility summary field       | Yellow   | Run crawl with accessibility.enabled=true; check summary.json for totalAccessibilityRecords |
| Deviations documented in notes    | Green    |                                               |

---
Yellow items require running a crawl with accessibility enabled (e.g., `--accessibility.enabled true`) and verifying the presence of accessibility part and summary field. See `src/io/atlas/writer.ts` and `README.md` for details.
