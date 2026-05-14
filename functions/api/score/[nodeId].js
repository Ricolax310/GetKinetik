/**
 * GET /api/score/:nodeId — cached bureau attestation lookup.
 *
 * v2.0 — wire shape changed in lockstep with /api/verify-device.
 *
 * Returns the most recent SIGNED ATTESTATION the bureau has cached for a
 * node. The signed attestation is the authoritative output; the `derived`
 * block is a convenience computed using the default policy (mirror of
 * @getkinetik/evidence-mapping DEFAULT_POLICY).
 *
 * If a partner has never called POST /api/verify-device for the node, the
 * bureau has no cached attestation and returns 404.
 *
 * ── Request ──────────────────────────────────────────────────────────────
 * GET /api/score/KINETIK-NODE-A3F2B719
 *
 * ── Response 200 ─────────────────────────────────────────────────────────
 * {
 *   "nodeId": "KINETIK-NODE-A3F2B719",
 *
 *   "attestation": {
 *     "payload":   {...AttestationPayload...},
 *     "message":   "<canonical bytes that were signed>",
 *     "signature": "<128-char hex bureau Ed25519>",
 *     "hash":      "<16-char hex sha256(message)[:16]>"
 *   } | null,
 *
 *   "derived": {
 *     "tier":             "PREMIER" | "STRONG" | "STANDING" | "NEW" | "TAMPERED",
 *     "score":            0..1000,
 *     "flagged":          true | false,
 *     "flags":            string[],
 *     "policyVersion":    "v2.0.2",
 *     "contributingFactors": {...}
 *   } | null,
 *
 *   "asOf":     "2026-05-13T03:00:00.000Z",
 *   "cachedAt": "2026-05-13T03:00:00.000Z",
 *   "source":   "kv"
 * }
 *
 * `attestation` is null when the cached attestation was minted in a window
 * when the bureau signing key was not configured. Partners doing real
 * integration should call POST /api/verify-device with a fresh proof if
 * the cached `attestation` is null — that triggers a fresh sign attempt.
 *
 * ── Response 404 ─────────────────────────────────────────────────────────
 * { "error": "node_not_found", "hint": "Call POST /api/verify-device first." }
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

const NODE_ID_PATTERN = /^KINETIK-NODE-[0-9A-F]{8}$/;

export async function onRequestGet(ctx) {
  const nodeId =
    typeof ctx.params?.nodeId === "string" ? ctx.params.nodeId.trim() : "";

  if (!nodeId || !NODE_ID_PATTERN.test(nodeId)) {
    return json(
      {
        error: "invalid_node_id",
        hint: "Node IDs are uppercase like KINETIK-NODE-A3F2B719.",
      },
      400,
    );
  }

  if (!ctx.env?.KINETIK_KV) {
    return json({ error: "attestation_storage_unavailable" }, 503);
  }

  try {
    // v2 cache key. v1.x wrote `score:<nodeId>` — that data is no longer
    // served. After the v2 cutover, the v1.x keys remain in KV until they
    // age out (30-day TTL) but are not surfaced by this endpoint. Partners
    // calling against a node that hasn't been re-verified since the cutover
    // see a 404; calling POST /api/verify-device with a fresh proof
    // backfills the v2 cache.
    const raw = await ctx.env.KINETIK_KV.get(`attestation:${nodeId}`, {
      type: "json",
    });

    if (!raw) {
      return json(
        {
          error: "node_not_found",
          hint:
            "Call POST /api/verify-device with a fresh Proof of Origin to populate the bureau cache.",
        },
        404,
      );
    }

    return json({ ...raw, source: "kv" }, 200);
  } catch (err) {
    console.error("[score] kv error:", err);
    return json({ error: "attestation_storage_unavailable" }, 503);
  }
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

export async function onRequest(ctx) {
  if (ctx.request.method === "OPTIONS") return onRequestOptions();
  if (ctx.request.method === "GET") return onRequestGet(ctx);
  return json({ error: "Method not allowed." }, 405);
}
