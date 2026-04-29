/**
 * POST /api/waitlist
 *
 * Adds an email to the Sovereign Node waitlist.
 *
 * Environment bindings (configure in Cloudflare Pages → Settings → Functions):
 *   WAITLIST      KV namespace binding  (required)
 *
 * Request body:  { email: string, platform?: "android" | "ios" | "desktop" }
 * Response 200:  { status: "added" | "already-on-list", position: number | null }
 * Response 400:  { error: string }
 *
 * Notes on `position`:
 *   - On a fresh add, position = total entry count (so the very first
 *     signup sees #1, the second sees #2, …). Stored inside the entry
 *     so subsequent duplicate POSTs from the same user return the
 *     same number (no rolling number that ticks up under their feet).
 *   - On an existing entry that predates this code, `position` is
 *     missing from the stored payload — we return null and the
 *     frontend hides the badge for that user. Honest fallback.
 *   - Counting is done with a paginated key listing rather than a
 *     separate counter key. KV doesn't have atomic counters and at
 *     our scale (sub-10k keys for the foreseeable future) listing is
 *     fast and avoids the increment-race-condition footgun.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Count all `waitlist:*` keys in the KV namespace, paginating through
// `list_complete: false` results. The default page size is 1000 — this
// loop keeps us correct beyond that without changing the API surface.
async function countWaitlistKeys(kv) {
  let total = 0;
  let cursor;
  // Eslint-style do-while loop is fine here; we always need at least
  // one round trip and we exit when list_complete is true.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await kv.list({ prefix: "waitlist:", cursor });
    total += page.keys.length;
    if (page.list_complete) return total;
    cursor = page.cursor;
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;

  if (!env.WAITLIST) {
    return json(
      { error: "Waitlist storage not configured." },
      500
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: "Invalid JSON." }, 400);
  }

  const rawEmail = typeof payload?.email === "string" ? payload.email : "";
  const email = rawEmail.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "Invalid email." }, 400);
  }

  const rawPlatform = typeof payload?.platform === "string" ? payload.platform : "";
  const platform = ["android", "ios", "desktop"].includes(rawPlatform)
    ? rawPlatform
    : "unknown";

  const key = `waitlist:${email}`;

  const existing = await env.WAITLIST.get(key);
  if (existing) {
    // Surface the stored position back to the frontend so a returning
    // visitor sees the same number they did the first time. Pre-position
    // entries (added before this field existed) return null and the UI
    // gracefully hides the badge.
    let position = null;
    try {
      const parsed = JSON.parse(existing);
      if (typeof parsed?.position === "number" && parsed.position > 0) {
        position = parsed.position;
      }
    } catch (_) {
      // corrupt entry — ignore, return null position
    }
    return json({ status: "already-on-list", position }, 200);
  }

  // Position = total keys + 1 (so the first signup is #1, not #0).
  // Computed before the put so we don't double-count this entry.
  const position = (await countWaitlistKeys(env.WAITLIST)) + 1;

  const entry = {
    email,
    platform,
    position,
    timestamp: new Date().toISOString(),
    userAgent: (request.headers.get("user-agent") || "").slice(0, 512),
    country: (request.cf && request.cf.country) || "",
    ip: (request.headers.get("cf-connecting-ip") || "").slice(0, 64),
  };

  await env.WAITLIST.put(key, JSON.stringify(entry));

  return json({ status: "added", position }, 200);
}

export async function onRequest(ctx) {
  if (ctx.request.method === "POST") {
    return onRequestPost(ctx);
  }
  return json({ error: "Method not allowed." }, 405);
}
