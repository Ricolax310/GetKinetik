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

import { loadBureauSigner } from "./_lib/bureauSign.js";

const SERVICE = "GETKINETIK Bureau";
const METHODOLOGY_VERSION = "v1.1";
const STATS_KEY = "stats:bureau:v2";

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
    /** Partner attestation API key(s) for /api/attest — not the bureau Ed25519 signer. */
    attest_configured: "unknown",
    /** Bureau attestation signing: pass only if BUREAU_* secrets load and self-check. */
    bureau_signer: "unknown",
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

  // 4. Bureau Ed25519 signer (attestations on /api/verify-device)?
  const sk =
    typeof ctx.env?.BUREAU_SIGNING_KEY_HEX === "string"
      ? ctx.env.BUREAU_SIGNING_KEY_HEX.trim()
      : "";
  const pub =
    typeof ctx.env?.BUREAU_PUBKEY_HEX === "string"
      ? ctx.env.BUREAU_PUBKEY_HEX.trim()
      : "";
  if (!sk && !pub) {
    checks.bureau_signer = "skip";
  } else {
    try {
      const signer = await loadBureauSigner(ctx.env);
      checks.bureau_signer = signer ? "pass" : "fail";
    } catch (err) {
      checks.bureau_signer = "fail";
      console.error("[health] bureau signer probe failed:", err);
    }
  }

  const ok =
    checks.kv_binding === "pass" &&
    (checks.kv_read === "pass" || checks.kv_read === "skip") &&
    checks.bureau_signer !== "fail";

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
