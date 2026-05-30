# GETKINETIK — Tier Change Webhooks

> **Direction:** `getkinetik.app` → *your* server (outbound POST from the bureau).
> **Event:** `tier.changed` — a node's derived `tier` transitioned.
> **Auth:** HMAC-SHA256 signature in `X-GETKINETIK-Signature`.
> **Delivery:** best-effort. No queue, no retries. Treat as a *push optimization* over `GET /api/score/{nodeId}`, not a guaranteed log.

---

## What it's for

If your network wants real-time notification when a GETKINETIK node's
derived tier changes (e.g. a node we previously derived as `STANDING` is
now `TAMPERED`), register a receiver URL with us and we'll POST you the
event the moment our verifier commits the change.

This is faster and cheaper than polling `GET /api/score/{nodeId}` on a
schedule, but should be treated as a *cache invalidation hint* — your
authoritative read remains the score-lookup API, and your authoritative
trust decision is the embedded **signed attestation**, re-verified offline.

---

## How to register

Email `eric@outfromnothingllc.com` with:

1. Your network name
2. The receiver URL (`https://...` only, no `http://`)
3. Which transitions you care about (e.g. "any transition into `TAMPERED`")

We'll set:

- `SCORE_WEBHOOK_URLS` — JSON array including your URL
- `SCORE_WEBHOOK_SECRET` — shared HMAC key we'll send you over a secure channel

Once your URL is in the registry, every tier transition for *any* node
the bureau verifies fires a POST to your endpoint.

---

## Event payload

```json
{
  "event": "tier.changed",
  "nodeId": "KINETIK-NODE-A3F2B719",
  "fromTier": "STANDING",
  "toTier": "TAMPERED",
  "score": 199,
  "flags": ["chain_rewind"],
  "policyVersion": "v2.0.2",
  "attestation": { "payload": {}, "message": "", "signature": "", "hash": "" },
  "asOf": "2026-05-13T13:34:22.674Z",
  "delivery": "12345678-90ab-cdef-1234-567890abcdef"
}
```

| Field | Type | Description |
|---|---|---|
| `event` | string | Always `"tier.changed"`. |
| `nodeId` | string | `KINETIK-NODE-XXXXXXXX`. |
| `fromTier` | string \| null | Previous tier, or `null` on first sighting. |
| `toTier` | string | New tier: `NEW`, `STANDING`, `STRONG`, `PREMIER`, `TAMPERED`. |
| `score` | integer | New derived score (0–1000). |
| `flags` | string[] | Active flags, e.g. `["chain_rewind"]`. Empty array on clean grades. |
| `policyVersion` | string | E.g. `"v2.0.2"`. Pin this to detect policy upgrades. |
| `attestation` | object | The full bureau-signed attestation — re-verify offline before trusting the transition. |
| `asOf` | string | ISO timestamp the attestation was minted. |
| `delivery` | string | UUID — use to deduplicate if you implement an idempotency log. |

---

## Headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `GETKINETIK-Bureau/2.0` |
| `X-GETKINETIK-Event` | `tier.changed` |
| `X-GETKINETIK-Delivery` | `<uuid>` (same as `delivery` in body) |
| `X-GETKINETIK-Signature` | `sha256=<hex>` — HMAC-SHA256 of the raw request body, keyed by the shared secret |

---

## Verifying the signature (Node.js example)

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

const SHARED_SECRET = process.env.GETKINETIK_WEBHOOK_SECRET!;

function verifyGetkinetikWebhook(rawBody: string, signatureHeader: string) {
  const sent = signatureHeader.replace(/^sha256=/, '');
  const expected = createHmac('sha256', SHARED_SECRET)
    .update(rawBody)
    .digest('hex');

  return timingSafeEqual(
    Buffer.from(sent, 'hex'),
    Buffer.from(expected, 'hex'),
  );
}

// Express handler:
app.post('/getkinetik-webhook', (req, res) => {
  const sig = req.header('x-getkinetik-signature') || '';
  if (!verifyGetkinetikWebhook(req.rawBody, sig)) {
    return res.status(401).send('bad signature');
  }
  const { nodeId, toTier, score, attestation, delivery } = req.body;
  // Re-verify the embedded attestation offline before trusting the transition:
  //   import { verifyArtifact } from '@getkinetik/verify';
  //   const report = await verifyArtifact(attestation);
  //   if (!report.valid || !report.checks.bureauOk) return res.status(202).end();
  // ... handle the event ...
  res.status(200).send('ok');
});
```

**Important:** verify against the **raw** request body bytes, not a
re-serialized JSON. Different serializers produce different byte
sequences, and the HMAC is computed over the exact bytes we sent.

---

## Delivery semantics

| Property | Value |
|---|---|
| Retries | None. A future `webhooks.v2` may add exponential backoff. |
| Order | Not guaranteed. Cloudflare Workers can race concurrent dispatches. |
| At-least-once | No — closer to *at-most-once*. Treat as a hint. |
| Timeout | 5 seconds. Your endpoint must respond inside that window. |
| Replay window | None server-side. Use the `delivery` UUID to deduplicate on your side if you process the event idempotently. |

If your business logic depends on never missing a transition, run a
nightly reconciliation against `GET /api/score/{nodeId}` for every node
your payouts touched in the past 24 hours.

---

## What we'll never do

- We'll **never** send a webhook that includes a partner's API key, credentials, or PII.
- We'll **never** request that you call back into the bureau as part of webhook handling (no two-leg dance).
- We'll **never** silently change the payload schema; new fields are additive and announced in the changelog at least 30 days ahead.

---

Contact: `eric@outfromnothingllc.com`
