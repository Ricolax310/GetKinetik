/**
 * POST /api/attest — partner attestation channel.
 *
 * The signed evidence in a Proof of Origin is internal — it's what the
 * node says about itself. Partner attestations are the external evidence
 * a real bureau correlates against the internal record (see
 * `docs/methodology/GENESIS_SCORE.md` §3.4).
 *
 * Partner networks (DIMO, Hivemapper, WeatherXM, etc.) submit typed
 * attestations here — "this node performed expected work", "this node
 * failed our integrity check", "this node was flagged for fraud" — and
 * the bureau stores them for future inclusion in the Genesis Score
 * (v1.1 will fold attestations into the live score; v1.0 records them
 * but does not yet feed them back into `verify-device`).
 *
 * ── Authentication ───────────────────────────────────────────────────────
 * Authorization: Bearer <partner-api-key>
 *
 * Partner API keys are issued out-of-band by emailing
 * eric@outfromnothingllc.com. The current binding pattern is a single
 * key stored as `ATTEST_API_KEY` in Cloudflare Pages environment. v1.1
 * will introduce per-partner keys with attribution.
 *
 * ── Request ──────────────────────────────────────────────────────────────
 * POST /api/attest
 * Content-Type: application/json
 * Authorization: Bearer <key>
 *
 * {
 *   "nodeId":  "KINETIK-NODE-A3F2B719",
 *   "kind":    "engagement" | "fault" | "fraud",
 *   "network": "dimo" | "hivemapper" | "nodle" | "weatherxm" | "geodnet" | string,
 *   "detail":  "free-form short string (≤ 256 chars), partner-defined",
 *   "weight":  -3 | -2 | -1 | 0 | 1 | 2 | 3   // signed magnitude, ±3 cap
 * }
 *
 * ── Response 200 ─────────────────────────────────────────────────────────
 * {
 *   "ok":      true,
 *   "receipt": "attest:KINETIK-NODE-A3F2B719:1715581234567:<unique-suffix>",
 *   "recordedAt": "2026-05-13T03:00:00.000Z"
 * }
 *
 * ── Response 401 / 400 / 503 ─────────────────────────────────────────────
 * { "error": "missing_auth" | "invalid_auth" | "missing_field:nodeId" | ... }
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}

const NODE_ID_PATTERN = /^KINETIK-NODE-[0-9A-F]{8}$/;
const VALID_KINDS = new Set(["engagement", "fault", "fraud"]);
const MAX_DETAIL_LEN = 256;

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function receiptEntropy() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}

export async function onRequestGet() {
  return json(
    {
      documentation: true,
      summary:
        "Partner attestation channel — call with HTTP POST + Bearer auth. This GET response is documentation.",
      method: "POST",
      headers: { Authorization: "Bearer <partner-api-key>" },
      bodyExample: {
        nodeId: "KINETIK-NODE-A3F2B719",
        kind: "engagement",
        network: "dimo",
        detail: "Trip uploaded successfully (vehicle ID matched).",
        weight: 1,
      },
      validKinds: ["engagement", "fault", "fraud"],
      requestApiKey: "eric@outfromnothingllc.com",
      spec: "https://github.com/Ricolax310/GetKinetik/blob/main/docs/methodology/GENESIS_SCORE.md",
    },
    200,
  );
}

export async function onRequestPost(ctx) {
  const expectedKey = ctx.env?.ATTEST_API_KEY;
  if (!expectedKey) {
    return json(
      {
        error: "attestation_channel_offline",
        hint: "No partner API key configured on this deployment. Contact eric@outfromnothingllc.com to enroll.",
      },
      503,
    );
  }

  const authHeader = ctx.request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: "missing_auth" }, 401);

  const providedKey = match[1].trim();
  if (!constantTimeEqual(providedKey, expectedKey)) {
    return json({ error: "invalid_auth" }, 401);
  }

  let body;
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "invalid_json_body" }, 400);
  }

  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
  if (!nodeId) return json({ error: "missing_field:nodeId" }, 400);
  if (!NODE_ID_PATTERN.test(nodeId))
    return json({ error: "invalid_node_id" }, 400);

  const kind = typeof body?.kind === "string" ? body.kind.toLowerCase() : "";
  if (!VALID_KINDS.has(kind)) return json({ error: "invalid_kind" }, 400);

  const network =
    typeof body?.network === "string" ? body.network.toLowerCase().trim() : "";
  if (!network || network.length > 32)
    return json({ error: "invalid_network" }, 400);

  const detail = typeof body?.detail === "string" ? body.detail.trim() : "";
  if (detail.length > MAX_DETAIL_LEN)
    return json({ error: "detail_too_long" }, 400);

  const weightRaw = body?.weight;
  let weight;
  if (typeof weightRaw === "number" && Number.isFinite(weightRaw)) {
    weight = Math.max(-3, Math.min(3, Math.round(weightRaw)));
  } else {
    return json({ error: "missing_field:weight" }, 400);
  }

  const nowMs = Date.now();
  const recordedAt = new Date(nowMs).toISOString();
  const key = `attest:${nodeId}:${nowMs}:${receiptEntropy()}`;

  const record = {
    nodeId,
    kind,
    network,
    detail,
    weight,
    recordedAt,
    recordedAtMs: nowMs,
  };

  if (!ctx.env?.KINETIK_KV) {
    return json(
      {
        error: "attestation_storage_unavailable",
        hint: "KV not bound on this deployment.",
      },
      503,
    );
  }

  try {
    await ctx.env.KINETIK_KV.put(key, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 365, // 1 year
    });
  } catch (err) {
    console.error("[attest] kv put failed:", err);
    return json({ error: "attestation_storage_failed" }, 503);
  }

  return json(
    {
      ok: true,
      receipt: key,
      recordedAt,
      note:
        "Recorded. v1.0 stores attestations; v1.1 will fold them into the Genesis Score.",
    },
    200,
  );
}

export async function onRequest(ctx) {
  if (ctx.request.method === "OPTIONS") return onRequestOptions();
  if (ctx.request.method === "GET") return onRequestGet();
  if (ctx.request.method === "POST") return onRequestPost(ctx);
  return json({ error: "Method not allowed." }, 405);
}
