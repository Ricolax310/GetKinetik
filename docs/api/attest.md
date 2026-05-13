# GETKINETIK — `/api/attest` Partner Attestation Channel

> **Endpoint:** `POST https://getkinetik.app/api/attest`
> **Auth:** `Authorization: Bearer <partner-api-key>` (issued out-of-band)
> **Status:** **v1.1 records partner-attributed attestations. v1.2 folds them into the Genesis Score.**

---

## What it's for

The Proof of Origin is **internal evidence** — it's what the node signs about itself. Partner networks have **external evidence** that the bureau alone can't see: "this node uploaded a clean trip", "this node failed our integrity check", "this node was flagged for fraud."

Posting an attestation here records that signal in the bureau's permanent ledger. In v1.1, attestations will feed into the live Genesis Score (`docs/methodology/GENESIS_SCORE.md` §3.4).

---

## How to get an API key

Email `eric@outfromnothingllc.com` with:

1. Your network name
2. A few example attestations you'd send (kind + detail)
3. The endpoint or pipeline you'll call from

You get a partner-specific key within a business day.

---

## Request

```http
POST /api/attest
Content-Type: application/json
Authorization: Bearer <your-key>

{
  "nodeId":  "KINETIK-NODE-A3F2B719",
  "kind":    "engagement",
  "network": "dimo",
  "detail":  "Trip uploaded successfully (vehicle ID matched).",
  "weight":  1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `nodeId` | string | ✓ | The GETKINETIK node ID you're attesting about. Must match `KINETIK-NODE-XXXXXXXX` (8 hex). |
| `kind` | enum | ✓ | One of `engagement`, `fault`, `fraud`. See below. |
| `network` | string | ✓ | Your network's lowercase identifier (`dimo`, `hivemapper`, `nodle`, `weatherxm`, `geodnet`, or your own). |
| `detail` | string | optional | Free-form short string (≤ 256 chars). Partner-defined; appears in the bureau's record. |
| `weight` | number | ✓ | Signed integer `-3..+3`. Magnitude is how strongly this attestation moves the future score. See below. |

### Kinds

| Kind | Meaning | Typical weight |
|---|---|---|
| `engagement` | The node did expected work on your network. Positive signal. | `+1` to `+3` |
| `fault` | The node failed an operational check (e.g. dropped reporting, signal quality below floor). Negative signal. | `-1` to `-2` |
| `fraud` | The node was caught doing something fraudulent on your network (GPS spoof, replay, sybil collision). Strong negative; future v1.1 will floor the score and raise a fraud flag. | `-3` |

---

## Response — recorded

```json
{
  "ok": true,
  "receipt": "attest:KINETIK-NODE-A3F2B719:1715581234567:2c0c87f5-fb4b-4f11-83aa-4d51f7f7a49f",
  "recordedAt": "2026-05-13T03:00:00.000Z",
  "attestor": "dimo",
  "note": "Recorded. v1.1 stores attestations with partner attribution; v1.2 folds them into the Genesis Score."
}
```

Save the `receipt` if you want to reference this attestation later (e.g. in a dispute). The `attestor` field is derived from your API key — it tells the bureau *who* submitted the signal, separate from the self-declared `network` field in your request body.

---

## Response — errors

| HTTP | `error` value | Meaning |
|---|---|---|
| 401 | `missing_auth` | No `Authorization` header. |
| 401 | `invalid_auth` | Bearer token did not match. |
| 400 | `invalid_json_body` | Body wasn't valid JSON. |
| 400 | `missing_field:nodeId` | `nodeId` missing or empty. |
| 400 | `invalid_node_id` | `nodeId` did not match `KINETIK-NODE-XXXXXXXX`. |
| 400 | `invalid_kind` | `kind` not one of `engagement` / `fault` / `fraud`. |
| 400 | `invalid_network` | `network` missing, empty, or > 32 chars. |
| 400 | `missing_field:weight` | `weight` missing or not a number. |
| 400 | `detail_too_long` | `detail` > 256 chars. |
| 503 | `attestation_channel_offline` | No API key configured on this deployment. Contact us. |
| 503 | `attestation_storage_unavailable` / `attestation_storage_failed` | KV write failure. Retry. |

---

## What the bureau does with attestations

**v1.0 (today):** records them. The endpoint is open to enrolled partners. Attestations are durable for 1 year. They appear in the future v1.1 Genesis Score weighting once the score-side ingestion ships.

**v1.1 (next):** the scorer reads `attest:<nodeId>:*` keys at score time and adds a network-engagement contribution per §3.4 of the methodology, capped per-partner so no single network can dominate a node's score.

**No partner can ever boost their own operators by 1000 points.** The methodology caps `Network engagement` contribution and bounds individual attestation weights.

---

## Example — Node.js

```typescript
async function attest(nodeId: string, kind: 'engagement' | 'fault' | 'fraud',
                     detail: string, weight: number) {
  const res = await fetch('https://getkinetik.app/api/attest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GETKINETIK_API_KEY}`,
    },
    body: JSON.stringify({
      nodeId,
      kind,
      network: 'dimo',
      detail,
      weight,
    }),
  });
  return res.json();
}

// Inside your payout handler:
if (verifiedTrip) {
  await attest(user.kinetikNodeId, 'engagement',
               `Trip ${tripId} uploaded`, 1);
} else if (fraudDetected) {
  await attest(user.kinetikNodeId, 'fraud',
               `GPS spoof signature ${signature}`, -3);
}
```

---

## Methodology link

[`docs/methodology/GENESIS_SCORE.md`](../methodology/GENESIS_SCORE.md) — full scoring spec, including how attestations enter the score in v1.1.

Contact: `eric@outfromnothingllc.com`
