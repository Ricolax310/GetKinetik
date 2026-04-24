# GETKINETIK — Project Status Handoff

> Living document. Update whenever the state of the project materially changes.
> Last updated: **2026-04-24** — commit `06d97ab` on `main`.

---

## What this project is

**GETKINETIK** is a React Native / Expo app that turns a phone into a *Sovereign Node* — a cryptographic identity device with on-chain-style semantics but zero servers, zero accounts, zero custodians. Every claim the app makes about itself is mathematically verifiable by any human with a browser.

- **Legal entity:** OutFromNothing LLC
- **Brand / domain:** `getkinetik.app` (Cloudflare Pages)
- **Public verifier:** `https://getkinetik.app/verify/` (live, deployed, CSP-locked)
- **Repo:** `github.com/Ricolax310/GetKinetik`, branch `main`
- **Current HEAD:** `06d97ab` — "proof: stop re-minting on every parent render"

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
│   ├── heartbeat.ts     # useHeartbeat hook, hash-chained signed beats
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

---

## The realness ladder (roadmap)

Captured here so the next agent picks up with the same framing.

1. ✅ **Code runs on device.**
2. ✅ **Cryptographic artifacts exist.** Signed proofs, hash-chained heartbeats, live verifier.
3. ✅ **A second human witnessed a proof.** Completed 2026-04-24. A QR minted on the user's Android device was scanned by a separate iPhone, routed through `getkinetik.app/verify/`, and returned a `PROOF VERIFIED — Signed by KINETIK-NODE-F3C3035B` seal. This is the first time the system was tested in the wild against hardware it does not own. The math held.
4. ⏳ **App is installable by strangers.** NEXT. Run `eas build --platform ios --profile preview` → TestFlight, or `eas build --platform android --profile preview` → internal track. `eas.json` exists untracked in the tree; review + stage before first build. Requires Apple Developer ($99/yr) or Play Console ($25 one-time).
5. ⏳ **Brand key anchored on the internet.** Publish `.well-known/getkinetik-attestor.json` at `getkinetik.app` listing the expected nodeId format + any brand-level co-signing key. Lets verifiers distinguish "real GetKinetik device" from "someone else generating the same JSON shape."
6. ⏳ **Multi-device / witnessing network.** Two devices co-sign each other's heartbeats. Network effect.
7. ⏳ **External anchor.** First chain tip notarized into Bitcoin / CT log / IPFS. Immutable genesis.

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

---

## How to cite code in conversations with the user

- File references use backticks: `src/lib/proof.ts`
- Inline code references use backticks: `createProofOfOrigin`
- Never invent palette keys. The palette is: `obsidian`, `ruby.{core, mid, deep, ember, shadow}`, `sapphire.{core, glow, deep}`, `platinum`, `graphite`, `hairline`. There is NO `ruby.glow` (common mistake — use `ruby.ember`).
- Never invent new canonical-serialization logic. Always import `stableStringify` from `src/lib/stableJson.ts`.
- Match the user's voice: concise, direct, slightly poetic, zero fluff. They prefer decisive recommendations over option menus.

---

*The point of this project is sovereignty. Every line of code should defend that. If a proposed change trades sovereignty for convenience, the answer is no.*