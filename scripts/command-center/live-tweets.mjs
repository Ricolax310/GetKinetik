// Live tweets lane for React Today — finds real DePIN conversation on X and
// drafts a bureau-voice reply you can paste under the original post.
//
// Auth: mints an app-only Bearer token from the consumer key/secret already in
// .env (X_API_KEY / X_API_SECRET) — no separate Bearer or subscription needed.
// Data: GET /2/tweets/search/recent (last 7 days), ranked by engagement after a
// hard junk filter (price bots, watchlists, airdrop/shill noise removed).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvQuiet } from "../bureau/lib.mjs";
import { defaultDepinChatModel } from "../../functions/api/_lib/openaiChat.js";
import { llmChat } from "../bureau/llm.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Memory of tweet IDs already surfaced, so the queue is always fresh instead of
// re-showing the same evergreen posts every day. Entries expire after the TTL.
const SEEN_PATH = path.resolve(__dirname, "../data/live-tweets-seen.json");
const SEEN_TTL_DAYS = 21;

function loadSeenIds() {
  try {
    const raw = JSON.parse(fs.readFileSync(SEEN_PATH, "utf8"));
    const cutoff = Date.now() - SEEN_TTL_DAYS * 86_400_000;
    const out = {};
    for (const [id, ts] of Object.entries(raw)) {
      if (typeof ts === "number" && ts > cutoff) out[id] = ts;
    }
    return out;
  } catch {
    return {};
  }
}

function saveSeenIds(seen) {
  try {
    fs.mkdirSync(path.dirname(SEEN_PATH), { recursive: true });
    fs.writeFileSync(SEEN_PATH, JSON.stringify(seen), "utf8");
  } catch {
    /* best effort — never block a build on the seen cache */
  }
}

const SEARCH_QUERY =
  '(DePIN OR "decentralized physical" OR GEODNET OR WeatherXM OR Hivemapper OR Helium OR IoTeX OR peaq OR DIMO OR Natix OR "proof of location" OR "node rewards" OR "fake nodes" OR sybil) -is:retweet -is:reply lang:en';

// Headlines/tweets that are noise, not conversation — never react to these.
const JUNK = [
  /\bwatchlist\b/i,
  /top\s*\d+\s*(coins|gems|projects|narratives)/i,
  /\bairdrop|presale|whitelist\b/i,
  /\b100x|1000x|moon(shot)?|to the moon\b/i,
  /\bbuy now|to buy|next big|could explode|set to surge|gem\b/i,
  /\bprice prediction|market cap|coingecko|coinmarketcap\b/i,
  /\bdropped?\s*\d|[+-]?\d+(\.\d+)?%\s*(up|down|gain|loss|today)?/i,
  /\bcurrent\s*~?\s*\$|24h:|snapshot \(/i,
  /\bgiveaway|claim your|free \$/i,
];

const DEPIN_TERMS =
  /\b(depin|geodnet|weatherxm|hivemapper|helium|nodle|iotex|peaq|roam|dimo|natix|wingbits|onocoy|render|io\.?net|akash|filecoin|livepeer|sybil|hotspot|proof of location|decentralized physical|physical infrastructure|sensor network|mapping network|node network|node rewards|rtk|gnss)\b/i;

// Substance signals — what a reply-worthy take tends to contain.
const SUBSTANCE =
  /\b(revenue|real|device|hardware|deploy|coverage|registry|verify|proof|adoption|data|build|node|station|sensor|reward|earn|growing|usage|fraud|sybil|legit|honest)\b/i;

export async function mintBearer() {
  loadEnvQuiet();
  const key = process.env.X_API_KEY?.trim();
  const sec = process.env.X_API_SECRET?.trim();
  if (!key || !sec) return null;
  const basic = Buffer.from(`${encodeURIComponent(key)}:${encodeURIComponent(sec)}`).toString("base64");
  try {
    const res = await fetch("https://api.twitter.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout?.(12_000),
    });
    const j = await res.json();
    return j.access_token || null;
  } catch {
    return null;
  }
}

/** Search recent tweets (last 7 days). Returns normalized tweet rows. */
export async function searchXRecent(bearer, query, maxResults = 100) {
  const url =
    "https://api.twitter.com/2/tweets/search/recent?query=" +
    encodeURIComponent(query) +
    `&max_results=${Math.min(Math.max(maxResults, 10), 100)}&sort_order=relevancy` +
    "&tweet.fields=public_metrics,created_at,lang" +
    "&expansions=author_id&user.fields=username,public_metrics,verified";
  const res = await fetch(
    url,
    {
      headers: { Authorization: `Bearer ${bearer}` },
      signal: AbortSignal.timeout?.(15_000),
    },
  );
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const j = await res.json();
  const users = Object.fromEntries((j.includes?.users || []).map((u) => [u.id, u]));
  return (j.data || []).map((t) => {
    const u = users[t.author_id] || {};
    const m = t.public_metrics || {};
    return {
      id: t.id,
      text: t.text || "",
      author: u.username || null,
      followers: u.public_metrics?.followers_count || 0,
      engagement:
        (m.like_count || 0) + (m.retweet_count || 0) + (m.reply_count || 0) + (m.quote_count || 0),
      createdAt: t.created_at || null,
      url: u.username ? `https://x.com/${u.username}/status/${t.id}` : null,
    };
  });
}

async function searchRecent(bearer) {
  return searchXRecent(bearer, SEARCH_QUERY, 100);
}

function qualityScore(t) {
  const txt = t.text;
  if (JUNK.some((re) => re.test(txt))) return -1;
  if (!DEPIN_TERMS.test(txt)) return -1; // off-topic match
  if ((txt.match(/\$[A-Za-z]{2,6}\b/g) || []).length >= 3) return -1; // cashtag spam
  // A reply only lands if someone's actually reading the tweet. Skip dead air.
  if (t.engagement < 1 && t.followers < 2000) return -1;
  // Engagement dominates — reply where the conversation already is.
  let s = t.engagement * 3;
  if (SUBSTANCE.test(txt)) s += 5;
  if (/\?/.test(txt)) s += 4; // questions invite replies
  if (t.followers >= 1000) s += 2;
  if (t.followers >= 10000) s += 5;
  if (txt.length > 120) s += 1; // a real thought, not a one-liner
  return s;
}

const REPLY_SYSTEM = `You write X REPLIES for GETKINETIK, a neutral DePIN integrity bureau run by a sharp solo operator (@Kinetik_Rick).

Given someone's real tweet about DePIN or crypto infrastructure, write a reply that adds ONE genuinely useful, human point. Your home turf is "are the things earning rewards actually real, and can an outsider verify it on public data?" (duplicate coordinates, capacity overflows, stacked nodes, supply concentration) — but you can ALSO engage more broadly: real vs claimed coverage, reward design, data quality, hardware, or a sharp builder observation.

DEFAULT TO "reply". You can almost always find a useful angle. ONLY skip pure scams, giveaways, airdrop-farming, or price-pump posts with nothing real to engage.

A great reply makes the poster (and lurkers) want to follow you. Engage their actual point — don't hijack.

VOICE: sharp, friendly, human. A peer adding insight, not a brand. NO hashtags, NO links, NO emoji filler, NO "great point!". Plain language.

HARD RULES:
- Neutral. Never claim fraud is proven. "worth checking", "the open question is", "on public data you can see".
- No price talk, no shilling, no financial advice.
- <=240 characters. One clear idea.

OUTPUT valid JSON only:
{ "action": "reply" | "skip", "angle": "short phrase", "reply": "<=240 char reply" }`;

/** Draft a reply to an existing X post (exported for news-x-bridge). */
export async function draftTweetReply({ tweet, model }) {
  const r = await llmChat({
    system: REPLY_SYSTEM,
    user: `THEIR TWEET (@${tweet.author}):\n"${tweet.text}"\n\nWrite the reply.`,
    openaiModel: model,
    maxOutput: 2000,
    temperature: 0.5,
  });
  if (!r.ok) throw new Error(r.error || "reply LLM failed");
  return JSON.parse(r.content || "{}");
}

const QUOTE_SYSTEM = `You write X QUOTE-TWEETS for GETKINETIK's @Kinetik_Rick — a sharp solo operator running a neutral DePIN integrity bureau.

A quote-tweet reposts someone's tweet with YOUR take on top. The quoted tweet supplies context, so your line must stand strong alone and add the bureau's lens: "are the things earning rewards actually real, and can an outsider verify it on public data?"

VOICE: confident, human, a builder with a point of view — not a brand. NO links, NO hashtags, NO emoji filler, NO "great thread".

HARD RULES:
- Neutral. Never claim fraud is proven. "worth checking", "the open question is", "on public data you can see".
- No price talk, no shilling, no financial advice.
- <=240 characters. One sharp idea that makes a stranger curious enough to follow.
- If the tweet has no honest angle to quote, action:"skip".

OUTPUT valid JSON only:
{ "action": "quote" | "skip", "angle": "short phrase", "quote": "<=240 char quote-tweet take" }`;

/** Draft a quote-tweet take for an existing X post (growth lane). */
export async function draftTweetQuote({ tweet, model }) {
  const r = await llmChat({
    system: QUOTE_SYSTEM,
    user: `THEIR TWEET (@${tweet.author}):\n"${tweet.text}"\n\nWrite the quote-tweet take.`,
    openaiModel: model,
    maxOutput: 2000,
    temperature: 0.6,
  });
  if (!r.ok) throw new Error(r.error || "quote LLM failed");
  return JSON.parse(r.content || "{}");
}

/**
 * @param {{ apiKey?: string, model?: string, max?: number, quoteCount?: number }} opts
 * @returns {Promise<{ available: boolean, reacts: object[], note: string|null }>}
 */
export async function buildLiveTweetReacts(opts = {}) {
  const max = opts.max ?? 5;
  const quoteCount = opts.quoteCount ?? 2;
  const bearer = await mintBearer();
  if (!bearer) {
    return { available: false, reacts: [], note: "X search unavailable (no X_API_KEY/X_API_SECRET or token mint failed)." };
  }

  let tweets;
  try {
    tweets = await searchRecent(bearer);
  } catch (e) {
    return { available: false, reacts: [], note: `X search failed: ${String(e.message).slice(0, 80)}` };
  }

  // Drop tweets already surfaced recently so every pull is fresh — this is the
  // fix for "it's been the same posts for days".
  const seen = loadSeenIds();

  const pool = tweets
    .map((t) => ({ t, score: qualityScore(t) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  // Prefer tweets you haven't worked yet; but if you've cleared the fresh batch,
  // fall back to the best current ones rather than showing an empty feed.
  let ranked = pool.filter((x) => !seen[x.t.id]).slice(0, max * 2).map((x) => x.t);
  if (!ranked.length) {
    ranked = pool.slice(0, max * 2).map((x) => x.t);
  }

  if (!ranked.length) {
    return { available: true, reacts: [], note: "No DePIN tweets in the current window — try again shortly." };
  }

  const model = opts.model || defaultDepinChatModel(process.env);
  const hasProvider = Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.HF_TOKEN?.trim());
  const reacts = [];
  let lastDraftError = null;
  for (const t of ranked) {
    if (reacts.length >= max) break;
    if (!hasProvider) {
      reacts.push({ author: t.author, text: t.text, url: t.url, engagement: t.engagement, followers: t.followers, reply: null, quoteDraft: null, angle: "Add OPENAI_API_KEY or HF_TOKEN to auto-draft a reply" });
      seen[t.id] = Date.now();
      continue;
    }
    try {
      const d = await draftTweetReply({ tweet: t, model });
      if (d.action === "skip" || !d.reply) continue; // leave unseen so it can resurface
      // Also draft a quote-tweet take for the strongest few.
      let quoteDraft = null;
      if (reacts.length < quoteCount) {
        try {
          const q = await draftTweetQuote({ tweet: t, model });
          if (q.action !== "skip" && q.quote) quoteDraft = q.quote.slice(0, 240);
        } catch {
          /* quote is optional */
        }
      }
      reacts.push({ author: t.author, text: t.text, url: t.url, engagement: t.engagement, followers: t.followers, reply: d.reply.slice(0, 240), quoteDraft, angle: d.angle || null });
      seen[t.id] = Date.now();
    } catch (e) {
      lastDraftError = String(e?.message || e); // surface the reason, don't swallow
    }
  }

  // Never show an empty feed: if the model drafted nothing, surface the top
  // tweets anyway (no draft) so you can write your own — and say WHY there are
  // no drafts (e.g. OpenAI quota) instead of failing silently.
  let note = null;
  if (!reacts.length) {
    for (const t of ranked.slice(0, max)) {
      reacts.push({ author: t.author, text: t.text, url: t.url, engagement: t.engagement, followers: t.followers, reply: null, quoteDraft: null, angle: lastDraftError ? "AI draft unavailable — write your own take" : "Open thread — write a quick take in your voice" });
      seen[t.id] = Date.now();
    }
    if (lastDraftError) note = `AI drafting unavailable (${lastDraftError}). Showing tweets to reply to manually.`;
  } else if (lastDraftError) {
    note = `Some drafts were skipped — AI error: ${lastDraftError}`;
  }

  saveSeenIds(seen);

  return { available: true, reacts, note };
}

export function renderLiveTweetsMarkdown(live) {
  const lines = ["## REACT TO LIVE POSTS — real DePIN tweets to reply to", ""];
  if (!live.reacts.length) {
    lines.push(`_${live.note || "Nothing to reply to."}_`, "");
    return lines;
  }
  lines.push(
    "> Real tweets from the DePIN conversation right now, with a reply drafted in your voice. Replying with one sharp insight is the #1 way a small account gains the right followers.",
    "",
  );
  for (const r of live.reacts) {
    lines.push(`### @${r.author || "?"} · ${r.engagement} engagements${r.followers ? ` · ${r.followers.toLocaleString()} followers` : ""}`);
    lines.push("");
    lines.push(`> ${r.text.replace(/\n/g, " ")}`);
    if (r.url) lines.push("", r.url);
    if (r.reply) {
      lines.push("", `**Reply:**`, "```", r.reply, "```");
    } else if (r.angle) {
      lines.push("", `_${r.angle}_`);
    }
    lines.push("");
  }
  return lines;
}
