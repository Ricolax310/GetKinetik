# GETKINETIK — System Architecture

> **Audience:** M&A due-diligence teams, partner integrators, new engineers.
> Everything in this document is auditable against the source code.

---

## Overview

GETKINETIK is a **DePIN earnings aggregator** — a Sovereign Node running on a user's smartphone that simultaneously participates in multiple decentralised physical infrastructure networks and optimises the user's yield across all of them.

The architecture is a four-layer stack:

```
L1  Sovereign Identity + Trust Primitives
L2  Sensor Attestation
L3  DePIN Adapter + Optimizer Engine
L4  Sovereign Earnings Wallet
```

Each layer is independent. You can audit L4 without understanding L3. You can verify a Proof of Origin from L1 without running the app.

---

## Layer 1 — Sovereign Identity

**Package:** `packages/kinetik-core/src/identity.ts`

Every node generates an Ed25519 keypair on first launch, stored in hardware-backed SecureStore (Android Keystore / iOS Secure Enclave on supported devices). The keypair never leaves the device.

```
Node ID:       KINETIK-NODE-{8-char-hex-fingerprint}
Wallet address: kn1{base32(sha256("kinetik-wallet-v1" || pubkey))[0:32]}
Nodle address:  SS58(pubkey, prefix=37) — same key, different encoding
```

**Why one key?** Plaid model. One identity, multiple network representations. No new secrets to back up.

**Public verifier:** `https://getkinetik.app/verify/` — any Proof of Origin can be verified by anyone, without authentication, using only the public key embedded in the proof.

---

## Layer 1 — Hash-Chained Heartbeat Log

**Package:** `packages/kinetik-core/src/heartbeat.ts`

Every 60 seconds, the app signs a heartbeat payload:

```json
{
  "v": 2,
  "kind": "heartbeat",
  "nodeId": "KINETIK-NODE-A3F2B719",
  "pubkey": "<64-char hex>",
  "seq": 1204,
  "ts": 1714000000000,
  "prevHash": "<16-char hex>",
  "sensors": { "accel_rms": 0.12, "baro_hpa": 1013.2 },
  "attribution": "GETKINETIK by OutFromNothing LLC"
}
```

Each heartbeat includes the SHA-256 truncated hash of the previous one, forming a tamper-evident chain. Any gap or alteration in sequence is detectable.

**Key invariant:** `attribution` is baked into every signature. Stripping the attribution breaks the signature — there is no way to remove GETKINETIK's branding from a signed artifact without invalidating it.

---

## Layer 1 — Proof of Origin

**Package:** `packages/kinetik-core/src/proof.ts`

A Proof of Origin (PoO) is a signed snapshot of the node's identity and heartbeat chain at a moment in time:

```json
{
  "v": 2,
  "kind": "proof-of-origin",
  "nodeId": "KINETIK-NODE-A3F2B719",
  "pubkey": "<64-char hex>",
  "mintedAt": 1714000000000,
  "lifetimeBeats": 1204,
  "sensorSummary": { ... },
  "attribution": "GETKINETIK by OutFromNothing LLC"
}
```

The PoO is base64url-encoded and shared as a URL: `https://getkinetik.app/verify/#proof=<b64url>`. Anyone can verify it instantly in the browser or via the `/api/verify-device` webhook.

---

## Layer 2 — Sensor Attestation

**Package:** `packages/kinetik-core/src/sensors.ts`

The accelerometer and barometer are sampled on a background interval. The canonical sensor block is:

```json
{
  "accel_rms": 0.12,
  "accel_max": 0.45,
  "baro_hpa": 1013.2,
  "sampledAt": 1714000000000
}
```

This data is attached to heartbeats and available to DePIN adapters that require it (e.g. a future motion-based proof for a mobility network). It is never transmitted raw — only aggregated canonical blocks are signed.

---

## Layer 3 — DePIN Adapter Contract

**Package:** `packages/kinetik-core/src/adapter.ts`

Every DePIN integration implements the `DepinAdapter` interface:

```typescript
interface DepinAdapter {
  readonly id: string;          // stable lowercase — never rename after launch
  readonly displayName: string;
  readonly currency: string;
  readonly rateMetadata?: AdapterRateMetadata;  // optimizer pricing hint

  isAvailable(): Promise<boolean>;
  getStatus(): Promise<AdapterStatus>;
  register(identity: NodeIdentity): Promise<AdapterStatus>;
  unregister(): Promise<void>;
  pollEarnings(): Promise<EarningSnapshot>;
  claim?(): Promise<{ gross: number; externalRef: string } | null>;
  attest?(beat: SignedHeartbeat): Promise<void>;
}
```

**Current adapters:** Nodle, DIMO, Hivemapper, WeatherXM, Geodnet.

Adding a new DePIN = drop a new package that satisfies this interface, register it in the adapter list. No changes to the aggregator UI required.

---

## Layer 3 — Optimizer Engine

**Package:** `packages/optimizer/`

The L3 optimizer sits between the adapters and the UI:

```
Adapters → PollingPool → EarningSnapshots → Scorer → Recommendations
                                    ↓
                          PriceFeed (CoinGecko)
                          GasFeed (Polygon + Base RPC)
```

**Three real optimisations:**

1. **Gas-aware claim timing** — only triggers `claim()` when `pendingUsd > gasCostUsd × 5`. Saves 15–30% per claim cycle.
2. **Shared polling pool** — one scheduler for all 5 adapters vs. 5 independent timers. ~30% less battery.
3. **Network discovery** — surfaces adapters the device qualifies for but isn't using.

---

## Layer 4 — Sovereign Earnings Wallet

**Package:** `packages/kinetik-core/src/wallet.ts`

Every earning event is signed:

```json
{
  "v": 1,
  "kind": "earning",
  "nodeId": "KINETIK-NODE-A3F2B719",
  "pubkey": "<64-char hex>",
  "source": "nodle",
  "externalRef": "nodle:lifetime:12.347:1714000000",
  "currency": "NODL",
  "gross": 12.347,
  "fee": 0.123,
  "net": 12.224,
  "ts": 1714000000000,
  "prevHash": "<16-char hex>",
  "attribution": "GETKINETIK by OutFromNothing LLC"
}
```

The 1% protocol fee is **baked into the signature**. Altering the `fee` field invalidates the Ed25519 signature — there is no way to strip the fee post-signing.

**Premium receipts (v1.5):** When a partner activates the verified-user premium, earnings also carry `standardRate`, `premiumRate`, and `premiumBasisPoints` — all signed. Partners can verify the premium portion is correctly recorded.

---

## Cloud Infrastructure

**Host:** Cloudflare Pages (static site + Pages Functions)
**KV namespaces:**
- `WAITLIST` — waitlist signups
- `KINETIK_KV` — Genesis Credits backup, node metrics

**API endpoints:**
- `POST /api/waitlist` — waitlist signup
- `POST /api/verify-device` — public partner verification webhook
- `POST /api/credits` — Genesis Credits KV sync

---

## Security Model

- Private keys never leave the device (hardware-backed SecureStore)
- All signed artifacts use Ed25519 (128-bit security level)
- Attribution constant in every signature = tamper-evident ownership
- Public verifier = anyone can audit without trusting GETKINETIK
- No custody of tokens — GETKINETIK signs receipts; networks move tokens

See `docs/cryptography.md` for the full signing contract.

---

## Codebase Map

```
packages/
  kinetik-core/     L1 + L4 primitives (identity, heartbeat, proof, wallet)
  optimizer/        L3 optimizer (price feed, gas feed, scorer, discovery, pool)
  credits/          Genesis Credits engine
  adapter-nodle/    Nodle adapter
  adapter-dimo/     DIMO adapter
  adapter-hivemapper/ Hivemapper adapter
  adapter-weatherxm/  WeatherXM adapter
  adapter-geodnet/    Geodnet adapter

src/
  components/       App UI (VaultPanel, AggregatorPanel, OptimizationReport, ...)
  theme/            palette + typography

landing/
  index.html        getkinetik.app landing page
  verify/           Public proof verifier
  dimo-callback/    DIMO OAuth bounce page
  metrics/          Public metrics dashboard (coming v1.5)

functions/api/
  waitlist.js       Cloudflare Function — waitlist
  verify-device.js  Cloudflare Function — partner verification webhook
  credits.js        Cloudflare Function — Genesis Credits KV sync
```
