#!/usr/bin/env node
// Build Command Center reply brief only (state + signal log — no pipeline/radar).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OUT_JSON, REPO_ROOT, PRIVATE_DIR } from "./config.mjs";
import { ensureImportDirs } from "./ingest.mjs";
import { openAgentStore } from "./sqlite-store.mjs";
import { buildReplyBrief, writeReplyBriefMarkdown } from "./reply-brief.mjs";
import { buildReadingFeed } from "./reading-feed.mjs";
import { publishSignalReports } from "./signal-publication.mjs";

const args = process.argv.slice(2);
const fetchRss = args.includes("--fetch-rss");

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function weekdayUtc(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

export async function buildCommandCenter(options = {}) {
  ensureImportDirs();
  const store = openAgentStore();

  try {
    const today = todayUtc();
    const weekday = weekdayUtc(today);
    const replyBrief = buildReplyBrief(today);
    const readingFeed = await buildReadingFeed({
      fetchRss: options.fetchRss ?? fetchRss,
    });

    const payload = {
      version: 7,
      appName: "GetKinetik Command Center",
      updatedAt: new Date().toISOString(),
      today,
      weekday,
      replyBrief,
      readingFeed,
    };

    const briefPath = writeReplyBriefMarkdown(replyBrief, weekday);
    payload.dailyBrief = {
      path: briefPath,
      markdown: fs.readFileSync(path.join(REPO_ROOT, briefPath), "utf8"),
    };

    payload.publication = publishSignalReports(today, replyBrief);

    store.upsertMorningBrief(today, "reply-brief", {
      liveThreadCount: replyBrief.liveThreads.threads.length,
      seedCount: replyBrief.threadSeeds.seeds.length,
      readingItems: readingFeed.allItems.length,
    });
    store.logRun("build", "ok", `reply-brief ${today}`);

    fs.mkdirSync(PRIVATE_DIR, { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");

    return payload;
  } catch (e) {
    store.logRun("build", "error", String(e?.message || e).slice(0, 220));
    throw e;
  } finally {
    store.close();
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  buildCommandCenter()
    .then((p) => {
      console.log(`
GetKinetik Command Center — built (v${p.version})

  Data:  docs/bureau/private/command-center.json
  Brief: ${p.dailyBrief.path}

  Desktop: npm run command-center

  Output: LIVE THREADS + THREAD SEEDS + reading feed + signal reports
  Reports: ${p.publication?.latest?.daily}
  Optional: npm run command-center:morning -- --fetch-rss
`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
