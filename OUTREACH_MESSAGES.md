# GETKINETIK — Ready-to-Send Outreach Messages

Copy-paste these directly into Discord DMs, Telegram, or Twitter/X.
Keep them short. Get on a 15-minute call. Send `PITCH.md` as a follow-up.

> **Positioning (bureau, not aggregator):** GETKINETIK is the **independent trust layer for the decentralized physical economy** — a neutral hardware-attested record of node identity and uptime. We sit outside every network. We never issue a token. We never hold equity in any graded network. We publish a `verify-device` API any partner can call to confirm a user's device is real, signed, and well-graded. Think Carfax for DePIN nodes. See [`NEUTRALITY.md`](./NEUTRALITY.md) for the immutable charter.
>
> **Discord public channels:** Labels like **Discord DM** mean a **private message** to a mod, admin, or partnerships contact — **not** a long intro in `#dev-api` (or similar) with bare links. Many DePIN servers run AutoMod that **blocks unknown domains** (including `getkinetik.app`) and can **timeout** repeat attempts. For public channels, use the **no-link** variant in each section, then send the full link in DM or email once someone replies.

---

## DIMO

**Bureau angle:** vehicle-telemetry simulators and emulator fleets are a known cost on every connected-car DePIN. A neutral bureau grades the device that signed the data, separately from DIMO grading the data itself.

### Discord DM (to BD/partnerships admin)
```
Hey — I built something that may be useful to the DIMO team.

GETKINETIK is the independent trust layer for the decentralized physical economy — think Carfax for DePIN nodes. We sit outside every network and grade the device, not the data. Every node we see has a hardware-sealed Ed25519 identity and a hash-chained uptime log. We publish a `verify-device` webhook: one POST returns valid/invalid + device age + heartbeat count + a Genesis Score (our public reputation grade).

We never issue a token, never hold equity in a graded network, and never accept payment in a graded network's native asset. The neutrality is the moat — same shape as a credit bureau or rating agency.

For DIMO specifically: a neutral attestation that a connected-car operator's reporting device is real hardware (not an emulator or a script) is something nobody else is positioned to provide. You decide what to do with the score; we just publish it.

15 minutes with whoever handles integrations or partnerships?

Site: https://getkinetik.app
Webhook docs: https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md
Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
```

### Twitter/X DM
```
Hey @DIMO_Network — I built the independent trust layer for DePIN. Hardware-attested device identity + a verify-device webhook your backend can call to grade the device behind the data. No token, no equity in graded networks — same shape as Carfax. 15-min call? getkinetik.app
```

---

## Hivemapper

**Bureau angle:** GPS spoofers are an open problem (MIP-26 is on the table). Hivemapper grades the *map data*; nobody independently grades the *device* that submitted it. That's the bureau slot.

### Discord DM (post in #mip-26 or DM a mod)
```
Hey — contributing to the MIP-26 conversation here.

I built GETKINETIK, the independent trust layer for DePIN. Carfax-shaped: we sit outside every network and grade the device, not the data. Every node carries a hardware-sealed Ed25519 identity and a hash-chained uptime log. Our verify-device webhook returns valid/invalid + device age + Genesis Score in one POST.

We never issue a token. We never hold equity in any network we grade. We never accept payment in graded networks' native tokens. The neutrality is the moat — that's why the bureau pitch works regardless of which way MIP-26 lands.

For Hivemapper: a neutral grade on whether a mapper's device is real hardware (not a spoofer rig, not an emulator) sits cleanly *next to* whatever data-quality scoring you're already doing. You don't have to grade your own users. We do — independently.

App is live on Android. Webhook is live. No SDK required on your side.

15 minutes with your integrations team?

https://getkinetik.app
Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
```

### Twitter/X DM
```
@Hivemapper — built an independent trust layer for DePIN. Hardware-signed device identity + verify-device webhook tells you if a mapper's device is real, separate from how you grade the data. No token, no equity in graded networks. Carfax-shaped. 15 min? getkinetik.app
```

---

## WeatherXM

**Bureau angle:** WXM shipped dedicated hardware to dodge the device-fraud problem. A neutral bureau grading any phone-based contributor (Helium-WXM cross-stake, M5 reporters, future BYO modules) gives you fraud signal without the BOM cost of more proprietary hardware.

### Discord — public channel (#dev-api, etc.) — **no links**
AutoMod on WeatherXM blocked bare `getkinetik.app` URLs (timeout risk). Use this in **#dev-api** only; put URLs in DM after someone engages.

```
Hey — I'm building GETKINETIK, the independent trust layer for the decentralized physical economy. Carfax-shaped: we sit outside every DePIN network, never issue a token, never hold equity in any network we grade, and we publish a verify-device webhook that returns hardware-attested device identity + age + a public reputation grade.

For WeatherXM: an independent grade on the device behind a contribution is something nobody else is positioned to provide. You'd plug it in next to your data-quality stack, not on top of it.

Who should I DM for a 15-min API / data-quality chat? Happy to send docs link there — AutoMod blocks my domain in-channel.
```

### Discord DM (private message to mod / BD / team — **full pitch OK**)
```
Hey — quick intro. I built GETKINETIK, the independent trust layer for the decentralized physical economy.

Bureau-shaped, like Carfax for DePIN nodes:
  · Every node carries a hardware-sealed Ed25519 identity (sealed in the phone's secure enclave).
  · Every uptime claim is hash-chained and signed.
  · We publish a verify-device webhook: POST a proof, get valid/invalid + device age + Genesis Score.
  · No token. No equity in graded networks. No payment in graded networks' native assets. Public methodology.

For WeatherXM: a neutral attestation about the device behind a contribution is exactly the slot a credit bureau fills — independent grading you don't have to build yourself, sitting alongside your existing data-quality work without competing with it. Useful for any phone-class contributor (cross-stake operators, future BYO modules, app-side reporters).

App is live on Android. Webhook is live.

15 minutes?

Site: https://getkinetik.app
Webhook spec: https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md
Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
```

### Telegram DM (if WeatherXM team is on Telegram)
```
Hi — I built GETKINETIK, the independent trust layer for DePIN (Carfax for nodes). Hardware-signed device identity + verify-device webhook your backend can call to confirm a contributor's device is real. We never issue a token and never hold equity in graded networks — the neutrality is the product. Would love 15 min with your team. https://getkinetik.app
```

---

## Nodle

**Where to go (Nodle Discord):** `#create-a-ticket` is **read-only** with buttons — and the pinned bot message says **no partnership requests in tickets**; non-support tickets get **closed**. For BD / integration / partnership inquiries they tell you to **DM `@Community Manager`**. Use **`#developers-chat`** only for casual dev discussion, not as a substitute for that DM.

**Bureau angle:** Nodle's earlier "not a fit for our genuity model" reply was correct for an aggregator pitch — the bureau pitch is orthogonal. We don't ask Nodle to integrate anything, change rewards, or add a tier. We just grade the device, publish the score, and let any third party (lender, insurer, foundation, future regulator) consume it. Nodle benefits passively when its operators show up well in independent grading.

### Discord DM (to @Community Manager — partnership / integration)
```
Hey Nodle team — circling back from a few weeks ago, with a sharper framing.

You said the bureau didn't fit because Nodle already has a genuity check (collected NODL, holder rank, click + DAO participation). That feedback was correct — and it pushed me to write a public response to exactly that objection:

  https://getkinetik.app/bureau/why/

The short version: a bureau is not a replacement for your genuity check; it's a different shape. Same reason a bank's internal risk model doesn't replace a credit bureau. Five points: neutrality, cross-network signal, cryptographic root, regulatory shape, zero ops cost on your team.

What's new since last time:
  · Genesis Score v1.1 is live — bureau-bound chain age + beat-rate sanity + chain-rewind hard gate. Three attack vectors closed since v1.0.
  · Public live telemetry at getkinetik.app/bureau/ (verifications served, tamper flags caught, distribution by band).
  · OpenAPI 3.1 + Postman collection at getkinetik.app/api/docs/. Hit "Try" on any endpoint live.
  · @getkinetik/verify on npm — partners can verify proofs offline with zero calls back to us.

Still: never a token, never equity in any graded network, never payment in graded networks' native assets. Same charter.

If the framing in /bureau/why/ doesn't land after a quick read, the bureau genuinely isn't a fit for Nodle and I won't follow up. If it does, 15 minutes.

https://getkinetik.app · https://getkinetik.app/bureau/why/
Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
```

---

## Geodnet

**If Discord invite fails:** Use **`https://support.geodnet.com/`** (ticket — best for BD/integration). Telegram group **`t.me/geodnet`** ("GEODNET Official") is official; **`#Official Team`** is often **staff-only** — do not spam there if you cannot post. Use **`#General Chat`** for a **one-line** "who handles integrations / partnerships?" or send the **Telegram DM** below to a **public** team contact if they list one.

**Bureau angle:** GNSS spoofing is the highest-stakes device-fraud problem in DePIN — a single spoofer can corrupt downstream surveying, autonomous-vehicle calibration, and high-precision mapping. Independent device attestation is exactly the kind of primitive a bureau exists to provide.

### Discord/Telegram DM
```
Hi — I'm Eric, building GETKINETIK, the independent trust layer for the decentralized physical economy.

Carfax-shaped: we sit outside every DePIN, grade the device, never issue a token, never hold equity in any network we grade, never accept payment in graded networks' native assets. Public methodology. The neutrality is the moat.

For Geodnet specifically: GNSS spoofing is exactly the kind of device-fraud problem a neutral bureau is structurally positioned to grade. We never touch your reward economy or your data pipeline — we just attest, in one webhook call, that a given node's device is real hardware with a continuous signed uptime record.

You'd plug verify-device next to your existing operator vetting, not on top of it. I'd love 15 minutes with your integrations or BD team.

https://getkinetik.app
Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
```

---

## General Cold DM (for any new network)
```
Hi — I'm Eric, building GETKINETIK (getkinetik.app), the independent trust layer for the decentralized physical economy. Carfax-shaped, bureau-shaped.

We sit outside every DePIN network and grade the device behind every node. Hardware-sealed Ed25519 identity, hash-chained uptime log, public verifier, and a verify-device webhook that returns device age + heartbeat count + Genesis Score (our public reputation grade) in one POST.

Why we can credibly grade: we never issue a token, never hold equity in any graded network, never accept payment in graded networks' native assets, and our methodology is publicly versioned. The neutrality is the entire moat — same structural rule that makes Equifax / Carfax / S&P credible.

15 minutes with whoever handles integrations or BD?

Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
Webhook: https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md
```

---

## Adjacent buyers (lenders, insurers, exchanges, foundations)

The bureau pitch isn't only for DePIN networks — it's also for any party that needs to read DePIN ground truth without owning the network. Use these when the conversation isn't with a network.

```
Hi — I'm Eric, building GETKINETIK, the independent trust layer for the decentralized physical economy. Equifax-shaped — we sit outside every DePIN network, attest the device, and publish.

For [lender / insurer / exchange / foundation / auditor / regulator]: there is no neutral source today that can tell you, with cryptographic proof, whether a given DePIN node is a real device with a continuous uptime record. Networks can't credibly grade themselves. We can — by structural design (no token ever, no equity in graded networks, no payment in their native assets, public methodology).

Use cases I'd want to walk you through in 15 minutes:
  · Underwriting hardware loans against DePIN earning streams
  · Insuring against fake-node fraud at the network level
  · Independent attestation of network health for foundation reporting
  · Pre-listing diligence on a DePIN token's actual operator base

Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md
Site: https://getkinetik.app
```

---

## Getting on a Phone Call — What to Say When They Respond

**If they say "tell me more":**
> "Here's a one-pager: [paste PITCH.md contents or link to getkinetik.app]. The short version: we're the independent trust layer for DePIN — Carfax-shaped, never a token, never equity in any network we grade. Your network's operators get graded by a neutral third party, you get fraud signal without building it, and external parties (lenders, foundations, regulators) get a credible source to read your network ground truth from. When's a good time for 15 minutes?"

**If they push back with "we don't need a third party to grade our users":**
> "Totally fair — that's the default position today. I actually wrote a one-page response specifically for this objection: **getkinetik.app/bureau/why/**. Five reasons in plain language why a bureau is structurally different from a DIY check (cross-network signal, regulatory shape, cryptographic root, zero maintenance, hardware-rooted neutrality). If those reasons don't land after a quick read, the bureau isn't for you and I won't follow up. If they do, 15 minutes."

**If they say "send us an email":**
> Subject: GETKINETIK × [Network] — Independent Trust Layer
> Body: Use the PARTNER_EMAILS.md template for their network (bureau framing, not aggregator).

**If they ask for a demo:**
> "Absolutely. Two options — pick whichever your team prefers:
> 1) Open **getkinetik.app/api/docs/** in a browser and hit *Try* on any endpoint live against production (full OpenAPI 3.1, no signup, no key needed for verify or score lookup). Or
> 2) 15-min screen share: I mint a Proof of Origin live in the app, scan it with a clean second device, walk you through the verify-device response (Genesis Score + tamper flags + methodology version), and show the neutrality charter. Google Meet, Discord, or Telegram — your preference. When works?"

**If they ask "are you a token?" / "is Genesis Score a token?":**
> "No. The charter (`NEUTRALITY.md`) explicitly forbids issuing any token, point system with monetary value, or financial wrapper — including soulbound/wrapped versions of Genesis Score itself. Genesis Score is a public reputation grade *about a node*, not a currency. It's non-transferable, never priced, and never redeemable. That's the entire moat — we can't be a credible bureau if our own grade is a tradable asset."

---

## Priority Order for Outreach (this week — 2026-05-13)

**As of 2026-05-13, the bureau is live end-to-end.** Strongest opener for
every message below — pick the half-sentence that matches the contact:

> *Quick update: the GETKINETIK Bureau is now live end-to-end —
> Genesis Score v1.1 (hardware-bound, three attack gates), public
> live-ticker telemetry at **getkinetik.app/bureau/**, OpenAPI 3.1 + Postman
> at **getkinetik.app/api/docs/**, partner attestation channel, and the
> verifier published on npm (`@getkinetik/verify`). A real bureau has to
> be verifiable by partners who don't trust it — that's what we shipped,
> and it's what makes the rest of this pitch worth your 15 minutes.*

If the prospect has previously said "we already grade our own users," lead
with this instead and append the link:

> *Position paper on why a neutral third-party score is structurally
> different from your own genuity check — short, no jargon:
> **getkinetik.app/bureau/why/**. If the framing doesn't land, the bureau
> isn't for you, and no follow-up needed. If it does, 15 minutes?*

Lead with one of those paragraphs (or a tighter variant) on every send this week.
The **send-list** with specific contacts, channels, days, and follow-up
triggers lives in [`OUTREACH_SENDLIST.md`](./OUTREACH_SENDLIST.md) —
this file is just the message library.

Priority order for this week's sends:

1. **Twitter Thread 4** (the npm publish moment) — tonight, pinned
2. **DePIN investor DMs** (Multicoin / Borderless / Onchainy) — tonight, one-liner
3. **Hivemapper** — Wed AM, MIP-26 angle is still live
4. **DIMO** — Wed PM, reply to existing `grants@dimo.zone` thread with npm update
5. **Geodnet** — Thu AM, support ticket + Telegram (GNSS fraud is the sharpest pitch)
6. **WeatherXM** — Thu PM, DM first (AutoMod blocks our domain in-channel)
7. **Nodle** — Fri AM, bureau-reframe DM to @Community Manager
8. **First adjacent buyer** (DePIN lender) — Fri PM, lender-flavored variant

See [`OUTREACH_SENDLIST.md`](./OUTREACH_SENDLIST.md) for the full sequence,
bump rules, reply triggers, and "reawaken later" queue.
