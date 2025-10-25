# Atlas Archive Validation Feature

## Overview

Cartographer now includes automatic post-creation validation as a QA check for `.atls` archives. This feature helps catch data quality issues, schema violations, and archive corruption during the crawl process.

## How It Works

After the archive is created and compressed, Cartographer automatically:

1. **Reads the archive** using the same readers consumers would use
2. **Validates each record** against JSON schemas for pages, edges, assets, errors, and accessibility
3. **Reports any issues** as warnings in the log output
4. **Creates the archive regardless** of schema warnings (only fails on truly corrupt files)

## CLI Options

### `--validateArchive` (boolean, default: `true`)

Enable or disable post-creation validation.

```bash
# Validation enabled (default)
node dist/src/cli/index.js crawl --seeds https://example.com --out test.atls

# Disable validation for faster builds
node dist/src/cli/index.js crawl --seeds https://example.com --out test.atls --validateArchive false
```

## Output Examples

### Successful Validation

```
[18:20:52] [INFO] [AtlasWriter] Running post-creation validation (QA check)...
[18:20:52] [INFO] [AtlasWriter] Validation PASSED ✓ All 145 records are valid
```

### Validation with Warnings

```
[18:20:52] [INFO] [AtlasWriter] Running post-creation validation (QA check)...
[18:20:52] [WARN] [AtlasWriter] Validation completed with 2 schema warnings (may indicate data quality issues)
[18:20:52] [WARN]   Pages: 1 records, 1 errors
[18:20:52] [WARN]   Edges: 1 records, 0 errors
[18:20:52] [WARN]   Assets: 0 records, 0 errors
[18:20:52] [WARN]   Errors: 0 records, 0 errors
[18:20:52] [WARN]   Accessibility: 1 records, 1 errors
[18:20:52] [WARN]   Sample page errors:
[18:20:52] [WARN]     Page 1: data must NOT have additional properties
[18:20:52] [WARN] [AtlasWriter] Archive created despite schema warnings - use 'cartographer validate' for full report
```

## Behavior

### Non-Fatal by Design

The validation check is **non-fatal** - it logs warnings but doesn't prevent archive creation. This is intentional because:

1. **Schema evolution**: New fields may be added to records that aren't in the schema yet
2. **Usability**: Archives with minor schema issues are often still usable by consumers
3. **Performance**: Validation runs after compression, so the archive exists even if validation finds issues

### Only Fatal Errors

The only time validation will cause a build failure is if the archive file is truly corrupt:

- File not found
- Cannot read ZIP structure
- Decompression failures

### Deep Inspection

For a detailed validation report, use the standalone `validate` command:

```bash
node dist/src/cli/index.js validate --atls path/to/archive.atls
```

This provides:
- Full error counts per record type
- Sample error messages (up to 10 per type)
- Schema validation details
- Overall archive status

## Implementation Details

### Location

- **Validator**: `src/io/validate/validator.ts`
- **Integration**: `src/io/atlas/writer.ts` (in `finalize()` method)
- **CLI Option**: `src/cli/commands/crawl.ts`
- **Config Type**: `src/core/types.ts` (`EngineConfig.cli.validateArchive`)

### Performance Impact

Minimal - validation runs after the archive is fully written and only reads compressed data. Adds approximately:

- **Small archives** (1-10 pages): +100-500ms
- **Medium archives** (100 pages): +1-2s
- **Large archives** (1000+ pages): +5-10s

For performance-critical builds, disable with `--validateArchive false`.

## Known Issues

### "Additional Properties" Warnings

Current schemas may be too strict and reject records with extra fields. This is a known issue with the schema definitions in `src/io/atlas/schemas/`.

Example:
```
Page 1: data must NOT have additional properties
```

This typically indicates:
1. A new field was added to the record type but not to the schema
2. The schema has `additionalProperties: false` set too aggressively

**Workaround**: These warnings are safe to ignore if the archive is otherwise functional. Use the Atlas SDK to verify records can be read correctly.

### Schema Version Mismatch

If you're using an older schema version, validation may report false positives. Ensure schemas in `src/io/atlas/schemas/` match the current record types in `src/core/types.ts`.

## Benefits

1. **Immediate Feedback**: Catch data quality issues right after crawl completion
2. **Debugging Aid**: Sample error messages help diagnose extraction or writer bugs
3. **Confidence**: Know your archive is well-formed before distribution
4. **Optional**: Disable for faster iteration during development

## Future Enhancements

- [ ] Configurable strictness levels (strict, warn, off)
- [ ] Custom schema paths for extended record types
- [ ] Validation result export to JSON
- [ ] Integration with CI/CD pipelines (exit codes for validation failures)
- [ ] Schema auto-update based on actual record structure
