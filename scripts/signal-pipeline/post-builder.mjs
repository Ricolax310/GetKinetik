// Build a concrete, data-rich, multi-network ecosystem thread from a feed.
//
// Rules honored:
//   - every tweet names >= 2 networks
//   - real numbers, neutral/descriptive tone (no interpretation words)
//   - ecosystem-first hook, then grouped network data
//
// Returns an array of tweet strings (no hashtags — caller adds them).

const SITE = "getkinetik.app/audits.html";
const MAX_CONTENT = 230; // leave room for hashtags

function fmtNum(v) {
  return typeof v === "number" && isFinite(v) ? Math.round(v).toLocaleString() : null;
}

function pct(v) {
  return typeof v === "number" && isFinite(v) ? `${(v * 100).toFixed(1)}%` : null;
}

function shortName(name) {
  return String(name)
    .replace(/\s*\/.*$/, "")        // "Grass / Titan" -> "Grass"
    .replace(/\s+Network$/i, "")     // "Dawn Network" -> "Dawn", "Natix Network" -> "Natix"
    .trim();
}

function metricValue(net, key) {
  const s = (net.signals || []).find((x) => (x.metric || x.metricKey) === key);
  return s && typeof s.value === "number" ? s.value : null;
}

function anomalyOf(net) {
  const h = (net.signals || []).find((s) => s.kind === "headline");
  return h?.anomalyType || net.signals?.[0]?.anomalyType || null;
}

// Neutral, number-bearing fact for one network, keyed off its anomaly type.
function networkFact(net) {
  const name = shortName(net.network);
  const v = (k) => metricValue(net, k);
  const anomaly = anomalyOf(net);

  const dup = v("exactDupGroups");
  const obs = v("observed");
  const cap = v("overCapacityCells");
  const top20 = v("top20ShareOfSupply");
  const frozen = v("kmFrozenDays");
  const drivers = v("drivers");
  const dz = v("detectionsZeroDays");
  const fpct = v("flaggedPct");

  let fact;
  switch (anomaly) {
    case "duplication_cluster":
      fact = dup != null
        ? `${fmtNum(dup)} exact duplicate coordinate groups${obs != null ? ` across ${fmtNum(obs)} stations` : ""}`
        : null;
      break;
    case "capacity_violation":
      fact = cap != null ? `${fmtNum(cap)} cells over designed capacity` : null;
      break;
    case "economic_concentration":
      fact = top20 != null
        ? `top-20 wallets hold ${pct(top20)} of visible ${/hive/i.test(net.network) ? "HONEY" : ""} supply`.replace(/\s+/g, " ")
        : null;
      break;
    case "telemetry_discontinuity": {
      const extra = drivers != null ? `, ${fmtNum(drivers)} drivers still rising`
        : dz != null ? `, detections at zero ${fmtNum(dz)} days` : "";
      fact = frozen != null ? `coverage metric flat ${fmtNum(frozen)} days${extra}` : null;
      break;
    }
    case "identity_collision":
      fact = fpct != null && obs != null
        ? `${pct(fpct)} of ${fmtNum(obs)} nodes flagged (shared identifiers / zero-jitter heartbeats)`
        : null;
      break;
    default:
      fact = fpct != null && obs != null ? `${pct(fpct)} of ${fmtNum(obs)} flagged`
        : obs != null ? `${fmtNum(obs)} entities mapped` : null;
  }

  if (!fact) fact = "public signal recorded";
  return { name, fact, segment: `${name}: ${fact}` };
}

/**
 * Build a single long-form ecosystem post (X Premium). All networks + numbers
 * in one post — ecosystem-first, multi-network, neutral tone.
 * @param {object} feed
 * @returns {string} one post (no hashtags — caller adds them)
 */
export function buildEcosystemPost(feed) {
  const active = (feed.networks || []).filter(
    (n) => n.status === "active" && (n.signals?.length || 0) > 0,
  );
  if (active.length < 2) return "";

  const facts = active.map(networkFact);
  const total = feed.totals?.signals ?? "";
  const date = (feed.date || feed.generatedAt || "").slice(0, 10);

  const lines = [
    `DePIN ecosystem signal index${date ? ` — ${date}` : ""}`,
    `${total} public signals across ${active.length} networks.`,
    "",
    ...facts.map((f) => `• ${f.segment}`),
    "",
    `Methods + reproducible scans: ${SITE}`,
  ];
  return lines.join("\n");
}

/**
 * Build the full ecosystem thread (standard 280-char accounts).
 * @param {object} feed - normalized signal feed
 * @returns {string[]} ordered tweets (hook first, link on last)
 */
export function buildEcosystemThread(feed) {
  const active = (feed.networks || []).filter(
    (n) => n.status === "active" && (n.signals?.length || 0) > 0,
  );
  if (active.length < 2) return [];

  const facts = active.map(networkFact);
  const names = facts.map((f) => f.name);

  // Hook — ecosystem-first, names all networks, gives the headline count.
  const totalSignals = feed.totals?.signals ?? "";
  const hook = `DePIN ecosystem read — ${names.join(", ")}. ${totalSignals} public signals across ${active.length} networks today. The numbers:`;

  // Pack facts into content tweets, >=2 networks each, within length.
  const segments = facts.map((f) => f.segment);
  const content = [];
  let cur = [];
  for (const seg of segments) {
    const trial = [...cur, seg].join(" · ");
    if (trial.length > MAX_CONTENT && cur.length >= 2) {
      content.push(cur.join(" · "));
      cur = [seg];
    } else {
      cur.push(seg);
    }
  }
  if (cur.length) {
    // Avoid a trailing single-network tweet — merge into previous if needed.
    if (cur.length === 1 && content.length) {
      content[content.length - 1] += ` · ${cur[0]}`;
    } else {
      content.push(cur.join(" · "));
    }
  }

  // Append the source link to the final content tweet.
  content[content.length - 1] += ` · methods: ${SITE}`;

  return [hook, ...content];
}
