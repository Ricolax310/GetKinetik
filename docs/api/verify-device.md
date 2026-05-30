# GETKINETIK — `/api/verify-device` Partner Integration Spec

> **Endpoint:** `POST https://getkinetik.app/api/verify-device`
> **Version:** v2.0 (wire shape changed from v1.x — see migration notes at bottom)
> **Auth:** None required. Public endpoint.
> **Cost:** Free. Rate limit: 100 req/min per IP.

**GET (browser):** If you open the endpoint URL in a browser tab, you'll receive **200 JSON** with usage hints (`documentation: true`). That is **not** a verification outcome — verification always requires **POST** with `proofUrl`. For interactive checks, use the public verifier: `https://getkinetik.app/verify/`.

---

## What it does

Mints a **bureau-signed attestation** about a GETKINETIK Sovereign Node. The attestation is a cryptographically signed evidence bundle that you can verify offline using [`@getkinetik/verify`](https://npmjs.com/package/@getkinetik/verify) — no further calls to GETKINETIK required.

The bureau ships **evidence**, not verdicts. Mapping the evidence to a reward tier is **your policy**. The reference mapping is [`@getkinetik/evidence-mapping`](https://npmjs.com/package/@getkinetik/evidence-mapping); partners adopt it, fork it, or ignore it.

Typical partner use cases:

1. **Anti-Sybil validation** — confirm the device is real before paying rewards.
2. **Tiered rewards** — pay different rates based on the bureau's evidence.
3. **Fraud detection** — react to flag tokens (`chain_rewind`, `*_implausible`) on previously clean nodes.

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
  "pubkey": "<64-char hex device pubkey>",
  "schema": "proof-of-origin:v2",

  "attestation": {
    "payload": {
      "v": 1,
      "kind": "attestation",
      "attribution": "GETKINETIK by OutFromNothing LLC",
      "pubkey": "<64-char hex bureau pubkey>",
      "bureauTs": 1715581234567,
      "subject": {
        "chainTip": "a1b2c3d4e5f60718",
        "mintedAt": 1714000000000,
        "nodeId": "KINETIK-NODE-A3F2B719",
        "pubkey": "<64-char hex device pubkey>"
      },
      "bureauObserved": {
        "firstSeenMs": 1714000000000,
        "lastSeenMs":  1715581234567,
        "peakLifetimeBeats": 25847
      },
      "chainClaim": {
        "firstBeatTs": 1714000000000,
        "lifetimeBeats": 25847,
        "schema": "proof-of-origin:v2"
      },
      "sensorCoherence": {
        "luxObserved": true,
        "luxPlausible": true,
        "motionRmsObserved": true,
        "motionRmsPlausible": true,
        "pressureHpaObserved": true,
        "pressureHpaPlausible": true
      },
      "flags": [],
      "witnesses": []
    },
    "message":   "<canonical bytes that were signed>",
    "signature": "<128-char hex bureau Ed25519 signature>",
    "hash":      "<16-char hex sha256(message)[:16]>"
  },

  "derived": {
    "tier":          "STRONG",
    "score":         812,
    "flagged":       false,
    "flags":         [],
    "policyVersion": "v2.0.2",
    "contributingFactors": {
      "baseline":          200,
      "bureauObservedAge": 280,
      "lifetimeBeats":     232,
      "sensorCoherence":   200
    }
  },

  "asOf": "2026-05-13T03:00:00.000Z"
}
```

### Top-level identity fields

| Field | Type | Description |
|---|---|---|
| `valid` | boolean | `true` — the proof is cryptographically valid |
| `nodeId` | string | Stable node identifier. Use this as the user's GETKINETIK identity key in your system. |
| `pubkey` | string | Device's Ed25519 public key (64-char hex). |
| `schema` | string | The proof artifact schema, e.g. `"proof-of-origin:v2"`. |
| `asOf` | string | ISO-8601 timestamp when the attestation was minted. |

### `attestation` — THE AUTHORITATIVE OUTPUT

The bureau-signed evidence bundle. **This is what partners should integrate against.** It is a standard `SignedArtifact` shape and is verifiable offline with `@getkinetik/verify`:

```ts
import { verifyArtifact } from '@getkinetik/verify';

const report = await verifyArtifact(result.attestation);
// report.valid                 — every check passed
// report.kind === 'attestation'
// report.checks.bureauOk       — signed by the published BUREAU_PUBKEY
// report.checks.signatureOk    — Ed25519 signature verifies
// report.payload               — the AttestationPayload (typed)
```

The full attestation schema and flag semantics are in [`docs/methodology/ATTESTATION.md`](../methodology/ATTESTATION.md). The TL;DR:

- `payload.subject.*` — the device this attestation is about.
- `payload.bureauObserved.*` — temporal facts the bureau itself recorded. The node cannot lie about these.
- `payload.chainClaim.*` — what the node says about its chain. Bounded by `bureauObserved`.
- `payload.sensorCoherence.*` — boolean observations of the proof's sensor block (no raw values).
- `payload.flags[]` — tamper signals raised during processing. Empty array means no flags were raised; **NOT** a verdict of "this node is good."
- `payload.witnesses[]` — empty in v:1; reserved for phase C.

`attestation` is `null` when the bureau signing key is not configured on the deployment (dev / staging without secrets). Production deployments always sign.

### `derived` — convenience tier (DEFAULT_POLICY)

A convenience computation using the default policy from `@getkinetik/evidence-mapping`. Identical to running:

```ts
import { attestationToTier, DEFAULT_POLICY } from '@getkinetik/evidence-mapping';
const result = attestationToTier(attestation.payload, DEFAULT_POLICY);
```

Partners running custom policy SHOULD ignore `derived` and run their own mapping against `attestation.payload`. Partners adopting the default policy can read `derived.tier` directly.

| Field | Type | Description |
|---|---|---|
| `tier` | string | `"PREMIER"` / `"STRONG"` / `"STANDING"` / `"NEW"` / `"TAMPERED"` |
| `score` | number | 0–1000. Sortable; tier derived from it. |
| `flagged` | boolean | True if any flag was present. Forces tier to `TAMPERED`. |
| `flags` | string[] | The flag array from the attestation, passed through. |
| `policyVersion` | string | Pin this when caching — detects policy upgrades that would shift tiers. |
| `contributingFactors` | object | Audit breakdown — `baseline + bureauObservedAge + lifetimeBeats + sensorCoherence` = `score` (before flag floor). |

See [`docs/methodology/GENESIS_SCORE.md`](../methodology/GENESIS_SCORE.md) for the full scoring methodology, tier bands, and custom-policy guidance.

---

## Response — Invalid

```json
{ "valid": false, "reason": "signature_invalid" }
```

| `reason` | Meaning |
|---|---|
| `signature_invalid` | The Ed25519 signature on the proof does not verify. The proof was tampered with or fabricated. |
| `hash_mismatch` | The proof's hash field doesn't match `sha256(payload)[:16]`. Truncated or corrupted URL. |
| `attribution_mismatch` | The proof's attribution field was altered. |
| `invalid_url_format` | Could not parse a proof from the supplied URL. |
| `base64_decode_failed` | The base64url payload could not be decoded. |
| `json_parse_failed` | The decoded payload is not valid JSON. |
| `missing_fields` | Required fields (`payload`, `signature`) are absent. |
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

### Step 2 — You call `/api/verify-device`

```javascript
const response = await fetch('https://getkinetik.app/api/verify-device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ proofUrl: userSuppliedProofUrl }),
});

const result = await response.json();
if (!result.valid) {
  // result.reason tells you why
  return;
}
```

### Step 3 — Re-verify the attestation offline

```javascript
import { verifyArtifact, BUREAU_PUBKEY } from '@getkinetik/verify';

const report = await verifyArtifact(result.attestation);

if (!report.valid)              return reject('attestation_invalid');
if (!report.checks.bureauOk)    return reject('not_bureau_signed');
if (report.payload.subject.nodeId !== result.nodeId) return reject('subject_mismatch');
```

This step is **critical**. It is the property that makes you not dependent on GETKINETIK's infrastructure for the trust decision — you've now confirmed that the bureau's published key signed this exact set of bytes. If GETKINETIK's API ever returns a bogus response, your offline re-verification catches it.

### Step 4 — Apply your policy

Adopt the default policy:

```javascript
import { attestationToTier, DEFAULT_POLICY } from '@getkinetik/evidence-mapping';

const result4 = attestationToTier(report.payload, DEFAULT_POLICY);
// result4.tier === 'PREMIER' | 'STRONG' | 'STANDING' | 'NEW' | 'TAMPERED'
```

Or write your own policy:

```javascript
import { attestationToTier, DEFAULT_POLICY } from '@getkinetik/evidence-mapping';

const strictPolicy = {
  ...DEFAULT_POLICY,
  fullAgeCreditDays: 365,                  // we want a year of bureau-observed age
  tierBands: {
    ...DEFAULT_POLICY.tierBands,
    PREMIER: { min: 950 },                 // premium tier gated higher
  },
};

const result4 = attestationToTier(report.payload, strictPolicy);
```

### Step 5 — Make your reward decision

```javascript
switch (result4.tier) {
  case 'PREMIER':
  case 'STRONG':
    return payPremium(result.nodeId);
  case 'STANDING':
    return payStandard(result.nodeId);
  case 'NEW':
    return paySmallStarter(result.nodeId);
  case 'TAMPERED':
    return blockAndAlert(result.nodeId, result4.flags);
}
```

---

## Caching Recommendations

- **Cache the attestation** by `nodeId` and pin `attestation.payload.bureauTs` so you know when it was minted. Attestations don't expire cryptographically, but the underlying chain claims drift — re-verify periodically.
- **Re-verify on tier transitions.** The bureau fires `tier.changed` webhooks (with the new signed attestation embedded) if you register a receiver URL with us.
- **Pin `derived.policyVersion`** alongside any cached tier so you detect a policy upgrade that would shift tiers.
- **Don't cache `valid: false`.** A user may have regenerated their node.

---

## Related Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/score/:nodeId` | Look up the most recent cached attestation for a node, without supplying a fresh proof. Same `attestation` + `derived` shape as this endpoint. |
| `POST /api/attest` | Partner attestation channel — submit network-engagement / fault / fraud signals about a node. Bearer-authenticated. See [`docs/api/attest.md`](./attest.md). |

---

## Tier-change Webhooks

Register a receiver URL with GETKINETIK and you'll receive a signed POST whenever a node's `derived.tier` transitions:

```json
{
  "event": "tier.changed",
  "nodeId": "KINETIK-NODE-A3F2B719",
  "fromTier": "STANDING",
  "toTier":   "TAMPERED",
  "score":    199,
  "flags":    ["chain_rewind"],
  "policyVersion": "v2.0.2",
  "attestation": { /* full signed attestation */ },
  "asOf": "2026-05-13T13:34:22.674Z",
  "delivery": "<uuid>"
}
```

Headers include:

```
User-Agent: GETKINETIK-Bureau/2.0
X-GETKINETIK-Event:     tier.changed
X-GETKINETIK-Delivery:  <uuid>
X-GETKINETIK-Signature: sha256=<hex hmac of raw body>
```

The HMAC is computed using your shared `SCORE_WEBHOOK_SECRET`. The webhook embeds the signed attestation so receivers can re-verify offline against `BUREAU_PUBKEY` before trusting the tier change.

Delivery is best-effort: no retries, no queue. Webhook failures are logged and never affect the `/api/verify-device` response.

---

## Migration from v1.x

If you previously integrated against v1.x of this endpoint (`genesisScore` / `scoreBand` / `tamperFlags` at the top level), here's how the fields map:

| v1.x field | v2.0 equivalent |
|---|---|
| `genesisScore` | `derived.score` |
| `scoreBand` (`PREMIER` etc.) | `derived.tier` (same labels) |
| `tamperFlags` | `derived.flags` (and `attestation.payload.flags`) |
| `methodologyVersion` | `derived.policyVersion` |
| `lifetimeBeats` | `attestation.payload.chainClaim.lifetimeBeats` |
| `firstBeatTs` | `attestation.payload.chainClaim.firstBeatTs` |

The most important migration step is **not** the field renames — it's adding step 3 (offline re-verification of the signed attestation) and step 4 (running your own policy). Without those, you're trusting GETKINETIK's server unconditionally, which is the v1.x posture this endpoint moved away from in v2.

---

## Rate Limits

| Tier | Limit |
|---|---|
| Free (no key) | 100 req/min per IP |
| Partner (with API key — coming) | 1,000 req/min |

Contact `eric@outfromnothingllc.com` to get a partner API key.

---

## Testing

Use `scripts/mint-demo-proof.mjs` to generate a fresh test proof locally:

```bash
node scripts/mint-demo-proof.mjs
```

POST the resulting URL to `https://getkinetik.app/api/verify-device` and confirm:

1. `result.valid === true`
2. `result.attestation !== null`
3. `(await verifyArtifact(result.attestation)).checks.bureauOk === true`

If step 3 fails, the bureau signing key on the deployment is misconfigured (or you're testing against a deployment where the key hasn't been minted yet).
