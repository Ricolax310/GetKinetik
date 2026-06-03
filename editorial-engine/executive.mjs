// Shared executive-layer builders — dual-format reports (scan layer + full evidence).
// Standard: 4–6 bullets describing what changed, readable in under 10 seconds.

const MAX_TODAY_READ = 6;
const MIN_TODAY_READ = 3;
const MAX_DAILY_WHY = 4;
const MIN_DAILY_WHY = 2;
const MAX_WEEKLY_EXEC = 5;
const MIN_WEEKLY_EXEC = 3;

// Minimum absolute change required for a bullet to be worth publishing.
// Below these thresholds the change is noise, not signal.
const TRIVIAL_ABS = {
  exactDupGroups: 0,          // any change in dup groups is meaningful
  overCapacityCells: 0,       // any cell change is meaningful
  overCapacityPct: 0.0005,    // < 0.05 pp = skip
  kmFrozenDays: 0,            // frozen counter days always meaningful
  top20ShareOfSupply: 0.002,  // < 0.2 pp = skip
  observed: 5,                // < 5 entity change = skip
  flaggedPct: 0.001,
  drivers: 10,                // +1 driver out of 270k = skip
  detections: 50,
  detectionsZeroDays: 0,      // any zero-day extension is meaningful
};

const METRIC_SHORT = {
  exactDupGroups: "duplicate-coordinate groups",
  overCapacityCells: "over-capacity cells",
  top20ShareOfSupply: "visible HONEY concentration",
  kmFrozenDays: "public coverage metrics",
  observed: "entities on public map",
  flaggedPct: "flagged fleet share",
  overCapacityPct: "over-capacity share",
  detections: "detections",
  detectionsZeroDays: "zero-detection days",
  drivers: "registered drivers",
};

// Supplementary cross-metric context appended when a flat metric has a rising
// counterpart on the same network (e.g. frozen KM while drivers rise).
const CROSS_METRIC_CONTEXT = {
  kmFrozenDays: "while registrations continue to rise",
};

function fmtVal(key, v) {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  if (key && (key.includes("Share") || key.includes("Pct") || key.includes("supply")))
    return `${(v * 100).toFixed(0)}%`;
  return v.toLocaleString();
}

function clean(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isTrivial(s) {
  const abs = Math.abs(typeof s.delta === "number" ? s.delta : 0);
  const thresh = TRIVIAL_ABS[s.metric ?? s.metricKey];
  if (thresh === undefined) return abs === 0;
  return abs <= thresh;
}

function direction(delta) {
  return delta > 0 ? "rose" : "declined";
}

// ── drip-engine shape ────────────────────────────────────────────────────────

export function dripSignalBullet(s) {
  const label = METRIC_SHORT[s.metric] || s.metric.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const val = fmtVal(s.metric, s.value);
  const prev = typeof s.value === "number" && typeof s.delta === "number"
    ? fmtVal(s.metric, s.value - s.delta)
    : null;

  if (s.metric === "kmFrozenDays") {
    const ctx = CROSS_METRIC_CONTEXT.kmFrozenDays;
    return `${s.network} ${label} remain unchanged for ${s.value} days${ctx ? ` ${ctx}` : ""}.`;
  }
  if (s.delta === 0 || isTrivial(s)) {
    if (/share|pct|supply/i.test(s.metric)) {
      return `${s.network} ${label} remains near ${val} of visible supply.`;
    }
    return `${s.network} ${label} unchanged at ${val}.`;
  }
  if (/share|pct|supply/i.test(s.metric)) {
    const dir = direction(s.delta);
    if (prev && prev !== val) return `${s.network} ${label} ${dir} from ${prev} to ${val} of visible supply.`;
    return `${s.network} ${label} remains near ${val} of visible supply.`;
  }
  const dir = direction(s.delta);
  if (prev && prev !== val) return `${s.network} ${label} ${dir} from ${prev} to ${val}.`;
  return `${s.network} ${label}: ${val} (${s.delta > 0 ? "+" : ""}${s.delta}).`;
}

export function buildTodaysReadFromDrip(signals) {
  const SEV = { high: 3, medium: 2, low: 1 };

  // Filter trivial-delta signals before ranking.
  const meaningful = signals.filter((s) => !isTrivial(s) || s.metric === "kmFrozenDays" || s.metric === "exactDupGroups" || s.metric === "overCapacityCells");

  const sorted = [...meaningful].sort(
    (a, b) => (SEV[b.severity] || 0) - (SEV[a.severity] || 0) || Math.abs(b.delta) - Math.abs(a.delta),
  );
  const seen = new Set();
  const bullets = [];
  for (const s of sorted) {
    const key = `${s.network}::${s.metric}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bullets.push(dripSignalBullet(s));
    if (bullets.length >= MAX_TODAY_READ) break;
  }
  // Pad with full signal list if too few meaningful ones.
  if (bullets.length < MIN_TODAY_READ) {
    for (const s of signals) {
      const key = `${s.network}::${s.metric}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bullets.push(dripSignalBullet(s));
      if (bullets.length >= MIN_TODAY_READ) break;
    }
  }
  return bullets.slice(0, MAX_TODAY_READ);
}

// ── publication pipeline shape ───────────────────────────────────────────────

export function publicationSignalBullet(s) {
  const net = s.network;
  if (s.kind === "metric" && s.metricKey) {
    const label = METRIC_SHORT[s.metricKey] || s.label;
    const cur = fmtVal(s.metricKey, s.current);
    const prev = s.previous != null ? fmtVal(s.metricKey, s.previous) : null;

    if (s.metricKey === "kmFrozenDays") {
      const ctx = CROSS_METRIC_CONTEXT.kmFrozenDays;
      return `${net} ${label} remain unchanged for ${s.current} days${ctx ? ` ${ctx}` : ""}.`;
    }
    if (s.metricKey === "top20ShareOfSupply") {
      if (Math.abs((s.current || 0) - (s.previous || 0)) < 0.002) {
        return `${net} ${label} remains near ${cur} of visible supply.`;
      }
      const dir = (s.current || 0) > (s.previous || 0) ? "rose" : "declined";
      return prev && prev !== cur
        ? `${net} ${label} ${dir} from ${prev} to ${cur} of visible supply.`
        : `${net} ${label} remains near ${cur} of visible supply.`;
    }
    if (prev && prev !== cur) {
      const dir = (s.current || 0) > (s.previous || 0) ? "rose" : "declined";
      return `${net} ${label} ${dir} from ${prev} to ${cur}.`;
    }
    return `${net} ${label} unchanged at ${cur}.`;
  }
  const text = clean(s.deltaText);
  if (text.length > 140) return `${net}: ${text.slice(0, 137)}…`;
  return `${net}: ${text}`;
}

/** Pick 4–6 highest-signal bullets from publication signals, filtered for triviality. */
export function buildTodaysReadFromPublication(measurable) {
  const priority = (s) => {
    if (s.kind === "headline") return 1;
    if (s.metricKey === "exactDupGroups" || s.metricKey === "overCapacityCells") return 2;
    if (s.metricKey === "kmFrozenDays" || s.metricKey === "top20ShareOfSupply") return 3;
    return 4;
  };

  // Drop trivially-small deltas — map to drip-signal shape for isTrivial().
  const filtered = measurable.filter((s) => {
    const ds = { metric: s.metricKey, delta: typeof s.current === "number" && typeof s.previous === "number" ? s.current - s.previous : 0 };
    return !isTrivial(ds) || s.metricKey === "kmFrozenDays" || s.metricKey === "exactDupGroups" || s.metricKey === "overCapacityCells";
  });

  const sorted = [...filtered].sort((a, b) => priority(a) - priority(b) || a.network.localeCompare(b.network));
  const seen = new Set();
  const bullets = [];
  for (const s of sorted) {
    const key = `${s.networkId}::${s.metricKey || "headline"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bullets.push(publicationSignalBullet(s));
    if (bullets.length >= MAX_TODAY_READ) break;
  }
  // Pad if needed using original (unfiltered) list.
  if (bullets.length < MIN_TODAY_READ) {
    for (const s of measurable) {
      const key = `${s.networkId}::${s.metricKey || "headline"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bullets.push(publicationSignalBullet(s));
      if (bullets.length >= MIN_TODAY_READ) break;
    }
  }
  return bullets;
}

// ── Why It Matters ──────────────────────────────────────────────────────────

/** Characterize the overall nature of today's signal movement (not mechanical counts). */
export function buildDailyWhyItMatters({ categories = [], networkCount = 0, signalCount = 0, signals = [] } = {}) {
  if (signalCount === 0) {
    return [
      "No publishable signal deltas cleared the confidence threshold today.",
      "The index remains in observation mode until public feeds refresh.",
    ];
  }

  // Classify signal types present.
  const hasRegistry = categories.some((c) => c === "IDENTITY");
  const hasCapacity = categories.some((c) => c === "CAPACITY");
  const hasTelemetry = categories.some((c) => c === "CONSISTENCY");
  const hasEconomics = categories.some((c) => c === "ECONOMICS");

  // Were changes mostly incremental (small deltas) or structural (large)?
  const allSignals = signals || [];
  const hasStructural = allSignals.some((s) => s.severity === "high" && Math.abs(s.delta || 0) > 0);
  const allFlat = allSignals.every((s) => (s.delta || 0) === 0);

  const signalTypes = [
    hasRegistry && "registry",
    hasCapacity && "capacity",
    hasTelemetry && "telemetry",
    hasEconomics && "concentration",
  ].filter(Boolean);

  const typePhrase = signalTypes.length > 2
    ? `${signalTypes.slice(0, -1).join(", ")}, and ${signalTypes.at(-1)}`
    : signalTypes.length === 2
    ? `${signalTypes[0]} and ${signalTypes[1]}`
    : signalTypes[0] || "infrastructure";

  const lines = [];

  if (allFlat) {
    lines.push(
      `Today's ${typePhrase} signals remain flat — no observable delta in the current public read.`,
    );
    lines.push(
      "The index records these as stability readings; evidence is retained in full below.",
    );
  } else if (hasStructural) {
    lines.push(
      `Today's signals show movement in ${typePhrase} metrics, with at least one high-severity read observable on public data.`,
    );
    lines.push("The observed changes are reproducible from public endpoints and remain non-conclusive without operator confirmation.");
  } else {
    lines.push(
      `Today's signals show modest movement in ${typePhrase} metrics. Telemetry and concentration readings are largely unchanged.`,
    );
    lines.push("The observed changes are incremental rather than structural and remain reproducible from public data sources.");
  }

  if (networkCount > 2) {
    lines.push(`Observations span ${networkCount} networks — no single network dominates the index.`);
  }

  return lines.slice(0, MAX_DAILY_WHY);
}

// ── Weekly executive ─────────────────────────────────────────────────────────

/** 3–5 bullets for weekly executive summary. */
export function buildWeeklyExecutiveBullets({ signalCount, networkCount, patterns = [], weekLabel = "" }) {
  const bullets = [];
  if (weekLabel) bullets.push(`Week ${weekLabel}: cross-network signal index updated from public infrastructure reads.`);
  bullets.push(`${signalCount} publishable signal(s) across ${networkCount} network(s) met the weekly confidence gate.`);
  const cross = patterns.filter((p) => p.scope === "cross-network" || p.scope === "systemic");
  if (cross.length) {
    bullets.push(`${cross.length} cross-network pattern(s) tagged: ${cross.map((p) => p.category).join(", ")}.`);
  } else {
    bullets.push("No cross-network pattern cleared the weekly gate — observations remain network-local.");
  }
  const systemic = patterns.filter((p) => p.scope === "systemic");
  if (systemic.length) bullets.push(`${systemic.length} systemic-scope pattern(s) recorded with multi-network support.`);
  while (bullets.length < MIN_WEEKLY_EXEC) {
    bullets.push("Evidence appendix retains full metrics, methodology, and bounded uncertainty.");
    if (bullets.length >= MIN_WEEKLY_EXEC) break;
  }
  return bullets.slice(0, MAX_WEEKLY_EXEC);
}

// ── Format wrappers ──────────────────────────────────────────────────────────

export function wrapDualLayerDaily({ title, dateLine, todaysRead, whyItMatters, fullEvidence }) {
  const lines = [title, "", dateLine, "", "## Today's Read", ""];
  if (!todaysRead.length) lines.push("• No publishable signal deltas today.");
  else todaysRead.forEach((b) => lines.push(`• ${b}`));
  lines.push("", "## Why It Matters", "");
  whyItMatters.forEach((p) => lines.push(p));
  lines.push("", "## Full Evidence", "", fullEvidence.trim(), "");
  return lines.join("\n");
}

export function wrapDualLayerWeekly({ title, dateLine, executive, bodySections, fullEvidence }) {
  const lines = [title, "", dateLine, "", "## Executive Summary", ""];
  executive.forEach((b) => lines.push(`• ${b}`));
  lines.push("");
  for (const sec of bodySections) lines.push(...sec, "");
  lines.push("## Data Appendix", "", fullEvidence.trim(), "");
  return lines.join("\n");
}
