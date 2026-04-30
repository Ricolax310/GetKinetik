# GETKINETIK — `/api/verify-device` Partner Integration Spec

> **Endpoint:** `POST https://getkinetik.app/api/verify-device`
> **Auth:** None required. Public endpoint.
> **Cost:** Free. Rate limit: 100 req/min per IP.

---

## What It Does

Confirms that a GETKINETIK Sovereign Node has a valid, hardware-attested Ed25519 identity. Partners call this to:

1. **Anti-Sybil validation** — confirm the device is real before paying rewards.
2. **Premium gating** — only pay the verified-user premium to attested nodes.
3. **Fraud detection** — flag users who fail verification after previously passing.

The verification is purely cryptographic — no GETKINETIK account, no OAuth, no API key. If the signature checks out, the node is real.

---

## Request

```http
POST /api/verify-device
Content-Type: application/json

{
  "proofUrl": "https://getkinetik.app/verify/#proof=eyJ2IjoyLCJraW5kIjoicHJvb2YtY..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `proofUrl` | string | ✓ | The full verifier URL or just the base64url proof fragment. Both are accepted. |

The `proofUrl` is what the GETKINETIK app generates when the user taps **Share Proof**. Users share it with your platform as part of the onboarding flow.

---

## Response — Verified

```json
{
  "valid": true,
  "nodeId": "KINETIK-NODE-A3F2B719",
  "pubkey": "a3f2b719c8e4d6f1...(64-char hex)",
  "mintedAt": 1714000000000,
  "schema": "proof-of-origin:v2",
  "attribution": "GETKINETIK by OutFromNothing LLC"
}
```

| Field | Type | Description |
|---|---|---|
| `valid` | boolean | `true` — the proof is cryptographically valid |
| `nodeId` | string | Stable node identifier. Use this as the user's GETKINETIK identity key in your system. |
| `pubkey` | string | Ed25519 public key (64-char hex). Cache this — it never changes for a given node. |
| `mintedAt` | number | Unix ms when the Proof of Origin was minted. |
| `schema` | string | Proof schema version. |
| `attribution` | string | Always `"GETKINETIK by OutFromNothing LLC"`. |

---

## Response — Invalid

```json
{ "valid": false, "reason": "signature_invalid" }
```

| `reason` | Meaning |
|---|---|
| `signature_invalid` | The Ed25519 signature does not verify against the payload. The proof was tampered with or fabricated. |
| `hash_mismatch` | The proof's hash field doesn't match `sha256(payload)[:16]`. Truncated or corrupted URL. |
| `attribution_mismatch` | The attribution field was altered. |
| `invalid_url_format` | Could not parse a proof from the supplied URL. |
| `base64_decode_failed` | The base64url payload could not be decoded. |
| `json_parse_failed` | The decoded payload is not valid JSON. |
| `missing_fields` | Required fields (`payload`, `signature`, `hash`) are absent. |
| `invalid_pubkey` | The pubkey field is malformed. |
| `crypto_unavailable` | Server-side Ed25519 crypto unavailable (rare, transient). Retry. |
| `internal_error` | Unexpected server error. Retry. |

---

## Error Responses

```json
{ "error": "proofUrl is required." }   // HTTP 400
{ "error": "Method not allowed." }     // HTTP 405
```

---

## Integration Pattern

### Step 1 — User shares their proof

In your onboarding flow, add a step: "Connect your GETKINETIK node." Show the user a button or link that opens the GETKINETIK app (via deep link `getkinetik://share-proof`) and ask them to share their Proof of Origin URL.

The app's **Share Proof** button copies/shares a URL like:
```
https://getkinetik.app/verify/#proof=eyJ2IjoyLCJr...
```

### Step 2 — You verify

```javascript
const response = await fetch('https://getkinetik.app/api/verify-device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ proofUrl: userSuppliedProofUrl }),
});

const result = await response.json();

if (result.valid) {
  // Store result.nodeId as the user's GETKINETIK identity
  // Optionally: store result.pubkey for future re-verification
  // Unlock verified-user premium tier
} else {
  // result.reason tells you why it failed
  // Show user: "Proof invalid — please regenerate in the GETKINETIK app"
}
```

### Step 3 — Pay the premium (optional)

If you've agreed to the verified-user premium programme:

- Standard users earn your normal rate.
- Verified GETKINETIK nodes earn standard rate + premium (e.g. +15%).
- The user's GETKINETIK app signs the premium into their receipt — both sides of the transaction are auditable.

Contact `eric@outfromnothingllc.com` to discuss the premium programme.

---

## Caching Recommendations

- **Cache the result for 24 hours** per `nodeId`. Proofs don't expire but we recommend periodic re-verification.
- **Re-verify on suspicious activity** — if you detect anomalous behaviour from a previously-verified node, re-verify the latest proof.
- **Never cache `valid: false`** — a user may have regenerated their node since the last check.

---

## Rate Limits

| Tier | Limit |
|---|---|
| Free (no key) | 100 req/min per IP |
| Partner (with API key — coming v1.5) | 1,000 req/min |

Contact `eric@outfromnothingllc.com` to get a partner API key and higher rate limits.

---

## Proof Freshness

A proof is a snapshot of the node's state at `mintedAt`. There is no built-in expiry. However:

- Proofs older than **30 days** should prompt re-verification.
- The `mintedAt` field lets you enforce your own freshness policy.
- In v1.5, proofs will include a `lifetimeBeats` count — you can reject proofs from nodes with fewer than N heartbeats (e.g. `lifetimeBeats < 1440` = node is less than 24h old).

---

## Testing

Use this demo proof URL for integration testing (minted from a test node):

```
https://getkinetik.app/verify/#proof=<live-demo-proof>
```

Run `node scripts/mint-demo-proof.mjs` to generate a fresh test proof locally.
