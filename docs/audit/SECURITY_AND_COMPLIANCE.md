# Cartographer Engine – SECURITY_AND_COMPLIANCE

## Robots Handling
- robots.txt fetched and cached (see `src/utils/robotsCache.ts`)
- Respect/override logged in manifest notes
- CLI warns if override used; only crawl sites you administer

## User-Agent Identification
- Default: "CartographerBot/1.0 (+contact:continuum)"
- Customizable via CLI
- Manifest records custom User-Agent

## Zip/JSONL Ingestion Safety
- SDK and atlsReader stream/decompress records, never load full archive
- AJV schema validation for all parts

## License & Ownership
- All files: "Copyright © 2025 Cai Frazier."
- Package is private, not for distribution
- Manifest/archives attribute owner

## External Dependencies & Risk
- Playwright (browser automation)
- yauzl, zstd (archive/streaming)
- AJV (schema validation)
- Risks: browser sandboxing, zip decompression, schema drift

---
See `src/utils/robotsCache.ts`, `src/io/atlas/manifest.ts`, and `README.md` for details.
