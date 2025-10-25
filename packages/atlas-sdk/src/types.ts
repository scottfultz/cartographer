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
} from '@atlas/spec';

// Import types for use in union
import type {
  PageRecord,
  EdgeRecord,
  AssetRecord,
  ErrorRecord,
  ConsoleRecord,
  ComputedTextNodeRecord,
} from '@atlas/spec';

// Re-export for convenience
export type {
  PageRecord,
  EdgeRecord,
  AssetRecord,
  ErrorRecord,
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
export type DatasetName = "pages" | "edges" | "assets" | "errors" | "accessibility";

/**
 * Union of all record types
 */
export type AnyRecord = PageRecord | EdgeRecord | AssetRecord | ErrorRecord | AccessibilityRecord;
