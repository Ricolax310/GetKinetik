// Narrative builder — three layers: daily facts, weekly patterns, implication (max 3 lines).

import type { Signal } from "./signal-loader.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import { categoryForSignal } from "./taxonomy.ts";
import { neutralize } from "./sanitize.ts";

const METRIC_PHRASE: Record<string, string> = {
  exactDupGroups: "duplicate coordinate clusters",
  overCapacityCells: "capacity exceedances",
  kmFrozenDays: "flat cumulative coverage counter",
  top20ShareOfSupply: "top-holder concentration",
  observed: "entities on public map",
};

function humanizeMetric(metric: string): string {
  return METRIC_PHRASE[metric] || metric.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function fmtValue(metric: string, value: number): string {
  if (/share|pct/i.test(metric)) return `${Math.round(value * 1000) / 10}%`;
  return value.toLocaleString();
}

function fmtDelta(metric: string, delta: number): string {
  if (delta === 0) return "unchanged";
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  const v = /share|pct/i.test(metric) ? `${abs}` : abs.toLocaleString();
  return `${sign}${v}`;
}

/** Layer A — daily facts only (no interpretation). */
export function factLine(s: Signal): string {
  return neutralize(
    `${s.network}: ${fmtValue(s.metric, s.value)} ${humanizeMetric(s.metric)} (${fmtDelta(s.metric, s.delta)})`,
  );
}

export function dailyFacts(signals: Signal[]): string[] {
  return signals
    .slice()
    .sort((a, b) => a.network.localeCompare(b.network) || a.metric.localeCompare(b.metric))
    .map(factLine);
}

/** Layer B — weekly patterns from cross-network aggregation. */
export function weeklyPatterns(patterns: Pattern[]): string[] {
  if (!patterns.length) return ["No cross-network pattern observed this window."];
  return patterns.map((p) => neutralize(`${p.headline}. ${p.description}`));
}

/** Layer C — implication (1–3 lines, neutral). */
export function marketImplication(patterns: Pattern[], signals: Signal[]): string[] {
  const lines: string[] = [];
  const cross = patterns.filter((p) => p.scope === "cross-network" || p.scope === "systemic");
  const divergence = patterns.filter((p) => p.classification === "divergence");

  if (cross.length) {
    const cats = [...new Set(cross.map((p) => p.category))];
    lines.push(
      neutralize(
        `Signal divergence between reported and operational metrics is increasing across multiple DePIN sensor networks (${cats.join(", ").toLowerCase()} categories observed concurrently).`,
      ),
    );
  } else if (divergence.length) {
    lines.push(
      neutralize(
        `Metric drift indicates divergent behavior within the same signal category; networks are not moving in lockstep.`,
      ),
    );
  } else if (signals.some((s) => s.severity === "high")) {
    lines.push(
      neutralize(
        `High-severity signals detected this window; the index records observed stress without directional claims.`,
      ),
    );
  } else {
    lines.push(neutralize(`No material cross-network implication detected this window.`));
  }

  return lines.slice(0, 3);
}

export interface NarrativeLayers {
  daily: string[];
  weekly: string[];
  implication: string[];
}

export function buildNarrativeLayers(
  signals: Signal[],
  patterns: Pattern[],
): NarrativeLayers {
  return {
    daily: dailyFacts(signals),
    weekly: weeklyPatterns(patterns),
    implication: marketImplication(patterns, signals),
  };
}
