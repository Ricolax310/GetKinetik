# GETKINETIK

> **The neutral bureau for DePIN — your friendly helper, not your gatekeeper.**
> We publish signed evidence about devices. Networks keep their verifiers.
> Operators get portable proof. Outsiders get a second read. No token, no
> custody, no picking sides.

GETKINETIK is the **neutral DePIN bureau for the decentralized
physical economy** — a friendly helper that publishes reproducible reads
and signed device evidence so everyone can make better trust decisions:
hardware-signed Proof of Origin across DePIN networks (Nodle, DIMO,
Hivemapper, WeatherXM, Geodnet, more coming).

Networks can't grade themselves and stay credible to outsiders.
Foundations can't be the only voice on their own ecosystem health.
We're the helper in the middle — outside every network, publishing
what we observe on public data and signed proofs, verifiable in any
browser without trusting us.

**Our charter** is in [`NEUTRALITY.md`](./NEUTRALITY.md): no token, no
equity in graded networks, no exclusive partnerships, all revenue in
fiat or stablecoin, methodology public. That's what makes the data
worth trusting.

No servers holding your data. No accounts. No middleman taking a cut of
your tokens. Just signed receipts, on your device, verifiable by anyone.

---

## Status

**v1.5.0 · BUREAU · LIVE** — Android preview APK available now.
Install via [getkinetik.app](https://getkinetik.app) or download
**`GETKINETIK-v1.4.0.apk`** from
[Releases](https://github.com/Ricolax310/GetKinetik/releases/latest).
iOS is in development; iPhone visitors can join the waitlist on the site.

| Layer / Feature | Status | What it is |
|---|---|---|
| **L1** Sovereign Identity + Trust | ✅ Live | Ed25519 key + hash-chained heartbeat log + public Ed25519 verifier |
| **L2** Sensor Capture + Signing | 🟡 Partial | 3 of 7 planned permission-free sensors signing into the chain |
| **L3** DePIN Optimizer | ✅ Live | Gas-aware claim timing, shared polling pool, yield scoring, device discovery |
| **L4** Earnings Ledger + Disclosure Fee | ✅ Live | Hardware-signed earnings receipts; optional 1% bureau fee disclosed in the signature |
| **Partner Verification API** | ✅ Live | `POST /api/verify-device` — Proof URL in, Genesis Score + tamper flags + node age out |
| **Genesis Score v1.1** | ✅ Live | 0–1000 public node reputation. Bureau-bounded chain age, beat-rate sanity, chain-rewind hard gate. **Not a token. Never priced.** |
| **Public Bureau (`/bureau/`)** | ✅ Live | Score bands, input methodology, neutrality rules, sample API response, live verification ticker |
| **Bureau Positioning Page (`/bureau/why/`)** | ✅ Live | Direct answer to the "we already do this" objection |
| **Bureau Stats API (`/api/bureau/stats`)** | ✅ Live | Public telemetry counters: total verifications, unique nodes, last-seen timestamp |
| **Score Lookup API (`/api/score/:nodeId`)** | ✅ Live | `GET` a cached Genesis Score for any node ID |
| **Partner Attestation API (`/api/attest`)** | ✅ Live | Authenticated `POST` — partners push positive or negative signals; KV-persisted, `attestor` attributed |
| **Per-Partner API Keys** | ✅ Live | `ATTEST_API_KEYS` JSON dict; each key carries a partner name for attribution |
| **Score-Change Webhooks** | ✅ Live | `score.changed` event pushed to partners on band transitions; HMAC-SHA256 signed |
| **OpenAPI 3.1 Spec** | ✅ Live | `/api/openapi.yaml` — machine-readable contract for all endpoints |
| **Interactive API Docs** | ✅ Live | `/api/docs/` — RapiDoc viewer; try every endpoint in-browser |
| **Postman Collection** | ✅ Live | `/api/postman.json` — import and run against live API in 30 seconds |
| **Public Status Page (`/status/`)** | ✅ Live | Browser-side probes for all key endpoints; live bureau telemetry |
| **Health Probe (`/api/health`)** | ✅ Live | Lightweight `GET` — integrates with uptime monitors |
| **`@getkinetik/verify` NPM package** | ✅ Live | Offline, air-gapped verifier — same cryptographic contract as the hosted API |
| **Verified-User Premium** | 🔨 Next | Partners tier rewards by Genesis Score band (requires partner activation) |
| **Seed-phrase backup** | 🔨 Next | 12-word restore; one active device at a time; no bypass |

### Roadmap

```
v1.5.0  LIVE   — Genesis Score v1.1 (hardened); public bureau at /bureau/;
                 /bureau/why/ positioning page; live bureau stats ticker;
                 OpenAPI 3.1 + Postman collection + interactive docs at /api/docs/;
                 per-partner API keys; score-change webhooks; /status/ page;
                 @getkinetik/verify NPM package; QUICKSTART.md

v1.6    NEXT   — Seed-phrase backup; verified-user premium (partner activation);
                 batch attestation endpoint; iOS preview

v2.0    LATER  — Public attestation index across 25+ DePIN networks;
                 third-party auditor read API; transparency reports
```

---

## What's actually verifiable right now

Anyone, no account, no install:

- **Mint a Proof of Origin** in the app, scan its QR, paste the URL into
  any browser, and the [public verifier](https://getkinetik.app/verify/)
  runs the full Ed25519 signature check entirely client-side. No server
  call. No account. No trust required — the math is the witness.
- **Try it cold** with a live demonstration proof generated from
  [`scripts/mint-demo-proof.mjs`](./scripts/mint-demo-proof.mjs). The
  script outputs a self-contained URL you can verify in any browser.

This isn't a demo of "what trust looks like." It's the actual trust
primitive the app is built on, exposed publicly so anyone — partner,
auditor, skeptic — can confirm we're not lying about what's signed.

---

## Repository layout

```
.
├── App.tsx                      # Mobile app entry (Expo / React Native)
├── src/
│   ├── components/              # Vault UI, Gemstone, AggregatorPanel, etc.
│   └── hooks/                   # Sensor + storage glue
│
├── packages/
│   ├── kinetik-core/            # L1 + L4 trust-layer primitive (the moat)
│   │   └── src/                 #   identity · heartbeat · sensors ·
│   │                            #   proof · stableJson · wallet · adapter
│   ├── optimizer/               # L3 optimizer engine
│   │   └── src/                 #   priceFeed · gasFeed · scorer ·
│   │                            #   discovery · pollingPool · savings
│   ├── credits/                 # Genesis Credits engine (NOT a token)
│   ├── adapter-nodle/           # L3 adapter — Nodle Cash
│   ├── adapter-dimo/            # L3 adapter — DIMO Network
│   ├── adapter-hivemapper/      # L3 adapter — Hivemapper Honey Jar
│   ├── adapter-weatherxm/       # L3 adapter — WeatherXM Pro
│   └── adapter-geodnet/         # L3 adapter — Geodnet
│
├── landing/                     # getkinetik.app (Cloudflare Pages)
│   ├── index.html               #   marketing site + live bureau stats
│   ├── app.js                   #   platform detection, waitlist modal, bureau stats hydration
│   ├── _headers                 #   security headers + CSP + content-type overrides
│   ├── verify/                  #   public Ed25519 verifier (zero deps, no server)
│   ├── bureau/                  #   public Genesis Score bureau
│   │   ├── index.html           #     score bands, methodology, live ticker
│   │   ├── ticker.js            #     live bureau stat ticker (CSP-safe external script)
│   │   └── why/index.html       #     "Why a neutral bureau ≠ your own genuity check"
│   ├── api/                     #   developer resources (static, served by Pages)
│   │   ├── openapi.yaml         #     OpenAPI 3.1 spec for all public endpoints
│   │   ├── postman.json         #     Postman collection
│   │   └── docs/index.html      #     Interactive RapiDoc viewer
│   ├── status/                  #   public service status page
│   │   ├── index.html           #     browser-side endpoint probes + bureau telemetry
│   │   └── status.js            #     probe logic (CSP-safe external script)
│   ├── dimo-callback/           #   OAuth bounce page for DIMO login
│   └── metrics/                 #   public network metrics dashboard
│
├── functions/api/               # Cloudflare Pages Functions (edge workers)
│   ├── waitlist.js              #   waitlist KV
│   ├── verify-device.js         #   partner verification; Genesis Score compute + KV cache; webhook fire
│   ├── attest.js                #   authenticated partner attestation endpoint
│   ├── health.js                #   lightweight health probe for uptime monitors
│   ├── credits.js               #   Genesis Credits KV sync
│   ├── metrics.js               #   network metrics aggregate
│   ├── score/[nodeId].js        #   GET cached Genesis Score for any node
│   └── bureau/stats.js          #   GET public bureau telemetry counters
│
├── docs/
│   ├── QUICKSTART.md            #   5-Minute Integration Guide for partners
│   ├── architecture.md          #   System overview for M&A due diligence
│   ├── cryptography.md          #   Signing contract specification
│   ├── adapter-contract.md      #   Partner integration guide
│   ├── IP-ASSIGNMENT.md         #   IP ownership + USPTO trademark guidance
│   ├── api/
│   │   ├── verify-device.md     #     verify-device API spec
│   │   ├── attest.md            #     attestation endpoint spec
│   │   └── webhooks.md          #     score-change webhook payload + HMAC spec
│   └── methodology/
│       └── GENESIS_SCORE.md     #     Published Genesis Score methodology (v1.1)
│
└── scripts/
    ├── mint-demo-proof.mjs      #   Generate a live verifiable demo proof URL
    ├── mint-partner-key.mjs     #   Generate a new partner API key (ATTEST_API_KEYS format)
    └── test-genesis-score.mjs   #   Local unit tests for the Genesis Score algorithm
```

The TypeScript app and the browser-side verifier share a cryptographic
contract — `stableStringify`, `PROOF_ATTRIBUTION`, the artifact shape.
The verifier is intentionally a near-byte-for-byte mirror of
`packages/kinetik-core/src/proof.ts` and `heartbeat.ts`, so a proof
minted by the app and a proof verified by the browser cannot diverge
without one or both refusing to validate.

---

## For partners

GETKINETIK is the **independent credit bureau for the decentralized
physical economy** — never a network competitor. We grade the *device*,
not the data, with a published methodology, a versioned public score, and
a charter that prohibits holding equity in or issuing tokens on any
graded network. That neutrality is the product.

**Why a neutral bureau matters more than your own genuity check:**
[getkinetik.app/bureau/why/](https://getkinetik.app/bureau/why/)

**What partners get:**

| Tool | URL | Auth |
|---|---|---|
| Verify a proof + get Genesis Score | `POST /api/verify-device` | None |
| Look up a cached score by node ID | `GET /api/score/:nodeId` | None |
| Push attestations (positive / negative) | `POST /api/attest` | Bearer key |
| Score-change webhooks | configure in your partner key | Bearer key |
| Interactive API docs | `/api/docs/` | None |
| OpenAPI 3.1 spec | `/api/openapi.yaml` | None |
| Postman collection | `/api/postman.json` | None |

Try it right now — no auth, no account:

```bash
curl -X POST https://getkinetik.app/api/verify-device \
  -H 'Content-Type: application/json' \
  -d '{"proofUrl":"<paste_any_getkinetik_proof_url>"}'
```

5-minute integration guide: [`docs/QUICKSTART.md`](./docs/QUICKSTART.md)

Full API spec: [`docs/api/verify-device.md`](./docs/api/verify-device.md)

To request a partner API key (enables attestations + webhooks):
**eric@outfromnothingllc.com**

---

## Honest disclosure

Your node is an **anonymous cryptographic identity** — the network sees
a unique ID, never a name, never an account. That identity lives only on
your phone.

**If you lose your phone, the real picture is:**

- Your DePIN earnings (DIMO, Nodle, Hivemapper, etc.) are safe — they
  live in your wallet on those networks. We only read them, never hold them.
- Your **Genesis Score** is a public reputation number tied to your node's
  history. It is **never transferable, never priced, never redeemable** —
  it's a *grade*, not a currency. Losing your phone resets the grade for
  the new device, but no money is at stake.
- What you actually lose is your **node's seniority** — how long it's been
  running, its heartbeat chain, its track record. The anonymous identity
  itself can be recreated instantly on a new device.

Seniority is a reputation clock, not cash. As the bureau grows, partners
who pay verified-user premiums may weight node age and Genesis Score in
their offers — meaning a long-running, well-graded node may unlock
*better partner rates*, but the grade itself is never something you own
or can sell. Lose your phone and you start the clock over; nothing
else is lost.

Seed-phrase backup (write down 12 words, restore on a new device, one
device active at a time) is **in progress** — not in v1.4.0; see
`RELEASE_NOTES_v1.4.md` for current limitations.

---

## Building from source

The app is an Expo / React Native project. Standard local dev:

```bash
npm install
npx expo start
```

The web verifier is static HTML + JS with vendored cryptography — no
build step, no bundler, no node_modules at runtime. Open
`landing/verify/index.html` in a browser to test locally.

Production Android builds happen via EAS:

```bash
npx eas-cli build -p android --profile preview
```

Smoketest the cryptographic contract any time:

```bash
node landing/verify/smoketest.mjs
```

---

## License

UNLICENSED — proprietary, not open source. Copyright © OutFromNothing LLC (California).

The verifier at `landing/verify/` is intentionally readable, auditable,
and runs entirely in the user's browser — that's a feature, not an
invitation to fork.

---

## Contact

- Project: [getkinetik.app](https://getkinetik.app)
- Email: eric@outfromnothingllc.com
- GitHub: [@Ricolax310](https://github.com/Ricolax310)
- Founder: Eric (Kinetik_Rick) · OutFromNothing LLC (California)

A Sovereign Node Protocol artifact. Not transferable.
