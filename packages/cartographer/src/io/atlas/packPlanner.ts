/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import type { RenderMode } from "../../core/types.js";

export type PackName = "Core" | "A11y-Light" | "A11y-Full" | "Perf" | "Visual";
export type PackState = "embedded" | "sidecar" | "missing";

export interface DatasetPresence {
  name: string;
  recordCount: number;
  sidecar?: boolean;
  sidecarUri?: string;
  sidecarSha256?: string | null;
}

export interface PlanPacksInput {
  renderMode: RenderMode;
  datasets: DatasetPresence[];
  hasScreenshots?: boolean;
  visualSidecarUri?: string;
  visualSidecarSha256?: string | null;
  defaultVersion?: string;
}

export interface PlannedPack {
  name: PackName;
  version: string;
  state: PackState;
  uri?: string;
  sha256?: string | null;
  notes?: string[];
}

const DEFAULT_PACK_VERSION = "1.0.0";

function findDataset(recordName: string, datasets: DatasetPresence[]): DatasetPresence | undefined {
  return datasets.find(dataset => dataset.name === recordName);
}

function resolveVersion(version?: string): string {
  return version || DEFAULT_PACK_VERSION;
}

function planCorePack(version: string): PlannedPack {
  return {
    name: "Core",
    version,
    state: "embedded",
    sha256: null
  };
}

function planA11yLightPack(version: string, datasets: DatasetPresence[]): PlannedPack {
  const light = findDataset("accessibility", datasets) || findDataset("a11y.light", datasets);
  const state: PackState = light && light.recordCount > 0 ? "embedded" : "missing";
  return {
    name: "A11y-Light",
    version,
    state,
    sha256: null
  };
}

function planA11yFullPack(version: string, datasets: DatasetPresence[]): PlannedPack {
  const hasTree = (findDataset("dom_snapshots", datasets)?.recordCount || 0) > 0 ||
    (findDataset("a11y.tree", datasets)?.recordCount || 0) > 0;
  const hasRefs = (findDataset("aria.refs", datasets)?.recordCount || 0) > 0;
  const hasForms = (findDataset("forms", datasets)?.recordCount || 0) > 0;
  const hasImages = (findDataset("images", datasets)?.recordCount || 0) > 0;
  const embedded = hasTree || hasRefs || hasForms || hasImages;
  return {
    name: "A11y-Full",
    version,
    state: embedded ? "embedded" : "missing",
    sha256: null
  };
}

function planPerfPack(version: string, datasets: DatasetPresence[]): PlannedPack {
  const perf = findDataset("perf", datasets) || findDataset("performance", datasets);
  const state: PackState = perf && perf.recordCount > 0 ? "embedded" : "missing";
  return {
    name: "Perf",
    version,
    state,
    sha256: null
  };
}

function planVisualPack(version: string, input: PlanPacksInput): PlannedPack {
  const { hasScreenshots, visualSidecarUri, visualSidecarSha256 } = input;
  if (visualSidecarUri) {
    return {
      name: "Visual",
      version,
      state: "sidecar",
      uri: visualSidecarUri,
      sha256: visualSidecarSha256 ?? null
    };
  }
  const state: PackState = hasScreenshots ? "embedded" : "missing";
  return {
    name: "Visual",
    version,
    state,
    sha256: null
  };
}

export function planPacks(input: PlanPacksInput): PlannedPack[] {
  const version = resolveVersion(input.defaultVersion);
  const packs: PlannedPack[] = [];
  packs.push(planCorePack(version));
  packs.push(planA11yLightPack(version, input.datasets));
  // Render mode gating: only advertise full a11y pack for prerender/full runs
  if (input.renderMode !== "raw") {
    packs.push(planA11yFullPack(version, input.datasets));
  } else {
    packs.push({
      name: "A11y-Full",
      version,
      state: "missing",
      sha256: null,
      notes: ["Full accessibility extracts require prerender or full mode"]
    });
  }
  packs.push(planPerfPack(version, input.datasets));
  packs.push(planVisualPack(version, input));
  return packs;
}
