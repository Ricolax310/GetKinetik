// Live tweets lane for React Today — finds real DePIN conversation on X and
// drafts a bureau-voice reply you can paste under the original post.
//
// Auth: mints an app-only Bearer token from the consumer key/secret already in
// .env (X_API_KEY / X_API_SECRET) — no separate Bearer or subscription needed.
// Data: GET /2/tweets/search/recent (last 7 days), ranked by engagement after a
// hard junk filter (price bots, watchlists, airdrop/shill noise removed).

import { loadEnvQuiet } from "../bureau/lib.mjs";

const SEARCH_QUERY =
  '(DePIN OR GEODNET OR WeatherXM OR Hivemapper OR "proof of location" OR "decentralized physical") -is:retweet -is:reply lang:en';

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
  /\b(depin|geodnet|weatherxm|hivemapper|helium|nodle|iotex|peaq|roam|dimo|proof of location|decentralized physical|sensor network|mapping network|node network|rtk|gnss)\b/i;

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

async function searchRecent(bearer) {
  const url =
    "https://api.twitter.com/2/tweets/search/recent?query=" +
    encodeURIComponent(SEARCH_QUERY) +
    "&max_results=100&sort_order=relevancy" +
    "&tweet.fields=public_metrics,created_at,lang" +
    "&expansions=author_id&user.fields=username,public_metrics,verified";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearer}` },
    signal: AbortSignal.timeout?.(15_000),
  });
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

Given someone's real tweet about DePIN, write a reply that adds ONE genuinely useful point through the bureau's lens: "are the things earning rewards actually real, and can an outsider verify it on public data?" You read networks on public endpoints and surface patterns worth a look — duplicate coordinates, capacity overflows, stacked hotspots, supply concentration.

A great reply makes the original poster (and lurkers) want to follow you. Engage their actual point — don't hijack.

VOICE: sharp, friendly, human. A peer adding insight, not a brand. NO hashtags, NO links, NO emoji filler, NO "great point!". Plain language.

HARD RULES:
- Neutral. Never claim fraud is proven. "worth checking", "the open question is", "on public data you can see".
- No price talk, no shilling, no financial advice.
- <=240 characters. One clear idea.
- If the tweet has no honest trust/verification angle (pure price, shill, off-topic), action:"skip".

OUTPUT valid JSON only:
{ "action": "reply" | "skip", "angle": "short phrase", "reply": "<=240 char reply" }`;

async function draftReply({ tweet, apiKey, model }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: REPLY_SYSTEM },
        { role: "user", content: `THEIR TWEET (@${tweet.author}):\n"${tweet.text}"\n\nWrite the reply.` },
      ],
      ...(/^(gpt-5|o\d)/i.test(model) ? {} : { temperature: 0.5 }),
    }),
    signal: AbortSignal.timeout?.(25_000),
  });
  if (!res.ok) throw new Error(`reply LLM HTTP ${res.status}`);
  const body = await res.json();
  return JSON.parse(body.choices?.[0]?.message?.content || "{}");
}

/**
 * @param {{ apiKey?: string, model?: string, max?: number }} opts
 * @returns {Promise<{ available: boolean, reacts: object[], note: string|null }>}
 */
export async function buildLiveTweetReacts(opts = {}) {
  const max = opts.max ?? 3;
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

  const ranked = tweets
    .map((t) => ({ t, score: qualityScore(t) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max * 2)
    .map((x) => x.t);

  if (!ranked.length) {
    return { available: true, reacts: [], note: "No reply-worthy DePIN tweets in the current window." };
  }

  const apiKey = opts.apiKey;
  const model = opts.model || "gpt-5";
  const reacts = [];
  for (const t of ranked) {
    if (reacts.length >= max) break;
    if (!apiKey) {
      reacts.push({ author: t.author, text: t.text, url: t.url, engagement: t.engagement, followers: t.followers, reply: null, angle: "Add OPENAI_API_KEY to auto-draft a reply" });
      continue;
    }
    try {
      const d = await draftReply({ tweet: t, apiKey, model });
      if (d.action === "skip" || !d.reply) continue;
      reacts.push({ author: t.author, text: t.text, url: t.url, engagement: t.engagement, followers: t.followers, reply: d.reply.slice(0, 240), angle: d.angle || null });
    } catch {
      /* skip this tweet */
    }
  }

  return { available: true, reacts, note: reacts.length ? null : "Found tweets, but none had an honest bureau angle." };
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
