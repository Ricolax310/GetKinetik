// WeatherXM cells API scan → report + snapshot.

import fs from "node:fs";
import path from "node:path";
import {
  assertScanNotCollapsed,
  loadPreviousStats,
  renderCrossCheckSection,
  renderExecutiveSummary,
  renderSnapshotDeltaSection,
} from "./bureau/report-helpers.mjs";

// ---- Tunables ---------------------------------------------------------------
const CELLS_URL = "https://api.weatherxm.com/api/v1/cells";
const DEVICES_URL = (idx) =>
  `https://api.weatherxm.com/api/v1/cells/${idx}/devices`;

const MAX_DRILL_CELLS = Number(
  process.argv.find((a) => a.startsWith("--max-cells="))?.split("=")[1] ?? 60,
);
const REQUEST_DELAY_MS = 250; // be polite; ~4 req/s
const OUTPUT_REPORT = "docs/reports/weatherxm-sybil-report.md";
const OUTPUT_SNAPSHOT = "scripts/data/weatherxm-snapshot.json";

// Severity thresholds for the headline tables.
const OVERCAPACITY_RATIO = 1.5;      // device_count / capacity ≥ 1.5 is flagged
const LOW_QOD_THRESHOLD = 30;        // avg_data_quality < 30 with many devices
const TOP_BUNDLES_PER_CELL = 3;      // show up to this many homogenous bundles

// ---- Helpers ----------------------------------------------------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pct(n) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return (n * 100).toFixed(1) + "%";
}

function plural(n, word) {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

// ---- 1. Pull all cells ------------------------------------------------------
console.error("[1/3] Fetching WeatherXM /api/v1/cells …");
const cellsRes = await fetch(CELLS_URL);
if (!cellsRes.ok) {
  console.error(`failed to fetch cells: HTTP ${cellsRes.status}`);
  process.exit(1);
}
const cells = await cellsRes.json();
console.error(`      → ${cells.length.toLocaleString()} cells received.`);

// ---- 2. Identify suspicious cells ------------------------------------------
const cellsWithStats = cells.map((c) => {
  const ratio = c.capacity > 0 ? c.device_count / c.capacity : 0;
  return { ...c, _ratio: ratio };
});

const overCapacity = cellsWithStats
  .filter(
    (c) =>
      c.capacity > 0 &&
      c.device_count >= 2 &&
      c._ratio >= OVERCAPACITY_RATIO,
  )
  .sort((a, b) => b._ratio - a._ratio);

const drillTargets = overCapacity.slice(0, MAX_DRILL_CELLS);

console.error(
  `[2/3] ${overCapacity.length} cells over capacity (ratio ≥ ${OVERCAPACITY_RATIO}). ` +
    `Drilling top ${drillTargets.length} …`,
);

// ---- 3. Drill into each suspect cell ---------------------------------------
const drilled = [];
for (let i = 0; i < drillTargets.length; i++) {
  const cell = drillTargets[i];
  try {
    const r = await fetch(DEVICES_URL(cell.index));
    if (r.ok) {
      const devices = await r.json();
      drilled.push({ cell, devices });
    } else {
      drilled.push({ cell, devices: [], _error: `HTTP ${r.status}` });
    }
  } catch (err) {
    drilled.push({ cell, devices: [], _error: String(err?.message || err) });
  }
  if ((i + 1) % 10 === 0) {
    console.error(`      … ${i + 1}/${drillTargets.length}`);
  }
  await sleep(REQUEST_DELAY_MS);
}

// ---- 4. Derived metrics -----------------------------------------------------
let totalDevicesInDrilled = 0;
let polLocationFlags = 0;
let polOtherFlags = 0;
let inactiveButPresent = 0;
let lowQodDevices = 0;
const polReasonHistogram = new Map();
const bundleHistogramGlobal = new Map();

for (const { cell, devices } of drilled) {
  totalDevicesInDrilled += devices.length;
  for (const d of devices) {
    const reason = d?.metrics?.pol_reason;
    if (reason) {
      polReasonHistogram.set(reason, (polReasonHistogram.get(reason) || 0) + 1);
      if (reason === "NO_LOCATION_DATA") polLocationFlags++;
      else polOtherFlags++;
    }
    if (typeof d?.metrics?.qod_score === "number" && d.metrics.qod_score < LOW_QOD_THRESHOLD) {
      lowQodDevices++;
    }
    if (d.isActive === false) inactiveButPresent++;
    const bundleKey = `${d?.bundle?.ws_model || "?"} / ${d?.bundle?.gw_model || "?"}`;
    bundleHistogramGlobal.set(
      bundleKey,
      (bundleHistogramGlobal.get(bundleKey) || 0) + 1,
    );
  }
}

const topReasons = [...polReasonHistogram.entries()].sort((a, b) => b[1] - a[1]);
const topBundles = [...bundleHistogramGlobal.entries()].sort((a, b) => b[1] - a[1]);

const snapAbs = path.resolve(OUTPUT_SNAPSHOT);
const prevStats = loadPreviousStats(snapAbs);
// Don't let a failed/empty fetch wipe a good snapshot.
assertScanNotCollapsed({ observed: cells.length, prevStats, label: "weatherxm" });
const stats = {
  generatedAt: new Date().toISOString(),
  observed: cells.length,
  overCapacityCells: overCapacity.length,
  overCapacityPct: cells.length ? overCapacity.length / cells.length : 0,
  drilledCells: drilled.length,
  devicesInDrilled: totalDevicesInDrilled,
  polNoLocation: polLocationFlags,
  polOther: polOtherFlags,
  inactiveInDrilled: inactiveButPresent,
  lowQodInDrilled: lowQodDevices,
};

fs.mkdirSync(path.dirname(OUTPUT_SNAPSHOT), { recursive: true });
fs.writeFileSync(
  snapAbs,
  JSON.stringify(
    {
      generatedAt: stats.generatedAt,
      cellsTotal: cells.length,
      overCapacity: overCapacity.length,
      stats,
      prevStats: prevStats || undefined,
      drilled,
    },
    null,
    2,
  ),
);

const deltaRows = [
  { key: "observed", label: "Cells on public map", value: stats.observed, lowerIsBetter: false },
  { key: "overCapacityCells", label: `Cells ≥${OVERCAPACITY_RATIO}× capacity`, value: stats.overCapacityCells },
  {
    key: "overCapacityPct",
    label: "Share of map over capacity",
    value: stats.overCapacityPct,
    pct: true,
    lowerIsBetter: true,
  },
  { key: "polNoLocation", label: "`NO_LOCATION_DATA` in drilled set", value: stats.polNoLocation },
  { key: "lowQodInDrilled", label: `Devices with qod < ${LOW_QOD_THRESHOLD} (drilled)`, value: stats.lowQodInDrilled },
];

// ---- 5. Render markdown -----------------------------------------------------
const now = new Date();
const lines = [];

lines.push("# Sybil Risk Scan — WeatherXM Network");
lines.push("");
lines.push(
  "> Independent public read by the GETKINETIK Bureau using only the" +
    " WeatherXM Network's public API. No internal WeatherXM data was used." +
    " Findings below are *shape*, not allegations; the underlying signals" +
    " (capacity, `pol_reason`, `qod_score`) come from the network's own model.",
);
lines.push("");
lines.push(`- **As of:** ${now.toISOString().slice(0, 10)}`);
lines.push(`- **Public source:** \`${CELLS_URL}\``);
lines.push(`- **Cells observed:** ${cells.length.toLocaleString()}`);
lines.push(
  `- **Cells over designed capacity (≥${OVERCAPACITY_RATIO}× capacity):** ${overCapacity.length.toLocaleString()} (${pct(
    overCapacity.length / cells.length,
  )})`,
);
lines.push(
  `- **Cells drilled in this report:** ${drilled.length.toLocaleString()} (top by capacity ratio)`,
);
lines.push(`- **Devices observed inside drilled cells:** ${totalDevicesInDrilled.toLocaleString()}`);
lines.push("");
lines.push(
  ...renderExecutiveSummary([
    `**${overCapacity.length.toLocaleString()} cells** exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.`,
    `**${polLocationFlags.toLocaleString()} devices** in the hottest cells carry WeatherXM's own \`NO_LOCATION_DATA\` flag — compare to your internal pol pipeline, not ours.`,
    `**${lowQodDevices.toLocaleString()}** drilled devices sit below qod ${LOW_QOD_THRESHOLD} while still counted toward cell saturation.`,
  ]),
);
lines.push(
  ...renderSnapshotDeltaSection(deltaRows, prevStats),
);
lines.push(
  ...renderCrossCheckSection([
    "Capacity policy: for §1 top H3 cells, confirm whether device_count should exceed capacity or inactive devices should drop off the cell tally.",
    "Proof-of-location: reconcile §2 `pol_reason` histogram with your dashboard — we only read what the public API returns.",
    "Hardware mix: §3 bundle counts inside over-capacity cells — popular kit vs single-operator fleet is for you to judge.",
    "Reproduce: `node scripts/sybil-scan-weatherxm.mjs` — public cells API, no auth.",
  ]),
);

// Headline findings -----------------------------------------------------------
lines.push("## Headline findings");
lines.push("");
lines.push(
  `1. **${overCapacity.length.toLocaleString()} cells** report more devices than the cell's designed capacity. ` +
    "Capacity is a WeatherXM-defined limit (the network's own model of how many devices a hex should sensibly hold).",
);
lines.push(
  `2. Of the ${totalDevicesInDrilled.toLocaleString()} devices inside the most over-capacity cells, ` +
    `**${polLocationFlags.toLocaleString()}** are flagged with \`pol_reason: NO_LOCATION_DATA\` ` +
    `and **${polOtherFlags.toLocaleString()}** with another \`pol_reason\` value — all set by WeatherXM's own pipeline.`,
);
lines.push(
  `3. **${inactiveButPresent.toLocaleString()}** of those devices are inactive yet still counted in the cell, and ` +
    `**${lowQodDevices.toLocaleString()}** have \`qod_score < ${LOW_QOD_THRESHOLD}\`.`,
);
lines.push("");
lines.push("---");
lines.push("");

// Top over-capacity table -----------------------------------------------------
lines.push("## 1. Most over-capacity cells");
lines.push("");
lines.push(
  "Cells ordered by `device_count / capacity`. The first column is the H3 index;" +
    " click through on `https://explorer.weatherxm.com/` to see the hex on the map.",
);
lines.push("");
lines.push("| H3 cell | Devices | Capacity | Ratio | Active | Avg QoD | Center (lat, lon) |");
lines.push("|---|---:|---:|---:|---:|---:|---|");
drilled.slice(0, 25).forEach(({ cell }) => {
  lines.push(
    `| \`${cell.index}\` | ${cell.device_count} | ${cell.capacity} | ${cell._ratio.toFixed(
      1,
    )}× | ${cell.active_device_count} | ${cell.avg_data_quality} | ${cell.center.lat.toFixed(
      4,
    )}, ${cell.center.lon.toFixed(4)} |`,
  );
});
if (drilled.length > 25) {
  lines.push("");
  lines.push(
    `_…and ${drilled.length - 25} more drilled cells in the snapshot file._`,
  );
}
lines.push("");

// pol_reason histogram --------------------------------------------------------
lines.push("## 2. WeatherXM's own proof-of-location flags (drilled cells)");
lines.push("");
if (topReasons.length === 0) {
  lines.push("_No `pol_reason` values observed in the drilled set._");
} else {
  lines.push("| pol_reason | Device count |");
  lines.push("|---|---:|");
  topReasons.forEach(([reason, count]) => {
    lines.push(`| \`${reason}\` | ${count} |`);
  });
}
lines.push("");
lines.push(
  "These flags are produced by WeatherXM's own pipeline. The bureau did not" +
    " invent them; the report only counts them and reads them back.",
);
lines.push("");

// Top bundles -----------------------------------------------------------------
lines.push("## 3. Hardware-bundle homogeneity inside flagged cells");
lines.push("");
lines.push(
  "Bundles are reported by the device (`ws_model` / `gw_model`). High counts of" +
    " a single bundle inside over-capacity cells can be honest (popular kit) or" +
    " can mark a single-operator fleet. Treat as a hint, not a verdict.",
);
lines.push("");
lines.push("| ws_model / gw_model | Device count |");
lines.push("|---|---:|");
topBundles.slice(0, 10).forEach(([key, count]) => {
  lines.push(`| ${key} | ${count} |`);
});
lines.push("");

// Per-cell device tables for top 5 ------------------------------------------
lines.push("## 4. Device-level detail — top 5 most over-capacity cells");
lines.push("");
drilled.slice(0, 5).forEach(({ cell, devices }, idx) => {
  lines.push(
    `### ${idx + 1}. Cell \`${cell.index}\` — ${cell.device_count} devices in capacity ${cell.capacity} (${cell._ratio.toFixed(1)}×)`,
  );
  lines.push("");
  if (devices.length === 0) {
    lines.push("_No device data returned._");
    lines.push("");
    return;
  }
  lines.push("| Device ID | Active | QoD | pol_reason | Bundle | Last activity |");
  lines.push("|---|:-:|---:|---|---|---|");
  devices.slice(0, 12).forEach((d) => {
    const bundle = `${d?.bundle?.ws_model || "?"}/${d?.bundle?.gw_model || "?"}`;
    lines.push(
      `| \`${d.id}\` | ${d.isActive ? "Y" : "N"} | ${
        d?.metrics?.qod_score ?? "—"
      } | ${d?.metrics?.pol_reason || "—"} | ${bundle} | ${
        d.lastWeatherStationActivity || "—"
      } |`,
    );
  });
  if (devices.length > 12) {
    lines.push("");
    lines.push(`_…and ${devices.length - 12} more devices in this cell._`);
  }
  lines.push("");
});

// Footer ---------------------------------------------------------------------
lines.push("---");
lines.push("");
lines.push("## Methodology");
lines.push("");
lines.push(
  "Each finding is grounded in WeatherXM's own public model:",
);
lines.push(
  "- `device_count` vs `capacity` is the network's own measure of cell saturation.",
);
lines.push(
  "- `pol_reason` and `qod_score` come straight out of WeatherXM's pipeline; the bureau only aggregates them.",
);
lines.push(
  "- `bundle.ws_model` / `bundle.gw_model` is reported by the device itself.",
);
lines.push(
  "- The drilled set is intentionally small (top " +
    drilled.length +
    " cells) so every row in section 4 is auditable by hand.",
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

const markdown = lines.join("\n");

fs.mkdirSync(path.dirname(OUTPUT_REPORT), { recursive: true });
fs.writeFileSync(OUTPUT_REPORT, markdown, "utf8");

console.error(`[3/3] wrote ${OUTPUT_REPORT}`);
console.error(`      snapshot → ${OUTPUT_SNAPSHOT}`);
console.error("");
console.error("Summary:");
console.error(`  cells total           : ${cells.length}`);
console.error(`  over-capacity cells   : ${overCapacity.length}`);
console.error(`  drilled cells         : ${drilled.length}`);
console.error(`  devices in drilled    : ${totalDevicesInDrilled}`);
console.error(`  pol_reason: NO_LOC    : ${polLocationFlags}`);
console.error(`  pol_reason: other     : ${polOtherFlags}`);
console.error(`  inactive but present  : ${inactiveButPresent}`);
console.error(`  qod < ${LOW_QOD_THRESHOLD}                : ${lowQodDevices}`);
