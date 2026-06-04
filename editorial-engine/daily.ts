// Daily editorial — executive layer + full evidence (dual format).

import type { Signal } from "../drip-engine/signal-loader.ts";
import { categoryForSignal, type SignalCategory } from "../drip-engine/taxonomy.ts";
import { assertClean } from "../drip-engine/sanitize.ts";
import { DAILY_EDITORIAL, assertEditorialRule } from "./rules.ts";
import {
  buildTodaysReadFromDrip,
  buildDailyWhyItMatters,
  wrapDualLayerDaily,
} from "./executive.mjs";

export interface DailyEditorial {
  date: string;
  todaysRead: string[];
  whyItMatters: string[];
  facts: string[];
  markdown: string;
}

function buildFullEvidenceFromDrip(signals: Signal[]): string {
  const lines: string[] = [];
  lines.push("### What Changed Today", "");
  if (!signals.length) {
    lines.push("_No signals above the daily confidence threshold._");
  } else {
    for (const s of signals
      .slice()
      .sort((a, b) => a.network.localeCompare(b.network) || a.metric.localeCompare(b.metric))) {
      lines.push(`- **${s.network}** — ${s.metric}: ${s.value} (delta ${s.delta}) · ${s.severity}`);
    }
  }
  lines.push("", "### Signal Type", "");
  const byNet = new Map<string, SignalCategory>();
  for (const s of signals) byNet.set(s.network, categoryForSignal(s.metric));
  if (!byNet.size) lines.push("_No classified signals._");
  else {
    for (const [net, cat] of [...byNet.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`- **${net}** — ${cat}`);
    }
  }
  lines.push("", "### Signal Context", "");
  lines.push("_Operational context for each observation — not a verdict._");
  for (const s of signals.slice(0, 6)) {
    lines.push(`- **${s.network}** (${categoryForSignal(s.metric)}): public metric movement recorded; operator confirmation required for root cause.`);
  }
  lines.push("", "### What We Don't Know", "");
  lines.push("- Whether observed deltas reflect registry behavior, feed ETL, or on-the-ground activity — public endpoints alone cannot disambiguate.");
  lines.push("", "### Questions Worth Asking", "");
  lines.push("- Does the public feed match your internal registry view for the metrics flagged today?");
  lines.push("", "### Sources & Methodology", "");
  lines.push("- Feed: `signals/latest.json` · API: `/api/signals/latest.json`");
  lines.push("- Reproduce: `node scripts/signal-pipeline/pipeline.mjs daily`");
  return lines.join("\n");
}

export function buildDailyEditorial(
  signals: Signal[],
  dateLabel: string,
  fullEvidenceOverride?: string,
): DailyEditorial {
  const todaysRead = buildTodaysReadFromDrip(signals);
  const categories = [...new Set(signals.map((s) => categoryForSignal(s.metric)))];
  const networks = new Set(signals.map((s) => s.network));
  const whyItMatters = buildDailyWhyItMatters({
    categories,
    networkCount: networks.size,
    signalCount: signals.length,
    signals,
  });

  const fullEvidence = fullEvidenceOverride || buildFullEvidenceFromDrip(signals);
  const markdown = wrapDualLayerDaily({
    title: `# DePIN Signal Brief — ${dateLabel}`,
    dateLine: `> ${dateLabel} · machine-driven signal publication · evidence first`,
    todaysRead,
    whyItMatters,
    fullEvidence,
  });

  const clean = assertClean(markdown, "editorial-daily");
  assertEditorialRule(clean, "daily", "daily.md");

  if (DAILY_EDITORIAL.allowInterpretation) {
    throw new Error("[editorial:daily] misconfiguration: interpretation must stay off");
  }

  return {
    date: dateLabel,
    todaysRead,
    whyItMatters,
    facts: todaysRead,
    markdown: clean,
  };
}
