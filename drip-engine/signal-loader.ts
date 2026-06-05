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
  message?: string;
  kind?: string;
  confidence?: number;
}
interface FeedNetwork {
  network: string;
  status?: string;
  signals?: FeedSignal[];
}
export interface SectorSummary {
  type: string;
  label: string;
  signalCount: number;
  networks: string[];
  topSeverity: string;
  whatWeDontKnow?: string;
}

export interface FeedTotals {
  networks?: number;
  activeNetworks?: number;
  signals?: number;
}

interface Feed {
  generatedAt?: string;
  date?: string;
  networks?: FeedNetwork[];
  sectorSummary?: SectorSummary[];
  totals?: FeedTotals;
}

export interface FeedBundle {
  signals: Signal[];
  sectorSummary: SectorSummary[];
  totals: FeedTotals;
  networkHeadlines: { network: string; message: string }[];
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

function parseNumberToken(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/−/g, "-");
  const isPct = cleaned.endsWith("%");
  const n = parseFloat(cleaned.replace("%", ""));
  if (!isFinite(n)) return NaN;
  return isPct ? n / 100 : n;
}

/** Parse value + delta from pipeline message strings when numeric fields are absent. */
function parseMetricFromMessage(message: string): { value: number; delta: number } | null {
  const match = message.match(/:\s*([\d,]+(?:\.\d+)?%?)\s*\(\s*([+−-]?[\d,]+(?:\.\d+)?)\s*(pp)?/i);
  if (!match) return null;
  const value = parseNumberToken(match[1]);
  let delta = parseNumberToken(match[2]);
  if (match[3]) delta /= 100;
  if (!isFinite(value)) return null;
  return { value, delta: isFinite(delta) ? delta : 0 };
}

function resolveValueDelta(s: FeedSignal): { value: number; delta: number } | null {
  if (typeof s.value === "number" && isFinite(s.value)) {
    return { value: s.value, delta: typeof s.delta === "number" ? s.delta : 0 };
  }
  if (s.kind === "headline") return null;
  if (typeof s.message === "string") return parseMetricFromMessage(s.message);
  return null;
}

function normalize(feed: Feed): Signal[] {
  const when = feed.generatedAt || (feed.date ? `${feed.date}T00:00:00Z` : new Date().toISOString());
  const out: Signal[] = [];
  for (const net of feed.networks || []) {
    if (net.status && net.status !== "active") continue;
    for (const s of net.signals || []) {
      const vd = resolveValueDelta(s);
      if (!vd) continue;
      out.push({
        network: net.network,
        metric: s.metric || s.metricKey || s.anomalyType || "signal",
        value: vd.value,
        delta: vd.delta,
        timestamp: s.timestamp || s.asOf || when,
        severity: toSeverity(s.severity),
        feedConfidence: typeof s.confidence === "number" ? s.confidence : undefined,
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

/** Normalized signals from signals/<cadence>/latest.json (weekly or monthly). */
export function loadCadenceSignals(cadence: "weekly" | "monthly"): Signal[] {
  return loadFeedBundle(cadence).signals;
}

/** Full cadence feed — signals plus sector summary and headline reads (matches published briefs). */
export function loadFeedBundle(cadence: "weekly" | "monthly"): FeedBundle {
  const file = cadence === "weekly" ? PATHS.signalsWeekly : PATHS.signalsMonthly;
  const feed = readJson<Feed>(file, { networks: [] });
  const networkHeadlines: { network: string; message: string }[] = [];
  for (const net of feed.networks || []) {
    const headline = (net.signals || []).find((s) => s.kind === "headline" && s.message);
    if (headline?.message) networkHeadlines.push({ network: net.network, message: headline.message });
  }
  return {
    signals: normalize(feed),
    sectorSummary: feed.sectorSummary || [],
    totals: feed.totals || {},
    networkHeadlines,
  };
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
