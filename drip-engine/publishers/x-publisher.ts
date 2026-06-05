// X publisher — image card + short caption (primary), text fallback.

import crypto from "node:crypto";
import { assertClean, neutralize } from "../sanitize.ts";
import { parseXThreadMarkdown } from "../x-thread.ts";

const X_TWEET_URL = "https://api.twitter.com/2/tweets";
const X_MEDIA_URL = "https://upload.twitter.com/1.1/media/upload.json";
const MAX_TWEET_LEN = 280;

export interface PublishResult {
  ok: boolean;
  channel: "x";
  message: string;
  tweetIds?: string[];
  mediaId?: string;
}

export interface PublishXOptions {
  dryRun?: boolean;
  /** Pre-built tweets; text-only fallback. */
  tweets?: string[];
  /** PNG buffer — posts as image + caption (first tweet or caption). */
  imagePng?: Buffer;
  /** Caption when posting with image. */
  caption?: string;
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

async function uploadMediaPng(
  png: Buffer,
  creds: NonNullable<ReturnType<typeof loadOAuthCredentials>>,
): Promise<string> {
  const form = new FormData();
  form.append("media", new Blob([png], { type: "image/png" }), "depin-index.png");

  const res = await fetch(X_MEDIA_URL, {
    method: "POST",
    headers: { Authorization: oauthHeader("POST", X_MEDIA_URL, creds) },
    body: form,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`X media upload ${res.status}: ${raw.slice(0, 500)}`);
  }
  const data = JSON.parse(raw) as { media_id_string?: string };
  if (!data.media_id_string) throw new Error("X media upload: missing media_id_string");
  return data.media_id_string;
}

async function postOneTweet(
  text: string,
  opts: {
    replyToId?: string;
    mediaIds?: string[];
    auth: { type: "bearer"; token: string } | { type: "oauth"; creds: NonNullable<ReturnType<typeof loadOAuthCredentials>> };
  },
): Promise<{ id: string; text: string }> {
  const body: {
    text: string;
    reply?: { in_reply_to_tweet_id: string };
    media?: { media_ids: string[] };
  } = {
    text: text.slice(0, MAX_TWEET_LEN),
  };
  if (opts.replyToId) body.reply = { in_reply_to_tweet_id: opts.replyToId };
  if (opts.mediaIds?.length) body.media = { media_ids: opts.mediaIds };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth.type === "bearer") {
    headers.Authorization = `Bearer ${opts.auth.token}`;
  } else {
    headers.Authorization = oauthHeader("POST", X_TWEET_URL, opts.auth.creds);
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

/** Post image + caption, or text thread fallback. */
export async function publishXThread(
  threadMarkdownOrTweets: string | string[],
  opts: PublishXOptions = {},
): Promise<PublishResult> {
  const dryRun = opts.dryRun ?? process.env.DRIP_DRY_RUN === "true";
  const caption = opts.caption
    ? assertClean(neutralize(opts.caption).slice(0, MAX_TWEET_LEN), "x-caption")
    : null;
  const imagePng = opts.imagePng;
  const tweets = opts.tweets ?? (caption ? [] : prepareTweets(threadMarkdownOrTweets));

  if (!caption && !tweets.length && !imagePng) {
    return { ok: false, channel: "x", message: "No caption, tweets, or image to publish" };
  }

  if (dryRun) {
    if (imagePng) {
      return {
        ok: true,
        channel: "x",
        message: `DRY_RUN: would post image (${imagePng.length} bytes) + caption`,
      };
    }
    return {
      ok: true,
      channel: "x",
      message: `DRY_RUN: would post ${tweets.length} tweet(s)`,
    };
  }

  const oauth = loadOAuthCredentials();
  const bearer = process.env.X_API_BEARER;

  if (!oauth && !bearer) {
    return {
      ok: false,
      channel: "x",
      message:
        "X_API_BEARER or X_API_KEY+SECRET+ACCESS tokens not set — outputs written to landing/public/drip only",
    };
  }

  // Image posts require OAuth 1.0a media upload.
  if (imagePng?.length) {
    if (!oauth) {
      return {
        ok: false,
        channel: "x",
        message: "Image post requires OAuth credentials (X_API_KEY + access tokens)",
      };
    }
    try {
      const mediaId = await uploadMediaPng(imagePng, oauth);
      const text = caption || tweets[0] || "DePIN signal index update";
      const posted = await postOneTweet(text, {
        mediaIds: [mediaId],
        auth: { type: "oauth", creds: oauth },
      });
      return {
        ok: true,
        channel: "x",
        message: `Posted image card + caption`,
        tweetIds: [posted.id],
        mediaId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, channel: "x", message: msg };
    }
  }

  const auth = bearer
    ? ({ type: "bearer" as const, token: bearer })
    : ({ type: "oauth" as const, creds: oauth! });

  const ids: string[] = [];
  let replyTo: string | undefined;

  try {
    for (const text of tweets) {
      const posted = await postOneTweet(text, { replyToId: replyTo, auth });
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
