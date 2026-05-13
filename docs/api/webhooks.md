# GETKINETIK — Score Change Webhooks

> **Direction:** `getkinetik.app` → *your* server (outbound POST from the bureau).
> **Event:** `score.changed` — a node's `scoreBand` transitioned.
> **Auth:** HMAC-SHA256 signature in `X-GETKINETIK-Signature`.
> **Delivery:** best-effort. No queue, no retries. Treat as a *push optimization* over `GET /api/score/{nodeId}`, not a guaranteed log.

---

## What it's for

If your network wants real-time notification when a GETKINETIK node's
score band changes (e.g. a node we previously graded `STANDING` is now
`TAMPERED`), register a receiver URL with us and we'll POST you the event
the moment our scorer commits the change.

This is faster and cheaper than polling `GET /api/score/{nodeId}` on a
schedule, but should be treated as a *cache invalidation hint* — your
authoritative read remains the score-lookup API.

---

## How to register

Email `eric@outfromnothingllc.com` with:

1. Your network name
2. The receiver URL (`https://...` only, no `http://`)
3. Which bands you care about (e.g. "any transition into `TAMPERED`")

We'll set:

- `SCORE_WEBHOOK_URLS` — JSON array including your URL
- `SCORE_WEBHOOK_SECRET` — shared HMAC key we'll send you over a secure channel

Once your URL is in the registry, every band transition for *any* node
the bureau scores fires a POST to your endpoint.

---

## Event payload

```json
{
  "event": "score.changed",
  "nodeId": "KINETIK-NODE-A3F2B719",
  "fromBand": "STANDING",
  "toBand": "TAMPERED",
  "toScore": 199,
  "tamperFlags": ["chain_rewind"],
  "methodologyVersion": "v1.1",
  "asOf": "2026-05-13T13:34:22.674Z",
  "delivery": "12345678-90ab-cdef-1234-567890abcdef"
}
```

| Field | Type | Description |
|---|---|---|
| `event` | string | Always `"score.changed"` in v1.1. |
| `nodeId` | string | `KINETIK-NODE-XXXXXXXX`. |
| `fromBand` | string \| null | Previous band, or `null` on first sighting. |
| `toBand` | string | New band: `NEW`, `STANDING`, `STRONG`, `PREMIER`, `TAMPERED`. |
| `toScore` | integer | New score (0–1000). |
| `tamperFlags` | string[] | Active flags, e.g. `["chain_rewind"]`. Empty array on clean grades. |
| `methodologyVersion` | string | E.g. `"v1.1"`. |
| `asOf` | string | ISO timestamp the score was computed. |
| `delivery` | string | UUID — use to deduplicate if you implement an idempotency log. |

---

## Headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `GETKINETIK-Bureau/1.1` |
| `X-GETKINETIK-Event` | `score.changed` |
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
  const { nodeId, toBand, toScore, delivery } = req.body;
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
| Retries | None in v1.1. A future `webhooks.v2` may add exponential backoff. |
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
