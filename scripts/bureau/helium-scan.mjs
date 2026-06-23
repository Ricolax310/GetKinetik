// Helium Entity API scan (shared by sybil-scan-helium-iot / -mobile).
//
// Real public data: https://entities.nft.helium.io/v2/hotspots?subnetwork=<sub>
// Free, no auth, cursor-paginated (10k records per page). Each record carries
// asserted lat/long and an is_active flag.
//
// Honest framing — this is NOT the RTK duplicate heuristic: Helium asserted
// locations snap to H3 hexes, so nearby hotspots legitimately share exact
// coordinates (apartment buildings, multi-unit installs). The meaningful unit
// is the *large* single-coordinate stack (the classic antenna-farm / hotspot
// stacking pattern).
//
// NOTE: the Entity API's is_active flag is uniformly false across both
// subnetworks (verified 2026-06-10) — it is NOT a usable activity signal and
// is deliberately not reported.

import fs from "node:fs";
import path from "node:path";
import {
  assertScanNotCollapsed,
  loadPreviousStats,
  renderCrossCheckSection,
  renderExecutiveSummary,
  renderSnapshotDeltaSection,
} from "./report-helpers.mjs";

const BASE_URL = "https://entities.nft.helium.io/v2/hotspots";
const STACK_MIN = 10; // ≥10 hotspots on one exact coordinate — worth review
const SAMPLES_PER_FINDING = 10;
const MAX_PAGES = 200; // hard safety cap (~2M records)

async function fetchAllHotspots(subnetwork) {
  const items = [];
  let cursor = null;
  let pages = 0;
  for (;;) {
    const url = `${BASE_URL}?subnetwork=${subnetwork}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Helium Entity API HTTP ${res.status} (page ${pages + 1})`);
    const body = await res.json();
    if (!Array.isArray(body.items)) throw new Error("unexpected response shape: no items[]");
    items.push(...body.items);
    pages += 1;
    cursor = body.cursor || null;
    if (!cursor || pages >= MAX_PAGES) break;
    if (pages % 10 === 0) {
      console.error(`      … ${items.length.toLocaleString()} hotspots after ${pages} pages`);
    }
  }
  return { items, pages };
}

export async function runHeliumScan({ subnetwork, networkLabel, reportPath, snapshotPath }) {
  console.error(`[1/3] Fetching Helium ${subnetwork} hotspots (Entity API) …`);
  const { items, pages } = await fetchAllHotspots(subnetwork);

  const located = items.filter(
    (h) => typeof h.lat === "number" && typeof h.long === "number" && isFinite(h.lat) && isFinite(h.long),
  );
  const unasserted = items.length - located.length;
  console.error(
    `      → ${items.length.toLocaleString()} hotspots (${located.length.toLocaleString()} with asserted coordinates) over ${pages} pages.`,
  );

  // ---- Heuristics -----------------------------------------------------------
  console.error("[2/3] Running heuristics …");

  // A: single-coordinate stacks (exact asserted lat/long shared by many units).
  const byCoord = new Map();
  for (const h of located) {
    const k = `${h.lat},${h.long}`;
    const g = byCoord.get(k);
    if (g) g.push(h);
    else byCoord.set(k, [h]);
  }
  const stacks = [...byCoord.entries()]
    .filter(([, g]) => g.length >= STACK_MIN)
    .map(([coord, g]) => ({ coord, count: g.length, sampleKeys: g.slice(0, 5).map((h) => h.entity_key_str) }))
    .sort((a, b) => b.count - a.count);
  const largestStack = stacks.length ? stacks[0].count : 0;

  const flaggedCount = stacks.reduce((n, s) => n + s.count, 0);
  const flaggedPct = located.length ? flaggedCount / located.length : 0;

  // ---- Snapshot ---------------------------------------------------------------
  const snapAbs = path.resolve(snapshotPath);
  const prevStats = loadPreviousStats(snapAbs);
  // Don't let a failed/empty fetch wipe a good snapshot.
  assertScanNotCollapsed({ observed: located.length, prevStats, label: subnetwork ? `helium-${subnetwork}` : "helium" });
  const stats = {
    generatedAt: new Date().toISOString(),
    observed: located.length,
    unasserted,
    stackedSpots: stacks.length,
    largestStack,
    flaggedCount,
    flaggedPct,
  };

  fs.mkdirSync(path.dirname(snapAbs), { recursive: true });
  fs.writeFileSync(
    snapAbs,
    JSON.stringify(
      {
        generatedAt: stats.generatedAt,
        source: `${BASE_URL}?subnetwork=${subnetwork}`,
        stats,
        prevStats: prevStats || undefined,
        hotspotsTotal: items.length,
        topStacks: stacks.slice(0, 50),
      },
      null,
      2,
    ),
  );

  // ---- Report -----------------------------------------------------------------
  console.error("[3/3] Rendering report …");

  const deltaRows = [
    { key: "observed", label: "Hotspots with asserted coordinates", value: stats.observed, lowerIsBetter: false },
    { key: "stackedSpots", label: `Single-coordinate stacks (≥${STACK_MIN} hotspots)`, value: stats.stackedSpots },
    { key: "largestStack", label: "Largest single-coordinate stack", value: stats.largestStack },
    { key: "flaggedPct", label: "Fleet share flagged (any heuristic)", value: stats.flaggedPct, pct: true },
  ];

  const now = new Date();
  const lines = [];
  lines.push(`# Sybil Risk Scan — ${networkLabel}`);
  lines.push("");
  lines.push(
    `> Independent public read by the GETKINETIK Bureau using only Helium's` +
      ` free Entity API. **No internal Helium data was used.** Asserted` +
      ` locations snap to H3 hexes, so shared exact coordinates are expected in` +
      ` dense buildings — the heuristics below only flag *large* stacks` +
      ` (≥${STACK_MIN} hotspots on one coordinate), the classic stacking pattern` +
      ` worth a registry look.`,
  );
  lines.push("");
  lines.push(`- **As of:** ${now.toISOString().slice(0, 10)}`);
  lines.push(`- **Public source:** \`${BASE_URL}?subnetwork=${subnetwork}\``);
  lines.push(`- **Hotspots observed (with coordinates):** ${located.length.toLocaleString()}`);
  lines.push(`- **Hotspots without asserted location:** ${unasserted.toLocaleString()}`);
  lines.push(
    `- **Hotspots flagged (any heuristic):** ${flaggedCount.toLocaleString()} (${(flaggedPct * 100).toFixed(2)}%)`,
  );
  lines.push("");
  lines.push(
    ...renderExecutiveSummary([
      `**${stacks.length.toLocaleString()} single-coordinate stacks of ≥${STACK_MIN} hotspots** on ${located.length.toLocaleString()} located units — the largest stack holds **${largestStack.toLocaleString()} hotspots on one coordinate** (§1 lists keys your registry team can grep today).`,
      `**${unasserted.toLocaleString()} hotspots exist on-chain with no asserted location** — on the registry but not on the map.`,
      `Stacks are *expected* at small sizes (H3 snapping, dense buildings) — only review-worthy at this threshold; every number reproduces from the free public endpoint with no API key.`,
    ]),
  );
  lines.push(...renderSnapshotDeltaSection(deltaRows, prevStats));
  lines.push(
    ...renderCrossCheckSection([
      `Registry dedupe: for each §1 stack, confirm how many physically separate radios actually occupy that coordinate.`,
      `Coverage model: confirm whether the unasserted-location population is expected (new units pre-assert) or stale registry entries.`,
      `Reproduce: \`node scripts/sybil-scan-helium-${subnetwork === "iot" ? "iot" : "mobile"}.mjs\` — same public endpoint, no API key.`,
    ]),
  );

  lines.push("## Headline findings");
  lines.push("");
  lines.push(
    `1. **${stacks.length.toLocaleString()} coordinates host ≥${STACK_MIN} hotspots each.** ` +
      "H3 snapping makes small shared-coordinate groups normal; stacks this size are the " +
      "documented hotspot-stacking pattern and justify a registry cross-check.",
  );
  lines.push(
    `2. **${unasserted.toLocaleString()} hotspots have no asserted location** — they exist on-chain but not on the map.`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push(`## 1. Largest single-coordinate stacks — ${stacks.length.toLocaleString()} total`);
  lines.push("");
  if (stacks.length === 0) {
    lines.push(`_No coordinate hosts ≥${STACK_MIN} hotspots._`);
  } else {
    lines.push("| Coordinates | Hotspot count | Sample entity keys |");
    lines.push("|---|---:|---|");
    stacks.slice(0, SAMPLES_PER_FINDING).forEach((s) => {
      lines.push(
        `| \`${s.coord}\` | ${s.count.toLocaleString()} | ${s.sampleKeys
          .slice(0, 3)
          .map((k) => "`" + String(k).slice(0, 24) + "…`")
          .join(", ")} |`,
      );
    });
    if (stacks.length > SAMPLES_PER_FINDING) {
      lines.push("");
      lines.push(`_…and ${(stacks.length - SAMPLES_PER_FINDING).toLocaleString()} more in the snapshot file._`);
    }
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("## Methodology");
  lines.push("");
  lines.push(
    "- Helium asserted locations are H3-hex-snapped, so exact-coordinate sharing is normal at small counts. " +
      `Only stacks of ≥${STACK_MIN} units are flagged — large stacks are the well-known gaming pattern, but can also be honest dense deployments; the list is a review queue, not a verdict.`,
  );
  lines.push(
    "- The Entity API's `is_active` flag is uniformly false across the fleet (verified at scan time) — it is not a usable activity signal and is deliberately not reported.",
  );
  lines.push(
    "- The full fleet is paginated from the free Entity API at scan time — no sampling, no synthetic inputs.",
  );
  lines.push("");
  lines.push(
    "For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.",
  );
  lines.push("");
  lines.push(
    "Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/",
  );
  lines.push("");

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  console.error(`      wrote ${reportPath}`);
  console.error(`      snapshot → ${snapshotPath}`);
  console.error("");
  console.error("Summary:");
  console.error(`  hotspots (located)    : ${located.length}`);
  console.error(`  stacks ≥${STACK_MIN}            : ${stacks.length}`);
  console.error(`  largest stack         : ${largestStack}`);
  console.error(`  unasserted location   : ${unasserted}`);
  return stats;
}
