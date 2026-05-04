# GETKINETIK — Project Status Handoff

> Living document. Update whenever the state of the project materially changes.
> Last updated: **2026-05-04** — **Offensive wave: bureau-framed outreach + privacy charter + public Genesis Score methodology + adaptive heartbeat cadence + publishable `@kinetik/verify` npm package + Sign-in-with-Kinetik SDK design (gated on partner).** Six deliverables shipped in one session, all aligned with the bureau pivot from 2026-05-02. (1) `OUTREACH_MESSAGES.md` rewritten end-to-end — every per-network template (DIMO, Hivemapper, Nodle, WeatherXM, Geodnet) plus general cold + adjacent-buyer (lenders/insurers/exchanges/foundations) variants now lead with "independent trust layer / Carfax for DePIN nodes" instead of "DePIN earnings aggregator + verified-user reward boost." (2) New [`PRIVACY.md`](./PRIVACY.md) sibling charter to `NEUTRALITY.md` codifies six immutable privacy rules (no IMEI/IDFA/Android-ID/etc.; no node-to-person mapping; aggregates only; short-lived aggregate logs; no data sale; Genesis Score grades nodes not people). Designed so a future subpoena can be answered truthfully with "we don't have that data" rather than relying on policy. (3) New [`docs/methodology/GENESIS_SCORE.md`](./docs/methodology/GENESIS_SCORE.md) v1.0 — FICO-style public methodology spec: five input categories (identity integrity, uptime continuity, sensor coherence, network engagement, disclosure receipts) with explicit direction (▲/▼) for each signal, hard gates that floor or null-out the score, score range and interpretation bands, update cadence, dispute path, and a versioning policy (patch / minor / major with comment periods). Inputs and direction public; exact weights internal — same shape as FICO. (4) New `packages/kinetik-core/src/cadence.ts` — adaptive heartbeat cadence policy. Pure `selectCadenceProfile`/`selectCadenceMs` functions plus `useAdaptiveCadenceMs` RN hook. Three honest profiles: `active` 30s (foreground OR charging+online), `background` 5min (recently backgrounded on battery), `sleep` 30min (>10min backgrounded OR offline). Wired into `useHeartbeat` via a non-breaking optional `intervalMs` arg; `VaultPanel` now passes the adaptive cadence in. **Chain contract is unchanged** — beats just need ordering, cadence is policy. All 16 signing-contract smoketests + 5 URL-roundtrip smoketests + `tsc --noEmit` still pass. (5) New `packages/verify/` — publishable `@kinetik/verify` npm package. Pure-TS port of `landing/verify/verifier.js` with same byte contract: `stableStringify`, `sha256[:16]`, `ed25519.verifyAsync`, `PROOF_ATTRIBUTION`. Exports `verifyArtifact`, `decodeProofUrl`, `stableStringify`, `PROOF_ATTRIBUTION`, `PROTOCOL_FEE_RATE`, `VERSION`. ESM, types, sourcemaps, MIT license. **27/27 smoketest checks passing** (proof-of-origin, heartbeat, earning happy paths; tampered fee/payload/attribution rejection; wrong-key forgery rejection; URL roundtrip; structural-error throws). Marked `private: true` — ready to publish, just hasn't been pushed to npm. (6) New [`docs/sdk/CLIENT_SDK_DESIGN.md`](./docs/sdk/CLIENT_SDK_DESIGN.md) v0.1 DRAFT — "Sign in with Kinetik" client SDK. `kinetik://verify-device?partnerId&nonce&purpose&returnUrl` deep-link protocol, partner-bound proof minting (new optional `audience`/`nonce`/`purpose` fields on v:2 PoO — minor schema bump, backward-compat), `@kinetik/sdk-react-native` + native counterparts. **Build is gated on a first partner conversation** (DIMO/Hivemapper/Geodnet). Document captured now so when a partner says yes, we don't negotiate the integration shape under time pressure. Open: actually push `@kinetik/verify` to npm; queue v1.5 build that ships the cadence module.
>
> Previous: **2026-05-02** — **Strategic pivot: positioned as the independent trust layer ("credit bureau") for the decentralized physical economy, not a DePIN aggregator.** New [`NEUTRALITY.md`](./NEUTRALITY.md) charter committed: no token ever, no equity in graded networks, no exclusive partnerships, all revenue in fiat/stablecoin, methodology public. README + landing hero + FAQ + release notes + PITCH all rewritten to bureau positioning. Genesis Credits renamed conceptually to **Genesis Score** (public reputation grade, never transferable, never priced). v2.0 roadmap line "token routing / multi-chain settlement" removed. Revenue model rewritten: partner verification API + consumer Pro tier + enterprise audit access — all USD/USDC. Outreach next-wave will lead with bureau framing, not aggregator framing. Triggered by trademark/SEO research showing KINETIK is fortressed by Kinetik (energy), Windstream Kinetic (telecom), Kinetik Care (digital health), and by Nodle's explicit "not a fit for our genuity model" reply that revealed the network-by-network premium pitch was orthogonal to network-by-network priorities. Bureau positioning works regardless of which networks like the verified-user premium pitch.
>
> Previous: **2026-04-30 (afternoon)** — **v1.4 code complete, build queued for tonight (5pm-ish when EAS quota resets).** All five v1.4 pillars shipped to `main` (commit `33fd942`): optimizer engine (`packages/optimizer/`), Genesis Credits (`packages/credits/`), verified-user premium-aware EarningEntry, partner verify webhook live at `https://getkinetik.app/api/verify-device`, public metrics API live at `/api/metrics`, OptimizationReport modal + GenesisCreditsTicker now wired into VaultPanel. **Audit pass found and fixed 6 bugs:** (1) `refresh()` undefined → would crash on opt-in, (2) `production` build profile generates AAB which can't be sideloaded, (3) `app.json` version still said 1.3.3, (4) GenesisCreditsTicker + OptimizationReport built but never rendered, (5) dead `DIMO_API_KEY` constant in public source, (6) wrong contact email (`eric@outfromnothing.com` missing "llc") in README/PARTNER_EMAILS/verify-device docs — all references corrected to `eric@outfromnothingllc.com`. Outreach materials ready: `PITCH.md` one-page deck + `OUTREACH_MESSAGES.md` ready-to-paste Discord/Telegram/Twitter messages for DIMO, Hivemapper, Nodle, WeatherXM, Geodnet. Landing page (`getkinetik.app`) updated with Optimizer + For Partners sections. **Next: build v1.4 APK on EAS quota reset, publish GitHub release using `RELEASE_NOTES_v1.4.md`, then start sending outreach.**

> Previous: 2026-04-27 (evening) — **L3 DePIN aggregator lands, v1.3.0 building.** AggregatorPanel got the swipe/scroll multi-adapter UI (475 new lines) — all five built adapters visible side-by-side. DIMO OAuth wired with `getkinetik://dimo-callback` (later changed to https in v1.3.2 — DIMO console rejects custom schemes). `VaultPanel` ripped out fake yield accrual. Landing page repitched as DePIN Earnings Aggregator. `app.json` bumped to **1.3.0** / versionCode **4**, `eas.json` switched to local appVersionSource + autoIncrement.

> Older: 2026-04-26 (afternoon) — Sessions A + B + C + D-1 + E complete. Adapter contract + Nodle/DIMO/Hivemapper/WeatherXM/Geodnet adapters shipped stub-first. Earnings ledger wired with per-adapter SecureStore watermarks.

---

## THE MISSION (read this first, before any architecture decision)

**GETKINETIK is the independent trust layer for the decentralized physical economy — the credit bureau every DePIN network needs and none can build for itself.**

Networks can't grade themselves and stay credible. Foundations can't audit their own ecosystems without conflict. We sit outside every network, read what really happened on real hardware, and sign it with keys nobody — including us — can forge. That neutrality is the moat. See [`NEUTRALITY.md`](./NEUTRALITY.md) for the immutable rules that protect it.

**The unique wedge:** every DePIN on the market today fails at one thing — proving nodes are real. Helium bled revenue to fake hotspots. Hivemapper wrestles GPS spoofers. WeatherXM shipped dedicated hardware to dodge the problem. GETKINETIK's sovereign identity layer (Ed25519 key sealed in the device's secure enclave + hash-chained uptime proof + public browser-side verifier) is the Sybil-resistance primitive every DePIN wishes they had — and the trust primitive every lender, insurer, and auditor will eventually need. That's the bureau.

**The business (all revenue in fiat or stablecoin — no token, no swap fees, no take-rate on user earnings):**

- **Partner Verification API** — paid `verify-device` calls + batch attestation endpoints (USD/USDC, monthly billed). Like Stripe Radar for DePIN.
- **Consumer Pro tier** — advanced reports, hardware-ROI calculators, cross-network comparison, exportable history (USD subscription, optional).
- **Enterprise audit access** — read API + methodology disclosure for foundations, auditors, exchanges, regulators (USD enterprise contracts).
- **Optional 1% earnings disclosure fee** — baked into signed receipts for transparency, not for revenue maximization. May be removed entirely as bureau revenue scales.
- **Exit value:** strategic acquisition target for payments / risk infra (Stripe, Plaid, Visa), credit-bureau adjacencies (Equifax, S&P), exchanges that need neutral attestation (Coinbase, Kraken), or a foundation/consortium that wants to lock in the trust layer.

### The four-layer trust-bureau architecture

```
L4 — EARNINGS LEDGER / DISCLOSURE     ✅ SHIPPED — signed earning ledger + disclosure-fee receipts
L3 — DEPIN READ / OPTIMIZER           ✅ SHIPPED — packages/optimizer/ (v1.4)
                                         · Gas-aware claim timing (CoinGecko + Polygon/Base RPC)
                                         · Shared PollingPool (replaces 5 individual timers)
                                         · Device capability discovery engine
                                         · Weekly OptimizationReport modal
L2 — SENSOR CAPTURE + SIGNING         🟡 PARTIAL — 3 of 7 sensors signing into chain
L1 — SOVEREIGN IDENTITY + TRUST       ✅ BUILT, SHIPPED, WITNESSED — the bureau primitive
```

### New in v1.4 build

- `packages/optimizer/` — full optimizer engine (priceFeed, gasFeed, scorer, discovery, pollingPool, savings)
- `packages/credits/` — Genesis Score engine (public node reputation grade, NOT a token, NOT transferable)
- `src/components/OptimizationReport.tsx` — weekly savings proof modal
- `src/components/GenesisCreditsTicker.tsx` — GC counter
- `functions/api/verify-device.js` — partner verification webhook (LIVE)
- `functions/api/credits.js` — Genesis Credits KV sync
- `functions/api/metrics.js` — public network metrics API
- `landing/metrics/index.html` — public metrics dashboard
- `docs/` — architecture, cryptography, adapter contract, IP assignment, API spec
- `PARTNER_EMAILS.md` v4 — verified-user premium pitch + webhook CTA

### New in 2026-05-04 offensive wave (writing-first + first code units)

- [`PRIVACY.md`](./PRIVACY.md) — sibling charter to `NEUTRALITY.md`; six immutable privacy rules
- [`docs/methodology/GENESIS_SCORE.md`](./docs/methodology/GENESIS_SCORE.md) v1.0 — public FICO-style methodology (inputs and direction; weights internal)
- [`docs/sdk/CLIENT_SDK_DESIGN.md`](./docs/sdk/CLIENT_SDK_DESIGN.md) v0.1 DRAFT — "Sign in with Kinetik" deep-link protocol design (build gated on first partner conversation)
- [`OUTREACH_MESSAGES.md`](./OUTREACH_MESSAGES.md) — fully rewritten to bureau framing, all five networks + general + adjacent-buyer (lenders/insurers/exchanges/foundations) variants
- `packages/kinetik-core/src/cadence.ts` — adaptive heartbeat cadence policy module (active / background / sleep), wired into `useHeartbeat` via optional non-breaking `intervalMs` arg, consumed by `VaultPanel` via `useAdaptiveCadenceMs`
- `packages/verify/` — `@kinetik/verify` npm package (publishable, currently `private: true`), 27/27 smoketests passing, identical byte contract to the public verifier

### The MVP integration targets for L3 (phone-viable DePINs)

- Nodle (easiest integration, already Bluetooth-based and phone-native)
- Hivemapper (dashcam mode — big earner when user is driving)
- DIMO (vehicle telemetry — targets connected cars)
- WeatherXM (phone-viable limited readings)
- Helium Mobile (where coverage allows)
- IoTeX / Peaq (generic sensor marketplaces)

Not viable from phone alone: Helium Hotspots (LoRa radio), any DePIN requiring specialized hardware. Those are out of scope.

### Why we are Android-first

iOS is increasingly hostile to background sensor collection and data-monetization apps. Android allows the architecture; iOS restricts it. Android-first, iOS sideload-only as a secondary.

---

## What's shipping right now (L1 trust layer + first slice of L2)

**GETKINETIK** is a React Native / Expo app that turns a phone into a *Sovereign Node* — a cryptographic identity device with on-chain-style semantics but zero servers, zero accounts, zero custodians. Every claim the app makes about itself is mathematically verifiable by any human with a browser. This is L1 of the four-layer aggregator.

As of 2026-04-25, every signed heartbeat also carries three permission-free privacy-neutral sensor aggregates — accelerometer motion RMS, barometer pressure, ambient light — bound into the same hash chain as the heartbeat itself. Schema bumped from v:1 to v:2; verifier accepts both. First slice of L2 ships into the chain.

- **Legal entity:** OutFromNothing LLC
- **Brand / domain:** `getkinetik.app` (Cloudflare Pages)
- **Public verifier:** `https://getkinetik.app/verify/` (live, deployed, CSP-locked)
- **Repo:** `github.com/Ricolax310/GetKinetik`, branch `main`
- **Current HEAD:** `0a0b9b6` — "status: rung 3 confirmed — first external witness of a signed proof"

---

## The three primitives

The entire app is built on three cryptographic primitives. If these are sound, the product is sound.

### 1. Identity — `packages/kinetik-core/src/identity.ts`

- Ed25519 keypair, generated once on first launch, sealed in `expo-secure-store`
- Secret key never leaves the device (hardware-backed keystore where available)
- Node ID = first 4 bytes of `sha256(publicKey)`, rendered as `KINETIK-NODE-XXXXXXXX`
- **Verified externally:** `KINETIK-NODE-F3C3035B` was independently derived from its public key using this same formula on a separate machine — cryptographic tie confirmed

### 2. Hash-chained heartbeat log — `packages/kinetik-core/src/heartbeat.ts`

- While the app is LIVE, a heartbeat fires every 30s (gated behind unlock, like yield accrual)
- Each heartbeat is signed Ed25519 and hash-chained to the previous via sha256 of the canonical payload
- A minimal summary (`{ seq, count, firstTs, lastHash }`) persists to SecureStore across launches
- Current test node has **289+ heartbeats** on chain — the chain works in practice, not just theory
- **Schema v:2 (since 2026-04-25):** every beat now also carries a `sensors: { lux, motionRms, pressureHpa }` block. Verifier accepts both v:1 (legacy) and v:2 — every previously signed beat remains valid forever.

### 2b. Sensor sampler — `packages/kinetik-core/src/sensors.ts`

- Process-wide singleton: `startSensorSampler()` at app boot, `stopSensorSampler()` on teardown
- Three permission-free sensors via `expo-sensors`: Accelerometer (1Hz), Barometer (0.2Hz), LightSensor (Android-only, 0.2Hz)
- `readSensorAggregate()` drains the accel ring → RMS of (|a| − mean|a|), snapshots latest baro + lux, returns `{ motionRms, pressureHpa, lux }`
- All fields default to `null` on devices missing the sensor (iOS has no light, budget Androids have no barometer); the schema stays consistent regardless
- `canonicalSensorBlock()` enforces lexicographic insertion order so the nested object's JSON.stringify output is reproducible byte-for-byte across the app and the verifier

### 3. Proof of Origin card — `packages/kinetik-core/src/proof.ts`

- Signed artifact: `{ payload, message, signature, hash }` where:
  - `payload` = `{ v, kind, nodeId, pubkey, mintedAt, issuedAt, lifetimeBeats, firstBeatTs, chainTip, attribution, sensors }`
  - `message` = `stableStringify(payload)` (lexicographic key sort, byte-for-byte deterministic)
  - `signature` = Ed25519 sig over `message`
  - `hash` = sha256 of `message`
- `PROOF_ATTRIBUTION` constant is baked INTO the signed message — stripping or changing the "GETKINETIK by OutFromNothing LLC" line invalidates the signature
- Canonical serialization lives in `packages/kinetik-core/src/stableJson.ts`
- **Schema v:2 (since 2026-04-25):** every PoO now also carries a `sensors` block sourced from `HeartbeatSummary.lastSensors` (the most recent SIGNED heartbeat). Each shareable PoO QR therefore proves identity + uptime + chain freshness + the on-chain sensor reading at the time the chain tip was minted — all in one scan. PoO never side-reads the live sensor stream itself; doing so would drain the accel ring and starve the next heartbeat. Schema is `v:1 → v:2`; verifier accepts both forever.

---

## File map

```
packages/
├── kinetik-core/        # L1 trust-layer primitive (the future public SDK)
│   ├── package.json     # @kinetik/core, internal-only (private: true), v0.1.0
│   ├── README.md        # What's inside, status, contract rules
│   └── src/
│       ├── index.ts     # THE FRONT DOOR — only file the app is allowed to import from
│       ├── identity.ts      # Ed25519 keypair, SecureStore, signMessage/verifyMessage
│       ├── heartbeat.ts     # useHeartbeat hook, hash-chained signed beats (schema v:2 since 2026-04-25)
│       ├── cadence.ts       # Adaptive heartbeat cadence policy (active 30s / background 5m / sleep 30m) — added 2026-05-04
│       ├── sensors.ts       # L2 sensor sampler — accel motionRms + baro pressureHpa + light lux
│       ├── proof.ts         # createProofOfOrigin, verifyProofOfOrigin, PROOF_ATTRIBUTION
│       ├── proofShare.ts    # buildVerifierUrl, shareProof, base64UrlEncode, VERIFIER_ORIGIN
│       └── stableJson.ts    # stableStringify — canonical JSON for signing
│
└── verify/              # @kinetik/verify — publishable npm package (added 2026-05-04)
    ├── package.json     # name @kinetik/verify, MIT, ESM, type roots — currently private: true
    ├── README.md        # Partner-facing docs: install, quickstart, API, contract drift policy
    ├── tsconfig.json    # tsc → dist/ (declarations + sourcemaps)
    ├── smoketest.mjs    # 27 checks across happy path + tamper / forgery / URL roundtrip
    ├── LICENSE          # MIT
    ├── src/index.ts     # verifyArtifact, decodeProofUrl, stableStringify, constants — pure crypto, no DOM, no network
    └── dist/            # built output (gitignored) — created by `npm run build`

src/
├── components/
│   ├── VaultPanel.tsx   # Main screen: biometric/PIN unlock, yield UI, DIAG + PROOF chips
│   ├── ProofOfOrigin.tsx# Card that mints + displays a fresh signed proof, with QR + SHARE
│   ├── ProofQr.tsx      # Skia-rendered QR code for the verifier URL
│   ├── Manifesto.tsx    # Hidden-door philosophy screen (long-press GETKINETIK wordmark)
│   ├── Gemstone.tsx     # Skia hex brilliant-cut gem at app center (animated)
│   ├── PinPad.tsx       # PIN fallback for auth
│   └── Readouts.tsx     # Battery/thermal/charging telemetry line
└── theme/
    └── palette.ts       # obsidian / ruby / sapphire palette + typography

landing/                 # Cloudflare Pages output root for getkinetik.app
├── index.html           # Landing page with MINT YOUR NODE waitlist
├── app.js               # Waitlist client
├── _headers             # Strict CSP: script-src 'self' (no external scripts allowed)
├── verify/              # /verify/ — the public verifier
│   ├── index.html
│   ├── styles.css
│   ├── verifier.js      # Client-side verify pipeline (4 checks)
│   ├── vendor/          # Vendored @noble/ed25519 + @noble/hashes/sha2 (CSP-compliant)
│   ├── smoketest.mjs    # Signing-contract parity test (app ↔ verifier)
│   └── smoketest-url.mjs# URL round-trip test (app encoder ↔ verifier decoder)
```

---

## What works, end-to-end

- Fresh install → Ed25519 keypair minted → `KINETIK-NODE-XXXXXXXX` generated
- Biometric/PIN unlock → app goes LIVE → heartbeats accrue every 30s
- Hash-chained heartbeats persist across launches
- Tap **PROOF** chip on crest (top-left of `GETKINETIK` wordmark) → Proof of Origin card opens
- Card mints a fresh signed artifact exactly once per open, holds it stable until close
- Card displays: NODE, MINTED, BEATS, SINCE, CHAIN TIP, ISSUED, MOTION, PRESSURE, LIGHT, HASH, PUBLIC KEY, SIGNATURE
- DIAG panel (since 2026-04-25) adds three signed sensor rows: MOTION (g), PRESSURE (hPa), LIGHT (lx) — values shown are the EXACT numbers committed to the chain in the most recent signed beat, not live sensor reads
- PoO card (since 2026-04-25, v:2 schema) renders the same MOTION / PRESSURE / LIGHT trio derived from `payload.sensors` — so a single QR scan proves identity + uptime + chain freshness + the on-chain sensor reading at chain tip, all in one go
- **VERIFY AT** section: QR code + `https://getkinetik.app/verify/` URL + SHARE SIGNED JSON button
- QR encodes compact form `{payload, signature}` as base64url in `#proof=` fragment (~750 chars for v:2 PoO; ~670 for v:1)
- Scanning QR with any phone camera → verifier auto-decodes → VALID seal
- SHARE button hands off full signed JSON (incl. message + hash) to native share sheet

The verifier runs entirely client-side, no server, no backend. Fragments never hit the wire (browsers don't send `#…` to servers). Vendored crypto so the strict `script-src 'self'` CSP holds.

---

## UX architecture

**Two visible entry points on the crest, perfectly mirrored:**

- **PROOF** (ruby-toned, left) → opens Proof of Origin card
- **DIAG** (sapphire-toned, right) → toggles diagnostic telemetry panel

**Two hidden doors (long-press rituals):**

- Long-press `GETKINETIK` wordmark → Sovereign Manifesto screen
- Long-press node ID (`KINETIK-NODE-XXXXXXXX`) → Proof of Origin card (same target as PROOF chip)

**Design intent:** power users find hidden doors. Everyone else gets visible chips. Both produce the same Success haptic so the activation feels identical regardless of entry point.

**Palette (`src/theme/palette.ts`):**

- `obsidian` — vault shell / background
- `ruby` — identity, ownership, core-of-gem signaling
- `sapphire` — telemetry, diagnostics, live signal
- `platinum` / `graphite` — text hierarchy
- `hairline` — dividers at 8% opacity

**Typography:** Courier monospace for all crypto material, letter-spaced uppercase labels.

---

## Bugs recently squashed

1. **Proof card re-minted every ~1s while open.** VaultPanel re-renders on every heartbeat tick and passed `stats={{...}}` as an inline object literal. `ProofOfOrigin`'s sign effect had `stats` in its dep array → new reference every render → new signature every tick. **Fix in `06d97ab`:** latched `stats` into a ref, effect now only depends on `[visible, identity]`. One sign per card-open, stable until close.
2. **Verifier hint URL pointed at `.com` instead of `.app`.** Fixed in `79a2f71`.
3. **Vendored crypto bundles were just redirect stubs.** `esm.sh?bundle-deps` returns a 200 but the body is a redirect HTML; real bundles live at specific `.bundle.mjs` paths. Transitive deps (`_md.mjs`, `_u64.mjs`, `utils.mjs`) had to be fetched individually. Fixed in `9e09527`.
4. **Heartbeat schema bumped v:1 → v:2 (2026-04-25).** First field added since the chain was minted: a `sensors: { lux, motionRms, pressureHpa }` block. Stable insertion order enforced via `canonicalSensorBlock()` in `src/lib/sensors.ts` so JSON.stringify on the nested object is byte-reproducible without changing `stableStringify` (which still shallow-sorts top-level keys only). Verifier (`landing/verify/verifier.js`) bumped to v1.1.0 — accepts both v:1 and v:2, renders new MOTION / PRESSURE / LIGHT rows when present. Smoketests gained 4 new cases covering v:2 happy path, null-field tolerance, tampered-sensor rejection, and URL round-trip.
5. **Proof of Origin schema bumped v:1 → v:2 (2026-04-25).** Closes the L2 visibility gap: the PoO QR was previously the only shareable artifact and it carried no sensor data, so users could prove L1 (identity) but not L2 (sensors) end-to-end through the verifier UI. v:2 PoOs now carry a `sensors` block sourced from `HeartbeatSummary.lastSensors` — the same numbers that were committed to the chain in the most recent heartbeat. NOT side-read from the live sensors at mint time (that would drain the accel ring and starve the next heartbeat). Verifier bumped to **v1.2.0** — renders MOTION / PRESSURE / LIGHT rows for both heartbeats and PoOs when `payload.sensors` is present. Backward compat preserved: every v:1 PoO ever screenshotted, shared, or QR-scanned still verifies identically against the new verifier. Smoketests gained 4 new cases (v:2 PoO happy path, sensors=null first-boot case, v:1 legacy backward compat, v:2 PoO sensor tamper rejection) plus 2 URL-pipeline cases. Visible card subbrand bumped from `SOVEREIGN NODE · v1` to `SOVEREIGN NODE · v2`.

6. **L1 trust-layer extracted into `packages/kinetik-core/` (2026-04-25).** Six files (identity, heartbeat, proof, proofShare, sensors, stableJson) moved out of `src/lib/` into a self-contained internal package with its own `package.json`, README, and a single public `src/index.ts` front door. App components (`VaultPanel.tsx`, `ProofOfOrigin.tsx`) now import exclusively through that front door instead of reaching into individual modules. **Zero behavioral change**: `tsc --noEmit` clean, both signing-contract smoketests (`smoketest.mjs` + `smoketest-url.mjs`) pass byte-for-byte against the relocated code. Purpose: the boundary is the deliverable. This is the package the eventual public SDK gets published from once L4 (wallet + 1% fee path) ships and the brand attestor key (rung 8) is anchored. Until then, `private: true` and internal-only — the boundary exists for hygiene, not for distribution.

7. **Verifier asset cache invalidation (2026-04-25).** First field-discovery bug of the v1.2.0 launch. Two phones running the same v1.2.0 APK minted PoOs that contained identical `sensors` blocks in their JSON, but only one phone's verifier rendered the MOTION/PRESSURE/LIGHT rows. Root cause: the verifier loads `verifier.js` and `styles.css` with no cache-bust query string. The phone that had visited `getkinetik.app/verify/` BEFORE the v1.2.0 deploy held the old verifier in HTTP cache despite `Cache-Control: max-age=0, must-revalidate` on the response — Chrome on Android can keep a 200 OK from a previous fetch when the revalidation path doesn't roundtrip cleanly through Cloudflare's edge. The phone that visited fresh got the new code and rendered correctly. **Fix in `landing/verify/index.html`:** added `?v=1.2.0` query strings to both the script tag and stylesheet link, plus a stern comment at the verifier.js version stamp reminding future maintainers that the two values MUST stay in lockstep. Future deploys must bump both together. Lesson: any time a verifier release adds a new field to render, returning testers' caches are an actual deployment surface — not just a dev-tools curiosity. Treat the cache-bust query as part of the version.

---

## Known dev-mode noise (defer, not blocking)

Things that show up in the Metro/dev console but do NOT affect production builds, signing, verification, or end users. Address only when there's downtime between feature pushes.

1. **Reanimated strict-mode warning: `Reading from 'value' during component render`.** Surfaced by `react-native-reanimated` v4.x strict mode. Some component is reading a `useSharedValue().value` (or calling `.get()`) on the JS render thread during a render pass instead of inside an animated style/callback or via `useDerivedValue` / `useAnimatedReaction`. Likely culprits: `VaultPanel.tsx` (heartbeat-driven animated diagnostic rows), `Gemstone.tsx` (Skia gem driven by accelerometer shared values), or one of the chip animations. Fix path: locate the offending `.value` read, wrap the consuming computation in `useDerivedValue` so the read happens on the UI thread. Until then: cosmetic dev-console noise only. Production APK is unaffected. Linked Reanimated doc: `https://docs.swmansion.com/react-native-reanimated/docs/debugging/logger-configuration`.

---

## The realness ladder (roadmap)

Captured here so the next agent picks up with the same framing. Rungs 1–3 are the trust-layer milestones we already landed. Rungs 4+ advance the aggregator mission.

1. ✅ **Code runs on device.**
2. ✅ **Cryptographic artifacts exist.** Signed proofs, hash-chained heartbeats, live verifier.
3. ✅ **A second human witnessed a proof.** Completed 2026-04-24. A QR minted on the user's Android device was scanned by a separate iPhone, routed through `getkinetik.app/verify/`, and returned a `PROOF VERIFIED — Signed by KINETIK-NODE-F3C3035B` seal. First wild-hardware validation.
4. ✅ **App is installable by strangers.** Completed 2026-04-24. First signed Android APK shipped via EAS. Build ID `ce2a90b3-5841-46a4-a651-6adbcdd6b28b`, artifact at `https://expo.dev/artifacts/eas/rszFT4DYVrAHdhv15e8Naz.apk`. App is now installable on any Android device via direct sideload — no Play Store gating required. Every fresh install mints a brand-new sovereign identity with its own chain.
5. ⏳ **L2 (sensor capture + signing) finished.** _IN PROGRESS as of 2026-04-25._ First slice landed: accelerometer motion RMS + barometer pressure + ambient light, all signed into the chain via the v:1 → v:2 schema bump. Verifier accepts both versions. Still to do: GPS (opt-in), WiFi SSID presence, cell tower IDs, mic amplitude aggregate — each requires a permissions-UX pass first. Rename `stabilityPct` to something accurate (it's currently just battery %). Never sign raw mic/GPS content — only aggregates. The "aggregates only" rule is now codified in `packages/kinetik-core/src/sensors.ts` and applied across the board.
6. ⏳ **First DePIN integration.** _IN PROGRESS as of 2026-04-26._ **Nodle locked in as first target.** Research complete — see `packages/adapter-nodle/RESEARCH.md`. Integration shape: SDK-embed via a custom Expo native module (Kotlin wrapper around `io.nodle.sdk.android.Nodle`), per-user SS58 keys derived from existing Ed25519 keypair (no new secret), NODL auto-deposited on-chain every 2 hours, balance polled via public Substrate RPC. Publisher agreement gate open (email to partners@nodle.com). Session C (adapter code) ready to start.
7. ✅ **Wallet / earnings layer (L4).** _SHIPPED 2026-04-26._ `packages/kinetik-core/src/wallet.ts` — wallet address derivation (kn1 + base32, domain-separated from existing Ed25519 key, no new secret), EarningEntry v:1 schema, signEarning (1% fee enforced at construction), verifyEarning (fee integrity + attribution + hash + sig), appendEarningLog (chains prevHash, persists to SecureStore), eraseEarningLog. Exported from `packages/kinetik-core/src/index.ts`. Verifier v1.3.0 renders earning artifacts. 16 smoketests passing. `tsc --noEmit` clean.
8. ⏳ **Brand key anchored on the internet.** Publish `.well-known/getkinetik-attestor.json` at `getkinetik.app` so third-party DePINs can verify "this is a real GetKinetik node" at the brand level, not just the device level.
9. ⏳ **Witnessing network.** Nodes co-sign each other's attestations. Network effect begins.
10. ⏳ **External anchor.** First chain tip notarized into Bitcoin / CT log / IPFS. Immutable genesis of the network.
11. ⏳ **Acquisition conversations.** At 100K+ active authenticated nodes, the network becomes an attractive acquisition target for major DePIN projects, data brokers, or crypto exchanges.

---

## Key conventions (DO NOT BREAK)

- `**stableStringify` is the contract.** App-side signing and verifier-side verification BOTH use lexicographic key sort. Any change to serialization breaks every proof ever minted. Change it only with a versioned `v` field bump.
- `**PROOF_ATTRIBUTION` is signed.** It is inside the payload. Altering or removing the attribution invalidates the signature. This is intentional — it's a legal ownership watermark baked into the cryptography.
- **Secret key never leaves device.** `expo-secure-store` only. Never log it. Never send it over the network. Never expose it to props. `signMessage` is the only path that touches it.
- **CSP is strict.** `landing/_headers` sets `script-src 'self'`. No CDN scripts, no inline scripts, no `eval`. If you add a new JS file to the verifier, vendor it locally into `landing/verify/vendor/`.
- **Hidden doors use long-press + Success haptic.** Visible chips use tap + Success haptic. Consistency of ritual matters.
- **No emojis in code, commits, or UI text** unless the user explicitly asks.
- **`packages/kinetik-core/` is the SDK boundary.** App code imports trust-layer primitives ONLY through `packages/kinetik-core/src/index.ts` — never reach past the front door into individual modules. Adding a new export to `index.ts` is non-breaking; removing or renaming an export is a breaking change. When the package goes public as the SDK, this front door is the contract every external integrator depends on.

---

## Testing

Two smoke tests live in `landing/verify/`:

```bash
# Contract parity: app signs → verifier verifies
node landing/verify/smoketest.mjs

# URL round-trip: app encoder → verifier decoder (QR contract)
node landing/verify/smoketest-url.mjs
```

Both are plain Node scripts, no framework, exit code 0 = pass. Run both before shipping anything that touches proof serialization, signing, verification, or URL encoding.

---

## Stack specifics

- **Expo SDK:** ~54
- **React Native:** 0.81.5
- **React:** 19.1.0
- **TypeScript:** ~5.9.2
- **Crypto:** `@noble/ed25519@3.1.0`, `@noble/hashes@2.2.0`
- **Graphics:** `@shopify/react-native-skia` (gem + QR), `react-native-reanimated` + `react-native-worklets` (animations)
- **Storage:** `expo-secure-store`
- **Sensors:** `expo-sensors` (accelerometer for gem tilt), `expo-battery`, `expo-haptics`
- **QR:** `qrcode-generator@2.0.4` (pure JS, no native module — zero rebuild cost)

No native modules were added beyond what was already linked. All recent features ship with JS-only deps so no dev-client rebuild is required.

---

## Open questions (decisions the user has NOT yet made)

- **Apple Developer account?** Needed for TestFlight ($99/yr). Not yet confirmed whether the user has one.
- **Google Play Developer account?** Needed for Android internal track ($25 one-time). Unknown.
- **Bundle identifier / app name at submission time?** `app.json` currently has placeholder values — verify before first EAS build.
- **Heartbeat interval user-configurable?** *Resolved 2026-05-04* — adopted automatic adaptive cadence (active/background/sleep) instead of user-configurable. Cadence is still hardcoded *per-profile*, but the profile selection is automatic and battery-aware. See `packages/kinetik-core/src/cadence.ts`. If a user-facing toggle is requested later it should override the policy, not replace it.
- **Brand attestor key.** Do we introduce a second "brand-level" key that co-signs releases? Related to realness ladder step 5.
- **Brand-name collision: AZ "GET KINETIK, LLC" exists.** A separate Arizona LLC named "GET KINETIK, LLC" surfaced in `seethemoney.az.gov` (campaign-finance) records as of Sep 2024. Our legal entity is OutFromNothing LLC (DBA GETKINETIK as a brand). To resolve: (1) look up that LLC on `https://ecorp.azcc.gov/EntitySearch` to see industry / status; (2) search USPTO TESS at `https://tmsearch.uspto.gov/` for "GETKINETIK" / "GET KINETIK" / "KINETIK" in Class 9 (mobile apps) and Class 42 (SaaS / cryptographic services); (3) regardless of outcome, consider filing our own USPTO trademark in Class 9 + 42 (~$250/class, federal, beats state-level LLC namespacing). Domain `getkinetik.app`, GitHub org, Cloudflare deployment, and signed-proof attribution string are all unaffected — this is purely a commercial branding question.
- **Push `@kinetik/verify` to npm?** Package is built, smoketested, and `private: true`. Pushing makes the cryptographic verification path available to any partner without copying source files. Recommended once one partner has agreed to integrate (so the v0.1.0 release has a real consumer).
- **Schema bump for SDK fields (`audience`, `nonce`, `purpose`)?** Optional v:2 PoO additions specified in `docs/sdk/CLIENT_SDK_DESIGN.md` — backward-compatible minor schema bump. Do NOT add until the first partner SDK conversation triggers it; otherwise the verifier surface area grows for nobody.

---

## How to cite code in conversations with the user

- File references use backticks: `packages/kinetik-core/src/proof.ts`
- Inline code references use backticks: `createProofOfOrigin`
- Never invent palette keys. The palette is: `obsidian`, `ruby.{core, mid, deep, ember, shadow}`, `sapphire.{core, glow, deep}`, `platinum`, `graphite`, `hairline`. There is NO `ruby.glow` (common mistake — use `ruby.ember`).
- Never invent new canonical-serialization logic. Always import `stableStringify` from the `packages/kinetik-core` front door (`packages/kinetik-core/src/index.ts`), never reach past the barrel into individual modules.
- Match the user's voice: concise, direct, slightly poetic, zero fluff. They prefer decisive recommendations over option menus.

---

*The point of this project is sovereignty. Every line of code should defend that. If a proposed change trades sovereignty for convenience, the answer is no.*