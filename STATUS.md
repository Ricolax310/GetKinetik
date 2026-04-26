# GETKINETIK — Project Status Handoff

> Living document. Update whenever the state of the project materially changes.
> Last updated: **2026-04-25** — Rung 5 in progress, L2 schema bumped to v:2 with first three signed sensor aggregates.

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
L4 — WALLET / EARNINGS / FEE          NOT BUILT (~1 mo after L3)
L3 — DEPIN ROUTING / OPTIMIZER        NOT BUILT (~2-3 mo, hardest work)
L2 — SENSOR CAPTURE + SIGNING         IN PROGRESS (3 of 7 sensors signing into chain; ~1 week to full sensor set)
L1 — SOVEREIGN IDENTITY + TRUST       ✅ BUILT, SHIPPED, WITNESSED
```

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

### 1. Identity — `src/lib/identity.ts`

- Ed25519 keypair, generated once on first launch, sealed in `expo-secure-store`
- Secret key never leaves the device (hardware-backed keystore where available)
- Node ID = first 4 bytes of `sha256(publicKey)`, rendered as `KINETIK-NODE-XXXXXXXX`
- **Verified externally:** `KINETIK-NODE-F3C3035B` was independently derived from its public key using this same formula on a separate machine — cryptographic tie confirmed

### 2. Hash-chained heartbeat log — `src/lib/heartbeat.ts`

- While the app is LIVE, a heartbeat fires every 30s (gated behind unlock, like yield accrual)
- Each heartbeat is signed Ed25519 and hash-chained to the previous via sha256 of the canonical payload
- A minimal summary (`{ seq, count, firstTs, lastHash }`) persists to SecureStore across launches
- Current test node has **289+ heartbeats** on chain — the chain works in practice, not just theory
- **Schema v:2 (since 2026-04-25):** every beat now also carries a `sensors: { lux, motionRms, pressureHpa }` block. Verifier accepts both v:1 (legacy) and v:2 — every previously signed beat remains valid forever.

### 2b. Sensor sampler — `src/lib/sensors.ts`

- Process-wide singleton: `startSensorSampler()` at app boot, `stopSensorSampler()` on teardown
- Three permission-free sensors via `expo-sensors`: Accelerometer (1Hz), Barometer (0.2Hz), LightSensor (Android-only, 0.2Hz)
- `readSensorAggregate()` drains the accel ring → RMS of (|a| − mean|a|), snapshots latest baro + lux, returns `{ motionRms, pressureHpa, lux }`
- All fields default to `null` on devices missing the sensor (iOS has no light, budget Androids have no barometer); the schema stays consistent regardless
- `canonicalSensorBlock()` enforces lexicographic insertion order so the nested object's JSON.stringify output is reproducible byte-for-byte across the app and the verifier

### 3. Proof of Origin card — `src/lib/proof.ts`

- Signed artifact: `{ payload, message, signature, hash }` where:
  - `payload` = `{ v, kind, nodeId, pubkey, mintedAt, issuedAt, lifetimeBeats, firstBeatTs, chainTip, attribution }`
  - `message` = `stableStringify(payload)` (lexicographic key sort, byte-for-byte deterministic)
  - `signature` = Ed25519 sig over `message`
  - `hash` = sha256 of `message`
- `PROOF_ATTRIBUTION` constant is baked INTO the signed message — stripping or changing the "GETKINETIK by OutFromNothing LLC" line invalidates the signature
- Canonical serialization lives in `src/lib/stableJson.ts`

---

## File map

```
src/
├── lib/
│   ├── identity.ts      # Ed25519 keypair, SecureStore, signMessage/verifyMessage
│   ├── heartbeat.ts     # useHeartbeat hook, hash-chained signed beats (schema v:2 since 2026-04-25)
│   ├── sensors.ts       # L2 sensor sampler — accel motionRms + baro pressureHpa + light lux
│   ├── proof.ts         # createProofOfOrigin, verifyProofOfOrigin, PROOF_ATTRIBUTION
│   ├── proofShare.ts    # buildVerifierUrl, shareProof, base64UrlEncode, VERIFIER_ORIGIN
│   └── stableJson.ts    # stableStringify — canonical JSON for signing
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
- Card displays: NODE, MINTED, BEATS, SINCE, CHAIN TIP, ISSUED, HASH, PUBLIC KEY, SIGNATURE
- DIAG panel (since 2026-04-25) adds three signed sensor rows: MOTION (g), PRESSURE (hPa), LIGHT (lx) — values shown are the EXACT numbers committed to the chain in the most recent signed beat, not live sensor reads
- **VERIFY AT** section: QR code + `https://getkinetik.app/verify/` URL + SHARE SIGNED JSON button
- QR encodes compact form `{payload, signature}` as base64url in `#proof=` fragment (~670 chars)
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
5. ⏳ **L2 (sensor capture + signing) finished.** _IN PROGRESS as of 2026-04-25._ First slice landed: accelerometer motion RMS + barometer pressure + ambient light, all signed into the chain via the v:1 → v:2 schema bump. Verifier accepts both versions. Still to do: GPS (opt-in), WiFi SSID presence, cell tower IDs, mic amplitude aggregate — each requires a permissions-UX pass first. Rename `stabilityPct` to something accurate (it's currently just battery %). Never sign raw mic/GPS content — only aggregates. The "aggregates only" rule is now codified in `src/lib/sensors.ts` and applied across the board.
6. ⏳ **First DePIN integration.** Nodle first (easiest). Then DIMO, Hivemapper, WeatherXM. Each integration = one more earning path. Build the routing optimizer (L3) in parallel as integrations come online.
7. ⏳ **Wallet / earnings layer (L4).** Collect payouts from each DePIN into the sovereign node's address. Auto-convert to user's chosen denom. 1% protocol fee on conversions. $5/mo premium tier for priority routing.
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

- File references use backticks: `src/lib/proof.ts`
- Inline code references use backticks: `createProofOfOrigin`
- Never invent palette keys. The palette is: `obsidian`, `ruby.{core, mid, deep, ember, shadow}`, `sapphire.{core, glow, deep}`, `platinum`, `graphite`, `hairline`. There is NO `ruby.glow` (common mistake — use `ruby.ember`).
- Never invent new canonical-serialization logic. Always import `stableStringify` from `src/lib/stableJson.ts`.
- Match the user's voice: concise, direct, slightly poetic, zero fluff. They prefer decisive recommendations over option menus.

---

*The point of this project is sovereignty. Every line of code should defend that. If a proposed change trades sovereignty for convenience, the answer is no.*