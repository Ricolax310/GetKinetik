// Signal quality control — score before narrative; gate daily vs weekly publishing.

import type { Signal } from "./signal-loader.ts";
import { categoryForSignal } from "./taxonomy.ts";
import { categoryWeight } from "./taxonomy-mapping.ts";

export type ConfidenceFlag = "isolated" | "volatile" | "unverified";

export interface ScoredSignal {
  signal: Signal;
  confidence: number;
  flags: ConfidenceFlag[];
}

export const DAILY_CONFIDENCE_MIN = 0.6;
export const WEEKLY_CONFIDENCE_MIN = 0.8;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function dataCompleteness(signal: Signal): number {
  let score = 0;
  if (typeof signal.value === "number" && isFinite(signal.value)) score += 0.1;
  if (typeof signal.delta === "number" && isFinite(signal.delta)) score += 0.05;
  if (signal.timestamp) score += 0.05;
  if (signal.severity === "high" || signal.severity === "medium" || signal.severity === "low") {
    score += 0.05;
  }
  return score;
}

function crossNetworkConfirmation(signal: Signal, allSignals: Signal[]): number {
  const category = categoryForSignal(signal.metric);
  const peers = allSignals.filter(
    (s) =>
      s.network !== signal.network &&
      categoryForSignal(s.metric) === category &&
      Math.abs(s.delta) > 0,
  );
  if (peers.length >= 2) return 0.25;
  if (peers.length === 1) return 0.15;
  return 0.05;
}

function metricStability(signal: Signal, history: { date: string; signals: Signal[] }[]): number {
  const key = `${signal.network}::${signal.metric}`;
  const deltas: number[] = [];
  for (const day of history) {
    const match = day.signals.find((s) => `${s.network}::${s.metric}` === key);
    if (match) deltas.push(match.delta);
  }
  if (deltas.length < 2) return signal.delta === 0 ? 0.15 : 0.1;

  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance =
    deltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / Math.max(1, deltas.length - 1);
  const std = Math.sqrt(variance);
  const swing = Math.abs(signal.delta - mean);
  if (std === 0) return 0.2;
  if (swing <= std) return 0.2;
  if (swing <= std * 2) return 0.12;
  return 0.05;
}

function historicalConsistency(
  signal: Signal,
  history: { date: string; signals: Signal[] }[],
): number {
  if (!history.length) return 0.05;
  const key = `${signal.network}::${signal.metric}`;
  let daysSeen = 0;
  for (const day of history) {
    if (day.signals.some((s) => `${s.network}::${s.metric}` === key)) daysSeen += 1;
  }
  const ratio = daysSeen / history.length;
  if (ratio >= 0.7) return 0.25;
  if (ratio >= 0.4) return 0.18;
  if (ratio >= 0.2) return 0.1;
  return 0.05;
}

function deriveFlags(
  signal: Signal,
  allSignals: Signal[],
  history: { date: string; signals: Signal[] }[],
  components: { cross: number; stability: number; history: number },
): ConfidenceFlag[] {
  const flags: ConfidenceFlag[] = [];
  const category = categoryForSignal(signal.metric);
  const peerCount = allSignals.filter(
    (s) => s.network !== signal.network && categoryForSignal(s.metric) === category,
  ).length;
  if (peerCount === 0) flags.push("isolated");
  if (components.stability <= 0.08 && Math.abs(signal.delta) > 0) flags.push("volatile");
  if (components.history <= 0.08 || signal.feedConfidence == null) flags.push("unverified");
  return flags;
}

/** Score one signal (0–1) using completeness, cross-network, stability, history + network weight. */
export function scoreSignal(
  signal: Signal,
  allSignals: Signal[],
  history: { date: string; signals: Signal[] }[] = [],
): ScoredSignal {
  const category = categoryForSignal(signal.metric);
  const weight = categoryWeight(signal.network, category);

  const completeness = dataCompleteness(signal);
  const cross = crossNetworkConfirmation(signal, allSignals);
  const stability = metricStability(signal, history);
  const hist = historicalConsistency(signal, history);

  let raw = completeness + cross + stability + hist;
  if (typeof signal.feedConfidence === "number") {
    raw = raw * 0.6 + signal.feedConfidence * 0.4;
  }
  raw *= weight;

  const confidence = clamp01(Math.round(raw * 1000) / 1000);
  const flags = deriveFlags(signal, allSignals, history, { cross, stability, history: hist });

  return { signal, confidence, flags };
}

export function scoreAllSignals(
  signals: Signal[],
  history: { date: string; signals: Signal[] }[] = [],
): ScoredSignal[] {
  return signals.map((s) => scoreSignal(s, signals, history));
}

export function filterForDaily(scored: ScoredSignal[]): ScoredSignal[] {
  return scored.filter((s) => s.confidence > DAILY_CONFIDENCE_MIN);
}

export function filterForWeekly(scored: ScoredSignal[]): ScoredSignal[] {
  return scored.filter((s) => s.confidence > WEEKLY_CONFIDENCE_MIN);
}

export function heldBackSignals(scored: ScoredSignal[], minConfidence: number): ScoredSignal[] {
  return scored.filter((s) => s.confidence <= minConfidence);
}
