#!/usr/bin/env node
// Server scheduler (dependency-free) for the automated signal pipeline.
// Use this when running on a long-lived server instead of GitHub Actions.
//
// Schedules (UTC), matching the required cron rules:
//   daily_signal_pipeline   0 9 * * *    every day 09:00 UTC
//   weekly_signal_pipeline  0 10 * * MON every Monday 10:00 UTC
//   monthly_depin_state     0 10 1 * *   1st of month 10:00 UTC
//
// Run: node scripts/signal-pipeline/scheduler.mjs   (Ctrl+C to stop)

import { runDaily, runWeekly, runMonthly } from "./pipeline.mjs";

const LIVE = process.argv.includes("--live");

const SCHEDULES = [
  { name: "daily_signal_pipeline", run: runDaily, when: (d) => d.getUTCHours() === 9 && d.getUTCMinutes() === 0 },
  {
    name: "weekly_signal_pipeline",
    run: runWeekly,
    when: (d) => d.getUTCDay() === 1 && d.getUTCHours() === 10 && d.getUTCMinutes() === 0,
  },
  {
    name: "monthly_depin_state",
    run: runMonthly,
    when: (d) => d.getUTCDate() === 1 && d.getUTCHours() === 10 && d.getUTCMinutes() === 0,
  },
];

function execute(job) {
  const started = new Date().toISOString();
  try {
    const res = job.run({ live: LIVE });
    console.log(
      `[${started}] ${job.name} → ${res.feed.totals.signals} signals · ${res.errors.length} error(s) · log ${res.logFile}`,
    );
  } catch (e) {
    console.error(`[${started}] ${job.name} FAILED: ${e?.message || e}`);
  }
}

let lastMinute = null;

function tick() {
  const now = new Date();
  const minuteKey = now.toISOString().slice(0, 16);
  if (minuteKey === lastMinute) return;
  lastMinute = minuteKey;
  for (const job of SCHEDULES) {
    if (job.when(now)) execute(job);
  }
}

console.log(
  `GetKinetik signal scheduler started (UTC). live=${LIVE}\n` +
    "  daily   09:00 · weekly Mon 10:00 · monthly 1st 10:00\n" +
    "  Ctrl+C to stop.",
);

// Check every 30s; the minute guard prevents duplicate runs within a minute.
tick();
const timer = setInterval(tick, 30_000);

process.on("SIGINT", () => {
  clearInterval(timer);
  console.log("\nScheduler stopped.");
  process.exit(0);
});
