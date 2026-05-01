# v1.4 Release Notes — GETKINETIK

> **Build:** Shipped **2026-04-30** — EAS **preview** profile (sideload **APK**), app **1.4.0**, Android **`versionCode` 11**. Attach the `.apk` under **Assets** on this GitHub Release (or install from the Expo build artifact for that commit).

---

## What's New in v1.4

### Optimizer Engine (`packages/optimizer/`)
- **Price feed** — CoinGecko free tier, 5-minute cache, fallback values
- **Gas feed** — Polygon + Base public RPC polling, 2-minute cache
- **Yield scorer** — ranks all pending adapter claims by USD value; only flags ready when reward ≥ 5× gas cost
- **Device discovery** — reads phone capabilities (GPS, motion, camera, barometer) and surfaces DePIN networks you qualify for but aren't running yet
- **Shared PollingPool** — replaces individual `setInterval`s in each adapter; one loop serves all five networks (~30% battery reduction)
- **OptimizationReport modal** — weekly savings summary: gas avoided, battery hours saved, new networks discovered, verified-user premium earned

### Genesis Credits (`packages/credits/`)
- Internal loyalty score — NOT a token, NOT a financial instrument
- Earns for: uptime, heartbeats, network connections, proof generation, optimizer use
- 2× rate for Genesis nodes (minted before public launch)
- Backed up to Cloudflare KV; visible in-app via `GenesisCreditsTicker`
- Transferable to wallet when wallet export ships

### Verified-User Premium
- `EarningEntry` schema extended with `standardRate`, `premiumRate`, `premiumBasisPoints`
- Receipts are premium-aware — show exactly how much extra a verified user earned vs standalone
- `DepinAdapter` interface now carries `AdapterRateMetadata` so each network can declare its rate structure

### Partner Verification Webhook
- `POST /api/verify-device` live at `getkinetik.app/api/verify-device`
- Ed25519 signature verified using Cloudflare Workers' native SubtleCrypto
- Returns: `valid`, `nodeId`, `nodeAge`, `heartbeatCount`, `sensorData`
- Full docs: `docs/api/verify-device.md`

### Documentation (`docs/`)
- `architecture.md` — four-layer system overview (L1–L4)
- `cryptography.md` — Ed25519 contract, stableStringify spec, hash chaining
- `adapter-contract.md` — guide for partner integrators
- `api/verify-device.md` — full webhook specification
- `IP-ASSIGNMENT.md` — legal IP assignment to OutFromNothing LLC

### Infrastructure
- `landing/metrics/` — public network metrics dashboard (`/api/metrics`)
- `functions/api/credits.js` — Genesis Credits KV backup endpoint
- GitHub Issue templates + PR template + SECURITY.md

---

## How to Install

**Android (sideload):**
1. Go to [Releases](https://github.com/Ricolax310/GetKinetik/releases/latest)
2. Download `GETKINETIK-v1.4.0.apk`
3. Enable "Install from unknown sources" in Android settings
4. Open the APK and install

**Note:** iOS coming after Android. Not on the Play Store yet.

---

## Upgrade from v1.3.x

- Your node identity (Ed25519 keypair) is preserved — no re-minting required
- Heartbeat chain continues from where it left off
- Genesis Credits start accruing automatically
- Optimizer activates on first open after upgrade

---

## Known Limitations

- Seed-phrase backup (write-down + restore) is still in progress — treat your device like a hardware wallet
- Verified-user premium requires a partner network to opt in — no partners confirmed yet (outreach active)
- iOS build: after Android stable

---

## versionCode

`11` (EAS `preview` build auto-increment from prior `10`)

---

*Built by Eric (Kinetik_Rick) · OutFromNothing LLC · getkinetik.app*
