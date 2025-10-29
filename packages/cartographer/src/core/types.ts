/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Atlas v1.0 Type Definitions
 * 
 * This file re-exports types from @atlas/spec for backward compatibility.
 * New code should import directly from @atlas/spec.
 */

// Re-export all types from @atlas/spec
export type {
  RenderMode,
  NavEndReason,
  EdgeLocation,
  LinkType,
  ParamPolicy,
  PageRecord,
  EdgeRecord,
  AssetRecord,
  ErrorRecord,
  EventRecord, // Phase 7: Event log
  EventType, // Phase 7: Event log
  EventSeverity, // Phase 7: Event log
  ConsoleRecord,
  ComputedTextNodeRecord,
  EngineConfig,
  CrawlConfig,
  CrawlState,
  CrawlProgress,
  CrawlEvent,
  AtlasManifest,
  AtlasSummary,
  RobotsCacheEntry,
} from '@atlas/spec';

