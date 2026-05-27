# GETKINETIK — Partner Pitch (One Page)

**The 30-second version:**
GETKINETIK is the **neutral DePIN bureau — your friendly helper, not your gatekeeper.** We publish signed evidence about devices (chain continuity, bureau-observed facts, sensor coherence, flags). Networks keep their own verifiers; we’re the **trust sanity check** — one `verify-device` call to confirm what you already think before payout, or a public sample read on open data when you’re not integrated yet. Think Carfax-shaped helper for node trust: no token, no equity in graded networks ([`NEUTRALITY.md`](./NEUTRALITY.md)), methodology public, offline verifier on npm.

---

## What We Built

| Layer | What It Does |
|---|---|
| **Sovereign Identity** | Ed25519 keypair generated and sealed in the device's secure enclave on first activation. Never leaves the device. |
| **Hash-Chained Heartbeats** | Every 30 seconds, the node signs a statement and chains it to the previous one. Tamper-evident uptime log. |
| **Multi-Network Read** | 5 DePIN adapters (Nodle, DIMO, Hivemapper, WeatherXM, Geodnet) under one signed receipt log — optional operator convenience; we *read*; we never custody. |
| **Operator Tooling (optional)** | Gas-aware claim timing and shared polling pool for operators who want it — not a product headline. |
| **Proof of Origin** | A signed certificate (schema v:2) carrying node ID, heartbeat count, chain tip, sensor readings, and Ed25519 signature — scannable QR, verifiable by anyone, in any browser, with no server call. |
| **Genesis Score** | Public node reputation grade (NOT a token, NOT transferable, NEVER priced). Like Equifax for sovereign nodes — partners read it via the verify API to inform premium offers. |
| **Partner Verification API** | `POST /api/verify-device` — one call returns valid/invalid + node age + heartbeat count + Genesis Score. Zero SDK dependency. Free during preview; paid tiers (USD/USDC) for production volume. |
| **Offline verifier (npm)** | [`npm i @getkinetik/verify`](https://www.npmjs.com/package/@getkinetik/verify) — drop the same byte-for-byte cryptographic contract into your own backend. **No network call to us.** 27/27 smoketests enforced before every publish. The bureau is independently verifiable, by design. |
| **Neutrality Charter** | Public commitment: no token, no equity in graded networks, no exclusive partnerships, all revenue in fiat. See [`NEUTRALITY.md`](./NEUTRALITY.md). |

---

## The Partner Value Prop

**Your problem:** Sybil attacks. Fake nodes. GPS spoofers. Hardware fraud. You can't grade your own users without conflict, and there is no neutral third party that can grade them for you. Today.

**What we offer:** A neutral trust layer that grades every node it sees. One `verify-device` call returns: valid signature, device age, uptime, attestation count, and a Genesis Score (the bureau's reputation grade). Like calling Equifax before issuing a credit card, or Carfax before buying a used car.

**The integration:** One HTTP POST. Your backend hits `/api/verify-device` with the user's proof URL, we return JSON. You decide what to do with it — pay verified users a 5–15% premium, gate access, weight rewards, anything. **We never touch your token economy, your chain, or your codebase. We're not a competitor. We're infrastructure.**

**Why it works for both sides:**
- Users get verified-user premiums on networks that opt in → they have a reason to keep running GETKINETIK and earning across networks
- You get hardware-attested Sybil resistance without building it → your reward pool is cleaner without you having to grade your own users
- A neutral third party graded the user, not you — so partners, auditors, and capital can independently verify your network metrics
- We never hold tokens, never have equity in your network, never compete for users' attention. Pure infrastructure.

---

## Traction

- Android app live (sideload APK via GitHub Releases)
- Proof of Origin verified by external iPhone scanner → returned VALID
- Hash-chained heartbeat log running on real hardware
- 5 adapter packages built, production-ready pending partner API access
- Optimizer engine live in codebase (`packages/optimizer/`)
- Cloudflare Pages deployment at **getkinetik.app**
- Verify webhook live at **getkinetik.app/api/verify-device**
- **`@getkinetik/verify` v0.1.0 on npm** (`npm i @getkinetik/verify`) — partners can verify proofs without ever calling our infrastructure

---

## Tech Stack

React Native (Expo) · TypeScript · Ed25519 (`@noble/ed25519`) · Cloudflare Pages + Workers · Cloudflare KV · Android (iOS after Android)

---

## The Ask

**A 15-minute call.** That's it.

We want to show you the Proof of Origin live, walk you through the verify-device webhook, and discuss what a verified-user reward tier would look like on your network. No commitment. Just a conversation.

**Contact:** Eric (Kinetik_Rick)
**Email:** eric@outfromnothingllc.com
**Site:** https://getkinetik.app
**Docs:** https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md
**App:** https://github.com/Ricolax310/GetKinetik/releases/latest

---

*GETKINETIK is a product of OutFromNothing LLC (California). All IP assigned. Not affiliated with any DePIN network unless explicitly stated.*
