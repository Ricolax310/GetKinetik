// X publisher — POST /2/tweets with reply chaining (thread mode).

import crypto from "node:crypto";
import { assertClean, neutralize } from "../sanitize.ts";
import { parseXThreadMarkdown } from "../x-thread.ts";

const X_TWEET_URL = "https://api.twitter.com/2/tweets";
const MAX_TWEET_LEN = 280;

export interface PublishResult {
  ok: boolean;
  channel: "x";
  message: string;
  tweetIds?: string[];
}

export interface PublishXOptions {
  dryRun?: boolean;
  /** Pre-built tweets; overrides markdown parsing. */
  tweets?: string[];
}

function pctEncode(str: string): string {
  return encodeURIComponent(str).replace(/!/g, "%21").replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\*/g, "%2A");
}

function oauthSignature(
  method: string,
  baseUrl: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const keys = Object.keys(params).sort();
  const paramString = keys.map((k) => `${pctEncode(k)}=${pctEncode(params[k])}`).join("&");
  const base = `${method.toUpperCase()}&${pctEncode(baseUrl)}&${pctEncode(paramString)}`;
  const signingKey = `${pctEncode(consumerSecret)}&${pctEncode(tokenSecret || "")}`;
  return crypto.createHmac("sha1", signingKey).update(base).digest("base64");
}

function oauthHeader(
  method: string,
  url: string,
  creds: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  },
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };
  oauth.oauth_signature = oauthSignature(method, url, oauth, creds.apiSecret, creds.accessSecret);
  const parts = Object.keys(oauth)
    .sort()
    .map((k) => `${pctEncode(k)}="${pctEncode(oauth[k])}"`);
  return `OAuth ${parts.join(", ")}`;
}

function loadOAuthCredentials(): {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
} | null {
  const apiKey = process.env.X_API_KEY || process.env.TWITTER_API_KEY;
  const apiSecret = process.env.X_API_SECRET || process.env.TWITTER_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET || process.env.TWITTER_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return { apiKey, apiSecret, accessToken, accessSecret };
}

function prepareTweets(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : parseXThreadMarkdown(input);
  return raw
    .map((t) => neutralize(t).trim())
    .filter(Boolean)
    .map((t) => {
      const clean = t.length <= MAX_TWEET_LEN ? t : `${t.slice(0, MAX_TWEET_LEN - 1)}…`;
      return assertClean(clean, "x-publish");
    });
}

async function postOneTweet(
  text: string,
  replyToId: string | undefined,
  auth: { type: "bearer"; token: string } | { type: "oauth"; creds: NonNullable<ReturnType<typeof loadOAuthCredentials>> },
): Promise<{ id: string; text: string }> {
  const body: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
    text: text.slice(0, MAX_TWEET_LEN),
  };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth.type === "bearer") {
    headers.Authorization = `Bearer ${auth.token}`;
  } else {
    headers.Authorization = oauthHeader("POST", X_TWEET_URL, auth.creds);
  }

  const res = await fetch(X_TWEET_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${raw.slice(0, 500)}`);
  }
  const data = JSON.parse(raw) as { data?: { id?: string; text?: string } };
  if (!data.data?.id) throw new Error("X API: missing tweet id in response");
  return { id: data.data.id, text: data.data.text || text };
}

/** Post a thread: hook first, signals in the middle, site link last. */
export async function publishXThread(
  threadMarkdownOrTweets: string | string[],
  opts: PublishXOptions = {},
): Promise<PublishResult> {
  const tweets = prepareTweets(opts.tweets ?? threadMarkdownOrTweets);
  if (!tweets.length) {
    return { ok: false, channel: "x", message: "No tweets to publish" };
  }

  const dryRun = opts.dryRun ?? process.env.DRIP_DRY_RUN === "true";
  if (dryRun) {
    return {
      ok: true,
      channel: "x",
      message: `DRY_RUN: would post ${tweets.length} tweet(s)`,
    };
  }

  const bearer = process.env.X_API_BEARER;
  const oauth = loadOAuthCredentials();
  if (!bearer && !oauth) {
    return {
      ok: false,
      channel: "x",
      message:
        "X_API_BEARER or X_API_KEY+SECRET+ACCESS tokens not set — thread written to landing/public/drip only",
    };
  }

  const auth = bearer
    ? ({ type: "bearer" as const, token: bearer })
    : ({ type: "oauth" as const, creds: oauth! });

  const ids: string[] = [];
  let replyTo: string | undefined;

  try {
    for (const text of tweets) {
      const posted = await postOneTweet(text, replyTo, auth);
      ids.push(posted.id);
      replyTo = posted.id;
      await new Promise((r) => setTimeout(r, 800));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      channel: "x",
      message: ids.length ? `Partial thread (${ids.length}/${tweets.length}): ${msg}` : msg,
      tweetIds: ids.length ? ids : undefined,
    };
  }

  return {
    ok: true,
    channel: "x",
    message: `Posted ${ids.length}-tweet thread`,
    tweetIds: ids,
  };
}
