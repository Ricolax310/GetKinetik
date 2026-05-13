# @getkinetik/evidence-mapping

> Reference policy for mapping a **GETKINETIK bureau attestation** (signed
> evidence about a sovereign node) to a **reward tier**. Pure function.
> Zero runtime dependencies. Networks adopt, fork, or ignore.

GETKINETIK is the [independent trust layer for the decentralized physical
economy](https://getkinetik.app). The bureau signs **evidence about
devices** — chain continuity, bureau-observed temporal facts, sensor
coherence, tamper flags. The bureau **does not** issue verdicts.

This package is the reference policy: how that signed evidence maps to a
reward tier (`PREMIER` / `STRONG` / `STANDING` / `NEW` / `TAMPERED`).
A partner network can:

1. **Adopt it as-is** — `import { attestationToTier } from '@getkinetik/evidence-mapping'`.
2. **Fork it** — copy the function and tune the policy for your fraud cost.
3. **Ignore it** — the signed attestation alone is sufficient input;
   write your own scoring against the same evidence.

The bureau ships evidence. You ship policy. That's the contract.

---

## Why is this not part of `@getkinetik/verify`?

Because verification and scoring are different concerns. `@getkinetik/verify`
proves that a signed bureau attestation is cryptographically authentic.
`@getkinetik/evidence-mapping` turns authentic evidence into a tier label.

Splitting them is the positioning made structural: a partner that runs
`npm install @getkinetik/verify` gets zero scoring code, zero policy
knobs, zero opinions about reward tiers. Just the math that confirms
the bureau actually signed what's in front of them. The scoring is a
separate, optional dependency.

---

## Install

```bash
npm install @getkinetik/evidence-mapping
```

No peer dependencies. Works in Node ≥ 18, modern browsers, and edge workers.

---

## Quick start

```ts
import { verifyArtifact } from '@getkinetik/verify';
import { attestationToTier, DEFAULT_POLICY } from '@getkinetik/evidence-mapping';

// 1) Confirm the attestation is real (bureau signed, bytes intact).
const report = await verifyArtifact(signedAttestation);
if (!report.valid || report.kind !== 'attestation') {
  return 'reject';
}
if (!report.checks.bureauOk) {
  // Cryptographic signature is valid, but the signing key isn't the
  // published GETKINETIK bureau key — treat as forgery.
  return 'reject';
}

// 2) Map the evidence to a tier.
const result = attestationToTier(report.payload, DEFAULT_POLICY);

console.log(result.tier);              // 'PREMIER' | 'STRONG' | 'STANDING' | 'NEW' | 'TAMPERED'
console.log(result.score);             // 0–1000
console.log(result.contributingFactors); // audit breakdown
console.log(result.flags);             // ['chain_rewind'] | ['lux_implausible'] | ...
```

The function is **pure**: same input → same output. There is no clock,
no network call, no hidden state. Two partners running the same policy
against the same attestation get identical results.

---

## Custom policy

`DEFAULT_POLICY` mirrors the live GETKINETIK methodology so any partner
adopting it sees scores byte-for-byte identical to what the bureau
dashboard shows. To tune, build your own policy object:

```ts
import { attestationToTier, DEFAULT_POLICY, type EvidencePolicy } from '@getkinetik/evidence-mapping';

const strictPolicy: EvidencePolicy = {
  ...DEFAULT_POLICY,
  // We pay full rewards only to nodes with at least a year of bureau-observed
  // continuous operation. Our fraud cost is high.
  fullAgeCreditDays: 365,
  // Anything below PREMIER doesn't qualify for our premium tier.
  tierBands: {
    ...DEFAULT_POLICY.tierBands,
    PREMIER: { min: 950 },
  },
};

const result = attestationToTier(report.payload, strictPolicy);
```

If your fraud cost is lower (e.g. internal-only telemetry), bias the
other way: lower the PREMIER threshold and shorten `fullAgeCreditDays`.

---

## What's in the attestation, and what isn't

The bureau's signed attestation carries these inputs to the mapping:

- `subject` — the device's identity (nodeId, pubkey, mintedAt, chainTip).
- `bureauObserved` — first-seen / last-seen / peak-beats from the bureau's
  durable memory of this node. **Bounded by the bureau's clock**, not the
  node's claim — a fresh keypair cannot back-date itself.
- `chainClaim` — the node's own claim about its chain (`lifetimeBeats`,
  `firstBeatTs`, schema). Trusted only because the bureau has already
  rate-checked it; an implausible rate raises a flag instead.
- `sensorCoherence` — boolean observations from the proof's sensor block
  (`luxObserved`, `luxPlausible`, etc.).
- `flags` — tamper signals raised during processing. Empty array means
  **no flags raised** — NOT a verdict of "this node is good."

The attestation deliberately does **NOT** carry:

- A score or tier label. That's this package's job.
- Raw sensor values. The bureau commits to booleans (`luxPlausible`),
  not numbers, so partners cannot side-channel a fingerprint out of
  the attestation.
- Anything about the *work* the device performed for a partner network.
  That's the partner's domain. *"Networks verify the work. The bureau
  verifies the worker."*

---

## API

### `attestationToTier(attestation, policy?) → EvidenceMappingResult`

Pure function. Maps a bureau attestation to a reward tier.

| Param | Type | Description |
|---|---|---|
| `attestation` | `AttestationLike` | Output of `verifyArtifact(...).payload` when `kind === 'attestation'`. |
| `policy` | `EvidencePolicy` | Optional. Defaults to `DEFAULT_POLICY`. |

Returns:

```ts
type EvidenceMappingResult = {
  tier: 'PREMIER' | 'STRONG' | 'STANDING' | 'NEW' | 'TAMPERED';
  score: number;            // 0–1000
  flagged: boolean;
  contributingFactors: {
    baseline: number;
    bureauObservedAge: number;
    lifetimeBeats: number;
    sensorCoherence: number;
  };
  flags: string[];
  policyVersion: string;
};
```

### `DEFAULT_POLICY: EvidencePolicy`

The reference policy. Mirrors the live GETKINETIK methodology.

### `POLICY_VERSION: string`

The version of this package's scoring logic. Pin alongside cached
results so you can detect a policy upgrade that would shift tiers.

---

## Versioning

- **Patch version** bumps for non-scoring changes (docs, types).
- **Minor version** bumps for new policy knobs or new tiers (purely additive).
- **Major version** bumps for any change that could shift an existing
  node's tier under `DEFAULT_POLICY`.

If a partner cares about long-term stability of their scoring, the
right pattern is to pin a specific version of this package and own
their policy upgrade cadence — same way they'd pin any SDK.

---

## License

MIT — see [`LICENSE`](./LICENSE).

---

*GETKINETIK by OutFromNothing LLC*
