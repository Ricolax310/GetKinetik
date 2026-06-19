// Kinetik Rick amplifier — after the bureau signal posts (@kinetiksignal), the
// personal account (@Kinetik_Rick) replies on the signal post to drive followers
// into the thread. We use a reply (not quote-tweet) because X API blocks
// programmatic quotes unless the quoter was @mentioned on the source tweet.
//
// Requires Rick's OWN user tokens (separate account):
//   RICK_X_ACCESS_TOKEN, RICK_X_ACCESS_SECRET   (required)
//   RICK_X_API_KEY, RICK_X_API_SECRET           (optional — falls back to the
//                                                shared app's X_API_KEY/SECRET)
// Without them it no-ops safely (the bureau post still goes out).

import crypto from "node:crypto";
import type { Signal } from "../signal-loader.ts";
import type { Pattern } from "../cross-network-aggregator.ts";
import { compactFactLine } from "../narrative-builder.ts";
import { assertClean, neutralize } from "../sanitize.ts";

const X_TWEET_URL = "https://api.twitter.com/2/tweets";
const X_USERS_ME_URL = "https://api.twitter.com/2/users/me";
const MAX_LEN = 240; // Rick voice stays tight

interface RickCreds {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface RickResult {
  ok: boolean;
  skipped?: boolean;
  message: string;
  tweetId?: string;
}

function pctEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21").replace(/'/g, "%27").replace(/\(/g, "%28")
    .replace(/\)/g, "%29").replace(/\*/g, "%2A");
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

function oauthHeader(method: string, url: string, creds: RickCreds): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };
  oauth.oauth_signature = oauthSignature(method, url, oauth, creds.apiSecret, creds.accessSecret);
  const parts = Object.keys(oauth).sort().map((k) => `${pctEncode(k)}="${pctEncode(oauth[k])}"`);
  return `OAuth ${parts.join(", ")}`;
}

function loadRickCreds(): RickCreds | null {
  const apiKey = process.env.RICK_X_API_KEY || process.env.X_API_KEY;
  const apiSecret = process.env.RICK_X_API_SECRET || process.env.X_API_SECRET;
  // Access tokens MUST be Rick-specific — never fall back to the bureau account.
  const accessToken = process.env.RICK_X_ACCESS_TOKEN;
  const accessSecret = process.env.RICK_X_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return { apiKey, apiSecret, accessToken, accessSecret };
}

/** Handle (no @) bureau must mention so Rick can reply via API. */
export async function resolveRickMentionHandle(): Promise<string | null> {
  const fromEnv = process.env.RICK_X_HANDLE?.replace(/^@/, "").trim();
  if (fromEnv) return fromEnv;

  const creds = loadRickCreds();
  if (!creds) return null;

  try {
    const res = await fetch(`${X_USERS_ME_URL}?user.fields=username`, {
      headers: { Authorization: oauthHeader("GET", X_USERS_ME_URL, creds) },
    });
    const raw = await res.text();
    if (!res.ok) return null;
    const data = JSON.parse(raw) as { data?: { username?: string } };
    return data.data?.username ?? null;
  } catch {
    return null;
  }
}

const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function topSignal(signals: Signal[]): Signal | null {
  if (!signals.length) return null;
  return signals
    .slice()
    .sort(
      (a, b) =>
        (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0) ||
        Math.abs(b.delta) - Math.abs(a.delta),
    )[0];
}

/** Rick's personal-voice quote text — builder tone, one concrete point, no link
 *  (the quoted post carries the link), no hashtags, no fraud accusation. */
export function composeRickQuote(signals: Signal[], dateKey: string): string {
  const top = topSignal(signals);
  const fact = top ? compactFactLine(top) : "today's cross-network DePIN read is live";

  const frames = [
    `${fact}. People debate tokens; I keep watching the device layer. Ran the public read myself —`,
    `Pulled this from public data today: ${fact}. Not an accusation — just the kind of thing every DePIN should be able to answer.`,
    `${fact}. This is the layer nobody audits. Here's today's neutral read —`,
    `Most DePIN dashboards show growth. None show if the devices are real. Today: ${fact}.`,
  ];
  const idx = Number(dateKey.replace(/\D/g, "").slice(-3) || 0) % frames.length;
  const text = neutralize(frames[idx]).replace(/\s+/g, " ").trim();
  const clipped = text.length <= MAX_LEN ? text : `${text.slice(0, MAX_LEN - 1)}…`;
  return assertClean(clipped, "rick-quote");
}

/**
 * Reply on the bureau signal post from @Kinetik_Rick (thread amplification).
 * Safe no-op when Rick creds are absent; respects DRIP_DRY_RUN.
 */
export async function amplifyAsRick(opts: {
  quoteTweetId: string; // signal post id — kept for call-site continuity
  signals: Signal[];
  patterns?: Pattern[];
  dateKey: string;
  dryRun?: boolean;
}): Promise<RickResult> {
  if (!opts.quoteTweetId) {
    return { ok: false, skipped: true, message: "No signal tweet id to quote" };
  }

  const text = composeRickQuote(opts.signals, opts.dateKey);
  const dryRun = opts.dryRun ?? process.env.DRIP_DRY_RUN === "true";

  if (dryRun) {
    return { ok: true, message: `DRY_RUN: @Kinetik_Rick would reply on ${opts.quoteTweetId}: "${text}"` };
  }

  const creds = loadRickCreds();
  if (!creds) {
    return {
      ok: false,
      skipped: true,
      message: "Rick amplify skipped — set RICK_X_ACCESS_TOKEN + RICK_X_ACCESS_SECRET to enable",
    };
  }

  try {
    const res = await fetch(X_TWEET_URL, {
      method: "POST",
      headers: {
        Authorization: oauthHeader("POST", X_TWEET_URL, creds),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reply: { in_reply_to_tweet_id: opts.quoteTweetId },
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, message: `Rick reply failed — X API ${res.status}: ${raw.slice(0, 300)}` };
    }
    const data = JSON.parse(raw) as { data?: { id?: string } };
    const handle = (await resolveRickMentionHandle()) ?? "Kinetik_Rick";
    return { ok: true, message: `@${handle} replied on the signal post`, tweetId: data.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Rick reply error: ${msg}` };
  }
}
