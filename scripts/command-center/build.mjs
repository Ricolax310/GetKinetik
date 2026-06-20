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

const FUNDING_PATH = path.join(REPO_ROOT, "scripts/data/funding-opportunities.json");

/** Curated grant / retro / hackathon list — static data surfaced in the UI. */
function loadFunding() {
  try {
    if (fs.existsSync(FUNDING_PATH)) {
      return JSON.parse(fs.readFileSync(FUNDING_PATH, "utf8"));
    }
  } catch (e) {
    console.warn(`[command-center] funding list load failed: ${e.message}`);
  }
  return null;
}

const NETWORK_TAGS = {
  helium: "#Helium",
  geodnet: "#GEODNET",
  weatherxm: "#WeatherXM",
  hivemapper: "#Hivemapper",
  natix: "#NATIX",
};

/**
 * Append up to 2 targeted hashtags (one network tag if detected + #DePIN) so
 * posts are discoverable in search/feeds. Skips posts that already carry tags
 * and never pushes a tweet past 280 chars.
 */
function withHashtags(text) {
  if (!text || /#\w/.test(text)) return text;
  const lower = text.toLowerCase();
  const tags = [];
  for (const [key, tag] of Object.entries(NETWORK_TAGS)) {
    if (lower.includes(key)) {
      tags.push(tag);
      break;
    }
  }
  tags.push("#DePIN");
  const suffix = ` ${tags.join(" ")}`;
  return (text + suffix).length <= 280 ? text + suffix : text;
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
    // Thread intentionally dropped: a single strong tweet outperforms a 5-tweet
    // thread at low follower counts. Keep only the lead network for the kit.
    if (replyBrief.growthKit) {
      replyBrief.growthKit.thread = null;
      replyBrief.growthKit.leadNetwork = smartPosts.leadNetwork || replyBrief.growthKit.leadNetwork;
    }

    // Strategic reach: tag each post with its network + #DePIN for search/feed
    // discovery (a minor lever — replies on big threads still do the real work).
    if (Array.isArray(replyBrief.dailyPosts?.posts)) {
      for (const p of replyBrief.dailyPosts.posts) {
        if (p?.text) p.text = withHashtags(p.text);
      }
    }

    const readingFeed = await buildReadingFeed({
      fetchRss: options.fetchRss ?? false,
    });
    const reactFeed = await buildReactFeed({ fetchRss: options.fetchRss ?? false }, today);

    const payload = {
      version: 9,
      appName: "GetKinetik Command Center",
      updatedAt: new Date().toISOString(),
      today,
      weekday,
      replyBrief,
      reactFeed,
      readingFeed,
      funding: loadFunding(),
    };

    const briefPath = writeReplyBriefMarkdown(replyBrief, weekday, reactFeed, {
      commandCenterOnly: true,
    });
    payload.dailyBrief = {
      path: briefPath,
      exportPath: briefPath,
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
