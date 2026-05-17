# Genesis Score — Public Methodology v2

> *FICO-style: inputs and direction, plus the reference policy as
> open-source code. Partner networks, lenders, insurers, auditors,
> foundations, and graded operators read this document to understand
> how a node's reward tier is computed from a signed bureau attestation.*

**Version:** v2.0
**Effective from:** 2026-05
**Charter:** see [`NEUTRALITY.md`](../../NEUTRALITY.md) and [`PRIVACY.md`](../../PRIVACY.md). The methodology here lives downstream of those rules.

---

## What changed in v2

Genesis Score v2 separates **bureau evidence** from **partner policy**:

- The bureau emits a [**signed attestation**](./ATTESTATION.md) — a
  cryptographically signed bundle of observable facts about a node.
  The attestation contains no score, no tier, no verdict.
- This document describes the **reference policy** — the open-source
  mapping from a signed attestation to a reward tier
  (`PREMIER` / `STRONG` / `STANDING` / `NEW` / `TAMPERED`).
- The reference policy is implemented in
  [`@getkinetik/evidence-mapping`](https://npmjs.com/package/@getkinetik/evidence-mapping)
  as a pure function with zero runtime dependencies. Partners adopt
  it as-is, fork it, or write their own. The bureau ships evidence;
  networks ship policy.

The previous v1.x bureau-server-computed score band still exists as
the `derived` block in the `/api/verify-device` response, but it is
explicitly marked as a convenience computed using
[`DEFAULT_POLICY`](https://github.com/Ricolax310/GetKinetik/blob/main/packages/evidence-mapping/src/index.ts).
Partners doing real integration consume the signed `attestation` field
and run the mapping themselves.

---

## 1. What Genesis Score is

Genesis Score is a **reference reward-tier mapping** from a signed
GETKINETIK bureau attestation to one of five tiers. It is computed
client-side by anyone who holds a verified attestation:

```ts
import { verifyArtifact } from '@getkinetik/verify';
import { attestationToTier, DEFAULT_POLICY } from '@getkinetik/evidence-mapping';

const report = await verifyArtifact(signedAttestation);
if (!report.valid || !report.checks.bureauOk) return 'reject';

const result = attestationToTier(report.payload, DEFAULT_POLICY);
// result.tier === 'PREMIER' | 'STRONG' | 'STANDING' | 'NEW' | 'TAMPERED'
// result.score in [0, 1000]
// result.contributingFactors — audit breakdown
```

A partner running `DEFAULT_POLICY` against any attestation gets the
same result GETKINETIK's own dashboard displays. A partner running a
custom policy gets a tier reflecting *their* fraud tolerance, not
the bureau's.

## 2. What Genesis Score is not

- **Not a bureau output.** The bureau emits evidence, not tiers.
- **Not a token, point, or any financial wrapper.** Issuing one would
  violate `NEUTRALITY.md` Rule 1.
- **Not transferable.** A node cannot sell, gift, or assign its tier.
- **Not stakable.** No collateral function.
- **Not a credit score for the operator.** It grades the device, not
  the human behind it. See `PRIVACY.md` Rule 6.
- **Not a guarantee.** A high tier reduces the likelihood of certain
  failure modes; it does not eliminate them. Partners should treat
  it as one input alongside their own checks.

## 3. Inputs (direction)

The mapping reads four input categories plus a small set of hard
gates. **Inputs come from the signed bureau attestation** — partners
do not need to call any bureau endpoint at score time. Direction
indicates whether the input raises (▲) or lowers (▼) the score.

### 3.1 Identity integrity (gate)

| Signal | Direction |
|---|---|
| `@getkinetik/verify` reports `report.valid === true` on the attestation | **HARD GATE.** Failure → reject. |
| `report.checks.bureauOk === true` (signature is from the published `BUREAU_PUBKEY`) | **HARD GATE.** Failure → reject. |
| `payload.subject.nodeId` matches `KINETIK-NODE-` + first 8 hex chars of `sha256(payload.subject.pubkey)` | **HARD GATE.** Failure → reject. |

If any identity gate fails, the partner does not compute a tier — the
attestation is rejected wholesale.

### 3.2 Uptime continuity (`bureauObserved`)

| Signal | Direction |
|---|---|
| Long bureau-observed window (`lastSeenMs − firstSeenMs` large) | ▲ |
| High `peakLifetimeBeats` | ▲ |
| `chain_rewind` flag present (later attestation claims fewer beats than the bureau previously recorded) | **HARD GATE → TAMPERED.** |
| `beat_rate_implausible` flag present (claimed beats exceed 1 beat / 25 s over the bureau-observed window) | **HARD GATE → TAMPERED.** |

**Bureau-bounded age.** The mapping reads the bureau-observed window
directly from `payload.bureauObserved.firstSeenMs` and `lastSeenMs`.
These are bureau-clock facts, not node claims. A freshly minted
keypair cannot back-date itself: the bureau only records age it
observed.

### 3.3 Sensor coherence

| Signal | Direction |
|---|---|
| `sensorCoherence.*Observed && *Plausible` for each of lux / motionRms / pressureHpa | ▲ per field |
| Any of `lux_implausible`, `motion_implausible`, `pressure_implausible` flags present | ▼ — flag floors the tier to `TAMPERED` |
| All sensor fields unobserved (legacy device, no sensors at all) | neutral — 0 points but no penalty |

The attestation carries **booleans only** for sensor observations —
not raw values. This is a privacy property: a partner running the
mapping cannot fingerprint a device beyond the per-field plausibility.

### 3.4 Network engagement (future)

Reserved for v2.1+. Will be populated by the partner attestation
channel (`POST /api/attest`) feeding into the bureau's `flags`
computation. Until then, this category contributes 0 to the score.

### 3.5 Disclosure receipts (future)

Reserved for v2.1+. Requires L4 earnings ledger ingestion. Until then,
this category contributes 0.

### 3.6 Hard gates (summary)

| Cause | Outcome |
|---|---|
| Cryptographic verification fails (`!report.valid`) | Reject — no tier computed. |
| `bureauOk` fails (attestation signed by a non-bureau key) | Reject — likely forgery. |
| `chain_rewind` flag present | `flagged = true`, score floored to ≤199, tier = `TAMPERED`. |
| `beat_rate_implausible` flag present | Same as above. |
| Any `*_implausible` sensor flag | Same as above. |

A partner using a stricter custom policy may treat additional flag
tokens (e.g. `first_sighting`) as soft floors. The default policy
treats `first_sighting` as informational only.

---

## 4. Tier bands

Under `DEFAULT_POLICY`, the integer score (0–1000) maps to tiers as:

| Score | Tier | Interpretation |
|---|---|---|
| Any flag present | `TAMPERED` | Score floored to ≤199. Do not pay. |
| ≥ 900 | `PREMIER` | Long, continuous, sensor-coherent, multi-network attested. |
| ≥ 750 | `STRONG` | Long, continuous, sensor-coherent record. |
| ≥ 500 | `STANDING` | Sufficient evidence of real-device operation. |
| < 500 | `NEW` | New or recovering. Insufficient evidence to grade as high. |

These are **calibration anchors**, not a contract. The exact mapping
is in `@getkinetik/evidence-mapping`'s source code; partners reading
this document for behavior should treat that source as authoritative.

**For partners:** treat the score as a continuous signal in [0, 1000],
not as a categorical label. A v1 partner integration that wants a
binary "verified / not verified" gate should pick a threshold
appropriate to its own fraud cost (e.g. 500 for permissive, 750 for
strict, 900 for premium-tier).

---

## 5. Custom policy

A partner with a different fraud cost should write a custom policy:

```ts
import { attestationToTier, DEFAULT_POLICY, type EvidencePolicy } from '@getkinetik/evidence-mapping';

const strictPolicy: EvidencePolicy = {
  ...DEFAULT_POLICY,
  fullAgeCreditDays: 365,           // we want a year of observed age
  tierBands: {
    ...DEFAULT_POLICY.tierBands,
    PREMIER: { min: 950 },          // premium tier is gated higher
  },
};

const result = attestationToTier(report.payload, strictPolicy);
```

Custom policies are encouraged. The bureau is neutral with respect to
how a partner weights the evidence — that's the entire reason scoring
moved client-side.

---

## 6. Update cadence

- **Continuous** for cryptographic gates and identity checks. A
  failure is reflected in the next `/api/verify-device` response.
- **Sliding window** for uptime via `bureauObserved`. The window is
  bounded above by the node's total bureau-observed age and updated
  on every successful verify call. Partners that want stricter
  freshness should require a fresh proof (call `verify-device`)
  instead of trusting a cached attestation.
- **Per-attestation** for the rest. A partner calling `verify-device`
  with a fresh proof always gets a fresh attestation; a partner
  calling `GET /api/score/:nodeId` gets whatever the bureau last
  cached (≤ 30 days).
- A node's mapping result is **stable for a given attestation +
  policy pair**. Partners caching results should pin the
  `policyVersion` (returned in `EvidenceMappingResult`) so they
  detect a policy upgrade that would shift tiers.

---

## 7. Versioning, changes, and disputes

### Versioning

- This document versions independently from
  [`ATTESTATION.md`](./ATTESTATION.md) and from the
  `@getkinetik/evidence-mapping` package.
- A **patch version** is bumped for clarifications / examples.
- A **minor version** is bumped for adding a new input category,
  retiring a deprecated one, or changing a threshold band in §4.
  Public comment period: **14 days**.
- A **major version** is bumped for changing the direction of any
  input, changing the score range, or otherwise altering what the
  score *means*. Public comment period: **30 days**.
- Cached attestations remain valid forever — they are signed bureau
  facts, independent of any mapping policy. A partner running a new
  policy against an old attestation always gets a self-consistent
  result, just possibly a different tier than before.

### Changes

Methodology changes are committed as PRs to this file in the public
repository. Material changes (minor / major version bumps) require
the comment period above before taking effect on production.

### Disputes

A graded node operator who believes their tier is incorrect can file
a dispute by:

1. Signing a dispute artifact with their node's secret key.
2. Submitting it via the public dispute endpoint (path will be
   announced when the dispute API ships).
3. Receiving a signed bureau response with the result of the review
   and the methodology version under which it was reviewed.

The first dispute interface is open to all graded nodes regardless of
partner status. The bureau will publish anonymized dispute counts and
outcome categories in the annual transparency report
(per `NEUTRALITY.md`).

---

## 8. What the API returns

### `POST /api/verify-device` (v2.0)

```json
{
  "valid": true,
  "nodeId": "KINETIK-NODE-A3F2B719",
  "pubkey": "<64-char hex device pubkey>",
  "schema": "proof-of-origin:v2",

  "attestation": {
    "payload":   { "...AttestationPayload...": "..." },
    "message":   "<canonical bytes that were signed>",
    "signature": "<128-char hex bureau Ed25519>",
    "hash":      "<16-char hex sha256(message)[:16]>"
  },

  "derived": {
    "tier":             "STRONG",
    "score":            812,
    "flagged":          false,
    "flags":            [],
    "policyVersion":    "v2.0.0",
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

The `attestation` field is the authoritative bureau output. Partners
SHOULD:

1. Run `@getkinetik/verify` on `attestation` to confirm it's signed by
   the published `BUREAU_PUBKEY` (i.e. `report.checks.bureauOk === true`).
2. Run their own policy via `@getkinetik/evidence-mapping` on
   `attestation.payload` to compute their reward decision.

The `derived` block is a convenience — same math as
`DEFAULT_POLICY`. Partners that adopt the default policy can read
`derived.tier` directly and skip step 2.

See [`docs/api/verify-device.md`](../api/verify-device.md) for the
full wire spec.

### `GET /api/score/:nodeId` (v2.0)

Returns the most recent cached attestation + derived block for a node,
without requiring a fresh proof. The cached entry is the same shape
as the `attestation` and `derived` fields above. Returns 404 if the
bureau has never observed the node.

---

## 9. Why this document exists

The bureau is only credible if its grading is auditable. With v2, the
audit surface improved:

- **The bureau output is signed.** A partner running `@getkinetik/verify`
  against a cached attestation can confirm offline that the bureau
  said what it said.
- **The mapping is open source.** Any partner can read
  `@getkinetik/evidence-mapping` and confirm that
  `attestationToTier(attestation, DEFAULT_POLICY)` produces the same
  number the bureau's dashboard shows.
- **The policy is forkable.** A partner that disagrees with the
  reference policy ships their own; the bureau imposes nothing.

Closed scoring systems do not survive scrutiny; open ones do. We are
betting on the open one.

---

*OutFromNothing LLC (California) · GETKINETIK · Genesis Score Methodology · v2.0 · 2026-05*
