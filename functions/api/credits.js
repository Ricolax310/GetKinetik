/**
 * POST /api/credits
 *
 * Upserts a node's Genesis Credits total into Cloudflare KV.
 * Called by the app every 30 minutes to back up the local credit ledger,
 * ensuring credits survive device loss.
 *
 * This is a trust-but-verify write: the value stored is self-reported by
 * the app. In production, the server would verify the signed heartbeat count
 * from the chain to validate the claim before persisting. For v1.4 the
 * self-report is accepted as-is — the Genesis Credits are NOT monetary
 * instruments so the fraud surface is low.
 *
 * Environment bindings:
 *   KINETIK_KV   KV namespace binding (required)
 *
 * Request: { nodeId: string, total: number }
 * Response 200: { ok: true }
 * Response 400: { error: string }
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
  const total  = typeof body?.total  === "number" ? body.total          : null;

  if (!nodeId || nodeId.length > 128) {
    return json({ error: "Invalid nodeId." }, 400);
  }
  if (total === null || !Number.isFinite(total) || total < 0 || total > 1_000_000_000) {
    return json({ error: "Invalid total." }, 400);
  }

  if (!env.KINETIK_KV) {
    // KV not configured — silently accept so the app doesn't retry-loop.
    return json({ ok: true, stored: false });
  }

  const key   = `credits:${nodeId}`;
  const value = JSON.stringify({
    nodeId,
    total: Math.floor(total),
    updatedAt: new Date().toISOString(),
  });

  await env.KINETIK_KV.put(key, value, { expirationTtl: 60 * 60 * 24 * 365 });

  return json({ ok: true, stored: true });
}

export async function onRequest(ctx) {
  if (ctx.request.method === "POST") return onRequestPost(ctx);
  return json({ error: "Method not allowed." }, 405);
}
