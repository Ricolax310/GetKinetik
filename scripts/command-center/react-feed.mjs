// React Today — surfaces FRESH DePIN conversation (live news) and turns each
// item into a sharp, ready-to-post reaction in the bureau's voice.
//
// This is the reactive counterpart to daily-posts.mjs: instead of restating our
// own numbers, it finds what the DePIN world is actually talking about right now
// and gives a concrete angle to jump on it — which is how a small account grows.
//
// Live news via Google News RSS (no API key). Reactive takes via OpenAI if
// OPENAI_API_KEY is present; otherwise a structured "here's your angle" prompt.

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./config.mjs";
import { loadEnvQuiet } from "../bureau/lib.mjs";
import {
  loadAllFeedItems,
  scoreItem,
  parseItemDate,
} from "../bureau/news-rss.mjs";

const SOURCES_CONFIG = path.join(REPO_ROOT, "scripts/bureau/news-sources.json");
const FRESH_DAYS = 12;
const MAX_REACTS = 3;
const TWEET_LIMIT = 280;

function loadSources() {
  try {
    return JSON.parse(fs.readFileSync(SOURCES_CONFIG, "utf8"));
  } catch {
    return { googleNewsQueries: [], rssFeeds: [], skipTitlePatterns: [] };
  }
}

function fit(text) {
  const t = String(text || "").replace(/\s{2,}/g, " ").trim();
  return t.length <= TWEET_LIMIT ? t : `${t.slice(0, TWEET_LIMIT - 1).trimEnd()}…`;
}

/** Pull live news, keep only fresh + relevant, dedupe near-identical headlines. */
async function freshNews(cfg) {
  let items;
  try {
    items = await loadAllFeedItems(cfg);
  } catch {
    return [];
  }
  const now = Date.now();
  const scored = items
    .map((it) => ({ item: it, score: scoreItem(it, cfg), date: parseItemDate(it) }))
    .filter((x) => x.score > 0 && x.date && (now - x.date.getTime()) / 86_400_000 <= FRESH_DAYS)
    .sort((a, b) => b.date - a.date || b.score - a.score);

  const seen = new Set();
  const out = [];
  for (const x of scored) {
    const key = x.item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
    if (out.length >= MAX_REACTS * 2) break;
  }
  return out;
}

const REACT_SYSTEM = `You write X posts for GETKINETIK, a NEUTRAL DePIN integrity bureau run by a sharp solo operator.

The bureau's whole lens: "Are the things earning rewards actually real, and can an outsider verify it on public data?" You read major DePIN networks on public endpoints and surface patterns worth a closer look — duplicate coordinates, capacity overflows, supply concentration, stacked hotspots.

Given a fresh DePIN news item, write a reaction post that adds ONE genuinely useful angle through this lens. Make a small account worth following.

VOICE: sharp operator. Plain language. A real human take with a point of view. NOT marketing, NOT crypto-bro hype, NOT vague "interesting times" filler, NOT AI-flattery.

HARD RULES:
- Neutral. Never claim fraud is proven. "Worth checking", "the question is", "on public data you can see".
- No price predictions, no shilling, no financial advice.
- At most one hashtag, often zero. No emoji filler.
- The post must stand alone and make sense to someone who didn't read the article.
- If the story has no honest trust/verification angle, say so via action:"skip".

OUTPUT valid JSON only:
{
  "action": "react" | "skip",
  "angle": "one phrase naming the hook you're playing",
  "tweet": "<=270 char standalone post reacting to the story",
  "replyAngle": "<=200 char take to use as a reply if you find the original thread; no links/hashtags"
}`;

async function reactTake({ item, apiKey, model }) {
  const user = `FRESH DePIN NEWS:
Title: ${item.title}
Source: ${item.source}
Published: ${item.pubDate || "recent"}
Snippet: ${item.description || "(none)"}

Write the reaction.`;

  const url = "https://api.openai.com/v1/chat/completions";
  const payload = {
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: REACT_SYSTEM },
      { role: "user", content: user },
    ],
  };
  if (!/^(gpt-5|o\d)/i.test(model)) payload.temperature = 0.5;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout?.(25_000),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const body = await res.json();
  const parsed = JSON.parse(body.choices?.[0]?.message?.content || "{}");
  return parsed;
}

/**
 * @param {{ fetchRss?: boolean }} options  Only fetches/generates when fetchRss
 *   is true (live mode), matching the rest of the build's offline-by-default contract.
 */
export async function buildReactFeed(options = {}, today = new Date().toISOString().slice(0, 10)) {
  if (!options.fetchRss) {
    return { today, reacts: [], note: "Live mode off — run with --fetch-rss for reactive news posts." };
  }

  loadEnvQuiet();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.BUREAU_DEPIN_CHAT_MODEL?.trim() || process.env.BUREAU_NEWS_MODEL?.trim() || "gpt-5";

  const cfg = loadSources();
  const fresh = await freshNews(cfg);

  if (!fresh.length) {
    return { today, reacts: [], note: "No fresh DePIN news in the last 12 days worth reacting to." };
  }

  // No key → still surface the fresh stories with a manual prompt to react.
  if (!apiKey) {
    return {
      today,
      reacts: fresh.slice(0, MAX_REACTS).map((x) => ({
        headline: x.item.title,
        source: x.item.source,
        url: x.item.link,
        published: x.date?.toISOString().slice(0, 10) || null,
        angle: "Add OPENAI_API_KEY to auto-draft a take",
        tweet: null,
        replyAngle: null,
      })),
      note: "Showing fresh stories without auto-drafted takes (no OPENAI_API_KEY).",
    };
  }

  const reacts = [];
  for (const x of fresh) {
    if (reacts.length >= MAX_REACTS) break;
    try {
      const take = await reactTake({ item: x.item, apiKey, model });
      if (take.action === "skip" || !take.tweet) continue;
      reacts.push({
        headline: x.item.title,
        source: x.item.source,
        url: x.item.link,
        published: x.date?.toISOString().slice(0, 10) || null,
        angle: take.angle || null,
        tweet: fit(take.tweet),
        replyAngle: take.replyAngle ? fit(take.replyAngle) : null,
      });
    } catch {
      /* skip this item, try next */
    }
  }

  return {
    today,
    reacts,
    note: reacts.length ? null : "Fresh stories found, but none had an honest bureau angle today.",
  };
}

export function renderReactFeedMarkdown(feed) {
  const lines = ["## REACT TODAY — jump on live DePIN conversation", ""];
  if (!feed.reacts.length) {
    lines.push(`_${feed.note || "Nothing to react to."}_`, "");
    return lines;
  }
  lines.push(
    "> Fresh DePIN news with a ready reaction in your voice. Reacting to what's happening > broadcasting your own numbers. Quote-tweet or reply to the source, post the take, engage replies.",
    "",
  );
  for (const r of feed.reacts) {
    lines.push(`### ${r.headline}`);
    lines.push("");
    lines.push(`_${r.source}${r.published ? ` · ${r.published}` : ""}${r.angle ? ` · angle: ${r.angle}` : ""}_`);
    if (r.url) lines.push("", `Source: ${r.url}`);
    if (r.tweet) {
      lines.push("", "**Post:**", "```", r.tweet, "```");
    }
    if (r.replyAngle) {
      lines.push("", `**If you find the thread, reply:** ${r.replyAngle}`);
    }
    lines.push("");
  }
  return lines;
}
