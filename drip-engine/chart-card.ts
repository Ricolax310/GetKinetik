// DePIN index cards — three instruments, three questions:
//   daily   → What changed today?        (market close)
//   weekly  → What kept showing up?      (case file / intelligence briefing)
//   monthly → What does the ecosystem look like? (state report)

import { loadFeedBundle, loadRecentHistory, type Signal, type SectorSummary } from "./signal-loader.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import { categoryForSignal } from "./taxonomy.ts";
import { buildTodaysReadFromDrip, buildDailyWhyItMatters } from "../editorial-engine/executive.mjs";

const W = 1200;
const H = 675;
export type CardMode = "daily" | "weekly" | "monthly";

const C = {
  obsidian: "#0A0A0A",
  obsidianSoft: "#111113",
  obsidianEdge: "#1A1A1D",
  rubyCore: "#FF1430",
  rubyMid: "#B00820",
  sapphireCore: "#007BFF",
  sapphireGlow: "#3A9BFF",
  platinum: "#E6E8EC",
  graphite: "#6A6C72",
  muted: "#9AA0A8",
  hairline: "rgba(230, 232, 236, 0.10)",
  neonYellow: "#E8FF3B",
};

const FONT = "Segoe UI, system-ui, -apple-system, sans-serif";

const CAT_COLOR: Record<string, string> = {
  IDENTITY: C.rubyCore,
  INFRASTRUCTURE: C.sapphireCore,
  ECONOMICS: "#7FA8FF",
  CAPACITY: C.neonYellow,
  CONSISTENCY: "#BFD14A",
  BEHAVIORAL: "#8AB7E8",
};

const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

const SECTOR_COLOR: Record<string, string> = {
  integrity: C.rubyCore,
  health: C.sapphireCore,
  growth: C.neonYellow,
  economics: "#7FA8FF",
};

const METRIC_LABELS: Record<string, string> = {
  exactDupGroups: "duplicate coordinate groups",
  observed: "observed entities",
  flaggedPct: "flagged share",
  overCapacityCells: "over-capacity cells",
  overCapacityPct: "over-capacity share",
  top20ShareOfSupply: "top 20 holder share",
  identityCollisions: "identity collisions",
  scaffold: "scaffold score",
  kmFrozenDays: "flat coverage days",
  drivers: "drivers",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortNet(name: string): string {
  return name.replace(/ Network$/i, "");
}

function shortLabel(s: string, max = 20): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Word-wrap for SVG text lines (no mid-word breaks). */
function wrapLines(s: string, maxChars: number, maxLines: number): string[] {
  const words = s.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    const used = lines.join(" ").length;
    if (used < s.replace(/\s+/g, " ").trim().length) {
      lines[maxLines - 1] = shortLabel(lines[maxLines - 1], maxChars);
    }
  }
  return lines;
}

function svgTextBlock(
  x: number,
  y: number,
  text: string,
  opts: { maxChars: number; maxLines: number; lineHeight: number; fill: string; size: number; weight?: number },
): string {
  return wrapLines(text, opts.maxChars, opts.maxLines)
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * opts.lineHeight}" fill="${opts.fill}" font-family="${FONT}" font-size="${opts.size}"${opts.weight ? ` font-weight="${opts.weight}"` : ""}>${esc(line)}</text>`,
    )
    .join("");
}

function sectionTitle(x: number, y: number, label: string): string {
  return `<text x="${x}" y="${y}" fill="${C.muted}" font-family="${FONT}" font-size="12" font-weight="700">${esc(label)}</text>`;
}

function humanCategory(cat: string): string {
  return cat.charAt(0) + cat.slice(1).toLowerCase().replace(/_/g, " ");
}

function metricShort(metric: string): string {
  const short: Record<string, string> = {
    exactDupGroups: "dup groups",
    observed: "entities",
    overCapacityCells: "hot cells",
    overCapacityPct: "over cap",
    top20ShareOfSupply: "top 20%",
    kmFrozenDays: "flat days",
    drivers: "drivers",
    flaggedPct: "flagged",
    detectionsZeroDays: "zero days",
  };
  return short[metric] || shortLabel(metricLabel(metric), 11);
}

function metricLabel(metric: string): string {
  if (METRIC_LABELS[metric]) return METRIC_LABELS[metric];
  return metric
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/top20/gi, "top 20")
    .replace(/20share/gi, "20 share")
    .replace(/pct/gi, "%")
    .toLowerCase();
}

interface NetworkBundle {
  network: string;
  metrics: Signal[];
}

function fmtValue(s: Signal): string {
  if (/share|pct/i.test(s.metric)) return `${(s.value * 100).toFixed(1)}%`;
  if (s.value >= 1000) return s.value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return String(Math.round(s.value * 100) / 100);
}

function deltaText(s: Signal): string {
  if (s.delta === 0) return "unchanged";
  const sign = s.delta > 0 ? "+" : "−";
  const abs = Math.abs(s.delta);
  if (/share|pct/i.test(s.metric)) return `${sign}${(abs * 100).toFixed(1)} pp`;
  if (abs >= 1000) return `${sign}${abs.toLocaleString()}`;
  return `${sign}${Math.round(abs * 100) / 100}`;
}

function deltaColor(s: Signal): string {
  if (s.delta > 0) return C.neonYellow;
  if (s.delta < 0) return C.rubyCore;
  return C.graphite;
}

function formatDateLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const week = label.match(/Week\s+(\d+)/i);
  if (week) return `Week ${week[1]} · rolling 7-day window`;
  const month = label.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    const d = new Date(`${month[1]}-${month[2]}-01T12:00:00Z`);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  return label;
}

function facetedRectPath(x: number, y: number, w: number, h: number, cut = 10): string {
  return [
    `M ${x + cut} ${y}`,
    `L ${x + w - cut} ${y}`,
    `L ${x + w} ${y + cut}`,
    `L ${x + w} ${y + h - cut}`,
    `L ${x + w - cut} ${y + h}`,
    `L ${x + cut} ${y + h}`,
    `L ${x} ${y + h - cut}`,
    `L ${x} ${y + cut}`,
    "Z",
  ].join(" ");
}

const DAILY_FEATURED_MAX = 3;

function signalImportance(s: Signal): number {
  const moved = s.delta !== 0 ? 50 : 0;
  return (SEV_RANK[s.severity] || 0) * 100 + moved + Math.abs(s.delta || 0) * 20;
}

/** Daily card — only networks worth highlighting (movement + severity), not the full fleet. */
function pickNetworkBundles(signals: Signal[], max = DAILY_FEATURED_MAX): NetworkBundle[] {
  const ranked = signals.slice().sort(
    (a, b) => signalImportance(b) - signalImportance(a) || shortNet(a.network).localeCompare(shortNet(b.network)),
  );

  const byNetwork = new Map<string, Signal[]>();
  for (const s of ranked) {
    const k = shortNet(s.network);
    const list = byNetwork.get(k) || [];
    list.push(s);
    byNetwork.set(k, list);
  }

  return [...byNetwork.entries()]
    .map(([network, all]) => {
      const picked: Signal[] = [];
      const seenMetric = new Set<string>();
      for (const s of all) {
        if (seenMetric.has(s.metric)) continue;
        seenMetric.add(s.metric);
        picked.push(s);
        if (picked.length >= 2) break;
      }
      const hasMovement = all.some((s) => s.delta !== 0);
      const score = Math.max(...all.map(signalImportance));
      return { network, metrics: picked, hasMovement, score };
    })
    .sort((a, b) => {
      if (a.hasMovement !== b.hasMovement) return a.hasMovement ? -1 : 1;
      return b.score - a.score;
    })
    .slice(0, max)
    .map(({ network, metrics }) => ({ network, metrics }));
}

function categoryCounts(signals: Signal[]): { cat: string; n: number }[] {
  const m = new Map<string, number>();
  for (const s of signals) {
    const cat = categoryForSignal(s.metric);
    m.set(cat, (m.get(cat) || 0) + 1);
  }
  return [...m.entries()]
    .map(([cat, n]) => ({ cat, n }))
    .sort((a, b) => b.n - a.n);
}

function movedCount(signals: Signal[]): { up: number; down: number; flat: number } {
  let up = 0;
  let down = 0;
  let flat = 0;
  for (const s of signals) {
    if (s.delta > 0) up++;
    else if (s.delta < 0) down++;
    else flat++;
  }
  return { up, down, flat };
}

function groupByNetwork(signals: Signal[]): { network: string; signals: Signal[] }[] {
  const m = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = m.get(s.network) || [];
    arr.push(s);
    m.set(s.network, arr);
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([network, netSignals]) => ({ network, signals: netSignals }));
}

function weekNumberFromLabel(label: string): string {
  const m = label.match(/Week\s+(\d+)/i);
  return m ? m[1] : label;
}

interface CaseChangeRow {
  network: string;
  stat: string;
  tone: string;
}

function formatPersistentChange(s: Signal): string {
  const sign = s.delta > 0 ? "+" : "−";
  const abs = Math.abs(s.delta);
  const unit = metricShort(s.metric);
  if (/share|pct/i.test(s.metric)) return `${sign}${(abs * 100).toFixed(1)} pp ${unit}`;
  if (abs >= 1000) return `${sign}${abs.toLocaleString()} ${unit}`;
  return `${sign}${Math.round(abs * 100) / 100} ${unit}`;
}

/** Networks whose metrics moved most persistently this week — observation, not ranking. */
function weeklyPersistentChanges(signals: Signal[], max = 5): CaseChangeRow[] {
  return groupByNetwork(signals)
    .map(({ network, signals: ss }) => {
      const moved = ss.filter((s) => s.delta !== 0);
      const best = moved.length
        ? moved.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
        : null;
      if (!best) return null;
      return {
        network: shortNet(network),
        stat: formatPersistentChange(best),
        score: Math.abs(best.delta),
        tone: best.delta > 0 ? C.neonYellow : C.rubyCore,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ network, stat, tone }) => ({ network, stat, tone }));
}

interface CategoryTrend {
  label: string;
  glyph: string;
  tone: string;
}

/** Category-level direction summary for the weekly briefing panel. */
function weeklyCategoryTrends(signals: Signal[]): CategoryTrend[] {
  const buckets = new Map<string, { up: number; down: number }>();
  for (const s of signals) {
    const cat = categoryForSignal(s.metric);
    const b = buckets.get(cat) || { up: 0, down: 0 };
    if (s.delta > 0) b.up++;
    else if (s.delta < 0) b.down++;
    buckets.set(cat, b);
  }
  return [...buckets.entries()]
    .map(([cat, { up, down }]) => {
      const dir = up > down ? "up" : down > up ? "down" : "flat";
      const glyph = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
      const tone = dir === "up" ? C.neonYellow : dir === "down" ? C.rubyCore : C.graphite;
      return { label: `${humanCategory(cat)} signals`, glyph, tone, total: up + down };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function weeklyFieldNotes(patterns: Pattern[]): string[] {
  const cross = patterns.filter((p) => p.scope === "cross-network" || p.scope === "systemic");
  const pool = cross.length ? cross : patterns;
  return pool.slice(0, 2).map((p) => shortLabel(p.headline, 72));
}

function renderCaseFileRows(rows: CaseChangeRow[], x: number, y: number, w: number): string {
  if (!rows.length) {
    return `<text x="${x + 16}" y="${y + 28}" fill="${C.muted}" font-family="${FONT}" font-size="13">No persistent metric changes this week.</text>`;
  }
  return rows
    .map((row, i) => {
      const ry = y + i * 52;
      return `
      ${i > 0 ? `<line x1="${x + 12}" y1="${ry - 4}" x2="${x + w - 12}" y2="${ry - 4}" stroke="${C.hairline}"/>` : ""}
      <rect x="${x + 12}" y="${ry + 6}" width="3" height="32" fill="${C.sapphireGlow}" opacity="0.85"/>
      <text x="${x + 28}" y="${ry + 30}" fill="${C.platinum}" font-family="${FONT}" font-size="16" font-weight="600">${esc(row.network)}</text>
      <text x="${x + w - 16}" y="${ry + 30}" fill="${row.tone}" font-family="${FONT}" font-size="14" font-weight="600" text-anchor="end">${esc(row.stat)}</text>`;
    })
    .join("");
}

function renderEmergingPatterns(trends: CategoryTrend[], x: number, y: number, w: number): string {
  if (!trends.length) {
    return `<text x="${x}" y="${y + 16}" fill="${C.graphite}" font-family="${FONT}" font-size="12">No category trends this week.</text>`;
  }
  return trends
    .map((t, i) => {
      const iy = y + i * 36;
      return `
      <text x="${x}" y="${iy + 16}" fill="${C.platinum}" font-family="${FONT}" font-size="14">${esc(t.label)}</text>
      <text x="${x + w}" y="${iy + 16}" fill="${t.tone}" font-family="${FONT}" font-size="20" font-weight="700" text-anchor="end">${t.glyph}</text>`;
    })
    .join("");
}

interface PersistentRow {
  network: string;
  label: string;
  days: number;
}

function persistentObservations(history: { date: string; signals: Signal[] }[], minDays = 3): PersistentRow[] {
  const keyDays = new Map<string, Set<string>>();
  for (const day of history) {
    for (const s of day.signals) {
      const key = `${shortNet(s.network)}::${s.metric}`;
      const set = keyDays.get(key) || new Set<string>();
      set.add(day.date);
      keyDays.set(key, set);
    }
  }
  return [...keyDays.entries()]
    .map(([key, days]) => {
      const [network, metric] = key.split("::");
      return { network, label: metricShort(metric), days: days.size };
    })
    .filter((r) => r.days >= minDays)
    .sort((a, b) => b.days - a.days || a.network.localeCompare(b.network))
    .slice(0, 5);
}

function renderCategoryDistribution(cats: { cat: string; n: number }[], cx: number, cy: number, r: number): string {
  const total = Math.max(1, cats.reduce((sum, c) => sum + c.n, 0));
  let svg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.obsidian}" stroke="${C.hairline}"/>`;
  let angle = -Math.PI / 2;
  cats.forEach((c) => {
    const slice = (c.n / total) * Math.PI * 2;
    const x1 = cx + Math.cos(angle) * r;
    const y1 = cy + Math.sin(angle) * r;
    angle += slice;
    const x2 = cx + Math.cos(angle) * r;
    const y2 = cy + Math.sin(angle) * r;
    const large = slice > Math.PI ? 1 : 0;
    const color = CAT_COLOR[c.cat] || C.sapphireCore;
    svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" opacity="0.92"/>`;
  });
  svg += `<circle cx="${cx}" cy="${cy}" r="${Math.round(r * 0.52)}" fill="${C.obsidianSoft}"/>`;
  svg += `<text x="${cx}" y="${cy - 4}" fill="${C.platinum}" font-family="${FONT}" font-size="20" font-weight="700" text-anchor="middle">${total}</text>`;
  svg += `<text x="${cx}" y="${cy + 14}" fill="${C.muted}" font-family="${FONT}" font-size="10" text-anchor="middle">signals</text>`;
  let legend = "";
  cats.slice(0, 5).forEach((c, i) => {
    const ly = cy + r + 28 + i * 22;
    const color = CAT_COLOR[c.cat] || C.sapphireCore;
    legend += `
      <rect x="${cx - r}" y="${ly - 10}" width="10" height="10" fill="${color}"/>
      <text x="${cx - r + 16}" y="${ly}" fill="${C.muted}" font-family="${FONT}" font-size="11">${esc(humanCategory(c.cat))}</text>
      <text x="${cx + r}" y="${ly}" fill="${C.platinum}" font-family="${FONT}" font-size="11" font-weight="700" text-anchor="end">${c.n}</text>`;
  });
  return svg + legend;
}

function renderNetworkCoverageGrid(signals: Signal[], x: number, y: number, w: number): string {
  const nets = groupByNetwork(signals);
  const cols = Math.min(4, Math.max(2, nets.length));
  const cell = Math.floor((w - 16) / cols);
  return nets
    .slice(0, 8)
    .map((block, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = x + col * cell + cell / 2;
      const cy = y + row * 72 + 36;
      const dotR = 22;
      const hasHigh = block.signals.some((s) => s.severity === "high");
      const hasMed = block.signals.some((s) => s.severity === "medium");
      const color = hasHigh ? C.rubyCore : hasMed ? C.sapphireGlow : C.graphite;
      return `
      <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${C.obsidianSoft}" stroke="${color}" stroke-width="2"/>
      <text x="${cx}" y="${cy + 4}" fill="${C.platinum}" font-family="${FONT}" font-size="11" font-weight="700" text-anchor="middle">${block.signals.length}</text>
      <text x="${cx}" y="${cy + 36}" fill="${C.muted}" font-family="${FONT}" font-size="10" text-anchor="middle">${esc(shortLabel(shortNet(block.network), 12))}</text>`;
    })
    .join("");
}

/** Daily viz — vertical movement bars (up / down / flat counts). */
function renderMovementBars(move: { up: number; down: number; flat: number }, x: number, y: number, w: number, h: number): string {
  const max = Math.max(1, move.up, move.down, move.flat);
  const barW = Math.floor((w - 24) / 3);
  const items = [
    { key: "up", n: move.up, color: C.neonYellow, label: "up" },
    { key: "down", n: move.down, color: C.rubyCore, label: "down" },
    { key: "flat", n: move.flat, color: C.graphite, label: "flat" },
  ];
  return items
    .map((item, i) => {
      const bx = x + i * (barW + 8);
      const bh = Math.max(8, Math.round((item.n / max) * (h - 36)));
      const by = y + h - 16 - bh;
      return `
      <rect x="${bx}" y="${y + 8}" width="${barW}" height="${h - 24}" fill="${C.obsidian}" stroke="${C.hairline}"/>
      <rect x="${bx + 3}" y="${by}" width="${barW - 6}" height="${bh}" fill="${item.color}"/>
      <text x="${bx + barW / 2}" y="${y + h - 2}" fill="${C.graphite}" font-family="system-ui,sans-serif" font-size="10" text-anchor="middle">${item.label}</text>
      <text x="${bx + barW / 2}" y="${by - 4}" fill="${item.color}" font-family="system-ui,sans-serif" font-size="12" font-weight="700" text-anchor="middle">${item.n}</text>`;
    })
    .join("");
}

/** Monthly viz — horizontal sector composition bar from accumulated signal counts. */
function renderSectorStackBar(sectors: SectorSummary[], x: number, y: number, w: number): string {
  const total = Math.max(1, sectors.reduce((sum, s) => sum + s.signalCount, 0));
  let cursor = x;
  const segments = sectors
    .map((sec) => {
      const segW = Math.max(14, Math.round((sec.signalCount / total) * w));
      const color = SECTOR_COLOR[sec.type] || C.sapphireCore;
      const seg = `<rect x="${cursor}" y="${y}" width="${segW}" height="22" fill="${color}"/>`;
      cursor += segW;
      return seg;
    })
    .join("");
  return `
    <rect x="${x}" y="${y}" width="${w}" height="22" fill="${C.obsidian}" stroke="${C.hairline}"/>
    ${segments}
    <text x="${x}" y="${y + 40}" fill="${C.muted}" font-family="${FONT}" font-size="11">${total} signals across ${sectors.length} sectors</text>`;
}

type NetworkVizKind = "dup" | "capacity" | "economics" | "telemetry" | "identity" | "default";

const VIZ_LABEL: Record<NetworkVizKind, string> = {
  dup: "Registry",
  capacity: "Capacity",
  economics: "Supply",
  telemetry: "Telemetry",
  identity: "Identity",
  default: "Metrics",
};

function metricByKey(metrics: Signal[], key: string): Signal | undefined {
  return metrics.find((m) => m.metric === key);
}

/** Pick the chart type that best fits this network's public signal shape. */
function inferNetworkVizKind(network: string, metrics: Signal[]): NetworkVizKind {
  const keys = new Set(metrics.map((s) => s.metric));
  if (keys.has("exactDupGroups")) return "dup";
  if (keys.has("overCapacityCells") || keys.has("overCapacityPct")) return "capacity";
  if (keys.has("top20ShareOfSupply")) return "economics";
  if (keys.has("kmFrozenDays") || keys.has("drivers") || keys.has("detectionsZeroDays")) return "telemetry";
  if (keys.has("flaggedPct") || keys.has("identityCollisions")) return "identity";
  const n = network.toLowerCase();
  if (/geodnet|dawn|nodle|grass/.test(n)) return "dup";
  if (/weatherxm/.test(n)) return "capacity";
  if (/hivemapper/.test(n)) return "economics";
  if (/natix/.test(n)) return "telemetry";
  return "default";
}

/** Geodnet / Dawn / Nodle — dup groups vs fleet size (ratio bar, not a rank). */
function renderDupViz(x: number, y: number, w: number, metrics: Signal[]): string {
  const dup = metricByKey(metrics, "exactDupGroups");
  const obs = metricByKey(metrics, "observed");
  const dupN = dup?.value ?? 0;
  const obsN = obs?.value ?? 1;
  const ratio = Math.min(1, dupN / Math.max(1, obsN));
  const barW = w - 24;
  const fillW = Math.max(6, Math.round(ratio * barW));
  return `
    <text x="${x + 12}" y="${y + 14}" fill="${C.muted}" font-family="${FONT}" font-size="10">Duplicate groups vs fleet</text>
    <rect x="${x + 12}" y="${y + 22}" width="${barW}" height="10" fill="${C.obsidian}" stroke="${C.hairline}"/>
    <rect x="${x + 12}" y="${y + 22}" width="${fillW}" height="10" fill="${C.rubyCore}"/>
    <text x="${x + 12}" y="${y + 48}" fill="${C.platinum}" font-family="system-ui,sans-serif" font-size="18" font-weight="700">${esc(fmtValue(dup || { metric: "exactDupGroups", value: dupN, delta: 0 } as Signal))}</text>
    <text x="${x + 12 + barW}" y="${y + 48}" fill="${dup ? deltaColor(dup) : C.graphite}" font-family="system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="end">${esc(dup ? deltaText(dup) : "")}</text>
    <text x="${x + 12}" y="${y + 64}" fill="${C.muted}" font-family="${FONT}" font-size="10">Fleet ${esc(obs ? fmtValue(obs) : "—")}</text>
    <text x="${x + 12 + barW}" y="${y + 64}" fill="${obs ? deltaColor(obs) : C.graphite}" font-family="system-ui,sans-serif" font-size="10" text-anchor="end">${esc(obs ? deltaText(obs) : "")}</text>`;
}

/** WeatherXM — over-capacity cells as a coverage grid snapshot. */
function renderCapacityViz(x: number, y: number, w: number, metrics: Signal[]): string {
  const cells = metricByKey(metrics, "overCapacityCells");
  const pct = metricByKey(metrics, "overCapacityPct");
  const hot = cells?.value ?? 0;
  const share = pct?.value ?? 0.03;
  const cols = 10;
  const rows = 4;
  const cell = 14;
  const gap = 2;
  let grid = "";
  const hotCells = Math.min(cols * rows, Math.max(1, Math.round(share * cols * rows * 3)));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cx = x + 12 + c * (cell + gap);
      const cy = y + 20 + r * (cell + gap);
      const fill = idx < hotCells ? C.neonYellow : C.obsidianEdge;
      grid += `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" fill="${fill}" stroke="${C.hairline}"/>`;
    }
  }
  return `
    ${grid}
    <text x="${x + 12}" y="${y + 86}" fill="${C.platinum}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${esc(fmtValue(cells || { metric: "overCapacityCells", value: hot, delta: 0 } as Signal))} hot cells</text>
    <text x="${x + w - 12}" y="${y + 86}" fill="${cells ? deltaColor(cells) : C.graphite}" font-family="system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="end">${esc(cells ? deltaText(cells) : "")}</text>
    <text x="${x + 12}" y="${y + 100}" fill="${C.muted}" font-family="${FONT}" font-size="10">${esc(pct ? `${fmtValue(pct)} of map over capacity` : "Capacity stress")}</text>`;
}

/** Hivemapper — top-holder concentration arc (supply shape, not a leaderboard). */
function renderEconomicsViz(x: number, y: number, w: number, metrics: Signal[]): string {
  const top = metricByKey(metrics, "top20ShareOfSupply") || metrics[0];
  const share = Math.min(1, Math.max(0, top.value));
  const cx = x + w / 2;
  const cy = y + 54;
  const r = 34;
  const endAngle = Math.PI * (1 - share);
  const ex = cx + Math.cos(endAngle) * r;
  const ey = cy - Math.sin(endAngle) * r;
  const large = share > 0.5 ? 1 : 0;
  return `
    <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="${C.obsidianEdge}" stroke-width="7"/>
    <path d="M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}" fill="none" stroke="#7FA8FF" stroke-width="7"/>
    <text x="${cx}" y="${cy - 8}" fill="${C.platinum}" font-family="system-ui,sans-serif" font-size="20" font-weight="700" text-anchor="middle">${esc(fmtValue(top))}</text>
    <text x="${cx}" y="${cy + 10}" fill="${C.muted}" font-family="${FONT}" font-size="10" text-anchor="middle">Top 20 holder share</text>
    <text x="${cx}" y="${cy + 26}" fill="${deltaColor(top)}" font-family="system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="middle">${esc(deltaText(top))}</text>`;
}

/** Natix — frozen telemetry counter + driver momentum lane. */
function renderTelemetryViz(x: number, y: number, w: number, metrics: Signal[]): string {
  const frozen = metricByKey(metrics, "kmFrozenDays") || metrics.find((m) => /frozen/i.test(m.metric));
  const drivers = metricByKey(metrics, "drivers");
  const laneW = Math.floor((w - 36) / 2);
  const driverH = drivers ? Math.min(40, Math.max(8, Math.round(Math.abs(drivers.delta) / 10))) : 8;
  return `
    <rect x="${x + 12}" y="${y + 18}" width="${laneW}" height="58" fill="${C.obsidian}" stroke="${C.hairline}"/>
    <text x="${x + 12 + laneW / 2}" y="${y + 38}" fill="${C.sapphireGlow}" font-family="system-ui,sans-serif" font-size="22" font-weight="700" text-anchor="middle">${frozen ? Math.round(frozen.value) : "—"}</text>
    <text x="${x + 12 + laneW / 2}" y="${y + 54}" fill="${C.graphite}" font-family="system-ui,sans-serif" font-size="9" text-anchor="middle">flat days</text>
    <text x="${x + 12 + laneW / 2}" y="${y + 68}" fill="${frozen ? deltaColor(frozen) : C.graphite}" font-family="system-ui,sans-serif" font-size="9" text-anchor="middle">${frozen ? deltaText(frozen) : ""}</text>
    <rect x="${x + 24 + laneW}" y="${y + 18}" width="${laneW}" height="58" fill="${C.obsidian}" stroke="${C.hairline}"/>
    <text x="${x + 24 + laneW + laneW / 2}" y="${y + 34}" fill="${C.graphite}" font-family="system-ui,sans-serif" font-size="9" text-anchor="middle">drivers</text>
    <rect x="${x + 32 + laneW}" y="${y + 68 - driverH}" width="${laneW - 16}" height="${driverH}" fill="${drivers && drivers.delta >= 0 ? C.neonYellow : C.rubyCore}"/>
    <text x="${x + 24 + laneW + laneW / 2}" y="${y + 54}" fill="${C.platinum}" font-family="system-ui,sans-serif" font-size="14" font-weight="700" text-anchor="middle">${drivers ? fmtValue(drivers) : "—"}</text>
    <text x="${x + 24 + laneW + laneW / 2}" y="${y + 68}" fill="${drivers ? deltaColor(drivers) : C.graphite}" font-family="system-ui,sans-serif" font-size="9" text-anchor="middle">${drivers ? deltaText(drivers) : ""}</text>`;
}

/** Identity-heavy networks — flagged share bar. */
function renderIdentityViz(x: number, y: number, w: number, metrics: Signal[]): string {
  const flagged = metricByKey(metrics, "flaggedPct") || metrics[0];
  const obs = metricByKey(metrics, "observed");
  const share = Math.min(1, Math.max(0, flagged.value));
  const barW = w - 24;
  return `
    <text x="${x + 12}" y="${y + 14}" fill="${C.graphite}" font-family="system-ui,sans-serif" font-size="9">flagged fleet share</text>
    <rect x="${x + 12}" y="${y + 22}" width="${barW}" height="12" fill="${C.obsidian}" stroke="${C.hairline}"/>
    <rect x="${x + 12}" y="${y + 22}" width="${Math.max(4, Math.round(share * barW))}" height="12" fill="${C.rubyCore}"/>
    <text x="${x + 12}" y="${y + 52}" fill="${C.platinum}" font-family="system-ui,sans-serif" font-size="18" font-weight="700">${esc(fmtValue(flagged))}</text>
    <text x="${x + 12 + barW}" y="${y + 52}" fill="${deltaColor(flagged)}" font-family="system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="end">${esc(deltaText(flagged))}</text>
    <text x="${x + 12}" y="${y + 68}" fill="${C.graphite}" font-family="system-ui,sans-serif" font-size="10">${obs ? `${fmtValue(obs)} entities mapped` : "identity read"}</text>`;
}

function renderDefaultMetricViz(x: number, y: number, w: number, metrics: Signal[]): string {
  const primary = metrics[0];
  const secondary = metrics[1];
  if (!primary) return "";
  const pMetric = metricLabel(primary.metric);
  const sMetric = secondary ? metricLabel(secondary.metric) : "";
  return `
    <text x="${x + 14}" y="${y + 20}" fill="${C.graphite}" font-family="system-ui,sans-serif" font-size="10">${esc(shortLabel(pMetric, 28))}</text>
    <text x="${x + 14}" y="${y + 42}" fill="${C.platinum}" font-family="system-ui,sans-serif" font-size="17" font-weight="700">${esc(fmtValue(primary))}</text>
    <text x="${x + w - 14}" y="${y + 42}" fill="${deltaColor(primary)}" font-family="system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="end">${esc(deltaText(primary))}</text>
    ${secondary ? `<text x="${x + 14}" y="${y + 62}" fill="${C.graphite}" font-family="system-ui,sans-serif" font-size="10">${esc(shortLabel(sMetric, 28))}</text>
    <text x="${x + 14}" y="${y + 78}" fill="${C.platinum}" font-family="system-ui,sans-serif" font-size="13" font-weight="700">${esc(fmtValue(secondary))}</text>
    <text x="${x + w - 14}" y="${y + 78}" fill="${deltaColor(secondary)}" font-family="system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="end">${esc(deltaText(secondary))}</text>` : ""}`;
}

function renderNetworkCardInner(b: NetworkBundle, x: number, y: number, cardW: number, accent: string): string {
  const kind = inferNetworkVizKind(b.network, b.metrics);
  const innerY = y + 34;
  let viz = "";
  if (kind === "dup") viz = renderDupViz(x, innerY, cardW, b.metrics);
  else if (kind === "capacity") viz = renderCapacityViz(x, innerY, cardW, b.metrics);
  else if (kind === "economics") viz = renderEconomicsViz(x, innerY, cardW, b.metrics);
  else if (kind === "telemetry") viz = renderTelemetryViz(x, innerY, cardW, b.metrics);
  else if (kind === "identity") viz = renderIdentityViz(x, innerY, cardW, b.metrics);
  else viz = renderDefaultMetricViz(x, innerY, cardW, b.metrics);
  return `
    <text x="${x + 14}" y="${y + 26}" fill="${C.platinum}" font-family="${FONT}" font-size="17" font-weight="700">${esc(shortLabel(b.network, 18))}</text>
    <text x="${x + cardW - 14}" y="${y + 26}" fill="${accent}" font-family="${FONT}" font-size="10" font-weight="600" text-anchor="end">${VIZ_LABEL[kind]}</text>
    ${viz}`;
}

function svgShell(gradId: string, topStops: [string, string, string], body: string, accent?: string): string {
  const accentSvg = accent || `<rect x="0" y="0" width="${W}" height="4" fill="url(#topline)"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.obsidianSoft}"/>
      <stop offset="100%" stop-color="${C.obsidian}"/>
    </linearGradient>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${topStops[0]}"/>
      <stop offset="60%" stop-color="${topStops[1]}"/>
      <stop offset="100%" stop-color="${topStops[2]}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${accentSvg}
  ${body}
</svg>`;
}

/** Daily — mirrors Daily Signal Brief: Today's Read → network evidence → movement. */
function renderDailySvg(signals: Signal[], _patterns: Pattern[], dateLabel: string): string {
  const bundles = pickNetworkBundles(signals);
  const featuredNets = new Set(bundles.map((b) => b.network));
  const otherCount = [...new Set(signals.map((s) => shortNet(s.network)))].filter((n) => !featuredNets.has(n)).length;
  const cats = categoryCounts(signals);
  const move = movedCount(signals);
  const todaysRead = buildTodaysReadFromDrip(signals).slice(0, 2);
  const whyItMatters = buildDailyWhyItMatters({
    categories: [...new Set(signals.map((s) => categoryForSignal(s.metric)))],
    networkCount: new Set(signals.map((s) => s.network)).size,
    signalCount: signals.length,
    signals,
  });
  const nets = [...new Set(signals.map((s) => shortNet(s.network)))];

  const readBullets = todaysRead
    .map((line, i) => {
      const y = 178 + i * 28;
      const color = i === 0 ? C.sapphireGlow : C.neonYellow;
      return `<polygon points="72,${y - 6} 80,${y} 72,${y + 6} 64,${y}" fill="${color}"/><text x="94" y="${y + 5}" fill="${C.platinum}" font-family="${FONT}" font-size="14">${esc(shortLabel(line, 96))}</text>`;
    })
    .join("");

  const cardsX = 56;
  const cardsY = 252;
  const cardsW = 756;
  const cardsH = 210;
  const cardW = 236;
  const cardH = 138;
  const gapX = 16;
  const cardStartY = cardsY + 52;
  const rowWidth = bundles.length * cardW + Math.max(0, bundles.length - 1) * gapX;
  const rowOffsetX = cardsX + 18 + Math.max(0, Math.floor((cardsW - 36 - rowWidth) / 2));

  let cardSvg = "";
  bundles.forEach((b, i) => {
    const x = rowOffsetX + i * (cardW + gapX);
    const y = cardStartY;
    const path = facetedRectPath(x, y, cardW, cardH, 10);
    const primary = b.metrics[0];
    const cat = categoryForSignal(primary.metric);
    const color = CAT_COLOR[cat] || C.sapphireCore;
    cardSvg += `
      <path d="${path}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
      <path d="M ${x + 1} ${y + 1} L ${x + cardW - 20} ${y + 1} L ${x + cardW - 11} ${y + 10} L ${x + 10} ${y + 10} Z" fill="${color}"/>
      ${renderNetworkCardInner(b, x, y, cardW, color)}
    `;
  });
  const otherNetworksNote =
    otherCount > 0
      ? `<text x="${cardsX + cardsW / 2}" y="${cardStartY + cardH + 22}" fill="${C.graphite}" font-family="${FONT}" font-size="11" text-anchor="middle">${otherCount} other network${otherCount === 1 ? "" : "s"} unchanged today</text>`
      : "";

  const catX = 836;
  const catY = cardsY;
  const catW = 308;
  const catH = 222;
  const totalCats = Math.max(1, cats.reduce((sum, c) => sum + c.n, 0));
  const stackX = catX + 18;
  const stackY = catY + 60;
  const stackW = catW - 36;
  const stackH = 26;
  let cursor = stackX;
  let catStack = "";
  cats.forEach((c, i) => {
    const segW = Math.max(10, Math.round((c.n / totalCats) * stackW));
    const color = CAT_COLOR[c.cat] || C.sapphireCore;
    catStack += `<rect x="${cursor}" y="${stackY}" width="${segW}" height="${stackH}" fill="${color}" ${i === 0 ? `stroke="${C.obsidianEdge}"` : ""}/>`;
    cursor += segW;
  });
  let catLegend = "";
  cats.forEach((c, i) => {
    const y = catY + 108 + i * 26;
    const color = CAT_COLOR[c.cat] || C.sapphireCore;
    catLegend += `
      <rect x="${catX + 18}" y="${y - 10}" width="10" height="10" fill="${color}"/>
      <text x="${catX + 36}" y="${y}" fill="${C.muted}" font-family="${FONT}" font-size="12">${esc(humanCategory(c.cat))}</text>
      <text x="${catX + catW - 16}" y="${y}" fill="${C.platinum}" font-family="system-ui,sans-serif" font-size="12" font-weight="700" text-anchor="end">${c.n}</text>
    `;
  });
  const movementBars = renderMovementBars(move, catX + 18, catY + 238, catW - 36, 46);

  const body = `
  <text x="56" y="54" fill="${C.sapphireGlow}" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="2">GETKINETIK</text>
  <text x="56" y="90" fill="${C.platinum}" font-family="${FONT}" font-size="42" font-weight="700">Daily Signal Brief</text>
  <text x="56" y="114" fill="${C.muted}" font-family="${FONT}" font-size="14">What changed across DePIN networks today</text>
  <text x="56" y="136" fill="${C.muted}" font-family="${FONT}" font-size="15">${esc(formatDateLabel(dateLabel))}</text>
  <text x="${W - 56}" y="88" fill="${C.platinum}" font-family="${FONT}" font-size="38" font-weight="700" text-anchor="end">${signals.length}</text>
  <text x="${W - 56}" y="118" fill="${C.muted}" font-family="${FONT}" font-size="13" text-anchor="end">${nets.length} networks tracked</text>

  <path d="${facetedRectPath(56, 148, 1088, 92, 8)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(72, 168, "Today's read")}
  ${readBullets}

  <path d="${facetedRectPath(cardsX, cardsY + 12, cardsW, cardsH, 12)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(cardsX + 16, cardsY + 36, "Today's movers")}
  ${cardSvg}
  ${otherNetworksNote}

  <path d="${facetedRectPath(catX, catY + 12, catW, catH, 12)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(catX + 16, catY + 36, "Signal mix")}
  <rect x="${stackX}" y="${stackY + 12}" width="${stackW}" height="${stackH}" fill="${C.obsidian}" stroke="${C.hairline}"/>
  ${catStack}
  ${catLegend}
  ${sectionTitle(catX + 16, catY + 228, "Movement today")}
  ${movementBars}

  <path d="${facetedRectPath(56, 492, 1088, 108, 12)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  <text x="72" y="528" fill="${C.neonYellow}" font-family="${FONT}" font-size="28" font-weight="700">↑ ${move.up}</text>
  <text x="158" y="528" fill="${C.rubyCore}" font-family="${FONT}" font-size="28" font-weight="700">↓ ${move.down}</text>
  <text x="244" y="528" fill="${C.muted}" font-family="${FONT}" font-size="28" font-weight="700">— ${move.flat}</text>
  <text x="72" y="546" fill="${C.muted}" font-family="${FONT}" font-size="11">metrics up · down · unchanged</text>
  <text x="380" y="516" fill="${C.muted}" font-family="${FONT}" font-size="12" font-weight="600">Why it matters</text>
  ${svgTextBlock(380, 532, whyItMatters[0] || "", { maxChars: 72, maxLines: 1, lineHeight: 14, fill: C.platinum, size: 12 })}
  ${svgTextBlock(380, 550, whyItMatters[1] || "", { maxChars: 72, maxLines: 2, lineHeight: 14, fill: C.muted, size: 12 })}
  ${whyItMatters[2] ? svgTextBlock(380, 580, whyItMatters[2], { maxChars: 72, maxLines: 1, lineHeight: 14, fill: C.muted, size: 11 }) : ""}
  <text x="${W - 72}" y="586" fill="${C.platinum}" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">getkinetik.app/site</text>`;

  return svgShell("topline", [C.sapphireCore, C.rubyCore, C.sapphireGlow], body);
}

/** Weekly — case file: persistent changes + emerging patterns (intelligence briefing, not scoreboard). */
function renderWeeklySvg(signals: Signal[], patterns: Pattern[], dateLabel: string): string {
  const weekNum = weekNumberFromLabel(dateLabel);
  const changes = weeklyPersistentChanges(signals);
  const trends = weeklyCategoryTrends(signals);
  const notes = weeklyFieldNotes(patterns);
  const nets = groupByNetwork(signals);

  const fileX = 56;
  const fileY = 168;
  const fileW = 640;
  const fileH = 340;
  const briefX = 728;
  const briefW = 416;

  const notesBlock = notes.length
    ? notes
        .map((line, i) => {
          const y = 548 + i * 28;
          return `<text x="${fileX + 24}" y="${y}" fill="${C.muted}" font-family="${FONT}" font-size="12">— ${esc(line)}</text>`;
        })
        .join("")
    : `<text x="${fileX + 24}" y="556" fill="${C.graphite}" font-family="${FONT}" font-size="12">No cross-network field notes this week.</text>`;

  const body = `
  <rect x="0" y="0" width="${W}" height="6" fill="${C.sapphireCore}"/>
  <rect x="0" y="6" width="${W}" height="2" fill="${C.graphite}" opacity="0.6"/>

  <text x="56" y="48" fill="${C.sapphireGlow}" font-family="${FONT}" font-size="12" font-weight="700" letter-spacing="3">GETKINETIK · WEEKLY</text>
  <text x="56" y="88" fill="${C.platinum}" font-family="${FONT}" font-size="38" font-weight="700">Weekly Signal Review</text>
  <text x="56" y="112" fill="${C.muted}" font-family="${FONT}" font-size="14">What kept showing up · neutral observation across networks</text>
  <text x="56" y="134" fill="${C.muted}" font-family="${FONT}" font-size="15">Week ${esc(weekNum)} · rolling 7-day window</text>
  <text x="${W - 56}" y="88" fill="${C.platinum}" font-family="${FONT}" font-size="34" font-weight="700" text-anchor="end">${nets.length}</text>
  <text x="${W - 56}" y="118" fill="${C.muted}" font-family="${FONT}" font-size="13" text-anchor="end">networks under review</text>

  <path d="${facetedRectPath(fileX, fileY, fileW, fileH, 10)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(fileX + 20, fileY + 28, "Most persistent changes")}
  ${renderCaseFileRows(changes, fileX + 16, fileY + 48, fileW - 32)}
  ${sectionTitle(fileX + 20, fileY + 288, "Field notes")}
  ${notesBlock}

  <path d="${facetedRectPath(briefX, 168, briefW, 340, 10)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(briefX + 16, 192, "Emerging patterns")}
  ${renderEmergingPatterns(trends, briefX + 24, 218, briefW - 48)}

  <path d="${facetedRectPath(briefX, 528, briefW, 100, 10)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(briefX + 16, 552, "Review posture")}
  <text x="${briefX + 24}" y="578" fill="${C.muted}" font-family="${FONT}" font-size="12">Observing networks — not ranking them.</text>
  <text x="${briefX + 24}" y="600" fill="${C.muted}" font-family="${FONT}" font-size="12">Public data · reproducible scans · neutral reads.</text>

  <text x="${W - 72}" y="648" fill="${C.platinum}" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">getkinetik.app/site</text>`;

  return svgShell("topline", [C.sapphireCore, C.sapphireGlow, C.graphite], body, `<rect x="0" y="0" width="3" height="${H}" fill="${C.sapphireCore}"/>`);
}

/** Monthly — ecosystem state cover: composition and persistence (no movers or deltas). */
function renderMonthlySvg(signals: Signal[], _patterns: Pattern[], dateLabel: string): string {
  const bundle = loadFeedBundle("monthly");
  const sectors = bundle.sectorSummary.length ? bundle.sectorSummary : [];
  const totals = bundle.totals;
  const totalSignals = totals.signals ?? signals.length;
  const totalNetworks = totals.activeNetworks ?? totals.networks ?? new Set(signals.map((s) => s.network)).size;
  const cardSignals = signals.length ? signals : bundle.signals;
  const cats = categoryCounts(cardSignals);
  const history = loadRecentHistory(30);
  const persistent = persistentObservations(history);

  const monthTitle = formatDateLabel(dateLabel);
  const sectorBar = sectors.length ? renderSectorStackBar(sectors, 88, 318, 480) : "";

  const persistentPanel = persistent.length
    ? persistent.slice(0, 5).map((row, i) => {
        const y = 468 + i * 32;
        const color = SECTOR_COLOR.integrity || C.rubyCore;
        return `
    <rect x="640" y="${y}" width="472" height="26" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
    <rect x="640" y="${y}" width="4" height="26" fill="${color}"/>
    <text x="656" y="${y + 18}" fill="${C.platinum}" font-family="${FONT}" font-size="12" font-weight="600">${esc(row.network)}</text>
    <text x="820" y="${y + 18}" fill="${C.muted}" font-family="${FONT}" font-size="12">${esc(row.label)}</text>
    <text x="1096" y="${y + 18}" fill="${C.neonYellow}" font-family="${FONT}" font-size="12" font-weight="700" text-anchor="end">${row.days}d</text>`;
      }).join("")
    : `<text x="656" y="488" fill="${C.muted}" font-family="${FONT}" font-size="12">Building persistence history from daily snapshots.</text>`;

  const sectorLegend = sectors
    .slice(0, 4)
    .map((sec, i) => {
      const y = 378 + i * 24;
      const color = SECTOR_COLOR[sec.type] || C.sapphireCore;
      return `
      <rect x="88" y="${y - 10}" width="10" height="10" fill="${color}"/>
      <text x="106" y="${y}" fill="${C.muted}" font-family="${FONT}" font-size="11">${esc(shortLabel(sec.label, 36))}</text>
      <text x="540" y="${y}" fill="${C.platinum}" font-family="${FONT}" font-size="11" font-weight="700" text-anchor="end">${sec.signalCount}</text>`;
    })
    .join("");

  const body = `
  <rect x="0" y="0" width="${W}" height="132" fill="url(#monthBand)"/>
  <text x="${W / 2}" y="52" fill="${C.neonYellow}" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="4" text-anchor="middle">GETKINETIK</text>
  <text x="${W / 2}" y="92" fill="${C.platinum}" font-family="${FONT}" font-size="36" font-weight="700" text-anchor="middle">DePIN Ecosystem State</text>
  <text x="${W / 2}" y="118" fill="${C.muted}" font-family="${FONT}" font-size="16" text-anchor="middle">${esc(monthTitle)}</text>

  <text x="88" y="168" fill="${C.muted}" font-family="${FONT}" font-size="13">${totalSignals} signals · ${totalNetworks} active networks · public audit composition</text>

  <path d="${facetedRectPath(72, 196, 528, 196, 10)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(88, 220, "Ecosystem composition")}
  ${sectorBar}
  ${sectorLegend}

  <path d="${facetedRectPath(624, 196, 504, 196, 10)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(640, 220, "Signal category distribution")}
  ${renderCategoryDistribution(cats, 876, 292, 62)}

  <path d="${facetedRectPath(72, 408, 528, 196, 10)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(88, 432, "Network coverage")}
  ${renderNetworkCoverageGrid(cardSignals, 96, 452, 480)}

  <path d="${facetedRectPath(624, 408, 504, 196, 10)}" fill="${C.obsidianSoft}" stroke="${C.hairline}"/>
  ${sectionTitle(640, 432, "Persistent signals")}
  <text x="640" y="456" fill="${C.graphite}" font-family="${FONT}" font-size="11">Longest-running observations in the last 30 days</text>
  ${persistentPanel}

  <text x="${W - 72}" y="656" fill="${C.platinum}" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">getkinetik.app/site</text>`;

  const monthBandDef = `
  <defs>
    <linearGradient id="monthBand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2A2400"/>
      <stop offset="50%" stop-color="#1A1608"/>
      <stop offset="100%" stop-color="${C.obsidian}"/>
    </linearGradient>
  </defs>`;

  return svgShell("topline", [C.neonYellow, C.sapphireCore, C.rubyCore], monthBandDef + body, `<rect x="0" y="0" width="${W}" height="6" fill="${C.neonYellow}"/>`);
}

/** SVG string for the card (dispatches to cadence-specific layout). */
export function buildDailyCardSvg(
  signals: Signal[],
  patterns: Pattern[],
  dateLabel: string,
  mode: CardMode = "daily",
): string {
  if (mode === "weekly") return renderWeeklySvg(signals, patterns, dateLabel);
  if (mode === "monthly") return renderMonthlySvg(signals, patterns, dateLabel);
  return renderDailySvg(signals, patterns, dateLabel);
}

/** Render PNG buffer from signals (requires sharp). */
export async function renderDailyCardPng(
  signals: Signal[],
  patterns: Pattern[],
  dateLabel: string,
  mode: CardMode = "daily",
): Promise<Buffer> {
  const svg = buildDailyCardSvg(signals, patterns, dateLabel, mode);
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default;
  } catch {
    throw new Error("sharp is required for chart cards — run: npm install --prefix drip-engine");
  }
  return sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
}
