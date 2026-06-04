// A. signal-loader — reads signals/latest.json + signals/history.json and
// normalizes everything into one standard schema.

import fs from "node:fs";
import { PATHS } from "./paths.ts";

export type Severity = "low" | "medium" | "high";

export interface Signal {
  network: string;
  metric: string;
  value: number;
  delta: number;
  timestamp: string;
  severity: Severity;
  /** Pipeline confidence when present (0–1). */
  feedConfidence?: number;
}

// Shape of the pipeline feed (only the fields we consume).
interface FeedSignal {
  network?: string;
  metric?: string;
  metricKey?: string | null;
  anomalyType?: string;
  value?: number | null;
  delta?: number | null;
  severity?: string;
  timestamp?: string | null;
  asOf?: string | null;
}
interface FeedNetwork {
  network: string;
  status?: string;
  signals?: FeedSignal[];
}
interface Feed {
  generatedAt?: string;
  date?: string;
  networks?: FeedNetwork[];
}
interface HistoryEntry {
  date?: string;
  generatedAt?: string;
  networks?: FeedNetwork[];
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function toSeverity(s: string | undefined): Severity {
  return s === "high" || s === "medium" || s === "low" ? s : "low";
}

function normalize(feed: Feed): Signal[] {
  const when = feed.generatedAt || (feed.date ? `${feed.date}T00:00:00Z` : new Date().toISOString());
  const out: Signal[] = [];
  for (const net of feed.networks || []) {
    if (net.status && net.status !== "active") continue;
    for (const s of net.signals || []) {
      if (typeof s.value !== "number" || !isFinite(s.value)) continue;
      out.push({
        network: net.network,
        metric: s.metric || s.metricKey || s.anomalyType || "signal",
        value: s.value,
        delta: typeof s.delta === "number" ? s.delta : 0,
        timestamp: s.timestamp || s.asOf || when,
        severity: toSeverity(s.severity),
        feedConfidence:
          typeof (s as FeedSignal & { confidence?: number }).confidence === "number"
            ? (s as FeedSignal & { confidence?: number }).confidence
            : undefined,
      });
    }
  }
  // De-duplicate per (network, metric): prefer the entry with a non-zero delta.
  const byKey = new Map<string, Signal>();
  for (const sig of out) {
    const key = `${sig.network}::${sig.metric}`;
    const existing = byKey.get(key);
    if (!existing || (Math.abs(sig.delta) > Math.abs(existing.delta))) byKey.set(key, sig);
  }
  return [...byKey.values()];
}

/** Current normalized signals (from signals/latest.json). */
export function loadLatestSignals(): Signal[] {
  return normalize(readJson<Feed>(PATHS.signalsLatest, { networks: [] }));
}

/** Per-day normalized signal history (from signals/history.json), oldest first. */
export function loadSignalHistory(): { date: string; signals: Signal[] }[] {
  const history = readJson<HistoryEntry[]>(PATHS.signalsHistory, []);
  return history
    .map((entry) => ({
      date: entry.date || (entry.generatedAt || "").slice(0, 10),
      signals: normalize(entry),
    }))
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** History limited to the trailing N days from today (inclusive). */
export function loadRecentHistory(days: number): { date: string; signals: Signal[] }[] {
  const all = loadSignalHistory();
  const cutoff = Date.now() - days * 86_400_000;
  return all.filter((e) => new Date(`${e.date}T12:00:00Z`).getTime() >= cutoff);
}
