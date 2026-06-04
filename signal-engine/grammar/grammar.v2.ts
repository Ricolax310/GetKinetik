// FROZEN SNAPSHOT OF PRODUCTION GRAMMAR — DO NOT EDIT WITHOUT VERSION BUMP
//
// This file encodes the narrative rules that are live in production as of
// 2026-06-02.  It is a pure data/rule snapshot — no logic, no side effects.
// Consuming code may import GRAMMAR_V2 for validation or documentation.
// Changes require a version bump (grammar.v3.ts) and a migration note.

// ── Types ────────────────────────────────────────────────────────────────────

export type TaxonomyCategory =
  | "CAPACITY"
  | "IDENTITY"
  | "CONSISTENCY"
  | "ECONOMICS"
  | "BEHAVIORAL"
  | "INFRASTRUCTURE";

export type PatternClassification =
  | "convergence"
  | "divergence"
  | "repetition"
  | "concentration"
  | "drift"
  | "stability";

export type PatternScope = "localized" | "cross-network" | "systemic";

// ── Delta phrasing rules ──────────────────────────────────────────────────────
// Source: executive.mjs → dripSignalBullet / publicationSignalBullet

export const DELTA_PHRASING = {
  /** Value decreased.  Template: "{network} {label} declined from {prev} to {cur}." */
  declined: "declined from {prev} to {cur}",

  /** Value increased.  Template: "{network} {label} increased from {prev} to {cur}." */
  increased: "increased from {prev} to {cur}",

  /**
   * Fallback when prev/cur are the same string after formatting, or when delta
   * is defined but cannot be rendered directionally.
   * Template: "{network} {label}: {val} ({delta:+N})."
   */
  fallback: "{network} {label}: {val} ({delta})",

  /**
   * Verb form actually used in production ("rose" / "declined").
   * "increased" is the canonical descriptive term; "rose" is the live verb.
   */
  verbs: {
    positive: "rose",
    negative: "declined",
  } as const,
} as const;

// ── Stability rules ───────────────────────────────────────────────────────────
// Source: executive.mjs → dripSignalBullet / publicationSignalBullet

export const STABILITY_PHRASING = {
  /**
   * Percentage/share metric with delta = 0 or |delta| < TRIVIAL_ABS threshold.
   * Template: "{network} {label} remains near {val} of visible supply."
   */
  remainsNear: "remains near {val} of visible supply",

  /**
   * kmFrozenDays metric (any value — always emitted, delta ignored for gating).
   * Template: "{network} {label} remain unchanged for {N} days{crossMetricCtx}."
   * crossMetricCtx is appended when a rising counterpart exists on the same
   * network (see CROSS_METRIC_CONTEXT below).
   */
  frozenDays: "remain unchanged for {N} days",

  /**
   * Non-percentage metric with delta = 0 or isTrivial = true.
   * Template: "{network} {label} unchanged at {val}."
   */
  unchanged: "unchanged at {val}",

  /**
   * Supplementary phrase appended to kmFrozenDays bullets when the same
   * network also has a rising counterpart metric (e.g. driver count increasing).
   */
  crossMetricContext: {
    kmFrozenDays: "while registrations continue to rise",
  } as const,
} as const;

// ── Suppression rules (TRIVIAL_ABS) ──────────────────────────────────────────
// Source: executive.mjs → TRIVIAL_ABS + isTrivial()
//
// A signal is suppressed (no bullet emitted) when |delta| <= threshold.
// Metrics absent from this map are suppressed when delta === 0.
// Always-emit metrics (threshold 0) are included explicitly for clarity.

export const TRIVIAL_ABS: Readonly<Record<string, number>> = {
  exactDupGroups: 0,       // any change in dup groups is meaningful
  overCapacityCells: 0,    // any cell change is meaningful
  overCapacityPct: 0.0005, // < 0.05 pp → suppress
  kmFrozenDays: 0,         // frozen counter always emitted
  top20ShareOfSupply: 0.002, // < 0.2 pp → suppress
  observed: 5,             // < 5-entity delta → suppress
  flaggedPct: 0.001,
  drivers: 10,             // e.g. +1 of 270 000 → suppress
  detections: 50,
  detectionsZeroDays: 0,   // any zero-day extension is meaningful
} as const;

/**
 * Suppression rule in prose form:
 * "A metric delta is suppressed when |delta| <= TRIVIAL_ABS[metric].
 *  If the metric is not in TRIVIAL_ABS, suppress when delta === 0.
 *  Exceptions: kmFrozenDays, exactDupGroups, overCapacityCells are always
 *  included in the Today's Read pass even when the threshold is 0 and delta
 *  is also 0, because their continued presence is itself a meaningful signal."
 */
export const SUPPRESSION_RULE =
  "suppress when |delta| <= TRIVIAL_ABS[metric]; absent metric suppressed when delta === 0; " +
  "kmFrozenDays / exactDupGroups / overCapacityCells bypass suppression regardless of delta" as const;

// ── Structural inference rules ────────────────────────────────────────────────
// Source: executive.mjs → buildDailyWhyItMatters()

export const STRUCTURAL_INFERENCE = {
  /**
   * Used in "Why It Matters" when no signal has severity=high AND delta>0.
   * Sentence template:
   * "The observed changes are incremental rather than structural and remain
   *  reproducible from public data sources."
   */
  incremental: "incremental rather than structural",

  /**
   * Used when at least one signal has severity=high AND delta>0.
   * Sentence template:
   * "The observed changes are reproducible from public endpoints and remain
   *  non-conclusive without operator confirmation."
   */
  structural: "reproducible from public endpoints and remain non-conclusive without operator confirmation",

  /**
   * Used when every signal has delta === 0.
   * Sentence template:
   * "Today's {typePhrase} signals remain flat — no observable delta in the
   *  current public read."
   */
  flat: "remain flat — no observable delta in the current public read",

  /**
   * Always appended when networkCount > 2.
   * Template: "Observations span {N} networks — no single network dominates the index."
   */
  multiNetworkDisclaimer: "Observations span {N} networks — no single network dominates the index",
} as const;

// ── Taxonomy trigger phrases ──────────────────────────────────────────────────
// Source: taxonomy.ts → categoryForSignal() + CATEGORY_HEADLINE

export const TAXONOMY_TRIGGERS: Readonly<Record<TaxonomyCategory, {
  /** Regex patterns that auto-assign a metric to this category (fallback lookup). */
  metricPatterns: string[];
  /** Human-readable headline phrase used in pattern descriptions. */
  headlinePhrase: string;
  /** Plain-English label used in "Why It Matters" typePhrase construction. */
  narrativeLabel: string;
  /** Explicit metric key assignments (primary lookup, before regex fallback). */
  metricKeys: string[];
}>> = {
  CAPACITY: {
    metricKeys: ["overCapacityCells", "overCapacityPct", "devicesInDrilled"],
    metricPatterns: ["capacity", "saturation", "ceiling"],
    headlinePhrase: "capacity pressure",
    narrativeLabel: "capacity",
  },
  IDENTITY: {
    metricKeys: ["exactDupGroups", "nearDupClusters", "identityCollisions", "flaggedPct"],
    metricPatterns: ["dup", "collision", "cluster", "identity", "coord"],
    headlinePhrase: "identity registry stress",
    narrativeLabel: "registry",
  },
  CONSISTENCY: {
    metricKeys: ["kmFrozenDays", "detectionsZeroDays", "burnFrozenDays"],
    metricPatterns: ["frozen", "flat", "spike", "delay", "drift", "consistency", "discontinuity"],
    headlinePhrase: "metric consistency stress",
    narrativeLabel: "telemetry",
  },
  ECONOMICS: {
    metricKeys: ["top20ShareOfSupply", "top20SumUi", "supplyUiAmount", "natixBurned"],
    metricPatterns: ["share", "supply", "reward", "burn", "top20", "holder", "economic"],
    headlinePhrase: "economic distribution shape",
    narrativeLabel: "concentration",
  },
  BEHAVIORAL: {
    metricKeys: ["detections"],
    metricPatterns: ["detection", "activity", "driver", "behavior"],
    headlinePhrase: "behavioral activity drift",
    narrativeLabel: "behavioral",
  },
  INFRASTRUCTURE: {
    metricKeys: ["kmMapped", "drivers", "observed"],
    metricPatterns: ["km", "mapped", "density", "coverage", "topology", "observed", "infra"],
    headlinePhrase: "infrastructure coverage stress",
    narrativeLabel: "infrastructure",
  },
} as const;

// ── Scope classification rules ────────────────────────────────────────────────
// Source: cross-network-aggregator.ts → scopeFor() + patternPriority()

export const SCOPE_RULES = {
  /**
   * scopeFor(networks, historyDays, historyLen) mapping:
   *   networks.length >= 3                                  → "systemic"
   *   networks.length >= 2                                  → "cross-network"
   *   historyLen >= 2 && historyDays >= ceil(historyLen/2)  → "systemic"
   *   otherwise                                             → "localized"
   */
  thresholds: {
    systemicNetworkCount: 3,
    crossNetworkCount: 2,
    /** historyDays must be >= ceil(historyLen / 2) to qualify as systemic via history. */
    systemicHistoryFraction: 0.5,
  },

  /** Priority score bonus added during pattern ranking. */
  priorityBonus: {
    systemic: 3,
    "cross-network": 2,
    localized: 0,
  } as Record<PatternScope, number>,

  scopeDescriptions: {
    localized: "Signal observed on a single network with insufficient history to generalise.",
    "cross-network": "Same category signal observed across 2 networks in the same window.",
    systemic: "Signal present across 3+ networks, or persistently repeated above the history threshold.",
  } as Record<PatternScope, string>,
} as const;

// ── Classification mapping ────────────────────────────────────────────────────
// Source: cross-network-aggregator.ts → detectPatterns()

export const CLASSIFICATION_RULES: Readonly<Record<PatternClassification, string>> = {
  convergence:   "Same category rising or present across 2+ networks simultaneously.",
  divergence:    "Opposing delta direction — at least one network rising while another falls in the same category.",
  repetition:    "Signal observed on the same network+metric on >= ceil(historyLen/2) of recorded history days.",
  concentration: "Economic holder/supply distribution metrics present on any network.",
  drift:         "Single-network metric with non-zero delta; insufficient breadth for convergence.",
  stability:     "All signals in category have delta === 0 across 2+ networks.",
} as const;

// ── Bullet count limits ───────────────────────────────────────────────────────
// Source: executive.mjs top-level constants

export const BULLET_LIMITS = {
  todaysRead: { min: 3, max: 6 },
  dailyWhyItMatters: { min: 2, max: 4 },
  weeklyExecutive: { min: 3, max: 5 },
} as const;

// ── Master export ─────────────────────────────────────────────────────────────

export const GRAMMAR_V2 = {
  version: "2.0.0",
  frozenAt: "2026-06-02",
  deltaPhrasing: DELTA_PHRASING,
  stabilityPhrasing: STABILITY_PHRASING,
  trivialAbs: TRIVIAL_ABS,
  suppressionRule: SUPPRESSION_RULE,
  structuralInference: STRUCTURAL_INFERENCE,
  taxonomyTriggers: TAXONOMY_TRIGGERS,
  scopeRules: SCOPE_RULES,
  classificationRules: CLASSIFICATION_RULES,
  bulletLimits: BULLET_LIMITS,
} as const;
