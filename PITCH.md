# GETKINETIK — Partner Pitch (One Page)

**The 30-second version:**
GETKINETIK is a DePIN earnings aggregator that runs on Android. It aggregates Nodle, DIMO, Hivemapper, WeatherXM, and Geodnet into one signed ledger. Every device is identified by a hardware-sealed Ed25519 key — one phone, one node, one unforgeable identity. We built a webhook so partner networks can verify user authenticity in one API call and offer verified-user reward boosts.

---

## What We Built

| Layer | What It Does |
|---|---|
| **Sovereign Identity** | Ed25519 keypair generated and sealed in the device's secure enclave on first activation. Never leaves the device. |
| **Hash-Chained Heartbeats** | Every 30 seconds, the node signs a statement and chains it to the previous one. Tamper-evident uptime log. |
| **Multi-Network Aggregation** | 5 DePIN adapters (Nodle, DIMO, Hivemapper, WeatherXM, Geodnet) unified under one signed ledger. |
| **Optimizer Engine** | Real-time CoinGecko prices + gas feeds. Ranks all pending claims by USD yield. Tells users exactly when to claim. |
| **Proof of Origin** | A signed certificate (schema v:2) carrying node ID, heartbeat count, chain tip, sensor readings, and Ed25519 signature — scannable QR, verifiable by anyone. |
| **Genesis Credits** | Internal loyalty score (NOT a token). 2× rate for early adopters. Tracks uptime, heartbeats, and network connections. |
| **Partner Webhook** | `POST /api/verify-device` — one call returns valid/invalid + node age + heartbeat count. Zero SDK dependency. |

---

## The Partner Value Prop

**Your problem:** Sybil attacks. Fake nodes. GPS spoofers. Revenue bleeds.

**What we offer:** A user population whose devices are cryptographically verified at the hardware level. One GETKINETIK proof = one real device = one real human. Not an email. Not a wallet. A sealed key.

**The integration:** One webhook call. Your backend POSTs the user's proof URL, we return verified + node metadata. You decide to apply a reward boost (5–10% is enough to drive adoption). We never touch your token economy, your chain, or your codebase.

**Why it works for both sides:**
- Users earn more by running GETKINETIK → they use GETKINETIK more
- You get Sybil resistance without building it → your reward pool is cleaner
- Neither side holds the other's keys

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
