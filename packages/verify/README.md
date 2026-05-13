# @getkinetik/verify

> Independent, dependency-free verifier for **GETKINETIK** signed artifacts —
> Proof of Origin, signed heartbeats, and signed earnings.
>
> **Same byte-for-byte cryptographic contract** as the public verifier at
> [`getkinetik.app/verify/`](https://getkinetik.app/verify/). No network
> calls. No hidden state. Pure function of input.

GETKINETIK is the [independent trust layer for the decentralized physical
economy](https://getkinetik.app) — a neutral, hardware-attested record of
node identity, uptime, and earnings across DePIN networks. We sign every
artifact with an Ed25519 keypair sealed in the device's secure enclave.
This package is the verifier: anyone, anywhere, can confirm that a
Sovereign Node artifact is real without ever calling our servers.

> **Why a separate package?** Because trust requires an independent
> implementation path. Calling our `verify-device` webhook is convenient,
> but it's still trusting our infrastructure. Importing `@getkinetik/verify`
> into your own backend or browser bundle gives you a verification path
> that depends only on math.

---

## Install

```bash
npm install @getkinetik/verify
```

Peer-light: depends only on
[`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519) and
[`@noble/hashes`](https://github.com/paulmillr/noble-hashes) — the same
audited, vendored crypto used by the GETKINETIK app and the public
verifier. **No network calls, no DOM dependency, no telemetry.** Works
in Node ≥ 18, modern browsers, and edge workers.

---

## Quick start

```ts
import { verifyArtifact, decodeProofUrl } from '@getkinetik/verify';

// 1) Verify an artifact you already have as JSON.
const report = await verifyArtifact({
  payload:   { /* the signed payload */ },
  signature: '/* 128-char hex */',
  message:   '/* optional, recomputed if absent */',
  hash:      '/* optional, recomputed if absent */',
});

if (report.valid) {
  console.log(`Verified ${report.kind} from ${report.payload.nodeId}`);
} else {
  console.log('Verification failed:');
  console.log(report.checks);
}

// 2) Or decode a verifier URL (QR / shared link) and verify in one step.
const url = 'https://getkinetik.app/verify/#proof=<base64url>';
const artifact = decodeProofUrl(url);
const report2  = await verifyArtifact(artifact);
console.log(report2.valid);
```

The verifier accepts both the **FULL** form
(`{ payload, message, signature, hash }`) and the **COMPACT** form
(`{ payload, signature }`). Compact form is what QR codes carry, since
`message` and `hash` are derivable from `payload` byte-for-byte via
`stableStringify`.

---

## What gets checked

For every artifact, `verifyArtifact` runs five independent checks and
returns a structured report. None of them throw — failures are reflected
in `report.checks.*` and the aggregate `report.valid` boolean.

| Check | Meaning |
|-------|---------|
| `canonicalMatches` | `stableStringify(payload)` byte-equals the claimed `message` (or canonical, in compact form) |
| `hashMatches` | `sha256(canonicalMessage)[:16]` byte-equals the claimed `hash` |
| `attributionOk` | `payload.attribution === "GETKINETIK by OutFromNothing LLC"` (proof-of-origin, earning, and attestation only; `null` for heartbeats) |
| `feeIntegrityOk` | The signed earning's `fee` is exactly 1% of `gross` and `net = gross - fee` (earnings only; `null` otherwise) |
| `bureauOk` | `payload.pubkey === BUREAU_PUBKEY` — confirms the attestation was signed by the published Genesis Bureau key (attestation only; `null` otherwise) |
| `signatureOk` | Ed25519 signature verifies against the canonical message + `payload.pubkey` |

A `valid: true` report means **every applicable check passed**. The
aggregate flag is intentionally strict — caller code should not have
to inspect individual booleans for the success path.

For non-success cases, `report.checks` exposes everything the verifier
saw, including the canonical message it computed, the hash it computed,
and the exact failure mode. That's enough to debug a real failure
without re-running any crypto.

---

## API

### `verifyArtifact(raw: SignedArtifact): Promise<VerifyReport>`

The main entry point. Throws on **structurally invalid** input only
(missing payload, malformed signature hex, malformed pubkey hex).
Otherwise always resolves with a `VerifyReport`.

### `decodeProofUrl(url: string): SignedArtifact`

Parses a `https://getkinetik.app/verify/#proof=<base64url>` URL and
returns the embedded `{ payload, signature }` object — ready to pass
into `verifyArtifact`.

Defensive against the most common URL-corruption modes (truncated
ellipsis, line-wrap whitespace, missing padding).

### `stableStringify(obj): string`

The exact serializer the GETKINETIK app uses to build the byte
sequence that gets signed. Lex-sorted top-level keys, JSON.stringify
for values. Useful if you want to mint your own test fixtures or
re-derive the canonical form for inspection.

### `PROOF_ATTRIBUTION: string`

The attribution constant baked into every Proof of Origin and signed
earning payload. Altering or removing it invalidates the signature
(by definition — it's part of the signed bytes). Exposed so callers
can pin it independently if they want.

### `PROTOCOL_FEE_RATE: number`

`0.01`. The 1% disclosure fee baked into every signed earning. Used
internally by the `feeIntegrityOk` check.

### `BUREAU_PUBKEY: string`

The published 64-char hex Ed25519 public key of the Genesis Bureau.
Every signed attestation must verify against this exact pubkey for
`report.checks.bureauOk` to pass. A cryptographically valid signature
under a different key still fails `bureauOk` — that's the property
that catches forged "GETKINETIK bureau" attestations signed by
someone else's key.

Until the bureau key ceremony has been performed, this constant is
64 zero hex chars (a placeholder). The placeholder fails `bureauOk`
for every attestation, which is the safe default: partners who
integrate against attestations should reject anything that doesn't
pass `bureauOk` before the ceremony is complete.

### `VERSION: string`

The package version. Stays in lockstep with the cryptographic
contract — bumped whenever any of `stableStringify`, the SHA-256
truncation rule, the signature scheme, `PROOF_ATTRIBUTION`, or
`BUREAU_PUBKEY` changes.

---

## Types

```ts
type SignedArtifact = {
  payload: Record<string, unknown>;
  signature: string;
  message?: string;
  hash?: string;
};

type ArtifactKind =
  | 'proof-of-origin'  // signed by device key
  | 'heartbeat'        // signed by device key
  | 'earning'          // signed by device key
  | 'attestation'      // signed by BUREAU key; bureauOk check applies
  | 'unknown';

type VerifyChecks = {
  canonicalMatches: boolean;
  hashMatches: boolean;
  attributionOk: boolean | null;     // null = N/A for this kind
  bureauOk: boolean | null;          // null = N/A; attestation kind only
  feeIntegrityOk: boolean | null;    // null = N/A for non-earning kinds
  signatureOk: boolean;
  signatureError: string | null;
};

type VerifyReport = {
  valid: boolean;
  kind: ArtifactKind;
  payload: Record<string, unknown>;
  signature: string;
  canonicalMessage: string;
  canonicalHash: string;
  canonicalHashFull: string;
  claimedMessage: string;
  claimedHash: string;
  checks: VerifyChecks;
};
```

---

## Cryptographic contract — drift policy

The five constants below define the contract this package implements.
**Drift between this package and the GETKINETIK app, the
`functions/api/verify-device.js` worker, or the public verifier at
`landing/verify/verifier.js` is a release-blocking bug.**

1. `stableStringify` shape (shallow lex-sorted keys, `JSON.stringify`
   for values).
2. `sha256(message)[:16]` truncation for the embedded `hash` (chain
   tip).
3. Ed25519 signing with SHA-512 over UTF-8 bytes of the canonical
   message.
4. `PROOF_ATTRIBUTION` constant string.
5. `BUREAU_PUBKEY` — the published 64-char hex pubkey of the Genesis
   Bureau. Rotating it requires republishing this package; partners
   detect a rotation via `bureauOk` returning false on every old
   attestation. See `docs/methodology/ATTESTATION.md` §6 for the
   rotation procedure.

The `VERSION` constant is bumped on any change to the five constants,
in lockstep with `landing/verify/verifier.js`'s `__kinetikVerifier.version`
and `packages/kinetik-core/`'s schema.

## Companion package — `@getkinetik/evidence-mapping`

This package verifies that a bureau attestation is authentic. It does
NOT compute a reward tier or score from it. That mapping is
deliberately separate, shipped as
[`@getkinetik/evidence-mapping`](https://npmjs.com/package/@getkinetik/evidence-mapping):

```ts
import { verifyArtifact } from '@getkinetik/verify';
import { attestationToTier, DEFAULT_POLICY } from '@getkinetik/evidence-mapping';

const report = await verifyArtifact(rawAttestation);
if (!report.valid || !report.checks.bureauOk) return 'reject';

// Default policy — same math GETKINETIK runs on its own dashboard.
const result = attestationToTier(report.payload, DEFAULT_POLICY);
console.log(result.tier);   // 'PREMIER' | 'STRONG' | 'STANDING' | 'NEW' | 'TAMPERED'
```

The split is the positioning made structural: a partner running
`npm install @getkinetik/verify` gets zero policy code, zero tier
logic, zero opinions about reward decisions. The bureau ships
evidence; networks ship policy.

---

## Use cases

- **Partner networks** — confirm a contributor's device is real
  hardware before applying **their own** payout policy (premium tiers,
  weighting, fraud screening — attestation is input; payouts remain theirs).
- **Lenders / underwriters** — confirm a hardware-loan applicant's
  node has a continuous signed uptime record before approving an
  advance against future earnings.
- **Auditors / foundations** — independently verify the network
  health a DePIN foundation reports without trusting their
  internal dashboard.
- **Exchanges** — pre-listing diligence on a DePIN token by
  spot-checking that the operator base is real.
- **Operators** — verify their own artifacts offline as a health
  check.

For the full bureau pitch and partner integration model, see
[`getkinetik.app`](https://getkinetik.app) and the [neutrality
charter](https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md).

---

## Building

```bash
npm install
npm run build      # tsc → dist/
node smoketest.mjs # 10 named test sections, exit 0 = pass
```

---

## License

MIT. Use it, ship it, audit it. The verifier is intentionally
permissive — neutrality demands that anyone can independently verify
our claims.

The GETKINETIK app, the bureau service, and the methodology are
governed separately by the [neutrality
charter](https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md)
and [privacy
charter](https://github.com/Ricolax310/GetKinetik/blob/main/PRIVACY.md).
This package implements only the verification surface, which is
reproducible from public information by design.

---

*OutFromNothing LLC · GETKINETIK · independent trust layer for DePIN.*
