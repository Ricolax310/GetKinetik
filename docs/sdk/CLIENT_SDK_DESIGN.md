# Client SDK Design — "Sign in with Kinetik"

> **Status:** DRAFT v0.1 — design captured ahead of implementation. Build
> is **gated on a first partner conversation** (target: DIMO, Hivemapper,
> or Geodnet). We design here so that when a partner says yes, the
> integration shape is already specified rather than negotiated under
> time pressure.

**Versioned alongside** [`@kinetik/verify`](../../packages/verify/) (the
server-side / generic verifier) and the [`verify-device`](../api/verify-device.md)
webhook (the hosted partner API). This document defines the **third leg**
of the integration triad — the **client-side SDK** that lets a third-party
app inline-request a fresh Proof of Origin from a user who has the
GETKINETIK app installed.

---

## 1. Why this exists

Today, a partner network can verify a GETKINETIK user three ways:

| Path | What partner runs | What partner trusts |
|------|--------------------|----------------------|
| **A. Hosted webhook** | `POST /api/verify-device` | Our server, our uptime |
| **B. `@kinetik/verify` library** | `import { verifyArtifact }` | Math only — no servers |
| **C. Public verifier UI** | Open the URL in any browser | Math only — runs in the browser |

All three require the partner to **already have the proof** — i.e. the
user must have minted a fresh Proof of Origin and handed it over via QR,
copy-paste, or a deep link.

What's missing is a **client-side SDK** that lets a partner's own app
*request* a fresh Proof of Origin from a GETKINETIK user *while the user
is in the partner's app*, without the user having to manually open
GETKINETIK, mint a proof, copy it, and paste it back. The shape is the
same as **"Sign in with Apple"**: tap a button → OS handoff → return
with a signed token.

That's the SDK this document specifies.

---

## 2. Hard constraints

These constraints are non-negotiable and flow directly from
[`NEUTRALITY.md`](../../NEUTRALITY.md) and [`PRIVACY.md`](../../PRIVACY.md):

1. **The partner never gets the user's secret key.** The signing happens
   inside GETKINETIK; only a fresh signed Proof of Origin (or a short-
   lived attestation) crosses the bridge.
2. **No PII flows through the SDK.** The proof carries `nodeId`,
   `pubkey`, chain tip, sensor block, and the signature — nothing else.
   See `PRIVACY.md` Rule 1 for what is never collected.
3. **Same artifact shape as today.** The client SDK does not invent a
   new payload kind. It returns the same `{ payload, signature }`
   compact form `@kinetik/verify` and the public verifier already
   accept. Drift between mobile-mint, hosted-webhook-verify, and SDK-
   verify is a release-blocking bug.
4. **Stateless — no server required for the partner.** The SDK is a
   thin client; the partner's backend can verify the returned artifact
   with `@kinetik/verify` (offline) or by calling the hosted webhook
   (network round-trip). Partner's choice.
5. **No "browser bounce" if avoidable.** The flow uses native deep
   links / universal links so the user never sees a web tab. Failure
   modes degrade gracefully to the public verifier UI.
6. **No telemetry.** The SDK does not phone home. Build success
   metrics from `verify-device` webhook usage, not from SDK pings.
7. **Open-source.** The SDK is published under the same MIT license
   as `@kinetik/verify`, so a partner can audit (or fork) the bridge
   independently of trusting our binary.

---

## 3. Two SDK shapes

We ship two thin SDKs that share the same protocol on the wire. A
partner picks the one that matches their stack. Both interoperate with
the same GETKINETIK app.

### 3.1 `@kinetik/sdk-react-native`

For partner mobile apps built on React Native / Expo. The most likely
first integration target (DIMO, Hivemapper).

```ts
import { requestProofOfOrigin } from '@kinetik/sdk-react-native';

async function attachKinetikIdentity() {
  const result = await requestProofOfOrigin({
    partnerId: 'dimo',                     // pre-registered partner ID
    nonce: crypto.randomUUID(),            // partner-supplied freshness nonce
    purpose: 'reward-eligibility',         // human-readable scope string
    returnUrl: 'dimoapp://kinetik-return', // partner deep link to return to
  });

  if (result.kind === 'cancelled') return;
  if (result.kind === 'error') {
    console.warn('Kinetik verify failed:', result.message);
    return;
  }

  // result.kind === 'ok'
  await fetch('/api/attach-kinetik', {
    method: 'POST',
    body: JSON.stringify(result.artifact), // signed proof — same shape as
                                          // landing/verify accepts
  });
}
```

### 3.2 `@kinetik/sdk-android` (Kotlin) and `@kinetik/sdk-ios` (Swift)

For partner native apps. Same protocol, idiomatic platform API. Names
TBD; expect e.g. `KinetikClient.requestProofOfOrigin(...)` returning
a Kotlin coroutine / Swift `async` result.

---

## 4. The protocol

The SDK flow is a four-step deep-link round trip. Nothing on the wire
that the user can see is novel — the deep links and the artifact shape
are all things we already ship.

```
   PARTNER APP                 GETKINETIK APP                PARTNER BACKEND
   ───────────                 ───────────────                ──────────────
   ① user taps                                                      ·
   "Verify with                                                     ·
    GETKINETIK"                                                     ·
        │                                                           ·
        │ openURL("kinetik://verify-device?  ...")                  ·
        │                                                           ·
        ▼                                                           ·
                            ② consent screen:                      ·
                            "Share a fresh Proof                   ·
                             of Origin with DIMO                   ·
                             for reward eligibility?"              ·
                            user taps "Share"                       ·
                                  │                                 ·
                                  │ mints a FRESH proof bound to    ·
                                  │ partnerId + nonce + purpose.    ·
                                  │ Same signing pipeline as today. ·
                                  │                                 ·
                                  │ openURL("dimoapp://             ·
                                  │   kinetik-return?proof=<b64>")  ·
                                  │                                 ·
   ③ SDK callback fires           │                                 ·
   with the artifact ◀────────────┘                                 ·
        │                                                           ·
        │ optional: pass to backend.                                ·
        │                                                           ▼
        │  POST /api/attach-kinetik         { proof: { ...artifact... } }
        │                                                           │
        │                                                           ▼
        │                                                ④ backend verifies:
        │                                                   verifyArtifact()
        │                                                   then check freshness
        │                                                   (nonce match, ts < 5m)
```

### 4.1 Step ① — `kinetik://verify-device` request

The partner app constructs and opens:

```
kinetik://verify-device?
  partnerId=dimo
  &nonce=<128-bit random hex>
  &purpose=<URL-encoded short string>
  &returnUrl=<URL-encoded partner return scheme>
  &v=1
```

If GETKINETIK is not installed, the OS shows nothing and the SDK
times out after a short window. Fallback: open the public verifier
URL (`https://getkinetik.app/verify/`) in a tab so the user can at
least mint a proof and copy-paste it manually. The SDK reports
`kind: 'app-not-installed'` so the partner can decide whether to
prompt for install or fall back gracefully.

### 4.2 Step ② — consent + freshness binding

GETKINETIK shows a **consent screen** describing the request:

> *"DIMO is requesting a fresh Proof of Origin for **reward
> eligibility**. The proof will include your node ID, your public
> key, your sensor block, and your chain tip. **No personal
> information is shared.** Continue?"*

If the user accepts, GETKINETIK mints a **fresh** Proof of Origin
that includes the partner's `nonce` in a new optional field on the
v:2 PoO schema:

```jsonc
{
  "v": 2,
  "kind": "proof-of-origin",
  "nodeId": "KINETIK-NODE-...",
  "pubkey": "...",
  "issuedAt": 1746374000000,
  "lifetimeBeats": 17234,
  "firstBeatTs": 1714000000000,
  "chainTip": "...",
  "attribution": "GETKINETIK by OutFromNothing LLC",
  "sensors": { "lux": 348, "motionRms": 0.07, "pressureHpa": 1013.21 },
  // ── new fields, optional, only present when minted via the SDK ──
  "audience": "dimo",
  "nonce": "<the partner-supplied nonce>",
  "purpose": "reward-eligibility"
}
```

Notes on the new fields:

- **Optional.** Verifiers (the `@kinetik/verify` package, the public
  web verifier, the hosted webhook) accept proofs with or without
  the audience/nonce/purpose triplet. v:2 forward-compat.
- **Inside the signed bytes.** A partner that re-uses an old proof
  with a different nonce would invalidate the signature.
- **No personal info.** `audience` is the partnerId, `nonce` is
  random, `purpose` is a short scope string from a closed
  vocabulary.

Schema bump: this is a **minor** change (new optional field,
backward-compatible), captured in the next minor version bump of
`landing/verify/verifier.js` and `@kinetik/verify`. No `v:2 → v:3`
needed.

### 4.3 Step ③ — return via partner deep link

GETKINETIK opens the partner's `returnUrl` with the freshly minted
proof attached as a base64url-encoded `proof=` query string —
identical encoding to the public verifier URL fragment so a single
encoder/decoder is shared.

The SDK on the partner side intercepts the deep link, decodes the
proof with the same logic as `decodeProofUrl()` from `@kinetik/verify`,
and resolves the `Promise` it returned in step ①.

### 4.4 Step ④ — partner backend verification (optional)

The partner can verify on-device (using `@kinetik/verify` bundled
into their app) or send the proof to their backend and verify
there. Either way, verification is the **same five checks** the
existing verifier runs, plus three SDK-specific checks:

| Extra check | What it confirms |
|-------------|------------------|
| `audience === partnerId` | Proof was minted for *this* partner, not another |
| `nonce === expected nonce` | Replay protection — partner-generated nonce matches |
| `Date.now() - issuedAt < 5 * 60_000` | Proof is fresh (within 5 min of mint) |

These three checks are **not part of `@kinetik/verify` core** —
that package stays pure to the cryptographic contract. They are
helper utilities exposed from `@kinetik/sdk-*`:

```ts
import { verifyArtifact } from '@kinetik/verify';
import { verifyAudienceClaim } from '@kinetik/sdk-react-native';

const report = await verifyArtifact(proof);
const audOk  = verifyAudienceClaim(proof, {
  expectedPartnerId: 'dimo',
  expectedNonce: nonce,
  maxAgeMs: 5 * 60_000,
});

if (report.valid && audOk.valid) { /* trust the proof */ }
```

---

## 5. What this is NOT

To preempt the misreadings most likely to surface in conversation:

- **NOT a wallet.** No tokens are exchanged, signed, or transferred.
  See `NEUTRALITY.md` Rule 1.
- **NOT an OAuth provider.** No user account, no email, no bearer
  token. The SDK returns a one-shot signed artifact, not a
  long-lived session.
- **NOT a Sybil-resistance silver bullet.** The proof attests
  *device authenticity*, not *operator uniqueness*. A user with
  three phones has three valid nodes (correctly so). Partners
  needing operator-level dedup combine our proof with their own
  logic.
- **NOT a service the bureau charges users for.** SDK use is free
  for the user. Partner-side billing happens via the existing
  `Partner Verification API` tier.

---

## 6. Implementation plan (when triggered)

Phase A — partner sign-on (the gating event)
- One BD conversation with DIMO, Hivemapper, or Geodnet that says:
  "we'd integrate this if it shipped this month."
- Capture their preferred SDK platform (RN / native iOS / native
  Android) and any constraints we don't know about (App Store
  review notes, Play Console permissions, etc.).

Phase B — schema bump
- Add `audience`, `nonce`, `purpose` to the optional v:2 PoO
  schema. Bump `landing/verify/verifier.js` minor version. Add
  test cases to `smoketest.mjs` and the package smoketest.

Phase C — app side (GETKINETIK)
- Register `kinetik://verify-device` as a deep link target.
- Build the consent screen.
- Mint with the new optional fields when invoked via the SDK
  flow.
- Open the partner's `returnUrl` with the proof.

Phase D — partner SDK (RN first, then native if needed)
- `@kinetik/sdk-react-native`: thin wrapper around
  `Linking.openURL` + a `Linking` listener for the return.
- `verifyAudienceClaim` helper.
- Fallback to public verifier URL when GETKINETIK is not
  installed.
- Smoketest harness that drives the deep-link flow in Detox or
  similar.

Phase E — docs + sample app
- One-page integration guide with the three lines of code.
- A "kinetik-sdk-example" app that ships in the repo as a
  sanity check.

Estimated total effort once a partner says yes: **3–5 dev days**.
Most of the cost is consent UX + deep-link plumbing on both sides;
the cryptographic contract is already shipped.

---

## 7. Open design questions

These are open for the conversation with the first partner.

- **Consent UX.** A single tap-through is fastest, but a one-time
  "trust this partner forever" toggle would be a better repeat-use
  experience. The trade-off is that "trust forever" is harder to
  revoke gracefully.
- **Multiple partners.** If a user has GETKINETIK linked to DIMO
  and Hivemapper, do we surface that in the GETKINETIK app's
  account screen? Probably yes (transparency), but it adds UI
  surface that didn't exist before.
- **Server-side nonce.** The current draft has the partner client
  generate the nonce. Some partners may prefer server-issued
  nonces; the SDK should support both shapes.
- **Web SDK.** Do we ship a `@kinetik/sdk-web`? Probably not in
  v1 — most partner integrations of interest are mobile, and the
  existing verifier URL covers the web case. Revisit if a desktop
  partner asks for it.

---

## 8. Why the gating matters

Building all this now, before a partner conversation, is the
fastest way to ship a feature **for nobody**. Every shape decision
above benefits from contact with the first real integrator: their
authentication conventions, their deep-link strategy, their App
Store review constraints, the exact friction point in their
existing onboarding. Designing those in the abstract gets us 60%
of the way; the last 40% is partner-specific.

So the rule is: **this document waits until a partner says yes.**
When that happens, we know what to build, and we already know what
*not* to build. That's the whole point of writing it now.

---

*OutFromNothing LLC · GETKINETIK · Client SDK Design · v0.1 (DRAFT) · 2026-05*
