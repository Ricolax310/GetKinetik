// ============================================================================
// GETKINETIK Bureau — Network-Aware Sybil Risk Scan: Geodnet
//
// Pulls the public Geodnet station list at
// https://rtk.geodnet.com/api/v2/coverage_stations (no auth) and runs
// geometry-only Sybil heuristics. Geodnet stations are GNSS RTK reference
// stations: each one is supposed to be a unique, surveyed, physically installed
// hardware unit at a fixed coordinate. Two stations at the same coordinates is
// structurally meaningless for RTK; clusters tighter than the inter-antenna
// separation of a physical install are an obvious shape to look at.
//
// Run:
//   node scripts/sybil-scan-geodnet.mjs
//
// Output:
//   docs/reports/geodnet-sybil-report.md
//   scripts/data/geodnet-snapshot.json
// ============================================================================

import fs from "node:fs";
import path from "node:path";

const STATIONS_URL = "https://rtk.geodnet.com/api/v2/coverage_stations";
const inputPath = process.argv.find((a) => a.startsWith("--input="))?.split("=")[1] || null;
const generatedAtArg =
  process.argv.find((a) => a.startsWith("--generated-at="))?.split("=")[1] || null;
const OUTPUT_REPORT =
  process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ||
  "docs/reports/geodnet-sybil-report.md";
const OUTPUT_SNAPSHOT =
  process.argv.find((a) => a.startsWith("--snapshot="))?.split("=")[1] ||
  "scripts/data/geodnet-snapshot.json";

const DUPLICATE_RADIUS_M = 10;           // GNSS antennas don't share addresses
const CLUSTER_RADIUS_M = 100;            // tighter than any honest CORS site
const CLUSTER_MIN_COUNT = 4;             // ≥4 stations in 100m is interesting
const SAMPLES_PER_FINDING = 10;

// ---- Helpers ---------------------------------------------------------------
function distanceMeters(a, b) {
  if (
    typeof a.lat !== "number" ||
    typeof a.lng !== "number" ||
    typeof b.lat !== "number" ||
    typeof b.lng !== "number"
  ) {
    return Infinity;
  }
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function gridKey(lat, lng, gridDeg) {
  // Bucket by a coarse grid so we only compare neighbours, not the full set.
  // 0.005° ≈ ~555m at the equator; safe upper bound for both 10m and 100m.
  return Math.floor(lat / gridDeg) + "/" + Math.floor(lng / gridDeg);
}

function stationId(s) {
  return s._scanId;
}

function publicStation(s) {
  const { _scanId, ...station } = s;
  return station;
}

function publicGroup(g) {
  return g.map(publicStation);
}

async function loadStations() {
  if (inputPath) {
    const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    console.error("unexpected fixture shape: expected an array or { data: [...] }");
    process.exit(1);
  }

  const res = await fetch(STATIONS_URL);
  if (!res.ok) {
    console.error("failed: HTTP " + res.status);
    process.exit(1);
  }
  const body = await res.json();
  if (body.code !== 0 || !Array.isArray(body.data)) {
    console.error("unexpected response shape: code=" + body.code);
    process.exit(1);
  }
  return body.data;
}

// ---- 1. Pull ---------------------------------------------------------------
console.error(
  inputPath
    ? "[1/3] Loading Geodnet station fixture …"
    : "[1/3] Fetching Geodnet coverage_stations …",
);
const rawStations = await loadStations();
const stations = rawStations
  .filter(
    (s) =>
      typeof s.lat === "number" &&
      typeof s.lng === "number" &&
      isFinite(s.lat) &&
      isFinite(s.lng),
  )
  .map((s, i) => ({ ...s, _scanId: i }));
console.error(`      → ${stations.length.toLocaleString()} stations with coordinates.`);

// ---- 2. Build spatial index -----------------------------------------------
const GRID_DEG = 0.005;
const grid = new Map();
for (const s of stations) {
  const k = gridKey(s.lat, s.lng, GRID_DEG);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(s);
}

// For each station look only at its own + 8 neighbour cells.
function neighbourCells(lat, lng) {
  const baseLat = Math.floor(lat / GRID_DEG);
  const baseLng = Math.floor(lng / GRID_DEG);
  const out = [];
  for (let dla = -1; dla <= 1; dla++) {
    for (let dln = -1; dln <= 1; dln++) {
      const cell = grid.get(`${baseLat + dla}/${baseLng + dln}`);
      if (cell) out.push(...cell);
    }
  }
  return out;
}

// ---- 3. Heuristics --------------------------------------------------------
console.error("[2/3] Running heuristics …");

// Heuristic A: duplicate or near-duplicate coordinates (≤ DUPLICATE_RADIUS_M).
const duplicates = new Map(); // key -> [stations]
const seenDup = new Set();
for (const a of stations) {
  if (seenDup.has(stationId(a))) continue;
  const neighbours = neighbourCells(a.lat, a.lng);
  const group = [a];
  for (const b of neighbours) {
    if (b === a) continue;
    if (distanceMeters(a, b) <= DUPLICATE_RADIUS_M) group.push(b);
  }
  if (group.length >= 2) {
    const key = `${a.lat.toFixed(5)},${a.lng.toFixed(5)}`;
    if (!duplicates.has(key)) {
      duplicates.set(key, group);
      group.forEach((s) => seenDup.add(stationId(s)));
    }
  }
}

// Heuristic B: tight clusters (≥ CLUSTER_MIN_COUNT within CLUSTER_RADIUS_M).
const clusters = [];
const seenCluster = new Set();
for (const a of stations) {
  if (seenCluster.has(stationId(a))) continue;
  const neighbours = neighbourCells(a.lat, a.lng);
  const group = [a];
  for (const b of neighbours) {
    if (b === a) continue;
    if (distanceMeters(a, b) <= CLUSTER_RADIUS_M) group.push(b);
  }
  if (group.length >= CLUSTER_MIN_COUNT) {
    group.forEach((s) => seenCluster.add(stationId(s)));
    clusters.push(group);
  }
}

// Heuristic C: suspiciously low coordinate precision. Real GNSS sites publish
// coords to 5+ decimal places (≈1 m). Stations at e.g. (37.4, -121.9) or with
// only 1–2 decimals look hand-typed or copied.
function decimalCount(n) {
  const s = String(n);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}
const lowPrecision = stations.filter(
  (s) => decimalCount(s.lat) <= 2 || decimalCount(s.lng) <= 2,
);

// Heuristic D: identical exact lat/lng pairs (the worst case of A — same key).
const exactDupGroups = new Map();
for (const s of stations) {
  const k = `${s.lat},${s.lng}`;
  if (!exactDupGroups.has(k)) exactDupGroups.set(k, []);
  exactDupGroups.get(k).push(s);
}
const exactDups = [...exactDupGroups.values()].filter((g) => g.length >= 2);

// ---- 4. Snapshot ----------------------------------------------------------
fs.mkdirSync(path.dirname(OUTPUT_SNAPSHOT), { recursive: true });
fs.writeFileSync(
  OUTPUT_SNAPSHOT,
  JSON.stringify(
    {
      generatedAt: generatedAtArg || new Date().toISOString(),
      source: inputPath || STATIONS_URL,
      stationsTotal: stations.length,
      duplicates: [...duplicates.values()].map(publicGroup),
      clusters: clusters.map(publicGroup),
      exactDups: exactDups.map(publicGroup),
      lowPrecision: lowPrecision.map(publicStation),
    },
    null,
    2,
  ),
);

// ---- 5. Render report -----------------------------------------------------
console.error("[3/3] Rendering report …");

const flaggedSet = new Set();
// The public endpoint masks names, so rows with the same name are not necessarily
// the same station. Count by source row to avoid collapsing unrelated stations.
[...duplicates.values()].forEach((g) => g.forEach((s) => flaggedSet.add(stationId(s))));
clusters.forEach((g) => g.forEach((s) => flaggedSet.add(stationId(s))));
exactDups.forEach((g) => g.forEach((s) => flaggedSet.add(stationId(s))));
lowPrecision.forEach((s) => flaggedSet.add(stationId(s)));

const now = generatedAtArg ? new Date(generatedAtArg) : new Date();
const lines = [];
lines.push("# Sybil Risk Scan — Geodnet RTK Network");
lines.push("");
lines.push(
  "> Independent scan generated by the GETKINETIK Bureau using only Geodnet's" +
    " public station endpoint. **No internal Geodnet data was used.** Geodnet" +
    " RTK stations are surveyed GNSS reference units — each one is supposed to" +
    " be a unique, physically installed antenna at a fixed coordinate. The" +
    " heuristics below treat that as the structural rule and flag exceptions.",
);
lines.push("");
lines.push(`- **Generated:** ${now.toISOString()}`);
lines.push(`- **Public source:** \`${STATIONS_URL}\``);
lines.push(`- **Stations observed:** ${stations.length.toLocaleString()}`);
lines.push(
  `- **Stations flagged (any heuristic):** ${flaggedSet.size.toLocaleString()} ` +
    `(${((flaggedSet.size / stations.length) * 100).toFixed(2)}%)`,
);
lines.push("");
lines.push("---");
lines.push("");

lines.push("## Headline findings");
lines.push("");
lines.push(
  `1. **${exactDups.length.toLocaleString()} groups of stations share an exact (lat, lng) pair.** ` +
    "For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined " +
    "— there is no second-antenna position to triangulate from.",
);
lines.push(
  `2. **${duplicates.size.toLocaleString()} clusters of stations sit within ${DUPLICATE_RADIUS_M} m of each other.** ` +
    "That's tighter than the physical separation of two real RTK installs.",
);
lines.push(
  `3. **${clusters.length.toLocaleString()} clusters have ≥${CLUSTER_MIN_COUNT} stations within ${CLUSTER_RADIUS_M} m.** ` +
    "Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.",
);
lines.push(
  `4. **${lowPrecision.length.toLocaleString()} stations publish coordinates with ≤ 2 decimal places** ` +
    "(≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.",
);
lines.push("");
lines.push("---");
lines.push("");

// Exact dups ----------------------------------------------------------------
lines.push(`## 1. Exact-coordinate duplicates — ${exactDups.length.toLocaleString()} groups`);
lines.push("");
if (exactDups.length === 0) {
  lines.push("_No exact (lat, lng) duplicates observed._");
} else {
  lines.push("| Coordinates | Station count | Names |");
  lines.push("|---|---:|---|");
  exactDups
    .sort((a, b) => b.length - a.length)
    .slice(0, SAMPLES_PER_FINDING)
    .forEach((g) => {
      const s = g[0];
      lines.push(
        `| \`${s.lat}, ${s.lng}\` | ${g.length} | ${g
          .map((x) => "`" + x.name + "`")
          .join(", ")} |`,
      );
    });
  if (exactDups.length > SAMPLES_PER_FINDING) {
    lines.push("");
    lines.push(
      `_…and ${exactDups.length - SAMPLES_PER_FINDING} more in the snapshot file._`,
    );
  }
}
lines.push("");

// Near-duplicates -----------------------------------------------------------
lines.push(
  `## 2. Near-duplicate stations within ${DUPLICATE_RADIUS_M} m — ${duplicates.size.toLocaleString()} clusters`,
);
lines.push("");
if (duplicates.size === 0) {
  lines.push("_No near-duplicate clusters._");
} else {
  lines.push("| Anchor (lat, lng) | Station count | Names (truncated) |");
  lines.push("|---|---:|---|");
  [...duplicates.values()]
    .sort((a, b) => b.length - a.length)
    .slice(0, SAMPLES_PER_FINDING)
    .forEach((g) => {
      const c = g[0];
      lines.push(
        `| ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)} | ${g.length} | ${g
          .slice(0, 6)
          .map((x) => "`" + x.name + "`")
          .join(", ")}${g.length > 6 ? ` …(+${g.length - 6})` : ""} |`,
      );
    });
  if (duplicates.size > SAMPLES_PER_FINDING) {
    lines.push("");
    lines.push(
      `_…and ${duplicates.size - SAMPLES_PER_FINDING} more in the snapshot file._`,
    );
  }
}
lines.push("");

// Tight clusters ------------------------------------------------------------
lines.push(
  `## 3. Tight clusters (≥${CLUSTER_MIN_COUNT} within ${CLUSTER_RADIUS_M} m) — ${clusters.length.toLocaleString()} clusters`,
);
lines.push("");
if (clusters.length === 0) {
  lines.push("_No clusters met the threshold._");
} else {
  lines.push("| Anchor (lat, lng) | Station count |");
  lines.push("|---|---:|");
  clusters
    .sort((a, b) => b.length - a.length)
    .slice(0, SAMPLES_PER_FINDING)
    .forEach((g) => {
      const c = g[0];
      lines.push(
        `| ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)} | ${g.length} |`,
      );
    });
  if (clusters.length > SAMPLES_PER_FINDING) {
    lines.push("");
    lines.push(
      `_…and ${clusters.length - SAMPLES_PER_FINDING} more in the snapshot file._`,
    );
  }
}
lines.push("");

// Low precision -------------------------------------------------------------
lines.push(
  `## 4. Stations with ≤ 2 decimal places of coordinate precision — ${lowPrecision.length.toLocaleString()}`,
);
lines.push("");
if (lowPrecision.length === 0) {
  lines.push("_None — every station publishes ≥ 3 decimal places._");
} else {
  lines.push("| Name | Lat | Lng |");
  lines.push("|---|---:|---:|");
  lowPrecision.slice(0, SAMPLES_PER_FINDING).forEach((s) => {
    lines.push(`| \`${s.name}\` | ${s.lat} | ${s.lng} |`);
  });
  if (lowPrecision.length > SAMPLES_PER_FINDING) {
    lines.push("");
    lines.push(
      `_…and ${lowPrecision.length - SAMPLES_PER_FINDING} more in the snapshot file._`,
    );
  }
}
lines.push("");

// Methodology ----------------------------------------------------------------
lines.push("---");
lines.push("");
lines.push("## Methodology");
lines.push("");
lines.push(
  "Each finding is grounded in how a real CORS / RTK network is physically supposed to look:",
);
lines.push(
  "- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.",
);
lines.push(
  "- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.",
);
lines.push(
  "- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.",
);
lines.push(
  `- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.`,
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

console.error(`      wrote ${OUTPUT_REPORT}`);
console.error(`      snapshot → ${OUTPUT_SNAPSHOT}`);
console.error("");
console.error("Summary:");
console.error(`  stations              : ${stations.length}`);
console.error(`  flagged (any)         : ${flaggedSet.size}`);
console.error(`  exact-dup groups      : ${exactDups.length}`);
console.error(`  ≤${DUPLICATE_RADIUS_M}m clusters         : ${duplicates.size}`);
console.error(`  ≥${CLUSTER_MIN_COUNT}/${CLUSTER_RADIUS_M}m clusters       : ${clusters.length}`);
console.error(`  low-precision coords  : ${lowPrecision.length}`);
