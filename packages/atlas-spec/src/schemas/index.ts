/**
 * Copyright © 2025 Cai Frazier.
 * Atlas v1.0 Schema Exports
 */

// Pages dataset
export { PageRecordV1Schema, type PageRecordV1, DiscoverySourceEnum, RobotsDecisionEnum } from './pages.schema.js';

// Responses dataset
export { ResponseRecordV1Schema, type ResponseRecordV1 } from './responses.schema.js';

// Resources dataset
export { ResourceRecordV1Schema, type ResourceRecordV1, ResourceTypeEnum } from './resources.schema.js';

// DOM Snapshot dataset
export { DOMSnapshotRecordV1Schema, type DOMSnapshotRecordV1 } from './dom_snapshot.schema.js';

// Accessibility Tree dataset
export { 
  AccTreeRecordV1Schema, 
  type AccTreeRecordV1,
  type Landmark,
  type TabOrderEntry,
  LandmarkSchema,
  TabOrderEntrySchema
} from './acc_tree.schema.js';

// Render dataset
export { RenderRecordV1Schema, type RenderRecordV1 } from './render.schema.js';

// Links dataset
export { LinkRecordV1Schema, type LinkRecordV1 } from './links.schema.js';

// Sitemaps dataset
export { SitemapRecordV1Schema, type SitemapRecordV1 } from './sitemaps.schema.js';

// Robots.txt dataset
export { RobotsRecordV1Schema, type RobotsRecordV1 } from './robots.schema.js';

// SEO Signals dataset
export { SEOSignalsRecordV1Schema, type SEOSignalsRecordV1 } from './seo_signals.schema.js';

// Audit Results dataset
export { AuditResultRecordV1Schema, type AuditResultRecordV1 } from './audit_results.schema.js';

// Manifest
export { 
  AtlasManifestV1Schema, 
  type AtlasManifestV1, 
  type DatasetMetadata,
  DatasetMetadataSchema,
  BlobStorageMetadataSchema,
  PrivacyPolicySchema,
  RobotsPolicySchema
} from './manifest.schema.js';

// Capabilities
export { 
  AtlasCapabilitiesV1Schema, 
  type AtlasCapabilitiesV1,
  CompatibilitySchema
} from './capabilities.schema.js';

// Provenance
export { 
  ProvenanceRecordV1Schema, 
  type ProvenanceRecordV1,
  ProducerSchema,
  InputReferenceSchema,
  OutputMetadataSchema
} from './provenance.schema.js';
