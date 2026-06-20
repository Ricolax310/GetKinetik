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
import { buildLiveTweetReacts, mintBearer, renderLiveTweetsMarkdown } from "./live-tweets.mjs";
import { findArticleOnX, draftReplyForArticleTweet, xComposeIntentUrl } from "./news-x-bridge.mjs";

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
    return { today, reacts: [], liveTweets: { reacts: [] }, note: "Live mode off — run with --fetch-rss for reactive posts." };
  }

  loadEnvQuiet();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.BUREAU_DEPIN_CHAT_MODEL?.trim() || process.env.BUREAU_NEWS_MODEL?.trim() || "gpt-5";

  // Live X conversation lane (independent of news; degrades gracefully).
  const liveTweets = await buildLiveTweetReacts({ apiKey, model, max: 5, quoteCount: 2 });

  const cfg = loadSources();
  const fresh = await freshNews(cfg);
  const bearer = await mintBearer();

  if (!fresh.length) {
    return { today, reacts: [], liveTweets, note: "No fresh DePIN news in the last 12 days worth reacting to." };
  }

  async function buildNewsReact(x) {
    const base = {
      headline: x.item.title,
      source: x.item.source,
      url: x.item.link,
      published: x.date?.toISOString().slice(0, 10) || null,
    };
    const xThread = bearer ? await findArticleOnX(x.item, bearer) : null;
    if (xThread && apiKey) {
      try {
        const d = await draftReplyForArticleTweet(xThread, apiKey, model);
        if (d.action !== "skip" && d.reply) {
          return {
            ...base,
            mode: "x-reply",
            angle: d.angle || "Found on X — reply on this thread",
            xThread: {
              author: xThread.author,
              text: xThread.text,
              url: xThread.url,
              engagement: xThread.engagement,
            },
            tweet: null,
            reply: d.reply.slice(0, 240),
          };
        }
      } catch {
        /* fall through to compose */
      }
    }
    if (!apiKey) {
      return {
        ...base,
        mode: xThread ? "x-reply" : "x-compose",
        angle: xThread ? "Found on X — add OPENAI_API_KEY to draft reply" : "Add OPENAI_API_KEY to auto-draft a take",
        xThread: xThread
          ? { author: xThread.author, text: xThread.text, url: xThread.url, engagement: xThread.engagement }
          : null,
        tweet: null,
        reply: null,
        composeUrl: xThread ? null : xComposeIntentUrl("DePIN read on this story —", x.item.link),
      };
    }
    const take = await reactTake({ item: x.item, apiKey, model });
    if (take.action === "skip" || !take.tweet) return null;
    const tweet = fit(take.tweet);
    if (xThread) {
      return {
        ...base,
        mode: "x-reply",
        angle: take.angle || null,
        xThread: {
          author: xThread.author,
          text: xThread.text,
          url: xThread.url,
          engagement: xThread.engagement,
        },
        tweet: take.replyAngle ? fit(take.replyAngle) : tweet,
        reply: take.replyAngle ? fit(take.replyAngle) : null,
      };
    }
    return {
      ...base,
      mode: "x-compose",
      angle: take.angle || null,
      tweet,
      reply: null,
      composeUrl: xComposeIntentUrl(tweet, x.item.link),
    };
  }

  // No key → still surface stories with X thread discovery when possible.
  if (!apiKey) {
    const reacts = [];
    for (const x of fresh) {
      if (reacts.length >= MAX_REACTS) break;
      reacts.push(await buildNewsReact(x));
    }
    return {
      today,
      liveTweets,
      reacts: reacts.filter(Boolean),
      note: "Showing fresh stories — add OPENAI_API_KEY to auto-draft takes.",
    };
  }

  const reacts = [];
  for (const x of fresh) {
    if (reacts.length >= MAX_REACTS) break;
    try {
      const row = await buildNewsReact(x);
      if (row) reacts.push(row);
    } catch {
      /* skip this item, try next */
    }
  }

  return {
    today,
    reacts,
    liveTweets,
    note: reacts.length ? null : "Fresh stories found, but none had an honest bureau angle today.",
  };
}

export function renderReactFeedMarkdown(feed) {
  const lines = [];

  // Lane 1: live X conversation (people to reply to) — highest-value for growth.
  if (feed.liveTweets) {
    lines.push(...renderLiveTweetsMarkdown(feed.liveTweets));
  }

  // Lane 2: fresh DePIN news (your own take to post).
  lines.push("## REACT TODAY — jump on live DePIN news", "");
  if (!feed.reacts.length) {
    lines.push(`_${feed.note || "Nothing to react to."}_`, "");
    return lines;
  }
  lines.push(
    "> Fresh DePIN news: we search X for someone already sharing the story. Reply on their thread when found; otherwise use Post to X to publish your take with the article link.",
    "",
  );
  for (const r of feed.reacts) {
    lines.push(`### ${r.headline}`);
    lines.push("");
    lines.push(`_${r.source}${r.published ? ` · ${r.published}` : ""}${r.angle ? ` · ${r.angle}` : ""}_`);
    if (r.url) lines.push("", `Article: ${r.url}`);
    if (r.xThread?.url) {
      lines.push("", `**On X (@${r.xThread.author}):**`, `> ${(r.xThread.text || "").replace(/\n/g, " ")}`, r.xThread.url);
    }
    if (r.reply) {
      lines.push("", "**Reply on X:**", "```", r.reply, "```");
    }
    if (r.tweet && r.mode === "x-compose") {
      lines.push("", "**Post to X (with article link):**", "```", r.tweet, "```");
      if (r.composeUrl) lines.push("", `[Open compose](${r.composeUrl})`);
    }
    lines.push("");
  }
  return lines;
}
