# PRIVACY CHARTER

> **GETKINETIK grades nodes, not people. This document is the immutable
> contract that makes that distinction structural — not a policy
> choice we could quietly change later. Drift from these rules ends
> the company's reason to exist for the same reason a leak from
> [`NEUTRALITY.md`](./NEUTRALITY.md) would.**

---

## Why this document exists

A bureau is only credible to the people whose conduct it grades when
those people are confident the bureau is grading **what they did**, not
**who they are**.

Consumer credit bureaus failed this test for decades — they collect
names, social security numbers, addresses, and resell them — and the
modern reputation infrastructure problem is partly downstream of that
failure. We will not repeat it.

GETKINETIK grades a *node* — a cryptographic identity living on a
specific piece of hardware. The mapping from that node to a human
being is **never** captured, stored, or queryable on our side. Not
because we promise not to look. Because we never collect the data
that would let us look.

This document defines those structural rules so that even a future
operator of the company who *wants* to monetise user identity literally
cannot, without dissolving the entity and starting over under a
different name.

---

## The Six Rules (immutable)

These are the rules that protect node privacy. They are not subject to
quarterly business pressure, partner requests, capital incentives, law
enforcement convenience, or strategic exceptions.

### 1. **No personal identifiers, ever.**

We will not collect, log, persist, or transmit any of the following:

- IMEI, MEID, ESN, ICCID, IMSI, or any other carrier-issued device ID
- Android ID (`Settings.Secure.ANDROID_ID`)
- Apple IDFA, IDFV, or vendor-scoped equivalents
- MAC addresses (Wi-Fi or Bluetooth) of the device or any nearby device
- Phone number, SIM serial, or carrier account
- Email address, unless the user voluntarily provides one for support
- Government-issued identifier (SSN, national ID, passport, driver's
  license, etc.)
- Biometric template (fingerprint, face, iris, voice) — biometrics
  unlock the device locally; the template never leaves the secure
  enclave
- Real name, date of birth, or any other PII

This list is non-exhaustive in the direction of privacy: anything that
walks like a personal identifier is treated as one even if it isn't on
this list. New identifiers introduced by future OS releases or
hardware are presumptively excluded.

### 2. **No mapping from node ID to anything personal.**

GETKINETIK has no internal table — and no externally consultable
table — that maps a node ID (`KINETIK-NODE-XXXXXXXX`) or its public
key to:

- a person, real or pseudonymous
- a phone number, email, or social account
- an IP address (beyond the ephemeral lifetime of a request)
- a payment instrument
- any other GETKINETIK node owned by the same person
- any third-party identity, federated login, or wallet address (the
  L4 wallet address `kn1…` is itself **derived from the node's
  public key**, not from any external account)

If subpoenaed, the company can truthfully respond: **we have a node
ID, we have a Genesis Score, we have a chain tip, and we have no
idea whose phone it is.** This is the entire point.

### 3. **Aggregates only — never raw sensor content.**

The L2 sensor block on every signed heartbeat carries three values:

- `motionRms` — RMS of accelerometer deviation over a short window
  (a number in g)
- `pressureHpa` — the latest barometer point read (a number in hPa)
- `lux` — the latest ambient-light point read (a number in lx)

These are deliberately **aggregates and point reads**, not raw sensor
streams. We will not sign:

- Raw accelerometer / gyroscope timeseries
- Audio waveforms or transcribed audio of any kind
- Camera images, video, or derived embeddings
- Continuous GPS traces (a future opt-in GPS aggregate is allowed
  only as a coarse, low-resolution signal — never a track)
- Wi-Fi SSID lists, BSSID lists, or signal-strength scans
- Cell tower IDs, neighbor lists, or signal scans
- Browsing history, app inventory, or contact list
- Clipboard, keystroke, or input-method content

A future sensor added to the chain must be *aggregate-only by
construction*. If a useful signal cannot be expressed as a
permission-light aggregate, it does not enter the chain.

### 4. **Logs are short-lived and aggregate.**

Server-side logs (Cloudflare Workers, KV, Pages) retain:

- Counts (number of `verify-device` calls per partner per day)
- Coarse timing metrics (p50/p95 response times)
- Error categories, never error payloads containing user data
- The node ID and the verify result, only when needed for billing
  reconciliation, and only for the minimum retention required by the
  partner contract

Server-side logs **do not** retain:

- IP addresses beyond the ephemeral request lifetime
- User-agent strings linked to node IDs
- Request bodies or response bodies in full
- Any cross-request session identifier that could re-link calls from
  the same caller back to a person

The retention policy is **shorter is better, always**. A future
employee who proposes "let's keep raw logs for a year, just in case"
is told no with reference to this section.

### 5. **No data sale. No data resale. No identifiable data export.**

We will not sell user-level data to anyone for any purpose, ever. This
includes:

- Selling node-level identifiable data to advertisers, ad networks,
  data brokers, or marketing platforms
- Selling node-level identifiable data to risk-scoring, KYC, or
  identity-verification vendors
- Selling node-level identifiable data to law-enforcement-adjacent
  data brokers
- Selling node-level identifiable data to graded networks themselves

The bureau publishes **grades**, not user-level identifiable
information. The legal product surface is:

| Tier | Receives |
|------|------------|
| Public verifier / API | Per-node grade, age, heartbeat count, chain tip |
| Partner Verification API | Same, plus batch lookup and SLA |
| Enterprise audit access | Aggregate network statistics + methodology disclosure + dispute resolution receipts |

A request from an acquirer or partner that requires user-level
identifiable data export is a request to violate this charter, and is
declined.

### 6. **Genesis Score is about a node, not a person.**

The Genesis Score grades the *node* — a public key and the chain it
signs. It does not grade:

- The owner of the node
- The owner's other nodes (each node is graded independently)
- The owner's behavior in any other context
- The owner's identity, employment, residence, or affiliations

The score is non-transferable, never priced, and cannot be bought,
sold, traded, or held by anyone other than the node it grades.
Re-issuing a score against a person, or reusing a node's score to
make claims about the human behind the device, is forbidden by
[`NEUTRALITY.md`](./NEUTRALITY.md) Rule 1 and reaffirmed here.

If a partner or acquirer asks to "link Genesis Score to KYC
identity," the answer is no. They are welcome to do their own
identity verification — separately, on their own data — and use the
node's Genesis Score as one of many independent inputs.

---

## What we will do

- **Collect the minimum needed** for the bureau to function — node
  ID, public key, signed chain — and nothing more.
- **Document data flows publicly**, including which fields appear in
  each API response and how long they persist.
- **Publish privacy disclosures** alongside the annual transparency
  report (already promised in `NEUTRALITY.md`).
- **Refuse data-broker integrations** even when the contract value
  is high.
- **Honor user data requests**: any user with their node's secret key
  (i.e. the device itself) can export their full chain, query their
  own grade, and request deletion of any centrally-cached
  representation. The on-device chain itself is theirs — we cannot
  delete it remotely, by design.
- **Default-encrypt** all secret material on-device via
  `expo-secure-store` (Android Keystore / iOS Keychain).

## What we will not do

- Collect, store, log, or transmit any identifier listed in Rule 1.
- Maintain a node-to-person mapping, internally or via any third
  party.
- Sign or transmit raw sensor content of any kind.
- Sell, license, or transfer user-level identifiable data.
- Cooperate with bulk data requests that lack a node-specific lawful
  basis. (Per-node responses are limited to what we actually have —
  see Rule 2.)
- Add a sensor signal to the chain that cannot be expressed as a
  permission-light aggregate.

---

## How this is enforced in code

This is not a marketing document. The rules above are enforced by
how the codebase is built. Auditable today:

- **Identity** (`packages/kinetik-core/src/identity.ts`) — node IDs
  are derived from a CSPRNG-generated Ed25519 public key. There is
  no path that mixes IMEI, Android ID, IDFA, IDFV, or any
  carrier-issued identifier into the keypair.
- **Heartbeat** (`packages/kinetik-core/src/heartbeat.ts`) — the
  signed payload contains exactly: `v, kind, nodeId, pubkey, seq,
  ts, stabilityPct, online, charging, prevHash, sensors`. No
  IP, no user-agent, no IMEI, no contact graph, no ad ID.
- **Sensors** (`packages/kinetik-core/src/sensors.ts`) — the only
  values that ever enter the chain are `motionRms`,
  `pressureHpa`, `lux`. Raw timeseries are sampled to compute the
  RMS and immediately discarded.
- **Wallet** (`packages/kinetik-core/src/wallet.ts`) — the wallet
  address is a deterministic derivation of the node public key
  with domain separation. No external account, no exchange handle,
  no email, no phone number is involved.
- **Verify webhook** (`functions/api/verify-device.js`) — the
  request body is a proof URL or proof object. The response is
  validity + node age + heartbeat count. No PII in either
  direction.

A code change that violates the rules above also violates this
charter. The charter is the spec; the code is the implementation.

---

## Amendment process

**Rules 1–6 are not amendable** without dissolving the company and
starting a separate legal entity that is no longer presented as
GETKINETIK or as a neutral trust layer for DePIN.

Operational policies (specific server log retention windows, specific
error-tracking vendors, specific auditor identities) may evolve and
will be versioned in this repository. Material changes require public
notice in advance, same as `NEUTRALITY.md`.

---

## Why this document is the company

The day a foundation offers GETKINETIK $50M in exchange for re-issuing
Genesis Score against KYC identities, this document exists so the
answer is **no** without a meeting. The day an acquirer wants to buy
GETKINETIK to merge our node-grade data with their consumer-credit
identity graph, this document exists so the deal either restructures
around grading-only access or doesn't happen. The day a state actor
asks for the list of IPs that minted Proof-of-Origin artifacts in a
given week, this document exists so we can truthfully answer that we
do not retain that data and do not have a path to retrieve it.

The bureau is credible because the graded party owns their own data.
The graded party owns their own data because we never had a copy.

We are deliberately structured to never know who anyone is. That is
half the moat. The other half is `NEUTRALITY.md`. Together they're
the company.

---

*OutFromNothing LLC · GETKINETIK · v1.0 · 2026-05*
