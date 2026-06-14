// Daily briefing: pure state + signal log (NOT a CRM, pipeline, or prioritization tool).

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, BRIEF_DIR } from "./config.mjs";
import { buildDailyPosts, renderDailyPostsMarkdown } from "./daily-posts.mjs";

export const LIVE_THREADS_PATH = path.join(REPO_ROOT, "docs/command-center/live-threads.json");

/** Hard filter — seeds and brief text must never surface these frames. */
const DISALLOWED_PATTERNS = [
  /\bpilot\b/i,
  /pilot\s*probability/i,
  /lead\s*rank/i,
  /nurture/i,
  /funnel/i,
  /\bconversion\b/i,
  /probability\s*of\s*response/i,
  /lifecycle/i,
  /verify-device/i,
  /verificationEligible/i,
  /clarificationRequest/i,
  /\bmonitor\b/i,
  /\bclarify\b/i,
  /routing/i,
  /warmnessScore/i,
  /shouldContactToday/i,
  /strategicFit/i,
  /urgency\s*score/i,
  /GETKINETIK/i,
  /attestation/i,
  /bureau/i,
  /product\s*position/i,
];

const SEED_ANOMALY_TYPES = new Set([
  "duplication_cluster",
  "capacity_violation",
  "identity_collision",
  "telemetry_discontinuity",
]);

function daysBetween(isoA, isoB) {
  if (!isoA || !isoB) return null;
  const a = new Date(`${isoA.slice(0, 10)}T12:00:00Z`).getTime();
  const b = new Date(`${isoB.slice(0, 10)}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Status from last EXTERNAL reply only — informational, not for ranking.
 * ACTIVE: ≤14d · COOLED: 15–45d · DEAD: >45d
 */
export function classifyThreadStatus(externalReplyAt, today, { activeWindowDays = 14, cooledAfterDays = 45 } = {}) {
  if (!externalReplyAt) return null;
  const daysSinceExternal = daysBetween(externalReplyAt.slice(0, 10), today);
  if (daysSinceExternal == null) return null;
  if (daysSinceExternal <= activeWindowDays) return "ACTIVE";
  if (daysSinceExternal <= cooledAfterDays) return "COOLED";
  return "DEAD";
}

export function loadLiveThreadsRegistry() {
  if (!fs.existsSync(LIVE_THREADS_PATH)) {
    return { activeWindowDays: 14, cooledAfterDays: 45, threads: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(LIVE_THREADS_PATH, "utf8"));
  } catch {
    return { activeWindowDays: 14, cooledAfterDays: 45, threads: [] };
  }
}

export function buildLiveThreads(today = new Date().toISOString().slice(0, 10)) {
  const registry = loadLiveThreadsRegistry();
  const activeWindowDays = registry.activeWindowDays ?? 14;
  const cooledAfterDays = registry.cooledAfterDays ?? 45;
  const rows = [];

  for (const t of registry.threads || []) {
    if (!t.externalReplyAt) continue;

    const status = classifyThreadStatus(t.externalReplyAt, today, {
      activeWindowDays,
      cooledAfterDays,
    });
    if (!status) continue;

    rows.push({
      id: t.id,
      network: t.network,
      who: t.who,
      lastExternalReplyDate: t.externalReplyAt.slice(0, 10),
      lastExternalMessageSummary: t.lastExternalSummary || "—",
      daysSinceExternalReply: daysBetween(t.externalReplyAt.slice(0, 10), today),
      status,
      networkKey: t.networkKey || null,
    });
  }

  // Registry order only — never sort by status (status is not a priority signal).
  return { today, threads: rows };
}

function stripDisallowed(text) {
  const out = String(text || "").trim();
  if (!out) return null;
  for (const re of DISALLOWED_PATTERNS) {
    if (re.test(out)) return null;
  }
  return out;
}

function loadAuditNetworks() {
  const p = path.join(REPO_ROOT, "scripts/data/bureau-audit-index.json");
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")).networks || [];
  } catch {
    return [];
  }
}

function loadNetworkSnapshot(networkId) {
  const regPath = path.join(REPO_ROOT, "scripts/bureau/networks.json");
  if (!fs.existsSync(regPath)) return null;
  try {
    const reg = JSON.parse(fs.readFileSync(regPath, "utf8"));
    const net = reg.networks?.find((n) => n.id === networkId);
    if (!net?.snapshot) return null;
    const p = path.join(REPO_ROOT, net.snapshot);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** True when headline stats moved enough to treat as a new seed for a live-thread network. */
function hasMateriallyNewSignal(net) {
  const snap = loadNetworkSnapshot(net.id);
  if (!snap?.stats || !snap?.prevStats) return true;
  const cur = snap.stats;
  const prev = snap.prevStats;
  const keys = Object.keys(cur).filter((k) => typeof cur[k] === "number" && typeof prev[k] === "number");
  for (const k of keys) {
    const d = Math.abs(cur[k] - prev[k]);
    if (k.endsWith("Pct") || k.includes("Share")) {
      if (d >= 0.005) return true;
    } else if (d >= 1) {
      return true;
    }
  }
  return false;
}

function observationFromNetwork(net) {
  const f = net.topFinding?.replace(/\*\*/g, "") || "";
  if (!f || !net.generatedAt) return null;
  return stripDisallowed(f.slice(0, 200));
}

function whyItMatters(net) {
  const map = {
    duplication_cluster: "Duplicate coordinates on a public registry are grep-able without internal access.",
    capacity_violation: "Public cell counts above capacity force a registry alignment question.",
    identity_collision: "Shared identifiers on a public map break one-device-one-slot expectations.",
    telemetry_discontinuity: "A flat cumulative metric while sign-ups move is visible from the public feed alone.",
  };
  return stripDisallowed(map[net.anomalyType] || null);
}

/** Trim to a whole-sentence/clause boundary so posts never cut mid-word. */
function clipClause(text, max) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const cut = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(" — "), slice.lastIndexOf(", "));
  return (cut > max * 0.5 ? slice.slice(0, cut) : slice.slice(0, slice.lastIndexOf(" "))).trim();
}

function suggestedPostForSeed(net) {
  const templates = {
    natix:
      "Reviewing the public Coverage Map metrics feed — KM mapped / detections plateaued around May 1 while registered drivers keep ticking up. Expected ETL behavior on that endpoint, or worth a look on your side?",
  };
  if (templates[net.id]) return stripDisallowed(templates[net.id]);

  const obs = observationFromNetwork(net);
  if (!obs) return null;
  return stripDisallowed(
    `Public read on ${net.name}: ${clipClause(obs, 150)} — does that match your internal view, or is the public feed expected to behave this way?`,
  );
}

export function buildThreadSeeds(today, liveThreadNetworkKeys = new Set()) {
  const seeds = [];

  for (const net of loadAuditNetworks()) {
    if (!net.topFinding || !net.generatedAt) continue;
    if (!SEED_ANOMALY_TYPES.has(net.anomalyType)) continue;

    if (liveThreadNetworkKeys.has(net.id) && !hasMateriallyNewSignal(net)) continue;

    const observation = observationFromNetwork(net);
    const why = whyItMatters(net);
    const suggestedPost = suggestedPostForSeed(net);
    if (!observation || !why || !suggestedPost) continue;

    seeds.push({
      id: `seed-${net.id}`,
      target: net.name,
      networkId: net.id,
      observation,
      whyItMatters: why,
      suggestedPost,
      asOf: net.generatedAt,
    });
  }

  return { today, seeds };
}

export function buildReplyBrief(today = new Date().toISOString().slice(0, 10)) {
  const live = buildLiveThreads(today);
  const liveKeys = new Set(live.threads.map((t) => t.networkKey).filter(Boolean));
  const seeds = buildThreadSeeds(today, liveKeys);
  const dailyPosts = buildDailyPosts(today);

  return {
    today,
    liveThreads: live,
    threadSeeds: seeds,
    dailyPosts,
  };
}

function renderLiveThreadsMarkdown(live) {
  const lines = ["## LIVE THREADS", ""];
  if (!live.threads.length) {
    lines.push("_No threads — no external reply on any tracked conversation._");
    lines.push("");
    return lines;
  }

  for (const t of live.threads) {
    lines.push(`### ${t.network} / ${t.who}`);
    lines.push("");
    lines.push(`- **Last external reply:** ${t.lastExternalReplyDate}`);
    lines.push(`- **Last external message:** ${t.lastExternalMessageSummary}`);
    lines.push(`- **Status:** ${t.status}`);
    lines.push("");
  }
  return lines;
}

function renderSeedsMarkdown(seeds) {
  const lines = ["## THREAD SEEDS", ""];
  if (!seeds.seeds.length) {
    lines.push("_No seeds — no new observable signals outside live threads._");
    lines.push("");
    return lines;
  }

  for (const s of seeds.seeds) {
    lines.push(`### ${s.target}`);
    lines.push("");
    lines.push(`- **Target:** ${s.target}`);
    lines.push(`- **Observation:** ${s.observation}`);
    lines.push(`- **Why it matters:** ${s.whyItMatters}`);
    lines.push(`- **Suggested post:** ${s.suggestedPost}`);
    lines.push("");
  }
  return lines;
}

export function writeReplyBriefMarkdown(replyBrief, weekday) {
  fs.mkdirSync(BRIEF_DIR, { recursive: true });
  const file = path.join(BRIEF_DIR, `${replyBrief.today}-brief.md`);
  const lines = [
    `# Daily Briefing — ${replyBrief.today} (${weekday})`,
    "",
    ...(replyBrief.dailyPosts ? renderDailyPostsMarkdown(replyBrief.dailyPosts) : []),
    ...renderLiveThreadsMarkdown(replyBrief.liveThreads),
    ...renderSeedsMarkdown(replyBrief.threadSeeds),
  ];
  const md = lines.join("\n");
  fs.writeFileSync(file, md, "utf8");
  fs.writeFileSync(path.join(BRIEF_DIR, "latest-brief.md"), md, "utf8");
  return path.relative(REPO_ROOT, file).replace(/\\/g, "/");
}
