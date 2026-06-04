#!/usr/bin/env node
// Intelligence publication engine — signals → score → taxonomy → editorial → distribute.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLatestSignals, loadRecentHistory } from "./signal-loader.ts";
import type { Signal } from "./signal-loader.ts";
import { detectPatterns } from "./cross-network-aggregator.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import {
  scoreAllSignals,
  filterForDaily,
  filterForWeekly,
  type ScoredSignal,
} from "./signal-confidence.ts";
import { buildNarrativeLayers } from "./narrative-builder.ts";
import { executeDistribution } from "./dist-router.ts";
import { loadEnvQuiet } from "../scripts/bureau/lib.mjs";

loadEnvQuiet();

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoWeek(isoDate: string): number {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function selectSignals(scored: ScoredSignal[], mode: "daily" | "weekly"): Signal[] {
  const filtered = mode === "weekly" ? filterForWeekly(scored) : filterForDaily(scored);
  return filtered.map((s) => s.signal);
}

export async function runDaily(): Promise<{
  published: string[];
  patterns: Pattern[];
  signals: Signal[];
  publish?: Record<string, string>;
}> {
  const today = todayUtc();
  const allSignals = loadLatestSignals();
  const history = loadRecentHistory(7);
  const scored = scoreAllSignals(allSignals, history);
  const signals = selectSignals(scored, "daily");
  const patterns = detectPatterns(signals, history);
  const narrative = buildNarrativeLayers(signals, patterns);

  const { written, publish } = await executeDistribution({
    cadence: "daily",
    date: today,
    signals,
    patterns,
    narrative,
    scored,
  });

  if (publish.x) {
    (publish.x.includes("Posted") ? console.log : console.warn)(`[drip:x] ${publish.x}`);
  }

  return { published: written, patterns, signals, publish };
}

export async function runWeekly(): Promise<{
  published: string[];
  patterns: Pattern[];
  signals: Signal[];
  publish?: Record<string, string>;
}> {
  const today = todayUtc();
  const week = isoWeek(today);
  const allSignals = loadLatestSignals();
  const history = loadRecentHistory(7);
  const scored = scoreAllSignals(allSignals, history);
  const signals = selectSignals(scored, "weekly");
  const patterns = detectPatterns(signals, history);
  const narrative = buildNarrativeLayers(signals, patterns);

  const { written, publish } = await executeDistribution({
    cadence: "weekly",
    date: today,
    week,
    signals,
    patterns,
    narrative,
    scored,
  });

  if (publish.substack) {
    (publish.substack.includes("Draft created") ? console.log : console.warn)(
      `[drip:substack] ${publish.substack}`,
    );
  }

  return { published: written, patterns, signals, publish };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const cmd = process.argv[2] || "daily";
  const targets = cmd === "all" ? ["daily", "weekly"] : [cmd];
  for (const t of targets) {
    const run = t === "weekly" ? runWeekly : t === "daily" ? runDaily : null;
    if (!run) {
      console.error(`Unknown job: ${t}. Use daily | weekly | all`);
      process.exit(2);
    }
    const res = await run();
    console.log(
      `[drip:${t}] ${res.signals.length} publishable signals · ${res.patterns.length} patterns · ${res.published.length} files`,
    );
    res.published.forEach((p) => console.log(`  → ${p}`));
  }
}
