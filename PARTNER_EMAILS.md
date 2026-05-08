# GETKINETIK — Partner outreach templates v5 (independent trust layer)

> **Author:** Eric (Kinetik_Rick), Founder — GETKINETIK / OutFromNothing LLC
> **Updated:** May 2026
> **Contact:** eric@outfromnothingllc.com
>
> **Framing:** GETKINETIK is the **independent trust layer for the decentralized
> physical economy** — Carfax-shaped, bureau-shaped. We sit outside every
> DePIN, grade the device, never issue a token, never hold equity in any
> network we grade, never accept payment in graded networks' native assets.
> The app also tracks multi-network earnings in one signed ledger; that
> product feature is **not** the partner pitch. Partners care about **neutral
> attestation** first. See [`NEUTRALITY.md`](./NEUTRALITY.md),
> [`PITCH.md`](./PITCH.md), [`OUTREACH_MESSAGES.md`](./OUTREACH_MESSAGES.md).

---

## The pitch (one paragraph)

GETKINETIK publishes hardware-attested device identity and a hash-chained
uptime record for every Sovereign Node. Your backend can **cryptographically
verify** any user's Proof of Origin today — `POST https://getkinetik.app/api/verify-device`
with `{ "proofUrl": "<their verifier URL>" }` → `{ "valid": true, "nodeId",
"pubkey", "mintedAt", "schema", "attribution" }`. No auth. No API key.
Genesis Score (public reputation grade, **not** a token) is documented in
[`docs/methodology/GENESIS_SCORE.md`](./docs/methodology/GENESIS_SCORE.md);
full score-on-wire integration with the webhook is on the roadmap — today
the hook proves **identity + signature validity**, which is already the
Sybil-resistance primitive.

**Optional commercial layer (when a partner wants it):** Some networks may
choose to pay verified operators a premium or weight rewards — that is
**their** policy decision using **our** attestation as input. We do not
grade networks differently for money ([`NEUTRALITY.md`](./NEUTRALITY.md)
Rule 3). The numbers below (10–15%) are a **conversation starter**, not a
promise.

**Docs:** Webhook spec — `https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md`

---

## Status tracker

| Partner    | Channel              | Status            | Follow-up by |
| ---------- | -------------------- | ----------------- | ------------ |
| DIMO       | Discord DM + grants  | Sent — awaiting   | May 14, 2026 |
| Hivemapper | MIP-26 Discord       | Sent — awaiting   | May 14, 2026 |
| WeatherXM  | Discord + email      | **SEND NOW**      | May 7, 2026  |
| Geodnet    | Discord + email      | **SEND NOW**      | May 7, 2026  |
| Nodle      | Discord DM           | Hard no — parked  | —            |

---

## DIMO

### Discord DM / forum post

```
Hey DIMO team

I'm Eric (Kinetik_Rick) — founder of GETKINETIK, the independent trust layer for DePIN (Carfax-shaped: we sit outside every network and attest hardware, we never issue a token, never hold equity in graded networks — see our charter link below).

We already have DIMO integrated in the app (Login with DIMO; DIMO reads flow into our signed local ledger). What I want to discuss is the **verification layer**, not the aggregator UI.

THE CORE ASK:
Every GETKINETIK user has an Ed25519 identity sealed in the phone and a hash-chained heartbeat log. DIMO can call our public webhook to confirm the device behind a driver is real before paying rewards or weighting contributions:

POST https://getkinetik.app/api/verify-device
Body: { "proofUrl": "<user's Proof of Origin URL>" }

No auth. Test it before any meeting.

OPTIONAL (if DIMO wants to incentivize verified hardware):
Some networks pay verified operators a premium above the standard rate — that's your economics, not ours. We don't touch your token; we publish attestation. If that conversation is interesting, I'm happy to walk through signed receipts and `verify-device` together.

Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
Site: https://getkinetik.app

— Eric (Kinetik_Rick)
```

### Email to grants@dimo.zone

**Subject:** GETKINETIK × DIMO — Independent trust layer + verification webhook

```
Hi DIMO Grants Team,

I'm Eric Guthmann, founder of GETKINETIK (getkinetik.app). We position as the independent trust layer for the decentralized physical economy — neutral hardware attestation for DePIN nodes, same structural rules as a credit bureau: no GETKINETIK token, no equity in graded networks, methodology public (see NEUTRALITY.md on our repo).

We already integrate DIMO in our Android build (Login with DIMO; earnings flow into a signed local ledger). I'm writing about two tracks:

1) VERIFICATION WEBHOOK (live today, free)

POST https://getkinetik.app/api/verify-device
Content-Type: application/json
{ "proofUrl": "<user Proof of Origin URL from the app>" }

Returns cryptographic validity + nodeId + pubkey + timestamp fields. Partners use this for Sybil resistance without building their own hardware identity stack.

Spec: https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md

2) GRANT TRACK (optional)

I'm applying for a builder grant to deepen DIMO integration (webhooks, docs, demo video). Happy to align milestones with Foundation priorities.

Best,
Eric Guthmann (Kinetik_Rick)
Founder, GETKINETIK / OutFromNothing LLC
eric@outfromnothingllc.com
https://github.com/Ricolax310/GetKinetik
```

---

## Hivemapper

### MIP-26 Discord post

```
Hey Hivemapper community,

I'm Eric (Kinetik_Rick) — founder of GETKINETIK, the independent trust layer for DePIN (neutral device attestation; charter: no token, no equity in graded networks — github.com/Ricolax310/GetKinetik NEUTRALITY.md).

We track HONEY for connected wallets in our signed ledger, but the relevant pitch for MIP-26 is **not** aggregation — it's that every GETKINETIK node has a hardware-sealed Ed25519 identity and a hash-chained uptime log you can verify in one POST:

POST https://getkinetik.app/api/verify-device
→ { valid, nodeId, pubkey, mintedAt, ... }

GPS spoofing is your fraud problem; independent device attestation is the bureau-shaped complement to whatever data-quality scoring you run in-network.

If Hivemapper ever wants to weight or reward verified hardware differently, that's your policy call — we supply the attestation input, not the payout curve.

Happy to take questions here or at eric@outfromnothingllc.com.

— Eric (Kinetik_Rick)
getkinetik.app
```

---

## WeatherXM

### Discord DM / email

**Subject:** GETKINETIK × WeatherXM — Neutral device attestation (verify webhook)

```
Hey WeatherXM team,

I'm Eric (Kinetik_Rick), founder of GETKINETIK — the independent trust layer for DePIN (hardware-signed node identity + public methodology; we never issue a token — see NEUTRALITY.md).

WeatherXM cares about ground-truth data quality. We provide ground-truth **device** truth: one POST to our webhook confirms the operator's phone-class node is a real device with a continuous signed chain.

POST https://getkinetik.app/api/verify-device
Body: { "proofUrl": "<Proof of Origin URL>" }

Optional policy layer: if you ever pay verified operators differently, that's your economics — we stay neutral on payout curves.

Live testing — no agreement required:
curl -X POST https://getkinetik.app/api/verify-device \
  -H 'Content-Type: application/json' \
  -d '{"proofUrl":"<user_proof_url>"}'

eric@outfromnothingllc.com

— Eric (Kinetik_Rick)
GETKINETIK · getkinetik.app
```

---

## Geodnet

### Discord DM / email

**Subject:** GETKINETIK × Geodnet — GNSS operator device attestation

```
Hey Geodnet team,

I'm Eric (Kinetik_Rick), founder of GETKINETIK — independent trust layer for DePIN (neutral bureau framing; charter on our repo).

Geodnet integration is on our roadmap for multi-network reads; the pitch that matters for you is **GNSS-adjacent fraud**: independent proof that an operator's device is real hardware with a signed uptime record.

POST https://getkinetik.app/api/verify-device
→ cryptographic validity + identity fields

If Geodnet wants to use that signal next to your own vetting — reward weighting, fraud screening, enterprise SLAs — that's your policy. We publish attestation; we don't grade Geodnet differently for money.

Webhook is live today.

eric@outfromnothingllc.com

— Eric (Kinetik_Rick)
GETKINETIK · getkinetik.app
```

---

## Nodle

### Discord DM

```
Hey Nodle team,

I'm Eric (Kinetik_Rick) — GETKINETIK ships Nodle in-app today (NODL flows into our signed ledger alongside other networks).

I'm re-opening with **bureau framing**, not the old "aggregator premium" pitch: we're the independent trust layer — neutral device attestation, no token, no equity in graded networks (NEUTRALITY.md).

Nodle already told us the premium idea wasn't a fit for your genuity model; understood. The verification primitive still stands: POST /api/verify-device proves hardware-backed identity for any partner who wants it, without asking Nodle to change rewards.

If technical or BD wants a 15-minute walkthrough of the webhook + charter, I'm here.

eric@outfromnothingllc.com

— Eric (Kinetik_Rick)
getkinetik.app
```

---

## Follow-up schedule

| Partner    | Follow up if no response by |
| ---------- | -------------------------- |
| DIMO       | May 14, 2026               |
| Hivemapper | May 14, 2026               |
| WeatherXM  | May 21, 2026 (send ASAP)   |
| Geodnet    | May 21, 2026 (send ASAP)   |
| Nodle      | Parked — hard no           |

---

## Key facts for all outreach

- **Live webhook:** `POST https://getkinetik.app/api/verify-device`
- **Verification is fast** — suitable for inline reward pipelines
- **No auth required** — test before any agreement
- **Source code:** https://github.com/Ricolax310/GetKinetik
- **App download:** https://github.com/Ricolax310/GetKinetik/releases/latest
- **Public verifier:** https://getkinetik.app/verify/
- **Neutrality charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
- **Privacy charter:** https://github.com/Ricolax310/GetKinetik/blob/main/PRIVACY.md
- **Network metrics:** https://getkinetik.app/metrics/

*Templates v5 — May 2026. Supersedes v4 (verified-user premium / aggregator lead).*
