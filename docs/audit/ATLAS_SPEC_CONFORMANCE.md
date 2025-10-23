# Cartographer Engine – ATLAS_SPEC_CONFORMANCE

## ZIP Contents Checklist
- manifest.json
- summary.json
- schemas/
    - pages.schema.json
    - edges.schema.json
    - assets.schema.json
    - errors.schema.json
    - accessibility.schema.json
- parts/
    - pages/*.jsonl.zst
    - edges/*.jsonl.zst
    - assets/*.jsonl.zst
    - errors/*.jsonl.zst
    - accessibility/*.jsonl.zst (if enabled)

## Integrity Hashes
- manifest.json contains SHA-256 hashes for all part files
- urlKey uses SHA-1
- rawHtmlHash, domHash present for each page

## manifest.datasets & Capabilities
- datasets: ["pages", "edges", "assets", "errors", "accessibility"]
- consumers: ["Continuum SEO", "Horizon Accessibility"]
- owner: "Cai Frazier"

## Streaming Validation
- Each part validated with AJV against schema
- summary.json matches part counts
- No schema drift detected (see SCHEMA_FIELD_MATRIX)

## Deviations
- Accessibility part is optional (enabled via config)
- Backward compatibility: totalAccessibilityRecords may be missing in summary
- All deviations are intentional and documented in manifest notes

---
See `src/io/atlas/writer.ts`, `src/io/atlas/manifest.ts`, and `src/io/validate/validator.ts` for implementation details.
