// DIMO device-backing scan → report + snapshot.
//
// DIMO mints an on-chain "vehicle" identity per car, but a vehicle only produces
// real telemetry when it's connected to a device — either an AftermarketDevice
// (physical hardware dongle) or a SyntheticDevice (software/API connection, e.g.
// an automaker cloud link). The bureau's lens: how many vehicle identities are
// actually backed by a connected device, and how many by physical HARDWARE?
//
// 100% public, reproducible, no auth: DIMO's Identity GraphQL API.

import fs from "node:fs";
import path from "node:path";
import {
  assertScanNotCollapsed,
  loadPreviousStats,
  renderCrossCheckSection,
  renderSnapshotDeltaSection,
} from "./bureau/report-helpers.mjs";

const API_URL = "https://identity-api.dimo.zone/query";
const OUTPUT_REPORT = "docs/reports/dimo-sybil-report.md";
const OUTPUT_SNAPSHOT = "scripts/data/dimo-snapshot.json";

function pct(n) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return (n * 100).toFixed(1) + "%";
}

/** POST a GraphQL query with timeout + clear failure surfacing (no silent empties). */
async function gql(query, attempt = 1) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout?.(30_000),
    });
  } catch (e) {
    if (attempt < 3) return gql(query, attempt + 1);
    throw new Error(`DIMO API unreachable: ${String(e?.message || e).slice(0, 120)}`);
  }
  const raw = await res.text();
  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return gql(query, attempt + 1);
    }
    throw new Error(`DIMO API HTTP ${res.status}: ${raw.slice(0, 160)}`);
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error("DIMO API returned non-JSON");
  }
  if (body.errors?.length) {
    throw new Error(`DIMO GraphQL error: ${body.errors[0]?.message || "unknown"}`);
  }
  return body.data;
}

// ---- 1. Pull public counts --------------------------------------------------
console.error("[1/2] Querying DIMO Identity API (vehicles + devices) …");
const data = await gql(
  "{ vehicles(first:1){totalCount} aftermarketDevices(first:1){totalCount} syntheticDevices(first:1){totalCount} }",
);

const vehicles = data?.vehicles?.totalCount ?? 0;
const aftermarket = data?.aftermarketDevices?.totalCount ?? 0;
const synthetic = data?.syntheticDevices?.totalCount ?? 0;
console.error(
  `      → ${vehicles.toLocaleString()} vehicles · ${aftermarket.toLocaleString()} hardware · ${synthetic.toLocaleString()} synthetic.`,
);

// ---- 2. Derive composition --------------------------------------------------
const backed = aftermarket + synthetic;
const unbacked = Math.max(0, vehicles - backed);
const hardwarePct = vehicles ? aftermarket / vehicles : 0;
const syntheticPct = vehicles ? synthetic / vehicles : 0;
const backedPct = vehicles ? backed / vehicles : 0;
const unbackedPct = vehicles ? unbacked / vehicles : 0;

const snapAbs = path.resolve(OUTPUT_SNAPSHOT);
const prevStats = loadPreviousStats(snapAbs);
// Don't let a failed/empty API response wipe a good snapshot.
assertScanNotCollapsed({ observed: vehicles, prevStats, label: "dimo" });

const stats = {
  generatedAt: new Date().toISOString(),
  observed: vehicles,
  aftermarketDevices: aftermarket,
  syntheticDevices: synthetic,
  backedDevices: backed,
  unbackedVehicles: unbacked,
  hardwarePct,
  syntheticPct,
  backedPct,
  unbackedPct,
};

fs.mkdirSync(path.dirname(OUTPUT_SNAPSHOT), { recursive: true });
fs.writeFileSync(
  snapAbs,
  JSON.stringify({ generatedAt: stats.generatedAt, source: API_URL, stats, prevStats: prevStats || undefined }, null, 2),
);

const deltaRows = [
  { key: "observed", label: "Vehicle identities minted", value: stats.observed, lowerIsBetter: false },
  { key: "aftermarketDevices", label: "Physical hardware devices", value: stats.aftermarketDevices, lowerIsBetter: false },
  { key: "syntheticDevices", label: "Software/synthetic devices", value: stats.syntheticDevices, lowerIsBetter: false },
  { key: "hardwarePct", label: "Share backed by hardware", value: stats.hardwarePct, pct: true, lowerIsBetter: false },
  { key: "unbackedPct", label: "Share with no connected device", value: stats.unbackedPct, pct: true, lowerIsBetter: true },
];

// ---- 3. Render report -------------------------------------------------------
const now = new Date();
const headline =
  `**Of ${vehicles.toLocaleString()} DIMO vehicle identities, ${aftermarket.toLocaleString()} (${pct(hardwarePct)}) are backed by physical hardware**; ` +
  `${synthetic.toLocaleString()} (${pct(syntheticPct)}) connect via software/synthetic devices, and ${unbacked.toLocaleString()} (${pct(unbackedPct)}) show no connected device on the public registry.`;

const lines = [];
lines.push("# Sybil Risk Scan — DIMO Network");
lines.push("");
lines.push(
  "> Independent public read by the GETKINETIK Bureau using only DIMO's public" +
    " Identity GraphQL API. **No internal DIMO data was used.** A DIMO *vehicle*" +
    " is an on-chain identity; it only produces real telemetry when connected to" +
    " a device — either an *aftermarket device* (physical hardware) or a" +
    " *synthetic device* (software/API connection). This read reports composition," +
    " not allegations: software connections and freshly-minted vehicles are" +
    " legitimate, but the gap between identities and connected hardware is a fair" +
    " question to ask from public data.",
);
lines.push("");
lines.push(`- **As of:** ${now.toISOString().slice(0, 10)}`);
lines.push(`- **Public source:** \`${API_URL}\` (GraphQL, no auth)`);
lines.push(`- **Vehicle identities:** ${vehicles.toLocaleString()}`);
lines.push(`- **Physical hardware devices (aftermarket):** ${aftermarket.toLocaleString()} (${pct(hardwarePct)})`);
lines.push(`- **Software/synthetic devices:** ${synthetic.toLocaleString()} (${pct(syntheticPct)})`);
lines.push(`- **Vehicle identities with no connected device:** ${unbacked.toLocaleString()} (${pct(unbackedPct)})`);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Executive summary");
lines.push("");
lines.push(`1. ${headline}`);
lines.push(
  `2. **Only ${pct(backedPct)} of vehicle identities have any connected device** (hardware or software) on the public registry — the rest are minted identities without an active device link.`,
);
lines.push(
  "3. This is *composition*, not fraud: synthetic (software) connections and recently-minted vehicles awaiting setup are expected. The neutral question is how many reward-eligible identities map to real, active devices — answerable from public data alone.",
);
lines.push("");
lines.push("---");
lines.push("");
lines.push(...renderSnapshotDeltaSection(deltaRows, prevStats));
lines.push("");
lines.push("## 1. Device-backing composition");
lines.push("");
lines.push("| Layer | Count | Share of vehicle identities |");
lines.push("|---|---:|---:|");
lines.push(`| Vehicle identities (on-chain) | ${vehicles.toLocaleString()} | 100% |`);
lines.push(`| Physical hardware (aftermarket devices) | ${aftermarket.toLocaleString()} | ${pct(hardwarePct)} |`);
lines.push(`| Software / synthetic devices | ${synthetic.toLocaleString()} | ${pct(syntheticPct)} |`);
lines.push(`| Any connected device | ${backed.toLocaleString()} | ${pct(backedPct)} |`);
lines.push(`| No connected device on registry | ${unbacked.toLocaleString()} | ${pct(unbackedPct)} |`);
lines.push("");
lines.push("## Methodology");
lines.push("");
lines.push(
  "- All four counts come from DIMO's public Identity GraphQL API (`vehicles`, `aftermarketDevices`, `syntheticDevices` connection `totalCount` fields). No API key, no internal data.",
);
lines.push(
  "- `aftermarketDevices` are physical hardware dongles; `syntheticDevices` are software/API connections (e.g. an automaker cloud link). \"No connected device\" = vehicle identities minus both device classes; some are legitimately mid-onboarding.",
);
lines.push(
  "- Reproduce: `node scripts/sybil-scan-dimo.mjs` — same public endpoint. The counts are point-in-time and move as vehicles/devices are minted.",
);
lines.push("");
lines.push(...renderCrossCheckSection([
  "Confirm how many vehicle identities are expected to exist without an active device (pre-onboarding, churned, or deregistered) vs. counted as active.",
  "Cross-check whether reward eligibility requires an active device link, and how the registry treats long-idle identities.",
  "Reproduce the counts from the public Identity API and compare against internal active-device tallies.",
]));
lines.push("");
lines.push(
  "For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin to `https://getkinetik.app/api/verify-device`.",
);
lines.push("");
lines.push(
  "Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/",
);

fs.mkdirSync(path.dirname(OUTPUT_REPORT), { recursive: true });
fs.writeFileSync(OUTPUT_REPORT, lines.filter((l) => l !== undefined).join("\n"), "utf8");

console.error(`[2/2] Wrote report → ${OUTPUT_REPORT}`);
console.error(`      snapshot → ${OUTPUT_SNAPSHOT}`);
console.error("");
console.error("Summary:");
console.error(`  vehicles              : ${vehicles.toLocaleString()}`);
console.error(`  hardware (aftermarket): ${aftermarket.toLocaleString()} (${pct(hardwarePct)})`);
console.error(`  synthetic (software)  : ${synthetic.toLocaleString()} (${pct(syntheticPct)})`);
console.error(`  no connected device   : ${unbacked.toLocaleString()} (${pct(unbackedPct)})`);
