# Cartographer Engine – SCHEMA_FIELD_MATRIX

| Field                | Schema File                | Populated By (Module+Function) | Source (HTTP/DOM/Computed) | Mode (raw/prerender) | Validation (AJV Path) | Optional? | Notes |
|----------------------|---------------------------|-------------------------------|----------------------------|----------------------|----------------------|-----------|-------|
| url                  | pages.schema.json          | scheduler, renderer           | HTTP request               | all                  | properties.url        | No        | normalized, deduped |
| finalUrl             | pages.schema.json          | renderer                      | HTTP redirect              | all                  | properties.finalUrl   | No        | after redirects |
| normalizedUrl        | pages.schema.json          | utils/url                     | Computed                   | all                  | properties.normalizedUrl | No     | lowercased, sorted params |
| urlKey               | pages.schema.json          | utils/hashing                 | Computed                   | all                  | properties.urlKey     | No        | SHA-1 hash |
| origin               | pages.schema.json          | utils/url                     | Computed                   | all                  | properties.origin     | No        | |
| pathname             | pages.schema.json          | utils/url                     | Computed                   | all                  | properties.pathname   | No        | |
| statusCode           | pages.schema.json          | renderer                      | HTTP response              | all                  | properties.statusCode | No        | |
| fetchedAt            | pages.schema.json          | renderer                      | HTTP response              | all                  | properties.fetchedAt  | No        | ISO8601 |
| rawHtmlHash          | pages.schema.json          | utils/hashing                 | HTTP body                  | all                  | properties.rawHtmlHash | No      | SHA-256 |
| title                | pages.schema.json          | extractors/pageFacts          | DOM                        | prerender/full       | properties.title      | Yes       | |
| renderMode           | pages.schema.json          | renderer                      | Config                     | all                  | properties.renderMode | No        | |
| depth                | pages.schema.json          | scheduler                     | Computed                   | all                  | properties.depth      | No        | BFS depth |
| discoveredInMode     | pages.schema.json          | scheduler                     | Computed                   | all                  | properties.discoveredInMode | No   | |
| ...                  | ...                       | ...                           | ...                        | ...                  | ...                  | ...       | ... |

(Repeat for all fields in edges, assets, errors, accessibility schemas. For each, note module/function, source, mode, validation path, optionality, and any schema drift.)

---
See `src/io/atlas/schemas/` for full schema definitions. For field provenance, trace extractors and renderer modules. Flag any drift or TODOs in implementation.
