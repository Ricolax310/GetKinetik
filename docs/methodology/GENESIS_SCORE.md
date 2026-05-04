# Genesis Score — Public Methodology v1

> *FICO-style: inputs and direction, not the proprietary weights. This
> document is the public spec partner networks, lenders, insurers,
> auditors, foundations, and graded operators read to understand how
> their score is computed.*

**Version:** v1.0
**Effective from:** 2026-05
**Charter:** see [`NEUTRALITY.md`](../../NEUTRALITY.md) and [`PRIVACY.md`](../../PRIVACY.md). The methodology here lives downstream of those rules.

---

## 1. What Genesis Score is

Genesis Score is a **public reputation grade about a single sovereign
node** — a specific Ed25519 keypair sealed inside a specific physical
device. It is the bureau's standing estimate of whether that node is
real hardware, has been running honestly, and is producing a
verifiable record of its conduct.

Concretely, the score is a number reported via the partner
`verify-device` API alongside the cryptographic claims (validity,
device age, heartbeat count, chain tip). Partners can read it. The
public verifier exposes it. The graded operator can read their own
score.

It is computed by GETKINETIK from data that is either (a) signed by
the node itself or (b) reported by a partner network through a typed
attestation channel. Inputs from each side are explicitly typed and
traceable so the score can be reconstructed from public data.

## 2. What Genesis Score is not

- **Not a token, point with monetary value, or any financial wrapper.**
  Issuing one would violate `NEUTRALITY.md` Rule 1.
- **Not transferable.** A node cannot sell, gift, or assign its score
  to another node. There is no marketplace.
- **Not stakable.** A node cannot put its score at risk to earn
  upside. The score is not collateral.
- **Not a credit score for the operator.** It grades the node, not
  the human behind it. See `PRIVACY.md` Rule 6.
- **Not a guarantee.** A high score reduces the likelihood of certain
  failure modes; it does not eliminate them. Partners should treat
  it as one input alongside their own checks, not a substitute for
  them.

## 3. Inputs to the score (and direction)

The methodology defines five **input categories** plus a small set of
**hard gates**. Each category is signed evidence the node itself
produced (or signed evidence produced by a partner). The bureau does
not add unaudited side-channels into the score.

For each input below, **direction** indicates whether it raises (▲)
or lowers (▼) the score, all else equal. Numerical weights are
managed internally and tuned over time; they are not public, the
same way FICO publishes which factors matter and the direction but
not the exact percentages. Methodology changes that affect direction
or add/remove a category trigger a major version bump and a public
comment period (see §6).

### 3.1 Identity integrity (gate + input)

| Signal | Direction |
|---|---|
| Ed25519 signature on every signed artifact verifies cleanly against the claimed public key | **HARD GATE.** Failure → score reported as `null` and a verify error returned to the caller. |
| Node ID matches `KINETIK-NODE-` + first 8 hex chars of `sha256(publicKey)` | **HARD GATE.** Failure → score reported as `null`. |
| `PROOF_ATTRIBUTION` string intact in the signed payload (proof-of-origin, earning) | **HARD GATE.** Failure → score reported as `null`. |
| Single, stable public key over the lifetime of the chain | ▲ |
| Chain reset / new public key after a previously-anchored chain ended | ▼ (lowers because earned standing does not transfer across keys; node starts fresh) |

**Why:** these are the structural cryptographic claims. If the
identity surface fails, the rest of the score is meaningless.

### 3.2 Uptime continuity

| Signal | Direction |
|---|---|
| Long unbroken heartbeat chain (high `lifetimeBeats`, valid `prevHash` linkage from beat to beat) | ▲ |
| Recent chain tip (latest signed beat is within the active window) | ▲ |
| Long calendar age (`firstBeatTs` far in the past with continuing activity) | ▲ |
| Gap in the chain that resumes cleanly (legitimate offline period) | neutral after a short cooldown |
| Chain tip not advancing while the node claims to be online | ▼ |
| Chain rewind (a later beat references a `prevHash` not consistent with a previously published tip) | **HARD GATE.** Failure → score floored to a low value and a tamper flag is published. |

**Why:** the chain *is* the uptime claim. Nodes that have been
running honestly for a long time have a long chain to show. Nodes
that have been spinning up emulators or scripted attesters do not.

### 3.3 Sensor coherence

| Signal | Direction |
|---|---|
| L2 sensor block (`motionRms`, `pressureHpa`, `lux`) present on each beat with values inside expected physical ranges | ▲ |
| Sensor variation over time consistent with a phone in real use (motion changes, pressure drifts with weather, light follows day/night when present) | ▲ |
| Constant or implausibly stable sensor values across a long window (e.g. perfectly identical motion RMS for hours) | ▼ |
| All sensor fields persistently `null` for a device class that should report them (e.g. a recent Android phone that should have a barometer reporting `pressureHpa: null` indefinitely) | neutral, but the **Sensor coherence** category contributes less to the total |
| Sensor values that are physically inconsistent (negative pressure, lux beyond saturation) | ▼ and a tamper flag |

**Why:** real devices look like real devices. Aggregates are kept
deliberately permission-light (see `PRIVACY.md` Rule 3) — what we
sign is enough to grade coherence, not enough to identify a person.

### 3.4 Network engagement (independent across networks)

| Signal | Direction |
|---|---|
| Partner network attestation that the node has performed its
  expected work (e.g. Nodle BLE scan attestations, DIMO trip
  reports, Hivemapper drive sessions, WeatherXM uptime, Geodnet
  GNSS reports) — received via a partner attestation channel and
  cross-checked against the chain | ▲ |
| Attestation reports a fault (e.g. "device stopped reporting GNSS"
  or "signal quality below floor") | ▼ |
| Attestation channel reports active fraud (e.g. "GPS spoof
  detected") | ▼ and a fraud flag |

**Why:** the node's signed chain is internal evidence. Partner
attestations are external evidence. A bureau that can correlate the
two is harder to game than either side alone.

**Independence rule:** the score for a node does not depend on
*which* networks it engages with, only on whether the engagement is
real and reported. We do not raise scores in exchange for adoption
of any specific network, per `NEUTRALITY.md` Rule 3.

### 3.5 Disclosure receipts (L4 earnings ledger)

| Signal | Direction |
|---|---|
| Node maintains a hash-chained earnings ledger with the canonical
  1% protocol disclosure fee baked into each receipt — and the
  receipts verify against the node's pubkey | ▲ |
| Earnings receipts that fail fee-integrity check (1% violated) or
  break the prevHash chain | ▼ and a tamper flag |
| Node has no earnings activity yet (new node, or no integrated
  network earning) | neutral |

**Why:** the disclosure fee is a transparency artifact. A node that
ships clean disclosure receipts is providing more verifiable
information about its own conduct, which is what the bureau grades.

### 3.6 Hard gates (summary)

A node receives a score of `null` (treated by partners as "do not
attest") if:

- Any signature in the most recent claim does not verify.
- The node ID does not match the public key fingerprint.
- The attribution string has been altered.
- A chain rewind has been observed.

A node receives a low score with an attached tamper flag if:

- Sensor values are physically impossible.
- Earnings receipts violate the 1% fee constraint.
- Partner attestation reports active fraud.

---

## 4. Score range, scale, and interpretation

The Genesis Score is reported as an integer in **[0, 1000]**, with
1000 being the highest. The scale is one-sided: there is no negative
score. A `null` score means "not gradable" (see hard gates above), not
"low".

| Range | Interpretation |
|---|---|
| `null` | Hard gate failed. Do not treat as graded. |
| 0–199 | Tamper flag(s) raised. Treat as untrusted. |
| 200–499 | New or recovering. Insufficient evidence to grade as high; not necessarily a problem. |
| 500–749 | Standing OK. Sufficient evidence of real-device operation. |
| 750–899 | Strong. Long, continuous, sensor-coherent record. |
| 900–999 | Premier. Long, continuous, sensor-coherent, multi-network attested with clean disclosure receipts. |
| 1000 | Reserved (no node currently held at exactly 1000). |

These bands are **calibration anchors**, not a contract. The exact
mapping from inputs to score is an internal computation that
includes calibration against observed real-vs-fraud datasets and is
versioned in step with this document.

**For partners:** treat the score as a continuous signal, not as
a categorical label. A v1 partner integration that wants a binary
"verified / not verified" gate should pick a threshold appropriate
to its own fraud cost (e.g. 500 for permissive, 750 for strict,
900 for premium-tier).

---

## 5. Update cadence

- **Continuous** for cryptographic gates (Identity integrity, chain
  rewind detection). A failure is reflected in the next API
  response from `verify-device`.
- **Sliding window** for uptime and sensor coherence. The window is
  deliberately not published in exact form — the bureau does not
  want a node to optimize for "looking good for the score window
  and quiet otherwise" — but it is bounded above by the node's
  total chain age and updated at least daily.
- **Per-attestation** for network engagement and disclosure
  receipts. A partner attestation arriving at the bureau is
  reflected in the score by the next computed update.
- A node's score is **stable between observed events**. Partners
  calling `verify-device` can cache the score per their SLA tier
  (currently 60s minimum for free, configurable for paid).

---

## 6. Versioning, changes, and disputes

### Versioning

- This document is the *public* methodology spec. The version
  number above (`v1.0`) is the spec version.
- A **patch version** (`v1.x`) is bumped for clarifications,
  worked examples, or anchor wording changes that do not change
  scoring direction or category set.
- A **minor version** (`v1.X`) is bumped for adding a new input
  category, retiring a deprecated one, or changing a threshold
  band in §4. Public comment period: **14 days** from the date a
  change PR is opened.
- A **major version** (`v2`) is bumped for changing the direction
  of any input, changing the score range, or otherwise altering
  what the score *means*. Public comment period: **30 days**.
- Old scores remain queryable so partners can audit historical
  decisions against the methodology version in effect at the time
  of decision. The version of the methodology used to produce a
  score is included in the API response as `methodologyVersion`.

### Changes

Methodology changes are committed as PRs to this file in the public
repository. Material changes (minor / major version bumps) require
the comment period above before taking effect on production. We do
not retroactively re-score nodes against a new methodology without
explicit notice; instead, both old and new scores are queryable
during a transition window.

### Disputes

A graded node operator who believes their score is incorrect can
file a dispute by:

1. Signing a dispute artifact with their node's secret key (so we
   can verify they own the node).
2. Submitting it via the public dispute endpoint (path will be
   announced when the dispute API ships in v1.1).
3. Receiving a signed bureau response with the result of the
   review and the methodology version under which it was reviewed.

The first dispute interface is open to all graded nodes regardless
of partner status. The bureau will publish anonymized dispute
counts and outcome categories in the annual transparency report
(per `NEUTRALITY.md`).

---

## 7. What the API returns

Calling `POST /api/verify-device` with a valid proof returns (in
addition to cryptographic outputs):

```jsonc
{
  // ... cryptographic fields (valid, nodeId, mintedAt, ageMs, lifetimeBeats, etc.)
  "genesisScore": 832,
  "scoreBand": "STRONG",         // see §4
  "methodologyVersion": "v1.0",
  "tamperFlags": [],             // empty if none
  "asOf": "2026-05-04T17:32:11Z"
}
```

Partners that want the raw signed proof in addition to the score
get both — the score is the bureau's output, the signed proof is
the node's input, and they are independent.

The exact API response shape is documented in
[`docs/api/verify-device.md`](../api/verify-device.md). When the
verify-device docs and this methodology doc disagree, the API doc
governs the wire format and this doc governs the meaning.

---

## 8. What this document does *not* do

- It does not list the exact numerical weights. Those are managed
  internally and tuned against calibration data.
- It does not describe partner-specific extensions. A partner that
  wants additional structured signals reflected in the bureau's
  score (e.g. a network-specific fraud feed) negotiates that
  through a partner attestation channel under §3.4 — and once
  added, it appears in this document.
- It does not describe how the score is rendered to the operator
  in the GETKINETIK app. That is a UX concern; the score on the
  wire is the contract.

---

## 9. Why this document exists

The bureau is only credible if its grading is auditable. The
shortest path to "auditable" is publishing the inputs and the
direction so anyone — a graded operator, a partner integrating
the API, a foundation auditor, an academic reviewer — can examine
the methodology, observe a node's signed evidence, and reach the
same qualitative conclusion the score implies.

Closed scoring systems do not survive scrutiny; open ones do. We
are betting on the open one.

---

*OutFromNothing LLC · GETKINETIK · Genesis Score Methodology · v1.0 · 2026-05*
