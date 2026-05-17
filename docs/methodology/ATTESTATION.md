# Bureau Attestation — Public Methodology v1

> *The bureau ships evidence about devices. Networks ship policy.
> Networks verify the work. The bureau verifies the worker.*

**Version:** v1.0
**Effective from:** 2026-05
**Charter:** see [`NEUTRALITY.md`](../../NEUTRALITY.md) and [`PRIVACY.md`](../../PRIVACY.md). The methodology here lives downstream of those rules.

This document specifies the **signed evidence bundle** the GETKINETIK
Genesis Bureau emits about every node it has observed. The previous
methodology [`GENESIS_SCORE.md`](./GENESIS_SCORE.md) defined a single
server-computed *score band* as the bureau's output; this methodology
replaces that output with a **bureau-signed attestation** containing
the same evidence in a verifiable, partner-runnable form.

---

## 1. What a bureau attestation is

A bureau attestation is an Ed25519-signed JSON payload — `kind: "attestation"`
— produced by the Genesis Bureau and verifiable offline by any partner
using [`@getkinetik/verify`](https://npmjs.com/package/@getkinetik/verify).
Each attestation reports the bureau's structured observations about a
single sovereign node:

- The node's identity and the device key that authored the verified
  proof that triggered the attestation.
- Temporal facts the bureau itself has observed — first-seen,
  last-seen, peak heartbeat count — that **the node cannot lie about**.
- The node's own chain claims (lifetime beats, claimed first-beat
  timestamp), bounded by the bureau's first-seen.
- Per-field sensor coherence as **booleans**, not raw values.
- A flat array of **flags** raised during processing.

The attestation does **not** include a score, a tier, or any verdict
on whether the node is good or bad. Mapping evidence to a reward tier
is the partner's job. The reference mapping ships separately as
[`@getkinetik/evidence-mapping`](https://npmjs.com/package/@getkinetik/evidence-mapping).

## 2. What a bureau attestation is not

- **Not a verdict.** An empty `flags` array means no flags were raised
  during processing — it is NOT a bureau endorsement that the node is
  good. A partner that needs a binary "trust / don't trust" gate must
  pick a threshold against the evidence using their own policy.
- **Not a credit score for the operator.** The attestation grades the
  device, not the human behind it. See `PRIVACY.md` Rule 6.
- **Not transferable.** An attestation is bound to a specific
  `subject.pubkey` and `subject.nodeId`. Re-using the signed bytes
  against a different node is detected by `bureauOk` and `subject`
  mismatch.
- **Not a financial instrument.** Issuing one as a token or
  point-with-value would violate `NEUTRALITY.md` Rule 1.
- **Not eternal.** Partners SHOULD treat attestations older than
  30 days as stale and call `POST /api/verify-device` with a fresh
  proof to obtain a current attestation.

## 3. Wire format

The signed envelope shape is identical to GETKINETIK's other artifact
kinds (proof-of-origin, heartbeat, earning) so the same `verifyArtifact`
function handles all of them:

```json
{
  "payload": { ...AttestationPayload... },
  "message": "<canonical bytes that were signed>",
  "signature": "<128-char hex Ed25519 signature>",
  "hash": "<16-char hex sha256(message)[:16]>"
}
```

### 3.1 AttestationPayload schema (v:1)

```ts
type AttestationPayload = {
  v: 1;
  kind: "attestation";
  attribution: "GETKINETIK by OutFromNothing LLC";

  // The bureau's pubkey. The signature verifies against this.
  pubkey: string;
  // Bureau clock when the attestation was minted.
  bureauTs: number;

  subject: {
    chainTip: string | null;     // 16-char hex or null
    mintedAt: number;            // device key birth (claimed)
    nodeId: string;              // KINETIK-NODE-XXXXXXXX
    pubkey: string;              // device pubkey, 64-char hex
  };

  // Facts the BUREAU saw. The node cannot lie about these.
  bureauObserved: {
    firstSeenMs: number;
    lastSeenMs: number;
    peakLifetimeBeats: number;
  };

  // Facts the NODE claimed. Bounded by bureauObserved.
  chainClaim: {
    firstBeatTs: number | null;
    lifetimeBeats: number;
    schema: string;              // e.g. "proof-of-origin:v2"
  };

  // Boolean sensor observations. No raw values.
  sensorCoherence: {
    luxObserved: boolean;
    luxPlausible: boolean | null;
    motionRmsObserved: boolean;
    motionRmsPlausible: boolean | null;
    pressureHpaObserved: boolean;
    pressureHpaPlausible: boolean | null;
  };

  // Flags raised during processing.
  flags: string[];

  // Witness counter-signatures. Empty in v:1; reserved for phase C.
  witnesses: Array<{
    nodeId: string;
    pubkey: string;
    signature: string;
    ts: number;
  }>;
};
```

### 3.2 The two pubkeys

Every attestation references two distinct Ed25519 public keys:

| Field | Whose key | Used by `@getkinetik/verify` for |
|---|---|---|
| `payload.pubkey` | **Bureau** | Signature verify + `bureauOk` (must equal published `BUREAU_PUBKEY` constant) |
| `payload.subject.pubkey` | **Device** | Cross-reference against the proof that triggered the attestation |

A partner that re-verifies an attestation against the published
`BUREAU_PUBKEY` and finds a mismatch should treat the artifact as a
**forgery**, regardless of whether the signature itself is
cryptographically valid.

### 3.3 Canonical serialization

The payload is signed over `stableStringify(payload)` — the same
shallow lex-sorted serializer used for every other signed artifact in
the GETKINETIK system. Nested objects (`subject`, `bureauObserved`,
`chainClaim`, `sensorCoherence`) are constructed with keys inserted in
lexicographic order so `JSON.stringify` produces byte-stable output.
Arrays (`flags`, `witnesses`) are sorted before signing
(`flags` lex-ascending and deduped, `witnesses` by `ts` then `nodeId`).

If any of those normalizations diverges between the bureau signer and
the verifier package, attestations will silently fail to verify. The
contract is enforced by the byte-for-byte parity comment in both
`packages/kinetik-core/src/attestation.ts` and
`functions/api/_lib/bureauSign.js`.

---

## 4. Flag tokens

The `flags` array is **open-ended** — partners must tolerate unknown
tokens. The following are documented and may appear in v:1 attestations.

| Token | Cause | Direction |
|---|---|---|
| `chain_rewind` | Claimed `lifetimeBeats` is below the bureau's previously-recorded peak for this node. Hard tamper signal. | Tampered |
| `beat_rate_implausible` | Claimed `lifetimeBeats` exceeds what could accrue at 1 beat / 25 s over the bureau-observed window. | Tampered |
| `lux_implausible` | `sensors.lux` outside `[0, 200000]`. | Tampered |
| `motion_implausible` | `sensors.motionRms` outside `[0, 50]`. | Tampered |
| `pressure_implausible` | `sensors.pressureHpa` outside `[800, 1100]`. | Tampered |
| `first_sighting` | Bureau has no prior record of this node. **Not** a tamper flag — informational signal that the partner may want a cooldown for. | Informational |

The reference policy treats any tamper flag (`chain_rewind` and below)
as a hard floor on the tier (`TAMPERED`). The `first_sighting` flag is
treated specially by `@getkinetik/evidence-mapping`: it is counted as
a flag for `EvidenceMappingResult.flagged` only if a partner's custom
policy chooses to. The default policy treats it as informational and
does NOT floor the score.

Note: even when `first_sighting` is informational under the default
policy, the *attestation itself* carries it in `flags[]` — it is the
partner's mapping that decides whether to act on it. This means
partners running a stricter custom policy (`flagged: true` whenever
`flags.length > 0`) will see brand-new nodes as `TAMPERED` and should
adjust their threshold accordingly.

New flag tokens may be added in any minor version without a schema
bump. Removing or changing the meaning of an existing flag is a
**major version** change with a comment period (see §6).

---

## 5. How an attestation is produced

The bureau service runs the following pipeline on every
`POST /api/verify-device` request, per
[`docs/api/verify-device.md`](../api/verify-device.md):

1. **Verify the proof cryptographically.** Ed25519 signature against
   the proof's claimed pubkey, `PROOF_ATTRIBUTION` intact, hash
   matches. A failure here means no attestation is minted and the
   response is `{ valid: false, reason: ... }`.
2. **Load bureau context** for the node from KV — `firstSeenMs`,
   `peakLifetimeBeats`, `lastSeenMs`.
3. **Compute flags.** Compare the proof's claims against the bureau
   context and the documented physical ranges. `chain_rewind` is set
   when claimed `lifetimeBeats` is below the recorded peak;
   `beat_rate_implausible` when the claimed count exceeds the
   physical ceiling over the bureau-observed window; sensor flags
   when values sit outside their range; `first_sighting` when no
   prior context exists.
4. **Update bureau context** — record the higher of the previous
   peak and the new claim, advance `lastSeenMs`, set `firstSeenMs`
   on first sighting.
5. **Build the attestation payload** with the canonical sub-blocks
   (see §3.3).
6. **Sign with the bureau key** loaded from
   `BUREAU_SIGNING_KEY_HEX` (env). Compute the 16-char chain-tip
   hash.
7. **Cache** the signed attestation under `attestation:<nodeId>`
   for `GET /api/score/:nodeId` reads.
8. **Fire `tier.changed` webhooks** to any partner-configured
   receiver URLs, embedding the signed attestation in the payload
   so receivers can re-verify offline.

Step 6 fails silently if `BUREAU_SIGNING_KEY_HEX` is not configured;
in that case the response contains `attestation: null` and the
`derived` block is also `null`. Production deployments are expected
to always have the bureau key configured.

---

## 6. Versioning, changes, and disputes

### Schema versioning

The `v` field is the **attestation schema version**, not the
methodology version. Schema changes affect bytes; methodology
changes affect interpretation.

- **v:1** — initial. Documented above.
- A new field within an existing sub-block is a minor-version
  schema change requiring no `v` bump (verifiers ignore unknown
  fields).
- A new top-level field IS a `v` bump.
- Removing a field, changing its type, or changing a value's
  meaning is always a `v` bump with a comment period.

### Methodology versioning

This document (the spec) versions independently:

- **Patch version** for clarifications and worked examples.
- **Minor version** for adding a new flag token, retiring one, or
  adjusting documented physical ranges. Public comment period: 14
  days from the date a change PR is opened.
- **Major version** for changing the meaning of an existing flag,
  changing how `bureauObserved` is bounded, or changing how the
  attestation is constructed in a way that could shift a partner's
  mapping result. Public comment period: 30 days.

Old attestations remain verifiable forever — verification is a pure
function of the signed bytes plus the bureau pubkey, neither of
which depends on the methodology version. A partner mapping cached
attestations against a new policy should pin the policy version
they used per result (see `EvidenceMappingResult.policyVersion`).

### Disputes

A graded node operator who believes their attestation is incorrect
files a dispute as described in `GENESIS_SCORE.md` §6. The dispute
flow is unchanged by the v2 transition.

---

## 7. Relationship to Genesis Score

`docs/methodology/GENESIS_SCORE.md` is now the **client-side scoring
methodology** — it describes how the reference policy in
`@getkinetik/evidence-mapping` maps a signed attestation to a tier
(`PREMIER` / `STRONG` / `STANDING` / `NEW` / `TAMPERED`). It does NOT
describe what the bureau itself outputs.

This document (ATTESTATION.md) is the **bureau-side methodology** —
what the bureau signs, why those fields are present, and what flag
tokens mean.

Direction of trust:

```
  Device  ──signed proof──▶  Bureau  ──signed attestation──▶  Partner
                                                                  │
                                                                  ▼
                                                      Partner policy
                                                  (e.g. evidence-mapping
                                                   DEFAULT_POLICY, or
                                                   the partner's own)
                                                                  │
                                                                  ▼
                                                          Reward decision
```

The bureau cannot mint attestations except in response to a
cryptographically valid proof. Partners cannot trust attestations
they don't recognize as signed by the published `BUREAU_PUBKEY`.
Partners' reward decisions are visible to no one in the bureau loop —
the bureau does not learn how a partner used an attestation.

---

## 8. What this document does *not* do

- It does not specify partner-side policy. Two partners running
  identical attestations through different `EvidencePolicy`
  configurations get different tiers, and that is intentional.
- It does not list the partner attestation channel
  (`POST /api/attest`). That endpoint feeds *into* the bureau's
  flag computation in a future minor version; it is documented in
  [`docs/api/attest.md`](../api/attest.md).
- It does not describe HSM / KMS migration of the bureau signing
  key. The signer contract — `{ pubkeyHex, sign(message) → hex }` —
  is implementation-agnostic; phase 2 ships a sign-only KMS adapter
  satisfying the same interface.

---

*OutFromNothing LLC (California) · GETKINETIK · Bureau Attestation Methodology · v1.0 · 2026-05*
