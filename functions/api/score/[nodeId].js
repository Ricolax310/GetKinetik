/**
 * GET /api/score/:nodeId — Genesis Score lookup.
 *
 * Returns the most recent Genesis Score the bureau has on file for a node,
 * without requiring the caller to supply a fresh Proof of Origin.
 *
 * Scores are cached in KV every time `POST /api/verify-device` runs against
 * a node. If a partner has never called verify-device for the node, the
 * bureau has no record and returns 404.
 *
 * ── Request ──────────────────────────────────────────────────────────────
 * GET /api/score/KINETIK-NODE-A3F2B719
 *
 * ── Response 200 ─────────────────────────────────────────────────────────
 * {
 *   "nodeId":             "KINETIK-NODE-A3F2B719",
 *   "genesisScore":       636,
 *   "scoreBand":          "STANDING",
 *   "methodologyVersion": "v1.0",
 *   "tamperFlags":        [],
 *   "lifetimeBeats":      25847,
 *   "firstBeatTs":        1777086288998,
 *   "asOf":               "2026-05-13T03:00:00.000Z",
 *   "cachedAt":           "2026-05-13T03:00:00.000Z",
 *   "source":             "kv"
 * }
 *
 * ── Response 404 ─────────────────────────────────────────────────────────
 * {
 *   "error": "node_not_found",
 *   "hint":  "Call POST /api/verify-device with a fresh Proof of Origin first."
 * }
 *
 * ── Response 503 ─────────────────────────────────────────────────────────
 * { "error": "score_storage_unavailable" }
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
    return json({ error: "score_storage_unavailable" }, 503);
  }

  try {
    const raw = await ctx.env.KINETIK_KV.get(`score:${nodeId}`, {
      type: "json",
    });

    if (!raw) {
      return json(
        {
          error: "node_not_found",
          hint: "Call POST /api/verify-device with a fresh Proof of Origin first.",
        },
        404,
      );
    }

    return json({ ...raw, source: "kv" }, 200);
  } catch (err) {
    console.error("[score] kv error:", err);
    return json({ error: "score_storage_unavailable" }, 503);
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
