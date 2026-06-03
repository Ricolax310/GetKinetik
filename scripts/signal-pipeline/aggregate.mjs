// Step 4: cross-network aggregation. Sector-level summary FIRST, per-network
// breakdown SECOND. Networks are never ordered by signal volume, so no single
// network can dominate the feed.

import { SECTOR_LABELS, SECTOR_ORDER, SEVERITY_WEIGHT, WHAT_WE_DONT_KNOW } from "./config.mjs";

function topSeverity(signals) {
  let best = null;
  for (const s of signals) {
    if (!best || SEVERITY_WEIGHT[s.severity] > SEVERITY_WEIGHT[best]) best = s.severity;
  }
  return best;
}

/**
 * @param {Array} normalizedNetworks output of buildNormalizedNetworks()
 * @param {string} cadence daily | weekly | monthly
 */
export function aggregate(normalizedNetworks, cadence = "daily") {
  const allSignals = normalizedNetworks.flatMap((n) =>
    n.signals.map((s) => ({ ...s, networkId: n.networkId })),
  );

  const bySector = {};
  for (const s of allSignals) {
    const sector = s.type;
    if (!bySector[sector]) {
      bySector[sector] = { type: sector, label: SECTOR_LABELS[sector] || sector, signals: [], networks: new Set() };
    }
    bySector[sector].signals.push(s);
    bySector[sector].networks.add(s.network);
  }

  const sectorSummary = SECTOR_ORDER.filter((t) => bySector[t]).map((t) => {
    const sec = bySector[t];
    return {
      type: t,
      label: sec.label,
      signalCount: sec.signals.length,
      networks: [...sec.networks].sort(),
      topSeverity: topSeverity(sec.signals),
      whatWeDontKnow: WHAT_WE_DONT_KNOW[t] || null,
    };
  });

  const totals = {
    networks: normalizedNetworks.length,
    activeNetworks: normalizedNetworks.filter((n) => n.status === "active").length,
    signals: allSignals.length,
    byType: Object.fromEntries(sectorSummary.map((s) => [s.type, s.signalCount])),
    bySeverity: allSignals.reduce(
      (acc, s) => ((acc[s.severity] = (acc[s.severity] || 0) + 1), acc),
      {},
    ),
  };

  return {
    schema: "getkinetik.signal-feed/v1",
    cadence,
    mode: "cross-network-first",
    generatedAt: new Date().toISOString(),
    sectorSummary,
    totals,
    networks: normalizedNetworks,
  };
}
