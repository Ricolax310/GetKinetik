// Post to X (Twitter) via API v2 + OAuth 1.0a user context (no extra npm deps).

import crypto from "node:crypto";

function pctEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function oauthSignature(method, baseUrl, params, consumerSecret, tokenSecret) {
  const keys = Object.keys(params).sort();
  const paramString = keys.map((k) => `${pctEncode(k)}=${pctEncode(params[k])}`).join("&");
  const base = `${method.toUpperCase()}&${pctEncode(baseUrl)}&${pctEncode(paramString)}`;
  const signingKey = `${pctEncode(consumerSecret)}&${pctEncode(tokenSecret || "")}`;
  return crypto.createHmac("sha1", signingKey).update(base).digest("base64");
}

function oauthHeader(method, url, bodyParams, creds) {
  const oauth = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };
  const allParams = { ...oauth, ...bodyParams };
  oauth.oauth_signature = oauthSignature(
    method,
    url,
    allParams,
    creds.apiSecret,
    creds.accessSecret,
  );
  const parts = Object.keys(oauth)
    .sort()
    .map((k) => `${pctEncode(k)}="${pctEncode(oauth[k])}"`);
  return `OAuth ${parts.join(", ")}`;
}

export function loadXCredentials() {
  const apiKey = process.env.X_API_KEY || process.env.TWITTER_API_KEY;
  const apiSecret = process.env.X_API_SECRET || process.env.TWITTER_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET || process.env.TWITTER_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return null;
  }
  return { apiKey, apiSecret, accessToken, accessSecret };
}

/** Post a tweet. Returns { id, text } or throws. */
export async function postTweet(text) {
  const creds = loadXCredentials();
  if (!creds) {
    throw new Error("X credentials missing — set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET");
  }
  const url = "https://api.twitter.com/2/tweets";
  const body = { text: String(text).slice(0, 280) };
  const auth = oauthHeader("POST", url, {}, creds);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${raw.slice(0, 500)}`);
  }
  const data = JSON.parse(raw);
  return { id: data.data?.id, text: data.data?.text };
}
