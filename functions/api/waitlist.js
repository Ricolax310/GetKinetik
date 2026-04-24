/**
 * POST /api/waitlist
 *
 * Adds an email to the Sovereign Node waitlist.
 *
 * Environment bindings (configure in Cloudflare Pages → Settings → Functions):
 *   WAITLIST      KV namespace binding  (required)
 *
 * Request body:  { email: string, platform?: "android" | "ios" | "desktop" }
 * Response 200:  { status: "added" | "already-on-list" }
 * Response 400:  { error: string }
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    return json({ status: "already-on-list" }, 200);
  }

  const entry = {
    email,
    platform,
    timestamp: new Date().toISOString(),
    userAgent: (request.headers.get("user-agent") || "").slice(0, 512),
    country: (request.cf && request.cf.country) || "",
    ip: (request.headers.get("cf-connecting-ip") || "").slice(0, 64),
  };

  await env.WAITLIST.put(key, JSON.stringify(entry));

  return json({ status: "added" }, 200);
}

export async function onRequest(ctx) {
  if (ctx.request.method === "POST") {
    return onRequestPost(ctx);
  }
  return json({ error: "Method not allowed." }, 405);
}
