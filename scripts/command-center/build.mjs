#!/usr/bin/env node
// Build Command Center reply brief only (state + signal log — no pipeline/radar).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OUT_JSON, REPO_ROOT, PRIVATE_DIR, todayUtc } from "./config.mjs";
import { ensureImportDirs } from "./ingest.mjs";
import { openAgentStore } from "./sqlite-store.mjs";
import { buildReplyBrief, writeReplyBriefMarkdown } from "./reply-brief.mjs";
import { buildReadingFeed } from "./reading-feed.mjs";
import { buildReactFeed } from "./react-feed.mjs";
import { publishSignalReports } from "./signal-publication.mjs";
import { buildDailyPostsSmart } from "./ai-posts.mjs";

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

    // Upgrade daily posts + the data thread from canned templates to AI-generated
    // content grounded in today's real numbers (cached per day; template fallback).
    const smartPosts = await buildDailyPostsSmart(today, { force: options.forcePosts === true });
    replyBrief.dailyPosts = smartPosts;
    if (smartPosts.thread?.length && replyBrief.growthKit) {
      replyBrief.growthKit.thread = smartPosts.thread;
      replyBrief.growthKit.leadNetwork = smartPosts.leadNetwork || replyBrief.growthKit.leadNetwork;
    }

    const readingFeed = await buildReadingFeed({
      fetchRss: options.fetchRss ?? false,
    });
    const reactFeed = await buildReactFeed({ fetchRss: options.fetchRss ?? false }, today);

    const payload = {
      version: 8,
      appName: "GetKinetik Command Center",
      updatedAt: new Date().toISOString(),
      today,
      weekday,
      replyBrief,
      reactFeed,
      readingFeed,
    };

    const briefPath = writeReplyBriefMarkdown(replyBrief, weekday, reactFeed);
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
  const fetchRss = process.argv.includes("--fetch-rss");
  buildCommandCenter({ fetchRss })
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
