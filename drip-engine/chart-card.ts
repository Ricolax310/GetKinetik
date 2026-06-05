// Daily DePIN index card — SVG chart → PNG for X image posts.

import type { Signal } from "./signal-loader.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import { categoryForSignal } from "./taxonomy.ts";
import { compactFactLine } from "./narrative-builder.ts";

const W = 1200;
const H = 675;

const C = {
  bg: "#09090b",
  panel: "#18181b",
  border: "#27272a",
  text: "#fafafa",
  muted: "#a1a1aa",
  dim: "#52525b",
  accent: "#e11d48",
  accentSoft: "#881337",
  up: "#34d399",
  down: "#f87171",
  flat: "#71717a",
};

const CAT_COLOR: Record<string, string> = {
  IDENTITY: "#fb923c",
  INFRASTRUCTURE: "#22d3ee",
  ECONOMICS: "#a78bfa",
  CAPACITY: "#f472b6",
  CONSISTENCY: "#facc15",
  BEHAVIORAL: "#4ade80",
};

const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

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

function formatDateLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return label;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function headline(patterns: Pattern[], signals: Signal[]): string {
  const cross = patterns.filter((p) => p.scope === "cross-network" || p.scope === "systemic");
  if (cross.length) {
    return cross.sort((a, b) => b.networks.length - a.networks.length)[0].headline;
  }
  return signals.length ? "Cross-network DePIN signal snapshot" : "DePIN signal index";
}

function pickChartSignals(signals: Signal[], max = 6): Signal[] {
  const ranked = signals.slice().sort((a, b) => {
    const movedA = a.delta !== 0 ? 1 : 0;
    const movedB = b.delta !== 0 ? 1 : 0;
    if (movedB !== movedA) return movedB - movedA;
    return SEV_RANK[b.severity] - SEV_RANK[a.severity] || Math.abs(b.delta) - Math.abs(a.delta);
  });
  const picked: Signal[] = [];
  const seen = new Set<string>();
  for (const s of ranked) {
    if (seen.has(s.network)) continue;
    seen.add(s.network);
    picked.push(s);
    if (picked.length >= max) break;
  }
  return picked;
}

function deltaLabel(s: Signal): { text: string; color: string } {
  if (s.delta > 0) return { text: `+${fmtNum(s.delta, s.metric)}`, color: C.up };
  if (s.delta < 0) return { text: `−${fmtNum(Math.abs(s.delta), s.metric)}`, color: C.down };
  return { text: "—", color: C.flat };
}

function fmtNum(n: number, metric: string): string {
  if (/share|pct/i.test(metric)) return `${(Math.abs(n) * 100).toFixed(1)}pp`;
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return String(Math.round(n * 100) / 100);
}

function displayValue(s: Signal): string {
  if (/share|pct/i.test(s.metric)) return `${(s.value * 100).toFixed(1)}%`;
  if (s.value >= 1000) return s.value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return String(s.value);
}

function barWidth(s: Signal): number {
  const base = SEV_RANK[s.severity] === 3 ? 0.88 : SEV_RANK[s.severity] === 2 ? 0.62 : 0.42;
  const moved = s.delta !== 0 ? 0.06 : 0;
  return Math.min(0.92, base + moved);
}

function categoryCounts(signals: Signal[]): { cat: string; n: number }[] {
  const m = new Map<string, number>();
  for (const s of signals) {
    const cat = categoryForSignal(s.metric);
    m.set(cat, (m.get(cat) || 0) + 1);
  }
  return [...m.entries()]
    .map(([cat, n]) => ({ cat, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
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

/** SVG string for the daily index card. */
export function buildDailyCardSvg(
  signals: Signal[],
  patterns: Pattern[],
  dateLabel: string,
): string {
  const rows = pickChartSignals(signals, 6);
  const hook = headline(patterns, signals);
  const cats = categoryCounts(signals);
  const move = movedCount(signals);
  const networks = [...new Set(signals.map((s) => shortNet(s.network)))];
  const rowH = 52;
  const chartTop = 200;
  const chartLeft = 56;
  const chartW = W - chartLeft * 2;

  let bars = "";
  rows.forEach((s, i) => {
    const y = chartTop + i * rowH;
    const net = shortNet(s.network);
    const cat = categoryForSignal(s.metric);
    const color = CAT_COLOR[cat] || C.accent;
    const w = Math.round(chartW * 0.55 * barWidth(s));
    const d = deltaLabel(s);
    const label = compactFactLine(s);
    const metricShort = label.slice(net.length + 2, net.length + 42);

    bars += `
      <text x="${chartLeft}" y="${y + 22}" fill="${C.text}" font-family="system-ui,sans-serif" font-size="18" font-weight="600">${esc(net)}</text>
      <rect x="${chartLeft + 130}" y="${y + 6}" width="${chartW - 130}" height="34" rx="8" fill="${C.panel}" stroke="${C.border}"/>
      <rect x="${chartLeft + 134}" y="${y + 10}" width="${w}" height="26" rx="6" fill="${color}" opacity="0.85"/>
      <text x="${chartLeft + 144}" y="${y + 28}" fill="${C.bg}" font-family="system-ui,sans-serif" font-size="13" font-weight="600">${esc(displayValue(s))}</text>
      <text x="${chartLeft + 280}" y="${y + 28}" fill="${C.muted}" font-family="system-ui,sans-serif" font-size="12">${esc(metricShort)}</text>
      <text x="${chartLeft + chartW - 8}" y="${y + 28}" fill="${d.color}" font-family="system-ui,sans-serif" font-size="15" font-weight="700" text-anchor="end">${esc(d.text)}</text>
    `;
  });

  let catChips = "";
  cats.forEach((c, i) => {
    const x = chartLeft + i * 148;
    const color = CAT_COLOR[c.cat] || C.accent;
    catChips += `
      <rect x="${x}" y="518" width="136" height="44" rx="10" fill="${C.panel}" stroke="${color}" stroke-width="1.5"/>
      <circle cx="${x + 18}" cy="540" r="6" fill="${color}"/>
      <text x="${x + 32}" y="536" fill="${C.muted}" font-family="system-ui,sans-serif" font-size="11">${esc(c.cat.slice(0, 12))}</text>
      <text x="${x + 32}" y="554" fill="${C.text}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${c.n}</text>
    `;
  });

  const patternNets =
    patterns.find((p) => p.scope === "cross-network" || p.scope === "systemic")?.networks.slice(0, 4) ||
    networks.slice(0, 4);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c0c10"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.accent}"/>
      <stop offset="100%" stop-color="${C.accentSoft}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accentBar)"/>

  <text x="56" y="58" fill="${C.accent}" font-family="system-ui,sans-serif" font-size="14" font-weight="700" letter-spacing="3">GETKINETIK</text>
  <text x="56" y="92" fill="${C.text}" font-family="system-ui,sans-serif" font-size="32" font-weight="700">DePIN Signal Index</text>
  <text x="56" y="124" fill="${C.muted}" font-family="system-ui,sans-serif" font-size="16">${esc(formatDateLabel(dateLabel))}</text>
  <text x="${W - 56}" y="92" fill="${C.text}" font-family="system-ui,sans-serif" font-size="22" font-weight="600" text-anchor="end">${signals.length} signals</text>
  <text x="${W - 56}" y="120" fill="${C.muted}" font-family="system-ui,sans-serif" font-size="14" text-anchor="end">${networks.length} networks · public reads</text>

  <rect x="56" y="140" width="${W - 112}" height="44" rx="10" fill="${C.panel}" stroke="${C.border}"/>
  <text x="72" y="168" fill="${C.text}" font-family="system-ui,sans-serif" font-size="15">${esc(hook.slice(0, 95))}${hook.length > 95 ? "…" : ""}</text>

  <text x="${chartLeft}" y="${chartTop - 12}" fill="${C.muted}" font-family="system-ui,sans-serif" font-size="12" font-weight="600" letter-spacing="1">NETWORK SIGNALS</text>
  ${bars}

  <text x="${chartLeft}" y="502" fill="${C.muted}" font-family="system-ui,sans-serif" font-size="12" font-weight="600" letter-spacing="1">CATEGORIES</text>
  ${catChips}

  <rect x="56" y="578" width="${W - 112}" height="72" rx="12" fill="${C.panel}" stroke="${C.border}"/>
  <text x="72" y="608" fill="${C.muted}" font-family="system-ui,sans-serif" font-size="12">Δ movement today</text>
  <text x="72" y="634" fill="${C.up}" font-family="system-ui,sans-serif" font-size="22" font-weight="700">↑ ${move.up}</text>
  <text x="160" y="634" fill="${C.down}" font-family="system-ui,sans-serif" font-size="22" font-weight="700">↓ ${move.down}</text>
  <text x="248" y="634" fill="${C.flat}" font-family="system-ui,sans-serif" font-size="22" font-weight="700">— ${move.flat}</text>
  <text x="380" y="634" fill="${C.muted}" font-family="system-ui,sans-serif" font-size="14">Active: ${esc(patternNets.join(" · "))}</text>
  <text x="${W - 72}" y="634" fill="${C.text}" font-family="system-ui,sans-serif" font-size="16" font-weight="600" text-anchor="end">getkinetik.app/site</text>
</svg>`;
}

/** Render PNG buffer from signals (requires sharp). */
export async function renderDailyCardPng(
  signals: Signal[],
  patterns: Pattern[],
  dateLabel: string,
): Promise<Buffer> {
  const svg = buildDailyCardSvg(signals, patterns, dateLabel);
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default;
  } catch {
    throw new Error("sharp is required for chart cards — run: npm install --prefix drip-engine");
  }
  return sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
}
