# Cartographer Engine – SCHEMA FIELD TO EXTRACTOR CROSSWALK

| Field                | Schema File         | Extractor Module/Function         | Direct Parse / Derived | Notes |
|----------------------|--------------------|-----------------------------------|------------------------|-------|
| url                  | pages.schema.json  | scheduler.ts, renderer.ts         | Direct Parse           | normalized, deduped |
| finalUrl             | pages.schema.json  | renderer.ts                       | Direct Parse           | after redirects |
| normalizedUrl        | pages.schema.json  | utils/url.ts:normalizeUrl         | Derived                | lowercased, sorted params |
| urlKey               | pages.schema.json  | utils/hashing.ts:sha1             | Derived                | SHA-1 hash |
| origin               | pages.schema.json  | utils/url.ts:getOrigin            | Derived                | |
| pathname             | pages.schema.json  | utils/url.ts:getPathname          | Derived                | |
| statusCode           | pages.schema.json  | renderer.ts                       | Direct Parse           | |
| fetchedAt            | pages.schema.json  | renderer.ts                       | Direct Parse           | ISO8601 |
| rawHtmlHash          | pages.schema.json  | utils/hashing.ts:sha256           | Derived                | SHA-256 |
| title                | pages.schema.json  | extractors/pageFacts.js           | Direct Parse           | prerender/full only |
| renderMode           | pages.schema.json  | renderer.ts                       | Derived                | from config |
| depth                | pages.schema.json  | scheduler.ts                      | Derived                | BFS depth |
| discoveredInMode     | pages.schema.json  | scheduler.ts                      | Derived                | |
| sourceUrl            | edges.schema.json  | extractors/links.js               | Direct Parse           | |
| targetUrl            | edges.schema.json  | extractors/links.js               | Direct Parse           | |
| anchorText           | edges.schema.json  | extractors/links.js               | Direct Parse           | |
| nofollow             | edges.schema.json  | extractors/links.js               | Direct Parse           | |
| isExternal           | edges.schema.json  | extractors/links.js               | Derived                | |
| location             | edges.schema.json  | extractors/links.js               | Derived                | nav/header/footer/main/other |
| discoveredInMode     | edges.schema.json  | scheduler.ts                      | Derived                | |
| pageUrl              | assets.schema.json | extractors/assets.js              | Direct Parse           | |
| assetUrl             | assets.schema.json | extractors/assets.js              | Direct Parse           | |
| type                 | assets.schema.json | extractors/assets.js              | Direct Parse           | |
| hasAlt               | assets.schema.json | extractors/assets.js              | Direct Parse           | |
| visible              | assets.schema.json | extractors/assets.js              | Direct Parse           | |
| inViewport           | assets.schema.json | extractors/assets.js              | Direct Parse           | |
| wasLazyLoaded        | assets.schema.json | extractors/assets.js              | Derived                | |
| url                  | errors.schema.json | scheduler.ts, renderer.ts         | Direct Parse           | |
| origin               | errors.schema.json | utils/url.ts:getOrigin            | Derived                | |
| hostname             | errors.schema.json | utils/url.ts                      | Derived                | |
| occurredAt           | errors.schema.json | scheduler.ts, renderer.ts         | Direct Parse           | |
| phase                | errors.schema.json | scheduler.ts, renderer.ts         | Derived                | dns/fetch/robots/render/write/validate |
| message              | errors.schema.json | scheduler.ts, renderer.ts         | Direct Parse           | |
| pageUrl              | accessibility.schema.json | extractors/accessibility.js   | Direct Parse           | |
| missingAltCount      | accessibility.schema.json | extractors/accessibility.js   | Direct Parse           | |
| headingOrder         | accessibility.schema.json | extractors/accessibility.js   | Direct Parse           | |
| landmarks            | accessibility.schema.json | extractors/accessibility.js   | Direct Parse           | |
| roles                | accessibility.schema.json | extractors/accessibility.js   | Direct Parse           | |

---
Fields marked "Derived" are computed from other values or config, not directly parsed from HTTP/DOM. See referenced modules for implementation details.
