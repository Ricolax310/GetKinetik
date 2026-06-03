// Weekly editorial — executive layer + taxonomy patterns + full evidence appendix.

import type { Signal } from "../drip-engine/signal-loader.ts";
import type { Pattern } from "../drip-engine/cross-network-aggregator.ts";
import { factLine, weeklyPatterns } from "../drip-engine/narrative-builder.ts";
import { categoryForSignal, TAXONOMY_V2_CATEGORIES } from "../drip-engine/taxonomy.ts";
import { assertClean } from "../drip-engine/sanitize.ts";
import { WEEKLY_EDITORIAL, assertEditorialRule } from "./rules.ts";
import { buildWeeklyExecutiveBullets, wrapDualLayerWeekly } from "./executive.mjs";

export interface WeeklyEditorial {
  week: number;
  title: string;
  summary: string[];
  markdown: string;
  substackTitle: string;
}

function groupByNetwork(signals: Signal[]): Map<string, Signal[]> {
  const m = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = m.get(s.network) || [];
    arr.push(s);
    m.set(s.network, arr);
  }
  return m;
}

function sectionThisWeekInSignals(signals: Signal[]): string[] {
  const lines: string[] = ["## This Week In Signals", ""];
  if (!signals.length) {
    lines.push("No signals met the weekly confidence threshold (0.8) this window.");
    return lines;
  }
  const nets = groupByNetwork(signals);
  lines.push(
    `Cross-network summary: ${signals.length} signal(s) across ${nets.size} network(s) from public infrastructure reads.`,
    "",
  );
  for (const [network, netSignals] of [...nets.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`**${network}**`);
    for (const s of netSignals) lines.push(`- ${factLine(s)}`);
    lines.push("");
  }
  return lines;
}

function sectionCrossNetworkPatterns(patterns: Pattern[]): string[] {
  const lines: string[] = ["## Cross-Network Patterns", ""];
  lines.push(`Taxonomy v2: ${TAXONOMY_V2_CATEGORIES.join(" · ")}`, "");
  const tagged = patterns.filter((p) => p.scope === "cross-network" || p.scope === "systemic" || p.scope === "localized");
  if (!tagged.length) {
    lines.push("No tagged patterns this week.");
    lines.push("");
    return lines;
  }
  for (const p of tagged) {
    lines.push(`### ${p.headline}`, "");
    lines.push(`- **Category:** ${p.category}`);
    lines.push(`- **Scope:** ${p.scope}`);
    lines.push(`- **Classification:** ${p.classification}`);
    lines.push(`- **Networks:** ${p.networks.join(", ")}`);
    lines.push("", p.description, "");
  }
  for (const line of weeklyPatterns(patterns)) {
    if (!tagged.some((p) => line.includes(p.headline))) lines.push(`- ${line}`);
  }
  lines.push("");
  return lines;
}

function sectionSystemicObservations(patterns: Pattern[]): string[] {
  const lines: string[] = ["## Systemic Observations", ""];
  const systemic = patterns.filter((p) => p.scope === "systemic");
  if (!systemic.length) {
    lines.push("No systemic-scope patterns directly supported by multi-network data this week.");
    lines.push("");
    return lines;
  }
  for (const p of systemic) {
    lines.push(`- ${p.headline}: ${p.description}`);
  }
  lines.push("");
  return lines;
}

function buildFullEvidenceAppendix(signals: Signal[]): string {
  const lines: string[] = [];
  lines.push("### Detailed signal table", "");
  lines.push("| Network | Metric | Value | Delta | Severity | Category |");
  lines.push("|---|---|---:|---:|---|---|");
  for (const s of signals
    .slice()
    .sort((a, b) => a.network.localeCompare(b.network) || a.metric.localeCompare(b.metric))) {
    lines.push(
      `| ${s.network} | ${s.metric} | ${s.value} | ${s.delta} | ${s.severity} | ${categoryForSignal(s.metric)} |`,
    );
  }
  lines.push("", "### Sources & Methodology", "");
  lines.push("- Weekly aggregation from daily signal runs · `signals/history.json`");
  lines.push("- Cross-network patterns from `drip-engine/cross-network-aggregator.ts`");
  lines.push("- Evidence not verdicts · public endpoints only");
  return lines.join("\n");
}

export function buildWeeklyEditorial(
  signals: Signal[],
  patterns: Pattern[],
  weekNumber: number,
  fullEvidenceOverride?: string,
): WeeklyEditorial {
  const title = `DePIN Signal Intelligence — Week ${weekNumber}`;
  const executive = buildWeeklyExecutiveBullets({
    signalCount: signals.length,
    networkCount: groupByNetwork(signals).size,
    patterns,
    weekLabel: String(weekNumber),
  });

  const bodySections = [
    sectionThisWeekInSignals(signals),
    sectionCrossNetworkPatterns(patterns),
    sectionSystemicObservations(patterns),
  ];

  const markdown = wrapDualLayerWeekly({
    title: `# ${title}`,
    dateLine: `> Week ${weekNumber} · machine-driven signal publication · evidence first`,
    executive,
    bodySections,
    fullEvidence: fullEvidenceOverride || buildFullEvidenceAppendix(signals),
  });

  const clean = assertClean(markdown, "editorial-weekly");
  assertEditorialRule(clean, "weekly", "substack");

  return {
    week: weekNumber,
    title,
    summary: executive,
    markdown: clean,
    substackTitle: title,
  };
}
