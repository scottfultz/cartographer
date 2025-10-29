/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Atlas v1.0 Type Definitions for SDK
 * 
 * Re-exports types from @atlas/spec for use in the SDK.
 */

// Re-export core types from @atlas/spec
export type {
  RenderMode,
  NavEndReason,
  EdgeLocation,
  AtlasManifest,
  AtlasSummary,
  AtlasPack,
  AtlasPackName,
  AtlasPackState,
  ResponseRecordV1,
} from '@atlas/spec';

// Import types for use in union
import type {
  PageRecord,
  EdgeRecord,
  AssetRecord,
  ErrorRecord,
  EventRecord, // Phase 7: Event log
  ConsoleRecord,
  ComputedTextNodeRecord,
  AtlasPack,
  AtlasPackName,
  AtlasPackState,
} from '@atlas/spec';

// Re-export for convenience
export type {
  PageRecord,
  EdgeRecord,
  AssetRecord,
  ErrorRecord,
  EventRecord, // Phase 7: Event log
  ConsoleRecord,
  ComputedTextNodeRecord,
};

/**
 * AccessibilityRecord - Accessibility audit data (SDK-specific)
 */
export interface AccessibilityRecord {
  pageUrl: string;
  missingAltCount: number;
  missingAltSources?: string[];
  headingOrder: Array<"H1" | "H2" | "H3" | "H4" | "H5" | "H6">;
  landmarks: {
    header: boolean;
    nav: boolean;
    main: boolean;
    aside: boolean;
    footer: boolean;
  };
  roles: Record<string, number>;
  contrastViolations?: Array<{
    selector: string;
    fg?: string;
    bg?: string;
    ratio: number;
    level: "AA" | "AAA";
  }>;
  ariaIssues?: string[];
}

/**
 * Dataset names
 */
export type DatasetName =
  | "pages"
  | "edges"
  | "assets"
  | "responses"
  | "errors"
  | "events"
  | "accessibility"
  | "dom_snapshots"
  | "console"
  | "styles"
  | "perf"
  | "performance"
  | (string & {});

/**
 * Union of all record types
 */
export type AnyRecord = PageRecord | EdgeRecord | AssetRecord | ErrorRecord | AccessibilityRecord;

export interface PackView {
  all: AtlasPack[];
  embedded: AtlasPack[];
  sidecar: AtlasPack[];
  missing: AtlasPack[];
  get(name: AtlasPackName): AtlasPack | undefined;
  has(name: AtlasPackName): boolean;
  hasEmbedded(name: AtlasPackName): boolean;
  sidecarUri(name: AtlasPackName): string | undefined;
  state(name: AtlasPackName): AtlasPackState | undefined;
}
