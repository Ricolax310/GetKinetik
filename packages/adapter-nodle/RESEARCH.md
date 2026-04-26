# Nodle Adapter — Research

> **Session A output.** No adapter code. Five questions from `AGGREGATOR.md` answered with sources.
> Research date: 2026-04-25. SDK latest: Android v0.0.25 (Sep 2025), iOS v0.0.24-night (Apr 2025).

---

## Q1 — Does Nodle expose a third-party SDK that can run inside a non-Nodle Android app?

**Yes — native SDKs exist. No React Native / Expo wrapper exists.**

Nodle ships two native SDKs:

| Platform | Distribution | Latest version |
|---|---|---|
| Android | Maven (`maven.nodle.io`), Gradle dep | `94207dd00f` (v0.0.25, Sep 2025) |
| iOS | CocoaPods from `NodleCode/NodleSDK-Release` on GitHub | `0.0.24-night` (Apr 2025) |

The Android SDK is a standard Gradle dependency. Embed it in any Android app (min API 19, max API 31), initialize it in your `Application` class, call `Nodle().start("ss58:PUBLIC_KEY")`, and the SDK starts scanning BLE in the background, contributing to the Nodle network and accruing NODL to the supplied address.

**There is no npm package and no official React Native wrapper.** GitHub issue [#3 on NodleCode/NodleSDK-Release](https://github.com/NodleCode/NodleSDK-Release/issues) (opened Nov 2023) requests React Native / Expo support; it remains open and unresponded to as of this research. No community bridge package was found on npm either.

**What this means for GETKINETIK:** GETKINETIK is React Native (Expo SDK 54). To use the Nodle SDK we must write an **Expo native module** — a Kotlin file that wraps `io.nodle.sdk.android.Nodle` and exposes start/stop/status/getEvents to the JS layer, plus an equivalent Swift wrapper for iOS. This is a real but bounded engineering task (estimate: 1–2 days to get a working bridge with start/stop and an event stream). It is not a blocker; it is a prerequisite.

The SDK is actively maintained (Sep 2025 release), which is a positive signal on longevity.

---

## Q2 — License terms, attribution requirements, key/identity model

### License

Nodle publishes an [EULA at nodle.com/eula](https://www.nodle.com/eula) covering the SDK. It grants a "personal, non-transferable, non-exclusive licence to use the Nodle International software on your devices." The EULA **explicitly prohibits**:

- Incorporating the software into any other software
- Commercial use ("reproduce, copy, distribute, resell or otherwise use the Software for any commercial purpose")
- Allowing any third party to use the software on behalf of or for the benefit of any third party

**This EULA, read literally, would prohibit the GETKINETIK integration.**

However, the EULA is written for consumer end-users of the Nodle Cash App. The SDK documentation simultaneously markets embedding in third-party apps as the **primary and intended use case** ("when a publisher deploys the Nodle SDK into their apps, they collect rewards…"). This contradiction is standard EULA boilerplate vs. an existing publisher / NSP (Nodle Service Provider) program.

**The SDK Dashboard registration** (`sdk.nodle.com`) requires creating an organization account and agreeing to a "data addendum" before use. This is almost certainly the operative publisher agreement — the EULA applies to the consumer app, and the SDK dashboard terms apply to publishers. No publisher terms were publicly accessible without an account.

**Before shipping any code:** register at `sdk.nodle.com`, read the publisher/data-addendum terms, and confirm commercial embedding is covered. Email `partners@nodle.com` if terms need clarification for a revenue-sharing integration. This is a 30-minute task, not a blocker, but it must happen before Session C.

### Attribution requirements

No explicit in-app attribution requirement appears in the public SDK docs. The SDK dashboard dashboard agreement may add requirements — verify at registration.

### Key / identity model

The SDK takes a single argument: `Nodle().start("ss58:PUBLIC_KEY")` where `PUBLIC_KEY` is a Polkadot/Substrate SS58-encoded public key. Whoever's SS58 key is passed **receives all NODL rewards** accrued while the SDK runs on that device.

This is more flexible than it appears. The Nodle Cash App itself passes each user's individual SS58 key — so the SDK does support per-user reward assignment, not only per-publisher. The "developer key" language in the docs reflects the typical publisher pattern (one shared wallet for the whole app), not a technical constraint.

**GETKINETIK's identity model can be made compatible** — see Q5.

---

## Q3 — Is there a deep-link / hand-off flow with the Nodle Cash App?

**No.** No public deep-link protocol, intent filter scheme, or inter-app API was found in any Nodle documentation, blog post, or GitHub repository. The Nodle Cash App is a standalone consumer product with no documented integration surface toward third-party apps. There is no mechanism to:

- Register a user via deep-link and have the Cash App credit them
- Read accrued balance from the Cash App into a third-party app
- Trigger a claim from outside the Nodle Cash App

**Conclusion:** deep-link / hand-off is not a viable integration path. The only integration paths are SDK-embed (Q1) or API-only (Q4).

---

## Q4 — Is there a public API for querying earned NODL by node ID / wallet address without their app?

**Yes — three viable read-only surfaces exist.**

### 1. Substrate JSON-RPC (no auth required)

The Nodle parachain is a standard Substrate chain. Public WebSocket endpoints:

- `wss://nodle-parachain.api.onfinality.io/public-ws` (free, no API key)
- `wss://api-nodle.dwellir.com/` (Dwellir, may require API key for production volume)

Query the NODL balance for any SS58 address:

```javascript
// Using @polkadot/api (or raw JSON-RPC)
const accountInfo = await api.query.system.account(ss58Address);
const freeBalance = accountInfo.data.free; // raw planck units
// Divide by 10^11 to get NODL (Nodle uses 11 decimal places)
```

Rewards are allocated every ~2 hours. The free balance increases without any claim action — SDK-earned NODL lands directly in the wallet automatically.

### 2. Nodle SubQuery GraphQL API

Nodle maintains a SubQuery indexer. Schema and sample queries at [`NodleCode/subquery`](https://github.com/NodleCode/subquery) on GitHub. Managed service endpoints at `https://managedservice.subquery.network/orgs/NodleCode/projects`.

```graphql
query TransactionHistoryByAddress($address: String!) {
  systemTokenTransfers(filter: {
    or: [
      { fromId: { equalTo: $address } }
      { toId: { equalTo: $address } }
    ]
  }) {
    nodes { id fromId toId amount timestamp }
  }
}
```

Also exposes `accountPotBalances`, `vestingSchedules`, and `pots` entities. This is the right surface for lifetime earnings history (vs. current balance from RPC).

### 3. Subscan Explorer

[nodle.subscan.io](https://nodle.subscan.io/account) has a free REST API tier. Useful as a fallback or for displaying exploreable links to users.

**Implementation path for `pollEarnings()`:** call the public Substrate RPC with `system.account(userNodleAddress)`, return `freeBalance` as `pendingGross` and use the SubQuery GraphQL for `lifetimeGross` by summing all inbound transfer `amount` values. Both are read-only, no auth, no key signing needed.

---

## Q5 — Where do the tokens actually go?

**NODL lives on the Nodle Parachain (Polkadot ecosystem, Substrate-based). Not EVM. Not Solana.**

The Nodle Network is Polkadot's Parachain #11, built on Substrate. Token addresses are **SS58-encoded**, with Nodle's own network prefix (addresses appear as 47–48 character strings starting with `4` in the base58 alphabet, e.g. `4iK8ABJyw7pgQY7Di5E35TSSsDcLSrBgQNj8veSm1P5kFHjY`). They are not EVM hex addresses and are not Solana base58 addresses.

### The sovereignty question: do we need a new secret?

**No.** GETKINETIK's existing Ed25519 keypair is cryptographically compatible with Polkadot/Substrate. Substrate natively supports Ed25519 keys alongside sr25519 and ecdsa. The SS58 address is just an encoding of the public key bytes with a network prefix and checksum — the underlying 32-byte key material is identical.

**Address derivation (no new secret):**

```
nodleAddress = ss58Encode(
  networkPrefix: 37,                  // Nodle Chain (confirmed, ss58-registry)
  publicKey: existingEd25519PublicKey // the 32-byte key already in SecureStore
)
// NODL decimals: 11 — divide raw chain planck units by 10^11 to get NODL
```

`@polkadot/keyring` / `@polkadot/util-crypto` can encode this from the raw public key bytes. We only read the public key (already exposed), never touch the secret. The user's Sovereign Node IS their Nodle wallet — same key, different address encoding.

**What "no custody" means here:** NODL accrues on-chain to the user's Nodle address derived from their Ed25519 public key. GETKINETIK never holds those tokens. The user controls the address (they have the private key, in hardware-backed SecureStore). GETKINETIK signs a receipt in the earnings ledger recording what landed in that address. This is exactly the "no custody" model from `AGGREGATOR.md` — we sign receipts, the network moves the tokens.

**Claims:** SDK-mode NODL is auto-deposited to the wallet every ~2 hours — there is no "claim" button for SDK earnings. The `claim()` method on the adapter contract should be left `undefined` / no-op in v0; the adapter just reads the growing balance and records incremental deltas as `EarningEntry` records.

---

## Integration shape decision

Based on the above, the v0 integration shape is:

**SDK-embed via a custom Expo native module.**

Each GETKINETIK user gets a Nodle address derived from their existing Ed25519 public key (pure encoding, no new secret). The native module wraps the Nodle Android SDK, starts it with `"ss58:" + userNodleAddress`, and the user contributes BLE scanning passively. `pollEarnings()` calls the public Substrate RPC. The earnings ledger records per-user NODL accumulation signed with the existing key.

---

## v0 limitations and known unknowns

| Issue | Severity | Notes |
|---|---|---|
| No React Native bridge | Blocker for Session C | Must write Expo native module in Kotlin (Android) + Swift (iOS). 1–2 days of work. |
| Publisher agreement unclear | Must resolve before shipping | Register at `sdk.nodle.com`, read data addendum, email `partners@nodle.com` if needed. |
| `maxAPI:31` Android cap | Minor | SDK targets max Android 12 (API 31). Devices on API 32+ still install and run — the `maxSdkVersion` in the SDK's manifest applies to the SDK's own permissions, not installability. Monitor for breakage on newer devices. |
| Background location permission | UX friction | Nodle requires `ACCESS_BACKGROUND_LOCATION`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, and `SCHEDULE_EXACT_ALARM` for full background scanning. Google Play's policy requires a justification video for these. GETKINETIK is sideloaded (no Play Store yet), so this is deferred — but it affects any future Play Store submission. |
| Nodle SS58 prefix | ✅ Resolved | Prefix **37**, 11 decimal places. Confirmed from [paritytech/ss58-registry](https://github.com/paritytech/ss58-registry/blob/main/ss58-registry.json). Addresses start with `4`. Divide raw chain units by 10^11 to get NODL. |
| NODL price / earnings rate | Unknown until running | NODL is ~$0.003–0.004 as of Apr 2026. Actual earnings per device per day are unknown without running the SDK on a real device in a real city. Run a pilot on the test node (KINETIK-NODE-F3C3035B) before projecting user earnings. |
| No per-device reward breakdown | Informational gap | Nodle's SubQuery does not expose a "per-device" breakdown — it only shows what hit a given wallet address. If two devices share the same key (bad practice), rewards aggregate invisibly. Each user's derived address is unique, so this is fine in practice. |
| iOS integration complexity | Lower priority | GETKINETIK is Android-first. The iOS SDK (CocoaPods) would require a separate Expo native module for iOS. Defer until Android v0 is working. |

---

## Proceed or pivot?

**Proceed with Nodle as first adapter.** The integration is harder than "drop in a JS SDK" but the pieces are all real:

- SDK exists, is maintained, is embeddable
- Per-user rewards work (Nodle Cash App proves it)
- The existing Ed25519 keypair can become a Nodle address without new secrets
- Public RPC and SubQuery cover `pollEarnings()` without Nodle's permission
- "No custody" holds — NODL goes on-chain to a user-controlled address

The two gating tasks before Session C begins:
1. Register at `sdk.nodle.com` and confirm publisher terms permit GETKINETIK's revenue-sharing model
2. Look up Nodle's SS58 network prefix from the ss58-registry

Everything else is implementation.

---

*Sources: [docs.nodle.com/nodle-sdk](https://docs.nodle.com/nodle-sdk), [docs.nodle.com/nodle-android-sdk](https://docs.nodle.com/nodle-android-sdk), [docs.nodle.com/nodle-ios-sdk](https://docs.nodle.com/nodle-ios-sdk), [nodle.com/eula](https://www.nodle.com/eula), [github.com/NodleCode/subquery](https://github.com/NodleCode/subquery), [github.com/NodleCode/NodleSDK-Release](https://github.com/NodleCode/NodleSDK-Release), [nodle.subscan.io](https://nodle.subscan.io/account), [dwellir.com/networks/nodle](https://www.dwellir.com/networks/nodle), [polkadot.js.org/docs/keyring/start/ss58](https://polkadot.js.org/docs/keyring/start/ss58/), [medium.com/nodle-io tokenomics v1.1](https://medium.com/nodle-io/nodle-network-updated-tokenomics-v1-1-release-date-july-28th-2022-part-3-of-4-78c09ef2f84e)*
