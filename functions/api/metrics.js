/**
 * GET /api/metrics
 *
 * Returns aggregate network metrics for the public dashboard at
 * getkinetik.app/metrics/.
 *
 * All data is aggregate-only — no per-user information is exposed.
 * Privacy-respecting design: GETKINETIK cannot identify individual nodes
 * from the data returned here.
 *
 * Environment bindings:
 *   KINETIK_KV   KV namespace binding (required)
 *
 * Response 200:
 * {
 *   "nodes": {
 *     "total": 47,
 *     "active24h": 23
 *   },
 *   "heartbeats": {
 *     "lifetimeTotal": 98304,
 *     "last24h": 2048
 *   },
 *   "proofs": {
 *     "lifetimeMinted": 156
 *   },
 *   "networks": {
 *     "nodle": 18,
 *     "dimo": 12,
 *     "hivemapper": 5,
 *     "weatherxm": 8,
 *     "geodnet": 4
 *   },
 *   "updatedAt": "2026-04-30T17:00:00.000Z"
 * }
 *
 * The app reports metrics via POST /api/metrics (node registration + periodic
 * heartbeat count updates). The GET endpoint aggregates them for the dashboard.
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",  // 5-minute cache for CDN
      "access-control-allow-origin": "*",
    },
  });
}

// Default metrics returned when KV is not configured or data is unavailable.
// Conservative — shows real zeros rather than fake numbers.
const DEFAULT_METRICS = {
  nodes: { total: 0, active24h: 0 },
  heartbeats: { lifetimeTotal: 0, last24h: 0 },
  proofs: { lifetimeMinted: 0 },
  networks: { nodle: 0, dimo: 0, hivemapper: 0, weatherxm: 0, geodnet: 0 },
  updatedAt: new Date().toISOString(),
};

export async function onRequestGet(ctx) {
  const { env } = ctx;

  if (!env.KINETIK_KV) {
    return json(DEFAULT_METRICS);
  }

  try {
    const raw = await env.KINETIK_KV.get("metrics:aggregate");
    if (!raw) return json(DEFAULT_METRICS);

    const data = JSON.parse(raw);
    return json(data);
  } catch {
    return json(DEFAULT_METRICS);
  }
}

/**
 * POST /api/metrics
 *
 * Reports a node's activity to the aggregate metrics store.
 * Called by the app on registration and periodically (once per hour).
 *
 * Body: {
 *   nodeId: string,
 *   event: "register" | "heartbeat" | "proof",
 *   networks: string[],   // active adapter IDs
 *   heartbeatCount: number
 * }
 */
export async function onRequestPost(ctx) {
  const { request, env } = ctx;

  if (!env.KINETIK_KV) {
    return json({ ok: true, stored: false });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
  const event  = typeof body?.event  === "string" ? body.event  : "";
  if (!nodeId || !event) {
    return json({ error: "nodeId and event are required." }, 400);
  }

  // Store the node's latest report.
  const nodeKey   = `node:${nodeId}`;
  const existing  = await env.KINETIK_KV.get(nodeKey, { type: "json" }).catch(() => null);
  const now       = new Date().toISOString();
  const nowMs     = Date.now();

  const nodeData = {
    nodeId,
    lastSeen: now,
    lastSeenMs: nowMs,
    networks: Array.isArray(body.networks) ? body.networks.filter((n) => typeof n === "string") : [],
    heartbeatCount: typeof body.heartbeatCount === "number" ? Math.floor(body.heartbeatCount) : (existing?.heartbeatCount ?? 0),
    proofCount: event === "proof" ? ((existing?.proofCount ?? 0) + 1) : (existing?.proofCount ?? 0),
    registeredAt: existing?.registeredAt ?? now,
  };

  await env.KINETIK_KV.put(nodeKey, JSON.stringify(nodeData), {
    expirationTtl: 60 * 60 * 24 * 90,  // 90 days
  });

  // Recompute aggregate metrics.
  // This is O(n) over all node keys — fine at our scale (<10k nodes).
  // At 10k+ nodes, switch to a separate counter key.
  await recomputeAggregates(env.KINETIK_KV, nowMs);

  return json({ ok: true });
}

async function recomputeAggregates(kv, nowMs) {
  try {
    let total         = 0;
    let active24h     = 0;
    let lifetimeBeats = 0;
    let beats24h      = 0;
    let lifetimeProofs = 0;
    const networks    = { nodle: 0, dimo: 0, hivemapper: 0, weatherxm: 0, geodnet: 0 };

    let cursor;
    const cutoff24h = nowMs - 24 * 60 * 60 * 1000;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await kv.list({ prefix: "node:", cursor });
      for (const key of page.keys) {
        const raw = await kv.get(key.name, { type: "json" }).catch(() => null);
        if (!raw) continue;

        total++;
        if (raw.lastSeenMs && raw.lastSeenMs >= cutoff24h) {
          active24h++;
          beats24h += raw.heartbeatCount ?? 0;
        }
        lifetimeBeats  += raw.heartbeatCount ?? 0;
        lifetimeProofs += raw.proofCount ?? 0;

        for (const net of (raw.networks ?? [])) {
          if (net in networks) networks[net]++;
        }
      }
      if (page.list_complete) break;
      cursor = page.cursor;
    }

    const aggregate = {
      nodes:      { total, active24h },
      heartbeats: { lifetimeTotal: lifetimeBeats, last24h: beats24h },
      proofs:     { lifetimeMinted: lifetimeProofs },
      networks,
      updatedAt: new Date(nowMs).toISOString(),
    };

    await kv.put("metrics:aggregate", JSON.stringify(aggregate), {
      expirationTtl: 60 * 60 * 24 * 7,  // 7 days
    });
  } catch {
    // Non-critical — aggregate computation failure doesn't fail the POST.
  }
}

export async function onRequest(ctx) {
  if (ctx.request.method === "GET")  return onRequestGet(ctx);
  if (ctx.request.method === "POST") return onRequestPost(ctx);
  return json({ error: "Method not allowed." }, 405);
}
