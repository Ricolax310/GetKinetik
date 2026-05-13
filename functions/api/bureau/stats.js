/**
 * GET /api/bureau/stats — public bureau telemetry.
 *
 * Returns aggregate counters for the GETKINETIK Genesis Score bureau:
 * verifications served, score-band distribution, tamper-flag count,
 * first/last verification timestamps. Powers the live ticker on
 * landing/bureau/index.html.
 *
 * Counters are eventually-consistent. The writer (functions/api/verify-device.js)
 * does a read-modify-write on a single KV key; last-writer-wins is fine for a
 * public dashboard. Do not use these numbers for billing or compliance —
 * they are for transparency, not accounting.
 *
 * ── Response 200 ────────────────────────────────────────────────────────────
 * {
 *   "ok": true,
 *   "stats": {
 *     "total": 12,
 *     "valid": 11,
 *     "invalid": 1,
 *     "flagged": 4,
 *     "signedAttestations": 3,
 *     "byTier": { "NEW": 3, "STANDING": 4, "STRONG": 2, "PREMIER": 2, "TAMPERED": 1 },
 *     "firstVerifyAt": "2026-05-13T03:00:00.000Z",
 *     "lastVerifyAt":  "2026-05-13T13:34:22.674Z"
 *   },
 *   "methodologyVersion": "v1.1",
 *   "asOf": "2026-05-13T13:35:00.000Z"
 * }
 *
 * Cache-Control: public, max-age=30 (cheap edge cache, partners scraping
 * this don't need real-time precision).
 *
 * KEY NOTE: this reader and functions/api/verify-device.js#bumpBureauStats
 * MUST share the same KV key + shape. They were drifted across versions
 * (v1 with byBand vs v2 with byTier) and the public ticker silently zeroed.
 * If you bump either, bump both in the same commit.
 */

const STATS_KEY = "stats:bureau:v2";
const METHODOLOGY_VERSION = "v1.1";

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      ...extraHeaders,
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
  const empty = {
    total: 0,
    valid: 0,
    invalid: 0,
    flagged: 0,
    signedAttestations: 0,
    byTier: { NEW: 0, STANDING: 0, STRONG: 0, PREMIER: 0, TAMPERED: 0 },
    firstVerifyAt: null,
    lastVerifyAt: null,
  };

  if (!ctx.env?.KINETIK_KV) {
    return json(
      {
        ok: true,
        stats: empty,
        methodologyVersion: METHODOLOGY_VERSION,
        asOf: new Date().toISOString(),
        note: "KV not bound on this deployment.",
      },
      200,
    );
  }

  let stats = empty;
  try {
    const raw = await ctx.env.KINETIK_KV.get(STATS_KEY, { type: "json" });
    if (raw && typeof raw === "object") {
      stats = {
        total: raw.total || 0,
        valid: raw.valid || 0,
        invalid: raw.invalid || 0,
        flagged: raw.flagged || 0,
        signedAttestations: raw.signedAttestations || 0,
        byTier: {
          NEW: raw.byTier?.NEW || 0,
          STANDING: raw.byTier?.STANDING || 0,
          STRONG: raw.byTier?.STRONG || 0,
          PREMIER: raw.byTier?.PREMIER || 0,
          TAMPERED: raw.byTier?.TAMPERED || 0,
        },
        firstVerifyAt: raw.firstVerifyAt || null,
        lastVerifyAt: raw.lastVerifyAt || null,
      };
    }
  } catch (err) {
    console.error("[bureau/stats] kv read failed:", err);
  }

  return json(
    {
      ok: true,
      stats,
      methodologyVersion: METHODOLOGY_VERSION,
      asOf: new Date().toISOString(),
    },
    200,
  );
}

export async function onRequest(ctx) {
  if (ctx.request.method === "OPTIONS") return onRequestOptions();
  if (ctx.request.method === "GET") return onRequestGet(ctx);
  return json({ error: "Method not allowed." }, 405);
}
