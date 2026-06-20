// Live funding radar — pulls RECENT grant / retro / hackathon announcements via
// Google News RSS (no API key) so the Funding panel shows what's actually open
// right now, next to the curated evergreen list in funding-opportunities.json.
//
// Like the news/tweets lanes, this only fetches in live mode (Pull live), so the
// default offline build stays fast.

import { loadAllFeedItems, parseItemDate } from "../bureau/news-rss.mjs";

const FUNDING_QUERIES = [
  "DePIN grant program",
  "web3 grant round open",
  "crypto hackathon 2026",
  "retroactive public goods funding round",
  "Gitcoin grants round",
  "Solana foundation grant",
  "Base ecosystem builder grant",
];

const FRESH_DAYS = 45;
const MAX = 8;

// Signals of an actual opportunity (not generic crypto news).
const OPPORTUNITY =
  /\b(grant|grants|hackathon|bounty|bounties|retroactive|retro\s*pgf|funding round|apply|applications? open|accelerator|cohort|fellowship|rfp|request for proposals?)\b/i;
// Noise to drop even if it matched a query.
const JUNK = /\b(price|airdrop|presale|token launch|listing|buy now|sell|pump)\b/i;

function classify(text) {
  const t = text.toLowerCase();
  if (/hackathon/.test(t)) return "hackathon";
  if (/retro|retroactive|public goods/.test(t)) return "retro";
  if (/accelerator|cohort|fellowship/.test(t)) return "accelerator";
  if (/grant|rfp|funding/.test(t)) return "grant";
  return "funding";
}

/** Returns recent, deduped funding opportunities, newest first (max 8). */
export async function fetchLiveFunding() {
  let items;
  try {
    items = await loadAllFeedItems({ googleNewsQueries: FUNDING_QUERIES, rssFeeds: [] });
  } catch {
    return [];
  }

  const now = Date.now();
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (!it?.title || !it?.link) continue;
    const text = `${it.title} ${it.description || ""}`;
    if (!OPPORTUNITY.test(text) || JUNK.test(it.title)) continue;
    const date = parseItemDate(it);
    if (!date || (now - date.getTime()) / 86_400_000 > FRESH_DAYS) continue;

    const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      title: it.title,
      url: it.link,
      source: it.source || it.query || "Google News",
      date: date.toISOString().slice(0, 10),
      type: classify(text),
    });
  }

  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out.slice(0, MAX);
}
