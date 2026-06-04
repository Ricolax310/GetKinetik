// Agent C — Renderer / Narration Layer
//
// Responsibilities:
//   - Accepts pre-classified signals and patterns from Agent B
//   - Applies grammar.renderDelta / renderStability / renderSuppression
//   - Builds: Executive Summary, Network Watch, Cross-Network Patterns
//   - Returns deterministic markdown only
//
// Forbidden:
//   - No classification logic (categories come in from Agent B, not decided here)
//   - No taxonomy decisions (metric → category mapping is Agent B's job)
//   - No signal interpretation (severity, scope assigned upstream)

import resolveGrammar, {
  type GrammarEngine,
  type SignalInput,
} from "../grammar/grammar.resolve.ts";
import {
  GRAMMAR_V2,
  type TaxonomyCategory,
  type PatternClassification,
  type PatternScope,
} from "../grammar/grammar.v2.ts";

// ── Input contracts (Agent B → Agent C) ─────────────────────────────────────
// All classification fields are assigned by Agent B before this layer runs.
// Renderer reads them; it never computes them.

export interface ProcessedSignal {
  /** Display name of the network, as resolved by Agent B. */
  network: string;
  /** Raw metric key (e.g. "exactDupGroups"). */
  metric: string;
  /** Human-readable label (e.g. "duplicate-coordinate groups"), assigned by B. */
  metricLabel: string;
  value: number;
  previous: number;
  delta: number;
  severity: "high" | "medium" | "low";
  /** Taxonomy category — assigned by Agent B, not decided here. */
  category: TaxonomyCategory;
  /** Breadth scope — assigned by Agent B, not decided here. */
  scope: PatternScope;
  /**
   * When true the grammar's cross-metric context phrase is appended to the
   * stability bullet (e.g. "while registrations continue to rise").
   * Agent B sets this; renderer just reads it.
   */
  hasCrossMetricContext?: boolean;
}

export interface ProcessedPattern {
  headline: string;
  /** Taxonomy category — assigned by Agent B. */
  category: TaxonomyCategory;
  /** Breadth scope — assigned by Agent B. */
  scope: PatternScope;
  /** Structural classification — assigned by Agent B. */
  classification: PatternClassification;
  networks: string[];
  description: string;
}

export interface RendererInput {
  date: string;
  signals: ProcessedSignal[];
  patterns: ProcessedPattern[];
  meta: {
    networkCount: number;
    signalCount: number;
  };
}

export interface RendererOutput {
  /** Final markdown string — the only output this layer produces. */
  markdown: string;
  /** Grammar version used. */
  grammarVersion: string;
  /** Counts of bullets that survived suppression per section. */
  stats: {
    execBullets: number;
    networkWatchEntries: number;
    crossNetworkPatterns: number;
  };
}

// ── Value formatter ───────────────────────────────────────────────────────────
// Pure formatting — converts a numeric value to a display string.
// No taxonomy, no classification. Mirrors production fmtVal exactly.

function fmtVal(metric: string, v: number): string {
  if (!isFinite(v)) return "—";
  if (/share|pct|supply/i.test(metric)) return `${(v * 100).toFixed(0)}%`;
  return v.toLocaleString();
}

// ── Single signal → one bullet string ────────────────────────────────────────
// Uses grammar engine exclusively for phrasing decisions.

function signalToBullet(signal: ProcessedSignal, grammar: GrammarEngine): string {
  const { network, metric, metricLabel, value, previous, delta, hasCrossMetricContext } = signal;

  const gInput: SignalInput = { metric, delta, value, current: value, previous };

  if (grammar.renderSuppression(gInput)) {
    // Suppressed — caller must filter these out before calling this function.
    // Defensive: return empty string so the caller's filter catches it.
    return "";
  }

  const stabKey = grammar.renderStability(gInput);

  // Stability path
  if (stabKey === "frozenDays") {
    const ctx = hasCrossMetricContext
      ? ` ${GRAMMAR_V2.stabilityPhrasing.crossMetricContext.kmFrozenDays}`
      : "";
    return `${network} ${metricLabel} remain unchanged for ${value} days${ctx}.`;
  }
  if (stabKey === "remainsNear") {
    return `${network} ${metricLabel} remains near ${fmtVal(metric, value)} of visible supply.`;
  }

  // Delta path — only reached when renderSuppression returned false
  const dir = grammar.renderDelta(gInput);
  if (dir === "fallback") {
    return `${network} ${metricLabel} unchanged at ${fmtVal(metric, value)}.`;
  }

  const verb = dir === "declined"
    ? GRAMMAR_V2.deltaPhrasing.verbs.negative
    : GRAMMAR_V2.deltaPhrasing.verbs.positive;

  const cur = fmtVal(metric, value);
  const prev = fmtVal(metric, previous);

  if (prev !== cur) {
    return `${network} ${metricLabel} ${verb} from ${prev} to ${cur}.`;
  }
  // cur === prev after formatting — use unchanged template
  return `${network} ${metricLabel} unchanged at ${cur}.`;
}

// ── Section builders ──────────────────────────────────────────────────────────

/** Executive Summary: Today's Read bullets + Why It Matters prose. */
function buildExecutiveSummary(
  signals: ProcessedSignal[],
  meta: RendererInput["meta"],
  grammar: GrammarEngine,
): { lines: string[]; bulletCount: number } {
  const { min, max } = grammar.getBulletLimits("todaysRead");

  // Always-emit metrics bypass suppression (frozen days, dup groups, over-capacity cells).
  const ALWAYS_EMIT = new Set(["kmFrozenDays", "exactDupGroups", "overCapacityCells"]);

  const visible = signals.filter((s) => {
    if (ALWAYS_EMIT.has(s.metric)) return true;
    const gInput: SignalInput = { metric: s.metric, delta: s.delta, value: s.value, previous: s.previous };
    return !grammar.renderSuppression(gInput);
  });

  // Severity-first sort, then by absolute delta magnitude.
  const SEV: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const sorted = [...visible].sort(
    (a, b) => (SEV[b.severity] || 0) - (SEV[a.severity] || 0) || Math.abs(b.delta) - Math.abs(a.delta),
  );

  const bullets: string[] = [];
  const seen = new Set<string>();
  for (const s of sorted) {
    if (bullets.length >= max) break;
    const key = `${s.network}::${s.metric}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const b = signalToBullet(s, grammar);
    if (b) bullets.push(b);
  }

  // Pad to min using remaining visible signals if needed.
  if (bullets.length < min) {
    for (const s of sorted) {
      if (bullets.length >= min) break;
      const key = `${s.network}::${s.metric}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const b = signalToBullet(s, grammar);
      if (b) bullets.push(b);
    }
  }

  // Why It Matters — structural inference only, no interpretation.
  const { min: wyMin, max: wyMax } = grammar.getBulletLimits("dailyWhyItMatters");
  const allFlat = signals.every((s) => s.delta === 0);
  const hasStructural = signals.some((s) => s.severity === "high" && s.delta !== 0);
  const structKey = grammar.classifyStructure({ allFlat, hasStructural });

  // Narrative labels come from the frozen grammar snapshot keyed by category.
  // No taxonomy logic — just a label lookup against GRAMMAR_V2 data.
  const presentCategories = [...new Set(signals.map((s) => s.category))];
  const typeLabels = presentCategories
    .map((c) => GRAMMAR_V2.taxonomyTriggers[c]?.narrativeLabel)
    .filter(Boolean) as string[];

  const typePhrase = typeLabels.length > 2
    ? `${typeLabels.slice(0, -1).join(", ")}, and ${typeLabels.at(-1)}`
    : typeLabels.length === 2
    ? `${typeLabels[0]} and ${typeLabels[1]}`
    : typeLabels[0] ?? "infrastructure";

  const whyLines: string[] = [];
  if (meta.signalCount === 0) {
    whyLines.push("No publishable signal deltas cleared the confidence threshold today.");
    whyLines.push("The index remains in observation mode until public feeds refresh.");
  } else if (structKey === "flat") {
    whyLines.push(
      `Today's ${typePhrase} signals remain flat — no observable delta in the current public read.`,
    );
    whyLines.push("The index records these as stability readings; evidence is retained in full below.");
  } else if (structKey === "structural") {
    whyLines.push(
      `Today's signals show movement in ${typePhrase} metrics, with at least one high-severity read observable on public data.`,
    );
    whyLines.push(
      "The observed changes are reproducible from public endpoints and remain non-conclusive without operator confirmation.",
    );
  } else {
    whyLines.push(
      `Today's signals show modest movement in ${typePhrase} metrics. Telemetry and concentration readings are largely unchanged.`,
    );
    whyLines.push(
      "The observed changes are incremental rather than structural and remain reproducible from public data sources.",
    );
  }
  if (meta.networkCount > 2) {
    whyLines.push(
      `Observations span ${meta.networkCount} networks — no single network dominates the index.`,
    );
  }

  const lines = [
    "## Executive Summary",
    "",
    "### Today's Read",
    "",
    ...(bullets.length ? bullets.map((b) => `• ${b}`) : ["• No publishable signal deltas today."]),
    "",
    "### Why It Matters",
    "",
    ...whyLines.slice(0, wyMax),
  ];

  return { lines, bulletCount: bullets.length };
}

/** Network Watch: per-network signal table, one entry per visible signal. */
function buildNetworkWatch(
  signals: ProcessedSignal[],
  grammar: GrammarEngine,
): { lines: string[]; entryCount: number } {
  const byNetwork = new Map<string, ProcessedSignal[]>();
  for (const s of signals) {
    const bucket = byNetwork.get(s.network) ?? [];
    bucket.push(s);
    byNetwork.set(s.network, bucket);
  }

  const ALWAYS_EMIT = new Set(["kmFrozenDays", "exactDupGroups", "overCapacityCells"]);
  const lines: string[] = ["## Network Watch", ""];
  let entryCount = 0;

  // Deterministic: alphabetical network order.
  for (const network of [...byNetwork.keys()].sort()) {
    const networkSignals = byNetwork.get(network)!;
    const visible = networkSignals.filter((s) => {
      if (ALWAYS_EMIT.has(s.metric)) return true;
      return !grammar.renderSuppression({ metric: s.metric, delta: s.delta });
    });
    if (!visible.length) continue;

    const networkBullets: string[] = [];
    for (const s of visible) {
      const bullet = signalToBullet(s, grammar);
      if (!bullet) continue;
      const scopeBadge = s.scope === "localized" ? "" : ` _(${s.scope})_`;
      networkBullets.push(`• ${bullet}${scopeBadge}`);
    }

    // Skip the network heading entirely if all bullets resolved to empty.
    if (!networkBullets.length) continue;

    lines.push(`### ${network}`);
    lines.push("");
    lines.push(...networkBullets);
    lines.push("");
    entryCount += networkBullets.length;
  }

  if (entryCount === 0) {
    lines.push("_No network signals above the suppression threshold today._");
    lines.push("");
  }

  return { lines, entryCount };
}

/** Cross-Network Patterns: only cross-network and systemic scope entries. */
function buildCrossNetworkPatterns(
  patterns: ProcessedPattern[],
): { lines: string[]; patternCount: number } {
  // Renderer receives all patterns; it filters to cross-network/systemic only.
  // Classification labels come from the frozen grammar snapshot — not computed here.
  const crossPatterns = patterns.filter(
    (p) => p.scope === "cross-network" || p.scope === "systemic",
  );

  const lines: string[] = ["## Cross-Network Patterns", ""];

  if (!crossPatterns.length) {
    lines.push("_No cross-network or systemic patterns recorded in this window._");
    lines.push("");
    return { lines, patternCount: 0 };
  }

  // Deterministic: systemic first, then cross-network; alpha within scope.
  const sorted = [...crossPatterns].sort((a, b) => {
    const scopeOrder = (s: PatternScope) => (s === "systemic" ? 0 : 1);
    return scopeOrder(a.scope) - scopeOrder(b.scope) || a.headline.localeCompare(b.headline);
  });

  for (const p of sorted) {
    const classLabel = GRAMMAR_V2.classificationRules[p.classification] ?? p.classification;
    lines.push(`### ${p.headline}`);
    lines.push("");
    lines.push(`**Scope:** ${p.scope}  `);
    lines.push(`**Classification:** ${p.classification} — ${classLabel}  `);
    lines.push(`**Networks:** ${p.networks.join(", ")}  `);
    lines.push(`**Category:** ${p.category}`);
    lines.push("");
    lines.push(`> ${p.description}`);
    lines.push("");
  }

  return { lines, patternCount: sorted.length };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function renderReport(input: RendererInput, grammarVersion?: string): RendererOutput {
  const grammar = resolveGrammar(grammarVersion);

  const exec = buildExecutiveSummary(input.signals, input.meta, grammar);
  const watch = buildNetworkWatch(input.signals, grammar);
  const cross = buildCrossNetworkPatterns(input.patterns);

  const header = [
    `# DePIN Signal Report — ${input.date}`,
    "",
    `> ${input.date} · machine-driven signal publication · evidence first`,
    "",
  ];

  const markdown = [
    ...header,
    ...exec.lines,
    "",
    ...watch.lines,
    ...cross.lines,
  ].join("\n");

  return {
    markdown,
    grammarVersion: grammar.version,
    stats: {
      execBullets: exec.bulletCount,
      networkWatchEntries: watch.entryCount,
      crossNetworkPatterns: cross.patternCount,
    },
  };
}
