// Signal taxonomy v2 (locked) — six categories for publication-grade signals.

import type { Signal } from "./signal-loader.ts";

/** Locked taxonomy v2 categories. Do not add ad-hoc labels in publish paths. */
export type SignalCategory =
  | "CAPACITY"
  | "IDENTITY"
  | "CONSISTENCY"
  | "ECONOMICS"
  | "BEHAVIORAL"
  | "INFRASTRUCTURE";

export type OutputLabel = "OBSERVATION" | "PATTERN" | "DIVERGENCE" | "STABILITY";

/** Structural pattern classification (how metrics relate). */
export type PatternClassification =
  | "convergence"
  | "divergence"
  | "repetition"
  | "concentration"
  | "drift"
  | "stability";

/** Geographic / sector breadth tag. */
export type PatternScope = "localized" | "cross-network" | "systemic";

/** @deprecated v1 label — map to v2 for API consumers on legacy feeds. */
export type LegacyCategory =
  | "COVERAGE"
  | "REWARD_DISTRIBUTION"
  | "DATA_DRIFT"
  | "ACTIVITY"
  | "TOPOLOGY";

const METRIC_CATEGORY: Record<string, SignalCategory> = {
  exactDupGroups: "IDENTITY",
  nearDupClusters: "IDENTITY",
  identityCollisions: "IDENTITY",
  flaggedPct: "IDENTITY",
  overCapacityCells: "CAPACITY",
  overCapacityPct: "CAPACITY",
  devicesInDrilled: "CAPACITY",
  kmMapped: "INFRASTRUCTURE",
  kmFrozenDays: "CONSISTENCY",
  detections: "BEHAVIORAL",
  detectionsZeroDays: "CONSISTENCY",
  drivers: "INFRASTRUCTURE",
  observed: "INFRASTRUCTURE",
  top20ShareOfSupply: "ECONOMICS",
  top20SumUi: "ECONOMICS",
  supplyUiAmount: "ECONOMICS",
  natixBurned: "ECONOMICS",
  burnFrozenDays: "CONSISTENCY",
};

const CATEGORY_HEADLINE: Record<SignalCategory, string> = {
  CAPACITY: "capacity pressure",
  IDENTITY: "identity registry stress",
  CONSISTENCY: "metric consistency stress",
  ECONOMICS: "economic distribution shape",
  BEHAVIORAL: "behavioral activity drift",
  INFRASTRUCTURE: "infrastructure coverage stress",
};

export const TAXONOMY_V2_CATEGORIES: readonly SignalCategory[] = [
  "CAPACITY",
  "IDENTITY",
  "CONSISTENCY",
  "ECONOMICS",
  "BEHAVIORAL",
  "INFRASTRUCTURE",
] as const;

export function categoryForSignal(metric: string): SignalCategory {
  if (METRIC_CATEGORY[metric]) return METRIC_CATEGORY[metric];
  const m = metric.toLowerCase();
  if (/capacity|saturation|ceiling/.test(m)) return "CAPACITY";
  if (/dup|collision|cluster|identity|coord/.test(m)) return "IDENTITY";
  if (/share|supply|reward|burn|top20|holder|economic/.test(m)) return "ECONOMICS";
  if (/frozen|flat|spike|delay|drift|consistency|discontinuity/.test(m)) return "CONSISTENCY";
  if (/detection|activity|driver|behavior/.test(m)) return "BEHAVIORAL";
  if (/km|mapped|density|coverage|topology|observed|infra/.test(m)) return "INFRASTRUCTURE";
  return "INFRASTRUCTURE";
}

/** Map locked v2 → legacy string for downstream charts that still expect v1 names. */
export function legacyCategoryLabel(category: SignalCategory): string {
  const map: Record<SignalCategory, string> = {
    CAPACITY: "CAPACITY",
    IDENTITY: "IDENTITY",
    CONSISTENCY: "DATA_DRIFT",
    ECONOMICS: "REWARD_DISTRIBUTION",
    BEHAVIORAL: "ACTIVITY",
    INFRASTRUCTURE: "COVERAGE",
  };
  return map[category];
}

export function outputLabelFor(signal: Signal, networkCountInCategory: number): OutputLabel {
  if (signal.delta === 0) return "STABILITY";
  if (networkCountInCategory >= 2) return "PATTERN";
  return "OBSERVATION";
}

export function categoryHeadlinePhrase(category: SignalCategory, crossNetwork: boolean): string {
  const base = CATEGORY_HEADLINE[category];
  if (crossNetwork) return `Cross-network ${base} observed across multiple networks`;
  return `${base} signal detected`;
}

export function emptyCategoryGroups(): Record<SignalCategory, Signal[]> {
  return {
    CAPACITY: [],
    IDENTITY: [],
    CONSISTENCY: [],
    ECONOMICS: [],
    BEHAVIORAL: [],
    INFRASTRUCTURE: [],
  };
}

export function groupSignalsByCategory(signals: Signal[]): Record<SignalCategory, Signal[]> {
  const groups = emptyCategoryGroups();
  for (const s of signals) {
    groups[categoryForSignal(s.metric)].push(s);
  }
  return groups;
}
