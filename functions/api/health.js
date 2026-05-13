/**
 * GET /api/health — bureau service health probe.
 *
 * Cheap liveness + readiness check. External uptime monitors hit this
 * endpoint. Returns 200 with `ok: true` if every dependency the bureau
 * needs to *grade* a node is reachable. Returns 200 with `ok: false`
 * and per-check breakdown if a dependency is degraded — we still return
 * 200 (not 503) so monitors can scrape the body and tell the difference
 * between "endpoint is up but degraded" and "endpoint is gone".
 */

const SERVICE = "GETKINETIK Bureau";
const METHODOLOGY_VERSION = "v1.1";
const STATS_KEY = "stats:bureau:v1";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export async function onRequestGet(ctx) {
  const startedAt = Date.now();
  const checks = {
    kv_binding: "unknown",
    kv_read: "unknown",
    attest_configured: "unknown",
  };

  // 1. KV binding present?
  checks.kv_binding = ctx.env?.KINETIK_KV ? "pass" : "fail";

  // 2. KV readable?
  if (ctx.env?.KINETIK_KV) {
    try {
      // A read of the stats key is the cheapest possible round-trip.
      // We don't care about the value, only that the call succeeds.
      await ctx.env.KINETIK_KV.get(STATS_KEY);
      checks.kv_read = "pass";
    } catch (err) {
      checks.kv_read = "fail";
      console.error("[health] kv read failed:", err);
    }
  } else {
    checks.kv_read = "skip";
  }

  // 3. Attest channel configured?
  if (
    (typeof ctx.env?.ATTEST_API_KEYS === "string" && ctx.env.ATTEST_API_KEYS.trim()) ||
    (typeof ctx.env?.ATTEST_API_KEY === "string" && ctx.env.ATTEST_API_KEY.trim())
  ) {
    checks.attest_configured = "pass";
  } else {
    checks.attest_configured = "fail";
  }

  const ok =
    checks.kv_binding === "pass" &&
    (checks.kv_read === "pass" || checks.kv_read === "skip");

  return json(
    {
      ok,
      service: SERVICE,
      methodologyVersion: METHODOLOGY_VERSION,
      checks,
      tookMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    },
    200,
  );
}

export async function onRequest(ctx) {
  if (ctx.request.method === "OPTIONS") return onRequestOptions();
  if (ctx.request.method === "GET") return onRequestGet(ctx);
  return json({ error: "Method not allowed." }, 405);
}
