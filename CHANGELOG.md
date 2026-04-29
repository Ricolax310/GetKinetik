# Changelog

All notable changes to GETKINETIK are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Android `versionCode` is noted alongside each release for sideload verification.

---

## [Unreleased] — v1.3.3

> EAS build queued for 2026-05-01. Not publicly released yet.
> The v1.3.2 build existed as an internal EAS build only and was never
> given a public GitHub Release — a gem-animation regression was caught
> during phone testing before we shipped it, which is exactly what the
> "phone test before public release" gate is for.

### Fixed
- **Gemstone jitter at rest (root cause: sensor unit mismatch).** The
  v1.3.1 rewrite swapped `expo-sensors` for Reanimated's
  `useAnimatedSensor`. `expo-sensors` returns g-units (range ±1);
  Reanimated returns raw m/s² on Android (range ±9.81). All constants
  downstream (deadzone = 0.025, ±1 clamp, EMA coefficients) were tuned
  for g. With m/s² flowing through, sensor noise of ±0.05 m/s² slipped
  past the 0.025 deadzone and the gem visibly wandered at rest. Fix: one
  line per axis — divide the raw sample by 9.80665 (standard gravity)
  before clamping.

### Carries forward from internal v1.3.2 (no public release)
- DIMO OAuth redirect URI architectural fix (see v1.3.1 below)
- NODE VALUATION ticker removal (see v1.3.1 below)
- Gemstone UI-thread rewrite (see v1.3.1 below)

---

## [1.3.0] — 2026-04-27 · versionCode 4

> [GitHub Release](https://github.com/Ricolax310/GetKinetik/releases/tag/v1.3.0)

### Added
- **DePIN aggregator UI.** New `AggregatorPanel` with swipe/scroll across
  all five built adapters (Nodle, DIMO, Hivemapper, WeatherXM, Geodnet)
  as horizontally pageable cards. Per-card status + lifetime earnings
  roll up into a per-currency summary at the panel header.
- **Earning log.** Per-adapter positive lifetime deltas are automatically
  signed via `appendEarningLog` with a SecureStore watermark per adapter.
  No double-mint on poll, no negative entries on withdrawal.
- **DIMO OAuth, properly wired.** Auth URL switched from `accounts.dimo.org`
  to `login.dimo.org` (the actual Login With DIMO consent UI).
  `expo.scheme = "getkinetik"` registered in `app.json`.
- **Landing page repitch.** `getkinetik.app` relaunched as "DePIN Earnings
  Aggregator" with 5-adapter showcase, v:2 PoO sample card, HOW IT WORKS
  and RECEIPTS sections.

### Removed
- **Fake yield accrual.** The local `yieldTokens` loop, its SecureStore
  keys, and the matching gauge in the Readouts panel are gone. All
  earnings now flow exclusively through signed adapter snapshots into the
  hash-chained earning log.

### Fixed
- **NODE VALUATION ticker** previously showed the live BTC spot price from
  Coinbase every 60 seconds labeled as node valuation. Removed entirely.
- Tighter Gemstone touch target — constrained to visual footprint.

---

## [1.2.0] — 2026-04-26 · versionCode 3

> [GitHub Release](https://github.com/Ricolax310/GetKinetik/releases/tag/v1.2.0)

### Added
- **Proof of Origin v:2 schema.** `sensors` block added to every signed
  PoO — ambient light (lux), barometric pressure (hPa), and motion RMS
  (g) from the most recent signed heartbeat.
- **Verifier v:2 support.** `landing/verify/verifier.js` accepts both
  v:1 and v:2 schemas — all prior proofs still verify.
- **Sensor rows in the verifier UI.** MOTION, PRESSURE, and LIGHT rows
  render for both v:2 heartbeats and v:2 PoOs.

### Changed
- `PROOF_ATTRIBUTION` constant locked to `"GETKINETIK by OutFromNothing LLC"`.
- `packages/kinetik-core/` extracted from `src/lib/` — L1 primitives now
  live in an internal package with a clean public API surface (`src/index.ts`).

---

## [1.1.0] — 2026-04-26 · versionCode 2

> [GitHub Release](https://github.com/Ricolax310/GetKinetik/releases/tag/v1.1.0)

### Added
- **L2 sensor signing.** Every signed heartbeat now carries three
  permission-free, privacy-neutral sensor aggregates (ambient light,
  barometric pressure, motion RMS) bound into the hash chain.
- `useSensors` hook in `packages/kinetik-core/src/sensors.ts`.
- `stableStringify` — canonical JSON serializer for the signing contract.

---

## [1.0.0] — 2026-04-25 · versionCode 1

> [GitHub Release](https://github.com/Ricolax310/GetKinetik/releases/tag/v1.0.0)

### Added
- **L1 sovereign identity.** Ed25519 keypair generated on first launch,
  sealed in `expo-secure-store` hardware-backed keystore.
- **Hash-chained heartbeat log.** Every 60-second heartbeat references the
  SHA-256 tip of the previous one — a locally verifiable uptime chain.
- **Proof of Origin (v:1).** Signed artifact: nodeId, pubkey, mintedAt,
  issuedAt, lifetimeBeats, firstBeatTs, chainTip, attribution.
- **QR share.** PoO encoded as base64url in a `#proof=` URL fragment,
  shareable and scannable from any camera.
- **Public verifier.** `getkinetik.app/verify/` — browser-side Ed25519
  auditor with zero external fetches, vendored `@noble/ed25519` and
  `@noble/hashes`. Runs offline, verifies any proof minted by the app.
- **Vault UI.** Sovereign Node dashboard — Gemstone (tilt-reactive ruby),
  Readouts (stability, chain height, status), ProofOfOrigin card.
- **Android preview.** EAS build via `preview` profile, distributed as
  a sideloadable APK.
