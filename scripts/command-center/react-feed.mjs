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
import { defaultDepinChatModel } from "../../functions/api/_lib/openaiChat.js";
import { llmChat } from "../bureau/llm.mjs";

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

Your home turf: "Are the things earning rewards actually real, and can an outsider verify it on public data?" (duplicate coordinates, capacity overflows, supply concentration, stacked nodes) — but you can ALSO engage more broadly on any DePIN/crypto-infrastructure story: real vs claimed coverage, reward design, data quality, adoption, hardware, or a sharp builder take.

Given a fresh news item, write a reaction post that adds ONE genuinely useful angle and makes a small account worth following. Write so a newcomer understands.

DEFAULT TO "react". You can almost always find an angle. ONLY skip pure scams, giveaways, or price-pump items with nothing real to engage.

VOICE: sharp operator. Plain language. A real human take with a point of view. NOT marketing, NOT crypto-bro hype, NOT vague "interesting times" filler, NOT AI-flattery.

HARD RULES:
- Neutral. Never claim fraud is proven. "Worth checking", "the question is", "on public data you can see".
- No price predictions, no shilling, no financial advice.
- At most one hashtag, often zero. No emoji filler.
- The post must stand alone and make sense to someone who didn't read the article.

OUTPUT valid JSON only:
{
  "action": "react" | "skip",
  "angle": "one phrase naming the hook you're playing",
  "tweet": "<=270 char standalone post reacting to the story",
  "replyAngle": "<=200 char take to use as a reply if you find the original thread; no links/hashtags"
}`;

async function reactTake({ item, model }) {
  const user = `FRESH DePIN NEWS:
Title: ${item.title}
Source: ${item.source}
Published: ${item.pubDate || "recent"}
Snippet: ${item.description || "(none)"}

Write the reaction.`;

  const r = await llmChat({
    system: REACT_SYSTEM,
    user,
    openaiModel: model,
    maxOutput: 2000,
    temperature: 0.5,
  });
  if (!r.ok) throw new Error(r.error || "news LLM failed");
  return JSON.parse(r.content || "{}");
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
  // "Has a provider" = OpenAI OR the HF fallback is configured.
  const hasProvider = Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.HF_TOKEN?.trim());
  const model = process.env.BUREAU_DEPIN_CHAT_MODEL?.trim() || process.env.BUREAU_NEWS_MODEL?.trim() || defaultDepinChatModel(process.env);

  // Live X conversation lane (independent of news; degrades gracefully).
  const liveTweets = await buildLiveTweetReacts({ model, max: 5, quoteCount: 2 });

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
    if (xThread && hasProvider) {
      try {
        const d = await draftReplyForArticleTweet(xThread, model);
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
    if (!hasProvider) {
      return {
        ...base,
        mode: xThread ? "x-reply" : "x-compose",
        angle: xThread ? "Found on X — add OPENAI_API_KEY or HF_TOKEN to draft reply" : "Add OPENAI_API_KEY or HF_TOKEN to auto-draft a take",
        xThread: xThread
          ? { author: xThread.author, text: xThread.text, url: xThread.url, engagement: xThread.engagement }
          : null,
        tweet: null,
        reply: null,
        composeUrl: xThread ? null : xComposeIntentUrl("DePIN read on this story —", x.item.link),
      };
    }
    const take = await reactTake({ item: x.item, model });
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

  // No provider → still surface stories with X thread discovery when possible.
  if (!hasProvider) {
    const reacts = [];
    for (const x of fresh) {
      if (reacts.length >= MAX_REACTS) break;
      reacts.push(await buildNewsReact(x));
    }
    return {
      today,
      liveTweets,
      reacts: reacts.filter(Boolean),
      note: "Showing fresh stories — add OPENAI_API_KEY or HF_TOKEN to auto-draft takes.",
    };
  }

  const reacts = [];
  let lastNewsError = null;
  for (const x of fresh) {
    if (reacts.length >= MAX_REACTS) break;
    try {
      const row = await buildNewsReact(x);
      if (row) reacts.push(row);
    } catch (e) {
      lastNewsError = String(e?.message || e); // surface the reason, don't swallow
    }
  }

  // Never show empty: if the model drafted nothing, surface the top stories so
  // you can post your own take — and say WHY (e.g. OpenAI quota) if it failed.
  let note = null;
  if (!reacts.length) {
    for (const x of fresh.slice(0, MAX_REACTS)) {
      reacts.push({
        headline: x.item.title,
        source: x.item.source,
        url: x.item.link,
        published: x.date?.toISOString().slice(0, 10) || null,
        mode: "x-compose",
        angle: "Fresh story — post your own take with the article",
        tweet: null,
        reply: null,
        composeUrl: xComposeIntentUrl("DePIN read on this story —", x.item.link),
      });
    }
    if (lastNewsError) note = `AI drafting unavailable (${lastNewsError}). Showing stories — post your own take.`;
  }

  return {
    today,
    reacts,
    liveTweets,
    note,
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
