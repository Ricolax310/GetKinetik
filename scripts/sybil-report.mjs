// Node-list geometry heuristics → markdown report.
// node scripts/sybil-report.mjs <input.json> [--network=Name] [--out=path.md]
//
// Input schema (see scripts/sample-nodes.json):
//   [
//     {
//       "id": "string",              // required - partner network's node id
//       "lat": number,               // optional - decimal degrees
//       "lng": number,               // optional - decimal degrees
//       "firstSeenMs": number,       // optional - epoch ms when first observed
//       "lifetimeBeats": number,     // optional - claimed total uptime ticks
//       "lifetimeRewardUsd": number, // optional - cumulative payout to date
//       "metadata": {                // optional - any partner-specific fields
//         "firmware": "string",
//         "hardwareId": "string"
//       }
//     }
//   ]

import fs from "node:fs";
import path from "node:path";

// ---- Tunables ---------------------------------------------------------------
// Conservative thresholds: a false positive costs us credibility with the
// partner; better to under-flag than to over-flag. Anything tighter and we
// would have to defend each call in the report.
const COLOCATION_RADIUS_M = 50;          // nodes within 50m count as co-located
const COLOCATION_MIN_CLUSTER = 5;        // need >=5 nodes to call it a cluster
const BIRTH_BURST_WINDOW_MS = 60 * 60_000; // 60-minute bucket
const BIRTH_BURST_MIN_COUNT = 10;        // >=10 nodes minted in one bucket
const BEAT_RATE_MAX_PER_SECOND = 1.0;    // > 1 beat/sec is physically silly
const TWIN_MIN_COUNT = 3;                // >=3 nodes sharing exact metadata
const REPORT_EXAMPLES_PER_FINDING = 8;   // truncate example lists in output

// ---- Arg parsing ------------------------------------------------------------
const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith("--"));
const networkName =
  args.find((a) => a.startsWith("--network="))?.split("=")[1] || "UnnamedNetwork";
const outPath =
  args.find((a) => a.startsWith("--out="))?.split("=")[1] || null;

if (!inputPath) {
  console.error(
    "usage: node scripts/sybil-report.mjs <input.json> [--network=Name] [--out=report.md]",
  );
  process.exit(1);
}

const absInput = path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(absInput)) {
  console.error(`input not found: ${absInput}`);
  process.exit(1);
}

let nodes;
try {
  nodes = JSON.parse(fs.readFileSync(absInput, "utf8"));
} catch (err) {
  console.error(`failed to parse JSON: ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(nodes)) {
  console.error("input JSON must be an array of node objects.");
  process.exit(1);
}

// ---- Math helpers -----------------------------------------------------------
// Haversine distance in metres. Standard formula; accurate enough for the
// co-location heuristic, where we only care whether two coordinates are within
// tens of metres of each other.
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

function fmtUsd(n) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtMs(ms) {
  if (typeof ms !== "number") return "—";
  return new Date(ms).toISOString().replace("T", " ").replace(/\..+/, "Z");
}

// ---- Heuristics -------------------------------------------------------------

// 1. Co-location clusters: 5+ nodes within COLOCATION_RADIUS_M of each other.
// Real-world honest nodes do not cluster this tightly unless the operator is
// literally running a rack of identical devices in one room, which is itself
// a Sybil pattern.
function findColocationClusters(nodes) {
  const located = nodes.filter(
    (n) => typeof n.lat === "number" && typeof n.lng === "number",
  );
  const seen = new Set();
  const clusters = [];
  for (let i = 0; i < located.length; i++) {
    if (seen.has(located[i].id)) continue;
    const group = [located[i]];
    for (let j = i + 1; j < located.length; j++) {
      if (seen.has(located[j].id)) continue;
      if (distanceMeters(located[i], located[j]) <= COLOCATION_RADIUS_M) {
        group.push(located[j]);
      }
    }
    if (group.length >= COLOCATION_MIN_CLUSTER) {
      group.forEach((n) => seen.add(n.id));
      clusters.push(group);
    }
  }
  return clusters;
}

// 2. Birth bursts: nodes whose firstSeenMs falls in a 60-minute window that
// contains BIRTH_BURST_MIN_COUNT+ entries. Organic onboarding spreads through
// the day; bursts of 10+ in an hour are almost always a single operator
// scripting a fleet onboard.
function findBirthBursts(nodes) {
  const dated = nodes
    .filter((n) => typeof n.firstSeenMs === "number")
    .sort((a, b) => a.firstSeenMs - b.firstSeenMs);
  const buckets = new Map();
  for (const n of dated) {
    const k = Math.floor(n.firstSeenMs / BIRTH_BURST_WINDOW_MS);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(n);
  }
  const bursts = [];
  for (const [k, list] of buckets.entries()) {
    if (list.length >= BIRTH_BURST_MIN_COUNT) {
      bursts.push({
        windowStartMs: k * BIRTH_BURST_WINDOW_MS,
        windowEndMs: (k + 1) * BIRTH_BURST_WINDOW_MS,
        nodes: list,
      });
    }
  }
  return bursts;
}

// 3. Beat-rate impossibility: lifetimeBeats / age must be sane. >1 beat/sec
// claimed implies the device is lying about uptime, the network is paying for
// fake heartbeats, or the firmware is broken. Reuses the same shape as the
// GETKINETIK Genesis Score v1.1 sanity check.
function findBeatRateOutliers(nodes) {
  const now = Date.now();
  const flagged = [];
  for (const n of nodes) {
    if (
      typeof n.lifetimeBeats !== "number" ||
      typeof n.firstSeenMs !== "number"
    ) {
      continue;
    }
    const ageSec = Math.max((now - n.firstSeenMs) / 1000, 1);
    const rate = n.lifetimeBeats / ageSec;
    if (rate > BEAT_RATE_MAX_PER_SECOND) {
      flagged.push({ ...n, _beatRatePerSec: rate });
    }
  }
  return flagged;
}

// 4. Metadata twins: 3+ nodes sharing an exact (firmware, hardwareId) tuple.
// Honest hardware fleets vary in firmware (rollouts are gradual). A perfect
// match across many nodes points to cloning, emulation, or a single image
// flashed to a fleet.
function findMetadataTwins(nodes) {
  const groups = new Map();
  for (const n of nodes) {
    const fw = n?.metadata?.firmware;
    const hw = n?.metadata?.hardwareId;
    if (!fw && !hw) continue;
    const key = `${fw || ""}|${hw || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  const twins = [];
  for (const [key, list] of groups.entries()) {
    if (list.length >= TWIN_MIN_COUNT && key !== "|") {
      twins.push({ key, nodes: list });
    }
  }
  return twins;
}

// ---- Run heuristics ---------------------------------------------------------
const colocations = findColocationClusters(nodes);
const bursts = findBirthBursts(nodes);
const beatOutliers = findBeatRateOutliers(nodes);
const twins = findMetadataTwins(nodes);

const flaggedSet = new Set();
colocations.forEach((c) => c.forEach((n) => flaggedSet.add(n.id)));
bursts.forEach((b) => b.nodes.forEach((n) => flaggedSet.add(n.id)));
beatOutliers.forEach((n) => flaggedSet.add(n.id));
twins.forEach((t) => t.nodes.forEach((n) => flaggedSet.add(n.id)));

const flaggedRewardUsd = nodes
  .filter((n) => flaggedSet.has(n.id))
  .reduce(
    (sum, n) => (typeof n.lifetimeRewardUsd === "number" ? sum + n.lifetimeRewardUsd : sum),
    0,
  );

// ---- Render markdown --------------------------------------------------------
const now = new Date();
const lines = [];

lines.push(`# Sybil Risk Scan — ${networkName}`);
lines.push("");
lines.push(
  `> Independent public read by the GETKINETIK Bureau using a subset of the` +
    ` same heuristics that drive Genesis Score v1.1. **No internal data from` +
    ` ${networkName} was used** — this report is built from the public node set` +
    ` provided to the script. For an authoritative GETKINETIK grade on any node,` +
    ` POST it to \`/api/verify-device\`.`,
);
lines.push("");
lines.push(`- **As of:** ${now.toISOString().slice(0, 10)}`);
lines.push(`- **Input file:** \`${path.relative(process.cwd(), absInput)}\``);
lines.push(`- **Nodes scanned:** ${nodes.length.toLocaleString()}`);
lines.push(
  `- **Nodes flagged:** ${flaggedSet.size.toLocaleString()} (${
    nodes.length ? ((flaggedSet.size / nodes.length) * 100).toFixed(1) : "0"
  }%)`,
);
if (flaggedRewardUsd > 0) {
  lines.push(
    `- **Estimated payout exposure on flagged nodes:** ${fmtUsd(flaggedRewardUsd)}`,
  );
}
lines.push("");
lines.push("---");
lines.push("");

// Methodology block
lines.push("## How this scan works");
lines.push("");
lines.push(
  "Four conservative heuristics. Each one would, on its own, be defensible in" +
    " front of an auditor — none of them rely on guessing intent.",
);
lines.push("");
lines.push(
  `1. **Co-location clusters** — ≥${COLOCATION_MIN_CLUSTER} nodes within ` +
    `${COLOCATION_RADIUS_M}m of each other.`,
);
lines.push(
  `2. **Birth bursts** — ≥${BIRTH_BURST_MIN_COUNT} nodes first observed inside the same 60-minute window.`,
);
lines.push(
  `3. **Beat-rate impossibility** — claimed lifetime heartbeats per second > ${BEAT_RATE_MAX_PER_SECOND.toFixed(
    1,
  )}.`,
);
lines.push(
  `4. **Metadata twins** — ≥${TWIN_MIN_COUNT} nodes sharing an exact (firmware, hardwareId) fingerprint.`,
);
lines.push("");
lines.push(
  "Honest single-operator clusters (e.g. a coffee shop running two devices) do" +
    " not trigger these thresholds. The bureau errs on the side of false" +
    " negatives over false positives.",
);
lines.push("");
lines.push("---");
lines.push("");

// 1. Co-location
lines.push(`## 1. Co-location clusters — ${colocations.length} found`);
lines.push("");
if (colocations.length === 0) {
  lines.push("_No clusters meeting the threshold._");
} else {
  colocations.slice(0, REPORT_EXAMPLES_PER_FINDING).forEach((c, idx) => {
    const center = c[0];
    const reward = c.reduce(
      (s, n) => (typeof n.lifetimeRewardUsd === "number" ? s + n.lifetimeRewardUsd : s),
      0,
    );
    lines.push(
      `### Cluster ${idx + 1} — ${c.length} nodes near (${center.lat.toFixed(
        5,
      )}, ${center.lng.toFixed(5)})`,
    );
    if (reward > 0) lines.push(`- **Payout exposure:** ${fmtUsd(reward)}`);
    lines.push(`- **Node IDs:** \`${c.map((n) => n.id).join("`, `")}\``);
    lines.push("");
  });
  if (colocations.length > REPORT_EXAMPLES_PER_FINDING) {
    lines.push(
      `_…and ${colocations.length - REPORT_EXAMPLES_PER_FINDING} more clusters truncated for brevity._`,
    );
    lines.push("");
  }
}
lines.push("");

// 2. Birth bursts
lines.push(
  `## 2. Birth bursts — ${bursts.length} ${bursts.length === 1 ? "window" : "windows"}`,
);
lines.push("");
if (bursts.length === 0) {
  lines.push("_No 60-minute windows met the threshold._");
} else {
  bursts.slice(0, REPORT_EXAMPLES_PER_FINDING).forEach((b, idx) => {
    lines.push(
      `### Window ${idx + 1} — ${fmtMs(b.windowStartMs)} → ${fmtMs(
        b.windowEndMs,
      )} — ${b.nodes.length} new nodes`,
    );
    lines.push(
      `- **Node IDs (first 10):** \`${b.nodes
        .slice(0, 10)
        .map((n) => n.id)
        .join("`, `")}\`${b.nodes.length > 10 ? `, …(+${b.nodes.length - 10})` : ""}`,
    );
    lines.push("");
  });
}
lines.push("");

// 3. Beat-rate
lines.push(
  `## 3. Beat-rate impossibility — ${beatOutliers.length} nodes`,
);
lines.push("");
if (beatOutliers.length === 0) {
  lines.push("_All nodes within physical limits._");
} else {
  lines.push("| Node ID | Lifetime beats | Age (h) | Beats/sec |");
  lines.push("|---|---:|---:|---:|");
  beatOutliers
    .sort((a, b) => b._beatRatePerSec - a._beatRatePerSec)
    .slice(0, REPORT_EXAMPLES_PER_FINDING)
    .forEach((n) => {
      const ageHrs = ((Date.now() - n.firstSeenMs) / 3_600_000).toFixed(1);
      lines.push(
        `| \`${n.id}\` | ${n.lifetimeBeats.toLocaleString()} | ${ageHrs} | ${n._beatRatePerSec.toFixed(2)} |`,
      );
    });
  if (beatOutliers.length > REPORT_EXAMPLES_PER_FINDING) {
    lines.push("");
    lines.push(
      `_…and ${beatOutliers.length - REPORT_EXAMPLES_PER_FINDING} more truncated._`,
    );
  }
}
lines.push("");

// 4. Twins
lines.push(`## 4. Metadata twins — ${twins.length} fingerprint groups`);
lines.push("");
if (twins.length === 0) {
  lines.push("_No fingerprint collisions at the threshold._");
} else {
  twins.slice(0, REPORT_EXAMPLES_PER_FINDING).forEach((t, idx) => {
    const [fw, hw] = t.key.split("|");
    lines.push(
      `### Fingerprint ${idx + 1} — \`firmware=${fw || "?"}\` \`hardwareId=${hw || "?"}\` — ${t.nodes.length} nodes`,
    );
    lines.push(
      `- **Node IDs (first 10):** \`${t.nodes
        .slice(0, 10)
        .map((n) => n.id)
        .join("`, `")}\`${t.nodes.length > 10 ? `, …(+${t.nodes.length - 10})` : ""}`,
    );
    lines.push("");
  });
}
lines.push("");

// Footer / call to action
lines.push("---");
lines.push("");
lines.push("## Recommended next steps");
lines.push("");
lines.push(
  "1. Pull the flagged node IDs through your own internal fraud pipeline as a" +
    " second opinion.",
);
lines.push(
  "2. For nodes that also run GETKINETIK, POST their Proof of Origin URL to" +
    " `https://getkinetik.app/api/verify-device` — the bureau will return a" +
    " Genesis Score, tamper flags, and chain history.",
);
lines.push(
  "3. For everything else, the bureau is glad to provide a deeper run" +
    " (sensor coherence, cross-network signals, score-change webhooks).",
);
lines.push("");
lines.push(
  `Contact: **eric@outfromnothingllc.com** · ` +
    `https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/`,
);
lines.push("");

const markdown = lines.join("\n");

if (outPath) {
  const absOut = path.resolve(process.cwd(), outPath);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, markdown, "utf8");
  console.error(`wrote report → ${absOut}`);
} else {
  process.stdout.write(markdown);
}
