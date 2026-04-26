# GETKINETIK — Project Status Handoff

> Living document. Update whenever the state of the project materially changes.
> Last updated: **2026-04-25 (late)** — **Aggregator track opened.** Trust-spine work (L1 + first slice of L2) is shipped, witnessed, and stable. Tonight the project pivot is from "polish the trust spine" to "build the money pipe." Active execution doc: **`AGGREGATOR.md`** at repo root — wallet primitive (sovereign earnings ledger derived from existing Ed25519 keypair, never custodied), `DepinAdapter` interface (Plaid pattern for DePIN networks), and **Nodle as locked-in first integration** pending a research pass on their developer surface. Rungs 6 + 7 both flipped to `IN PROGRESS`. Trust-spine polish backlog (gyro, PoO null-row rendering, EAS auto-increment, Reanimated warning) is parked in `AGGREGATOR.md` as filler work, not critical path. Cache-bust query strings (`?v=1.2.0`) were added to `landing/verify/index.html` after Meg's phone showed sensor rows from a fresh load while the user's phone hid them from a cached verifier.js — a real first-day-launch lesson, recorded as squashed bug #7.

---

## THE MISSION (read this first, before any architecture decision)

**GETKINETIK is a DePIN aggregator that turns every phone into a sovereign earning device.**

Tech companies currently extract data from phones worth hundreds of billions of dollars per year. Users are paid zero. GetKinetik puts a cryptographic wall between the phone's sensors and the extractive apps — then routes the phone's sensor attestations into whichever DePIN network is currently paying the most, converts the earnings to the user's chosen denomination (USD / BTC / native token), and takes a 1% protocol fee on every conversion.

**The unique wedge:** every DePIN on the market today fails at one thing — proving nodes are real. Helium bled revenue to fake hotspots. Hivemapper wrestles GPS spoofers. WeatherXM shipped dedicated hardware to dodge the problem. GetKinetik's sovereign identity layer (Ed25519 key + hash-chained uptime proof + public verifier) is the Sybil-resistance primitive every DePIN wishes they had. That's the moat.

**The business:**

- 1% protocol fee on all DePIN earnings converted through the app (Uniswap-style)
- $5/mo premium tier for priority routing to highest-paying DePIN slots
- Opt-in aggregated data licensing to corporations (user gets a cut, we take a cut)
- Exit value: attractive acquisition target for any major DePIN project, data broker, or crypto exchange once we have 100K+ authenticated active nodes

### The four-layer aggregator architecture

```
L4 — WALLET / EARNINGS / FEE          ⏳ ACTIVE TRACK (see AGGREGATOR.md)
L3 — DEPIN ROUTING / OPTIMIZER        NOT BUILT (cannot start until 2+ adapters live)
L2 — SENSOR CAPTURE + SIGNING         IN PROGRESS (3 of 7 sensors signing into chain; backlog parked in AGGREGATOR.md)
L1 — SOVEREIGN IDENTITY + TRUST       ✅ BUILT, SHIPPED, WITNESSED
```

L4 starts BEFORE L2 finishes because polishing L2 does not generate revenue and the trust spine is already sufficient to prove a real node to a real DePIN. **The current critical path runs through `AGGREGATOR.md`, not through the L2 sensor backlog.**

We built L1 first, intentionally. L1 is the moat. Every competitor can build L2/L3/L4; nobody else has L1.

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
└── kinetik-core/        # L1 trust-layer primitive (the future public SDK)
    ├── package.json     # @kinetik/core, internal-only (private: true), v0.1.0
    ├── README.md        # What's inside, status, contract rules
    └── src/
        ├── index.ts     # THE FRONT DOOR — only file the app is allowed to import from
        ├── identity.ts      # Ed25519 keypair, SecureStore, signMessage/verifyMessage
        ├── heartbeat.ts     # useHeartbeat hook, hash-chained signed beats (schema v:2 since 2026-04-25)
        ├── sensors.ts       # L2 sensor sampler — accel motionRms + baro pressureHpa + light lux
        ├── proof.ts         # createProofOfOrigin, verifyProofOfOrigin, PROOF_ATTRIBUTION
        ├── proofShare.ts    # buildVerifierUrl, shareProof, base64UrlEncode, VERIFIER_ORIGIN
        └── stableJson.ts    # stableStringify — canonical JSON for signing

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
6. ⏳ **First DePIN integration.** _IN PROGRESS as of 2026-04-25 (late)._ **Nodle locked in as first target** — phone-only, BLE/connectivity contribution, real NODL token, no second device required. Active spec lives in `AGGREGATOR.md`. Next step is a research pass on Nodle's developer surface (SDK vs deep-link vs API-only) before any adapter code gets written. Subsequent integrations (DIMO, Hivemapper, WeatherXM, Helium Mobile) follow the same `DepinAdapter` interface — drop-in, not fork-and-modify.
7. ⏳ **Wallet / earnings layer (L4).** _IN PROGRESS as of 2026-04-25 (late)._ Wallet primitive is being built in parallel with the first adapter (it has to exist for the adapter to record receipts into a signed earnings ledger). Sovereign address derived from the existing Ed25519 keypair — `walletAddress = "kn1" + base32(sha256("kinetik-wallet-v1" || publicKey))[:32]` — so there is no second secret to lose. **No custody, ever**: GETKINETIK signs earnings receipts, adapters move tokens on their own networks. 1% protocol fee is signed INTO each entry (same pattern as `PROOF_ATTRIBUTION`), making it cryptographically un-renegotiable after the fact. Auto-conversion to user-chosen denom and the $5/mo premium tier are deferred — both belong to a later track once real earnings exist. Full spec in `AGGREGATOR.md`.
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
- **Does the user want heartbeat interval user-configurable?** Currently hardcoded at 30s.
- **Brand attestor key.** Do we introduce a second "brand-level" key that co-signs releases? Related to realness ladder step 5.
- **Brand-name collision: AZ "GET KINETIK, LLC" exists.** A separate Arizona LLC named "GET KINETIK, LLC" surfaced in `seethemoney.az.gov` (campaign-finance) records as of Sep 2024. Our legal entity is OutFromNothing LLC (DBA GETKINETIK as a brand). To resolve: (1) look up that LLC on `https://ecorp.azcc.gov/EntitySearch` to see industry / status; (2) search USPTO TESS at `https://tmsearch.uspto.gov/` for "GETKINETIK" / "GET KINETIK" / "KINETIK" in Class 9 (mobile apps) and Class 42 (SaaS / cryptographic services); (3) regardless of outcome, consider filing our own USPTO trademark in Class 9 + 42 (~$250/class, federal, beats state-level LLC namespacing). Domain `getkinetik.app`, GitHub org, Cloudflare deployment, and signed-proof attribution string are all unaffected — this is purely a commercial branding question.

---

## How to cite code in conversations with the user

- File references use backticks: `packages/kinetik-core/src/proof.ts`
- Inline code references use backticks: `createProofOfOrigin`
- Never invent palette keys. The palette is: `obsidian`, `ruby.{core, mid, deep, ember, shadow}`, `sapphire.{core, glow, deep}`, `platinum`, `graphite`, `hairline`. There is NO `ruby.glow` (common mistake — use `ruby.ember`).
- Never invent new canonical-serialization logic. Always import `stableStringify` from the `packages/kinetik-core` front door (`packages/kinetik-core/src/index.ts`), never reach past the barrel into individual modules.
- Match the user's voice: concise, direct, slightly poetic, zero fluff. They prefer decisive recommendations over option menus.

---

*The point of this project is sovereignty. Every line of code should defend that. If a proposed change trades sovereignty for convenience, the answer is no.*