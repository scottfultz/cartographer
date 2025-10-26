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
