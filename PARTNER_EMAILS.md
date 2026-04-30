# GETKINETIK — Partner Outreach Templates v4 (Verified-User Premium)

> **Author:** Eric (Kinetik_Rick), Founder — GETKINETIK / OutFromNothing LLC
> **Updated:** April 2026
> **Contact:** eric@outfromnothing.com

---

## The Pitch (one sentence)

> "We bring you Sybil-resistant users. In return, pay them a 10–15% verified-user
> premium. We pass it through. You get higher data quality, lower fraud loss, free
> anti-bot infrastructure. Net: you save more than you pay."

The live verification webhook is already deployed:
`POST https://getkinetik.app/api/verify-device { proofUrl }`
→ `{ valid: true, nodeId, mintedAt, pubkey }`

Any partner can call it today, for free, before any agreement is signed.

---

## Status Tracker

| Partner | Channel | Status | Follow-up By |
|---|---|---|---|
| DIMO | Discord DM + grants@dimo.zone | Sent | May 14, 2026 |
| Hivemapper | MIP-26 Discord | Sent | May 14, 2026 |
| WeatherXM | Discord + email | Not sent | April 30, 2026 |
| Geodnet | Discord + email | Not sent | April 30, 2026 |
| Nodle | Discord DM | Not sent | May 7, 2026 |

---

## DIMO

### Discord DM / Forum Post

```
Hey DIMO team 👋

I'm Eric (Kinetik_Rick) — founder of GETKINETIK, a DePIN earnings aggregator that runs a Sovereign Node on each user's phone.

We already have DIMO integrated in our app (Login with DIMO works, we're tracking DIMO earnings in our signed ledger). What I want to propose is the next layer.

THE PITCH:
Our users already proved their hardware is real — they have a signed, on-chain-verifiable identity with a hash-chained heartbeat log. That means DIMO can verify their node isn't a bot farm before paying rewards.

Here's the mechanic:
1. User shares their GETKINETIK Proof of Origin URL with DIMO
2. DIMO calls our free verification webhook: POST https://getkinetik.app/api/verify-device
3. Webhook returns: { valid: true, nodeId, mintedAt }
4. DIMO pays verified nodes 10–15% more than unverified ones
5. GETKINETIK passes the premium through — the user sees "verified premium: +$1.20" in their weekly savings report

You get:
✓ Hardware-attested users (Sybil-resistant by design)
✓ Higher data quality from real devices
✓ Free anti-bot layer you didn't have to build
✓ A story: "we pay more for verified nodes"

We save more than we cost.

The webhook is live today — you can test it before any agreement. DM me or reach me at eric@outfromnothing.com.

— Eric (Kinetik_Rick)
GETKINETIK · getkinetik.app
```

### Email to grants@dimo.zone

**Subject:** GETKINETIK × DIMO — Verified-User Premium Proposal + Verification Webhook

```
Hi DIMO Grants Team,

I'm Eric Guthmann, founder of GETKINETIK (getkinetik.app) — a DePIN earnings aggregator. We already have DIMO integrated: users connect via Login with DIMO and their DIMO earnings are tracked in our signed, auditable ledger.

I'm writing with two things:

1. VERIFICATION WEBHOOK (live today, free)

Any user who runs a GETKINETIK Sovereign Node has a cryptographically signed, hardware-attested identity. You can verify any node instantly:

POST https://getkinetik.app/api/verify-device
Body: { "proofUrl": "<user's Proof of Origin URL>" }
Response: { "valid": true, "nodeId": "KINETIK-NODE-...", "mintedAt": 1714000000000 }

No auth. No API key. Call it now and test it before replying.

2. THE PREMIUM PROPOSAL

Pay verified GETKINETIK nodes 10–15% above your standard rate. We pass it through to users as a signed receipt. You get:
- Sybil-resistant users (one keypair per hardware device)
- Higher data quality from confirmed physical machines
- Free anti-Sybil infrastructure
- A compelling story for user acquisition: "verified nodes earn more"

I'm also applying to the DIMO Foundation grants programme for $10K–$25K to fund the premium activation layer. Happy to discuss both tracks.

App: https://github.com/Ricolax310/GetKinetik
Verify endpoint spec: https://getkinetik.app/docs/api/verify-device (coming shortly)

Best,
Eric Guthmann (Kinetik_Rick)
Founder, GETKINETIK / OutFromNothing LLC
eric@outfromnothing.com
```

---

## Hivemapper

### MIP-26 Discord Post

```
Hey Hivemapper community,

I'm Eric (Kinetik_Rick) — founder of GETKINETIK, a multi-network DePIN aggregator. We already track HONEY earnings for users who connect their Solana wallet — your rewards show up in our signed, auditable earnings ledger.

I want to propose something for MIP-26 discussion: verified-user premium for GETKINETIK nodes.

WHAT WE HAVE:
Every GETKINETIK user has a signed, hardware-attested node identity — a hash-chained heartbeat log proving they're running on a real device. It's verifiable publicly: https://getkinetik.app/verify/

THE ASK:
Pay GETKINETIK-verified mappers a 10–15% premium above standard HONEY rewards. We provide the verification webhook for free:

POST https://getkinetik.app/api/verify-device
→ { valid: true, nodeId, mintedAt }

WHY IT HELPS HIVEMAPPER:
- Confirmed you're paying real dashcam operators, not bots
- Higher quality coverage data from verified contributors
- An incentive that pulls serious mappers toward your network
- Free Sybil resistance you didn't have to build yourself

You save more than you pay.

Happy to answer questions here or at eric@outfromnothing.com.

— Eric (Kinetik_Rick)
getkinetik.app
```

---

## WeatherXM

### Discord DM / Email

**Subject:** GETKINETIK × WeatherXM — Verified Stations Premium Proposal

```
Hey WeatherXM team,

I'm Eric (Kinetik_Rick), founder of GETKINETIK — a DePIN earnings aggregator running on smartphones.

We have WeatherXM on our integration roadmap (tracking WXM earnings for users with weather stations). But I want to propose something beyond simple tracking.

THE PROBLEM WE BOTH HAVE:
Weather station reward fraud — fake stations, duplicated stations, GPS spoofing. It's a known issue across DePIN weather networks.

THE SOLUTION WE BUILT:
Every GETKINETIK node has a signed, hardware-attested identity. We can verify that a station is running on a real device with a real sensor suite. The verification is:
- Cryptographic (Ed25519 signed proof chain)
- Public (anyone can verify at getkinetik.app/verify/)
- Free to call (webhook: POST https://getkinetik.app/api/verify-device)

THE PROPOSAL:
Pay GETKINETIK-verified stations a 10–15% premium above standard WXM rates. You get:
✓ Hardware-confirmed physical stations (not virtual)
✓ Sybil-resistant claims
✓ Higher data quality from verified contributors

We pass the premium through to users as a signed receipt. They see the premium in their weekly "GETKINETIK vs Standalone" savings report — which creates a strong reason to stay on our platform and keep their station online.

You save more on fraud than you pay in premium. Net positive.

Live webhook for testing (no auth required):
curl -X POST https://getkinetik.app/api/verify-device \
  -H 'Content-Type: application/json' \
  -d '{"proofUrl":"<user_proof_url>"}'

Happy to talk. eric@outfromnothing.com

— Eric (Kinetik_Rick)
GETKINETIK · getkinetik.app
```

---

## Geodnet

### Discord DM / Email

**Subject:** GETKINETIK × Geodnet — Verified GNSS Operator Premium

```
Hey Geodnet team,

I'm Eric (Kinetik_Rick), founder of GETKINETIK — a DePIN earnings aggregator.

Quick context: GETKINETIK runs on smartphones and aggregates earnings from multiple DePIN networks. Geodnet is on our integration roadmap for users who run GNSS reference stations.

THE PITCH:
Our users have signed, hardware-attested node identities — cryptographic proof that they're running on real devices. For a network where positioning accuracy depends on station legitimacy, that matters.

What I'm proposing:
Pay GETKINETIK-verified Geodnet operators 10–15% above standard GEOD rates. We provide a free verification webhook:

POST https://getkinetik.app/api/verify-device
→ { valid: true, nodeId: "KINETIK-NODE-...", mintedAt }

You get hardware-confirmed operators. We pass the premium through to users. Everyone wins.

The webhook is live today — test it before any agreement.

eric@outfromnothing.com

— Eric (Kinetik_Rick)
GETKINETIK · getkinetik.app
```

---

## Nodle

### Discord DM

```
Hey Nodle team,

I'm Eric (Kinetik_Rick) — we already have Nodle integrated in GETKINETIK (our DePIN aggregator). NODL earnings show up in our signed, auditable ledger alongside other networks.

I want to raise the verified-user premium idea.

Nodle's value is BLE data quality. A bot farm could theoretically fake BLE traffic without a real device actually being in the field. Our hardware-attested identity proves the opposite — a real phone, running continuously, with sensor data signed into a hash chain.

THE PROPOSAL:
Pay GETKINETIK-verified Nodle nodes a 10–15% NODL premium. The verification is:
- Cryptographic, not just KYC
- Public and auditable
- Free to call (webhook at getkinetik.app/api/verify-device)

For a network whose core value proposition is "real edge nodes," having a verified badge from GETKINETIK could be a meaningful differentiator for premium enterprise API customers.

Happy to talk in more detail. eric@outfromnothing.com

— Eric (Kinetik_Rick)
getkinetik.app
```

---

## Follow-Up Schedule

| Partner | Follow up if no response by |
|---|---|
| DIMO | May 14, 2026 |
| Hivemapper | May 14, 2026 |
| WeatherXM | May 7, 2026 |
| Geodnet | May 7, 2026 |
| Nodle | May 14, 2026 |

---

## Key Facts for All Outreach

- **Live webhook:** `POST https://getkinetik.app/api/verify-device`
- **Verification takes <200ms** — can be called inline with reward processing
- **No auth required** — test it before any agreement
- **Source code public:** https://github.com/Ricolax310/GetKinetik
- **App download:** https://github.com/Ricolax310/GetKinetik/releases/latest
- **Verify a proof:** https://getkinetik.app/verify/
- **Network metrics:** https://getkinetik.app/metrics/

*Templates v4 — updated April 2026 to include verified-user premium pitch and live webhook.*
