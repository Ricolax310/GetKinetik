// Shared bureau report sections: executive summary, snapshot deltas, cross-check list.
import fs from "node:fs";
import path from "node:path";

/** Human-readable report date (YYYY-MM-DD) from ISO string or Date. */
export function formatAsOfDate(isoOrDate = new Date()) {
  const s =
    typeof isoOrDate === "string"
      ? isoOrDate.trim()
      : isoOrDate.toISOString();
  return s.slice(0, 10);
}

/** Strip pictographs from report headlines (display + index). */
export function stripEmoji(text) {
  return String(text)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** @typedef {{ key: string, label: string, value: number, lowerIsBetter?: boolean, pct?: boolean }} StatRow */

export function loadPreviousStats(snapshotAbsPath) {
  if (!fs.existsSync(snapshotAbsPath)) return null;
  try {
    const prev = JSON.parse(fs.readFileSync(snapshotAbsPath, "utf8"));
    if (prev.stats && typeof prev.stats === "object") return prev.stats;
    return inferLegacyStats(prev);
  } catch {
    return null;
  }
}

function inferLegacyStats(snap) {
  // Nodle / Dawn format: summary.totalScanned + summary.flaggedCount + findings[]
  if (snap.summary?.totalScanned != null && snap.summary?.flaggedCount != null) {
    const flagged = snap.summary.flaggedCount;
    const total = snap.summary.totalScanned;
    const pct = total > 0 ? flagged / total : 0;
    return {
      observed: total,
      flaggedCount: flagged,
      flaggedPct: pct,
      exactDupGroups: Array.isArray(snap.findings)
        ? snap.findings.filter((f) =>
            (f.flags || []).some((fl) => /COLLISION|TWIN|CLONE|DUPLICATE/i.test(fl))
          ).length
        : null,
    };
  }
  if (snap.stationsTotal != null) {
    return {
      observed: snap.stationsTotal,
      exactDupGroups: Array.isArray(snap.exactDups) ? snap.exactDups.length : null,
      nearDupClusters: Array.isArray(snap.duplicates) ? snap.duplicates.length : null,
      tightClusters: Array.isArray(snap.clusters) ? snap.clusters.length : null,
      lowPrecision: Array.isArray(snap.lowPrecision) ? snap.lowPrecision.length : null,
    };
  }
  if (snap.cellsTotal != null) {
    return {
      observed: snap.cellsTotal,
      overCapacityCells: snap.overCapacity,
      drilledCells: Array.isArray(snap.drilled) ? snap.drilled.length : null,
    };
  }
  if (snap.honeyMint != null) {
    return {
      top20ShareOfSupply: snap.top20ShareOfSupply,
      top20SumUi: snap.top20SumUi,
      supplyUiAmount: snap.supplyUiAmount,
    };
  }
  return null;
}

export function formatDelta(cur, prev, { lowerIsBetter = true, pct = false } = {}) {
  if (typeof cur !== "number" || typeof prev !== "number" || !isFinite(cur) || !isFinite(prev)) {
    return "_(first run — no prior snapshot)_";
  }
  const d = cur - prev;
  if (d === 0) return "unchanged vs last run";
  const sign = d > 0 ? "+" : "";
  const abs = Math.abs(d);
  const unit = pct ? " pp" : "";
  const magnitude =
    pct && prev !== 0
      ? ` (${sign}${((d / prev) * 100).toFixed(1)}%)`
      : prev !== 0
        ? ` (${sign}${((d / prev) * 100).toFixed(1)}%)`
        : "";
  const plain = `${sign}${pct ? (d * 100).toFixed(2) : d.toLocaleString()}${unit}${magnitude}`;
  return plain;
}

/**
 * @param {StatRow[]} rows
 * @param {Record<string, number>|null} prevStats
 */
export function renderSnapshotDeltaSection(rows, prevStats) {
  const lines = ["## Since last snapshot", ""];
  if (!prevStats) {
    lines.push(
      "_No prior snapshot on disk — deltas appear after the second weekly run._",
    );
    lines.push("");
    return lines;
  }
  lines.push("| Metric | This run | vs last run |");
  lines.push("|---|---:|---|");
  for (const row of rows) {
    const prev = prevStats[row.key];
    const curFmt =
      row.pct && typeof row.value === "number"
        ? `${(row.value * 100).toFixed(2)}%`
        : typeof row.value === "number"
          ? row.value.toLocaleString()
          : "—";
    lines.push(
      `| ${row.label} | ${curFmt} | ${formatDelta(row.value, prev, {
        lowerIsBetter: row.lowerIsBetter !== false,
        pct: row.pct,
      })} |`,
    );
  }
  lines.push("");
  return lines;
}

export function renderExecutiveSummary(bullets) {
  const lines = ["## Executive summary", ""];
  bullets.slice(0, 3).forEach((b, i) => {
    lines.push(`${i + 1}. ${b}`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines;
}

export function renderCrossCheckSection(items) {
  const lines = ["## What to cross-check this week", ""];
  items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item}`);
  });
  lines.push("");
  lines.push(
    "> Public-data read. Re-run: script in `scripts/`, source URL in report header.",
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines;
}

/**
 * Resolve a network's anomaly primitive against the shared taxonomy into a
 * deterministic route. Routing is policy over primitives, not per-network
 * hardcoding: network supplies anomalyType + concrete verificationCall, the
 * taxonomy supplies assetClass / verificationEligible / route.
 */
export function resolveRouting(routing, taxonomy = {}, hasFinding = false) {
  const anomalyType = routing?.anomalyType || (hasFinding ? "uncategorized" : "scaffold");
  const primitive = taxonomy[anomalyType] || null;
  const verificationEligible = hasFinding ? Boolean(primitive?.verificationEligible) : false;
  const route = !hasFinding ? "monitor" : primitive?.route || "monitor";

  // verify-device emits a concrete verificationCall; clarify emits a bounded
  // clarificationRequest (a reality-check, not a test). The clarify route is the
  // mandatory gate for anomalies observed only at the aggregate level — there is
  // no per-device axis yet, so a device test would overstep.
  const verificationCall =
    verificationEligible && route === "verify-device"
      ? routing?.verificationCall || null
      : null;
  const clarificationRequest =
    route === "clarify" ? routing?.clarificationRequest || null : null;

  let reason = null;
  if (!hasFinding) {
    reason = "No qualifying headline finding extracted from report yet.";
  } else if (!primitive) {
    reason = `No taxonomy rule found for anomalyType '${anomalyType}', defaulting to monitor.`;
  } else if (route === "verify-device" && verificationEligible) {
    reason = null;
  } else {
    // monitor + clarify both carry the policy note as their reason.
    reason = primitive.note || "This anomaly class is not device-verifiable by policy.";
  }

  return {
    anomalyType,
    assetClass: primitive?.assetClass || "none",
    verificationEligible,
    route,
    reason,
    verificationCall,
    clarificationRequest,
  };
}

export function writeAuditIndex(repoRoot, registry, resolveRepo, taxonomy = {}) {
  const networks = [];
  for (const net of registry) {
    const snapPath = resolveRepo(net.snapshot);
    let stats = null;
    let generatedAt = null;
    if (fs.existsSync(snapPath)) {
      try {
        const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
        stats = snap.stats || inferLegacyStats(snap);
        generatedAt = snap.generatedAt || snap.stats?.generatedAt || snap.scannedAt || null;
        if (generatedAt) generatedAt = formatAsOfDate(generatedAt);
      } catch {
        /* skip */
      }
    }
    const reportPath = resolveRepo(net.report);
    let topFinding = null;
    if (fs.existsSync(reportPath)) {
      const md = fs.readFileSync(reportPath, "utf8");
      const exec = md.match(/## Executive summary\r?\n\r?\n([\s\S]*?)\r?\n\r?\n---/);
      if (exec) {
        const lines = exec[1].split("\n").map((l) => l.trim());
        const line = lines.find((l) => /^\d+\.\s+/.test(l)) || lines.find((l) => /^[-*]\s+/.test(l));
        topFinding = line?.replace(/^(\d+\.|[-*])\s+/, "") || null;
        if (topFinding) topFinding = stripEmoji(topFinding);
      }
      // Fallback: full bullet line containing flagged/anomalous count (Nodle/Dawn format).
      if (!topFinding) {
        const flagLine = md.match(/^-\s+\*\*[^*]*(?:Flagged|Anomalous)[^*]*\*\*[^\n]*/im);
        if (flagLine) {
          topFinding = stripEmoji(flagLine[0].replace(/^-\s+/, "").replace(/\*\*/g, "").trim());
        }
      }
    }
    const hasFinding = Boolean(topFinding);
    const routed = resolveRouting(net.routing, taxonomy, hasFinding);
    networks.push({
      id: net.id,
      name: net.name,
      report: net.report,
      publicSource: net.publicSource,
      generatedAt,
      stats,
      topFinding,
      anomalyType: routed.anomalyType,
      assetClass: routed.assetClass,
      verificationEligible: routed.verificationEligible,
      route: routed.route,
      reason: routed.reason,
      verificationCall: routed.verificationCall,
      clarificationRequest: routed.clarificationRequest,
    });
  }
  const payload = {
    updatedAt: formatAsOfDate(),
    networks,
  };
  const dataPath = path.join(repoRoot, "scripts/data/bureau-audit-index.json");
  const landingPath = path.join(repoRoot, "landing/data/bureau-audit-index.json");
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.mkdirSync(path.dirname(landingPath), { recursive: true });
  const json = JSON.stringify(payload, null, 2);
  fs.writeFileSync(dataPath, json, "utf8");
  fs.writeFileSync(landingPath, json, "utf8");
  return payload;
}
