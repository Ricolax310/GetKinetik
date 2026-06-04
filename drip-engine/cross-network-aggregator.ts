// Cross-network aggregator — taxonomy v2 + pattern scope tagging.

import type { Signal } from "./signal-loader.ts";
import {
  categoryForSignal,
  categoryHeadlinePhrase,
  groupSignalsByCategory,
  type SignalCategory,
  type PatternClassification,
  type PatternScope,
} from "./taxonomy.ts";
import { categoryWeight } from "./taxonomy-mapping.ts";

/** @deprecated use scope — kept for serializers that expect patternType string */
export type LegacyPatternType = "cross-network" | "single-network" | "divergence";

export interface Pattern {
  /** Geographic / sector breadth (locked v2 tag). */
  scope: PatternScope;
  /** How metrics relate within the category. */
  classification: PatternClassification;
  /** @deprecated use scope + classification */
  patternType: LegacyPatternType;
  headline: string;
  pattern: string;
  networks: string[];
  description: string;
  category: SignalCategory;
}

/** @deprecated use categoryForSignal */
export type MetricCategory = "capacity" | "duplication" | "coverage" | "rewards";

export function categoryForMetric(metric: string): MetricCategory {
  const cat = categoryForSignal(metric);
  if (cat === "CAPACITY") return "capacity";
  if (cat === "IDENTITY") return "duplication";
  if (cat === "ECONOMICS") return "rewards";
  return "coverage";
}

export function groupByCategory(signals: Signal[]): Record<MetricCategory, Signal[]> {
  const groups = groupSignalsByCategory(signals);
  return {
    capacity: groups.CAPACITY,
    duplication: groups.IDENTITY,
    coverage: [...groups.INFRASTRUCTURE, ...groups.BEHAVIORAL, ...groups.CONSISTENCY],
    rewards: groups.ECONOMICS,
  };
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}

function scopeFor(networks: string[], historyDays: number, historyLen: number): PatternScope {
  if (networks.length >= 3) return "systemic";
  if (networks.length >= 2) return "cross-network";
  if (historyLen >= 2 && historyDays >= Math.ceil(historyLen / 2)) return "systemic";
  return "localized";
}

function legacyTypeFor(
  scope: PatternScope,
  classification: PatternClassification,
): LegacyPatternType {
  if (classification === "divergence") return "divergence";
  if (scope === "localized") return "single-network";
  return "cross-network";
}

function makePattern(
  opts: {
    scope: PatternScope;
    classification: PatternClassification;
    headline: string;
    pattern: string;
    networks: string[];
    category: SignalCategory;
    description: string;
  },
): Pattern {
  return {
    ...opts,
    patternType: legacyTypeFor(opts.scope, opts.classification),
  };
}

export function detectPatterns(
  signals: Signal[],
  history: { date: string; signals: Signal[] }[] = [],
): Pattern[] {
  const groups = groupSignalsByCategory(signals);
  const patterns: Pattern[] = [];

  for (const category of Object.keys(groups) as SignalCategory[]) {
    const catSignals = groups[category];
    if (!catSignals.length) continue;
    const networks = uniq(catSignals.map((s) => s.network));
    const scope = scopeFor(networks, 0, history.length);

    if (networks.length >= 2) {
      patterns.push(
        makePattern({
          scope,
          classification: "convergence",
          headline: categoryHeadlinePhrase(category, true),
          pattern: `CROSS_NETWORK_${category}`,
          networks,
          category,
          description: `Observed ${categoryHeadlinePhrase(category, true)} (${networks.join(", ")}).`,
        }),
      );
    } else if (networks.length === 1) {
      const s = catSignals[0];
      patterns.push(
        makePattern({
          scope: "localized",
          classification: s.delta === 0 ? "stability" : "drift",
          headline: `${networks[0]}: ${categoryHeadlinePhrase(category, false)}`,
          pattern: `LOCAL_${category}`,
          networks,
          category,
          description: `Observed ${category.toLowerCase()} signal on ${networks[0]} (${s.metric}).`,
        }),
      );
    }

    const rising = catSignals.filter((s) => s.delta > 0).map((s) => s.network);
    const falling = catSignals.filter((s) => s.delta < 0).map((s) => s.network);
    if (rising.length && falling.length) {
      const divNetworks = uniq([...rising, ...falling]);
      patterns.push(
        makePattern({
          scope: scopeFor(divNetworks, 0, history.length),
          classification: "divergence",
          headline: `Divergence: ${category} metrics split across networks`,
          pattern: `DIVERGENCE_${category}`,
          networks: divNetworks,
          category,
          description: `Opposing metric drift — ${uniq(rising).join(", ")} rising while ${uniq(falling).join(", ")} declining.`,
        }),
      );
    }

    const stable = catSignals.every((s) => s.delta === 0);
    if (stable && networks.length >= 2) {
      patterns.push(
        makePattern({
          scope: scopeFor(networks, 0, history.length),
          classification: "stability",
          headline: `Stability: ${category} metrics unchanged across networks`,
          pattern: `STABILITY_${category}`,
          networks,
          category,
          description: `No delta movement recorded for ${category} metrics this window.`,
        }),
      );
    }
  }

  if (history.length >= 2) {
    const counts = new Map<string, { network: string; metric: string; days: number }>();
    for (const day of history) {
      for (const s of day.signals) {
        const key = `${s.network}::${s.metric}`;
        const rec = counts.get(key) || { network: s.network, metric: s.metric, days: 0 };
        rec.days += 1;
        counts.set(key, rec);
      }
    }
    for (const rec of counts.values()) {
      if (rec.days >= Math.max(2, Math.ceil(history.length / 2))) {
        const category = categoryForSignal(rec.metric);
        patterns.push(
          makePattern({
            scope: scopeFor([rec.network], rec.days, history.length),
            classification: "repetition",
            headline: `${rec.network}: repeated ${rec.metric} observation`,
            pattern: `REPEATED_${category}`,
            networks: [rec.network],
            category,
            description: `Observed ${rec.network} ${rec.metric} on ${rec.days} of ${history.length} recorded days.`,
          }),
        );
      }
    }
  }

  const econSignals = signals.filter((s) => categoryForSignal(s.metric) === "ECONOMICS");
  if (econSignals.length) {
    const nets = uniq(econSignals.map((s) => s.network));
    patterns.push(
      makePattern({
        scope: scopeFor(nets, 0, history.length),
        classification: "concentration",
        headline: "Economic concentration shape on public ledgers",
        pattern: "ECONOMICS_CONCENTRATION",
        networks: nets,
        category: "ECONOMICS",
        description: "Observed holder/supply concentration metrics from public on-chain reads.",
      }),
    );
  }

  return patterns.sort((a, b) => patternPriority(b, signals) - patternPriority(a, signals));
}

function patternPriority(pattern: Pattern, signals: Signal[]): number {
  const catSignals = signals.filter((s) => categoryForSignal(s.metric) === pattern.category);
  const weightSum = catSignals.reduce(
    (sum, s) => sum + categoryWeight(s.network, pattern.category),
    0,
  );
  const scopeBonus = pattern.scope === "systemic" ? 3 : pattern.scope === "cross-network" ? 2 : 0;
  const networkBonus = pattern.networks.length * 0.5;
  return weightSum + scopeBonus + networkBonus;
}
