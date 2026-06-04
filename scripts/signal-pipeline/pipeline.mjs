#!/usr/bin/env node
// Autonomous DePIN signal pipeline orchestrator.
//
//   daily_signal_pipeline   ingest → detect → cross-network aggregate → publish
//   weekly_signal_pipeline  aggregate last 7 daily runs → trends → report
//   monthly_depin_state     summarize month → cross-network patterns → state
//
// CLI: node scripts/signal-pipeline/pipeline.mjs <daily|weekly|monthly|all> [--live]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PATHS } from "./config.mjs";
import { ingestAll } from "./ingest.mjs";
import { buildNormalizedNetworks } from "./signals.mjs";
import { aggregate } from "./aggregate.mjs";
import {
  renderDailyMarkdown,
  renderWeeklyMarkdown,
  renderMonthlyMarkdown,
  renderHtml,
} from "./render.mjs";
import { writeRunLog } from "./log.mjs";

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  return path.relative(PATHS.signalsDir.replace(/signals$/, ""), file).replace(/\\/g, "/");
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function isoWeekId(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function loadDailyFeeds(sinceIso) {
  const dir = path.join(PATHS.signalsDir, "daily");
  if (!fs.existsSync(dir)) return [];
  const since = new Date(`${sinceIso}T00:00:00Z`).getTime();
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    if (new Date(`${m[1]}T12:00:00Z`).getTime() < since) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")));
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

function persistFeed(cadence, id, feed) {
  const dir = path.join(PATHS.signalsDir, cadence);
  write(path.join(dir, `${id}.json`), JSON.stringify(feed, null, 2));
  write(path.join(dir, "latest.json"), JSON.stringify(feed, null, 2));
}

// Maintain the flat inputs the distribution engine reads: signals/latest.json
// (current feed) and signals/history.json (rolling per-day record).
function updateSignalInputs(feed) {
  write(path.join(PATHS.signalsDir, "latest.json"), JSON.stringify(feed, null, 2));

  const historyPath = path.join(PATHS.signalsDir, "history.json");
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
  }
  const entry = { date: feed.date, generatedAt: feed.generatedAt, networks: feed.networks };
  history = history.filter((h) => h.date !== feed.date);
  history.push(entry);
  history.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  history = history.slice(-90);
  write(historyPath, JSON.stringify(history, null, 2));
}

export function runDaily(options = {}) {
  const errors = [];
  const today = todayUtc();
  const reportsPublished = [];

  const ingestResult = ingestAll({ live: options.live });
  for (const n of ingestResult.networks) {
    if (n.status === "scan-error") errors.push(`${n.id}: ${n.reason}`);
  }

  const networks = buildNormalizedNetworks();
  const feed = aggregate(networks, "daily");
  feed.date = today;
  feed.ingest = ingestResult.networks;

  persistFeed("daily", today, feed);
  updateSignalInputs(feed);
  reportsPublished.push(
    `signals/daily/${today}.json`,
    "signals/daily/latest.json",
    "signals/latest.json",
    "signals/history.json",
  );

  // Public API mirror — the homepage Live Signal Feed reads this.
  write(path.join(PATHS.apiDir, "latest.json"), JSON.stringify(feed, null, 2));
  reportsPublished.push("landing/api/signals/latest.json");

  const md = renderDailyMarkdown(feed, today);
  write(path.join(PATHS.reportsDir, "daily", `${today}-signal-brief.md`), md);
  write(path.join(PATHS.reportsDir, "daily", "latest.md"), md);
  reportsPublished.push(`docs/reports/daily/${today}-signal-brief.md`, "docs/reports/daily/latest.md");

  write(path.join(PATHS.publicDir, "daily.html"), renderHtml("Daily DePIN Signal Brief", feed, "daily"));
  reportsPublished.push("landing/public/daily.html");

  const logFile = writeRunLog("daily", {
    job: "daily_signal_pipeline",
    timestamp: feed.generatedAt,
    networksProcessed: ingestResult.networksProcessed,
    signalsGenerated: feed.totals.signals,
    reportsPublished,
    errors,
  });

  return { feed, reportsPublished, logFile, errors };
}

export function runWeekly() {
  const errors = [];
  const today = todayUtc();
  const weekId = isoWeekId(today);
  const reportsPublished = [];

  const d = new Date(`${today}T12:00:00Z`);
  const day = d.getUTCDay() || 7;
  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() - day + 1);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const range = `${weekStartIso} → ${today}`;

  const history = loadDailyFeeds(weekStartIso);
  const networks = buildNormalizedNetworks();
  const feed = aggregate(networks, "weekly");
  feed.weekId = weekId;
  feed.range = range;

  persistFeed("weekly", weekId, feed);
  reportsPublished.push(`signals/weekly/${weekId}.json`, "signals/weekly/latest.json");

  const md = renderWeeklyMarkdown(feed, history, weekId, range);
  write(path.join(PATHS.reportsDir, "weekly", `${weekId}-signal-report.md`), md);
  write(path.join(PATHS.reportsDir, "weekly", "latest.md"), md);
  reportsPublished.push(`docs/reports/weekly/${weekId}-signal-report.md`, "docs/reports/weekly/latest.md");

  write(path.join(PATHS.publicDir, "weekly.html"), renderHtml("Weekly DePIN Signal Report", feed, "weekly"));
  reportsPublished.push("landing/public/weekly.html");

  const logFile = writeRunLog("weekly", {
    job: "weekly_signal_pipeline",
    timestamp: feed.generatedAt,
    networksProcessed: networks.map((n) => n.networkId),
    signalsGenerated: feed.totals.signals,
    reportsPublished,
    errors,
  });

  return { feed, reportsPublished, logFile, errors };
}

export function runMonthly() {
  const errors = [];
  const today = todayUtc();
  const monthId = today.slice(0, 7);
  const reportsPublished = [];

  const history = loadDailyFeeds(`${monthId}-01`);
  const networks = buildNormalizedNetworks();
  const feed = aggregate(networks, "monthly");
  feed.monthId = monthId;

  persistFeed("monthly", monthId, feed);
  reportsPublished.push(`signals/monthly/${monthId}.json`, "signals/monthly/latest.json");

  const md = renderMonthlyMarkdown(feed, history, monthId);
  write(path.join(PATHS.reportsDir, "monthly", `${monthId}-state-of-depin.md`), md);
  write(path.join(PATHS.reportsDir, "monthly", "state-of-depin.md"), md);
  reportsPublished.push(`docs/reports/monthly/${monthId}-state-of-depin.md`, "docs/reports/monthly/state-of-depin.md");

  write(
    path.join(PATHS.publicDir, "state-of-depin.html"),
    renderHtml("State of DePIN", feed, "monthly"),
  );
  reportsPublished.push("landing/public/state-of-depin.html");

  const logFile = writeRunLog("monthly", {
    job: "monthly_depin_state",
    timestamp: feed.generatedAt,
    networksProcessed: networks.map((n) => n.networkId),
    signalsGenerated: feed.totals.signals,
    reportsPublished,
    errors,
  });

  return { feed, reportsPublished, logFile, errors };
}

const JOBS = {
  daily: runDaily,
  weekly: runWeekly,
  monthly: runMonthly,
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const cmd = process.argv[2] || "daily";
  const live = process.argv.includes("--live");
  const targets = cmd === "all" ? ["daily", "weekly", "monthly"] : [cmd];

  (async () => {
    let failed = false;
    for (const t of targets) {
      const job = JOBS[t];
      if (!job) {
        console.error(`Unknown job: ${t}. Use daily | weekly | monthly | all`);
        process.exit(2);
      }
      const res = job({ live });
      const status = res.errors.length ? `with ${res.errors.length} error(s)` : "ok";
      console.log(
        `[${t}] ${status} · ${res.feed.totals.signals} signals · ${res.feed.totals.activeNetworks}/${res.feed.totals.networks} networks · log ${res.logFile}`,
      );
      if (res.errors.length) {
        res.errors.forEach((e) => console.error(`  - ${e}`));
        failed = true;
      }
    }
    if (failed) process.exitCode = 1;
  })();
}
