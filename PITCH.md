# GETKINETIK — Partner Pitch (One Page)

**The 30-second version:**
GETKINETIK is the **independent trust layer for the decentralized physical economy** — a neutral, hardware-attested record of node identity, uptime, and earnings across DePIN networks. We sit outside every network, we never issue a token, we never take equity in graded networks (see [`NEUTRALITY.md`](./NEUTRALITY.md)), and we publish a `verify-device` API any partner can call to confirm a user's device is real, signed, and well-graded before paying out a reward. Think Carfax for DePIN nodes, with a developer-grade API for verified-user premium offers.

---

## What We Built

| Layer | What It Does |
|---|---|
| **Sovereign Identity** | Ed25519 keypair generated and sealed in the device's secure enclave on first activation. Never leaves the device. |
| **Hash-Chained Heartbeats** | Every 30 seconds, the node signs a statement and chains it to the previous one. Tamper-evident uptime log. |
| **Multi-Network Read** | 5 DePIN adapters (Nodle, DIMO, Hivemapper, WeatherXM, Geodnet) unified under one signed ledger. We *read*; we never custody. |
| **Optimizer Engine** | Real-time CoinGecko prices + gas feeds. Ranks all pending claims by USD yield. Tells users exactly when to claim. |
| **Proof of Origin** | A signed certificate (schema v:2) carrying node ID, heartbeat count, chain tip, sensor readings, and Ed25519 signature — scannable QR, verifiable by anyone, in any browser, with no server call. |
| **Genesis Score** | Public node reputation grade (NOT a token, NOT transferable, NEVER priced). Like Equifax for sovereign nodes — partners read it via the verify API to inform premium offers. |
| **Partner Verification API** | `POST /api/verify-device` — one call returns valid/invalid + node age + heartbeat count + Genesis Score. Zero SDK dependency. Free during preview; paid tiers (USD/USDC) for production volume. |
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

*GETKINETIK is a product of OutFromNothing LLC. All IP assigned. Not affiliated with any DePIN network unless explicitly stated.*
