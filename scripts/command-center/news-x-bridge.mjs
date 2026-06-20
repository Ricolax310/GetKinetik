// Bridge RSS news → X: find tweets sharing the article, or open compose with link.

import { searchXRecent, draftTweetReply } from "./live-tweets.mjs";

const STOP = new Set([
  "a", "an", "the", "and", "or", "for", "to", "in", "on", "at", "of", "is", "are", "was", "with",
  "from", "as", "by", "its", "it", "this", "that", "after", "how", "why", "what", "new", "says",
]);

/** Open X compose with take + article URL (loads link preview on post). */
export function xComposeIntentUrl(take, articleUrl) {
  const text = articleUrl ? `${String(take || "").trim()}\n\n${articleUrl}`.trim() : String(take || "").trim();
  const clipped = text.length <= 280 ? text : `${text.slice(0, 277).trimEnd()}…`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(clipped)}`;
}

function headlineKeywords(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-\z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 5)
    .join(" ");
}

function articleSearchQueries(link, title) {
  const queries = [];
  try {
    const u = new URL(link);
    const hostPath = `${u.hostname}${u.pathname}`.replace(/\/$/, "");
    queries.push(`url:${hostPath} -is:retweet lang:en`);
    if (u.pathname.length > 1) {
      queries.push(`url:${u.hostname} "${u.pathname.split("/").filter(Boolean).pop()}" -is:retweet lang:en`);
    }
  } catch {
    /* ignore bad URLs */
  }
  const kw = headlineKeywords(title);
  if (kw) {
    queries.push(`(${kw}) (DePIN OR depin OR crypto OR blockchain) -is:retweet lang:en`);
  }
  return queries;
}

function rankArticleTweets(tweets) {
  return tweets
    .filter((t) => !t.text?.startsWith("RT @"))
    .sort((a, b) => b.engagement - a.engagement || b.followers - a.followers);
}

/**
 * Find a tweet on X discussing or sharing this article.
 * @returns {Promise<{ author, text, url, engagement, followers, id } | null>}
 */
export async function findArticleOnX(item, bearer) {
  if (!bearer || !item?.link) return null;
  const queries = articleSearchQueries(item.link, item.title);
  for (const q of queries) {
    try {
      const tweets = await searchXRecent(bearer, q, 25);
      const best = rankArticleTweets(tweets)[0];
      if (best && (best.engagement >= 1 || best.followers >= 500)) return best;
    } catch {
      /* try next query */
    }
  }
  return null;
}

/** Draft a reply when we found the article on X. */
export async function draftReplyForArticleTweet(tweet, apiKey, model) {
  return draftTweetReply({ tweet, apiKey, model });
}
