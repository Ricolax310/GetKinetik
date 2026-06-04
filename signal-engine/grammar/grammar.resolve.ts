// Grammar runtime resolver.
// Single entry point for selecting a grammar version.
// Add future versions here (grammar.v3.ts etc.) without touching callers.

import {
  GRAMMAR_V2,
  type TaxonomyCategory,
  type PatternClassification,
  type PatternScope,
} from "./grammar.v2.ts";

// ── Input shapes ──────────────────────────────────────────────────────────────
// Minimal signal shape required by each resolver method.
// Callers may pass richer objects — extra fields are ignored.

export interface SignalInput {
  metric: string;
  metricKey?: string;
  delta?: number;
  value?: number;
  current?: number;
  previous?: number;
  severity?: "high" | "medium" | "low";
  network?: string;
}

export interface ScopeInput {
  networks: string[];
  historyDays?: number;
  historyLen?: number;
}

export type BulletSection = "todaysRead" | "dailyWhyItMatters" | "weeklyExecutive";

// ── Grammar engine ────────────────────────────────────────────────────────────

export interface GrammarEngine {
  /**
   * Returns the directional phrasing template for a signal with a non-trivial
   * delta.  "declined" | "increased" | "fallback" — direct map of
   * GRAMMAR_V2.deltaPhrasing.
   */
  renderDelta(signal: SignalInput): "declined" | "increased" | "fallback";

  /**
   * Returns the stability phrasing key that applies to this signal.
   * "frozenDays" | "remainsNear" | "unchanged" — direct map of
   * GRAMMAR_V2.stabilityPhrasing keys.
   */
  renderStability(signal: SignalInput): "frozenDays" | "remainsNear" | "unchanged";

  /**
   * Returns true if the signal should be suppressed (no bullet emitted).
   * Direct application of GRAMMAR_V2.trivialAbs thresholds.
   */
  renderSuppression(signal: SignalInput): boolean;

  /**
   * Returns the structural inference key for a set of signal characteristics.
   * "flat" | "incremental" | "structural" — direct map of
   * GRAMMAR_V2.structuralInference keys.
   */
  classifyStructure(signal: { allFlat: boolean; hasStructural: boolean }): "flat" | "incremental" | "structural";

  /**
   * Returns the PatternScope for a given network/history context.
   * Direct application of GRAMMAR_V2.scopeRules.thresholds.
   */
  getScope(input: ScopeInput): PatternScope;

  /**
   * Returns { min, max } bullet count limits for the requested report section.
   * Direct map of GRAMMAR_V2.bulletLimits.
   */
  getBulletLimits(section: BulletSection): { min: number; max: number };

  /** The grammar version string this engine was built from. */
  readonly version: string;
}

// ── Engine builder ────────────────────────────────────────────────────────────

function buildGrammarEngine(grammar: typeof GRAMMAR_V2): GrammarEngine {
  const { trivialAbs, scopeRules, bulletLimits } = grammar;

  function renderDelta(signal: SignalInput): "declined" | "increased" | "fallback" {
    const delta = typeof signal.delta === "number" ? signal.delta : 0;
    if (delta < 0) return "declined";
    if (delta > 0) return "increased";
    return "fallback";
  }

  function renderStability(signal: SignalInput): "frozenDays" | "remainsNear" | "unchanged" {
    const metric = signal.metric ?? signal.metricKey ?? "";
    if (metric === "kmFrozenDays") return "frozenDays";
    if (/share|pct|supply/i.test(metric)) return "remainsNear";
    return "unchanged";
  }

  function renderSuppression(signal: SignalInput): boolean {
    const metric = signal.metric ?? signal.metricKey ?? "";
    const delta = typeof signal.delta === "number"
      ? signal.delta
      : typeof signal.current === "number" && typeof signal.previous === "number"
      ? signal.current - signal.previous
      : 0;
    const abs = Math.abs(delta);
    const thresh = (trivialAbs as Record<string, number>)[metric];
    if (thresh === undefined) return abs === 0;
    return abs <= thresh;
  }

  function classifyStructure(
    signal: { allFlat: boolean; hasStructural: boolean },
  ): "flat" | "incremental" | "structural" {
    if (signal.allFlat) return "flat";
    if (signal.hasStructural) return "structural";
    return "incremental";
  }

  function getScope(input: ScopeInput): PatternScope {
    const { networks, historyDays = 0, historyLen = 0 } = input;
    const { systemicNetworkCount, crossNetworkCount, systemicHistoryFraction } =
      scopeRules.thresholds;
    if (networks.length >= systemicNetworkCount) return "systemic";
    if (networks.length >= crossNetworkCount) return "cross-network";
    if (historyLen >= 2 && historyDays >= Math.ceil(historyLen * systemicHistoryFraction))
      return "systemic";
    return "localized";
  }

  function getBulletLimits(section: BulletSection): { min: number; max: number } {
    return bulletLimits[section];
  }

  return {
    renderDelta,
    renderStability,
    renderSuppression,
    classifyStructure,
    getScope,
    getBulletLimits,
    version: grammar.version,
  };
}

// ── Resolver ──────────────────────────────────────────────────────────────────

export function resolveGrammar(version?: string): GrammarEngine {
  // Only v2 exists today.  Future: add "v3" branch before touching this logic.
  if (version === undefined || version === "v2") {
    console.log("[GRAMMAR] v2 active (resolved engine)");
    return buildGrammarEngine(GRAMMAR_V2);
  }
  // Unknown version — fall back to v2 and warn.
  console.warn(`[GRAMMAR] unknown version "${version}", falling back to v2`);
  console.log("[GRAMMAR] v2 active (resolved engine)");
  return buildGrammarEngine(GRAMMAR_V2);
}

export default resolveGrammar;
